import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../api"; // Certifique-se de que o caminho está correto
import "./style.css";

const NOT_REGISTERED_VALUE = "Não";

const Cadastro = () => {
    const { t } = useTranslation();
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
        clienteCadastrado: NOT_REGISTERED_VALUE,
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

    // Redireciona para a tela de carregamento e só finaliza quando a análise terminar
    navigate("/loading", { state: { done: false } });

    // Aguarda o redirecionamento completar antes de continuar com o processamento
    setTimeout(async () => {
        try {
            // Envia os dados principais para sua API
            const response = await api.post("/relatorios/novo-relatorio", relatorioData);
            console.log(response.data.message);

            const relatorioId = response?.data?.id;
            let analiseJson = null;

            // Se tiver um arquivo, envia para a outra API
            if (formData.arquivo) {
                const fileForm = new FormData();
                fileForm.append("arquivo", formData.arquivo);

                const analiseResponse = await fetch("http://localhost:5000/buscar-pkd1", {
                    method: "POST",
                    body: fileForm,
                });

                try {
                    analiseJson = await analiseResponse.json();
                } catch (parseErr) {
                    console.error("Não foi possível interpretar a resposta da análise:", parseErr);
                }

                if (!analiseResponse.ok) {
                    const message = analiseJson?.error || "Falha ao processar a análise genética";
                    throw new Error(message);
                }

                if (relatorioId && analiseJson) {
                    const melhor = analiseJson?.alinhamento_result?.melhor_alinhamento || {};
                    const ia = analiseJson?.classificacao_ia || {};

                    try {
                        await api.post(`/relatorios/relatorio/${relatorioId}/resultado-pkd1`, {
                            identidade: melhor?.identidade ?? null,
                            score: typeof melhor?.score === "number" ? melhor.score : melhor?.score ?? null,
                            classificacao: ia?.classificacao ?? null,
                            confianca: ia?.confianca ?? ia?.confianca_float ?? null,
                        });
                    } catch (persistErr) {
                        console.error("Erro ao salvar resultado PKD1:", persistErr);
                    }
                }
            }

            // Sinaliza para a página de loading que terminou
            navigate("/loading", { replace: true, state: { done: true, relatorioId, analiseJson } });
            // Pequeno delay visual e segue para relatorios (feito dentro da LoadingPage agora)
        } catch (err) {
            console.error("Erro ao cadastrar o relatório:", err);
            navigate("/loading", { replace: true, state: { done: true, error: err?.message || "Erro ao processar análise" } });
        }
    }, 100); // Pequeno delay para garantir que o navigate seja processado
};


    return (
        <div className="cadastro-container">
            <div className="progress-bar">
                {t("analysisSteps.steps", { returnObjects: true }).map((step, index) => (
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
                        <h2>{t("analysisSteps.sections.basicInfo")}</h2>
                        <div className="form-row">
                            <label>
                                {t("analysisSteps.fields.catName")}:
                                <input
                                    type="text"
                                    name="nomeGato"
                                    value={formData.nomeGato}
                                    onChange={handleChange}
                                />
                            </label>
                            <label>
                                {t("analysisSteps.fields.breed")}:
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
                                {t("analysisSteps.fields.age")}:
                                <input
                                    type="number"
                                    name="idadeGato"
                                    value={formData.idadeGato}
                                    onChange={handleChange}
                                />
                            </label>
                            <label>
                                {t("analysisSteps.fields.sex")}:
                                <select
                                    name="sexoGato"
                                    value={formData.sexoGato}
                                    onChange={handleChange}
                                >
                                    <option value="">{t("analysisSteps.placeholders.select")}</option>
                                    <option value="Macho">{t("analysisSteps.options.male")}</option>
                                    <option value="Fêmea">{t("analysisSteps.options.female")}</option>
                                </select>
                            </label>
                        </div>
                        <button
                            type="button"
                            className="nav-button back-home"
                            onClick={() => navigate("/")}
                        >
                            {t("analysisSteps.buttons.backHome")}
                        </button>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="form-step">
                        <h2>{t("analysisSteps.sections.clinicInfo")}</h2>
                        <div className="form-row">
                            <label>
                                {t("analysisSteps.fields.company")}:
                                <input
                                    type="text"
                                    name="nomeClinica"
                                    value={formData.nomeClinica}
                                    onChange={handleChange}
                                    disabled={formData.clienteCadastrado !== NOT_REGISTERED_VALUE}
                                />
                            </label>
                            <label>
                                {t("analysisSteps.fields.phone")}:
                                <input
                                    type="tel"
                                    name="telefoneClinica"
                                    value={formData.telefoneClinica}
                                    onChange={handleChange}
                                    disabled={formData.clienteCadastrado !== NOT_REGISTERED_VALUE}
                                />
                            </label>
                        </div>
                        <div className="form-row">
                            <label>
                                {t("analysisSteps.fields.email")}:
                                <input
                                    type="email"
                                    name="emailClinica"
                                    value={formData.emailClinica}
                                    onChange={handleChange}
                                    disabled={formData.clienteCadastrado !== NOT_REGISTERED_VALUE}
                                />
                            </label>
                            <label>
                                {t("analysisSteps.fields.address")}:
                                <input
                                    type="text"
                                    name="enderecoClinica"
                                    value={formData.enderecoClinica}
                                    onChange={handleChange}
                                    disabled={formData.clienteCadastrado !== NOT_REGISTERED_VALUE}
                                />
                            </label>
                        </div>
                        <label>
                            {t("analysisSteps.fields.isRegistered")}?
                            <select
                                name="clienteCadastrado"
                                value={formData.clienteCadastrado}
                                onChange={handleChange}
                            >
                                <option value={NOT_REGISTERED_VALUE}>{t("analysisSteps.options.notRegistered")}</option>
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
                        <h2>{t("analysisSteps.sections.analysisInfo")}</h2>
                        <label>
                            {t("analysisSteps.fields.geneticMaterial")}:
                            <input
                                type="text"
                                name="materialGenetico"
                                value={formData.materialGenetico}
                                onChange={handleChange}
                            />
                        </label>
                        <label>
                            {t("analysisSteps.fields.sequencing")}:
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
                                {formData.arquivo ? formData.arquivo.name : t("analysisSteps.placeholders.file")}
                            </span>
                        </label>
                    </div>
                )}

                <div className="nav-buttons">
                    {currentStep > 1 && (
                        <button type="button" onClick={prevStep} className="nav-button">
                            {t("analysisSteps.buttons.previous")}
                        </button>
                    )}
                    {currentStep < 3 ? (
                        <button type="button" onClick={nextStep} className="nav-button next">
                            {t("analysisSteps.buttons.next")}
                        </button>
                    ) : (
                        <button type="submit" onClick={handleSubmit} className="nav-button finalizar">
                            {t("analysisSteps.buttons.finish")}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default Cadastro;
