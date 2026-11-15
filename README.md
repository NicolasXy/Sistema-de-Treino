# Sistema de Treinos Esportivos com Carga e Risco de Lesão

API REST em **Node.js + Express + Sequelize (dialeto mysql)** para registrar treinos, acompanhar a carga semanal e sinalizar possível sobrecarga.

> O indicador de risco é exclusivamente didático: não é diagnóstico nem predição clínica de lesão.

## Instalação e execução

Requisitos: Node.js 18+ e MySQL 8 (ou MariaDB 10.5+).

```bash
npm install
cp .env.example .env        # edite com seus dados do MySQL
npm run db:create           # cria o banco db_treinos
npm run db:migrate          # cria as tabelas (migrations)
npm run db:seed             # carrega a massa de teste
npm start                   # http://localhost:3000  (Swagger em /docs)
```

Para recomeçar do zero em desenvolvimento: `npm run db:reset` (desfaz as migrations, recria e popula).

## Estratégia de criação das tabelas

**Migrations do Sequelize CLI** (`src/migrations`), na ordem: `jogadores` → `configuracoes` → `treinos` (com FK, índice único em `codigo` e índices por data). A aplicação **nunca** chama `sync()`; o `server.js` só testa a conexão. Assim o esquema é versionado e reproduzível, e não há risco de `sync({ force: true })` apagar dados. A FK usa `ON DELETE RESTRICT` e não existe rota que apague jogador: ele só é **desativado**, e o histórico é preservado.

## Estrutura

```
src/
├── config/        config.js (CLI + app, lê o .env) e database.js (instância Sequelize)
├── models/        jogador, treino, configuracao + index.js (associações hasMany/belongsTo)
├── migrations/    criação das tabelas
├── seeders/       massa de teste
├── services/      regras de negócio e acesso a dados (Sequelize)
├── controllers/   HTTP (try/catch → middleware de erros)
├── routes/        endpoints
├── utils/         carga.js (calcularCarga) e datas.js (semana segunda–domingo)
├── swagger.js     documentação OpenAPI
├── app.js         Express + middleware de erros
└── server.js
tests/             carga.test.js (unitário) e api.test.js (integração)
```

## Regra de carga

`carga = (duracaoMin / 10) × intensidade × multiplicador` com F = 1,5, T = 1,2, E = 1,0. Exemplo: F, 60 min, intensidade 8 → **72**. A regra vive só em `calcularCarga()` (`src/utils/carga.js`).

Carga semanal = soma das cargas na semana (segunda 00:00 a domingo 23:59:59, **UTC**). **RISCO DE SOBRECARGA** só quando a soma é **estritamente maior** que o limite; empate não sinaliza.

## Endpoints

| Método | Endpoint | Finalidade | Status |
| --- | --- | --- | --- |
| POST | `/jogadores` | Cadastrar atleta | 201, 400 |
| GET | `/jogadores` (`?posicao=&ativo=`) | Listar | 200, 400 |
| GET | `/jogadores/:id` | Consultar | 200, 400, 404 |
| PUT | `/jogadores/:id` | Atualizar (`nome`, `posicao`, `ativo`) | 200, 400, 404 |
| PATCH | `/jogadores/:id/desativar` | Desativar | 200, 404 |
| GET / PUT | `/configuracao` | Consultar / atualizar limite semanal | 200, 201, 400, 404 |
| POST | `/treinos` | Registrar sessão | 201, 400, 404, 409 |
| GET | `/treinos` (`?jogadorId=&tipo=&inicio=&fim=`) | Listar e filtrar | 200, 400 |
| GET | `/treinos/jogador/:id` | Treinos do atleta | 200, 404 |
| DELETE | `/treinos/:codigo` | Excluir sessão | 200, 404 |
| GET | `/relatorios/semanal?data=2026-10-05` | Relatório da semana | 200, 400, 409 |

