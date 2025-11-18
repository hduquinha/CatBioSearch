import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import api from '../../api';
import Sidebar from "../../Components/Sidebar";
import './home.css';
import figure from '../../Components/assets/figure-home.svg';
import software from '../../Components/assets/software-uso.svg';
import relatorios from '../../Components/assets/relatorios.svg';
import { RiPencilLine } from "react-icons/ri";
import { LuHistory } from "react-icons/lu";
import ReportsChart from "./Componentes_Home/grafic.jsx";

function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [ultimosRelatorios, setUltimosRelatorios] = useState([]);
  const [totalRelatorios, setTotalRelatorios] = useState(null); // Alterado para null
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await api.get('/home/menu');
      console.log("Dados recebidos do backend:", response.data); // Inspecione os dados recebidos
      setUltimosRelatorios(response.data.relatorios || []);
      setTotalRelatorios(response.data.totalRelatorios ?? null); // Se não for fornecido, permanece null
      setLoading(false);
      console.log(`${totalRelatorios}`)
    } catch (error) {
      // Se não autenticado, redireciona para tela de login
      if (error.response && error.response.status === 401) {
        console.warn('Usuário não autenticado — redirecionando para login.');
        setLoading(false);
        navigate('/login');
        return;
      }
      console.error('Erro ao buscar dados:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="dashboard"> 
      <Sidebar /> 

      <div className="header">
        <div className="header-card">
          <div className="content-text">
            <h2 style={{ color: "#FFC100", fontWeight: "700", fontSize: 40 }}>{t('home.newsTitle')}</h2>
            <p style={{ color: "#FFFFFF", fontSize: 16 }}>{t('home.newsSubtitle')}</p>
            <a
              href="#"
              style={{ color: "#FFFFFF", fontWeight: 800, marginTop: "20px", display: "inline-block" }}
            >
              {t('buttons.seeMore')}
            </a>
          </div>
          <div className="img-card">
            <img src={figure} alt="" />
          </div>
        </div>

        <div className="header-metrics">
          <div className="metric-card-growth">
            <p>{t('home.softwareUse')}</p>
            <div className="img-crescimento">
              <img src={software} alt="" />
            </div>
          </div>
          <div className="metric-card-report">
  
            <div className="img-report">
              <img src={relatorios} alt="" />
            </div>
          </div>
        </div>
      </div>

      <div className="actions">
        <button
          className="iniciar-btn"
          onClick={() => navigate("/passosAnalise/step1")}
        >
          {t('buttons.startAnalysis')}
        </button>
        <button
          className="home-btn"
          onClick={() => navigate("/relatorio")}
        >
          <LuHistory style={{ marginRight: 5 }} />
          {t('buttons.analysisHistory')}
        </button>
        <button
          className="home-btn"
          onClick={() => navigate("/criarcliente")}
        >
          <RiPencilLine style={{ marginRight: 5 }} />
          {t('buttons.registerClient')}
        </button>
      </div>

      <div className="charts">
        <div className="chart">
          <ReportsChart />
        </div>

        <div className="recent-analyses">
  <h3 className="recent-analyses-title">{t('home.recentReports')}</h3>
  {loading ? (
    <p className="recent-analyses-loading">{t('common.loading')}</p>
  ) : (
    <ul className="recent-analyses-list">
      {ultimosRelatorios.length > 0 ? (
        ultimosRelatorios.map((relatorio) => (
          <li key={relatorio.id} className="recent-analyses-item">
            <div className="recent-analyses-icon">
              📄 {/* Você pode substituir por um ícone real, ex.: via biblioteca Font Awesome */}
            </div>
            <a className='aa' href='/'>
              <div className="recent-analyses-content">
              <p><strong>{t('home.clinic')}:</strong> {relatorio.Cliente}</p>
              <p><strong>{t('home.catName')}:</strong> {relatorio.Nome}</p>
              <p><strong>{t('home.reportId')}:</strong> {relatorio.id}</p>
            </div>
            </a>
          </li>
        ))
      ) : (
        <p className="recent-analyses-empty">{t('home.noReports')}</p>
      )}
    </ul>
  )}
</div>



      </div>
    </div>
  );
}

export default HomePage;
