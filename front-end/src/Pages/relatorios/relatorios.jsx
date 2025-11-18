import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./relatorios.css";
import { FaEllipsisV } from "react-icons/fa";
import Sidebar from "../../Components/Sidebar";
import axios from "../../api"; // Certifique-se que axios está configurado corretamente

const HistoricoRelatorios = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [gatos, setGatos] = useState([]); // Estado para os dados
  const [loading, setLoading] = useState(true); // Estado de carregamento
  const [error, setError] = useState(false); // Estado de erro
  const [currentPage, setCurrentPage] = useState(1); // Página atual
  const itemsPerPage = 5; // Itens por página
  const [menuOpen, setMenuOpen] = useState(null); // Estado do menu

  // Função para buscar dados da API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true); // Ativa o carregamento antes de buscar os dados
        const response = await axios.get("/relatorios/relatorios");
        console.log("Dados recebidos do backend:", response.data);
        setGatos(response.data.relatorios || []); // Atualiza o estado com os dados da API
        setError(false);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError(true);
      } finally {
        setLoading(false); // Sempre desativa o carregamento
      }
    };

    fetchData();
  }, []);

  // Função para deletar um item
  const handleDelete = async (id) => {
    if (window.confirm(t('common.confirmDelete'))) {
      try {
        await axios.delete(`/relatorios/${id}`);
        alert(t('reportsHistory.deleteSuccess'));
        setGatos((prevGatos) => prevGatos.filter((gato) => gato.id !== id));
      } catch (err) {
        console.error("Erro ao excluir registro:", err);
        alert(t('reportsHistory.deleteError'));
      } finally {
        setMenuOpen(null); // Fecha o menu após a ação
      }
    }
  };

  // Função para alterar a página
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Alterna o menu de ações
  const handleMenuToggle = (id) => {
    setMenuOpen(menuOpen === id ? null : id);
  };

  // Define os itens da página atual
  const currentItems = gatos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Renderização da página
  return (
    <div className="cats-page">
      <Sidebar />
      <header className="cats-header">
        <h1 className="cats-title">{t('reportsHistory.title')}</h1>
        <div className="cats-actions">
          <button className="export-button">{t('buttons.export')}</button>
          <button className="add-button" onClick={() => navigate("/passosAnalise/step1")}>
            + {t('buttons.add')}
          </button>
        </div>
      </header>

      <div className="table-container">
        {loading ? (
          <p>{t('common.loading')}</p>
        ) : error ? (
          <p>{t('reportsHistory.error')}</p>
        ) : gatos.length === 0 ? (
          <p className="empty-message">{t('reportsHistory.empty')}</p>
        ) : (
          <>
            <table className="cats-table">
              <thead>
                <tr>
                  <th>{t('reportsHistory.tableHeaders.id')}</th>
                  <th>{t('reportsHistory.tableHeaders.name')}</th>
                  <th>{t('reportsHistory.tableHeaders.breed')}</th>
                  <th>{t('reportsHistory.tableHeaders.client')}</th>
                  <th>{t('reportsHistory.tableHeaders.age')}</th>
                  <th>{t('reportsHistory.tableHeaders.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((gato) => (
                  <tr key={gato.id}>
                    <td>#{gato.id}</td>
                    <td>{gato.Nome}</td>
                    <td>{gato.Raca}</td>
                    <td>{gato.Cliente}</td>
                    <td>{gato.Idade}</td>
                    <td>
                      <div className="actions-menu-container">
                        <button
                          className="actions-button"
                          onClick={() => handleMenuToggle(gato.id)}
                        >
                          <FaEllipsisV />
                        </button>
                        {menuOpen === gato.id && (
                          <div className="actions-menu">
                            <button
                              className="edit"
                              onClick={() => navigate(`/alterarrelatorio/${gato.id}`)}
                            >
                              {t('buttons.edit')}
                            </button>
                             <button
                              className="visualizar"
                              onClick={() => navigate(`/relatorio/analise/${gato.id}`)}
                            >
                              {t('buttons.view')}
                            </button>
                            <button
                              className="delete"
                              onClick={() => handleDelete(gato.id)}
                            >
                              {t('buttons.delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Paginação */}
            <div className="pagination">
              {Array.from(
                { length: Math.ceil(gatos.length / itemsPerPage) },
                (_, index) => (
                  <button
                    key={index}
                    className={`pagination-button ${
                      currentPage === index + 1 ? "active" : ""
                    }`}
                    onClick={() => handlePageChange(index + 1)}
                  >
                    {index + 1}
                  </button>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HistoricoRelatorios;
