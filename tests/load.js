// Carrega os módulos do jogo no Node (sem navegador) para os testes.
const path = require('path');
const FILES = ['core.js', 'data/atlas.js', 'input.js', 'data/characters.js', 'animation.js', 'fighter.js', 'combat.js', 'match.js', 'ai.js'];
for (const f of FILES) require(path.join(__dirname, '..', 'src', f));
module.exports = globalThis.PF;
