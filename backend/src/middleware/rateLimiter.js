const { RateLimiterMemory } = require('rate-limiter-flexible');

// Create rate limiters for different types of requests
const rateLimiters = {
  // General API requests
  general: new RateLimiterMemory({
    keyGenerator: (req) => `${req.ip}:${req.tenant?.id || 'no-tenant'}`,
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds
  }),

  // Authentication requests (stricter)
  auth: new RateLimiterMemory({
    keyGenerator: (req) => `auth:${req.ip}`,
    points: 10, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 300, // Block for 5 minutes if limit exceeded
  }),

  // Registration requests (very strict)
  registration: new RateLimiterMemory({
    keyGenerator: (req) => `register:${req.ip}`,
    points: 3, // Number of requests
    duration: 3600, // Per hour
    blockDuration: 3600, // Block for 1 hour if limit exceeded
  }),
};

// Middleware factory
const createRateLimiter = (type = 'general') => {
  return async (req, res, next) => {
    try {
      const limiter = rateLimiters[type];
      if (!limiter) {
        return next();
      }

      await limiter.consume(req.ip);
      next();
    } catch (rateLimiterRes) {
      const remainingTime = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;
      
      res.set({
        'Retry-After': remainingTime,
        'X-RateLimit-Limit': rateLimiters[type].points,
        'X-RateLimit-Remaining': rateLimiterRes.remainingHits || 0,
        'X-RateLimit-Reset': new Date(Date.now() + rateLimiterRes.msBeforeNext)
      });

      res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${remainingTime} seconds.`,
        retryAfter: remainingTime
      });
    }
  };
};

// Export the general rate limiter as default and specific ones
module.exports = createRateLimiter('general');
module.exports.auth = createRateLimiter('auth');
module.exports.registration = createRateLimiter('registration');
module.exports.createRateLimiter = createRateLimiter;