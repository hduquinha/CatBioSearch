// src/pages/AnalysisPage.js
import React, { useEffect, useMemo, useState } from "react";
import "./analise.css";
import Sidebar from "../../Components/Sidebar";
import RNASequence from "./Componentes/RNASequence";
import NeedlemanWunsch from "./Componentes/Needlman";
import Proteins from "./Componentes/Protein";
import api, { fasta } from "../../api";
import { jsPDF } from "jspdf";

const mapaClassificacao = { 0: "Risco Baixo", 1: "Risco Alto" };

const formatProbability = (value) => {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  if (number <= 1) return `${(number * 100).toFixed(1)}%`;
  return `${number.toFixed(1)}%`;
};

const CODON_TABLE = {
  AUG: "Met",
  UUU: "Phe",
  UUC: "Phe",
  UUA: "Leu",
  UUG: "Leu",
  CUU: "Leu",
  CUC: "Leu",
  CUA: "Leu",
  CUG: "Leu",
  AUU: "Ile",
  AUC: "Ile",
  AUA: "Ile",
  GUU: "Val",
  GUC: "Val",
  GUA: "Val",
  GUG: "Val",
  UCU: "Ser",
  UCC: "Ser",
  UCA: "Ser",
  UCG: "Ser",
  AGU: "Ser",
  AGC: "Ser",
  CCU: "Pro",
  CCC: "Pro",
  CCA: "Pro",
  CCG: "Pro",
  ACU: "Thr",
  ACC: "Thr",
  ACA: "Thr",
  ACG: "Thr",
  GCU: "Ala",
  GCC: "Ala",
  GCA: "Ala",
  GCG: "Ala",
  UAU: "Tyr",
  UAC: "Tyr",
  UAA: "STOP",
  UAG: "STOP",
  UGA: "STOP",
  CAU: "His",
  CAC: "His",
  CAA: "Gln",
  CAG: "Gln",
  AAU: "Asn",
  AAC: "Asn",
  AAA: "Lys",
  AAG: "Lys",
  GAU: "Asp",
  GAC: "Asp",
  GAA: "Glu",
  GAG: "Glu",
  UGU: "Cys",
  UGC: "Cys",
  UGG: "Trp",
  CGU: "Arg",
  CGC: "Arg",
  CGA: "Arg",
  CGG: "Arg",
  AGA: "Arg",
  AGG: "Arg",
  GGU: "Gly",
  GGC: "Gly",
  GGA: "Gly",
  GGG: "Gly",
};

const dnaToRna = (seq = "") => seq.replace(/T/gi, "U");
const splitCodons = (seq = "") => {
  const codons = [];
  for (let i = 0; i < seq.length; i += 3) {
    codons.push(seq.slice(i, i + 3));
  }
  return codons;
};
const translateCodons = (codons = []) => codons.map((codon) => CODON_TABLE[codon] || "");

