import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 30000, // 30s — gives Render cold start time to wake up
  withCredentials: true, // send httpOnly auth cookie on every request
});

// Auto-logout on 401 — cookie expired or invalid
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      // Redirect to login without importing React Router (avoids circular deps)
      const { pathname } = window.location;
      const publicPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/pricing'];
      const isPublic = publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'));
      if (!isPublic) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
