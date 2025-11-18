// src/pages/AnalysisPage.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./analise.css";
import Sidebar from "../../Components/Sidebar";
import RNASequence from "./Componentes/RNASequence";
import NeedlemanWunsch from "./Componentes/Needlman";
import Proteins from "./Componentes/Protein";
import api, { fasta } from "../../api";
import { jsPDF } from "jspdf";
import { useTranslation } from "react-i18next";

const formatProbability = (value) => {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  if (number <= 1) return `${(number * 100).toFixed(1)}%`;
  return `${number.toFixed(1)}%`;
};

const getRiskLabel = (classification, t) => {
  if (classification === 1) return t("reportDetail.riskLevels.high");
  if (classification === 0) return t("reportDetail.riskLevels.low");
  return t("reportDetail.riskLevels.unknown");
};

const getRiskHelper = (classification, t) => {
  if (classification === 1) return t("reportDetail.summary.cards.risk.helper.high");
  if (classification === 0) return t("reportDetail.summary.cards.risk.helper.low");
  return t("reportDetail.summary.cards.risk.helper.awaiting");
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
  const { t, i18n } = useTranslation();
  const [relatorio, setRelatorio] = useState(null);
  const [dadosAnalise, setDadosAnalise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [llmSections, setLlmSections] = useState([]);
  const [llmInsights, setLlmInsights] = useState([]);
  const [llmMeta, setLlmMeta] = useState(null);
  const [llmLoading, setLlmLoading] = useState(true);
  const [llmError, setLlmError] = useState("");
  const [emailStatus, setEmailStatus] = useState("idle");
  const emailTimeoutRef = useRef(null);
  const locale = useMemo(() => (i18n.language === "pt" ? "pt-BR" : "en-US"), [i18n.language]);

  useEffect(() => () => {
    if (emailTimeoutRef.current) {
      clearTimeout(emailTimeoutRef.current);
    }
  }, []);

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
              setLlmError(t("reportDetail.errors.llmGenerate"));
            }
          }
        } else if (!cancelled) {
          console.error("Erro ao buscar insights LLM:", err);
          setLlmError(t("reportDetail.errors.llmLoad"));
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
        setError(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLlmLoading(false);
        }
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [t]);

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);
    doc.text(t("reportDetail.pdf.title"), 10, 20);
    doc.setFontSize(12);
    doc.text(`${t("reportDetail.pdf.animalName")}: ${relatorio?.Nome || t("reportDetail.patientCard.notProvided")}`, 10, 35);
    doc.text(`${t("reportDetail.pdf.reportId")}: ${relatorio?.id || t("reportDetail.riskLevels.unknown")}`, 10, 45);
    doc.setFontSize(14);
    doc.text(t("reportDetail.pdf.results"), 10, 60);
    doc.setFontSize(12);
    doc.text(`${t("reportDetail.pdf.classification")}: ${getRiskLabel(dadosAnalise?.classificacao, t)}`, 10, 70);
    doc.text(`${t("reportDetail.pdf.confidence")}: ${dadosAnalise?.confianca || t("reportDetail.riskLevels.unknown")}`, 10, 80);
    doc.text(`${t("reportDetail.pdf.identity")}: ${dadosAnalise?.identidade || t("reportDetail.riskLevels.unknown")}`, 10, 90);
    doc.text(`${t("reportDetail.pdf.alignmentScore")}: ${dadosAnalise?.score?.toLocaleString() || t("reportDetail.riskLevels.unknown")}`, 10, 100);

    const resumoParaPdf = llmInsights?.length
      ? llmInsights.join("\n\n")
      : (llmSections || []).map((sec) => `${sec.titulo || sec.id}: ${sec.comentario || ""}`).join("\n");
    const resumoQuebrado = doc.splitTextToSize(resumoParaPdf || llmError || t("reportDetail.pdf.empty"), 180);
    doc.text(t("reportDetail.pdf.summary"), 10, 115);
    doc.text(resumoQuebrado, 10, 125);
    doc.save(t("reportDetail.pdf.fileName"));
  };

  const refSeq = dadosAnalise?.exon29_referencia || "";
  const querySeq = dadosAnalise?.exon29_amostra || "";
  const variantes = dadosAnalise?.variantes_exon29 || [];

  const infoFields = useMemo(() => ([
    { label: t("reportDetail.patientCard.fields.name"), value: relatorio?.Nome },
    { label: t("reportDetail.patientCard.fields.age"), value: relatorio?.Idade },
    { label: t("reportDetail.patientCard.fields.client"), value: relatorio?.Cliente },
    { label: t("reportDetail.patientCard.fields.sex"), value: relatorio?.Sexo },
    { label: t("reportDetail.patientCard.fields.breed"), value: relatorio?.Raca },
    { label: t("reportDetail.patientCard.fields.reportId"), value: relatorio?.id },
  ]), [relatorio, t]);

  const classificationValue = dadosAnalise?.classificacao;
  const classificacaoValor = useMemo(() => getRiskLabel(classificationValue, t), [classificationValue, t]);
  const riskTone = useMemo(
    () => (classificationValue === 1 ? "alert" : classificationValue === 0 ? "safe" : "neutral"),
    [classificationValue]
  );
  const riskHelper = useMemo(() => getRiskHelper(classificationValue, t), [classificationValue, t]);

  const summaryBase = useMemo(() => ([
    { id: "risk", label: t("reportDetail.summary.cards.risk.label"), value: classificacaoValor, helper: riskHelper, tone: riskTone },
    { id: "confidence", label: t("reportDetail.summary.cards.confidence.label"), value: dadosAnalise?.confianca || t("reportDetail.riskLevels.unknown"), helper: t("reportDetail.summary.cards.confidence.helper"), tone: "neutral" },
    { id: "identity", label: t("reportDetail.summary.cards.identity.label"), value: dadosAnalise?.identidade || t("reportDetail.riskLevels.unknown"), helper: t("reportDetail.summary.cards.identity.helper"), tone: "neutral" },
    { id: "alignmentScore", label: t("reportDetail.summary.cards.alignmentScore.label"), value: dadosAnalise?.score?.toLocaleString() || t("reportDetail.riskLevels.unknown"), helper: t("reportDetail.summary.cards.alignmentScore.helper"), tone: "neutral" },
  ]), [classificacaoValor, riskHelper, riskTone, dadosAnalise, t]);

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

  const renderSectionInsight = (sectionId, label) => {
    const section = llmLookup[sectionId];
    if (!section?.comentario) return null;
    const probabilityLabel = section?.probabilidade !== undefined && section?.probabilidade !== null
      ? formatProbability(section.probabilidade)
      : null;
    return (
      <div className="llm-section-note">
        <p className="llm-section-kicker">{label || section.titulo || t("reportDetail.llmPanel.insightLabel")}</p>
        <p className="llm-section-text">{section.comentario}</p>
        {probabilityLabel && (
          <p className="llm-section-meta">{t("reportDetail.llmPanel.confidence", { value: probabilityLabel })}</p>
        )}
      </div>
    );
  };

  const dataTimeline = useMemo(() => {
    if (!dadosAnalise) return [];
    const metricas = dadosAnalise.metricas_exon29 || {};
    const eventos = [];

    if (classificationValue === 0 || classificationValue === 1) {
      eventos.push({
        id: "data-risk",
        type: "data",
        kicker: t("reportDetail.timeline.modelKicker"),
        title: t("reportDetail.timeline.classificationTitle"),
        text: t("reportDetail.timeline.classificationText", { classification: classificacaoValor, helper: riskHelper }),
      });
    }

    if (dadosAnalise?.confianca) {
      eventos.push({
        id: "data-confidence",
        type: "data",
        kicker: t("reportDetail.timeline.confidenceKicker"),
        title: t("reportDetail.timeline.confidenceTitle"),
        text: t("reportDetail.timeline.confidenceText", { value: dadosAnalise.confianca }),
      });
    }

    if (typeof dadosAnalise?.score === "number") {
      eventos.push({
        id: "data-score",
        type: "data",
        kicker: t("reportDetail.timeline.scoreKicker"),
        title: t("reportDetail.timeline.scoreTitle"),
        text: t("reportDetail.timeline.scoreText", { value: dadosAnalise.score.toLocaleString() }),
      });
    }

    if (typeof metricas.cobertura_pct === "number") {
      eventos.push({
        id: "data-coverage",
        type: "data",
        kicker: t("reportDetail.timeline.coverageKicker"),
        title: t("reportDetail.timeline.coverageTitle"),
        text: t("reportDetail.timeline.coverageText", { value: metricas.cobertura_pct }),
      });
    }

    if (typeof metricas.total_variantes === "number") {
      eventos.push({
        id: "data-variants",
        type: "data",
        kicker: t("reportDetail.timeline.variantsKicker"),
        title: t("reportDetail.timeline.variantsTitle"),
        text: t("reportDetail.timeline.variantsText", { count: metricas.total_variantes }),
      });
    }

    return eventos;
  }, [dadosAnalise, classificationValue, classificacaoValor, riskHelper, t]);

  const llmTimeline = useMemo(() => {
    if (!llmInsights?.length) return [];

    return llmInsights.map((texto, i) => ({
      id: `llm-${i}`,
      type: "llm",
      kicker: t("reportDetail.timeline.llmKicker"),
      title: t("reportDetail.timeline.llmTitle", { index: i + 1 }),
      text: texto,
    }));
  }, [llmInsights, t]);

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
      return <p className="llm-text muted">{t("reportDetail.llmPanel.generating")}</p>;
    }

    const itens = timelineEntries.length ? timelineEntries : dataTimeline;

    if (!itens.length) {
      return <p className="llm-text muted">{t("reportDetail.llmPanel.empty")}</p>;
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
            {t("reportDetail.llmPanel.generated", {
              model: llmMeta.modelo || "Gemini",
              date: new Date(llmMeta.gerado_em).toLocaleString(locale),
            })}
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

  const handleMockEmail = () => {
    if (emailTimeoutRef.current) {
      clearTimeout(emailTimeoutRef.current);
    }
    setEmailStatus("sent");
    emailTimeoutRef.current = setTimeout(() => setEmailStatus("idle"), 4000);
  };

  if (loading) return <div className="loading">{t("reportDetail.loading")}</div>;
  if (error) return <div className="error">{t("reportDetail.errors.generic")}</div>;

  return (
    <div className="analysis-page">
      <Sidebar />
      <main className="analysis-content">
        <header className="page-header">
          <div>
            <p className="page-kicker">{t("reportDetail.page.kicker")}</p>
            <h1>{t("reportDetail.page.title")}</h1>
          </div>
          <div className="header-actions">
            <button className="button-email" type="button" onClick={handleMockEmail}>
              {t("reportDetail.page.email")}
            </button>
            <button className="button-download" onClick={downloadPDF}>
              {t("reportDetail.page.download")}
            </button>
            <div
              className={`email-pop ${emailStatus === "sent" ? "visible" : ""}`}
              role="status"
              aria-live="polite"
            >
              {t("reportDetail.page.emailSent")}
            </div>
          </div>
        </header>

        <section className="panel form-card">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">{t("reportDetail.patientCard.kicker")}</p>
              <h2>{t("reportDetail.patientCard.title")}</h2>
            </div>
          </div>
          <div className="form-grid">
            {infoFields.map(field => (
              <div className="form-field" key={field.label}>
                <span className="field-label">{field.label}</span>
                <span className="field-value">{field.value || t("reportDetail.patientCard.notProvided")}</span>
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
                    <span className="summary-llm-prob">{t("reportDetail.summary.llmPrefix", { value: llmProbFormatted })}</span>
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
              <p className="panel-kicker">{t("reportDetail.llmPanel.kicker")}</p>
              <h2>{t("reportDetail.llmPanel.title")}</h2>
            </div>
          </div>
          {renderTimeline()}
        </section>

        <div className="visual-grid">
          <section className="panel alignment-panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">{t("reportDetail.alignment.kicker")}</p>
                <h2>{t("reportDetail.alignment.title")}</h2>
              </div>
              <span className="chip">{t("reportDetail.alignment.mutations", { count: variantes?.length || 0 })}</span>
            </div>
            <NeedlemanWunsch
              refSeq={refSeq}
              querySeq={querySeq}
              variantes={variantes}
              windowRadius={6}
              maxWindows={4}
            />
            {renderSectionInsight("alignmentDetail", t("reportDetail.alignment.insight"))}
            <div className="variant-section">
              {variantesList.length > 0 ? (
                <ul className="variant-list">
                  {variantesList.map((variant, idx) => (
                    <li key={`${variant.posicao_exon || idx}-${variant.ref || 'r'}-${variant.alt || 'a'}`}>
                      <span className="variant-pill">{variant.tipo || t("reportDetail.alignment.fallbackType")}</span>
                      <span className="variant-detail">
                        {t("reportDetail.alignment.variant", {
                          position: variant.posicao_exon || t("reportDetail.riskLevels.unknown"),
                          ref: variant.ref || '-',
                          alt: variant.alt || '-',
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="variant-empty">{t("reportDetail.alignment.empty")}</p>
              )}
              {variantes && variantes.length > 4 && (
                <p className="variant-more">{t("reportDetail.alignment.more", { count: variantes.length - 4 })}</p>
              )}
            </div>
          </section>

          <section className="panel transcription-panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">{t("reportDetail.transcription.kicker")}</p>
                <h2>{t("reportDetail.transcription.title")}</h2>
              </div>
            </div>
            <RNASequence
              refSeq={refSeq}
              querySeq={querySeq}
              variantes={variantes}
              windowRadius={6}
              maxWindows={3}
            />
            {renderSectionInsight("rnaFocus", t("reportDetail.transcription.insight"))}
          </section>

          <section className="panel proteins-panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">{t("reportDetail.proteins.kicker")}</p>
                <h2>{t("reportDetail.proteins.title")}</h2>
              </div>
            </div>
            <Proteins
              refAmino={refAmino}
              queryAmino={queryAmino}
              variantCodonIndexes={variantCodonIndexes}
            />
            {renderSectionInsight("proteinMap", t("reportDetail.proteins.insight"))}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Relatorio;