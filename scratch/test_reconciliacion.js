const path = require('path');

// 1. Mockear la configuración de Firebase antes de cargar el controlador
let dbData = {};

const mockDb = {
  collection: (colName) => {
    return {
      doc: (docId) => {
        const docPath = `${colName}/${docId}`;
        return {
          id: docId,
          path: docPath,
          get: async () => {
            return {
              exists: !!dbData[docPath],
              id: docId,
              data: () => JSON.parse(JSON.stringify(dbData[docPath] || {}))
            };
          }
        };
      }
    };
  },
  runTransaction: async (callback) => {
    const transaction = {
      get: async (docRef) => {
        const docPath = docRef.path;
        return {
          exists: !!dbData[docPath],
          id: docRef.id,
          data: () => JSON.parse(JSON.stringify(dbData[docPath] || {}))
        };
      },
      getAll: async (...docRefs) => {
        return docRefs.map(ref => {
          const docPath = ref.path;
          return {
            exists: !!dbData[docPath],
            id: ref.id,
            ref: ref,
            data: () => JSON.parse(JSON.stringify(dbData[docPath] || {}))
          };
        });
      },
      set: (docRef, data) => {
        const docPath = docRef.path;
        dbData[docPath] = JSON.parse(JSON.stringify(data));
      }
    };
    await callback(transaction);
  }
};

const adminMock = {
  firestore: {
    FieldValue: {
      serverTimestamp: () => new Date().toISOString()
    }
  }
};

// Inyectar en la caché de require para interceptar la inicialización de Firebase
const firebaseConfigPath = path.resolve(__dirname, '../src/config/firebase.js');
require.cache[firebaseConfigPath] = {
  id: firebaseConfigPath,
  filename: firebaseConfigPath,
  loaded: true,
  exports: {
    admin: adminMock,
    db: mockDb
  }
};

// 2. Cargar el controlador ahora que Firebase está mockeado
const { procesarRecepcionImportacion } = require('../src/controllers/importacionController');

// 3. Configurar el escenario de prueba (Seed Data)
function seedDatabase() {
  dbData = {};

  // Orden de Cliente 1 (Más antigua - FIFO prioritaria)
  dbData['ordenes_cliente/orden_c1'] = {
    cotizacionId: 'cotizacion_c1',
    clienteId: 'cliente_1',
    clienteNombre: 'Ferretería La Central',
    fecha: '2026-06-01T10:00:00Z', // Antigua
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
    montoTotal: 6960.00
  };

  // Orden de Cliente 2 (Más reciente)
  dbData['ordenes_cliente/orden_c2'] = {
    cotizacionId: 'cotizacion_c2',
    clienteId: 'cliente_2',
    clienteNombre: 'Constructora del Centro C.A.',
    fecha: '2026-06-15T14:30:00Z', // Reciente
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
    montoTotal: 13920.00
  };

  // Pedido Consolidado al Proveedor
  dbData['pedidos_proveedor/pedido_p1'] = {
    proveedorId: 'proveedor_china',
    proveedorNombre: 'Guangzhou Pump Corp',
    fecha: '2026-06-18T08:00:00Z',
    estado: 'pendiente',
    items: [
      {
        sku: 'SKU-BOMB-001',
        cantidadPedida: 150, // 50 (Cliente 1) + 100 (Cliente 2)
        cantidadRecibida: 0,
        ordenesAsociadas: [
          {
            ordenClienteId: 'orden_c1',
            cantidadPrometida: 50,
            cantidadRecibida: 0
          },
          {
            ordenClienteId: 'orden_c2',
            cantidadPrometida: 100,
            cantidadRecibida: 0
          }
        ]
      }
    ]
  };
}

// 4. Ejecutar Caso de Prueba: Recepción Parcial de 80 unidades
async function ejecutarPrueba() {
  console.log('--- Iniciando prueba de conciliación FIFO ---');
  seedDatabase();

  // Simular Request y Response de Express
  const req = {
    body: {
      pedidoProveedorId: 'pedido_p1',
      contenedorId: 'CONT-40HQ-8888',
      itemsRecibidos: [
        {
          sku: 'SKU-BOMB-001',
          cantidadRecibida: 80 // Llegan 80 unidades
        }
      ]
    }
  };

  let responseStatus = 0;
  let responseJson = null;

  const res = {
    status: function(code) {
      responseStatus = code;
      return this;
    },
    json: function(data) {
      responseJson = data;
      return this;
    }
  };

  const next = (err) => {
    console.error('Error capturado en el middleware next():', err);
  };

  // Llamar al controlador directamente
  await procesarRecepcionImportacion(req, res, next);

  // 5. Validaciones
  console.log(`\nCódigo de Respuesta: ${responseStatus}`);
  console.log('Resumen de Distribución devuelto por la API:', JSON.stringify(responseJson, null, 2));

  // Verificar estado de Orden de Cliente 1 (Debe estar COMPLETADA)
  const ordenC1 = dbData['ordenes_cliente/orden_c1'];
  console.log('\n--- Estado de Orden Cliente 1 (Ferretería La Central - Pedido: 50) ---');
  console.log(`Estado: ${ordenC1.estado} (Esperado: completada)`);
  console.log(`Cantidad Recibida: ${ordenC1.items[0].cantidadRecibida} (Esperado: 50)`);

  // Verificar estado de Orden de Cliente 2 (Debe estar PARCIAL)
  const ordenC2 = dbData['ordenes_cliente/orden_c2'];
  console.log('\n--- Estado de Orden Cliente 2 (Constructora del Centro - Pedido: 100) ---');
  console.log(`Estado: ${ordenC2.estado} (Esperado: parcial)`);
  console.log(`Cantidad Recibida: ${ordenC2.items[0].cantidadRecibida} (Esperado: 30)`);

  // Verificar estado del Pedido del Proveedor
  const pedidoP1 = dbData['pedidos_proveedor/pedido_p1'];
  console.log('\n--- Estado del Pedido Proveedor (Pedido consolidado: 150) ---');
  console.log(`Estado: ${pedidoP1.estado} (Esperado: parcial)`);
  console.log(`Cantidad Recibida SKU-BOMB-001: ${pedidoP1.items[0].cantidadRecibida} (Esperado: 80)`);

  // Verificar creación del registro de recepción
  const recepciones = Object.keys(dbData).filter(k => k.startsWith('recepciones_importacion/'));
  console.log('\n--- Registro Histórico de Recepción creado ---');
  console.log(`Documentos creados: ${recepciones.length} (Esperado: 1)`);
  if (recepciones.length > 0) {
    console.log('Contenido:', JSON.stringify(dbData[recepciones[0]], null, 2));
  }

  // Comprobar assertions lógicas
  const success = 
    responseStatus === 200 &&
    ordenC1.estado === 'completada' &&
    ordenC1.items[0].cantidadRecibida === 50 &&
    ordenC2.estado === 'parcial' &&
    ordenC2.items[0].cantidadRecibida === 30 &&
    pedidoP1.estado === 'parcial' &&
    pedidoP1.items[0].cantidadRecibida === 80 &&
    recepciones.length === 1;

  if (success) {
    console.log('\n✅ PRUEBA EXITOSA: La conciliación FIFO de importaciones y transacciones simuladas pasaron todos los criterios de aceptación.');
    process.exit(0);
  } else {
    console.log('\n❌ PRUEBA FALLIDA: Uno o más resultados no coincidieron con lo esperado.');
    process.exit(1);
  }
}

ejecutarPrueba().catch(console.error);
