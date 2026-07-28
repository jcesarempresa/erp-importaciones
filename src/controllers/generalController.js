const { db } = require('../config/firebase');

// Datos de fallback en memoria si Firestore no está disponible (ej: sin conexión o fallo de DNS)
const MOCK_STATS = {
  ordenesActivas: 12,
  enImportacion: 3,
  cxcMonto: 24960.00,
  presupuestos: 8
};

const MOCK_CLIENTES = [
  { id: "cliente_mock_1", nombre: "Distribuidora Bejuma C.A.", rif: "J-12345678-9", email: "ventas@bejuma.com", telefono: "0249-1234567", direccion: "Av. Bolívar, local 12" },
  { id: "cliente_mock_2", nombre: "Ferretería La Central", rif: "J-87654321-0", email: "compras@lacentral.com", telefono: "0241-7654321", direccion: "Calle Carabobo #45" }
];

const MOCK_PROVEEDORES = [
  { id: "proveedor_mock_1", nombre: "Guangzhou Pump Corp Ltd", rif: "N-99988877-6", email: "sales@gzpump.com", telefono: "+86-20-12345678", direccion: "Industrial Area, Zone 3, Guangzhou" },
  { id: "proveedor_mock_2", nombre: "Ningbo Fittings Factory", rif: "N-44455566-7", email: "info@nb-fittings.com", telefono: "+86-574-87654321", direccion: "Beilun Port District, Ningbo" }
];

const MOCK_RESPONSABLES = [
  { id: "resp_mock_1", nombre: "Julio Flores", rol: "Administrador", email: "julio@maxicom.com" },
  { id: "resp_mock_2", nombre: "María Delgado", rol: "Operador de Carga", email: "maria@maxicom.com" }
];

const MOCK_COTIZACIONES = [
  {
    id: "cotizacion_mock_1",
    clienteId: "cliente_mock_1",
    clienteNombre: "Distribuidora Bejuma C.A.",
    fecha: "2026-06-25T10:00:00Z",
    estado: "borrador",
    items: [
      { sku: "SKU-BOMB-001", descripcion: "Bomba de Agua 1HP", cantidad: 20, precioUnitario: 120.00 }
    ],
    subtotal: 2400.00,
    impuestos: 384.00,
    total: 2784.00
  }
];

const MOCK_ORDENES = [
  {
    id: "orden_mock_1",
    clienteId: "cliente_mock_1",
    clienteNombre: "Distribuidora Bejuma C.A.",
    fecha: "2026-06-26T08:00:00Z",
    estado: "pendiente",
    items: [
      { sku: "SKU-BOMB-001", descripcion: "Bomba de Agua 1HP", cantidadPedida: 20, cantidadRecibida: 0, cantidadEntregada: 0, precioUnitario: 120.00 }
    ],
    montoTotal: 2784.00
  }
];

const MOCK_PEDIDOS = [
  {
    id: "pedido_mock_1",
    proveedorId: "proveedor_mock_1",
    proveedorNombre: "Guangzhou Pump Corp Ltd",
    fecha: "2026-06-22T08:00:00Z",
    estado: "pendiente",
    items: [
      {
        sku: "SKU-BOMB-001",
        cantidadPedida: 70,
        cantidadRecibida: 30,
        ordenesAsociadas: [
          { ordenClienteId: "orden_mock_1", cantidadPrometida: 20, cantidadRecibida: 0 }
        ]
      }
    ]
  }
];

const MOCK_DESPACHOS = [];
const MOCK_FACTURAS = [];

// Secuencias por defecto en memoria
const MOCK_SECUENCIAS = {
  cotizacion: { prefijo: "COT-", siguiente: 1, longitud: 4 },
  orden_cliente: { prefijo: "ORC-", siguiente: 1, longitud: 4 },
  pedido_proveedor: { prefijo: "PED-", siguiente: 1, longitud: 4 },
  despacho: { prefijo: "DES-", siguiente: 1, longitud: 4 },
  factura: { prefijo: "FAC-", siguiente: 1, longitud: 4 }
};

// Generador de correlativo en Firestore
async function generarSiguienteCorrelativo(tipo) {
  try {
    const configRef = db.collection('configuracion').doc('secuencias');
    let formattedId = null;
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(configRef);
      let secuencias = {};
      if (doc.exists) {
        secuencias = doc.data();
      } else {
        // Inicializar si no existe
        secuencias = JSON.parse(JSON.stringify(MOCK_SECUENCIAS));
      }
      
      const config = secuencias[tipo] || MOCK_SECUENCIAS[tipo];
      const numStr = String(config.siguiente).padStart(config.longitud, '0');
      formattedId = `${config.prefijo}${numStr}`;
      
      config.siguiente += 1;
      secuencias[tipo] = config;
      transaction.set(configRef, secuencias);
    });
    return formattedId;
  } catch (error) {
    console.warn(`[!] Fallback a memoria para correlativo ${tipo}:`, error.message);
    return generarSiguienteCorrelativoMemoria(tipo);
  }
}

// Generador de correlativo en memoria (modo offline)
function generarSiguienteCorrelativoMemoria(tipo) {
  const config = MOCK_SECUENCIAS[tipo];
  const numStr = String(config.siguiente).padStart(config.longitud, '0');
  const formattedId = `${config.prefijo}${numStr}`;
  config.siguiente += 1;
  return formattedId;
}


// Helper para detectar errores de conexión a Firestore y aplicar el fallback
function manejarErrorFirestore(error, fallbackData, contexto) {
  console.warn(`[!] Firestore Desconectado u Offline (${contexto}):`, error.message || error);
  console.log(`[i] Aplicando datos fallback en memoria para ${contexto}.`);
  return fallbackData;
}

/**
 * Retorna las métricas agregadas en tiempo real de Firestore para el Dashboard.
 */
async function obtenerStats(req, res, next) {
  try {
    const ordenesSnapshot = await db.collection('ordenes_cliente')
      .where('estado', 'in', ['pendiente', 'parcial'])
      .get();
    const ordenesActivas = ordenesSnapshot.size;

    const pedidosSnapshot = await db.collection('pedidos_proveedor')
      .where('estado', 'in', ['pendiente', 'en_transito', 'parcial'])
      .get();
    const enImportacion = pedidosSnapshot.size;

    const facturasSnapshot = await db.collection('facturas').get();
    let cxcMonto = 0;
    facturasSnapshot.forEach(doc => {
      const data = doc.data();
      cxcMonto += data.saldoPendiente || 0;
    });

    const cotizacionesSnapshot = await db.collection('cotizaciones').get();
    const presupuestos = cotizacionesSnapshot.size;

    return res.status(200).json({
      success: true,
      stats: { ordenesActivas, enImportacion, cxcMonto, presupuestos }
    });
  } catch (error) {
    const fallback = manejarErrorFirestore(error, MOCK_STATS, 'Métricas Dashboard');
    return res.status(200).json({ success: true, stats: fallback, offline: true });
  }
}

// -----------------------------------------------------------------------------
// Clientes & Proveedores CRUD
// -----------------------------------------------------------------------------

