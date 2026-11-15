const { ErroApp } = require('../errors');

const MULTIPLICADOR = Object.freeze({ F: 1.5, T: 1.2, E: 1.0 });

/**
 * Única implementação da regra de carga (reutilizada por service e seeders).
 * carga = (duracaoMin / 10) × intensidade × multiplicador(tipo)
 * Ex.: físico, 60 min, intensidade 8 → 6 × 8 × 1,5 = 72.
 */
function calcularCarga(duracaoMin, intensidade, tipo) {
  if (!Number.isInteger(duracaoMin) || duracaoMin <= 0) throw new ErroApp(400, 'duracaoMin deve ser um inteiro positivo.');
  if (!Number.isInteger(intensidade) || intensidade < 1 || intensidade > 10) {
    throw new ErroApp(400, 'intensidade deve ser um inteiro entre 1 e 10.');
  }
  if (!Object.prototype.hasOwnProperty.call(MULTIPLICADOR, tipo)) throw new ErroApp(400, "tipo deve ser 'F', 'T' ou 'E'.");
  return Math.round(((duracaoMin * intensidade * MULTIPLICADOR[tipo]) / 10) * 100) / 100;
}

module.exports = { calcularCarga, MULTIPLICADOR };
