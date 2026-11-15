const jogadores = require('../services/jogadorService');
const configuracao = require('../services/configuracaoService');
const treinos = require('../services/treinoService');
const { gerarRelatorioSemanal } = require('../services/relatorioService');

// Envolve cada handler em try/catch e delega o erro ao middleware (src/app.js).
const tratar = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (erro) {
    next(erro);
  }
};

module.exports = {
  jogadores: {
    cadastrar: tratar(async (req, res) => res.status(201).json(await jogadores.cadastrarJogador(req.body))),
    listar: tratar(async (req, res) => res.status(200).json(await jogadores.listarJogadores(req.query))),
    consultar: tratar(async (req, res) => res.status(200).json(await jogadores.consultarJogador(req.params.id))),
    atualizar: tratar(async (req, res) => res.status(200).json(await jogadores.atualizarJogador(req.params.id, req.body))),
    desativar: tratar(async (req, res) => res.status(200).json(await jogadores.desativarJogador(req.params.id))),
  },
  configuracao: {
    consultar: tratar(async (req, res) => res.status(200).json(await configuracao.consultarConfiguracao())),
    atualizar: tratar(async (req, res) => {
      const { configuracao: c, criada } = await configuracao.atualizarConfiguracao(req.body);
      res.status(criada ? 201 : 200).json(c);
    }),
  },
  treinos: {
    registrar: tratar(async (req, res) => res.status(201).json(await treinos.registrarTreino(req.body))),
    listar: tratar(async (req, res) => res.status(200).json(await treinos.listarTreinos(req.query))),
    doJogador: tratar(async (req, res) => res.status(200).json(await treinos.listarTreinosDoJogador(req.params.id, req.query))),
    excluir: tratar(async (req, res) => res.status(200).json(await treinos.excluirTreino(req.params.codigo))),
  },
  relatorios: {
    semanal: tratar(async (req, res) => res.status(200).json(await gerarRelatorioSemanal(req.query.data))),
  },
};
