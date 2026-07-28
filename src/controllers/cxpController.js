const { db, admin } = require('../config/firebase');

// Colecciones
const FACTURAS_PROV_COL = 'facturas_proveedor';
const PAGOS_PROV_COL = 'pagos_proveedor';
const PEDIDOS_PROV_COL = 'pedidos_proveedor';

const generarIdFactura = async () => {
  const metaRef = db.collection('metadata').doc('secuencias');
  const metaSnap = await metaRef.get();
  let nextVal = 1;

  if (metaSnap.exists && metaSnap.data().facturaProveedor) {
    nextVal = metaSnap.data().facturaProveedor + 1;
  }

  await metaRef.set({ facturaProveedor: nextVal }, { merge: true });
  return `FPR-${nextVal.toString().padStart(4, '0')}`;
};

const generarIdPago = async () => {
  const metaRef = db.collection('metadata').doc('secuencias');
  const metaSnap = await metaRef.get();
  let nextVal = 1;

  if (metaSnap.exists && metaSnap.data().pagoProveedor) {
    nextVal = metaSnap.data().pagoProveedor + 1;
  }

  await metaRef.set({ pagoProveedor: nextVal }, { merge: true });
  return `PPR-${nextVal.toString().padStart(4, '0')}`;
};

exports.listarFacturasProveedor = async (req, res) => {
  try {
    const { proveedorId } = req.query;
    let ref = db.collection(FACTURAS_PROV_COL).orderBy('createdAt', 'desc');
    
    if (proveedorId) {
      ref = ref.where('proveedorId', '==', proveedorId);
    }
    
    const snapshot = await ref.get();
    const result = [];
    snapshot.forEach(doc => result.push({ id: doc.id, ...doc.data() }));

    res.json(result);
  } catch (error) {
    console.error('Error al listar facturas proveedor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.crearFacturaProveedor = async (req, res) => {
  try {
    const data = req.body;
    
    if (!data.proveedorId || !data.total) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const facturaId = await generarIdFactura();
    
    const nuevaFactura = {
      ...data,
      facturaId,
      estado: 'Pendiente', // Pendiente, Parcial, Pagada, Anulada
      saldoPendiente: Number(data.total),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.collection(FACTURAS_PROV_COL).doc(facturaId).set(nuevaFactura);

    // Actualizar las órdenes de cliente vinculadas si existen
    if (data.ordenesVinculadas && data.ordenesVinculadas.length > 0) {
      const batch = db.batch();
      for (const ordId of data.ordenesVinculadas) {
        const ordRef = db.collection('ordenes_cliente').doc(ordId);
        batch.update(ordRef, { 
          tieneGastosVinculados: true,
          ultimaFacturaProveedorRef: facturaId,
          updatedAt: new Date().toISOString()
        });
      }
      await batch.commit();
    }

    res.json({ id: facturaId, ...nuevaFactura });
  } catch (error) {
    console.error('Error al crear factura proveedor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.listarPagosProveedor = async (req, res) => {
  try {
    const { proveedorId } = req.query;
    let ref = db.collection(PAGOS_PROV_COL).orderBy('createdAt', 'desc');
    
    if (proveedorId) {
      ref = ref.where('proveedorId', '==', proveedorId);
    }

    const snapshot = await ref.get();
    const result = [];
    snapshot.forEach(doc => result.push({ id: doc.id, ...doc.data() }));

    res.json(result);
  } catch (error) {
    console.error('Error al listar pagos proveedor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.registrarPagoProveedor = async (req, res) => {
  try {
    const data = req.body;
    // data.pagosFacturas = [{ facturaId: 'FPR-0001', montoAplicado: 100 }]
    
    if (!data.proveedorId || !data.montoTotal || !data.pagosFacturas) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const pagoId = await generarIdPago();
    
    const nuevoPago = {
      ...data,
      pagoId,
      estado: 'Completado',
      createdAt: new Date().toISOString()
    };

    const batch = db.batch();
    
    // 1. Guardar el pago
    const pagoRef = db.collection(PAGOS_PROV_COL).doc(pagoId);
    batch.set(pagoRef, nuevoPago);

    // 2. Actualizar saldos de las facturas
    for (const pf of data.pagosFacturas) {
      const factRef = db.collection(FACTURAS_PROV_COL).doc(pf.facturaId);
      const factSnap = await factRef.get();
      
      if (factSnap.exists) {
        const fData = factSnap.data();
        const nuevoSaldo = Math.max(0, (fData.saldoPendiente || 0) - pf.montoAplicado);
        
        let nuevoEstado = fData.estado;
        if (nuevoSaldo === 0) nuevoEstado = 'Pagada';
        else if (nuevoSaldo < fData.total) nuevoEstado = 'Parcial';

        batch.update(factRef, {
          saldoPendiente: nuevoSaldo,
          estado: nuevoEstado,
          updatedAt: new Date().toISOString()
        });
      }
    }

    await batch.commit();

    res.json({ id: pagoId, ...nuevoPago });
  } catch (error) {
    console.error('Error al registrar pago proveedor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
