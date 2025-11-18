// src/components/Proteins.js
import React, { useMemo, useCallback } from "react";
import "./Protein.css";
import { useTranslation } from "react-i18next";

const buildCards = (refAmino, sampleAmino, variantCodonIndexes, windowSize, resolveProperty) => {
  const length = Math.max(refAmino.length, sampleAmino.length);
  if (!length) return [];

  const centers = (variantCodonIndexes && variantCodonIndexes.length)
    ? variantCodonIndexes
    : [0];

  const indices = new Set();
  centers.forEach((center) => {
    const start = Math.max(0, center - windowSize);
    const end = Math.min(length - 1, center + windowSize);
    for (let i = start; i <= end; i += 1) {
      indices.add(i);
    }
  });

  return Array.from(indices)
    .sort((a, b) => a - b)
    .slice(0, 18)
    .map((idx) => {
      const ref = refAmino[idx] || "—";
      const sample = sampleAmino[idx] || "—";
      return {
        idx,
        ref,
        sample,
        differs: ref !== sample,
        property: resolveProperty(ref),
      };
    });
};

const Proteins = ({ refAmino = [], queryAmino = [], variantCodonIndexes = [], windowSize = 2 }) => {
  const { t } = useTranslation();
  const resolveProperty = useCallback(
    (aa) => t(`reportDetail.proteins.properties.${aa}`, { defaultValue: aa || "" }),
    [t]
  );
  const cards = useMemo(
    () => buildCards(refAmino, queryAmino, variantCodonIndexes, windowSize, resolveProperty),
    [refAmino, queryAmino, variantCodonIndexes, windowSize, resolveProperty]
  );

  if (!cards.length) {
    return (
      <div className="proteins-container">
        <h3>{t("reportDetail.proteins.kicker")}</h3>
        <p className="proteins-empty">{t("reportDetail.proteins.empty")}</p>
      </div>
    );
  }

  return (
    <div className="proteins-container">
      <div className="proteins-head">
        <h3>{t("reportDetail.proteins.mapTitle")}</h3>
        <p>{t("reportDetail.proteins.mapSubtitle")}</p>
      </div>
      <div className="proteins-grid">
        {cards.map((card) => (
          <article
            key={`aa-${card.idx}`}
            className={`protein-card ${card.differs ? "diff" : "match"}`}
          >
            <span className="protein-index">AA {card.idx + 1}</span>
            <div className="protein-pair">
              <span className="aa-pill ref">{card.ref}</span>
              <span className="aa-pill sample">{card.sample}</span>
            </div>
            <p className="protein-property">{card.property || ""}</p>
            {card.differs && <span className="protein-alert">{t("reportDetail.proteins.badge")}</span>}
          </article>
        ))}
      </div>
    </div>
  );
};

export default Proteins;
