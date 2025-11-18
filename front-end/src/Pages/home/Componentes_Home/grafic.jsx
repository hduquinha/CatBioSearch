import React, { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import { useInView } from "react-intersection-observer";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import api from '../../../api';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const monthNames = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

const ReportsChart = () => {
  const { ref, inView } = useInView({ triggerOnce: true });
  const [animate, setAnimate] = useState(false);
  // Gera rótulos dos últimos 12 meses no formato NomeMes/AA (ex: Nov/25)
  const getInitialMonthLabels = () => {
    const now = new Date();
    const arr = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      // Apenas o nome do mês (sem o ano)
      arr.push(`${monthNames[d.getMonth()]}`);
    }
    return arr;
  };

  const [labels, setLabels] = useState(getInitialMonthLabels());
  const [counts, setCounts] = useState(new Array(12).fill(0));

  if (inView && !animate) {
    setAnimate(true); // Ativa a animação apenas ao entrar na tela
  }

  useEffect(() => {
    const fetchMonthly = async () => {
      try {
        const res = await api.get('/home/menu');
        const monthly = res.data.monthlyCounts || [];

        // Se o backend não retornar dados (array vazio), mantemos os rótulos iniciais e zeros
        if (!Array.isArray(monthly) || monthly.length === 0) {
          setLabels(getInitialMonthLabels());
          setCounts(new Array(12).fill(0));
          return;
        }

        // monthly vem no formato [{ month: 'YYYY-MM', count: N }, ...]
        const safeLabels = [];
        const safeCounts = [];
        monthly.forEach(item => {
          if (!item || !item.month) return;
          const parts = String(item.month).split('-');
          if (parts.length !== 2) return;
          const year = Number(parts[0]);
          const monthNum = Number(parts[1]);
          const monthName = monthNames[monthNum - 1] || `M${monthNum}`;
          // Apenas o nome do mês, sem o ano
          safeLabels.push(`${monthName}`);
          safeCounts.push(Number(item.count) || 0);
        });

        // Se por algum motivo não gerou labels, manter os iniciais
        if (safeLabels.length === 0) {
          setLabels(getInitialMonthLabels());
          setCounts(new Array(12).fill(0));
        } else {
          setLabels(safeLabels);
          setCounts(safeCounts);
        }
      } catch (err) {
        console.error('Erro ao buscar dados do gráfico:', err);
        // Em caso de erro, manter um fallback
        const fallbackLabels = ['Jan','Fev','Mar','Abr','Mai'];
        setLabels(fallbackLabels);
        setCounts([0,0,0,0,0]);
      }
    };

    fetchMonthly();
  }, []);

  const data = {
    labels: labels.length ? labels : ['Carregando...'],
    datasets: [
      {
        label: 'Relatórios gerados por mês',
        data: animate && counts.length ? counts : counts.map(() => 0),
        backgroundColor: 'rgba(255, 193, 7, 0.8)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        max: 15,
        ticks: {
          stepSize: 5,
        },
        grid: { color: '#e0e0e0' },
      },
    },
    animation: { duration: 1200, easing: 'easeOutQuart' },
  };

  return (
    <div
      ref={ref}
      style={{ width: '100%', maxWidth: '70rem', margin: '0 auto', padding: '20px', backgroundColor: '#f4f4f4', borderRadius: '12px' }}
    >
      <h3 style={{ textAlign: 'center', marginBottom: '20px', color: '#6F6F6F' }}>Relatórios gerados por mês</h3>
      <Bar data={data} options={options} />
    </div>
  );
};

export default ReportsChart;
