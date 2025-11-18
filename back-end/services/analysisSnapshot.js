const { FASTA_SERVICE_URL, FALLBACK_FASTA_URL, REQUEST_TIMEOUT_MS } = require("../config/llm");

const normalizeUrl = (url) => {
  if (!url) return null;
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

const fetchWithTimeout = async (resource, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
};

const candidateBases = Array.from(
  new Set(
    [FASTA_SERVICE_URL, FALLBACK_FASTA_URL, "http://back-end-fasta:5000", "http://localhost:5000"].filter(Boolean)
  )
).map(normalizeUrl);

async function fetchLatestAnalysisSnapshot() {
  const errors = [];
  let onlyNotFound = true;

  for (const base of candidateBases) {
    if (!base) continue;
    try {
      const response = await fetchWithTimeout(`${base}/dados-analise`, { timeout: REQUEST_TIMEOUT_MS });
      if (response.status === 404) {
        errors.push(`Sem análises disponíveis em ${base}`);
        continue;
      }
      onlyNotFound = false;
      if (!response.ok) {
        errors.push(`Falha ${response.status} em ${base}`);
        continue;
      }
      const payload = await response.json();
      return {
        fonte: base,
        dados: payload,
      };
    } catch (error) {
      errors.push(`${base}: ${error.message}`);
    }
  }

  const message = errors.length ? errors.join(" | ") : "Nenhum serviço FASTA respondeu";
  const err = new Error(`Não foi possível obter os dados da análise: ${message}`);
  err.status = onlyNotFound ? 404 : 502;
  throw err;
}

module.exports = {
  fetchLatestAnalysisSnapshot,
};
