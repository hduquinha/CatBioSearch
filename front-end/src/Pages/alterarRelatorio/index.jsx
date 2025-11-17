import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../Components/Sidebar";
import api from "../../api";
import "./alterarRelatorio.css";

const AlterarRelatorio = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    Nome: "",
    Raca: "",
    Cliente: "",
    Idade: "",
    Sexo: "",
    Material: "",
    Metodo: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      if (id) {
        try {
          const response = await api.get(`/relatorios/relatorio/${id}`);
          setFormData((prev) => ({
            ...prev,
            ...response.data,
          }));
        } catch (error) {
          console.error("Erro ao carregar usuário:", error);
          setErrorMessage("Não foi possível carregar o relatório.");
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSaving(true);
    try {
      const payload = {
        Nome: formData.Nome,
        Sexo: formData.Sexo,
        Cliente: formData.Cliente,
        Idade: formData.Idade,
        Raca: formData.Raca,
        Material: formData.Material,
        Metodo: formData.Metodo,
      };

      const response = id
        ? await api.put(`/relatorios/relatorio/${id}`, payload)
        : await api.post("/relatorios/novo-relatorio", payload);

      alert(response.data.message || "Relatório salvo com sucesso.");
      navigate("/relatorios");
    } catch (error) {
      console.error("Erro ao salvar usuário:", error);
      setErrorMessage("Não conseguimos salvar o relatório. Tente novamente.");
    }
    setSaving(false);
  };

  if (isLoading) {
    return <p className="edit-report-loading">Carregando...</p>;
  }

  return (
    <div className="edit-report-page">
      <Sidebar />
      <main className="edit-report-content">
        <header className="edit-report-header">
          <div>
            <p className="edit-report-kicker">Relatórios</p>
            <h1>{id ? "Alterar relatório" : "Novo relatório"}</h1>
            <p className="edit-report-subtitle">
              Atualize os dados clínicos do felino antes de gerar o laudo final.
            </p>
          </div>
          <button className="ghost-button" onClick={() => navigate(-1)}>
            Voltar
          </button>
        </header>

        <section className="edit-report-card">
          <div className="card-head">
            <div>
              <p className="panel-kicker">Ficha do paciente</p>
              <h2>Dados essenciais</h2>
            </div>
            <span className="chip neutral">Campos obrigatórios *</span>
          </div>

          {errorMessage && <p className="form-error">{errorMessage}</p>}

          <form onSubmit={handleSubmit} className="edit-report-form">
            <div className="edit-report-grid">
              <label className="edit-report-field">
                <span>Nome *</span>
                <input
                  type="text"
                  name="Nome"
                  value={formData.Nome}
                  onChange={handleInputChange}
                  placeholder="Ex: Luna"
                  required
                />
              </label>

              <label className="edit-report-field">
                <span>Raça *</span>
                <input
                  type="text"
                  name="Raca"
                  value={formData.Raca}
                  onChange={handleInputChange}
                  placeholder="Ex: Persa"
                  required
                />
              </label>

              <label className="edit-report-field">
                <span>Cliente *</span>
                <input
                  type="text"
                  name="Cliente"
                  value={formData.Cliente}
                  onChange={handleInputChange}
                  placeholder="Responsável pelo felino"
                  required
                />
              </label>

              <label className="edit-report-field">
                <span>Idade (anos)</span>
                <input
                  type="number"
                  name="Idade"
                  value={formData.Idade}
                  onChange={handleInputChange}
                  placeholder="Ex: 3"
                  min="0"
                />
              </label>

              <label className="edit-report-field">
                <span>Sexo</span>
                <select name="Sexo" value={formData.Sexo} onChange={handleInputChange}>
                  <option value="">Selecione</option>
                  <option value="Fêmea">Fêmea</option>
                  <option value="Macho">Macho</option>
                </select>
              </label>

              <label className="edit-report-field">
                <span>Material coletado</span>
                <input
                  type="text"
                  name="Material"
                  value={formData.Material}
                  onChange={handleInputChange}
                  placeholder="Ex: Swab bucal"
                />
              </label>

              <label className="edit-report-field">
                <span>Método</span>
                <input
                  type="text"
                  name="Metodo"
                  value={formData.Metodo}
                  onChange={handleInputChange}
                  placeholder="Ex: Sequenciamento"
                />
              </label>
            </div>

            <div className="edit-report-actions">
              <button type="button" className="ghost-button" onClick={() => navigate(-1)}>
                Cancelar
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? "Salvando..." : id ? "Salvar alterações" : "Criar relatório"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
};

export default AlterarRelatorio;
