// src/components/NeedlemanWunsch.js
import React, { useMemo } from "react";
import "./Needlman.css";
import { useTranslation } from "react-i18next";

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

const buildWindows = (refSeq, querySeq, variantes, windowRadius, maxWindows, fallbackType) => {
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
      tipo: variantes[index]?.tipo || fallbackType,
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
  const { t } = useTranslation();
  const fallbackType = t("reportDetail.alignment.fallbackType");
  const windows = useMemo(
    () => buildWindows(refSeq, querySeq, variantes, windowRadius, maxWindows, fallbackType),
    [refSeq, querySeq, variantes, windowRadius, maxWindows, fallbackType]
  );

  return (
    <div className="needleman-container">
      <div className="need-header">
        <h3>{t("reportDetail.alignment.windowTitle")}</h3>
        <p>{t("reportDetail.alignment.windowSubtitle")}</p>
      </div>
      <div className="alignment-windows">
        {windows.map((window) => (
          <article key={window.id} className="alignment-window">
            <header className="win-meta">
              <span className="badge">{window.tipo}</span>
              <span className="mut-pos">{t("reportDetail.alignment.position", { value: window.center + 1 })}</span>
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
          <span className="legend-color green" /> {t("reportDetail.alignment.legend.match")}
        </div>
        <div className="legend-item">
          <span className="legend-color yellow" /> {t("reportDetail.alignment.legend.mismatch")}
        </div>
        <div className="legend-item">
          <span className="legend-color pink" /> {t("reportDetail.alignment.legend.gap")}
        </div>
        <div className="legend-item">
          <span className="legend-color mut" /> {t("reportDetail.alignment.legend.mutation")}
        </div>
      </div>
    </div>
  );
};

export default NeedlemanWunsch;
