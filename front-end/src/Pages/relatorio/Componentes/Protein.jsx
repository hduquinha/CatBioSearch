// src/components/Proteins.js
import React from "react";
import "./Protein.css"; // Importa o CSS para estilização

const Proteins = ({ aminoacids = [] }) => {
  const list = aminoacids.length ? aminoacids.slice(0, 12) : ['Thr', 'Ser', 'His'];
  return (
    <div className="proteins-container">
      <h3>Proteínas</h3>
      <ul className="proteins-list">
        {list.map((aa, i) => <li key={i}>{aa}</li>)}
      </ul>
    </div>
  );
};

export default Proteins;
