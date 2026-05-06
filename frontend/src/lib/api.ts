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
    
    // 创建一个更友好的错误对象
    const errorMessage = 
      error.response?.data?.message || 
      error.response?.statusText || 
      error.message || 
      '请求失败';
    
    const customError = new Error(errorMessage);
    customError.name = error.name;
    customError.stack = error.stack;
    
    // 将原始响应添加到错误对象中供调试使用
    (customError as any).response = error.response;
    (customError as any).originalError = error;
    
    return Promise.reject(customError);
  }
);

export default apiClient;
