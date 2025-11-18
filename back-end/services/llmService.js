const { API_KEY, MODEL, BASE_URL, REQUEST_TIMEOUT_MS } = require("../config/llm");

const MODEL_ENDPOINT = `${BASE_URL}/models/${MODEL}:generateContent`;

const safeNumber = (value) => {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const summarizeVariants = (variants = []) => {
  if (!Array.isArray(variants) || variants.length === 0) return "Nenhuma variante registrada";
  const highlights = variants.slice(0, 5).map((variant) => {
    const pos = variant?.posicao_exon ?? "s/posição";
    const ref = variant?.ref ?? "?";
    const alt = variant?.alt ?? "?";
    const tipo = (variant?.tipo || "variante").toLowerCase();
    return `${tipo} no exon ${pos} (${ref}→${alt})`;
  });
  const extra = variants.length > 5 ? ` +${variants.length - 5} alterações extras` : "";
  return `${highlights.join(", ")}${extra}`;
};

const buildBaseSections = (relatorio = {}, analise = {}) => {
  const identidade = analise.identidade ?? relatorio.Identidade ?? "N/D";
  const score = analise.score ?? relatorio.Score ?? "N/D";
  const classificacao = relatorio.Classificacao || analise.classificacao || "Indefinido";
  const confianca = relatorio.Confianca || analise.confianca || analise.confianca_float || null;
  const metricas = analise.metricas_exon29 || {};
  const variantes = Array.isArray(analise.variantes_exon29) ? analise.variantes_exon29 : [];
  const resumoVariantes = summarizeVariants(variantes);
  const cobertura = metricas.cobertura_pct ?? null;
  const totalMutacoes = variantes.length;

  return [
    {
      id: "risk",
      titulo: "Classificação de risco",
      valor: classificacao,
      probabilidade: safeNumber(confianca),
      contexto: `Resultado atual do modelo IA e registro clínico associado ao relatório ${relatorio.id}.`
    },
    {
      id: "confidence",
      titulo: "Confiança do modelo",
      valor: analise.confianca || relatorio.Confianca || "N/D",
      probabilidade: safeNumber(analise.confianca_float || relatorio.Confianca),
      contexto: "Confiança bruta retornada pela IA após classificar o exon 29."
    },
    {
      id: "identity",
      titulo: "Identidade genética",
      valor: identidade,
      probabilidade: safeNumber(analise.identidade_pct),
      contexto: `Percentual e características do alinhamento Needleman-Wunsch. Score: ${score}.`
    },
    {
      id: "alignmentScore",
      titulo: "Score de alinhamento",
      valor: score,
      probabilidade: safeNumber(metricas.cobertura_pct),
      contexto: `Cobertura estimada do exon29: ${metricas.cobertura_pct || "N/D"}%. Variantes: ${metricas.total_variantes || 0}.`
    },
    {
      id: "alignmentDetail",
      titulo: "Trechos focados em mutação",
      valor: totalMutacoes ? `${totalMutacoes} variação(ões) monitorada(s)` : "Sem mutações relevantes",
      probabilidade: safeNumber(metricas.cobertura_pct),
      contexto: `Explique o que o score ${score} e a cobertura ${cobertura ?? "N/D"}% indicam para o alinhamento Needleman-Wunsch e descreva as consequências clínicas das mutações: ${resumoVariantes}.`
    },
    {
      id: "rnaFocus",
      titulo: "Transcrição em destaque",
      valor: totalMutacoes ? "Transcritos afetados" : "Transcrição preservada",
      probabilidade: null,
      contexto: `Comente em duas ou três frases como as mutações afetam a transcrição do exon29, citando códons alterados, potenciais mudanças de RNA mensageiro e recomendações práticas.`
    },
    {
      id: "proteinMap",
      titulo: "Mapa de aminoácidos",
      valor: totalMutacoes ? "Aminoácidos alterados" : "Sem alterações detectadas",
      probabilidade: null,
      contexto: `Resuma o possível impacto proteico: destaque se há risco de stop codon, substituições críticas ou manutenção estrutural com base nas variantes (${resumoVariantes}).`
    }
  ];
};

const buildPrompt = (relatorio, analise, sections) => {
  const payload = {
    paciente: {
      id: relatorio.id,
      nome: relatorio.Nome,
      sexo: relatorio.Sexo,
      idade: relatorio.Idade,
      raca: relatorio.Raca,
    },
    seções: sections,
    metricas: analise.metricas_exon29 || {},
    variantes_resumidas: summarizeVariants(analise.variantes_exon29),
  };

  return `Você é um geneticista veterinário. Gere comentários curtos em português para complementar um relatório sobre mutações no exon29 do gene PKD1 em felinos.
Responda estritamente no formato JSON a seguir, sem texto adicional:
{
  "sections": [
    { "id": "", "comentario": "", "probabilidade": 0.0, "gravidade": "" }
  ],
  "insights_globais": ["texto"],
  "possiveis_doencas": ["condição opcional" ]
}

Regras:
- Use 2 ou 3 frases por comentário, sempre relacionando os valores fornecidos (score, probabilidade, mutações) a interpretações clínicas.
- Utilize tom clínico objetivo, cite probabilidades quando disponíveis e recomende próximos passos em linguagem simples.
- Quando não houver dado, escreva "Informação insuficiente".
- Para alignmentDetail, descreva o que o score/cobertura sugerem e como as mutações afetam o alinhamento. Para rnaFocus e proteinMap, destaque consequências sobre transcrição e aminoácidos de forma educativa.

Dados de entrada:
${JSON.stringify(payload, null, 2)}
`;
};

const callGemini = async (prompt) => {
  if (!API_KEY) {
    const err = new Error("GEMINI_API_KEY não configurada");
    err.status = 500;
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${MODEL_ENDPOINT}?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      const err = new Error(`Falha ao consultar Gemini (${response.status}): ${text.slice(0, 280)}`);
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    const candidates = data?.candidates || [];
    if (!candidates.length) {
      throw new Error("Resposta do Gemini sem candidatos");
    }
    const parts = candidates[0]?.content?.parts || [];
    const fullText = parts.map((part) => part.text || "").join("\n").trim();
    if (!fullText) {
      throw new Error("Resposta do Gemini vazia");
    }
    return fullText;
  } finally {
    clearTimeout(timeout);
  }
};

const extractStructuredPayload = (rawText) => {
  const firstBrace = rawText.indexOf("{");
  const lastBrace = rawText.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("Gemini não retornou JSON no formato esperado");
  }
  const jsonSlice = rawText.slice(firstBrace, lastBrace + 1);
  const parsed = JSON.parse(jsonSlice);
  return {
    sections: Array.isArray(parsed.sections) ? parsed.sections : [],
    insights_globais: Array.isArray(parsed.insights_globais) ? parsed.insights_globais : [],
    possiveis_doencas: Array.isArray(parsed.possiveis_doencas) ? parsed.possiveis_doencas : [],
  };
};

