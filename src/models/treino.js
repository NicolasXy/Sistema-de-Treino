const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Treino = sequelize.define('Treino', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  codigo: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
    validate: { notEmpty: { msg: 'codigo é obrigatório.' } },
  },
  jogadorId: { type: DataTypes.INTEGER, allowNull: false },
  dataTreino: { type: DataTypes.DATE, allowNull: false, validate: { isDate: { msg: 'dataTreino inválida.' } } },
  tipo: {
    type: DataTypes.ENUM('F', 'T', 'E'),
    allowNull: false,
    validate: { isIn: { args: [['F', 'T', 'E']], msg: "tipo deve ser 'F', 'T' ou 'E'." } },
  },
  duracaoMin: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { isInt: { msg: 'duracaoMin deve ser inteiro.' }, min: { args: [1], msg: 'duracaoMin deve ser positiva.' } },
  },
  intensidade: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      isInt: { msg: 'intensidade deve ser inteiro.' },
      min: { args: [1], msg: 'intensidade deve estar entre 1 e 10.' },
      max: { args: [10], msg: 'intensidade deve estar entre 1 e 10.' },
    },
  },
  carga: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    get() { const v = this.getDataValue('carga'); return v === null ? null : Number(v); }, // DECIMAL chega como string
  },
}, { tableName: 'treinos' });

module.exports = Treino;
