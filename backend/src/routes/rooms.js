const express = require('express');
const router = express.Router();

// TODO: Implement room management routes
// - GET /api/rooms - Get all rooms
// - GET /api/rooms/:roomId - Get room by ID
// - POST /api/rooms - Create new room
// - PUT /api/rooms/:roomId - Update room
// - DELETE /api/rooms/:roomId - Delete room
// - GET /api/rooms/availability - Check room availability

router.get('/', (req, res) => {
  res.json({ message: 'Rooms API - Coming soon' });
});

module.exports = router;