const mergeSections = (baseSections, generatedSections = []) => {
  const generatedMap = new Map();
  generatedSections.forEach((section) => {
    if (section?.id) {
      generatedMap.set(section.id, section);
    }
  });

  return baseSections.map((section) => {
    const llmSection = generatedMap.get(section.id) || {};
    return {
      ...section,
      comentario: llmSection.comentario || "LLM não forneceu complemento.",
      probabilidade: safeNumber(llmSection.probabilidade) ?? section.probabilidade,
      gravidade: llmSection.gravidade || null,
    };
  });
};

async function generateStructuredInsights(relatorio, analise) {
  const relatorioPlano = relatorio?.toJSON ? relatorio.toJSON() : relatorio;
  if (!relatorioPlano) {
    throw new Error("Relatório inválido para gerar insights");
  }
  const baseSections = buildBaseSections(relatorioPlano, analise?.dados || {});
  const prompt = buildPrompt(relatorioPlano, analise?.dados || {}, baseSections);
  const rawText = await callGemini(prompt);
  const structured = extractStructuredPayload(rawText);
  const mergedSections = mergeSections(baseSections, structured.sections);

  return {
    sections: mergedSections,
    insights_globais: structured.insights_globais,
    possiveis_doencas: structured.possiveis_doencas,
    modelo: MODEL,
    fonte_dados: analise?.fonte,
  };
}

module.exports = {
  generateStructuredInsights,
};