async function listarClientes(req, res, next) {
  try {
    const snapshot = await db.collection('clientes').orderBy('nombre', 'asc').get();
    const clientes = [];
    snapshot.forEach(doc => {
      clientes.push({ id: doc.id, ...doc.data() });
    });
    return res.status(200).json({ success: true, data: clientes });
  } catch (error) {
    const fallback = manejarErrorFirestore(error, MOCK_CLIENTES, 'Clientes');
    return res.status(200).json({ success: true, data: fallback, offline: true });
  }
}

async function crearCliente(req, res, next) {
  try {
    const { nombre, rif, email, telefono, direccion } = req.body;
    const nuevo = { nombre, rif, email, telefono, direccion, createdAt: new Date().toISOString() };
    const docRef = await db.collection('clientes').add(nuevo);
    return res.status(201).json({ success: true, data: { id: docRef.id, ...nuevo } });
  } catch (error) {
    const mockId = `cliente_mock_${Date.now()}`;
    const nuevoMock = { id: mockId, ...req.body, createdAt: new Date().toISOString() };
    MOCK_CLIENTES.push(nuevoMock);
    return res.status(201).json({ success: true, data: nuevoMock, offline: true });
  }
}

async function listarProveedores(req, res, next) {
  try {
    const snapshot = await db.collection('proveedores').orderBy('nombre', 'asc').get();
    const proveedores = [];
    snapshot.forEach(doc => {
      proveedores.push({ id: doc.id, ...doc.data() });
    });
    return res.status(200).json({ success: true, data: proveedores });
  } catch (error) {
    const fallback = manejarErrorFirestore(error, MOCK_PROVEEDORES, 'Proveedores');
    return res.status(200).json({ success: true, data: fallback, offline: true });
  }
}

async function crearProveedor(req, res, next) {
  try {
    const { nombre, rif, email, telefono, direccion } = req.body;
    const nuevo = { nombre, rif, email, telefono, direccion, createdAt: new Date().toISOString() };
    const docRef = await db.collection('proveedores').add(nuevo);
    return res.status(201).json({ success: true, data: { id: docRef.id, ...nuevo } });
  } catch (error) {
    const mockId = `proveedor_mock_${Date.now()}`;
    const nuevoMock = { id: mockId, ...req.body, createdAt: new Date().toISOString() };
    MOCK_PROVEEDORES.push(nuevoMock);
    return res.status(201).json({ success: true, data: nuevoMock, offline: true });
  }
}

// -----------------------------------------------------------------------------
// Responsables CRUD
// -----------------------------------------------------------------------------

async function listarResponsables(req, res, next) {
  try {
    const snapshot = await db.collection('responsables').orderBy('nombre', 'asc').get();
    const responsables = [];
    snapshot.forEach(doc => {
      responsables.push({ id: doc.id, ...doc.data() });
    });
    return res.status(200).json({ success: true, data: responsables });
  } catch (error) {
    const fallback = manejarErrorFirestore(error, MOCK_RESPONSABLES, 'Responsables');
    return res.status(200).json({ success: true, data: fallback, offline: true });
  }
}

async function crearResponsable(req, res, next) {
  try {
    const { nombre, rol, email } = req.body;
    const nuevo = { nombre, rol, email, createdAt: new Date().toISOString() };
    const docRef = await db.collection('responsables').add(nuevo);
    return res.status(201).json({ success: true, data: { id: docRef.id, ...nuevo } });
  } catch (error) {
    const mockId = `resp_mock_${Date.now()}`;
    const nuevoMock = { id: mockId, ...req.body, createdAt: new Date().toISOString() };
    MOCK_RESPONSABLES.push(nuevoMock);
    return res.status(201).json({ success: true, data: nuevoMock, offline: true });
  }
}

// -----------------------------------------------------------------------------
// Importaciones en Lote (Batch Import)
// -----------------------------------------------------------------------------

async function importarClientes(req, res, next) {
  try {
    const { items } = req.body; // Array de clientes
    if (!Array.isArray(items)) throw new Error('El formato debe ser un array.');
    const batch = db.batch();
    const creados = [];
    items.forEach(c => {
      const ref = db.collection('clientes').doc();
      const docData = {
        nombre: c.nombre,
        rif: c.rif || '',
        email: c.email || '',
        telefono: c.telefono || '',
        direccion: c.direccion || '',
        createdAt: new Date().toISOString()
      };
      batch.set(ref, docData);
      creados.push({ id: ref.id, ...docData });
    });
    await batch.commit();
    return res.status(200).json({ success: true, message: `Importados ${items.length} clientes con éxito.` });
  } catch (error) {
    console.warn('[!] Error de Firestore en importación de clientes, usando memoria.');
    (req.body.items || []).forEach(c => {
      MOCK_CLIENTES.push({ id: `cliente_mock_${Math.random()}`, ...c });
    });
    return res.status(200).json({ success: true, message: 'Clientes cargados en memoria.', offline: true });
  }
}

async function importarProveedores(req, res, next) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) throw new Error('El formato debe ser un array.');
    const batch = db.batch();
    items.forEach(p => {
      const ref = db.collection('proveedores').doc();
      batch.set(ref, {
        nombre: p.nombre,
        rif: p.rif || '',
        email: p.email || '',
        telefono: p.telefono || '',
        direccion: p.direccion || '',
        createdAt: new Date().toISOString()
      });
    });
    await batch.commit();
    return res.status(200).json({ success: true, message: `Importados ${items.length} proveedores.` });
  } catch (error) {
    console.warn('[!] Error de Firestore en importación de proveedores, usando memoria.');
    (req.body.items || []).forEach(p => {
      MOCK_PROVEEDORES.push({ id: `proveedor_mock_${Math.random()}`, ...p });
    });
    return res.status(200).json({ success: true, message: 'Proveedores cargados en memoria.', offline: true });
  }
}

async function importarCotizaciones(req, res, next) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) throw new Error('El formato debe ser un array.');
    const batch = db.batch();
    items.forEach(c => {
      const ref = db.collection('cotizaciones').doc();
      batch.set(ref, {
        clienteId: c.clienteId || 'cliente_mock_1',
        clienteNombre: c.clienteNombre,
        fecha: c.fecha || new Date().toISOString(),
        estado: c.estado || 'borrador',
        items: c.items || [],
        subtotal: parseFloat(c.subtotal) || 0,
        impuestos: parseFloat(c.impuestos) || 0,
        total: parseFloat(c.total) || 0,
        createdAt: new Date().toISOString()
      });
    });
    await batch.commit();
    return res.status(200).json({ success: true, message: `Importadas ${items.length} cotizaciones.` });
  } catch (error) {
    console.warn('[!] Error de Firestore en importación de cotizaciones, usando memoria.');
    (req.body.items || []).forEach(c => {
      MOCK_COTIZACIONES.push({ id: `cotizacion_mock_${Math.random()}`, ...c });
    });
    return res.status(200).json({ success: true, message: 'Cotizaciones cargadas en memoria.', offline: true });
  }
}

