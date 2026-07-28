require('dotenv').config();
const { db } = require('../src/config/firebase');

async function deleteJuan() {
  try {
    const snap = await db.collection("responsables").where("nombre", "==", "Juan Perez").get();
    
    if (snap.empty) {
      console.log("Juan Perez no encontrado.");
    } else {
      for (const d of snap.docs) {
        await db.collection("responsables").doc(d.id).delete();
        console.log("Eliminado:", d.id);
      }
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

deleteJuan();
