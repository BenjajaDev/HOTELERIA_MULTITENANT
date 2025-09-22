import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const tenant = localStorage.getItem('tenant');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (tenant) {
      try {
        const parsedTenant = JSON.parse(tenant);
        config.headers['x-tenant-id'] = parsedTenant.id;
      } catch (error) {
        console.error('Failed to parse tenant data for request:', error);
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('tenant');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (credentials) => {
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
  },
};

export const hotelService = {
  getHotels: async () => {
    const response = await api.get('/api/hotels');
    return response.data;
  },

  getHotel: async (hotelId) => {
    const response = await api.get(`/api/hotels/${hotelId}`);
    return response.data;
  },

  createHotel: async (hotelData) => {
    const response = await api.post('/api/hotels', hotelData);
    return response.data;
  },

  updateHotel: async (hotelId, hotelData) => {
    const response = await api.put(`/api/hotels/${hotelId}`, hotelData);
    return response.data;
  },

  deleteHotel: async (hotelId) => {
    const response = await api.delete(`/api/hotels/${hotelId}`);
    return response.data;
  },
};

export const roomService = {
  getRooms: async () => {
    const response = await api.get('/api/rooms');
    return response.data;
  },

  // TODO: Add more room service methods
};

export const reservationService = {
  getReservations: async () => {
    const response = await api.get('/api/reservations');
    return response.data;
  },

  // TODO: Add more reservation service methods
};

export default api;