async function importarOrdenesCliente(req, res, next) {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) throw new Error('El formato debe ser un array.');
    const batch = db.batch();
    items.forEach(o => {
      const ref = db.collection('ordenes_cliente').doc();
      batch.set(ref, {
        clienteId: o.clienteId || 'cliente_mock_1',
        clienteNombre: o.clienteNombre,
        fecha: o.fecha || new Date().toISOString(),
        estado: o.estado || 'pendiente',
        items: (o.items || []).map(item => ({
          sku: item.sku,
          descripcion: item.descripcion || '',
          cantidadPedida: parseInt(item.cantidadPedida) || 0,
          cantidadRecibida: parseInt(item.cantidadRecibida) || 0,
          cantidadEntregada: parseInt(item.cantidadEntregada) || 0,
          precioUnitario: parseFloat(item.precioUnitario) || 0
        })),
        montoTotal: parseFloat(o.montoTotal) || 0,
        createdAt: new Date().toISOString()
      });
    });
    await batch.commit();
    return res.status(200).json({ success: true, message: `Importadas ${items.length} órdenes.` });
  } catch (error) {
    console.warn('[!] Error de Firestore en importación de órdenes, usando memoria.');
    (req.body.items || []).forEach(o => {
      MOCK_ORDENES.push({ id: `orden_mock_${Math.random()}`, ...o });
    });
    return res.status(200).json({ success: true, message: 'Órdenes cargadas en memoria.', offline: true });
  }
}

// -----------------------------------------------------------------------------
// Cotizaciones
// -----------------------------------------------------------------------------

async function listarCotizaciones(req, res, next) {
  try {
    const snapshot = await db.collection('cotizaciones').orderBy('fecha', 'desc').get();
    const cotizaciones = [];
    snapshot.forEach(doc => {
      cotizaciones.push({ id: doc.id, ...doc.data() });
    });
    return res.status(200).json({ success: true, data: cotizaciones });
  } catch (error) {
    const fallback = manejarErrorFirestore(error, MOCK_COTIZACIONES, 'Cotizaciones');
    return res.status(200).json({ success: true, data: fallback, offline: true });
  }
}

async function crearCotizacion(req, res, next) {
  try {
    const { clienteId, clienteNombre, items, fecha, responsableId, responsableNombre, flete, arancel, otrosGastos } = req.body;
    
    if (!clienteNombre || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: { message: 'Datos de cotización inválidos.', code: 'INVALID_INPUT' } });
    }

    let subtotal = 0;
    items.forEach(item => {
      subtotal += (item.cantidad || 0) * (item.precioUnitario || 0);
    });
    const impuestos = subtotal * 0.16;
    const total = subtotal + impuestos + (Number(flete) || 0) + (Number(arancel) || 0) + (Number(otrosGastos) || 0);

    const correlativo = await generarSiguienteCorrelativo('cotizacion');
    const nuevaCotizacion = {
      clienteId: clienteId || 'cliente_mock_1',
      clienteNombre,
      fecha: fecha || new Date().toISOString(),
      estado: 'borrador',
      items,
      subtotal,
      impuestos,
      flete: Number(flete) || 0,
      arancel: Number(arancel) || 0,
      otrosGastos: Number(otrosGastos) || 0,
      total,
      responsableId: responsableId || null,
      responsableNombre: responsableNombre || null,
      createdAt: new Date().toISOString()
    };

    await db.collection('cotizaciones').doc(correlativo).set(nuevaCotizacion);
    return res.status(201).json({ success: true, id: correlativo, data: { id: correlativo, ...nuevaCotizacion } });
  } catch (error) {
    console.warn('[!] Guardando cotización en memoria debido a modo offline:', error.message);
    const mockId = generarSiguienteCorrelativoMemoria('cotizacion');
    const mockData = { id: mockId, clienteId: req.body.clienteId || 'cliente_mock_1', clienteNombre: req.body.clienteNombre, fecha: req.body.fecha || new Date().toISOString(), estado: 'borrador', items: req.body.items, flete: Number(req.body.flete) || 0, arancel: Number(req.body.arancel) || 0, otrosGastos: Number(req.body.otrosGastos) || 0, total: 1000.00, responsableId: req.body.responsableId || null, responsableNombre: req.body.responsableNombre || null };
    MOCK_COTIZACIONES.unshift(mockData);
    return res.status(201).json({ success: true, id: mockId, data: mockData, offline: true });
  }
}

async function aprobarCotizacion(req, res, next) {
  try {
    const { id } = req.params;
    const cotizacionRef = db.collection('cotizaciones').doc(id);
    const cotizacionDoc = await cotizacionRef.get();

    if (!cotizacionDoc.exists) {
      return res.status(404).json({ error: { message: 'Cotización no encontrada.', code: 'NOT_FOUND' } });
    }

    const cotData = cotizacionDoc.data();
    const batch = db.batch();
    batch.update(cotizacionRef, { estado: 'aprobado' });

    const ordenRef = db.collection('ordenes_cliente').doc();
    const ordenData = {
      cotizacionId: id,
      clienteId: cotData.clienteId,
      clienteNombre: cotData.clienteNombre,
      fecha: new Date().toISOString(),
      estado: 'pendiente',
      items: cotData.items.map(item => ({
        sku: item.sku,
        descripcion: item.descripcion,
        cantidadPedida: item.cantidad,
        cantidadRecibida: 0,
        cantidadEntregada: 0,
        precioUnitario: item.precioUnitario
      })),
      montoTotal: cotData.total,
      createdAt: new Date().toISOString()
    };
    batch.set(ordenRef, ordenData);

    await batch.commit();
    return res.status(200).json({ success: true, message: 'Cotización aprobada y convertida en orden de compra.' });
  } catch (error) {
    const { id } = req.params;
    console.warn(`[!] Aprobando cotización ${id} en memoria debido a modo offline.`);
    const cot = MOCK_COTIZACIONES.find(c => c.id === id);
    if (cot) {
      cot.estado = 'aprobado';
      const mockOrden = {
        id: `orden_mock_${Date.now()}`,
        clienteId: cot.clienteId,
        clienteNombre: cot.clienteNombre,
        fecha: new Date().toISOString(),
        estado: 'pendiente',
        items: cot.items.map(item => ({
          sku: item.sku,
          descripcion: item.descripcion,
          cantidadPedida: item.cantidad,
          cantidadRecibida: 0,
          cantidadEntregada: 0,
          precioUnitario: item.precioUnitario
        })),
        montoTotal: cot.total
      };
      MOCK_ORDENES.unshift(mockOrden);
      return res.status(200).json({ success: true, message: 'Cotización aprobada en memoria.', offline: true });
    }
    return res.status(404).json({ error: { message: 'Cotización no encontrada en memoria.', code: 'NOT_FOUND' } });
  }
}

// -----------------------------------------------------------------------------
// Órdenes de Clientes
// -----------------------------------------------------------------------------

async function listarOrdenesCliente(req, res, next) {
  try {
    const snapshot = await db.collection('ordenes_cliente').orderBy('fecha', 'desc').get();
    const ordenes = [];
    snapshot.forEach(doc => {
      ordenes.push({ id: doc.id, ...doc.data() });
    });
    return res.status(200).json({ success: true, data: ordenes });
  } catch (error) {
    const fallback = manejarErrorFirestore(error, MOCK_ORDENES, 'Órdenes de Clientes');
    return res.status(200).json({ success: true, data: fallback, offline: true });
  }
}

