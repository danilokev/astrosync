require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('./config/passport');
const connectDB = require('./database/configdb');

const port = process.env.PORT;

const app = express();

// Conexión a la base de datos
connectDB();

// Middlewares
app.set('trust proxy', 1);

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'https://www.astrosync.ovh',
    ],
    credentials: true,
  }),
);
app.use(passport.initialize());
app.use(require('./middleware/api-logger').apiLogger);

// Rutas
app.use('/api/auth', require('./routes/authRouter'));
app.use('/api/weather', require('./routes/weatherRouter'));
app.use('/api/celestial', require('./routes/celestialRouter'));
app.use('/api/dataset', require('./routes/datasetRouter'));
app.use('/api/cuerposCelestes', require('./routes/cuerposCelestesRouter'));
app.use('/api/stars', require('./routes/starRouter'));
app.use('/api/eventos', require('./routes/eventosRouter'));
app.use('/api/localizaciones', require('./routes/localizacionesRouter'));
app.use('/api/users', require('./routes/usuariosRouter'));
app.use('/api/fotos', require('./routes/fotosRouter'));
app.use('/api/favoritos', require('./routes/favoritosRouter'));
app.use('/api/metrics', require('./routes/metricsRouter'));
app.use('/api/constelaciones', require('./routes/constelacionesRouter'));

// Ruta para Dialogflow
app.use('/api/dialogflow', require('./routes/dialogflowRouter'));
//app.use('/api/dialogflow/webhook', require('./routes/dialogflowRouter')); // para borrar cuando se corrige la estructura de /api/dialogflow

// Ruta para servir archivos estáticos (imágenes subidas)
app.use('/uploads', express.static(process.env.UPLOAD_DIR));

// Iniciar el servidor
app.listen(port, '127.0.0.1', () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
