// src/pages/AnalysisPage.js
import React, { useEffect, useState } from "react";
import "./analise.css";
import Sidebar from "../../Components/Sidebar";
import RNASequence from "./Componentes/RNASequence";
import NeedlemanWunsch from "./Componentes/Needlman";
import Proteins from "./Componentes/Protein";
import Dispersao from "./Componentes/Dispersao";
import api, { fasta } from "../../api";
import { jsPDF } from "jspdf";

const Relatorio = () => {
  const [relatorio, setRelatorio] = useState(null);
  const [dadosAnalise, setDadosAnalise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Mapeamento de classificação numérica para texto
  const mapaClassificacao = {
    0: "Risco Baixo",
    1: "Risco Alto"

  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Busca dados do relatório do animal
        const relatorioResponse = await api.get("relatorios/ultimo");
        setRelatorio(relatorioResponse.data);
        
        // Busca dados da análise genética
        const analiseResponse = await fasta.get("dados-analise");
        setDadosAnalise(analiseResponse.data);
        
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError("Erro ao carregar dados do relatório");
      } finally {
        setLoading(false);
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
    
    doc.save("relatorio-genetico.pdf");
  };

  if (loading) return <div className="loading">Carregando dados...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="analysis-page">
      <Sidebar />

      {/* Informações do Animal */}
      <div className="cat-info">
        <div className="cat-info-header">
          <h2>Relatório do Animal</h2>
        </div>
        <div className="cat-info-body">
          <p><strong>Nome:</strong> {relatorio?.Nome || "Não informado"}</p>
          <p><strong>Idade:</strong> {relatorio?.Idade || "Não informado"}</p>
          <p><strong>Cliente:</strong> {relatorio?.Cliente || "Não informado"}</p>
          <p><strong>Sexo:</strong> {relatorio?.Sexo || "Não informado"}</p>
          <p><strong>Raça:</strong> {relatorio?.Raca || "Não informado"}</p>
          <p><strong>ID do Relatório:</strong> {relatorio?.id || "N/A"}</p>
        </div>
      </div>

      {/* Resumo da Análise */}
      <div className="analysis-summary">
        <div className="summary-item">
          <h3>Classificação</h3>
          <div className={`risk-indicator ${dadosAnalise?.classificacao}`}>
            {mapaClassificacao[dadosAnalise?.classificacao] || "N/A"}
          </div>
        </div>
        <div className="summary-item">
          <h3>Confiança</h3>
          <div className="summary-value confidence">
            {dadosAnalise?.confianca || "N/A"}
          </div>
        </div>
        <div className="summary-item">
          <h3>Identidade Genética</h3>
          <div className="summary-value identity">
            {dadosAnalise?.identidade || "N/A"}
          </div>
        </div>
      </div>

      {/* Detalhes Técnicos */}
      <div className="technical-details">
        <div className="detail-item">
          <h3>Score de Alinhamento</h3>
          <div className="detail-value">
            {dadosAnalise?.score?.toLocaleString() || "N/A"}
          </div>
        </div>
      </div>

      {/* Seções de Visualização de Dados */}
      <div className="data-visualization">
        <div className="needleman-section">
          <NeedlemanWunsch />
        </div>
        <div className="analysis-data">
          <div className="transcription-section">
            <RNASequence />
          </div>
          <div className="protein-section">
            <Proteins />
          </div>
        </div>
        <div className="scatter-plot">
          <Dispersao />
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="action-buttons">
        <button className="button-download" onClick={downloadPDF}>
          Baixar PDF
        </button>
      </div>
    </div>
  );
};

export default Relatorio;