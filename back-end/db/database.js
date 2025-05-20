const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');

const DB_NAME = 'catSearch';

let db = null; // Variável para armazenar a instância do Sequelize

// Função para criar o banco de dados (se não existir) e inicializar o Sequelize
const startDb = async () => {
    if (!db) {
        const connection = await mysql.createConnection({
            host: "db", // Nome do serviço no docker-compose
            user: "root",
            password: "root" // Senha definida no docker-compose
});
        
        // Cria o banco de dados se não existir
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
        
        // Inicializa o Sequelize e armazena a instância na variável db
        db = new Sequelize(DB_NAME, 'root', 'root', { // Adicione a senha
            host: 'db', // Nome do serviço no docker-compose
            dialect: 'mysql',
            logging: false 
});
        
    }
    
    // Retorna a instância do Sequelize
    return db;
};

// Exporta a função que inicializa a conexão e retorna o Sequelize
module.exports = startDb;
