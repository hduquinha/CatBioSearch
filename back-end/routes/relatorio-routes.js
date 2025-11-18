const express = require("express");
const router = express.Router();
const initRelatorioModel = require('../models/Relatorio');
const initRelatorioInsightModel = require('../models/RelatorioInsight');
const { fetchLatestAnalysisSnapshot } = require('../services/analysisSnapshot');
const { generateStructuredInsights } = require('../services/llmService');

let Relatorio;
let RelatorioInsight;

const initializeRelatorioModel = async () => {
    Relatorio = await initRelatorioModel();
};

const initializeRelatorioInsightModel = async () => {
    RelatorioInsight = await initRelatorioInsightModel();
};

const ensureModels = async () => {
    if (!Relatorio) {
        await initializeRelatorioModel();
    }
    if (!RelatorioInsight) {
        await initializeRelatorioInsightModel();
    }
};

const autenticacao = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        return res.status(401).json({ message: "Você precisa estar logado." });
    }
};

const normalizeInteger = (value) => {
    if (value === undefined || value === null) {
        return null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.trunc(value);
    }
    const asString = String(value).trim();
    if (asString === '') {
        return null;
    }
    const parsed = Number.parseInt(asString, 10);
    return Number.isNaN(parsed) ? null : parsed;
};

// Rota para criar novo relatório
router.post('/novo-relatorio', autenticacao, async (req, res) => {
    const { Nome, Sexo, Cliente, Idade, Raca, Material, Metodo } = req.body;

    try {
        const created = await Relatorio.create({
            Nome,
            Sexo,
            Cliente,
            Idade: normalizeInteger(Idade),
            Raca,
            Material,
            Metodo,
            UserId: req.session.user.id // Supondo que o ID do usuário esteja armazenado na sessão
        });
        res.json({ message: 'Relatório criado com sucesso', id: created.id });
    } catch (err) {
        console.error(`Ocorreu um erro: ${err}`);
        res.status(500).send('Ocorreu um erro ao criar o relatório.');
    }
});

// Rota para a outra "tela" de relatório
router.get('/user-dashboard/relatorio', async (req, res) => {
    try {
        const totalRelatorios = await Relatorio.count(); // Conta todos os registros na tabela 'Relatorio'
        res.json({
            message: 'Total de relatórios',
            total: totalRelatorios,
        });
    } catch (err) {
        console.error(`Ocorreu um erro ao contar os relatórios: ${err}`);
        res.status(500).send('Erro ao contar relatórios');
    }
});

router.get('/relatorios', async (req, res) => {
    try {
        // Buscar todos os relatórios na tabela 'Relatorio'
        const relatorios = await Relatorio.findAll();

        // Verificar se há relatórios
        if (relatorios.length === 0) {
            return res.status(404).json({ message: 'Nenhum relatório encontrado' });
        }

        // Retornar os relatórios como JSON
        res.json({
            message: 'Relatórios encontrados',
            relatorios: relatorios,
        });
    } catch (err) {
        console.error(`Ocorreu um erro ao buscar os relatórios: ${err}`);
        res.status(500).send('Erro ao buscar relatórios');
    }
});

// Rota para buscar relatório por ID
router.get('/relatorio/:id', autenticacao, async (req, res) => {
    const { id } = req.params;

    try {
        const relatorio = await Relatorio.findByPk(id, {
            attributes: ['id', 'Nome', 'Sexo', 'Cliente', 'Idade', 'Raca', 'Material', 'Metodo', 'Identidade', 'Score', 'Classificacao', 'Confianca']
        });

        if (!relatorio) {
            return res.status(404).json({ message: "Relatório não encontrado." });
        }

        res.json(relatorio);
    } catch (err) {
        console.error(`Erro ao buscar relatório: ${err}`);
        res.status(500).send('Ocorreu um erro ao buscar o relatório.');
    }
});

// Rota para atualizar um relatório
router.put('/relatorio/:id', autenticacao, async (req, res) => {
    const { id } = req.params;
    const { Nome, Sexo, Cliente, Idade } = req.body;

    try {
        const relatorio = await Relatorio.findByPk(id);

        if (!relatorio) {
            return res.status(404).json({ message: "Relatório não encontrado." });
        }

        await relatorio.update({
            Nome,
            Sexo,
            Cliente,
            Idade: normalizeInteger(Idade)
    
        });

        res.json({ message: "Relatório atualizado com sucesso.", relatorio });
    } catch (err) {
        console.error(`Erro ao atualizar relatório: ${err}`);
        res.status(500).send('Ocorreu um erro ao atualizar o relatório.');
    }
});

// Rota para excluir um relatório
router.delete('/relatorio/:id', autenticacao, async (req, res) => {
    const { id } = req.params;

    try {
        const relatorio = await Relatorio.findByPk(id);

        if (!relatorio) {
            return res.status(404).json({ message: "Relatório não encontrado." });
        }

        await relatorio.destroy();

        res.json({ message: "Relatório excluído com sucesso." });
    } catch (err) {
        console.error(`Erro ao excluir relatório: ${err}`);
        res.status(500).send('Ocorreu um erro ao excluir o relatório.');
    }
});

router.get('/ultimo', autenticacao, async (req, res) => {
    try {
        const relatorio = await Relatorio.findOne({
            order: [['id', 'DESC']], // Ordena pelo ID em ordem decrescente
            attributes: ['id', 'Nome', 'Sexo', 'Cliente', 'Idade', 'Raca', 'Material', 'Metodo', 'Identidade', 'Score', 'Classificacao', 'Confianca']
        });

        if (!relatorio) {
            return res.status(404).json({ message: "Nenhum relatório encontrado." });
        }

        res.json(relatorio);
    } catch (err) {
        console.error(`Erro ao buscar o último relatório: ${err}`);
        res.status(500).send('Ocorreu um erro ao buscar o último relatório.');
    }
});


