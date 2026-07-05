// -------------------------------------
// Esquema para la colección de usuarios
// -------------------------------------
const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const UsuarioSchema = new Schema(
  {
    nombre: {
      type: String,
      required: true,
    },
    apellidos: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId; // Solo requerido si NO es OAuth
      },
    },
    googleId: {
      type: String,
      sparse: true,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    cuerposCelestesFav: {
      type: [String],
      default: [],
    },
    lugaresFav: {
      type: [String],
      default: [],
    },
    baneado: {
      type: Boolean,
      default: false,
    },
    rol: {
      type: String,
      required: true,
      default: 'ROL_USU',
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  { collection: 'usuarios' },
);

UsuarioSchema.methods.toJSON = function () {
  const { __v, _id, password, ...object } = this.toObject();
  object.uid = _id;
  return object;
};

module.exports = model('Usuario', UsuarioSchema);
