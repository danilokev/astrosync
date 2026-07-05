const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const Usuario = require('../models/usuarios');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const avatarUrl = profile.photos?.[0]?.value ?? null;

        // Busca el usuario por googleId o email
        let user = await Usuario.findOne({
          $or: [{ googleId: profile.id }, { email: profile.emails[0].value }],
        });

        if (user) {
          // Si existe con email pero NO tiene googleId, asociar la cuenta
          if (!user.googleId) {
            user.googleId = profile.id;
          }

          if (avatarUrl) {
            user.avatarUrl = avatarUrl;
          }
          await user.save();

          return cb(null, user);
        }

        // Crea un nuevo usuario OAuth
        const nombre =
          profile.name?.givenName || profile.displayName.split(' ')[0];
        const apellidos =
          profile.name?.familyName ||
          profile.displayName.split(' ').slice(1).join(' ');

        user = new Usuario({
          nombre,
          apellidos,
          email: profile.emails[0].value,
          googleId: profile.id,
          rol: 'ROL_USU',
          ...(avatarUrl ? { avatarUrl } : {}),
        });

        await user.save();
        cb(null, user);
      } catch (error) {
        cb(error, null);
      }
    },
  ),
);

// Serializa sesión
passport.serializeUser((user, cb) => {
  cb(null, user._id);
});

passport.deserializeUser(async (id, cb) => {
  try {
    const user = await Usuario.findById(id);
    cb(null, user);
  } catch (error) {
    cb(error, null);
  }
});

module.exports = passport;
