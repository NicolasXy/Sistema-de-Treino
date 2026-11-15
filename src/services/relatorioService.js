const { Op, fn, col } = require('sequelize');
const { Treino, Jogador, Configuracao } = require('../models');
const { ErroApp } = require('../errors');
const { parseData, semanaDe, soData } = require('../utils/datas');

const TIPOS = { F: 'Físico', T: 'Técnico', E: 'Estratégico' };
const POSICOES = { G: 'Goleiro', Z: 'Zagueiro', M: 'Meio-campista', A: 'Atacante' };
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Relatório da semana (segunda a domingo, UTC) que contém `data` (YYYY-MM-DD).
 * Agregações via Sequelize: count, sum, avg (fn/col), group, include e Op.between.
 *
 * Regras explícitas:
 *  - Rankings (maior/menor carga) consideram só jogadores com ao menos 1 treino na semana.
 *  - Empate: todos os jogadores empatados aparecem na lista do ranking.
 *  - Semana sem treinos: totais zerados, rankings null e listas vazias (não é erro).
 *  - RISCO DE SOBRECARGA: carga semanal ESTRITAMENTE maior que o limite (empate não sinaliza).
 */
async function gerarRelatorioSemanal(data) {
  if (data === undefined || data === '') throw new ErroApp(400, 'Informe a data de referência: ?data=YYYY-MM-DD.');
  const { inicio, fim } = semanaDe(parseData(data, 'data'));

  const config = await Configuracao.findOne({ order: [['id', 'DESC']] });
  if (!config) throw new ErroApp(409, 'Configure o limite máximo semanal (PUT /configuracao) antes de gerar o relatório.');
  const limite = config.cargaMaximaSemanal;

  const where = { dataTreino: { [Op.between]: [inicio, fim] } };

  const [totalTreinos, linhasJogador, linhasTipo, linhasPosicao] = await Promise.all([
    Treino.count({ where }),

    // carga semanal e nº de treinos por jogador: include + group + sum/count
    Treino.findAll({
      attributes: ['jogadorId', [fn('SUM', col('Treino.carga')), 'cargaSemanal'], [fn('COUNT', col('Treino.id')), 'totalTreinos']],
      where,
      include: [{ model: Jogador, attributes: ['nome', 'posicao', 'ativo'] }],
      group: ['Treino.jogadorId', 'Jogador.id', 'Jogador.nome', 'Jogador.posicao', 'Jogador.ativo'],
      raw: true,
    }),

    // carga média por tipo: group + avg
    Treino.findAll({
      attributes: ['tipo', [fn('COUNT', col('id')), 'totalTreinos'], [fn('AVG', col('carga')), 'cargaMedia']],
      where,
      group: ['tipo'],
      raw: true,
    }),

    // treinos e carga média por sessão por posição: include + group + count/avg
    Treino.findAll({
      attributes: [[col('Jogador.posicao'), 'posicao'], [fn('COUNT', col('Treino.id')), 'totalTreinos'], [fn('AVG', col('Treino.carga')), 'cargaMedia']],
      where,
      include: [{ model: Jogador, attributes: [] }],
      group: ['Jogador.posicao'],
      raw: true,
    }),
  ]);

  const porJogador = linhasJogador
    .map((l) => {
      const cargaSemanal = r2(l.cargaSemanal);
      const emRisco = cargaSemanal > limite; // estritamente maior
      return {
        jogadorId: l.jogadorId,
        nome: l['Jogador.nome'],
        posicao: l['Jogador.posicao'],
        ativo: Boolean(l['Jogador.ativo']),
        cargaSemanal,
        totalTreinos: Number(l.totalTreinos),
        riscoSobrecarga: emRisco,
        alerta: emRisco ? 'RISCO DE SOBRECARGA' : null,
      };
    })
    .sort((a, b) => b.cargaSemanal - a.cargaSemanal || a.nome.localeCompare(b.nome));

  const ranking = (alvo) => {
    if (porJogador.length === 0) return null;
    const jogadores = porJogador
      .filter((j) => j.cargaSemanal === alvo)
      .map(({ jogadorId, nome, posicao, cargaSemanal, totalTreinos }) => ({ jogadorId, nome, posicao, cargaSemanal, totalTreinos }));
    return { empate: jogadores.length > 1, jogadores };
  };
  const cargas = porJogador.map((j) => j.cargaSemanal);

  // F, T e E e as 4 posições sempre presentes (zeradas quando sem treinos)
  const mediaCargaPorTipo = Object.entries(TIPOS).map(([tipo, descricao]) => {
    const l = linhasTipo.find((x) => x.tipo === tipo);
    return { tipo, descricao, totalTreinos: l ? Number(l.totalTreinos) : 0, cargaMedia: l ? r2(l.cargaMedia) : 0 };
  });
  const porPosicao = Object.entries(POSICOES).map(([posicao, descricao]) => {
    const l = linhasPosicao.find((x) => x.posicao === posicao);
    return { posicao, descricao, totalTreinos: l ? Number(l.totalTreinos) : 0, cargaMediaPorSessao: l ? r2(l.cargaMedia) : 0 };
  });

  return {
    semana: { inicio: soData(inicio), fim: soData(fim), dataConsultada: soData(parseData(data, 'data')) },
    criterioRanking: 'Rankings consideram apenas jogadores com ao menos um treino na semana; empates listam todos os empatados.',
    limiteCargaSemanal: limite,
    totalTreinos,
    porJogador,
    maiorCargaSemanal: ranking(cargas.length ? Math.max(...cargas) : null),
    menorCargaSemanal: ranking(cargas.length ? Math.min(...cargas) : null),
    jogadoresEmRisco: porJogador.filter((j) => j.riscoSobrecarga).length,
    mediaCargaPorTipo,
    porPosicao,
    ...(totalTreinos === 0 && { mensagem: 'Nenhum treino registrado nesta semana.' }),
  };
}

module.exports = { gerarRelatorioSemanal };
