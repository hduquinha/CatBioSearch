import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api"; // Certifique-se de que o caminho está correto
import "./style.css";

const Cadastro = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        nomeGato: "",
        racaGato: "",
        idadeGato: "",
        sexoGato: "",
        nomeClinica: "",
        telefoneClinica: "",
        emailClinica: "",
        enderecoClinica: "",
        clienteCadastrado: "Não",
        materialGenetico: "",
        sequenciamento: "",
        arquivo: null,
    });

    const [veterinarios, setVeterinarios] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchVeterinarios = async () => {
            try {
                const response = await api.get("/vet/veterinarios");
                setVeterinarios(response.data.veterinarios || []);
            } catch (err) {
                console.error("Erro ao buscar veterinários:", err);
            }
        };

        fetchVeterinarios();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === "checkbox" ? checked : value,
        });
    };

    const handleFileChange = (e) => {
        setFormData({
            ...formData,
            arquivo: e.target.files[0],
        });
    };

    const nextStep = () => {
        if (currentStep < 3) setCurrentStep(currentStep + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const handleSubmit = async (e) => {
    e.preventDefault();

    const relatorioData = {
        Nome: formData.nomeGato,
        Sexo: formData.sexoGato,
        Cliente: formData.clienteCadastrado,
        Idade: formData.idadeGato,
        Raca: formData.racaGato,
        Material: formData.materialGenetico,
        Metodo: formData.sequenciamento,
    };

    // Redireciona imediatamente para a tela de carregamento
    navigate("/loading");

    // Aguarda o redirecionamento completar antes de continuar com o processamento
    setTimeout(async () => {
        try {
            // Envia os dados principais para sua API
            const response = await api.post("/relatorios/novo-relatorio", relatorioData);
            console.log(response.data.message);

            // Se tiver um arquivo, envia para a outra API
            if (formData.arquivo) {
                const fileForm = new FormData();
                fileForm.append("arquivo", formData.arquivo);

                await fetch("http://localhost:5000/buscar-pkd1", {
                    method: "POST",
                    body: fileForm,
                });
            }

            // Aqui você pode opcionalmente atualizar algo no backend ou estado global

        } catch (err) {
            console.error("Erro ao cadastrar o relatório:", err);
            // Você pode salvar o erro em um contexto ou exibir na tela de loading se quiser
        }
    }, 100); // Pequeno delay para garantir que o navigate seja processado
};


    return (
        <div className="cadastro-container">
            <div className="progress-bar">
                {["Passo 1", "Passo 2", "Passo 3"].map((step, index) => (
                    <div
                        key={index}
                        className={`progress-step ${
                            currentStep === index + 1
                                ? "active"
                                : currentStep > index + 1
                                ? "completed"
                                : ""
                        }`}
                    >
                        {step}
                    </div>
                ))}
            </div>

            <form className="form-container" onSubmit={(e) => e.preventDefault()}>
                {currentStep === 1 && (
                    <div className="form-step">
                        <h2>Informações Básicas do Gato</h2>
                        <div className="form-row">
                            <label>
                                Nome:
                                <input
                                    type="text"
                                    name="nomeGato"
                                    value={formData.nomeGato}
                                    onChange={handleChange}
                                />
                            </label>
                            <label>
                                Raça:
                                <input
                                    type="text"
                                    name="racaGato"
                                    value={formData.racaGato}
                                    onChange={handleChange}
                                />
                            </label>
                        </div>
                        <div className="form-row">
                            <label>
                                Idade:
                                <input
                                    type="number"
                                    name="idadeGato"
                                    value={formData.idadeGato}
                                    onChange={handleChange}
                                />
                            </label>
                            <label>
                                Sexo:
                                <select
                                    name="sexoGato"
                                    value={formData.sexoGato}
                                    onChange={handleChange}
                                >
                                    <option value="">Selecione</option>
                                    <option value="Macho">Macho</option>
                                    <option value="Fêmea">Fêmea</option>
                                </select>
                            </label>
                        </div>
                        <button
                            type="button"
                            className="nav-button back-home"
                            onClick={() => navigate("/")}
                        >
                            Voltar
                        </button>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="form-step">
                        <h2>Informações da Clínica Veterinária</h2>
                        <div className="form-row">
                            <label>
                                Nome da Empresa:
                                <input
                                    type="text"
                                    name="nomeClinica"
                                    value={formData.nomeClinica}
                                    onChange={handleChange}
                                    disabled={formData.clienteCadastrado !== "Não"}
                                />
                            </label>
                            <label>
                                Telefone:
                                <input
                                    type="tel"
                                    name="telefoneClinica"
                                    value={formData.telefoneClinica}
                                    onChange={handleChange}
                                    disabled={formData.clienteCadastrado !== "Não"}
                                />
                            </label>
                        </div>
                        <div className="form-row">
                            <label>
                                Email:
                                <input
                                    type="email"
                                    name="emailClinica"
                                    value={formData.emailClinica}
                                    onChange={handleChange}
                                    disabled={formData.clienteCadastrado !== "Não"}
                                />
                            </label>
                            <label>
                                Endereço:
                                <input
                                    type="text"
                                    name="enderecoClinica"
                                    value={formData.enderecoClinica}
                                    onChange={handleChange}
                                    disabled={formData.clienteCadastrado !== "Não"}
                                />
                            </label>
                        </div>
                        <label>
                            Já é cadastrado?
                            <select
                                name="clienteCadastrado"
                                value={formData.clienteCadastrado}
                                onChange={handleChange}
                            >
                                <option value="Não">Não</option>
                                {veterinarios.map((vet) => (
                                    <option key={vet.id} value={vet.Nome}>
                                        {vet.Nome}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="form-step">
                        <h2>Sobre a Análise</h2>
                        <label>
                            Material Genético:
                            <input
                                type="text"
                                name="materialGenetico"
                                value={formData.materialGenetico}
                                onChange={handleChange}
                            />
                        </label>
                        <label>
                            Sequenciamento:
                            <input
                                type="text"
                                name="sequenciamento"
                                value={formData.sequenciamento}
                                onChange={handleChange}
                            />
                        </label>
                        <label className="file-upload">
                            <input
                                type="file"
                                onChange={handleFileChange}
                            />
                            <span>
                                {formData.arquivo ? formData.arquivo.name : "Escolha um arquivo"}
                            </span>
                        </label>
                    </div>
                )}

                <div className="nav-buttons">
                    {currentStep > 1 && (
                        <button type="button" onClick={prevStep} className="nav-button">
                            Anterior
                        </button>
                    )}
                    {currentStep < 3 ? (
                        <button type="button" onClick={nextStep} className="nav-button next">
                            Próximo
                        </button>
                    ) : (
                        <button type="submit" onClick={handleSubmit} className="nav-button finalizar">
                            Finalizar
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default Cadastro;
