const ApiLog = require('../models/apiLog');

const apiLogger = (req, res, next) => {
  const start = Date.now();

  const originalEnd = res.end;
  res.end = function (...args) {
    originalEnd.apply(res, args);

    const responseTime = Date.now() - start;

    const logEntry = {
      metodo: req.method,
      endpoint: req.originalUrl || req.url,
      statusCode: res.statusCode,
      responseTime,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    if (req.uid) {
      logEntry.usuario = req.uid;
    }

    ApiLog.create(logEntry).catch((err) => {
      console.error('Error al guardar ApiLog:', err.message);
    });
  };

  next();
};

module.exports = { apiLogger };