const Relatorio = () => {
  const [relatorio, setRelatorio] = useState(null);
  const [dadosAnalise, setDadosAnalise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [llmSections, setLlmSections] = useState([]);
  const [llmInsights, setLlmInsights] = useState([]);
  const [llmMeta, setLlmMeta] = useState(null);
  const [llmLoading, setLlmLoading] = useState(true);
  const [llmError, setLlmError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const applyLlmPayload = (payload) => {
      if (cancelled) return;
      setLlmSections(payload?.sections || []);
      setLlmInsights(payload?.insights_globais || []);
      setLlmMeta({ modelo: payload?.modelo, gerado_em: payload?.gerado_em });
    };

    const fetchInsightsForReport = async (relatorioId) => {
      if (!relatorioId) return;
      setLlmError("");
      setLlmSections([]);
      setLlmInsights([]);
      setLlmMeta(null);
      setLlmLoading(true);
      try {
        const getRes = await api.get(`/relatorios/relatorio/${relatorioId}/insights`);
        applyLlmPayload(getRes.data);
      } catch (err) {
        if (err?.response?.status === 404) {
          try {
            const createRes = await api.post(`/relatorios/relatorio/${relatorioId}/insights`);
            applyLlmPayload(createRes.data);
          } catch (generateErr) {
            if (!cancelled) {
              console.error("Erro ao gerar insights LLM:", generateErr);
              setLlmError("Não foi possível gerar os complementos do LLM.");
            }
          }
        } else if (!cancelled) {
          console.error("Erro ao buscar insights LLM:", err);
          setLlmError("Não foi possível carregar os complementos do LLM.");
        }
      } finally {
        if (!cancelled) setLlmLoading(false);
      }
    };

    const fetchData = async () => {
      try {
        setLoading(true);
        setLlmLoading(true);
        setLlmError("");
        setLlmSections([]);
        setLlmInsights([]);
        setLlmMeta(null);
        // Busca relatório e análise em paralelo, tolerando falhas parciais
        const [relRes, analRes] = await Promise.allSettled([
          api.get("/relatorios/ultimo"),
          fasta.get("/dados-analise"),
        ]);

        if (cancelled) return;
        if (relRes.status === "fulfilled") setRelatorio(relRes.value.data);
        if (analRes.status === "fulfilled") setDadosAnalise(analRes.value.data);

        const relatorioId = relRes.status === "fulfilled" ? relRes.value.data?.id : null;
        await fetchInsightsForReport(relatorioId);

        // Só mostra erro se ambas falharem (ex.: não logado e ainda sem análise)
        if (relRes.status === "rejected" && analRes.status === "rejected") {
          throw new Error("Falha ao carregar dados do relatório e da análise");
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError("Erro ao carregar dados do relatório");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLlmLoading(false);
        }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, []);

  const downloadPDF = () => {
    const doc = new jsPDF();
    // Configurações do PDF
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    // Cabeçalho
    doc.setFontSize(16);
    doc.text("Relatório Genético Completo", 10, 20);
    doc.setFontSize(12);
    // Informações do Animal
    doc.text(`Nome: ${relatorio?.Nome || "Não informado"}`, 10, 35);
    doc.text(`ID do Relatório: ${relatorio?.id || "N/A"}`, 10, 45);
    // Dados da Análise
    doc.setFontSize(14);
    doc.text("Resultados da Análise Genética:", 10, 60);
    doc.setFontSize(12);
    doc.text(`Classificação: ${mapaClassificacao[dadosAnalise?.classificacao] || "N/A"}`, 10, 70);
    doc.text(`Confiança: ${dadosAnalise?.confianca || "N/A"}`, 10, 80);
    doc.text(`Identidade Genética: ${dadosAnalise?.identidade || "N/A"}`, 10, 90);
    doc.text(`Score de Alinhamento: ${dadosAnalise?.score?.toLocaleString() || "N/A"}`, 10, 100);

    const resumoParaPdf = llmInsights?.length
      ? llmInsights.join("\n\n")
      : (llmSections || []).map((sec) => `${sec.titulo || sec.id}: ${sec.comentario || "Sem complemento."}`).join("\n");
    const resumoQuebrado = doc.splitTextToSize(resumoParaPdf || llmError || "Resumo não disponível.", 180);
    doc.text("Resumo IA:", 10, 115);
    doc.text(resumoQuebrado, 10, 125);
    doc.save("relatorio-genetico.pdf");
  };

  const refSeq = dadosAnalise?.exon29_referencia || "";
  const querySeq = dadosAnalise?.exon29_amostra || "";
  const variantes = dadosAnalise?.variantes_exon29 || [];

  const infoFields = useMemo(() => ([
    { label: "Nome", value: relatorio?.Nome },
    { label: "Idade", value: relatorio?.Idade },
    { label: "Cliente", value: relatorio?.Cliente },
    { label: "Sexo", value: relatorio?.Sexo },
    { label: "Raça", value: relatorio?.Raca },
    { label: "ID do Relatório", value: relatorio?.id },
  ]), [relatorio]);

  const classificacaoValor = useMemo(() => mapaClassificacao[dadosAnalise?.classificacao] || "N/A", [dadosAnalise]);
  const riskTone = useMemo(() => dadosAnalise?.classificacao === 1 ? "alert" : dadosAnalise?.classificacao === 0 ? "safe" : "neutral", [dadosAnalise]);
  const riskHelper = useMemo(() => classificacaoValor === "N/A" ? "Aguardando execução da análise" : dadosAnalise?.classificacao === 1 ? "Monitoramento imediato recomendado" : "Sem sinais de risco elevado", [classificacaoValor, dadosAnalise]);

  const summaryBase = useMemo(() => ([
    { id: "risk", label: "Classificação de risco", value: classificacaoValor, helper: riskHelper, tone: riskTone },
    { id: "confidence", label: "Confiança do modelo", value: dadosAnalise?.confianca || "N/A", helper: "Probabilidade indicada pela IA", tone: "neutral" },
    { id: "identity", label: "Identidade genética", value: dadosAnalise?.identidade || "N/A", helper: "Comparação exon29 vs referência", tone: "neutral" },
    { id: "alignmentScore", label: "Score de alinhamento", value: dadosAnalise?.score?.toLocaleString() || "N/A", helper: "Pontuação Needleman-Wunsch", tone: "neutral" },
  ]), [classificacaoValor, riskHelper, riskTone, dadosAnalise]);

  const llmLookup = useMemo(() => {
    const map = {};
    llmSections.forEach((section) => {
      if (section?.id) {
        map[section.id] = section;
      }
    });
    return map;
  }, [llmSections]);

  const summaryCards = useMemo(() => summaryBase.map((card) => ({
    ...card,
    llm: llmLookup[card.id] || null,
  })), [summaryBase, llmLookup]);

  const dataTimeline = useMemo(() => {
    if (!dadosAnalise) return [];
    const metricas = dadosAnalise.metricas_exon29 || {};
    const eventos = [];

    if (classificacaoValor !== "N/A") {
      eventos.push({
        id: "data-risk",
        type: "data",
        kicker: "Modelo PKD1",
        title: "Classificação atual",
        text: `${classificacaoValor} • ${riskHelper}`,
      });
    }

    if (dadosAnalise?.confianca) {
      eventos.push({
        id: "data-confidence",
        type: "data",
        kicker: "Confiança",
        title: "Sinal da IA",
        text: `Probabilidade estimada em ${dadosAnalise.confianca}`,
      });
    }

    if (typeof dadosAnalise?.score === "number") {
      eventos.push({
        id: "data-score",
        type: "data",
        kicker: "Needleman-Wunsch",
        title: "Score do alinhamento",
        text: `Pontuação acumulada de ${dadosAnalise.score.toLocaleString()}`,
      });
    }

    if (typeof metricas.cobertura_pct === "number") {
      eventos.push({
        id: "data-coverage",
        type: "data",
        kicker: "Cobertura",
        title: "Trecho analisado",
        text: `Cobertura do exon29 em ${metricas.cobertura_pct}%`,
      });
    }

    if (typeof metricas.total_variantes === "number") {
      eventos.push({
        id: "data-variants",
        type: "data",
        kicker: "Mutação",
        title: "Variantes detectadas",
        text: `${metricas.total_variantes} alteração(ões) no trecho avaliado`,
      });
    }

    return eventos;
  }, [dadosAnalise, classificacaoValor, riskHelper]);

  const llmTimeline = useMemo(() => {
    if (!llmInsights?.length) return [];

    return llmInsights.map((texto, i) => ({
      id: `llm-${i}`,
      type: "llm",
      kicker: "Insight LLM",
      title: `Complemento ${i + 1}`,
      text: texto,
    }));
  }, [llmInsights]);

  const timelineEntries = useMemo(() => {
    if (!dataTimeline.length && !llmTimeline.length) return [];
    const inter = [];
    const lim = Math.max(dataTimeline.length, llmTimeline.length);

    for (let i = 0; i < lim; i++) {
      if (dataTimeline[i]) inter.push(dataTimeline[i]);
      if (llmTimeline[i]) inter.push(llmTimeline[i]);
    }
    return inter;
  }, [dataTimeline, llmTimeline]);

  const renderTimeline = () => {
    if (llmLoading) {
      return <p className="llm-text muted">Gerando resumo inteligente...</p>;
    }

    const itens = timelineEntries.length ? timelineEntries : dataTimeline;

    if (!itens.length) {
      return <p className="llm-text muted">Nenhuma métrica disponível para montar o resumo.</p>;
    }

    return (
      <div className="llm-timeline">
        {itens.map(item => (
          <article key={item.id} className={`timeline-card ${item.type}`}>
            <span className="timeline-dot" aria-hidden="true" />
            <div className="timeline-content">
              <p className="timeline-kicker">{item.kicker}</p>
              <p className="timeline-title">{item.title}</p>
              <p className="timeline-text">{item.text}</p>
            </div>
          </article>
        ))}
        {llmError && <p className="llm-text error">{llmError}</p>}
        {llmMeta?.gerado_em && (
          <p className="llm-text meta">
            Gerado por {llmMeta.modelo || "Gemini"} em {new Date(llmMeta.gerado_em).toLocaleString()}
          </p>
        )}
      </div>
    );
  };

  const variantesList = useMemo(
    () => (variantes && variantes.length > 0 ? variantes.slice(0, 4) : []),
    [variantes]
  );

  const refRna = useMemo(() => dnaToRna(refSeq), [refSeq]);
  const queryRna = useMemo(() => dnaToRna(querySeq), [querySeq]);
  const refCodons = useMemo(() => splitCodons(refRna), [refRna]);
  const queryCodons = useMemo(() => splitCodons(queryRna), [queryRna]);
  const refAmino = useMemo(() => translateCodons(refCodons), [refCodons]);
  const queryAmino = useMemo(() => translateCodons(queryCodons), [queryCodons]);
  const variantCodonIndexes = useMemo(() => {
    if (!variantes?.length) return [];
    const indexes = variantes
      .map((variant) =>
        typeof variant?.posicao_exon === "number"
          ? Math.floor((variant.posicao_exon - 1) / 3)
          : null
      )
      .filter((value) => value !== null);
    return Array.from(new Set(indexes));
  }, [variantes]);

  if (loading) return <div className="loading">Carregando dados...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="analysis-page">
      <Sidebar />
      <main className="analysis-content">
        <header className="page-header">
          <div>
            <p className="page-kicker">PKD1 • Exon29</p>
            <h1>Relatório Genético</h1>
          </div>
            <button className="button-download" onClick={downloadPDF}>Baixar PDF</button>
        </header>

        <section className="panel form-card">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Ficha do paciente</p>
              <h2>Dados do felino</h2>
            </div>
          </div>
          <div className="form-grid">
            {infoFields.map(field => (
              <div className="form-field" key={field.label}>
                <span className="field-label">{field.label}</span>
                <span className="field-value">{field.value || "Não informado"}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel summary-panel">
          {summaryCards.map(card => {
            const llmProbRaw = card.llm?.probabilidade;
            const llmProbFormatted = llmProbRaw === null || llmProbRaw === undefined
              ? null
              : formatProbability(llmProbRaw);
            return (
              <div key={card.label} className={`summary-card ${card.tone}`}>
                <div className="summary-top">
                  <div>
                    <p className="summary-label">{card.label}</p>
                    <p className="summary-value">{card.value}</p>
                    <p className="summary-helper">{card.helper}</p>
                  </div>
                  {llmProbFormatted && (
                    <span className="summary-llm-prob">LLM: {llmProbFormatted}</span>
                  )}
                </div>
                {card.llm?.comentario && (
                  <p className="summary-llm">{card.llm.comentario}</p>
                )}
              </div>
            );
          })}
        </section>

        <section className="panel llm-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Resumo LLM</p>
              <h2>Análise textual inteligente</h2>
            </div>
          </div>
          {renderTimeline()}
        </section>

        <div className="visual-grid">
          <section className="panel alignment-panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Alinhamento</p>
                <h2>Alinhamento Genético (Exon29)</h2>
              </div>
              <span className="chip">{variantes?.length || 0} mutações</span>
            </div>
            <NeedlemanWunsch
              refSeq={refSeq}
              querySeq={querySeq}
              variantes={variantes}
              windowRadius={6}
              maxWindows={4}
            />
            <div className="variant-section">
              {variantesList.length > 0 ? (
                <ul className="variant-list">
                  {variantesList.map((variant, idx) => (
                    <li key={`${variant.posicao_exon || idx}-${variant.ref || 'r'}-${variant.alt || 'a'}`}>
                      <span className="variant-pill">{variant.tipo || 'mutação'}</span>
                      <span className="variant-detail">Exon {variant.posicao_exon || 'N/D'} • {variant.ref || '-'} → {variant.alt || '-'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="variant-empty">Nenhuma mutação detectada no trecho exibido.</p>
              )}
              {variantes && variantes.length > 4 && (
                <p className="variant-more">+{variantes.length - 4} mutações adicionais no exon.</p>
              )}
            </div>
          </section>

          <section className="panel transcription-panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Transcrição</p>
                <h2>RNA mensageiro</h2>
              </div>
            </div>
            <RNASequence
              refSeq={refSeq}
              querySeq={querySeq}
              variantes={variantes}
              windowRadius={6}
              maxWindows={3}
            />
          </section>

          <section className="panel proteins-panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Proteínas</p>
                <h2>Aminoácidos derivados</h2>
              </div>
            </div>
            <Proteins
              refAmino={refAmino}
              queryAmino={queryAmino}
              variantCodonIndexes={variantCodonIndexes}
            />
          </section>
        </div>
      </main>
    </div>
  );
};

export default Relatorio;