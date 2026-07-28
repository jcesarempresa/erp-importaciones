const express = require('express');
const cors = require('cors');
const importacionRoutes = require('./routes/importacionRoutes');
const generalRoutes = require('./routes/generalRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/importaciones', importacionRoutes);
app.use('/api', generalRoutes);

// Ruta de salud
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error no manejado en la aplicación:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Error interno del servidor',
      code: err.code || 'INTERNAL_ERROR'
    }
  });
});

module.exports = app;
