const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { ValidationError, UniqueConstraintError, ConnectionError, ForeignKeyConstraintError } = require('sequelize');
const { ErroApp } = require('./errors');
const swaggerDocument = require('./swagger');
const routes = require('./routes');

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.redirect('/docs'));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { customSiteTitle: 'API de Treinos' }));
app.use(routes);

app.use((req, res) => res.status(404).json({ erro: `Rota não encontrada: ${req.method} ${req.originalUrl}` }));

// Middleware de erros: nunca devolve stack, SQL ou credenciais ao cliente.
// eslint-disable-next-line no-unused-vars
app.use((erro, req, res, next) => {
  if (erro instanceof ErroApp) return res.status(erro.status).json({ erro: erro.message });
  if (erro.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  if (erro instanceof UniqueConstraintError) return res.status(409).json({ erro: 'Registro duplicado.' });
  if (erro instanceof ForeignKeyConstraintError) return res.status(409).json({ erro: 'Operação viola um relacionamento existente.' });
  if (erro instanceof ValidationError) return res.status(400).json({ erro: erro.errors.map((e) => e.message).join(' ') });

  console.error('Erro interno:', erro.name, erro.parent?.code || erro.code || '');
  const msg = erro instanceof ConnectionError ? 'Banco de dados indisponível. Tente novamente mais tarde.' : 'Erro interno do servidor.';
  return res.status(500).json({ erro: msg });
});

module.exports = app;