async function crearOrdenCliente(req, res, next) {
  try {
    const { clienteId, clienteNombre, items, fecha, responsableId, responsableNombre } = req.body;
    
    if (!clienteNombre || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: { message: 'Datos de orden inválidos.', code: 'INVALID_INPUT' } });
    }

    let subtotal = 0;
    items.forEach(item => {
      subtotal += (item.cantidadPedida || 0) * (item.precioUnitario || 0);
    });
    const total = subtotal * 1.16;

    const correlativo = await generarSiguienteCorrelativo('orden_cliente');
    const nuevaOrden = {
      clienteId: clienteId || 'cliente_mock_1',
      clienteNombre,
      fecha: fecha || new Date().toISOString(),
      estado: 'pendiente',
      items: items.map(item => ({
        sku: item.sku,
        descripcion: item.descripcion || '',
        cantidadPedida: item.cantidadPedida,
        cantidadRecibida: 0,
        cantidadEntregada: 0,
        precioUnitario: item.precioUnitario
      })),
      montoTotal: total,
      responsableId: responsableId || null,
      responsableNombre: responsableNombre || null,
      createdAt: new Date().toISOString()
    };

    await db.collection('ordenes_cliente').doc(correlativo).set(nuevaOrden);
    return res.status(201).json({ success: true, id: correlativo, data: { id: correlativo, ...nuevaOrden } });
  } catch (error) {
    console.warn('[!] Creando orden de cliente en memoria debido a modo offline:', error.message);
    const mockId = generarSiguienteCorrelativoMemoria('orden_cliente');
    const mockData = { id: mockId, clienteId: req.body.clienteId || 'cliente_mock_1', clienteNombre: req.body.clienteNombre, fecha: req.body.fecha || new Date().toISOString(), estado: 'pendiente', items: req.body.items, montoTotal: 1000.00, responsableId: req.body.responsableId || null, responsableNombre: req.body.responsableNombre || null };
    MOCK_ORDENES.unshift(mockData);
    return res.status(201).json({ success: true, id: mockId, data: mockData, offline: true });
  }
}

// -----------------------------------------------------------------------------
// Pedidos a Proveedores
// -----------------------------------------------------------------------------

async function listarPedidosProveedor(req, res, next) {
  try {
    const snapshot = await db.collection('pedidos_proveedor').orderBy('fecha', 'desc').get();
    const pedidos = [];
    snapshot.forEach(doc => {
      pedidos.push({ id: doc.id, ...doc.data() });
    });
    return res.status(200).json({ success: true, data: pedidos });
  } catch (error) {
    const fallback = manejarErrorFirestore(error, MOCK_PEDIDOS, 'Pedidos Proveedor');
    return res.status(200).json({ success: true, data: fallback, offline: true });
  }
}

async function crearPedidoProveedor(req, res, next) {
  try {
    const { proveedorId, proveedorNombre, items, fecha, responsableId, responsableNombre } = req.body;

    if (!proveedorNombre || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: { message: 'Datos de pedido inválidos.', code: 'INVALID_INPUT' } });
    }

    const correlativo = await generarSiguienteCorrelativo('pedido_proveedor');
    const nuevoPedido = {
      proveedorId: proveedorId || 'proveedor_mock_1',
      proveedorNombre,
      fecha: fecha || new Date().toISOString(),
      estado: 'pendiente',
      items: items.map(item => ({
        sku: item.sku,
        cantidadPedida: item.cantidadPedida,
        cantidadRecibida: 0,
        ordenesAsociadas: []
      })),
      responsableId: responsableId || null,
      responsableNombre: responsableNombre || null,
      createdAt: new Date().toISOString()
    };

    await db.collection('pedidos_proveedor').doc(correlativo).set(nuevoPedido);
    return res.status(201).json({ success: true, id: correlativo, data: { id: correlativo, ...nuevoPedido } });
  } catch (error) {
    console.warn('[!] Creando pedido proveedor en memoria debido a modo offline:', error.message);
    const mockId = generarSiguienteCorrelativoMemoria('pedido_proveedor');
    const mockData = { id: mockId, proveedorId: req.body.proveedorId || 'proveedor_mock_1', proveedorNombre: req.body.proveedorNombre, fecha: req.body.fecha || new Date().toISOString(), estado: 'pendiente', items: req.body.items, responsableId: req.body.responsableId || null, responsableNombre: req.body.responsableNombre || null };
    MOCK_PEDIDOS.unshift(mockData);
    return res.status(201).json({ success: true, id: mockId, data: mockData, offline: true });
  }
}

async function formalizarPedidoProveedor(req, res, next) {
  try {
    const { id } = req.params;
    await db.collection('pedidos_proveedor').doc(id).update({
      estado: 'formalizado',
      updatedAt: new Date().toISOString()
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error al formalizar pedido proveedor:', error);
    const ped = MOCK_PEDIDOS.find(p => p.id === req.params.id);
    if (ped) {
      ped.estado = 'formalizado';
    }
    return res.status(200).json({ success: true, offline: true });
  }
}

// -----------------------------------------------------------------------------
// Despachos & Notas de Entrega
// -----------------------------------------------------------------------------

async function listarDespachos(req, res, next) {
  try {
    const snapshot = await db.collection('notas_entrega').orderBy('fecha', 'desc').get();
    const despachos = [];
    snapshot.forEach(doc => {
      despachos.push({ id: doc.id, ...doc.data() });
    });
    return res.status(200).json({ success: true, data: despachos });
  } catch (error) {
    const fallback = manejarErrorFirestore(error, MOCK_DESPACHOS, 'Despachos');
    return res.status(200).json({ success: true, data: fallback, offline: true });
  }
}

async function crearDespacho(req, res, next) {
  try {
    const { ordenClienteId, itemsDespachados } = req.body;

    const orderRef = db.collection('ordenes_cliente').doc(ordenClienteId);
    let despachoId = null;
    let despachoData = null;

    await db.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) throw new Error('No existe la orden.');

      const orderData = orderDoc.data();
      const updatedItems = [...orderData.items];

      itemsDespachados.forEach(dItem => {
        const item = updatedItems.find(i => i.sku === dItem.sku);
        if (item) {
          item.cantidadEntregada = (item.cantidadEntregada || 0) + dItem.cantidadDespachada;
        }
      });

      const configRef = db.collection('configuracion').doc('secuencias');
      const configDoc = await transaction.get(configRef);
      let secuencias = {};
      if (configDoc.exists) {
        secuencias = configDoc.data();
      } else {
        secuencias = JSON.parse(JSON.stringify(MOCK_SECUENCIAS));
      }

      // Generar correlativo despacho
      const cDespacho = secuencias.despacho || MOCK_SECUENCIAS.despacho;
      const numStrDespacho = String(cDespacho.siguiente).padStart(cDespacho.longitud, '0');
      despachoId = `${cDespacho.prefijo}${numStrDespacho}`;
      cDespacho.siguiente += 1;
      secuencias.despacho = cDespacho;

      transaction.set(configRef, secuencias);

      const notaRef = db.collection('notas_entrega').doc(despachoId);
      const subtotalNota = itemsDespachados.reduce((sum, dItem) => {
        const oItem = orderData.items.find(i => i.sku === dItem.sku);
        return sum + (dItem.cantidadDespachada * (oItem ? oItem.precioUnitario : 0));
      }, 0);

      despachoData = {
        clienteId: orderData.clienteId,
        clienteNombre: orderData.clienteNombre,
        ordenClienteId,
        fecha: new Date().toISOString(),
        estado: 'pendiente_facturacion',
        items: itemsDespachados,
        subtotal: subtotalNota,
        impuestos: subtotalNota * 0.16,
        total: subtotalNota * 1.16,
        createdAt: new Date().toISOString()
      };

      transaction.set(notaRef, despachoData);
      transaction.set(orderRef, { ...orderData, items: updatedItems });
    });

    return res.status(201).json({ success: true, id: despachoId, data: despachoData });
  } catch (error) {
    console.warn('[!] Registrando despacho en memoria debido a modo offline:', error.message);
    const { ordenClienteId, itemsDespachados } = req.body;
    const ord = MOCK_ORDENES.find(o => o.id === ordenClienteId);
    if (ord) {
      itemsDespachados.forEach(dItem => {
        const item = ord.items.find(i => i.sku === dItem.sku);
        if (item) {
          item.cantidadEntregada = (item.cantidadEntregada || 0) + dItem.cantidadDespachada;
        }
      });
      const mockDespachoId = generarSiguienteCorrelativoMemoria('despacho');
      const mockDespacho = {
        id: mockDespachoId,
        clienteId: ord.clienteId,
        clienteNombre: ord.clienteNombre,
        ordenClienteId,
        fecha: new Date().toISOString(),
        estado: "pendiente_facturacion",
        items: itemsDespachados,
        total: 500
      };
      MOCK_DESPACHOS.unshift(mockDespacho);
      return res.status(201).json({ success: true, id: mockDespachoId, data: mockDespacho, offline: true });
    }
    return res.status(400).json({ error: { message: 'Error procesando despacho offline.' } });
  }
}

