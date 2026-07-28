const express = require('express');
const router = express.Router();
const controller = require('../controllers/generalController');
const cxpController = require('../controllers/cxpController');

// Estadísticas del Dashboard
router.get('/dashboard/stats', controller.obtenerStats);

// Clientes
router.get('/clientes', controller.listarClientes);
router.post('/clientes', controller.crearCliente);
router.post('/clientes/importar', controller.importarClientes);

// Proveedores
router.get('/proveedores', controller.listarProveedores);
router.post('/proveedores', controller.crearProveedor);
router.post('/proveedores/importar', controller.importarProveedores);

// Responsables
router.get('/responsables', controller.listarResponsables);
router.post('/responsables', controller.crearResponsable);

// Configuración de Secuencias / Correlativos
router.get('/config/secuencias', controller.obtenerSecuencias);
router.post('/config/secuencias', controller.actualizarSecuencias);

// Cotizaciones
router.get('/cotizaciones', controller.listarCotizaciones);
router.post('/cotizaciones', controller.crearCotizacion);
router.post('/cotizaciones/importar', controller.importarCotizaciones);
router.post('/cotizaciones/:id/aprobar', controller.aprobarCotizacion);
router.put('/cotizaciones/:id', controller.editarCotizacion);
router.post('/cotizaciones/:id/anular', controller.anularCotizacion);

// Órdenes de Clientes
router.get('/ordenes-cliente', controller.listarOrdenesCliente);
router.post('/ordenes-cliente', controller.crearOrdenCliente);
router.post('/ordenes-cliente/importar', controller.importarOrdenesCliente);
router.put('/ordenes-cliente/:id', controller.editarOrdenCliente);
router.post('/ordenes-cliente/:id/anular', controller.anularOrdenCliente);

// Pedidos a Proveedor Consolidados
router.get('/pedidos-proveedor', controller.listarPedidosProveedor);
router.post('/pedidos-proveedor', controller.crearPedidoProveedor);
router.put('/pedidos-proveedor/:id', controller.editarPedidoProveedor);
router.post('/pedidos-proveedor/:id/anular', controller.anularPedidoProveedor);
router.post('/pedidos-proveedor/:id/formalizar', controller.formalizarPedidoProveedor);

// Notas de Entrega / Despachos
router.get('/despachos', controller.listarDespachos);
router.post('/despachos', controller.crearDespacho);
router.post('/despachos/:id/anular', controller.anularDespacho);

// Facturación & CxC
router.get('/facturacion', controller.listarFacturas);
router.post('/facturacion/crear-desde-despachos', controller.crearFacturaDesdeDespachos);
router.post('/facturacion/:id/pago', controller.registrarPagoFactura);
router.post('/facturacion/:id/anular', controller.anularFactura);

// Cuentas por Pagar a Proveedores (CxP)
router.get('/cxp/facturas', cxpController.listarFacturasProveedor);
router.post('/cxp/facturas', cxpController.crearFacturaProveedor);
router.get('/cxp/pagos', cxpController.listarPagosProveedor);
router.post('/cxp/pagos', cxpController.registrarPagoProveedor);

module.exports = router;
