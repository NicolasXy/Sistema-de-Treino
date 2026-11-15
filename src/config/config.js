require('dotenv').config();

// Lido pelo Sequelize CLI (migrations/seeders) e pela aplicação. Credenciais só via .env.
const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'db_treinos',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  dialect: 'mysql',
  timezone: '+00:00', // datas gravadas e lidas em UTC
  logging: false,
};

module.exports = { development: base, test: base, production: base };