async function anularDespacho(req, res, next) {
  try {
    const { id } = req.params;
    const despachoRef = db.collection('notas_entrega').doc(id);

    await db.runTransaction(async (transaction) => {
      const despachoDoc = await transaction.get(despachoRef);
      if (!despachoDoc.exists) throw new Error('Despacho no encontrado.');

      const despacho = despachoDoc.data();
      if (despacho.estado === 'anulado') return;
      if (despacho.estado === 'facturado') {
        throw new Error('No se puede anular un despacho facturado. Primero anule la factura correspondiente.');
      }

      // Revertir en la orden
      const ordenRef = db.collection('ordenes_cliente').doc(despacho.ordenClienteId);
      const ordenDoc = await transaction.get(ordenRef);
      if (ordenDoc.exists) {
        const ordenData = ordenDoc.data();
        const updatedItems = ordenData.items.map(item => {
          const dItem = despacho.items.find(di => di.sku === item.sku);
          if (dItem) {
            return {
              ...item,
              cantidadEntregada: Math.max(0, (item.cantidadEntregada || 0) - dItem.cantidadDespachada)
            };
          }
          return item;
        });
        transaction.update(ordenRef, { items: updatedItems, updatedAt: new Date().toISOString() });
      }

      transaction.update(despachoRef, { estado: 'anulado', updatedAt: new Date().toISOString() });
    });

    return res.status(200).json({ success: true, message: 'Despacho anulado correctamente.' });
  } catch (error) {
    console.warn('[!] Anulando despacho en memoria debido a modo offline:', error.message);
    const { id } = req.params;
    const des = MOCK_DESPACHOS.find(d => d.id === id);
    if (des) {
      if (des.estado === 'facturado') {
        return res.status(400).json({ error: { message: 'No se puede anular un despacho facturado offline.' } });
      }
      des.estado = 'anulado';
      const ord = MOCK_ORDENES.find(o => o.id === des.ordenClienteId);
      if (ord) {
        des.items.forEach(dItem => {
          const item = ord.items.find(i => i.sku === dItem.sku);
          if (item) {
            item.cantidadEntregada = Math.max(0, (item.cantidadEntregada || 0) - dItem.cantidadDespachada);
          }
        });
      }
      return res.status(200).json({ success: true, message: 'Despacho anulado en memoria.', offline: true });
    }
    return res.status(404).json({ error: { message: 'Despacho no encontrado.', code: 'NOT_FOUND' } });
  }
}

async function anularFactura(req, res, next) {
  try {
    const { id } = req.params;
    const facturaRef = db.collection('facturas').doc(id);

    await db.runTransaction(async (transaction) => {
      const facturaDoc = await transaction.get(facturaRef);
      if (!facturaDoc.exists) throw new Error('Factura no encontrada.');

      const factura = facturaDoc.data();
      if (factura.estado === 'anulada') return;
      if (factura.saldoPendiente < factura.totalFactura) {
        throw new Error('No se puede anular una factura con abonos registrados. Reversa primero los cobros.');
      }

      // Regresar despachos vinculados a pendiente_facturacion
      if (Array.isArray(factura.notasEntregaIds)) {
        for (const desId of factura.notasEntregaIds) {
          const desRef = db.collection('notas_entrega').doc(desId);
          const desDoc = await transaction.get(desRef);
          if (desDoc.exists) {
            transaction.update(desRef, { estado: 'pendiente_facturacion', updatedAt: new Date().toISOString() });
          }
        }
      }

      transaction.update(facturaRef, { estado: 'anulada', saldoPendiente: 0, updatedAt: new Date().toISOString() });
    });

    return res.status(200).json({ success: true, message: 'Factura anulada correctamente.' });
  } catch (error) {
    console.warn('[!] Anulando factura en memoria debido a modo offline:', error.message);
    const { id } = req.params;
    const fac = MOCK_FACTURAS.find(f => f.id === id);
    if (fac) {
      if (fac.saldoPendiente < fac.totalFactura) {
        return res.status(400).json({ error: { message: 'No se puede anular una factura con pagos registrados offline.' } });
      }
      fac.estado = 'anulada';
      fac.saldoPendiente = 0;
      if (Array.isArray(fac.notasEntregaIds)) {
        fac.notasEntregaIds.forEach(desId => {
          const des = MOCK_DESPACHOS.find(d => d.id === desId);
          if (des) des.estado = 'pendiente_facturacion';
        });
      }
      return res.status(200).json({ success: true, message: 'Factura anulada en memoria.', offline: true });
    }
    return res.status(404).json({ error: { message: 'Factura no encontrada.', code: 'NOT_FOUND' } });
  }
}

