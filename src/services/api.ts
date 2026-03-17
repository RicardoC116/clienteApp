// api.ts
import axios from 'axios';

const api = axios.create({
  // chilac
  baseURL: 'https://cobrobackend2-production.up.railway.app/api',
  // Virsac
  // baseURL: "https://cobrobackend2-production-96fe.up.railway.app/api",

  // San Jose
  // baseURL: "https://cobrobackend2-production-8129.up.railway.app/api",
  timeout: 15000,
});

export default api;
