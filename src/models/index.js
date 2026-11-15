const sequelize = require('../config/database');
const Jogador = require('./jogador');
const Treino = require('./treino');
const Configuracao = require('./configuracao');

// RESTRICT: nunca apaga histórico de treinos junto com o jogador (jogador só é desativado).
Jogador.hasMany(Treino, { foreignKey: 'jogadorId', as: 'treinos', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
Treino.belongsTo(Jogador, { foreignKey: 'jogadorId', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

module.exports = { sequelize, Jogador, Treino, Configuracao };
