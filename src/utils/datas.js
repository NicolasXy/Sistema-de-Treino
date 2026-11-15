const { ErroApp } = require('../errors');

const SO_DATA = /^\d{4}-\d{2}-\d{2}$/;
const DATA_HORA = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/;

/**
 * Converte 'YYYY-MM-DD' ou 'YYYY-MM-DD[T ]HH:mm[:ss]' (UTC se não houver fuso) em Date.
 * `fimDoDia` faz uma data sem hora valer 23:59:59.999 (limite superior inclusivo de filtros).
 */
function parseData(valor, rotulo, fimDoDia = false) {
  if (typeof valor !== 'string') throw new ErroApp(400, `${rotulo} deve ser uma data (YYYY-MM-DD).`);
  const v = valor.trim();
  let iso;
  if (SO_DATA.test(v)) iso = `${v}T${fimDoDia ? '23:59:59.999' : '00:00:00.000'}Z`;
  else if (DATA_HORA.test(v)) iso = /(Z|[+-]\d{2}:\d{2})$/.test(v) ? v.replace(' ', 'T') : `${v.replace(' ', 'T')}Z`;
  else throw new ErroApp(400, `${rotulo} inválida: use YYYY-MM-DD ou YYYY-MM-DD HH:mm:ss.`);

  const d = new Date(iso);
  // rejeita 2026-02-31 (Date "rola" para março)
  const semFuso = !/[+-]\d{2}:\d{2}$/.test(v);
  if (Number.isNaN(d.getTime()) || (semFuso && d.toISOString().slice(0, 10) !== v.slice(0, 10))) {
    throw new ErroApp(400, `${rotulo} inválida: ${valor}.`);
  }
  return d;
}

const DIA_MS = 24 * 60 * 60 * 1000;

/** Semana de segunda 00:00:00.000 a domingo 23:59:59.999 (UTC) que contém `data`. */
function semanaDe(data) {
  const dia = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
  const desdeSegunda = (dia.getUTCDay() + 6) % 7;
  const inicio = new Date(dia.getTime() - desdeSegunda * DIA_MS);
  const fim = new Date(inicio.getTime() + 7 * DIA_MS - 1);
  return { inicio, fim };
}

const soData = (d) => d.toISOString().slice(0, 10);

module.exports = { parseData, semanaDe, soData };
