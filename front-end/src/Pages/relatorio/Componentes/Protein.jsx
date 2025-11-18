// src/components/Proteins.js
import React, { useMemo } from "react";
import "./Protein.css";

const AMINO_PROPERTIES = {
  Ala: "Hidrofóbica",
  Arg: "Básica",
  Asn: "Polar",
  Asp: "Ácida",
  Cys: "Polar",
  Gln: "Polar",
  Glu: "Ácida",
  Gly: "Flexível",
  His: "Básica",
  Ile: "Hidrofóbica",
  Leu: "Hidrofóbica",
  Lys: "Básica",
  Met: "Início",
  Phe: "Aromática",
  Pro: "Cotovelo",
  Ser: "Polar",
  Thr: "Polar",
  Trp: "Aromática",
  Tyr: "Aromática",
  Val: "Hidrofóbica",
  STOP: "Parada"
};

const buildCards = (refAmino, sampleAmino, variantCodonIndexes, windowSize) => {
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
        property: AMINO_PROPERTIES[ref] || "",
      };
    });
};

const Proteins = ({ refAmino = [], queryAmino = [], variantCodonIndexes = [], windowSize = 2 }) => {
  const cards = useMemo(
    () => buildCards(refAmino, queryAmino, variantCodonIndexes, windowSize),
    [refAmino, queryAmino, variantCodonIndexes, windowSize]
  );

  if (!cards.length) {
    return (
      <div className="proteins-container">
        <h3>Proteínas</h3>
        <p className="proteins-empty">Nenhuma sequência traduzida disponível.</p>
      </div>
    );
  }

  return (
    <div className="proteins-container">
      <div className="proteins-head">
        <h3>Mapa de aminoácidos</h3>
        <p>Mostramos apenas os códons impactados pelas mutações.</p>
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
            {card.differs && <span className="protein-alert">mutação</span>}
          </article>
        ))}
      </div>
    </div>
  );
};

export default Proteins;
