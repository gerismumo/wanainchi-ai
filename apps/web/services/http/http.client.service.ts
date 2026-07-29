import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const ClientHttp = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

ClientHttp.interceptors.request.use((config) => {

  return config;
});
