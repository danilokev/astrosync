const jwt = require('jsonwebtoken');

const validateJWT = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({
      ok: false,
      msg: 'Falta autenticación',
    });
  }

  try {
    const { uid, rol, ...object } = jwt.verify(token, process.env.JWT_SECRET);

    req.uid = uid;
    req.rol = rol;

    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      msg: 'Autenticación no válida',
    });
  }
};

module.exports = {
  validateJWT,
};
