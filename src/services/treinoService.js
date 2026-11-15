const { Op, UniqueConstraintError } = require('sequelize');
const { Treino, Jogador } = require('../models');
const { ErroApp, validarId } = require('../errors');
const { calcularCarga } = require('../utils/carga');
const { parseData } = require('../utils/datas');

const TIPOS = ['F', 'T', 'E'];
const INCLUDE_JOGADOR = { model: Jogador, attributes: ['id', 'nome', 'posicao', 'ativo'] };

/** Valida, calcula a carga e cria o treino (jogador deve existir e estar ativo). */
async function registrarTreino(dados = {}) {
  const { codigo, jogadorId, dataTreino, tipo, duracaoMin, intensidade } = dados;

  if (typeof codigo !== 'string' || codigo.trim() === '') throw new ErroApp(400, 'codigo é obrigatório.');
  if (codigo.trim().length > 30) throw new ErroApp(400, 'codigo deve ter até 30 caracteres.');
  const idJogador = validarId(jogadorId, 'jogadorId');
  if (!TIPOS.includes(tipo)) throw new ErroApp(400, "tipo deve ser 'F', 'T' ou 'E'.");
  const data = dataTreino === undefined || dataTreino === null || dataTreino === ''
    ? new Date()
    : parseData(dataTreino, 'dataTreino');

  // calcularCarga valida duração (> 0 e inteira) e intensidade (1 a 10) → 400
  const carga = calcularCarga(duracaoMin, intensidade, tipo);

  const jogador = await Jogador.findByPk(idJogador);
  if (!jogador) throw new ErroApp(404, `Jogador ${idJogador} não encontrado.`);
  if (!jogador.ativo) throw new ErroApp(409, `Jogador ${idJogador} está inativo e não pode receber treinos.`);

  const codigoOk = codigo.trim();
  if (await Treino.findOne({ where: { codigo: codigoOk } })) {
    throw new ErroApp(409, `Já existe um treino com o código ${codigoOk}.`);
  }

  try {
    const treino = await Treino.create({ codigo: codigoOk, jogadorId: idJogador, dataTreino: data, tipo, duracaoMin, intensidade, carga });
    return await Treino.findByPk(treino.id, { include: INCLUDE_JOGADOR });
  } catch (erro) {
    // corrida entre dois cadastros simultâneos com o mesmo código
    if (erro instanceof UniqueConstraintError) throw new ErroApp(409, `Já existe um treino com o código ${codigoOk}.`);
    throw erro;
  }
}

/** findAll() com include (jogador) e where: ?jogadorId= &tipo= &inicio= &fim= (datas inclusivas). */
async function listarTreinos({ jogadorId, tipo, inicio, fim } = {}) {
  const where = {};
  if (jogadorId !== undefined && jogadorId !== '') where.jogadorId = validarId(jogadorId, 'jogadorId');
  if (tipo !== undefined && tipo !== '') {
    if (!TIPOS.includes(tipo)) throw new ErroApp(400, "tipo deve ser 'F', 'T' ou 'E'.");
    where.tipo = tipo;
  }
  const de = inicio ? parseData(inicio, 'inicio') : null;
  const ate = fim ? parseData(fim, 'fim', true) : null;
  if (de && ate && de > ate) throw new ErroApp(400, 'inicio não pode ser posterior a fim.');
  if (de && ate) where.dataTreino = { [Op.between]: [de, ate] };
  else if (de) where.dataTreino = { [Op.gte]: de };
  else if (ate) where.dataTreino = { [Op.lte]: ate };

  return Treino.findAll({ where, include: INCLUDE_JOGADOR, order: [['dataTreino', 'DESC'], ['id', 'DESC']] });
}

/** Treinos de um atleta; 404 se o atleta não existir. */
async function listarTreinosDoJogador(id, filtros = {}) {
  const idOk = validarId(id, 'id');
  if (!(await Jogador.findByPk(idOk))) throw new ErroApp(404, `Jogador ${idOk} não encontrado.`);
  return listarTreinos({ ...filtros, jogadorId: idOk });
}

/** destroy() após verificar existência; 404 se o código não existir. */
async function excluirTreino(codigo) {
  if (typeof codigo !== 'string' || codigo.trim() === '') throw new ErroApp(400, 'codigo é obrigatório.');
  const treino = await Treino.findOne({ where: { codigo: codigo.trim() } });
  if (!treino) throw new ErroApp(404, `Treino ${codigo} não encontrado.`);
  await treino.destroy();
  return { codigo: treino.codigo, mensagem: 'Treino excluído com sucesso.' };
}

module.exports = { registrarTreino, listarTreinos, listarTreinosDoJogador, excluirTreino };
