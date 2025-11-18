// src/components/NeedlemanWunsch.js
import React, { useMemo } from "react";
import "./Needlman.css";

const classify = (a, b) => {
  if (a === "-" || b === "-") return "gap";
  if (a === b) return "match";
  return "mismatch";
};

const buildColumns = (refSeq, querySeq, centerIndex, radius) => {
  const length = Math.max(refSeq.length, querySeq.length);
  const start = Math.max(0, centerIndex - radius);
  const end = Math.min(length, centerIndex + radius + 1);
  const cols = [];

  for (let i = start; i < end; i += 1) {
    const refBase = refSeq[i] || "-";
    const sampleBase = querySeq[i] || "-";
    cols.push({
      idx: i,
      refBase,
      sampleBase,
      type: classify(refBase, sampleBase),
      isCenter: i === centerIndex,
    });
  }

  return cols;
};

const buildWindows = (refSeq, querySeq, variantes, windowRadius, maxWindows) => {
  const total = Math.max(refSeq.length, querySeq.length);
  const fallbackCenter = Math.floor(total / 2) || 0;

  const centers = (variantes || [])
    .map((variant) =>
      typeof variant?.posicao_exon === "number" ? Math.max(0, variant.posicao_exon - 1) : null
    )
    .filter((value) => value !== null);

  const uniqueCenters = Array.from(new Set(centers)).slice(0, maxWindows);
  if (!uniqueCenters.length) uniqueCenters.push(fallbackCenter);

  return uniqueCenters.map((center, index) => {
    const columns = buildColumns(refSeq, querySeq, center, windowRadius);
    const rangeStart = columns[0]?.idx ?? center;
    const rangeEnd = columns[columns.length - 1]?.idx ?? center;
    return {
      id: `window-${center}-${index}`,
      center,
      tipo: variantes[index]?.tipo || "mutação",
      range: {
        start: rangeStart + 1,
        end: rangeEnd + 1,
      },
      columns,
    };
  });
};

const NeedlemanWunsch = ({
  refSeq = "",
  querySeq = "",
  variantes = [],
  windowRadius = 6,
  maxWindows = 4,
}) => {
  const windows = useMemo(
    () => buildWindows(refSeq, querySeq, variantes, windowRadius, maxWindows),
    [refSeq, querySeq, variantes, windowRadius, maxWindows]
  );

  return (
    <div className="needleman-container">
      <div className="need-header">
        <h3>Trechos focados em mutações</h3>
        <p>Referência no topo, amostra logo abaixo para leitura rápida.</p>
      </div>
      <div className="alignment-windows">
        {windows.map((window) => (
          <article key={window.id} className="alignment-window">
            <header className="win-meta">
              <span className="badge">{window.tipo}</span>
              <span className="mut-pos">Posição {window.center + 1}</span>
              <span className="range">
                {window.range.start} – {window.range.end}
              </span>
            </header>
            <div className="stack-grid" role="list">
              {window.columns.map((column) => (
                <div
                  key={`${window.id}-${column.idx}`}
                  className={`stack-column ${column.type} ${column.isCenter ? "mut" : ""}`}
                  role="listitem"
                >
                  <span className="stack-index">{column.idx + 1}</span>
                  <span className="stack-base ref">{column.refBase}</span>
                  <span className="stack-base sample">{column.sampleBase}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
      <div className="legend">
        <div className="legend-item">
          <span className="legend-color green" /> Match
        </div>
        <div className="legend-item">
          <span className="legend-color yellow" /> Mismatch
        </div>
        <div className="legend-item">
          <span className="legend-color pink" /> Gap
        </div>
        <div className="legend-item">
          <span className="legend-color mut" /> Mutação
        </div>
      </div>
    </div>
  );
};

export default NeedlemanWunsch;
