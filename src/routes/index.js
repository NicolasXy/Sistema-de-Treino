const { Router } = require('express');
const c = require('../controllers');

const router = Router();

router.post('/jogadores', c.jogadores.cadastrar);
router.get('/jogadores', c.jogadores.listar);
router.get('/jogadores/:id', c.jogadores.consultar);
router.put('/jogadores/:id', c.jogadores.atualizar);
router.patch('/jogadores/:id/desativar', c.jogadores.desativar);

router.get('/configuracao', c.configuracao.consultar);
router.put('/configuracao', c.configuracao.atualizar);

router.post('/treinos', c.treinos.registrar);
router.get('/treinos', c.treinos.listar);
router.get('/treinos/jogador/:id', c.treinos.doJogador);
router.delete('/treinos/:codigo', c.treinos.excluir);

router.get('/relatorios/semanal', c.relatorios.semanal);

module.exports = router;
