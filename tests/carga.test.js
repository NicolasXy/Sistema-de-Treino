// Testes unitários da regra de carga e das datas (sem banco). Execução: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularCarga } = require('../src/utils/carga');
const { parseData, semanaDe, soData } = require('../src/utils/datas');

test('exemplo do enunciado: físico, 60 min, intensidade 8 => 72', () => {
  assert.equal(calcularCarga(60, 8, 'F'), 72);
});

test('multiplicadores: T=1,2 e E=1,0', () => {
  assert.equal(calcularCarga(45, 6, 'T'), 32.4);
  assert.equal(calcularCarga(90, 5, 'E'), 45);
});

test('arredonda para 2 casas', () => {
  assert.equal(calcularCarga(55, 7, 'T'), 46.2);
  assert.equal(calcularCarga(33, 7, 'F'), 34.65);
});

test('intensidade fora de 1–10 => 400', () => {
  for (const i of [0, 11, -1, 5.5, '8', null]) assert.throws(() => calcularCarga(60, i, 'F'), { status: 400 });
});

test('duração não positiva => 400', () => {
  for (const d of [0, -10, 12.5, '60', undefined]) assert.throws(() => calcularCarga(d, 5, 'F'), { status: 400 });
});

test('tipo inválido => 400', () => {
  assert.throws(() => calcularCarga(60, 5, 'X'), { status: 400 });
  assert.throws(() => calcularCarga(60, 5, undefined), { status: 400 });
});

test('semana vai de segunda a domingo (UTC)', () => {
  for (const d of ['2026-10-05', '2026-10-08', '2026-10-11']) { // segunda, quinta, domingo
    const { inicio, fim } = semanaDe(parseData(d, 'data'));
    assert.equal(soData(inicio), '2026-10-05');
    assert.equal(soData(fim), '2026-10-11');
  }
  assert.equal(soData(semanaDe(parseData('2026-10-12', 'data')).inicio), '2026-10-12'); // domingo→segunda separa semanas
});

test('parseData rejeita datas inválidas', () => {
  for (const d of ['2026-02-31', '05/10/2026', 'abc', '', 20261005]) assert.throws(() => parseData(d, 'data'), { status: 400 });
});
