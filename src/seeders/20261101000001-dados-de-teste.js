'use strict';
const { calcularCarga } = require('../utils/carga');

// Dados de teste: 7 atletas (6 ativos nas 4 posições + 1 inativo com histórico), limite de 300 e 31 treinos
// em duas semanas (05–11/10/2026 e 12–18/10/2026). A carga é calculada por calcularCarga().
const JOGADORES = [
  [1, 'Gabriel Rocha', 'G', true],
  [2, 'Rafael Dias', 'Z', true],
  [3, 'Thiago Nunes', 'Z', true],
  [4, 'Mateus Lima', 'M', true],
  [5, 'Felipe Castro', 'M', true],
  [6, 'Diego Alves', 'A', true],
  [7, 'Bruno Teixeira', 'A', false], // inativo: o histórico dele é preservado
];

// [codigo, jogadorId, 'YYYY-MM-DD HH:mm', tipo, duracaoMin, intensidade]
const TREINOS = [
  // Semana 1 (05–11/10)
  ['T001', 1, '2026-10-05 09:00', 'F', 60, 8], ['T002', 1, '2026-10-07 15:00', 'T', 45, 6], ['T003', 1, '2026-10-09 10:00', 'E', 90, 5],
  ['T004', 2, '2026-10-05 16:00', 'F', 90, 9], ['T005', 2, '2026-10-06 10:00', 'F', 75, 8], ['T006', 2, '2026-10-08 17:00', 'T', 60, 7], ['T007', 2, '2026-10-10 09:00', 'F', 60, 9],
  ['T008', 3, '2026-10-06 08:30', 'T', 50, 5], ['T009', 3, '2026-10-08 14:00', 'E', 60, 4],
  ['T010', 4, '2026-10-05 11:00', 'F', 80, 7], ['T011', 4, '2026-10-07 09:30', 'T', 60, 8], ['T012', 4, '2026-10-09 16:00', 'F', 70, 8], ['T013', 4, '2026-10-11 10:00', 'E', 90, 6],
  ['T014', 5, '2026-10-06 17:00', 'T', 40, 5], ['T015', 5, '2026-10-10 10:30', 'E', 60, 6],
  ['T016', 6, '2026-10-07 11:00', 'F', 100, 9], ['T017', 6, '2026-10-08 09:00', 'F', 90, 8], ['T018', 6, '2026-10-10 15:00', 'T', 60, 8],
  ['T019', 7, '2026-10-06 10:00', 'E', 60, 3],
  // Semana 2 (12–18/10) — Diego (6) não treinou
  ['T020', 1, '2026-10-12 09:00', 'F', 60, 7], ['T021', 1, '2026-10-14 10:00', 'T', 60, 6],
  ['T022', 2, '2026-10-13 10:00', 'E', 60, 5], ['T023', 2, '2026-10-15 15:00', 'T', 45, 5],
  ['T024', 3, '2026-10-12 16:00', 'F', 90, 9], ['T025', 3, '2026-10-14 09:00', 'F', 80, 8], ['T026', 3, '2026-10-16 11:00', 'T', 60, 8], ['T027', 3, '2026-10-17 14:00', 'F', 70, 9],
  ['T028', 4, '2026-10-13 09:00', 'T', 50, 6],
  ['T029', 5, '2026-10-12 11:00', 'F', 60, 8], ['T030', 5, '2026-10-15 10:00', 'E', 90, 6], ['T031', 5, '2026-10-17 09:00', 'T', 60, 6],
];

module.exports = {
  async up(queryInterface) {
    const agora = new Date();
    await queryInterface.bulkInsert('configuracoes', [{ cargaMaximaSemanal: 300, dataVigencia: '2026-10-01', createdAt: agora, updatedAt: agora }]);
    await queryInterface.bulkInsert('jogadores', JOGADORES.map(([id, nome, posicao, ativo]) => ({ id, nome, posicao, ativo, createdAt: agora, updatedAt: agora })));
    await queryInterface.bulkInsert('treinos', TREINOS.map(([codigo, jogadorId, data, tipo, duracaoMin, intensidade]) => ({
      codigo, jogadorId, dataTreino: new Date(`${data.replace(' ', 'T')}:00Z`), tipo, duracaoMin, intensidade,
      carga: calcularCarga(duracaoMin, intensidade, tipo), createdAt: agora, updatedAt: agora,
    })));
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('treinos', null, {});
    await queryInterface.bulkDelete('jogadores', null, {});
    await queryInterface.bulkDelete('configuracoes', null, {});
  },
};
