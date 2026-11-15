const { Jogador } = require('../models');
const { ErroApp, validarId } = require('../errors');

const POSICOES = ['G', 'Z', 'M', 'A'];

function lerAtivo(valor) {
  const v = String(valor).toLowerCase();
  if (!['true', 'false', '1', '0'].includes(v)) throw new ErroApp(400, 'ativo deve ser true ou false.');
  return v === 'true' || v === '1';
}

function validarPosicao(posicao) {
  if (!POSICOES.includes(posicao)) throw new ErroApp(400, "posicao deve ser 'G', 'Z', 'M' ou 'A'.");
  return posicao;
}

function validarNome(nome) {
  if (typeof nome !== 'string' || nome.trim() === '') throw new ErroApp(400, 'nome é obrigatório.');
  if (nome.trim().length > 100) throw new ErroApp(400, 'nome deve ter até 100 caracteres.');
  return nome.trim();
}

/** Model.create() */
async function cadastrarJogador({ nome, posicao } = {}) {
  return Jogador.create({ nome: validarNome(nome), posicao: validarPosicao(posicao) });
}

/** Model.findAll() com filtros opcionais ?posicao= e ?ativo= */
async function listarJogadores({ posicao, ativo } = {}) {
  const where = {};
  if (posicao !== undefined && posicao !== '') where.posicao = validarPosicao(posicao);
  if (ativo !== undefined && ativo !== '') where.ativo = lerAtivo(ativo);
  return Jogador.findAll({ where, order: [['id', 'ASC']] });
}

/** Model.findByPk(); 404 se não existir. */
async function consultarJogador(id) {
  const idOk = validarId(id, 'id');
  const jogador = await Jogador.findByPk(idOk);
  if (!jogador) throw new ErroApp(404, `Jogador ${idOk} não encontrado.`);
  return jogador;
}

/** instância.update() — nome, posicao e/ou ativo (ativo=true reativa o atleta). */
async function atualizarJogador(id, { nome, posicao, ativo } = {}) {
  const jogador = await consultarJogador(id);
  const campos = {};
  if (nome !== undefined) campos.nome = validarNome(nome);
  if (posicao !== undefined) campos.posicao = validarPosicao(posicao);
  if (ativo !== undefined) {
    if (typeof ativo !== 'boolean') throw new ErroApp(400, 'ativo deve ser true ou false.');
    campos.ativo = ativo;
  }
  if (Object.keys(campos).length === 0) throw new ErroApp(400, 'Informe nome, posicao e/ou ativo para atualizar.');
  return jogador.update(campos);
}

/** Desativa (ativo = false). Não apaga nada: o histórico de treinos é preservado. */
async function desativarJogador(id) {
  const jogador = await consultarJogador(id);
  return jogador.update({ ativo: false });
}

module.exports = { cadastrarJogador, listarJogadores, consultarJogador, atualizarJogador, desativarJogador };
