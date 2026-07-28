require('dotenv').config();
const { db } = require('../src/config/firebase');

/**
 * Script de población de datos iniciales (Seeding) para Firestore.
 * Ejecuta operaciones en lote (Batched Writes) para asegurar velocidad e integridad.
 */
async function seed() {
  console.log('--- Iniciando población de datos en Firestore ---');
  const batch = db.batch();

  // 1. Crear Cliente
  const clienteId = 'cliente_dist_bejuma';
  const clienteRef = db.collection('clientes').doc(clienteId);
  const clienteData = {
    nombre: 'Distribuidora Bejuma C.A.',
    rif: 'J-12345678-9',
    email: 'compras@distbejuma.com',
    telefono: '+582494912345',
    direccion: 'Avenida Bolívar, Local 12, Bejuma, Carabobo',
    createdAt: new Date().toISOString()
  };
  batch.set(clienteRef, clienteData);
  console.log(`[+] Preparando Cliente: ${clienteData.nombre} (${clienteId})`);

  // 2. Crear Orden de Cliente 1 (Más antigua - FIFO prioritaria)
  const ordenC1Id = 'orden_c1_bejuma';
  const ordenC1Ref = db.collection('ordenes_cliente').doc(ordenC1Id);
  const ordenC1Data = {
    cotizacionId: 'cotizacion_mock_1',
    clienteId: clienteId,
    clienteNombre: clienteData.nombre,
    fecha: '2026-06-01T10:00:00Z', // Fecha más antigua
    estado: 'pendiente',
    items: [
      {
        sku: 'SKU-BOMB-001',
        descripcion: 'Bomba de Agua 1HP',
        cantidadPedida: 50,
        cantidadRecibida: 0,
        cantidadEntregada: 0,
        precioUnitario: 120.00
      }
    ],
    montoTotal: 6960.00, // (50 * 120) + 16% IVA
    createdAt: '2026-06-01T10:00:00Z'
  };
  batch.set(ordenC1Ref, ordenC1Data);
  console.log(`[+] Preparando Orden de Cliente 1: ${ordenC1Id} (Cantidad: 50 SKU-BOMB-001)`);

  // 3. Crear Orden de Cliente 2 (Más reciente)
  const ordenC2Id = 'orden_c2_bejuma';
  const ordenC2Ref = db.collection('ordenes_cliente').doc(ordenC2Id);
  const ordenC2Data = {
    cotizacionId: 'cotizacion_mock_2',
    clienteId: clienteId,
    clienteNombre: clienteData.nombre,
    fecha: '2026-06-15T14:30:00Z', // Fecha más reciente
    estado: 'pendiente',
    items: [
      {
        sku: 'SKU-BOMB-001',
        descripcion: 'Bomba de Agua 1HP',
        cantidadPedida: 100,
        cantidadRecibida: 0,
        cantidadEntregada: 0,
        precioUnitario: 120.00
      }
    ],
    montoTotal: 13920.00, // (100 * 120) + 16% IVA
    createdAt: '2026-06-15T14:30:00Z'
  };
  batch.set(ordenC2Ref, ordenC2Data);
  console.log(`[+] Preparando Orden de Cliente 2: ${ordenC2Id} (Cantidad: 100 SKU-BOMB-001)`);

  // 4. Crear Pedido Consolidado al Proveedor
  const pedidoProveedorId = 'pedido_prov_guangzhou_001';
  const pedidoProveedorRef = db.collection('pedidos_proveedor').doc(pedidoProveedorId);
  const pedidoProveedorData = {
    proveedorId: 'proveedor_guangzhou_pump',
    proveedorNombre: 'Guangzhou Pump Corp Ltd',
    fecha: '2026-06-18T08:00:00Z',
    estado: 'pendiente',
    items: [
      {
        sku: 'SKU-BOMB-001',
        cantidadPedida: 150, // Consolidado: 50 (Orden 1) + 100 (Orden 2)
        cantidadRecibida: 0,
        ordenesAsociadas: [
          {
            ordenClienteId: ordenC1Id,
            cantidadPrometida: 50,
            cantidadRecibida: 0
          },
          {
            ordenClienteId: ordenC2Id,
            cantidadPrometida: 100,
            cantidadRecibida: 0
          }
        ]
      }
    ],
    createdAt: '2026-06-18T08:00:00Z'
  };
  batch.set(pedidoProveedorRef, pedidoProveedorData);
  console.log(`[+] Preparando Pedido Proveedor Consolidado: ${pedidoProveedorId} (Cantidad Total: 150)`);

  // 5. Crear una factura inicial de prueba para reflejar Cuentas por Cobrar reales
  const facturaId = 'factura_inicial_bejuma';
  const facturaRef = db.collection('facturas').doc(facturaId);
  const facturaData = {
    clienteId: clienteId,
    clienteNombre: clienteData.nombre,
    fecha: '2026-06-20T10:00:00Z',
    notasEntregaIds: ['despacho_mock_1'],
    subtotal: 5000.00,
    impuestos: 800.00,
    totalFactura: 5800.00,
    saldoPendiente: 5800.00,
    estado: 'pendiente',
    createdAt: '2026-06-20T10:00:00Z'
  };
  batch.set(facturaRef, facturaData);
  console.log(`[+] Preparando Factura Inicial CxC: ${facturaId} (Saldo: $5800.00)`);

  try {
    // Confirmar la escritura por lotes en Firestore
    await batch.commit();
    console.log('\n✅ POBLACIÓN COMPLETADA: Todos los documentos iniciales fueron insertados exitosamente en Firestore.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR cargando datos de prueba:', error);
    process.exit(1);
  }
}

seed();
