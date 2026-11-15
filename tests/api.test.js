// Integração (requer MySQL com migrations + seeders aplicados e .env configurado). Execução: npm run test:api
// Usa a massa de teste do seeder (semanas 05–11/10 e 12–18/10/2026, limite 300). Dados criados aqui são removidos ao final.
const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const { sequelize, Jogador, Treino, Configuracao } = require('../src/models');

let servidor;
let base;
let limiteOriginal;
let idTeste;
const PREFIXO = 'ZZ-';

async function chamar(metodo, caminho, corpo) {
  const resp = await fetch(base + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: resp.status, corpo: await resp.json() };
}
const treino = (extra) => ({ codigo: `${PREFIXO}1`, jogadorId: idTeste, dataTreino: '2030-01-08 10:00:00', tipo: 'F', duracaoMin: 60, intensidade: 8, ...extra });

test.before(async () => {
  await new Promise((ok) => { servidor = app.listen(0, ok); });
  base = `http://127.0.0.1:${servidor.address().port}`;
  limiteOriginal = (await Configuracao.findOne({ order: [['id', 'DESC']] })).cargaMaximaSemanal;
  const j = await chamar('POST', '/jogadores', { nome: 'Atleta de Teste', posicao: 'G' });
  idTeste = j.corpo.id;
});

test.after(async () => {
  await Treino.destroy({ where: { jogadorId: idTeste } });
  await Jogador.destroy({ where: { id: idTeste } });
  await chamar('PUT', '/configuracao', { cargaMaximaSemanal: limiteOriginal });
  await new Promise((ok) => servidor.close(ok));
  await sequelize.close();
});

test('jogadores: cadastro, consulta, filtro, atualização e 400/404', async () => {
  assert.equal((await chamar('POST', '/jogadores', { nome: '', posicao: 'G' })).status, 400);
  assert.equal((await chamar('POST', '/jogadores', { nome: 'X', posicao: 'Q' })).status, 400);
  const c = await chamar('GET', `/jogadores/${idTeste}`);
  assert.equal(c.status, 200);
  assert.equal(c.corpo.ativo, true);
  assert.equal((await chamar('GET', '/jogadores/999999')).status, 404);
  assert.equal((await chamar('GET', '/jogadores/abc')).status, 400);
  const todos = await chamar('GET', '/jogadores?posicao=Z');
  assert.ok(todos.corpo.length >= 2 && todos.corpo.every((j) => j.posicao === 'Z'));
  const u = await chamar('PUT', `/jogadores/${idTeste}`, { nome: 'Atleta Renomeado' });
  assert.equal(u.corpo.nome, 'Atleta Renomeado');
  assert.equal((await chamar('PUT', `/jogadores/${idTeste}`, {})).status, 400);
});

test('massa de teste: >= 6 atletas ativos nas 4 posições e >= 20 treinos F/T/E', async () => {
  const ativos = (await chamar('GET', '/jogadores?ativo=true')).corpo;
  assert.ok(ativos.length >= 6);
  assert.deepEqual([...new Set(ativos.map((j) => j.posicao))].sort(), ['A', 'G', 'M', 'Z']);
  const treinos = (await chamar('GET', '/treinos')).corpo;
  assert.ok(treinos.length >= 20);
  assert.deepEqual([...new Set(treinos.map((t) => t.tipo))].sort(), ['E', 'F', 'T']);
});

test('registra treino: carga da API confere com o cálculo manual (F, 60 min, int 8 => 72)', async () => {
  const r = await chamar('POST', '/treinos', treino());
  assert.equal(r.status, 201);
  assert.equal(r.corpo.carga, (60 / 10) * 8 * 1.5);
  assert.equal(r.corpo.carga, 72);
  assert.equal(r.corpo.Jogador.id, idTeste);
});

