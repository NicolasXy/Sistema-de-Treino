const { Configuracao } = require('../models');
const { ErroApp } = require('../errors');
const { parseData, soData } = require('../utils/datas');

/** Limite vigente = registro mais recente. */
async function consultarConfiguracao() {
  const config = await Configuracao.findOne({ order: [['id', 'DESC']] });
  if (!config) throw new ErroApp(404, 'Limite semanal ainda não configurado. Use PUT /configuracao.');
  return config;
}

/** Cadastra (1ª vez) ou atualiza o limite máximo semanal. Retorna { configuracao, criada }. */
async function atualizarConfiguracao({ cargaMaximaSemanal, dataVigencia } = {}) {
  const limite = Number(cargaMaximaSemanal);
  if (cargaMaximaSemanal === null || cargaMaximaSemanal === '' || typeof cargaMaximaSemanal === 'boolean'
      || !Number.isFinite(limite) || limite <= 0 || limite > 99999999.99) {
    throw new ErroApp(400, 'cargaMaximaSemanal deve ser um número maior que zero.');
  }
  const campos = { cargaMaximaSemanal: Math.round(limite * 100) / 100 };
  if (dataVigencia !== undefined && dataVigencia !== null && dataVigencia !== '') {
    campos.dataVigencia = soData(parseData(dataVigencia, 'dataVigencia'));
  }

  const existente = await Configuracao.findOne({ order: [['id', 'DESC']] });
  if (existente) return { configuracao: await existente.update(campos), criada: false };
  return { configuracao: await Configuracao.create(campos), criada: true };
}

module.exports = { consultarConfiguracao, atualizarConfiguracao };
