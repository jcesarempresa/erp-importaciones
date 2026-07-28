const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Evitar doble inicialización de la app
if (getApps().length === 0) {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  
  if (serviceAccountPath) {
    try {
      const path = require('path');
      const resolvedPath = path.resolve(process.cwd(), serviceAccountPath);
      const serviceAccount = require(resolvedPath);
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log('Firebase Admin SDK inicializado usando archivo de credenciales.');
    } catch (error) {
      console.error('Error cargando el archivo de credenciales de Firebase:', error);
      console.log('Intentando inicialización por defecto (Application Default Credentials)...');
      initializeApp();
    }
  } else {
    initializeApp();
    console.log('Firebase Admin SDK inicializado por defecto (ADC / Entorno Serverless).');
  }
}

const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

// Fachada compatible con la API clásica de Firebase Admin para controladores heredados
const admin = {
  firestore: {
    FieldValue
  }
};

module.exports = {
  admin,
  db
};
