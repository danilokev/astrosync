const Usuario = require('../models/usuarios');
const { response } = require('express');
const encryptService = require('./../helpers/encryptService');
const { generateJWT } = require('../helpers/jwt');

const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
};

const login = async (req, res = response) => {
  const { email, password } = req.body;

  try {
    const usuarioDB = await Usuario.findOne({ email });

    if (!usuarioDB) {
      return res.status(400).json({
        ok: false,
        msg: 'Usuario o contraseña incorrectos',
        token: '',
      });
    }

    const validarPass = await encryptService.desincriptar(
      password,
      usuarioDB.password,
    );

    if (!validarPass) {
      return res.status(400).json({
        ok: false,
        msg: 'Usuario o contraseña incorrectos',
        token: '',
      });
    }

    const token = await generateJWT(usuarioDB._id, usuarioDB.rol);

    usuarioDB.lastLogin = new Date();
    await usuarioDB.save();

    // Establece la cookie
    res.cookie('token', token, cookieOptions);

    res.status(200).json({
      ok: true,
      uid: usuarioDB._id,
      nombre: usuarioDB.nombre,
      apellidos: usuarioDB.apellidos,
      rol: usuarioDB.rol,
      ...(usuarioDB.googleId && { googleId: usuarioDB.googleId }),
      ...(usuarioDB.avatarUrl && { avatarUrl: usuarioDB.avatarUrl }),
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      ok: false,
      msg: 'Error al iniciar sesión',
    });
  }
};

const register = async (req, res) => {
  Usuario.findOne({
    email: req.body.email,
  })
    .then(async (user) => {
      if (!user) {
        let newUser = new Usuario({
          nombre: req.body.nombre,
          email: req.body.email,
          apellidos: req.body.apellidos,
          password: await encryptService.encriptar(req.body.password),
        });

        newUser.save().then((x) => {
          res.status(201).send({
            ok: true,
            resultado: x,
          });
        });
      } else {
        res.status(401).send({
          error: `El usuario ${req.body.email} ya existe`,
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send({
        ok: false,
        msg: 'Error creando el usuario',
      });
    });
};

const googleCallback = async (req, res = response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(400).json({
        ok: false,
        msg: 'No se recibió información de autenticación',
      });
    }

    const token = await generateJWT(user._id, user.rol);

    user.lastLogin = new Date();
    await user.save();

    // Establece la cookie
    res.cookie('token', token, cookieOptions);

    // redirige a la página principal
    res.redirect(process.env.FRONTEND_URL);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      ok: false,
      msg: 'Error en autenticación',
    });
  }
};

const checkAuthStatus = async (req, res = response) => {
  try {
    const user = await Usuario.findById(req.uid);

    if (!user) {
      return res.status(404).json({
        ok: false,
        msg: 'Usuario no encontrado',
      });
    }

    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      ok: true,
      uid: req.uid,
      rol: req.rol,
      nombre: user.nombre,
      apellidos: user.apellidos,
      email: user.email,
      ...(user.googleId && { googleId: user.googleId }),
      ...(user.avatarUrl && { avatarUrl: user.avatarUrl }),
    });
  } catch (error) {
    console.error('Error en checkAuthStatus:', error);
    res.status(500).json({
      ok: false,
      msg: 'Error al verificar autenticación',
    });
  }
};

const logout = (req, res = response) => {
  res.clearCookie('token', {
    ...cookieOptions,
    maxAge: 0,
  });

  res.status(200).json({
    ok: true,
    msg: 'Sesión cerrada',
  });
};

module.exports = {
  login,
  register,
  googleCallback,
  checkAuthStatus,
  logout,
};