async function crearFacturaDesdeDespachos(req, res, next) {
  try {
    const { despachoIds } = req.body;
    if (!despachoIds || !Array.isArray(despachoIds) || despachoIds.length === 0) {
      return res.status(400).json({ error: { message: 'Debe proporcionar al menos un ID de despacho.' } });
    }

    let facturaId = null;
    let facturaData = null;

    await db.runTransaction(async (transaction) => {
      const ivaRef = db.collection('configuracion').doc('iva');
      const ivaDoc = await transaction.get(ivaRef);
      const ivaConfig = ivaDoc.exists ? ivaDoc.data() : { sigla: 'IVA', porcentaje: 16, activo: true };

      let clienteId = "";
      let clienteNombre = "";
      let subtotalConsolidado = 0;

      for (const desId of despachoIds) {
        const desRef = db.collection('notas_entrega').doc(desId);
        const desDoc = await transaction.get(desRef);
        if (!desDoc.exists) throw new Error(`El despacho ${desId} no existe.`);

        const des = desDoc.data();
        if (des.estado !== 'pendiente_facturacion') {
          throw new Error(`El despacho ${desId} no está pendiente de facturación.`);
        }

        if (!clienteId) {
          clienteId = des.clienteId;
          clienteNombre = des.clienteNombre;
        } else if (clienteId !== des.clienteId) {
          throw new Error('Todos los despachos deben ser del mismo cliente.');
        }

        subtotalConsolidado += des.total || 0;
        transaction.update(desRef, { estado: 'facturado', updatedAt: new Date().toISOString() });
      }

      // Generar correlativo factura
      const configRef = db.collection('configuracion').doc('secuencias');
      const configDoc = await transaction.get(configRef);
      let secuencias = {};
      if (configDoc.exists) {
        secuencias = configDoc.data();
      } else {
        secuencias = JSON.parse(JSON.stringify(MOCK_SECUENCIAS));
      }

      const cFactura = secuencias.factura || MOCK_SECUENCIAS.factura;
      const numStrFactura = String(cFactura.siguiente).padStart(cFactura.longitud, '0');
      facturaId = `${cFactura.prefijo}${numStrFactura}`;
      cFactura.siguiente += 1;
      secuencias.factura = cFactura;

      transaction.set(configRef, secuencias);

      const porcentajeIVA = ivaConfig.activo ? (ivaConfig.porcentaje / 100) : 0;
      const impuestos = subtotalConsolidado * porcentajeIVA;
      const totalFactura = subtotalConsolidado + impuestos;

      facturaData = {
        clienteId,
        clienteNombre,
        fecha: new Date().toISOString(),
        notasEntregaIds: despachoIds,
        subtotal: subtotalConsolidado,
        impuestos,
        totalFactura,
        saldoPendiente: totalFactura,
        estado: 'pendiente',
        createdAt: new Date().toISOString()
      };

      const facturaRef = db.collection('facturas').doc(facturaId);
      transaction.set(facturaRef, facturaData);
    });

    return res.status(201).json({ success: true, id: facturaId, data: facturaData });
  } catch (error) {
    console.warn('[!] Crear factura desde despachos en memoria debido a modo offline:', error.message);
    const { despachoIds } = req.body;
    let subtotalConsolidado = 0;
    let clienteId = "";
    let clienteNombre = "";

    for (const desId of despachoIds) {
      const des = MOCK_DESPACHOS.find(d => d.id === desId);
      if (des) {
        if (des.estado !== 'pendiente_facturacion') {
          return res.status(400).json({ error: { message: `Despacho ${desId} ya facturado offline.` } });
        }
        if (!clienteId) {
          clienteId = des.clienteId;
          clienteNombre = des.clienteNombre;
        } else if (clienteId !== des.clienteId) {
          return res.status(400).json({ error: { message: 'Clientes no coinciden offline.' } });
        }
        subtotalConsolidado += des.total || 0;
        des.estado = 'facturado';
      }
    }

    const mockFacturaId = generarSiguienteCorrelativoMemoria('factura');
    const mockFactura = {
      id: mockFacturaId,
      clienteId,
      clienteNombre,
      fecha: new Date().toISOString(),
      notasEntregaIds: despachoIds,
      subtotal: subtotalConsolidado,
      impuestos: subtotalConsolidado * 0.16,
      totalFactura: subtotalConsolidado * 1.16,
      saldoPendiente: subtotalConsolidado * 1.16,
      estado: "pendiente"
    };
    MOCK_FACTURAS.unshift(mockFactura);

    return res.status(201).json({ success: true, id: mockFacturaId, data: mockFactura, offline: true });
  }
}

// -----------------------------------------------------------------------------
// Facturación & CxC
// -----------------------------------------------------------------------------

async function listarFacturas(req, res, next) {
  try {
    const snapshot = await db.collection('facturas').orderBy('fecha', 'desc').get();
    const facturas = [];
    snapshot.forEach(doc => {
      facturas.push({ id: doc.id, ...doc.data() });
    });
    return res.status(200).json({ success: true, data: facturas });
  } catch (error) {
    const fallback = manejarErrorFirestore(error, MOCK_FACTURAS, 'Facturas');
    return res.status(200).json({ success: true, data: fallback, offline: true });
  }
}

async function registrarPagoFactura(req, res, next) {
  try {
    const { id } = req.params;
    const { montoPago } = req.body;

    const facturaRef = db.collection('facturas').doc(id);
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(facturaRef);
      const data = doc.data();
      const nuevoSaldo = Math.max(0, data.saldoPendiente - montoPago);
      let nuevoEstado = nuevoSaldo === 0 ? 'pagada' : 'parcial';
      transaction.update(facturaRef, { saldoPendiente: nuevoSaldo, estado: nuevoEstado });
    });

    return res.status(200).json({ success: true, message: 'Abono registrado en Firestore.' });
  } catch (error) {
    const { id } = req.params;
    const { montoPago } = req.body;
    console.warn(`[!] Registrando abono a factura ${id} en memoria debido a modo offline.`);
    const fac = MOCK_FACTURAS.find(f => f.id === id);
    if (fac) {
      fac.saldoPendiente = Math.max(0, fac.saldoPendiente - montoPago);
      fac.estado = fac.saldoPendiente === 0 ? 'pagada' : 'parcial';
      return res.status(200).json({ success: true, message: 'Pago registrado en memoria.', offline: true });
    }
    return res.status(404).json({ error: { message: 'Factura no encontrada en memoria.', code: 'NOT_FOUND' } });
  }
}

// -----------------------------------------------------------------------------
// Configuración de Secuencias
// -----------------------------------------------------------------------------

async function obtenerSecuencias(req, res, next) {
  try {
    const configRef = db.collection('configuracion').doc('secuencias');
    const doc = await configRef.get();
    if (doc.exists) {
      return res.status(200).json({ success: true, data: doc.data() });
    }
    await configRef.set(MOCK_SECUENCIAS);
    return res.status(200).json({ success: true, data: MOCK_SECUENCIAS });
  } catch (error) {
    console.warn('[!] Error obteniendo secuencias en Firestore, usando memoria.');
    return res.status(200).json({ success: true, data: MOCK_SECUENCIAS, offline: true });
  }
}

async function actualizarSecuencias(req, res, next) {
  try {
    const { secuencias } = req.body;
    if (!secuencias) {
      return res.status(400).json({ error: { message: 'Datos de secuencias inválidos.', code: 'INVALID_INPUT' } });
    }
    const configRef = db.collection('configuracion').doc('secuencias');
    await configRef.set(secuencias);
    return res.status(200).json({ success: true, message: 'Secuencias actualizadas correctamente.' });
  } catch (error) {
    console.warn('[!] Error actualizando secuencias en Firestore, usando memoria.');
    const { secuencias } = req.body;
    Object.assign(MOCK_SECUENCIAS, secuencias);
    return res.status(200).json({ success: true, message: 'Secuencias actualizadas en memoria.', offline: true });
  }
}

// -----------------------------------------------------------------------------
// Edición y Anulación de Cotizaciones
// -----------------------------------------------------------------------------

