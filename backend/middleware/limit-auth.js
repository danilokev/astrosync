const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false, // Deshabilita las cabeceras antiguas
  skipSuccessfulRequests: true,
  message: { msg: 'Demasiados intentos' },
});

module.exports = {
  authLimiter,
};
