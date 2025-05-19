import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:4000",
  withCredentials: true,
});

export const fasta = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
});

export default api;
