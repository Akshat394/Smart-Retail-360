import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api', // Update as needed
  timeout: 10000,
});

export default api;

export async function get<T>(url: string, config = {}) {
  const res = await api.get<T>(url, config);
  return res.data;
}

export async function patch<T>(url: string, data: any, config = {}) {
  const res = await api.patch<T>(url, data, config);
  return res.data;
} 