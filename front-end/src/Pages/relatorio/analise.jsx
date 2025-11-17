// src/pages/AnalysisPage.js
import React, { useEffect, useMemo, useState } from "react";
import "./analise.css";
import Sidebar from "../../Components/Sidebar";
import RNASequence from "./Componentes/RNASequence";
import NeedlemanWunsch from "./Componentes/Needlman";
import Proteins from "./Componentes/Protein";
import api, { fasta } from "../../api";
import { jsPDF } from "jspdf";

const Relatorio = () => {
  const [relatorio, setRelatorio] = useState(null);
  const [dadosAnalise, setDadosAnalise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [llmResumo, setLlmResumo] = useState("");
  const [llmLoading, setLlmLoading] = useState(true);
  const [llmError, setLlmError] = useState("");

  // Mapeamento de classificação numérica para texto
  const mapaClassificacao = {
    0: "Risco Baixo",
    1: "Risco Alto"

  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setLlmLoading(true);
        setLlmError("");
        setLlmResumo("");
        // Busca relatório, análise e resumo em paralelo, tolerando falhas parciais
        const [relRes, analRes, llmRes] = await Promise.allSettled([
          api.get("/relatorios/ultimo"),
          fasta.get("/dados-analise"),
          fasta.get("/resumo-analise"),
        ]);

        if (relRes.status === "fulfilled") {
          setRelatorio(relRes.value.data);
        }
        if (analRes.status === "fulfilled") {
          setDadosAnalise(analRes.value.data);
        }
        if (llmRes.status === "fulfilled") {
          const resumo = llmRes.value.data?.relatorio_texto || llmRes.value.data?.resumo;
          setLlmResumo(resumo || "Resumo ainda não disponível para esta análise.");
        } else {
          setLlmError("Não foi possível gerar o resumo automático.");
        }

        // Só mostra erro se ambas falharem (ex.: não logado e ainda sem análise)
        if (relRes.status === "rejected" && analRes.status === "rejected") {
          throw new Error("Falha ao carregar dados do relatório e da análise");
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError("Erro ao carregar dados do relatório");
      } finally {
        setLoading(false);
        setLlmLoading(false);
      }
    };

    fetchData();
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

    const resumoParaPdf = llmResumo || llmError || "Resumo não disponível.";
    const resumoQuebrado = doc.splitTextToSize(resumoParaPdf, 180);
    doc.text("Resumo IA:", 10, 115);
    doc.text(resumoQuebrado, 10, 125);
    
    doc.save("relatorio-genetico.pdf");
  };

  if (loading) return <div className="loading">Carregando dados...</div>;
  if (error) return <div className="error">{error}</div>;

  // Extrai dados do alinhamento para visualização
  const refSeq = dadosAnalise?.exon29_referencia || '';
  const querySeq = dadosAnalise?.exon29_amostra || '';
  const variantes = dadosAnalise?.variantes_exon29 || [];

  // RNA e proteínas
  // Utiliza lógica do RNASequence para obter aminoácidos
  function dnaToRna(seq) {
    return seq.replace(/T/g, 'U');
  }
  function getCodons(rnaSeq) {
    const codons = [];
    for (let i = 0; i < rnaSeq.length; i += 3) {
      codons.push(rnaSeq.slice(i, i + 3));
    }
    return codons;
  }
  const codonTable = {
    'AUG': 'Met', 'UUU': 'Phe', 'UUC': 'Phe', 'UUA': 'Leu', 'UUG': 'Leu',
    'CUU': 'Leu', 'CUC': 'Leu', 'CUA': 'Leu', 'CUG': 'Leu',
    'AUU': 'Ile', 'AUC': 'Ile', 'AUA': 'Ile', 'GUU': 'Val', 'GUC': 'Val', 'GUA': 'Val', 'GUG': 'Val',
    'UCU': 'Ser', 'UCC': 'Ser', 'UCA': 'Ser', 'UCG': 'Ser',
    'AGU': 'Ser', 'AGC': 'Ser', 'CCU': 'Pro', 'CCC': 'Pro', 'CCA': 'Pro', 'CCG': 'Pro',
    'ACU': 'Thr', 'ACC': 'Thr', 'ACA': 'Thr', 'ACG': 'Thr',
    'GCU': 'Ala', 'GCC': 'Ala', 'GCA': 'Ala', 'GCG': 'Ala',
    'UAU': 'Tyr', 'UAC': 'Tyr', 'UAA': 'STOP', 'UAG': 'STOP', 'UGA': 'STOP',
    'CAU': 'His', 'CAC': 'His', 'CAA': 'Gln', 'CAG': 'Gln',
    'AAU': 'Asn', 'AAC': 'Asn', 'AAA': 'Lys', 'AAG': 'Lys',
    'GAU': 'Asp', 'GAC': 'Asp', 'GAA': 'Glu', 'GAG': 'Glu',
    'UGU': 'Cys', 'UGC': 'Cys', 'UGG': 'Trp', 'CGU': 'Arg', 'CGC': 'Arg', 'CGA': 'Arg', 'CGG': 'Arg',
    'AGA': 'Arg', 'AGG': 'Arg', 'GGU': 'Gly', 'GGC': 'Gly', 'GGA': 'Gly', 'GGG': 'Gly',
  };
  function getAminoAcids(codons) {
    return codons.map(codon => codonTable[codon] || '');
  }
  const maxLen = 30;
  const refRna = dnaToRna(refSeq.slice(0, maxLen));
  const queryRna = dnaToRna(querySeq.slice(0, maxLen));
  const refCodons = getCodons(refRna);
  const queryCodons = getCodons(queryRna);
  const refAas = getAminoAcids(refCodons);
  const queryAas = getAminoAcids(queryCodons);

  const infoFields = [
    { label: "Nome", value: relatorio?.Nome },
    { label: "Idade", value: relatorio?.Idade },
    { label: "Cliente", value: relatorio?.Cliente },
    { label: "Sexo", value: relatorio?.Sexo },
    { label: "Raça", value: relatorio?.Raca },
    { label: "ID do Relatório", value: relatorio?.id },
  ];

  const classificacaoValor = mapaClassificacao[dadosAnalise?.classificacao] || "N/A";
  const riskTone = dadosAnalise?.classificacao === 1 ? "alert" : dadosAnalise?.classificacao === 0 ? "safe" : "neutral";
  const riskHelper = classificacaoValor === "N/A"
    ? "Aguardando execução da análise"
    : dadosAnalise?.classificacao === 1
      ? "Monitoramento imediato recomendado"
      : "Sem sinais de risco elevado";

  const summaryCards = [
    {
      label: "Classificação de risco",
      value: classificacaoValor,
      helper: riskHelper,
      tone: riskTone,
    },
    {
      label: "Confiança do modelo",
      value: dadosAnalise?.confianca || "N/A",
      helper: "Probabilidade indicada pela IA",
      tone: "neutral",
    },
    {
      label: "Identidade genética",
      value: dadosAnalise?.identidade || "N/A",
      helper: "Comparação exon29 vs referência",
      tone: "neutral",
    },
    {
      label: "Score de alinhamento",
      value: dadosAnalise?.score?.toLocaleString() || "N/A",
      helper: "Pontuação Needleman-Wunsch",
      tone: "neutral",
    },
  ];

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
    if (!llmResumo) return [];
    const blocos = llmResumo
      .split(/\n{2,}/)
      .map((trecho) => trecho.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    return blocos.map((texto, index) => ({
      id: `llm-${index}`,
      type: "llm",
      kicker: "Insight LLM",
      title: `Resumo ${index + 1}`,
      text: texto,
    }));
  }, [llmResumo]);

  const timelineEntries = useMemo(() => {
    if (!dataTimeline.length && !llmTimeline.length) return [];
    const intercalado = [];
    const limite = Math.max(dataTimeline.length, llmTimeline.length);

    for (let i = 0; i < limite; i += 1) {
      if (dataTimeline[i]) intercalado.push(dataTimeline[i]);
      if (llmTimeline[i]) intercalado.push(llmTimeline[i]);
    }
    return intercalado;
  }, [dataTimeline, llmTimeline]);

  const renderTimeline = () => {
    if (llmLoading) {
      return <p className="llm-text muted">Gerando resumo inteligente...</p>;
    }

    const itensParaRenderizar = timelineEntries.length ? timelineEntries : dataTimeline;

    if (!itensParaRenderizar.length) {
      return <p className="llm-text muted">Nenhuma métrica disponível para montar o resumo.</p>;
    }

    return (
      <div className="llm-timeline">
        {itensParaRenderizar.map((item) => (
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
      </div>
    );
  };

  const variantesList = variantes && variantes.length > 0 ? variantes.slice(0, 4) : [];

  return (
    <div className="analysis-page">
      <Sidebar />
      <main className="analysis-content">
        <header className="page-header">
          <div>
            <p className="page-kicker">PKD1 • Exon29</p>
            <h1>Relatório Genético</h1>
          </div>
          <button className="button-download" onClick={downloadPDF}>
            Baixar PDF
          </button>
        </header>

        <section className="panel form-card">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Ficha do paciente</p>
              <h2>Dados do felino</h2>
            </div>
          </div>
          <div className="form-grid">
            {infoFields.map((field) => (
              <div className="form-field" key={field.label}>
                <span className="field-label">{field.label}</span>
                <span className="field-value">{field.value || "Não informado"}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel summary-panel">
          {summaryCards.map((card) => (
            <div key={card.label} className={`summary-card ${card.tone}`}>
              <p className="summary-label">{card.label}</p>
              <p className="summary-value">{card.value}</p>
              <p className="summary-helper">{card.helper}</p>
            </div>
          ))}
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
            <NeedlemanWunsch refSeq={refSeq} querySeq={querySeq} variantes={variantes} />
            <div className="variant-section">
              {variantesList.length > 0 ? (
                <ul className="variant-list">
                  {variantesList.map((variant, idx) => (
                    <li key={`${variant.posicao_exon || idx}-${variant.ref || 'r'}-${variant.alt || 'a'}`}>
                      <span className="variant-pill">{variant.tipo || 'mutação'}</span>
                      <span className="variant-detail">
                        Exon {variant.posicao_exon || 'N/D'} • {variant.ref || '-'} → {variant.alt || '-'}
                      </span>
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
            <RNASequence refSeq={refSeq} querySeq={querySeq} />
          </section>

          <section className="panel protein-panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Tradução</p>
                <h2>Cadeia proteica estimada</h2>
              </div>
            </div>
            <Proteins refAas={refAas} queryAas={queryAas} />
          </section>
        </div>
      </main>
    </div>
  );
};

export default Relatorio;