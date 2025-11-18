import React, { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import { useInView } from "react-intersection-observer";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { useTranslation } from "react-i18next";
import api from "../../../api";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const MONTH_FALLBACK = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const MONTH_KEYS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

const buildLastMonths = () => {
  const now = new Date();
  const indexes = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    indexes.push(d.getMonth());
  }
  return indexes;
};

const ReportsChart = () => {
  const { t } = useTranslation();
  const { ref, inView } = useInView({ triggerOnce: true });
  const [animate, setAnimate] = useState(false);
  const [monthIndexes, setMonthIndexes] = useState(buildLastMonths());
  const [counts, setCounts] = useState(new Array(12).fill(0));

  if (inView && !animate) {
    setAnimate(true); // Ativa a animação apenas ao entrar na tela
  }
  const translateMonth = (index) => {
    const key = MONTH_KEYS[index] || null;
    if (key) {
      const translated = t(`charts.reportsByMonth.months.${key}`);
      if (translated && translated !== `charts.reportsByMonth.months.${key}`) {
        return translated;
      }
    }
    return MONTH_FALLBACK[index] || MONTH_FALLBACK[0];
  };

  useEffect(() => {
    const fetchMonthly = async () => {
      try {
        const res = await api.get("/home/menu");
        const monthly = res.data.monthlyCounts || [];

        if (!Array.isArray(monthly) || monthly.length === 0) {
          setMonthIndexes(buildLastMonths());
          setCounts(new Array(12).fill(0));
          return;
        }

        const safeIndexes = [];
        const safeCounts = [];
        monthly.forEach((item) => {
          if (!item || !item.month) return;
          const parts = String(item.month).split("-");
          if (parts.length !== 2) return;
          const monthNum = Number(parts[1]);
          if (Number.isNaN(monthNum)) return;
          safeIndexes.push(Math.max(0, Math.min(11, monthNum - 1)));
          safeCounts.push(Number(item.count) || 0);
        });

        if (safeIndexes.length === 0) {
          setMonthIndexes(buildLastMonths());
          setCounts(new Array(12).fill(0));
        } else {
          setMonthIndexes(safeIndexes);
          setCounts(safeCounts);
        }
      } catch (err) {
        console.error("Erro ao buscar dados do gráfico:", err);
        setMonthIndexes([0, 1, 2, 3, 4]);
        setCounts([0, 0, 0, 0, 0]);
      }
    };

    fetchMonthly();
  }, []);

  const labels = useMemo(() => monthIndexes.map((idx) => translateMonth(idx)), [monthIndexes, t]);
  const datasetValues = animate && counts.length ? counts : counts.map(() => 0);

  const data = {
    labels: labels.length ? labels : [t("common.loading")],
    datasets: [
      {
        label: t("charts.reportsByMonth.dataset"),
        data: datasetValues,
        backgroundColor: "rgba(255, 193, 7, 0.8)",
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
      <h3 style={{ textAlign: "center", marginBottom: "20px", color: "#6F6F6F"}}>{t("charts.reportsByMonth.title")}</h3>
      <Bar data={data} options={options} />
    </div>
  );
};

export default ReportsChart;
