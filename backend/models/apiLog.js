const mongoose = require('mongoose');

const apiLogSchema = new mongoose.Schema(
  {
    metodo: {
      type: String,
      required: true,
    },
    endpoint: {
      type: String,
      required: true,
      index: true,
    },
    statusCode: {
      type: Number,
      required: true,
    },
    responseTime: {
      type: Number,
      required: true,
    },
    ip: String,
    userAgent: String,
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
    },
  },
  { timestamps: true },
);

apiLogSchema.index({ endpoint: 1, createdAt: -1 });
apiLogSchema.index({ statusCode: 1, createdAt: -1 });

module.exports = mongoose.model('ApiLog', apiLogSchema);