Erros: `{ "erro": "mensagem" }`. **400** dado inválido (intensidade fora de 1–10, duração ≤ 0, tipo/posição/data inválidos); **404** não encontrado; **409** código duplicado, atleta inativo ou limite não configurado (relatório); **500** erro interno, sem expor SQL, stack ou credenciais.

### Relatório semanal

Retorna: total de treinos; carga e nº de treinos por jogador (com `alerta`); maior e menor carga (nome, posição, total, treinos); jogadores em risco; carga média por tipo (F, T, E); treinos e carga média por sessão por posição. Critérios explícitos:

- **Rankings** consideram só jogadores com ao menos um treino na semana (campo `criterioRanking`).
- **Empate**: todos os empatados aparecem na lista (`empate: true`).
- **Semana sem treinos**: 200 com totais zerados, rankings `null` e `mensagem`.
- Atletas desativados que treinaram na semana entram no relatório (histórico preservado).

## Onde Sequelize e async/await foram usados

Todo acesso a dados é Sequelize com `async/await`, sem SQL manual nas funcionalidades (o seeder usa `queryInterface.bulkInsert`, API do Sequelize CLI).

| Função | Arquivo | Métodos Sequelize |
| --- | --- | --- |
| `cadastrarJogador` | `services/jogadorService.js` | `create` |
| `listarJogadores` | idem | `findAll` + `where` |
| `consultarJogador` | idem | `findByPk` |
| `atualizarJogador` / `desativarJogador` | idem | `instância.update` |
| `consultarConfiguracao` / `atualizarConfiguracao` | `services/configuracaoService.js` | `findOne`, `create`, `update` |
| `registrarTreino` | `services/treinoService.js` | `findByPk`, `findOne`, `create` (+ validações do model) |
| `listarTreinos` | idem | `findAll` + `include` + `where` + `Op.between/gte/lte` |
| `excluirTreino` | idem | `findOne` + `destroy` |
| `calcularCarga` | `utils/carga.js` | regra pura, reutilizável |
| `gerarRelatorioSemanal` | `services/relatorioService.js` | `count`, `findAll` com `fn('SUM'/'COUNT'/'AVG')`, `col`, `group`, `include`, `Op.between` |

Models (`src/models`) têm validações (`isIn`, `min`/`max`, `notEmpty`, `unique`) e `Jogador.hasMany(Treino)` / `Treino.belongsTo(Jogador)`.

## Testes

```bash
npm test          # unitários da regra de carga e das semanas (sem banco)
npm run test:api  # integração (precisa de migrations + seeders aplicados)
```

A massa de teste tem 7 atletas (6 ativos nas 4 posições + 1 inativo), limite **300** e 31 treinos em duas semanas:

| Semana | Acima do limite | Abaixo do limite |
| --- | --- | --- |
| 05–11/10/2026 | Rafael (342,9) e Diego (300,6) | demais |
| 12–18/10/2026 | Thiago (369,6) | demais (Diego não treinou) |

A integração cobre: carga da API × cálculo manual (72), código duplicado, intensidade inválida, duração não positiva, atleta inexistente/inativo, comparação das duas semanas, semana vazia, empate no limite (72 = 72 não sinaliza) e empate de ranking. Dados criados pelos testes são removidos ao final.

## Evidências pelo Swagger

Abra **http://localhost:3000/docs**, use *Try it out* nos endpoints (os corpos já vêm preenchidos com exemplos) e capture as telas. Sugestão de roteiro: cadastrar jogador; registrar treino (carga 72); código duplicado (409); intensidade 11 (400); atleta inexistente (404); relatório `data=2026-10-05` e `data=2026-10-12`.

## Falhas sem vazar credenciais

Credenciais só em `.env` (ignorado pelo Git). O middleware de erros devolve mensagens genéricas e registra no console apenas o tipo do erro. Com o banco fora do ar, a API responde `500 {"erro":"Banco de dados indisponível..."}`.
