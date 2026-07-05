// --------------------------------------------------------------------
// Ruta base: /api/auth
// --------------------------------------------------------------------
const { Router } = require('express');
const {
  login,
  register,
  googleCallback,
  checkAuthStatus,
  logout,
} = require('../controllers/authController'); // Controlador de autenticación
const { check } = require('express-validator');
const { validate } = require('../middleware/validar-campos');
const { validateJWT } = require('../middleware/validar-jwt');
const { authLimiter } = require('../middleware/limit-auth');
const passport = require('passport');

const router = Router();

const rules = [
  check('email')
    .isEmail()
    .escape()
    .withMessage('El argumento email es inválido'),
  check('password')
    .notEmpty()
    .escape()
    .withMessage('El argumento password es obligatorio'),
];

const ruleRegister = [
  check('nombre')
    .notEmpty()
    .escape()
    .withMessage('El argumento nombre es obligatorio'),
  check('apellidos')
    .notEmpty()
    .escape()
    .withMessage('El argumento apellidos es obligatorio'),
];

router.post('/login', authLimiter, rules, validate, login);
router.post('/register', authLimiter, rules, ruleRegister, validate, register);
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  googleCallback
);
router.get('/check', validateJWT, checkAuthStatus);
router.post('/logout', logout);

module.exports = router;
