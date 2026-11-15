const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Configuracao = sequelize.define('Configuracao', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  cargaMaximaSemanal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: { args: [0.01], msg: 'cargaMaximaSemanal deve ser maior que zero.' } },
    get() { const v = this.getDataValue('cargaMaximaSemanal'); return v === null ? null : Number(v); },
  },
  dataVigencia: { type: DataTypes.DATEONLY, allowNull: true },
}, { tableName: 'configuracoes' });

module.exports = Configuracao;
