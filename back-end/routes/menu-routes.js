const express = require("express");
const router = express.Router();
const initRelatorioModel = require('../models/Relatorio');

let Relatorio;

const initializeRelatorioModel = async () => {
    Relatorio = await initRelatorioModel();
};

// Garante que o modelo esteja pronto antes de atender a rota
const ensureRelatorioReady = async (req, res, next) => {
    try {
        if (!Relatorio) {
            await initializeRelatorioModel();
        }
        return next();
    } catch (e) {
        return next(e);
    }
};

const autenticacao = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        return res.status(401).json({ message: "Você precisa estar logado." });
    }
};

router.get("/menu", autenticacao, ensureRelatorioReady, async (req, res) => {
    console.log("Requisição recebida no endpoint /menu");
    try {
        const relatorios = await Relatorio.findAll({
            attributes: ['id', 'Cliente', 'Nome', 'createdAt'],
            order: [['id', 'DESC']],
            limit: 4,
        });
        const totalRelatorios = await Relatorio.count();

        // Calcular contagem por mês (últimos 12 meses) no backend e enviar para o front-end
        const allRelatorios = await Relatorio.findAll({
            attributes: ['id', 'createdAt'],
            order: [['createdAt', 'ASC']],
        });

        // Inicializa meses (1..12) com zero para o ano atual
        const now = new Date();
        const countsByMonth = {};
        // cria um mapa com chaves nos últimos 12 meses no formato YYYY-MM
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            countsByMonth[key] = 0;
        }

        allRelatorios.forEach(r => {
            const dt = new Date(r.createdAt);
            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
            if (countsByMonth.hasOwnProperty(key)) {
                countsByMonth[key] += 1;
            }
        });

        // Converte o mapa para array ordenada por mês (do mais antigo ao mais recente)
        const monthlyCounts = Object.keys(countsByMonth)
            .sort()
            .map(key => ({ month: key, count: countsByMonth[key] }));

        // Converter instâncias Sequelize em objetos planos para o JSON
        const relatoriosPlain = relatorios.map(r => (r.get ? r.get({ plain: true }) : r));
        console.log("Relatórios enviados:", relatoriosPlain);
        console.log("Total de relatórios:", totalRelatorios);
        console.log("Monthly counts:", monthlyCounts);

        res.json({
            message: 'Dados do menu carregados com sucesso',
            relatorios: relatoriosPlain,
            totalRelatorios,
            monthlyCounts,
        });
    } catch (err) {
        console.error("Erro ao processar /menu:", err);
        res.status(500).send('Erro ao listar relatórios');
    }
});


// Inicializa os modelos ao carregar o roteador (best-effort)
initializeRelatorioModel();

module.exports = router;
