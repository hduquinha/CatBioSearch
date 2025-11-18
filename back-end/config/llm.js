const DEFAULT_API_KEY = "AIzaSyBbl5moM--m4i5JZY-m0IcsOJVexiQs4yw";

module.exports = {
  API_KEY: process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length
    ? process.env.GEMINI_API_KEY
    : DEFAULT_API_KEY,
  MODEL: process.env.GEMINI_MODEL || "gemini-1.5-flash-latest",
  BASE_URL: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta",
  FASTA_SERVICE_URL: process.env.FASTA_SERVICE_URL || "http://back-end-fasta:5000",
  FALLBACK_FASTA_URL: process.env.FALLBACK_FASTA_URL || "http://localhost:5000",
  REQUEST_TIMEOUT_MS: parseInt(process.env.LLM_REQUEST_TIMEOUT || "20000", 10),
};
