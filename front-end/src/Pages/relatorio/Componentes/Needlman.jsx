// src/components/NeedlemanWunsch.js
import React, { useMemo } from "react";
import './Needlman.css';

const classify = (a, b) => {
  if (a === '-' || b === '-') return 'gap';
  if (a === b) return 'match';
  return 'mismatch';
};

const sliceAround = (seq, centerIndex, radius) => {
  const start = Math.max(0, centerIndex - radius);
  const end = Math.min(seq.length, centerIndex + radius + 1);
  return { start, end, slice: seq.slice(start, end) };
};

const buildRows = (ref, qry, centerIndex, radius) => {
  const { start, end } = sliceAround(ref, centerIndex, radius);
  const refSlice = ref.slice(start, end);
  const qrySlice = qry.slice(start, end);
  const rows = [];
  for (let i = 0; i < end - start; i++) {
    const a = refSlice[i] || '-';
    const b = qrySlice[i] || '-';
    const globalIndex = start + i;
    const type = classify(a, b);
    const isMut = globalIndex === centerIndex;
    rows.push({ a, b, type, isMut, idx: globalIndex });
  }
  return rows;
};

const NeedlemanWunsch = ({ refSeq = '', querySeq = '', variantes = [], windowRadius = 12, maxWindows = 4 }) => {
  const windows = useMemo(() => {
    const list = [];
    if (variantes && variantes.length) {
      for (let i = 0; i < Math.min(variantes.length, maxWindows); i++) {
        const v = variantes[i] || {};
        const center = Math.max(0, (v.posicao_exon || 1) - 1); // assumindo 1-based
        list.push({ center, tipo: v.tipo || 'mutação' });
      }
    } else {
      // fallback: centro da sequência
      const center = Math.floor(Math.max(refSeq.length, querySeq.length) / 2);
      list.push({ center, tipo: 'trecho' });
    }
    return list;
  }, [variantes, refSeq, querySeq, maxWindows]);

  return (
    <div className="needleman-container">
      <h3>Alinhamento (janelas focadas em mutações)</h3>
      {windows.map((w, wi) => {
        const seg = buildRows(refSeq, querySeq, w.center, windowRadius);
        return (
          <div key={`win-${wi}`} className="win-block">
            <div className="win-meta">
              <span className="badge">{w.tipo}</span>
              <span className="mut-pos">Posição ~ {w.center + 1}</span>
              <span className="range">[{Math.max(1, w.center - windowRadius + 1)} - {Math.min(refSeq.length, w.center + windowRadius + 1)}]</span>
            </div>
            <div className="sequence-group">
              <p>Referência</p>
              <div className="sequence-row">
                {seg.map(col => (
                  <span key={`r-${wi}-${col.idx}`} className={`box ${col.isMut ? 'mut' : col.type === 'match' ? 'green' : col.type === 'gap' ? 'pink' : 'yellow'}`}>{col.a}</span>
                ))}
              </div>
            </div>
            <div className="sequence-group">
              <p>Amostra</p>
              <div className="sequence-row">
                {seg.map(col => (
                  <span key={`q-${wi}-${col.idx}`} className={`box ${col.isMut ? 'mut' : col.type === 'match' ? 'green' : col.type === 'gap' ? 'pink' : 'yellow'}`}>{col.b}</span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
      <div className="legend">
        <div className="legend-item"><span className="legend-color green"></span> Match</div>
        <div className="legend-item"><span className="legend-color yellow"></span> Mismatch</div>
        <div className="legend-item"><span className="legend-color pink"></span> Gap</div>
        <div className="legend-item"><span className="legend-color mut"></span> Mutação</div>
      </div>
    </div>
  );
};

export default NeedlemanWunsch;
