require('dotenv').config();
const { db } = require('../src/config/firebase');
console.log("Intentando consultar Firestore...");
const runQuery = async () => {
  try {
    const q = await db.collection("productos").get();
    
    console.log(`✅ Conexión exitosa! Documentos en productos: ${q.size}`);
    q.forEach(doc => {
      console.log(doc.id, "=>", doc.data());
    });
    process.exit(0);
  } catch (err) {
    console.error("❌ Error al consultar:", err);
    process.exit(1);
  }
};
runQuery();
