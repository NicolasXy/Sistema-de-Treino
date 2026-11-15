const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Jogador = sequelize.define('Jogador', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nome: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: { notEmpty: { msg: 'nome é obrigatório.' }, len: { args: [1, 100], msg: 'nome deve ter até 100 caracteres.' } },
  },
  posicao: {
    type: DataTypes.ENUM('G', 'Z', 'M', 'A'),
    allowNull: false,
    validate: { isIn: { args: [['G', 'Z', 'M', 'A']], msg: "posicao deve ser 'G', 'Z', 'M' ou 'A'." } },
  },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'jogadores' });

module.exports = Jogador;
