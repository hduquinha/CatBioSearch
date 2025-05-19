import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from '../../Components/Sidebar';
import axios from "../../api";

const AlterarRelatorio = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    Nome: "",
    Raca: "",
    Cliente: "",
    Idade: "",
    Acoes: "",

  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (id) {
        try {
          const response = await axios.get(`/relatorios/relatorio/${id}`);
          setFormData(response.data);
        } catch (error) {
          console.error("Erro ao carregar usuário:", error);
          alert("Erro ao carregar usuário.");
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

  const handleSubmit = async () => {
    try {
      const response = id
        ? await axios.put(`/relatorios/relatorio/${id}`, formData)
        : await axios.post("/users/admin-cadastro", formData);
      alert(response.data.message);
      navigate("/acesso");
    } catch (error) {
      console.error("Erro ao salvar usuário:", error);
      alert("Ocorreu um erro ao salvar o usuário.");
    }
  };

  // Mesmo estilo do AlterarUsuario
  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    minHeight: "100vh",
    padding: "1rem",
  };

  const formStyle = {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: "1rem",
    width: "100%",
    maxWidth: "600px",
  };

  const columnStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    flex: "1",
    minWidth: "250px",
  };

  const buttonContainerStyle = {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: "600px",
    marginTop: "1rem",
  };

  const buttonStyle = {
    padding: "0.75rem 1.5rem",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  };

  const backButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#ff7675",
    color: "white",
  };

  const nextButtonStyle = {
    ...buttonStyle,
    backgroundColor: "green",
    color: "white",
  };

  const labelStyle = {
    fontWeight: "600",
    fontSize: "14px",
    color: "#333",
  };

  const inputStyle = {
    width: "100%",
    padding: "0.5rem",
    borderRadius: "5px",
    border: "1px solid #ccc",
  };

  if (isLoading) {
    return <p style={{ textAlign: "center" }}>Carregando...</p>;
  }

  return (
    <div style={containerStyle}>
      <Sidebar />
      <h2>{id ? "Alterar Informações do cadastro" : "Cadastrar Novo Usuário"}</h2>
      <form style={formStyle}>
        <div style={columnStyle}>
          <label style={labelStyle}>Nome</label>
          <input
            style={inputStyle}
            type="text"
            name="Nome"
            placeholder="Digite o nome completo"
            value={formData.Nome}
            onChange={handleInputChange}
          />

                 <label style={labelStyle}>Raça</label>
          <input
            style={inputStyle}
            type="text"
            name="Nome"
            placeholder="Digite o nome completo"
            value={formData.Raca}
            onChange={handleInputChange}
          />
                    <label style={labelStyle}>Cliente</label>
          <input
            style={inputStyle}
            type="text"
            name="Nome"
            placeholder="Digite o nome completo"
            value={formData.Cliente}
            onChange={handleInputChange}
          />
                    <label style={labelStyle}>Idade</label>
          <input
            style={inputStyle}
            type="text"
            name="Nome"
            placeholder="Digite o nome completo"
            value={formData.Idade}
            onChange={handleInputChange}
          />

        
        </div>
      </form>
      <div style={buttonContainerStyle}>
        <button style={backButtonStyle} onClick={() => navigate("/acesso")}>
          Voltar
        </button>
        <button style={nextButtonStyle} onClick={handleSubmit}>
          {id ? "Salvar Alterações" : "Finalizar Cadastro →"}
        </button>
      </div>
    </div>
  );
};

export default AlterarRelatorio;
