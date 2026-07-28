const path = require('path');
require('dotenv').config();

// Inicializar Firebase Admin usando la misma lógica que el backend
const { getApps, initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';
const resolvedPath = path.resolve(process.cwd(), serviceAccountPath);

let app;
if (getApps().length === 0) {
  app = initializeApp({
    credential: cert(require(resolvedPath))
  });
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

const COLECIONES_A_LIMPIAR = [
  'clientes',
  'cotizaciones',
  'ordenes_cliente',
  'pedidos_proveedor',
  'despachos',
  'facturas',
  'recepciones_importacion',
  'notas_entrega'
];

async function borrarColeccion(collectionPath, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(db, query, resolve) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    // No hay más documentos para borrar
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  // Continuar recursivamente
  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

async function limpiarBaseDeDatos() {
  console.log('🧹 Iniciando limpieza completa de Firestore...');
  for (const coleccion of COLECIONES_A_LIMPIAR) {
    try {
      console.log(`- Borrando colección: ${coleccion}...`);
      await borrarColeccion(coleccion);
    } catch (err) {
      console.error(`❌ Error al borrar colección ${coleccion}:`, err.message);
    }
  }
  console.log('✅ Base de datos limpia con éxito. Listo para operaciones reales.');
}

limpiarBaseDeDatos()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Fallo al limpiar base de datos:', err);
    process.exit(1);
  });
