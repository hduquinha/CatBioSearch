// src/components/RNASequence.js
import React, { useMemo } from "react";
import './RNASequences.css'; // Importa o CSS para estilização

const dnaToRna = (seq) => seq.replace(/T/g, 'U');
const splitCodons = (rna) => {
  const arr = [];
  for (let i = 0; i < rna.length; i += 3) arr.push(rna.slice(i, i + 3));
  return arr;
};
const codonTable = {
  'AUG': 'Met', 'UUU': 'Phe', 'UUC': 'Phe', 'UUA': 'Leu', 'UUG': 'Leu',
  'CUU': 'Leu', 'CUC': 'Leu', 'CUA': 'Leu', 'CUG': 'Leu', 'AUU': 'Ile', 'AUC': 'Ile', 'AUA': 'Ile', 'GUU': 'Val', 'GUC': 'Val', 'GUA': 'Val', 'GUG': 'Val',
  'UCU': 'Ser', 'UCC': 'Ser', 'UCA': 'Ser', 'UCG': 'Ser', 'AGU': 'Ser', 'AGC': 'Ser', 'CCU': 'Pro', 'CCC': 'Pro', 'CCA': 'Pro', 'CCG': 'Pro',
  'ACU': 'Thr', 'ACC': 'Thr', 'ACA': 'Thr', 'ACG': 'Thr', 'GCU': 'Ala', 'GCC': 'Ala', 'GCA': 'Ala', 'GCG': 'Ala', 'UAU': 'Tyr', 'UAC': 'Tyr', 'UAA': 'STOP', 'UAG': 'STOP', 'UGA': 'STOP',
  'CAU': 'His', 'CAC': 'His', 'CAA': 'Gln', 'CAG': 'Gln', 'AAU': 'Asn', 'AAC': 'Asn', 'AAA': 'Lys', 'AAG': 'Lys', 'GAU': 'Asp', 'GAC': 'Asp', 'GAA': 'Glu', 'GAG': 'Glu',
  'UGU': 'Cys', 'UGC': 'Cys', 'UGG': 'Trp', 'CGU': 'Arg', 'CGC': 'Arg', 'CGA': 'Arg', 'CGG': 'Arg', 'AGA': 'Arg', 'AGG': 'Arg', 'GGU': 'Gly', 'GGC': 'Gly', 'GGA': 'Gly', 'GGG': 'Gly'
};
const aaFromCodons = (codons) => codons.map(c => codonTable[c] || '');

const RNASequence = ({ refSeq = '', querySeq = '' }) => {
  const maxLen = 60;
  const refRna = dnaToRna(refSeq.slice(0, maxLen));
  const queryRna = dnaToRna(querySeq.slice(0, maxLen));

  const refCodons = useMemo(() => splitCodons(refRna), [refRna]);
  const queryCodons = useMemo(() => splitCodons(queryRna), [queryRna]);
  const refAmino = useMemo(() => aaFromCodons(refCodons), [refCodons]);
  const queryAmino = useMemo(() => aaFromCodons(queryCodons), [queryCodons]);

  return (
    <div className="rna-sequence">
      <h3>Transcrição para RNA</h3>
      <div className="sequence-group">
        <p>Referência</p>
        <div className="sequence">
          {refRna.split('').map((n, i) => <span key={`r-${i}`} className={`circle ${n === 'U' ? 'yellow' : 'green'}`}>{n}</span>)}
        </div>
        <div className="labels">
          {refAmino.slice(0, 8).map((aa, i) => <span key={`raa-${i}`} className="label">{aa}</span>)}
        </div>
      </div>
      <div className="sequence-group">
        <p>Amostra</p>
        <div className="sequence">
          {queryRna.split('').map((n, i) => <span key={`q-${i}`} className={`circle ${n === 'U' ? 'yellow' : 'green'}`}>{n}</span>)}
        </div>
        <div className="labels">
          {queryAmino.slice(0, 8).map((aa, i) => <span key={`qaa-${i}`} className="label">{aa}</span>)}
        </div>
      </div>
    </div>
  );
};

export default RNASequence;
