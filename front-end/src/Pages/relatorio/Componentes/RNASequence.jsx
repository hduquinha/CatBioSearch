// src/components/RNASequence.js
import React, { useMemo } from "react";
import "./RNASequences.css";

const dnaToRna = (seq = "") => seq.replace(/T/gi, "U");
const classify = (a, b) => {
  if (a === "-" || b === "-") return "gap";
  return a === b ? "match" : "mismatch";
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

const buildColumns = (refSeq, sampleSeq, centerIndex, radius) => {
  const length = Math.max(refSeq.length, sampleSeq.length);
  const start = Math.max(0, centerIndex - radius);
  const end = Math.min(length, centerIndex + radius + 1);
  const cols = [];

  for (let i = start; i < end; i += 1) {
    const refBase = refSeq[i] || "-";
    const sampleBase = sampleSeq[i] || "-";
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

const buildWindows = (refSeq, sampleSeq, variantes, windowRadius, maxWindows) => {
  const total = Math.max(refSeq.length, sampleSeq.length);
  const fallbackCenter = Math.floor(total / 2) || 0;
  const centers = (variantes || [])
    .map((variant) =>
      typeof variant?.posicao_exon === "number" ? Math.max(0, variant.posicao_exon - 1) : null
    )
    .filter((value) => value !== null);

  const uniqueCenters = Array.from(new Set(centers)).slice(0, maxWindows);
  if (!uniqueCenters.length) uniqueCenters.push(fallbackCenter);

  return uniqueCenters.map((center, index) => {
    const columns = buildColumns(refSeq, sampleSeq, center, windowRadius);
    return {
      id: `rna-${center}-${index}`,
      center,
      tipo: variantes[index]?.tipo || "trecho",
      columns,
    };
  });
};

const extractCodonInfo = (columns, refSeq, sampleSeq) => {
  const seen = new Set();
  return columns.map((column) => {
    const codonIndex = Math.floor(column.idx / 3);
    if (seen.has(codonIndex)) return null;
    seen.add(codonIndex);
    const start = codonIndex * 3;
    const refCodon = refSeq.slice(start, start + 3);
    const sampleCodon = sampleSeq.slice(start, start + 3);
    return {
      codonIndex,
      refCodon,
      sampleCodon,
      refAa: CODON_TABLE[refCodon] || "",
      sampleAa: CODON_TABLE[sampleCodon] || "",
      differs: refCodon !== sampleCodon,
    };
  }).filter(Boolean);
};

const RNASequence = ({
  refSeq = "",
  querySeq = "",
  variantes = [],
  windowRadius = 6,
  maxWindows = 3,
}) => {
  const refRna = useMemo(() => dnaToRna(refSeq), [refSeq]);
  const sampleRna = useMemo(() => dnaToRna(querySeq), [querySeq]);

  const windows = useMemo(
    () => buildWindows(refRna, sampleRna, variantes, windowRadius, maxWindows),
    [refRna, sampleRna, variantes, windowRadius, maxWindows]
  );

  return (
    <div className="rna-sequence">
      <div className="rna-head">
        <h3>Transcrição em destaque</h3>
        <p>Janelas equivalentes ao alinhamento, focadas nas mutações.</p>
      </div>
      <div className="rna-windows">
        {windows.map((window) => {
          const codonInfo = extractCodonInfo(window.columns, refRna, sampleRna);
          return (
            <article key={window.id} className="rna-window">
              <header className="win-meta">
                <span className="badge">{window.tipo}</span>
                <span className="mut-pos">nt {window.center + 1}</span>
              </header>
              <div className="stack-grid" role="list">
                {window.columns.map((column) => (
                  <div
                    key={`${window.id}-${column.idx}`}
                    className={`stack-column rna ${column.type} ${column.isCenter ? "mut" : ""}`}
                    role="listitem"
                  >
                    <span className="stack-index">{column.idx + 1}</span>
                    <span className="stack-base ref">{column.refBase}</span>
                    <span className="stack-base sample">{column.sampleBase}</span>
                  </div>
                ))}
              </div>
              <div className="codon-track">
                {codonInfo.map((codon) => (
                  <span
                    key={`${window.id}-codon-${codon.codonIndex}`}
                    className={`codon-badge ${codon.differs ? "diff" : ""}`}
                  >
                    Codon {codon.codonIndex + 1}: {codon.refCodon || "---"} → {codon.sampleCodon || "---"}
                    <strong>{codon.refAa || "?"}</strong>
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default RNASequence;