router.get('/relatorio/analise/:id', autenticacao, async (req, res) => {
    const { id } = req.params;

    try {
        const relatorio = await Relatorio.findByPk(id, {
            attributes: ['id', 'Nome', 'Sexo', 'Cliente', 'Idade', 'Raca', 'Material', 'Metodo', 'Identidade', 'Score', 'Classificacao', 'Confianca']
        });

        if (!relatorio) {
            return res.status(404).json({ message: "Relatório não encontrado." });
        }

        res.json(relatorio);
    } catch (err) {
        console.error(`Erro ao buscar relatório: ${err}`);
        res.status(500).send('Ocorreu um erro ao buscar o relatório.');
    }
});

router.get('/meus-relatorios', autenticacao, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const relatorios = await Relatorio.findAll({
            where: { UserId: userId }
        });

        if (relatorios.length === 0) {
            return res.status(404).json({ message: 'Nenhum relatório encontrado para este usuário.' });
        }

        res.json({
            message: 'Relatórios do usuário encontrados',
            relatorios: relatorios,
        });
    } catch (err) {
        console.error(`Erro ao buscar relatórios do usuário: ${err}`);
        res.status(500).send('Erro ao buscar relatórios do usuário');
    }
});

// Nova rota: receber resultados da análise e persistir no relatório
router.post('/relatorio/:id/resultado-pkd1', autenticacao, async (req, res) => {
    const { id } = req.params;
    const { identidade, score, classificacao, confianca } = req.body;

    try {
        const relatorio = await Relatorio.findByPk(id);
        if (!relatorio) {
            return res.status(404).json({ message: 'Relatório não encontrado.' });
        }

        await relatorio.update({
            Identidade: identidade ?? null,
            Score: typeof score === 'number' ? score : (parseFloat(score) || null),
            Classificacao: classificacao ?? null,
            Confianca: typeof confianca === 'number' ? confianca : (parseFloat(confianca) || null)
        });

        return res.json({ message: 'Resultado PKD1 salvo com sucesso.', relatorio });
    } catch (err) {
        console.error(`Erro ao salvar resultado PKD1: ${err}`);
        return res.status(500).json({ message: 'Erro ao salvar resultado PKD1.' });
    }
});

const parseJsonField = (value, fallback) => {
    try {
        return value ? JSON.parse(value) : fallback;
    } catch (err) {
        return fallback;
    }
};

router.get('/relatorio/:id/insights', autenticacao, async (req, res) => {
    const { id } = req.params;

    try {
        await ensureModels();
        const relatorio = await Relatorio.findByPk(id);
        if (!relatorio) {
            return res.status(404).json({ message: 'Relatório não encontrado.' });
        }

        const registro = await RelatorioInsight.findOne({ where: { RelatorioId: id } });
        if (!registro) {
            return res.status(404).json({ message: 'Insights ainda não foram gerados para este relatório.' });
        }

        return res.json({
            relatorio_id: Number(id),
            sections: parseJsonField(registro.sections_json, []),
            insights_globais: parseJsonField(registro.insights_json, []),
            possiveis_doencas: parseJsonField(registro.possiveis_doencas, []),
            modelo: registro.modelo,
            fonte_dados: registro.fonte_dados,
            gerado_em: registro.gerado_em,
        });
    } catch (err) {
        console.error('Erro ao buscar insights do relatório:', err.message);
        return res.status(500).json({ message: 'Erro ao buscar insights.', detalhe: err.message });
    }
});

router.post('/relatorio/:id/insights', autenticacao, async (req, res) => {
    const { id } = req.params;

    try {
        await ensureModels();
        const relatorio = await Relatorio.findByPk(id);
        if (!relatorio) {
            return res.status(404).json({ message: 'Relatório não encontrado.' });
        }

        let snapshot;
        try {
            snapshot = await fetchLatestAnalysisSnapshot();
        } catch (snapshotErr) {
            const status = snapshotErr.status || 502;
            return res.status(status).json({ message: snapshotErr.message });
        }

        let payload;
        try {
            payload = await generateStructuredInsights(relatorio, snapshot);
        } catch (llmErr) {
            console.error('Erro ao gerar insights LLM:', llmErr);
            const status = llmErr.status || 500;
            return res.status(status).json({ message: 'Falha ao gerar insights com o LLM.', detalhe: llmErr.message });
        }

        const registro = await RelatorioInsight.upsert({
            RelatorioId: id,
            sections_json: JSON.stringify(payload.sections || []),
            insights_json: JSON.stringify(payload.insights_globais || []),
            possiveis_doencas: JSON.stringify(payload.possiveis_doencas || []),
            modelo: payload.modelo,
            fonte_dados: payload.fonte_dados,
            gerado_em: new Date(),
        });

        const meta = Array.isArray(registro) ? registro[0] : registro;

        return res.json({
            relatorio_id: Number(id),
            sections: payload.sections || [],
            insights_globais: payload.insights_globais || [],
            possiveis_doencas: payload.possiveis_doencas || [],
            modelo: payload.modelo,
            fonte_dados: payload.fonte_dados,
            gerado_em: meta?.gerado_em || new Date(),
            persisted: true,
        });
    } catch (err) {
        console.error('Erro inesperado ao gerar insights:', err);
        return res.status(500).json({ message: 'Erro inesperado ao gerar insights.', detalhe: err.message });
    }
});



// Inicializa os modelos ao carregar o roteador
initializeRelatorioModel();
initializeRelatorioInsightModel();

module.exports = router;
