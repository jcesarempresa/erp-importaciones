const { admin, db } = require('../config/firebase');

/**
 * Registra el ingreso de mercancía (contenedor) y ejecuta la conciliación FIFO.
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 * @param {import('express').NextFunction} next 
 */
async function procesarRecepcionImportacion(req, res, next) {
  const { pedidoProveedorId, contenedorId, itemsRecibidos } = req.body;

  // 1. Validaciones iniciales de entrada
  if (!pedidoProveedorId) {
    return res.status(400).json({ error: { message: 'El campo pedidoProveedorId es obligatorio.', code: 'INVALID_INPUT' } });
  }
  if (!contenedorId) {
    return res.status(400).json({ error: { message: 'El campo contenedorId es obligatorio.', code: 'INVALID_INPUT' } });
  }
  if (!Array.isArray(itemsRecibidos) || itemsRecibidos.length === 0) {
    return res.status(400).json({ error: { message: 'El campo itemsRecibidos debe ser un arreglo no vacío.', code: 'INVALID_INPUT' } });
  }

  for (const item of itemsRecibidos) {
    if (!item.sku || typeof item.cantidadRecibida !== 'number' || item.cantidadRecibida <= 0) {
      return res.status(400).json({
        error: { 
          message: `Cada ítem recibido debe contener un SKU y una cantidadRecibida válida (mayor a 0). SKU recibido incorrecto: ${JSON.stringify(item)}`, 
          code: 'INVALID_INPUT' 
        }
      });
    }
  }

  try {
    const logReconciliacion = [];
    const resumenDistribucion = [];

    // Ejecutar todas las operaciones de lectura y escritura en una Transacción Atómica
    await db.runTransaction(async (transaction) => {
      const pedidoRef = db.collection('pedidos_proveedor').doc(pedidoProveedorId);
      const pedidoDoc = await transaction.get(pedidoRef);

      if (!pedidoDoc.exists) {
        throw { status: 404, message: `El pedido del proveedor con ID ${pedidoProveedorId} no existe.`, code: 'NOT_FOUND' };
      }

      const pedidoData = pedidoDoc.data();

      // Recopilar todos los IDs de ordenes de clientes asociadas que necesitaremos leer
      const allClientOrderIds = new Set();
      pedidoData.items.forEach(item => {
        if (Array.isArray(item.ordenesAsociadas)) {
          item.ordenesAsociadas.forEach(oa => {
            allClientOrderIds.add(oa.ordenClienteId);
          });
        }
      });

      // Leer todos los documentos de órdenes de clientes involucrados en esta transacción
      const clientOrderRefs = Array.from(allClientOrderIds).map(id => db.collection('ordenes_cliente').doc(id));
      const clientOrderDocs = clientOrderRefs.length > 0 ? await transaction.getAll(...clientOrderRefs) : [];

      // Mapear los datos de las órdenes de clientes por su ID para acceso rápido
      const clientOrdersMap = {};
      clientOrderDocs.forEach(doc => {
        if (doc.exists) {
          clientOrdersMap[doc.id] = {
            id: doc.id,
            ref: doc.ref,
            data: doc.data(),
            dirty: false // Bandera para indicar si el documento fue modificado y debe guardarse
          };
        }
      });

      // Procesar cada SKU recibido en el contenedor
      for (const itemRecibido of itemsRecibidos) {
        const { sku, cantidadRecibida } = itemRecibido;

        // Buscar el ítem correspondiente en el pedido del proveedor
        const pedidoItem = pedidoData.items.find(i => i.sku === sku);
        if (!pedidoItem) {
          console.warn(`Advertencia: El SKU ${sku} recibido no pertenece al pedido de proveedor consolidado.`);
          continue; // Omitir o manejar stock no planificado
        }

        let unidadesPorDistribuir = cantidadRecibida;

        // Obtener las órdenes de cliente asociadas a este SKU
        const ordenesAsociadas = pedidoItem.ordenesAsociadas || [];

        // Para aplicar la lógica FIFO real, ordenamos las órdenes asociadas por la fecha
        // de la orden del cliente (de la más antigua a la más reciente).
        const ordenesAsociadasConFecha = ordenesAsociadas
          .map(oa => {
            const clientOrder = clientOrdersMap[oa.ordenClienteId];
            return {
              ...oa,
              fechaOrden: clientOrder ? new Date(clientOrder.data.fecha).getTime() : 0,
              exists: !!clientOrder
            };
          })
          .filter(oa => oa.exists)
          .sort((a, b) => a.fechaOrden - b.fechaOrden);

        // Distribuir de forma FIFO
        for (const oa of ordenesAsociadasConFecha) {
          if (unidadesPorDistribuir <= 0) break;

          const clientOrder = clientOrdersMap[oa.ordenClienteId];
          const orderItemIndex = clientOrder.data.items.findIndex(i => i.sku === sku);

          if (orderItemIndex !== -1) {
            const orderItem = clientOrder.data.items[orderItemIndex];
            const cantidadPedida = orderItem.cantidadPedida || 0;
            const cantidadRecibidaActual = orderItem.cantidadRecibida || 0;
            const pendiente = cantidadPedida - cantidadRecibidaActual;

            if (pendiente > 0) {
              const cantidadAsignada = Math.min(unidadesPorDistribuir, pendiente);

              // Actualizar el ítem de la orden del cliente
              orderItem.cantidadRecibida = cantidadRecibidaActual + cantidadAsignada;
              clientOrder.dirty = true;

              // Actualizar la traza en el pedido del proveedor
              const oaEnPedido = pedidoItem.ordenesAsociadas.find(o => o.ordenClienteId === oa.ordenClienteId);
              if (oaEnPedido) {
                oaEnPedido.cantidadRecibida = (oaEnPedido.cantidadRecibida || 0) + cantidadAsignada;
              }

              unidadesPorDistribuir -= cantidadAsignada;

              // Registrar distribución
              resumenDistribucion.push({
                ordenClienteId: oa.ordenClienteId,
                clienteNombre: clientOrder.data.clienteNombre,
                sku,
                cantidadAsignada
              });

              logReconciliacion.push(`Asignadas ${cantidadAsignada} unidades de ${sku} a la orden ${oa.ordenClienteId} (Cliente: ${clientOrder.data.clienteNombre})`);
            }
          }
        }

        // Actualizar la cantidad recibida total del SKU en el pedido del proveedor
        pedidoItem.cantidadRecibida = (pedidoItem.cantidadRecibida || 0) + (cantidadRecibida - unidadesPorDistribuir);

        // Si sobraron unidades que no tenían orden asociada asignable, se registran como excedente
        if (unidadesPorDistribuir > 0) {
          logReconciliacion.push(`Excedente: ${unidadesPorDistribuir} unidades de ${sku} no pudieron ser asignadas a ninguna orden pendiente.`);
          resumenDistribucion.push({
            ordenClienteId: 'EXCEDENTE_ALMACEN',
            clienteNombre: 'Inventario General (Excedente)',
            sku,
            cantidadAsignada: unidadesPorDistribuir
          });
        }
      }

      // 3. Evaluar el nuevo estatus de cada Orden de Cliente modificada y persistir
      for (const orderId in clientOrdersMap) {
        const clientOrder = clientOrdersMap[orderId];
        if (clientOrder.dirty) {
          // Determinar estatus (completada, parcial o pendiente)
          let totalPedidas = 0;
          let totalRecibidas = 0;

          clientOrder.data.items.forEach(item => {
            totalPedidas += item.cantidadPedida || 0;
            totalRecibidas += item.cantidadRecibida || 0;
          });

          if (totalRecibidas === 0) {
            clientOrder.data.estado = 'pendiente';
          } else if (totalRecibidas >= totalPedidas) {
            clientOrder.data.estado = 'completada';
          } else {
            clientOrder.data.estado = 'parcial';
          }

          clientOrder.data.updatedAt = admin.firestore.FieldValue.serverTimestamp();

          // Escribir cambios dentro de la transacción
          transaction.set(clientOrder.ref, clientOrder.data);
        }
      }

      // 4. Evaluar el nuevo estatus del Pedido del Proveedor y persistir
      let totalItemsPedidas = 0;
      let totalItemsRecibidas = 0;
      pedidoData.items.forEach(item => {
        totalItemsPedidas += item.cantidadPedida || 0;
        totalItemsRecibidas += item.cantidadRecibida || 0;
      });

      if (totalItemsRecibidas === 0) {
        pedidoData.estado = 'pendiente';
      } else if (totalItemsRecibidas >= totalItemsPedidas) {
        pedidoData.estado = 'recibido';
      } else {
        pedidoData.estado = 'parcial';
      }

      pedidoData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      transaction.set(pedidoRef, pedidoData);

      // 5. Registrar el histórico de recepción
      const recepcionRef = db.collection('recepciones_importacion').doc();
      const recepcionData = {
        pedidoProveedorId,
        contenedorId,
        fecha: admin.firestore.FieldValue.serverTimestamp(),
        itemsRecibidos,
        distribucion: resumenDistribucion,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      transaction.set(recepcionRef, recepcionData);
    });

    // Respuesta exitosa
    return res.status(200).json({
      success: true,
      message: 'Recepción e importación conciliada correctamente de manera atómica.',
      log: logReconciliacion,
      distribucion: resumenDistribucion
    });

  } catch (error) {
    console.error('Error procesando la recepción de importación:', error);
    return next(error);
  }
}

module.exports = {
  procesarRecepcionImportacion
};
