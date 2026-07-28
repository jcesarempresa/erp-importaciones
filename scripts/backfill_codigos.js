require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();
const { db } = require('../src/config/firebase');

async function backfillCodigos() {
  console.log("Iniciando backfill de códigos para Clientes y Proveedores...");

  const configRef = db.collection('configuracion').doc('secuencias');

  // Función para obtener siguiente código
  async function generarCorrelativoTx(tx, tipo) {
    const snap = await tx.get(configRef);
    let secuencias = snap.exists ? snap.data() : {
      cliente: { prefijo: "CLI-", siguiente: 1, longitud: 4 },
      proveedor: { prefijo: "PROV-", siguiente: 1, longitud: 4 },
      cotizacion: { prefijo: "COT-", siguiente: 1, longitud: 4 },
      orden_cliente: { prefijo: "ORC-", siguiente: 1, longitud: 4 },
      pedido_proveedor: { prefijo: "PED-", siguiente: 1, longitud: 4 },
      despacho: { prefijo: "DES-", siguiente: 1, longitud: 4 },
      factura: { prefijo: "FAC-", siguiente: 1, longitud: 4 }
    };

    if (!secuencias[tipo]) {
      secuencias[tipo] = { prefijo: tipo === "cliente" ? "CLI-" : "PROV-", siguiente: 1, longitud: 4 };
    }

    const cfg = secuencias[tipo];
    const formattedId = `${cfg.prefijo}${String(cfg.siguiente).padStart(cfg.longitud, "0")}`;
    secuencias[tipo] = { ...cfg, siguiente: cfg.siguiente + 1 };
    tx.set(configRef, secuencias, { merge: true });
    return formattedId;
  }

  // 1. Clientes
  const clientesSnap = await db.collection('clientes').get();
  for (const docSnap of clientesSnap.docs) {
    const data = docSnap.data();
    if (!data.codigo) {
      console.log(`Asignando código a cliente ${data.nombre}...`);
      await db.runTransaction(async (tx) => {
        const nuevoCodigo = await generarCorrelativoTx(tx, "cliente");
        tx.update(docSnap.ref, { codigo: nuevoCodigo });
      });
    }
  }

  // 2. Proveedores
  const proveedoresSnap = await db.collection('proveedores').get();
  for (const docSnap of proveedoresSnap.docs) {
    const data = docSnap.data();
    if (!data.codigo) {
      console.log(`Asignando código a proveedor ${data.nombre}...`);
      await db.runTransaction(async (tx) => {
        const nuevoCodigo = await generarCorrelativoTx(tx, "proveedor");
        tx.update(docSnap.ref, { codigo: nuevoCodigo });
      });
    }
  }

  console.log("Backfill completado exitosamente.");
  process.exit(0);
}

backfillCodigos().catch(console.error);
