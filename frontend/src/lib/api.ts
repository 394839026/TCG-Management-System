import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Function to convert _id to id in objects
function convertIds(obj: any): any {
  if (!obj) return obj;
  if (Array.isArray(obj)) {
    return obj.map(convertIds);
  }
  if (typeof obj === 'object') {
    const newObj = { ...obj };
    if (newObj._id) {
      newObj.id = newObj._id;
    }
    Object.keys(newObj).forEach(key => {
      newObj[key] = convertIds(newObj[key]);
    });
    return newObj;
  }
  return obj;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and convert _id to id
apiClient.interceptors.response.use(
  (response) => {
    const newResponse = { ...response };
    if (newResponse.data) {
      if (newResponse.data.data) {
        newResponse.data.data = convertIds(newResponse.data.data);
      }
    }
    return newResponse;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
