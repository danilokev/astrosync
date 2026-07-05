const bcrypt = require('bcrypt');
const saltRounds = 10;

function encriptar(textoPlano) {
  return bcrypt.hash(textoPlano, saltRounds);
}

function desincriptar(texto, hash) {
  return bcrypt.compare(texto, hash);
}

module.exports = {
  encriptar: encriptar,
  desincriptar: desincriptar,
};
