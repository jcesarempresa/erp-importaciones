require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor del ERP iniciado en el puerto ${PORT} (Entorno: ${process.env.NODE_ENV || 'development'})`);
});