async function editarCotizacion(req, res, next) {
  try {
    const { id } = req.params;
    const { items, clienteId, clienteNombre, fecha, responsableId, responsableNombre, flete, arancel, otrosGastos } = req.body;
    
    const docRef = db.collection('cotizaciones').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: { message: 'Cotización no encontrada.', code: 'NOT_FOUND' } });
    }

    const currentData = doc.data();
    if (currentData.estado !== 'borrador' && currentData.estado !== 'enviado') {
      return res.status(400).json({ error: { message: 'No se puede editar una cotización aprobada o anulada.', code: 'INVALID_STATE' } });
    }

    let subtotal = 0;
    items.forEach(item => {
      subtotal += (item.cantidad || 0) * (item.precioUnitario || 0);
    });
    const impuestos = subtotal * 0.16;
    const total = subtotal + impuestos + (Number(flete) || 0) + (Number(arancel) || 0) + (Number(otrosGastos) || 0);

    const updatedData = {
      ...currentData,
      clienteId: clienteId || currentData.clienteId,
      clienteNombre: clienteNombre || currentData.clienteNombre,
      fecha: fecha || currentData.fecha,
      items,
      subtotal,
      impuestos,
      flete: Number(flete) || 0,
      arancel: Number(arancel) || 0,
      otrosGastos: Number(otrosGastos) || 0,
      total,
      responsableId: responsableId || currentData.responsableId,
      responsableNombre: responsableNombre || currentData.responsableNombre,
      updatedAt: new Date().toISOString()
    };

    await docRef.set(updatedData);
    return res.status(200).json({ success: true, data: { id, ...updatedData } });
  } catch (error) {
    const { id } = req.params;
    const { items, clienteId, clienteNombre, fecha, responsableId, responsableNombre, flete, arancel, otrosGastos } = req.body;
    console.warn(`[!] Editando cotización ${id} en memoria debido a modo offline:`, error.message);
    const cotIndex = MOCK_COTIZACIONES.findIndex(c => c.id === id);
    if (cotIndex !== -1) {
      const current = MOCK_COTIZACIONES[cotIndex];
      if (current.estado !== 'borrador' && current.estado !== 'enviado') {
        return res.status(400).json({ error: { message: 'No se puede editar una cotización en este estado.', code: 'INVALID_STATE' } });
      }

      let subtotal = 0;
      items.forEach(item => {
        subtotal += (item.cantidad || 0) * (item.precioUnitario || 0);
      });
      const impuestos = subtotal * 0.16;
      const total = subtotal + impuestos;

      const updated = {
        ...current,
        clienteId: clienteId || current.clienteId,
        clienteNombre: clienteNombre || current.clienteNombre,
        fecha: fecha || current.fecha,
        items,
        subtotal,
        impuestos,
        total,
        responsableId: responsableId || current.responsableId,
        responsableNombre: responsableNombre || current.responsableNombre
      };
      MOCK_COTIZACIONES[cotIndex] = updated;
      return res.status(200).json({ success: true, data: updated, offline: true });
    }
    return res.status(404).json({ error: { message: 'Cotización no encontrada en memoria.', code: 'NOT_FOUND' } });
  }
}

async function anularCotizacion(req, res, next) {
  try {
    const { id } = req.params;
    const docRef = db.collection('cotizaciones').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: { message: 'Cotización no encontrada.', code: 'NOT_FOUND' } });
    }
    await docRef.update({ estado: 'anulado', updatedAt: new Date().toISOString() });
    return res.status(200).json({ success: true, message: 'Cotización anulada correctamente.' });
  } catch (error) {
    const { id } = req.params;
    console.warn(`[!] Anulando cotización ${id} en memoria debido a modo offline.`);
    const cot = MOCK_COTIZACIONES.find(c => c.id === id);
    if (cot) {
      cot.estado = 'anulado';
      return res.status(200).json({ success: true, message: 'Cotización anulada en memoria.', offline: true });
    }
    return res.status(404).json({ error: { message: 'Cotización no encontrada en memoria.', code: 'NOT_FOUND' } });
  }
}

// -----------------------------------------------------------------------------
// Edición y Anulación de Órdenes de Clientes
// -----------------------------------------------------------------------------

async function editarOrdenCliente(req, res, next) {
  try {
    const { id } = req.params;
    const { items, clienteId, clienteNombre, fecha, responsableId, responsableNombre } = req.body;

    const docRef = db.collection('ordenes_cliente').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: { message: 'Orden no encontrada.', code: 'NOT_FOUND' } });
    }

    const currentData = doc.data();
    if (currentData.estado !== 'pendiente') {
      return res.status(400).json({ error: { message: 'Solo se pueden editar órdenes en estado pendiente.', code: 'INVALID_STATE' } });
    }

    let subtotal = 0;
    items.forEach(item => {
      subtotal += (item.cantidadPedida || 0) * (item.precioUnitario || 0);
    });
    const total = subtotal * 1.16;

    const updatedData = {
      ...currentData,
      clienteId: clienteId || currentData.clienteId,
      clienteNombre: clienteNombre || currentData.clienteNombre,
      fecha: fecha || currentData.fecha,
      items: items.map(item => ({
        sku: item.sku,
        descripcion: item.descripcion || '',
        cantidadPedida: item.cantidadPedida,
        cantidadRecibida: item.cantidadRecibida || 0,
        cantidadEntregada: item.cantidadEntregada || 0,
        precioUnitario: item.precioUnitario
      })),
      montoTotal: total,
      responsableId: responsableId || currentData.responsableId,
      responsableNombre: responsableNombre || currentData.responsableNombre,
      updatedAt: new Date().toISOString()
    };

    await docRef.set(updatedData);
    return res.status(200).json({ success: true, data: { id, ...updatedData } });
  } catch (error) {
    const { id } = req.params;
    const { items, clienteId, clienteNombre, fecha, responsableId, responsableNombre } = req.body;
    console.warn(`[!] Editando orden ${id} en memoria debido a modo offline.`);
    const ordIndex = MOCK_ORDENES.findIndex(o => o.id === id);
    if (ordIndex !== -1) {
      const current = MOCK_ORDENES[ordIndex];
      if (current.estado !== 'pendiente') {
        return res.status(400).json({ error: { message: 'Solo se pueden editar órdenes en estado pendiente.', code: 'INVALID_STATE' } });
      }

      let subtotal = 0;
      items.forEach(item => {
        subtotal += (item.cantidadPedida || 0) * (item.precioUnitario || 0);
      });
      const total = subtotal * 1.16;

      const updated = {
        ...current,
        clienteId: clienteId || current.clienteId,
        clienteNombre: clienteNombre || current.clienteNombre,
        fecha: fecha || current.fecha,
        items: items.map(item => ({
          sku: item.sku,
          descripcion: item.descripcion || '',
          cantidadPedida: item.cantidadPedida,
          cantidadRecibida: item.cantidadRecibida || 0,
          cantidadEntregada: item.cantidadEntregada || 0,
          precioUnitario: item.precioUnitario
        })),
        montoTotal: total,
        responsableId: responsableId || current.responsableId,
        responsableNombre: responsableNombre || current.responsableNombre
      };
      MOCK_ORDENES[ordIndex] = updated;
      return res.status(200).json({ success: true, data: updated, offline: true });
    }
    return res.status(404).json({ error: { message: 'Orden no encontrada en memoria.', code: 'NOT_FOUND' } });
  }
}