test('rejeita código duplicado (409), intensidade inválida (400) e duração não positiva (400)', async () => {
  assert.equal((await chamar('POST', '/treinos', treino())).status, 409);
  assert.equal((await chamar('POST', '/treinos', treino({ codigo: `${PREFIXO}2`, intensidade: 0 }))).status, 400);
  assert.equal((await chamar('POST', '/treinos', treino({ codigo: `${PREFIXO}2`, intensidade: 11 }))).status, 400);
  assert.equal((await chamar('POST', '/treinos', treino({ codigo: `${PREFIXO}2`, duracaoMin: 0 }))).status, 400);
  assert.equal((await chamar('POST', '/treinos', treino({ codigo: `${PREFIXO}2`, duracaoMin: -30 }))).status, 400);
  assert.equal((await chamar('POST', '/treinos', treino({ codigo: `${PREFIXO}2`, tipo: 'X' }))).status, 400);
});

test('atleta inexistente (404) e inativo (409); histórico preservado ao desativar', async () => {
  assert.equal((await chamar('POST', '/treinos', treino({ codigo: `${PREFIXO}3`, jogadorId: 999999 }))).status, 404);
  const d = await chamar('PATCH', `/jogadores/${idTeste}/desativar`);
  assert.equal(d.status, 200);
  assert.equal(d.corpo.ativo, false);
  assert.equal((await chamar('POST', '/treinos', treino({ codigo: `${PREFIXO}3` }))).status, 409);
  assert.equal((await chamar('GET', `/treinos/jogador/${idTeste}`)).corpo.length, 1); // histórico intacto
  await chamar('PUT', `/jogadores/${idTeste}`, { ativo: true });
});

test('filtros de treinos: por atleta, tipo e período (Op.between)', async () => {
  const porAtleta = (await chamar('GET', '/treinos/jogador/2')).corpo;
  assert.ok(porAtleta.length > 0 && porAtleta.every((t) => t.jogadorId === 2));
  const porTipo = (await chamar('GET', '/treinos?tipo=E')).corpo;
  assert.ok(porTipo.length > 0 && porTipo.every((t) => t.tipo === 'E'));
  const semana = (await chamar('GET', '/treinos?inicio=2026-10-05&fim=2026-10-11')).corpo;
  assert.equal(semana.length, 19);
  assert.equal((await chamar('GET', '/treinos?inicio=2026-10-11&fim=2026-10-05')).status, 400);
  assert.equal((await chamar('GET', '/treinos/jogador/999999')).status, 404);
});

test('relatório 05–11/10: indicadores por atleta, tipo e posição', async () => {
  const r = (await chamar('GET', '/relatorios/semanal?data=2026-10-08')).corpo; // quinta → semana da segunda 05/10
  assert.deepEqual(r.semana, { inicio: '2026-10-05', fim: '2026-10-11', dataConsultada: '2026-10-08' });
  assert.equal(r.totalTreinos, 19);
  assert.equal(r.limiteCargaSemanal, 300);
  const carga = (id) => r.porJogador.find((j) => j.jogadorId === id);
  assert.equal(carga(2).cargaSemanal, 342.9);
  assert.equal(carga(2).totalTreinos, 4);
  assert.equal(carga(2).alerta, 'RISCO DE SOBRECARGA');
  assert.equal(carga(6).cargaSemanal, 300.6); // 0,6 acima do limite → risco
  assert.equal(carga(4).riscoSobrecarga, false);
  assert.equal(r.jogadoresEmRisco, 2);
  assert.equal(r.maiorCargaSemanal.jogadores[0].nome, 'Rafael Dias');
  // Bruno (inativo) treinou na semana: o histórico entra no relatório
  assert.equal(r.menorCargaSemanal.jogadores[0].nome, 'Bruno Teixeira');
  assert.equal(r.menorCargaSemanal.jogadores[0].cargaSemanal, 18);
  assert.equal(carga(3).cargaSemanal, 54);
  assert.deepEqual(r.mediaCargaPorTipo.map((t) => t.tipo), ['F', 'T', 'E']);
  assert.equal(r.mediaCargaPorTipo.reduce((s, t) => s + t.totalTreinos, 0), 19);
  assert.equal(r.porPosicao.reduce((s, p) => s + p.totalTreinos, 0), 19);
  assert.equal(r.porPosicao.find((p) => p.posicao === 'G').totalTreinos, 3);
});

