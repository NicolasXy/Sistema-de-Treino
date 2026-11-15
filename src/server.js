const app = require('./app');
const { sequelize } = require('./models');

const PORT = Number(process.env.PORT) || 3000;

(async () => {
  try {
    await sequelize.authenticate(); // testa a conexão; as tabelas vêm das migrations (nada de sync aqui)
    console.log('Conexão com o MySQL estabelecida.');
  } catch (erro) {
    console.error('Não foi possível conectar ao MySQL:', erro.parent?.code || erro.name);
    console.error('Verifique o .env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) e se o MySQL está rodando.');
    process.exit(1);
  }
  app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT} (Swagger em /docs)`));
})();
