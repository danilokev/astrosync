// --------------------------------------------
// Middleware para validar los datos de entrada
// --------------------------------------------
const { response } = require('express');
const { validationResult } = require('express-validator');

const validate = (req, res = response, next) => {
  const errorsResult = validationResult(req);

  if (!errorsResult.isEmpty()) {
    return res.status(400).json({
      ok: false,
      msg: 'Argumentos recibidos inválidos',
      errors: errorsResult.mapped(),
    });
  }

  next();
};

module.exports = {
  validate,
};
