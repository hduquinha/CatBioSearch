const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');

// Use env vars (com defaults compatíveis com docker-compose)
const DB_HOST = process.env.DB_HOST || 'db';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || 'root';
const DB_NAME = process.env.DB_NAME || 'catsearch';

let db = null; // Instância única do Sequelize

const MAX_RETRIES = parseInt(process.env.DB_MAX_RETRIES || '10', 10);
const RETRY_DELAY_MS = parseInt(process.env.DB_RETRY_DELAY || '2000', 10);

const wait = (ms) => new Promise(res => setTimeout(res, ms));

async function ensureDatabaseExists() {
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
        try {
            console.log(`[DB] Tentando conectar (attempt ${attempt + 1}/${MAX_RETRIES}) host=${DB_HOST} port=${DB_PORT}`);
            const connection = await mysql.createConnection({
                host: DB_HOST,
                port: DB_PORT,
                user: DB_USER,
                password: DB_PASSWORD
            });
            console.log('[DB] Conexão básica estabelecida, criando banco se não existir...');
            await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
            await connection.end();
            console.log(`[DB] Banco \`${DB_NAME}\` OK.`);
            return; // sucesso
        } catch (err) {
            console.error(`[DB] Falha na tentativa ${attempt + 1}:`, err.code || err.message);
            attempt++;
            if (attempt >= MAX_RETRIES) {
                throw new Error(`[DB] Não foi possível conectar ao MySQL após ${MAX_RETRIES} tentativas.`);
            }
            console.log(`[DB] Aguardando ${RETRY_DELAY_MS}ms antes de nova tentativa...`);
            await wait(RETRY_DELAY_MS);
        }
    }
}

// Função principal
const startDb = async () => {
    if (!db) {
        await ensureDatabaseExists();
        db = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
            host: DB_HOST,
            port: DB_PORT,
            dialect: 'mysql',
            logging: false
        });
        try {
            await db.authenticate();
            console.log('[DB] Sequelize autenticado com sucesso.');
        } catch (e) {
            console.error('[DB] Erro ao autenticar Sequelize:', e.message);
            throw e;
        }
    }
    return db;
};

module.exports = startDb;