async function anularOrdenCliente(req, res, next) {
  try {
    const { id } = req.params;
    const docRef = db.collection('ordenes_cliente').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: { message: 'Orden no encontrada.', code: 'NOT_FOUND' } });
    }
    await docRef.update({ estado: 'anulado', updatedAt: new Date().toISOString() });
    return res.status(200).json({ success: true, message: 'Orden de cliente anulada.' });
  } catch (error) {
    const { id } = req.params;
    console.warn(`[!] Anulando orden ${id} en memoria debido a modo offline.`);
    const ord = MOCK_ORDENES.find(o => o.id === id);
    if (ord) {
      ord.estado = 'anulado';
      return res.status(200).json({ success: true, message: 'Orden anulada en memoria.', offline: true });
    }
    return res.status(404).json({ error: { message: 'Orden no encontrada en memoria.', code: 'NOT_FOUND' } });
  }
}

// -----------------------------------------------------------------------------
// Edición y Anulación de Pedidos a Proveedores
// -----------------------------------------------------------------------------

async function editarPedidoProveedor(req, res, next) {
  try {
    const { id } = req.params;
    const { items, proveedorId, proveedorNombre, fecha, responsableId, responsableNombre } = req.body;

    const docRef = db.collection('pedidos_proveedor').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: { message: 'Pedido no encontrado.', code: 'NOT_FOUND' } });
    }

    const currentData = doc.data();
    if (currentData.estado !== 'pendiente') {
      return res.status(400).json({ error: { message: 'Solo se pueden editar pedidos en estado pendiente.', code: 'INVALID_STATE' } });
    }

    const updatedData = {
      ...currentData,
      proveedorId: proveedorId || currentData.proveedorId,
      proveedorNombre: proveedorNombre || currentData.proveedorNombre,
      fecha: fecha || currentData.fecha,
      items: items.map(item => ({
        sku: item.sku,
        cantidadPedida: item.cantidadPedida,
        cantidadRecibida: item.cantidadRecibida || 0,
        ordenesAsociadas: item.ordenesAsociadas || []
      })),
      responsableId: responsableId || currentData.responsableId,
      responsableNombre: responsableNombre || currentData.responsableNombre,
      updatedAt: new Date().toISOString()
    };

    await docRef.set(updatedData);
    return res.status(200).json({ success: true, data: { id, ...updatedData } });
  } catch (error) {
    const { id } = req.params;
    const { items, proveedorId, proveedorNombre, fecha, responsableId, responsableNombre } = req.body;
    console.warn(`[!] Editando pedido ${id} en memoria debido a modo offline.`);
    const pedIndex = MOCK_PEDIDOS.findIndex(p => p.id === id);
    if (pedIndex !== -1) {
      const current = MOCK_PEDIDOS[pedIndex];
      if (current.estado !== 'pendiente') {
        return res.status(400).json({ error: { message: 'Solo se pueden editar pedidos en estado pendiente.', code: 'INVALID_STATE' } });
      }

      const updated = {
        ...current,
        proveedorId: proveedorId || current.proveedorId,
        proveedorNombre: proveedorNombre || current.proveedorNombre,
        fecha: fecha || current.fecha,
        items: items.map(item => ({
          sku: item.sku,
          cantidadPedida: item.cantidadPedida,
          cantidadRecibida: item.cantidadRecibida || 0,
          ordenesAsociadas: item.ordenesAsociadas || []
        })),
        responsableId: responsableId || current.responsableId,
        responsableNombre: responsableNombre || current.responsableNombre
      };
      MOCK_PEDIDOS[pedIndex] = updated;
      return res.status(200).json({ success: true, data: updated, offline: true });
    }
    return res.status(404).json({ error: { message: 'Pedido no encontrado en memoria.', code: 'NOT_FOUND' } });
  }
}

async function anularPedidoProveedor(req, res, next) {
  try {
    const { id } = req.params;
    const docRef = db.collection('pedidos_proveedor').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: { message: 'Pedido no encontrado.', code: 'NOT_FOUND' } });
    }
    await docRef.update({ estado: 'anulado', updatedAt: new Date().toISOString() });
    return res.status(200).json({ success: true, message: 'Pedido consolidado anulado.' });
  } catch (error) {
    const { id } = req.params;
    console.warn(`[!] Anulando pedido ${id} en memoria debido a modo offline.`);
    const ped = MOCK_PEDIDOS.find(p => p.id === id);
    if (ped) {
      ped.estado = 'anulado';
      return res.status(200).json({ success: true, message: 'Pedido anulado en memoria.', offline: true });
    }
    return res.status(404).json({ error: { message: 'Pedido no encontrado en memoria.', code: 'NOT_FOUND' } });
  }
}

// ─────────────────────────────────────────────
// CONFIG: Secuencias / Correlativos
// ─────────────────────────────────────────────

/**
 * GET /api/config/secuencias
 * Devuelve la configuración actual de correlativos.
 */
async function obtenerSecuencias(req, res) {
  try {
    const configRef = db.collection('configuracion').doc('secuencias');
    const doc = await configRef.get();
    if (!doc.exists) {
      // Inicializar con defaults si aún no existen en Firestore
      await configRef.set(MOCK_SECUENCIAS);
      return res.status(200).json(MOCK_SECUENCIAS);
    }
    return res.status(200).json(doc.data());
  } catch (error) {
    console.warn('[!] obtenerSecuencias offline, usando memoria:', error.message);
    return res.status(200).json(MOCK_SECUENCIAS);
  }
}

/**
 * POST /api/config/secuencias
 * Guarda la nueva configuración de correlativos.
 */
async function actualizarSecuencias(req, res) {
  try {
    const nuevasSecuencias = req.body;
    const configRef = db.collection('configuracion').doc('secuencias');
    await configRef.set(nuevasSecuencias, { merge: true });
    return res.status(200).json({ success: true, secuencias: nuevasSecuencias });
  } catch (error) {
    console.warn('[!] actualizarSecuencias offline, actualizando memoria:', error.message);
    Object.assign(MOCK_SECUENCIAS, req.body);
    return res.status(200).json({ success: true, secuencias: MOCK_SECUENCIAS, offline: true });
  }
}

module.exports = {
  obtenerStats,
  listarClientes,
  crearCliente,
  listarProveedores,
  crearProveedor,
  importarClientes,
  importarProveedores,
  importarCotizaciones,
  importarOrdenesCliente,
  listarCotizaciones,
  crearCotizacion,
  aprobarCotizacion,
  editarCotizacion,
  anularCotizacion,
  listarOrdenesCliente,
  crearOrdenCliente,
  editarOrdenCliente,
  anularOrdenCliente,
  listarPedidosProveedor,
  crearPedidoProveedor,
  editarPedidoProveedor,
  anularPedidoProveedor,
  formalizarPedidoProveedor,
  listarDespachos,
  crearDespacho,
  anularDespacho,
  listarFacturas,
  registrarPagoFactura,
  anularFactura,
  crearFacturaDesdeDespachos,
  listarResponsables,
  crearResponsable,
  obtenerSecuencias,
  actualizarSecuencias
};