test('relatório 12–18/10: semana diferente, jogador sem treino fora do ranking', async () => {
  const r = (await chamar('GET', '/relatorios/semanal?data=2026-10-12')).corpo;
  assert.equal(r.totalTreinos, 12);
  assert.equal(r.porJogador.find((j) => j.jogadorId === 6), undefined); // Diego não treinou
  assert.equal(r.maiorCargaSemanal.jogadores[0].nome, 'Thiago Nunes');
  assert.equal(r.maiorCargaSemanal.jogadores[0].cargaSemanal, 369.6);
  assert.equal(r.menorCargaSemanal.jogadores[0].nome, 'Mateus Lima');
  assert.equal(r.jogadoresEmRisco, 1);
});

test('semana sem treinos: 200 com zeros e rankings nulos', async () => {
  const r = await chamar('GET', '/relatorios/semanal?data=2026-01-07');
  assert.equal(r.status, 200);
  assert.equal(r.corpo.totalTreinos, 0);
  assert.equal(r.corpo.maiorCargaSemanal, null);
  assert.equal(r.corpo.menorCargaSemanal, null);
  assert.deepEqual(r.corpo.porJogador, []);
  assert.equal(r.corpo.porPosicao.length, 4);
});

test('risco só quando carga > limite (empate não sinaliza)', async () => {
  const semana = '/relatorios/semanal?data=2030-01-08';
  const noLimite = await chamar('PUT', '/configuracao', { cargaMaximaSemanal: 72 });
  assert.equal(noLimite.status, 200);
  let r = (await chamar('GET', semana)).corpo;
  assert.equal(r.porJogador[0].cargaSemanal, 72);
  assert.equal(r.porJogador[0].riscoSobrecarga, false);
  assert.equal(r.jogadoresEmRisco, 0);
  await chamar('PUT', '/configuracao', { cargaMaximaSemanal: 71.99 });
  r = (await chamar('GET', semana)).corpo;
  assert.equal(r.porJogador[0].riscoSobrecarga, true);
});

test('empate no ranking lista todos os empatados', async () => {
  const j2 = await Jogador.create({ nome: 'Empate', posicao: 'A' });
  try {
    await chamar('POST', '/treinos', treino({ codigo: `${PREFIXO}9`, jogadorId: j2.id }));
    const r = (await chamar('GET', '/relatorios/semanal?data=2030-01-08')).corpo;
    assert.equal(r.maiorCargaSemanal.empate, true);
    assert.equal(r.maiorCargaSemanal.jogadores.length, 2);
  } finally {
    await Treino.destroy({ where: { jogadorId: j2.id } });
    await j2.destroy();
  }
});

test('relatório: data ausente/ inválida => 400', async () => {
  assert.equal((await chamar('GET', '/relatorios/semanal')).status, 400);
  assert.equal((await chamar('GET', '/relatorios/semanal?data=2026-02-31')).status, 400);
});

test('configuração: consulta e validação', async () => {
  assert.equal((await chamar('GET', '/configuracao')).status, 200);
  assert.equal((await chamar('PUT', '/configuracao', { cargaMaximaSemanal: -5 })).status, 400);
  assert.equal((await chamar('PUT', '/configuracao', { cargaMaximaSemanal: 'abc' })).status, 400);
});

test('exclui treino pelo código (200) e 404 na segunda vez', async () => {
  assert.equal((await chamar('DELETE', `/treinos/${PREFIXO}1`)).status, 200);
  assert.equal((await chamar('DELETE', `/treinos/${PREFIXO}1`)).status, 404);
});

test('JSON inválido => 400 e rota inexistente => 404, sem vazar detalhes', async () => {
  const resp = await fetch(`${base}/jogadores`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{quebrado' });
  assert.equal(resp.status, 400);
  assert.equal((await chamar('GET', '/nada')).status, 404);
});
