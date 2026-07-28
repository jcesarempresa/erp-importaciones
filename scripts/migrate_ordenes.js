require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();
const { db } = require('../src/config/firebase');

async function migrateOrdenes() {
  console.log("Iniciando migración de Órdenes de Clientes y población del Catálogo de Productos...");

  const ordenesSnap = await db.collection('ordenes_cliente').get();
  
  let catalogCount = 0;
  let migratedCount = 0;

  for (const docSnap of ordenesSnap.docs) {
    const data = docSnap.data();
    let needsUpdate = false;
    const items = data.items || [];

    const newItems = [];
    for (const item of items) {
      const newItem = { ...item };
      
      // 1. Migración de proveedores
      if (newItem.proveedorId && !newItem.proveedores) {
        newItem.proveedores = [
          {
            proveedorId: newItem.proveedorId,
            proveedorNombre: newItem.proveedorNombre || "",
            cantidad: newItem.cantidadPedida
          }
        ];
        delete newItem.proveedorId;
        delete newItem.proveedorNombre;
        needsUpdate = true;
      } else if (!newItem.proveedores) {
        newItem.proveedores = [];
        needsUpdate = true;
      }

      // 2. Población del catálogo
      if (newItem.sku && newItem.descripcion) {
        const normalizedSku = newItem.sku.trim().toUpperCase();
        const q = db.collection('productos').where('sku', '==', normalizedSku);
        const prodSnap = await q.get();
        if (prodSnap.empty) {
          await db.collection('productos').add({
            sku: normalizedSku,
            descripcion: newItem.descripcion.trim(),
            createdAt: new Date().toISOString()
          });
          catalogCount++;
          console.log(`+ Producto añadido al catálogo: ${normalizedSku}`);
        }
      }

      newItems.push(newItem);
    }

    if (needsUpdate) {
      await db.runTransaction(async (tx) => {
        tx.update(docSnap.ref, { items: newItems });
      });
      migratedCount++;
      console.log(`Orden ${docSnap.id} migrada exitosamente.`);
    }
  }

  console.log(`Migración completada. Órdenes migradas: ${migratedCount}. Nuevos productos en catálogo: ${catalogCount}.`);
  process.exit(0);
}

migrateOrdenes().catch(console.error);
