export interface Cliente {
  id?: string;
  codigo?: string;
  nombre: string;
  rif: string;
  email: string;
  telefono: string;
  direccion: string; // Físical/Fiscal
  direccionDespacho?: string;
  createdAt?: string;
}

export interface ItemCotizacion {
  pos?: string;
  sku: string;
  skuProveedor?: string;
  descripcion: string;
  detalles?: string;
  modelo?: string;
  unidad?: string;
  plazo?: string;
  fechaEntrega?: string;
  cantidad: number;
  precioUnitario: number;
}

export interface Cotizacion {
  id?: string;
  clienteId: string;
  clienteNombre: string;
  fecha: string;
  estado: 'requerimiento' | 'presupuestado' | 'borrador' | 'enviado' | 'aprobado' | 'rechazado' | 'anulado';
  pedidoOrigenId?: string;
  items: ItemCotizacion[];
  subtotal: number;
  impuestos: number;
  flete?: number;
  arancel?: number;
  otrosGastos?: number;
  total: number;
  responsableId?: string;
  responsableNombre?: string;
  // Nuevos campos de metadatos para formato PDF
  billToDireccion?: string;
  shipToDireccion?: string;
  customerNo?: string;
  peticionOferta?: string;
  offerValid?: string;
  freightTerm?: string;
  proformaDateDue?: string;
  deliveryTerms?: string;
  originCountry?: string;
  shippedFrom?: string;
  portOfDestination?: string;
  observaciones?: string;
  bancoSeleccionado?: string;
  createdAt?: string;
}

export type Requerimiento = Cotizacion;

export interface Producto {
  id?: string;
  sku: string;
  skuProveedor?: string;
  descripcion: string;
  detalles?: string;
  createdAt?: string;
}

export interface ProveedorAsignado {
  proveedorId: string;
  proveedorNombre: string;
  cantidad: number;
}

export interface ItemOrdenCliente {
  sku: string;
  skuProveedor?: string;
  descripcion: string;
  detalles?: string;
  cantidadPedida: number;
  cantidadRecibida: number;
  cantidadEntregada: number;
  precioUnitario: number;
  proveedores: ProveedorAsignado[];
}

export interface OrdenCliente {
  id?: string;
  cotizacionId?: string;
  clienteId: string;
  clienteNombre: string;
  fecha: string;
  estado: 'pendiente' | 'parcial' | 'completada' | 'cancelada' | 'anulado';
  items: ItemOrdenCliente[];
  montoTotal: number;
  responsableId?: string;
  responsableNombre?: string;
  observaciones?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrdenAsociada {
  ordenClienteId: string;
  cantidadPrometida: number;
  cantidadRecibida: number;
}

export interface ItemPedidoProveedor {
  sku: string;
  skuProveedor?: string;
  descripcion?: string;
  detalles?: string;
  cantidadPedida: number;
  cantidadRecibida: number;
  costoUnitario?: number;
  ordenesAsociadas: OrdenAsociada[];
}

export interface PedidoProveedor {
  id?: string;
  proveedorId: string;
  proveedorNombre: string;
  fecha: string;
  estado: 'pendiente' | 'formalizado' | 'en_transito' | 'parcial' | 'recibido' | 'anulado';
  items: ItemPedidoProveedor[];
  responsableId?: string;
  responsableNombre?: string;
  observaciones?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FacturaProveedor {
  id?: string;
  pedidoProveedorId: string;
  proveedorId: string;
  numeroFactura: string;
  fechaEmision: string;
  items?: Array<{
    sku: string;
    skuProveedor?: string;
    descripcion: string;
    cantidadFacturada: number;
    precioUnitario: number;
  }>;
  subtotal: number;
  impuestos: number;
  total: number;
  montoAbonado: number;
  saldoPendiente: number;
  estado: 'pendiente' | 'parcial' | 'pagada' | 'anulada';
  createdAt?: string;
}

export interface AbonoProveedor {
  id?: string;
  facturaProveedorId: string;
  monto: number;
  fecha: string;
  metodoPago: string; // Ej: Zelle, Wire, Efectivo
  referencia?: string;
  createdAt?: string;
}

export interface GastoImportacion {
  id?: string;
  pedidoProveedorId: string;
  concepto: string; // Ej: Flete, Aduana, Agilización, Trasbordo
  monto: number;
  fecha: string;
  observaciones?: string;
  createdAt?: string;
}

export interface ItemRecibido {
  sku: string;
  cantidadRecibida: number;
}

export interface DistribucionRecepcion {
  ordenClienteId: string;
  clienteNombre?: string;
  sku: string;
  cantidadAsignada: number;
}

export interface RecepcionImportacion {
  id?: string;
  pedidoProveedorId: string;
  contenedorId: string;
  fecha?: string;
  itemsRecibidos: ItemRecibido[];
  distribucion: DistribucionRecepcion[];
  createdAt?: string;
}

export interface NotaEntrega {
  id?: string;
  clienteId: string;
  clienteNombre: string;
  ordenClienteId: string;
  fecha: string;
  estado: 'pendiente_facturacion' | 'facturado' | 'anulado';
  items: Array<{
    sku: string;
    cantidadDespachada: number;
    descripcion?: string;
    precioUnitario?: number;
  }>;
  total: number;
  createdAt?: string;
}

export interface FacturaItem {
  sku: string;
  descripcion?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Factura {
  id?: string;
  clienteId: string;
  clienteNombre: string;
  fecha: string;
  notasEntregaIds: string[];
  items?: FacturaItem[];
  subtotal: number;
  flete?: number;
  otrosGastos?: number;
  impuestos: number;
  totalFactura: number;
  saldoPendiente: number;
  tasaCambio?: number;
  totalBs?: number;
  estado: 'pendiente' | 'parcial' | 'pagada' | 'anulada';
  observaciones?: string;
  bancoSeleccionado?: string;
  createdAt?: string;
}

export interface Proveedor {
  id?: string;
  codigo?: string;
  nombre: string;
  rif: string;
  email: string;
  telefono: string;
  direccion: string;
  createdAt?: string;
}

export interface Responsable {
  id?: string;
  nombre: string;
  rol: string;
  email: string;
  createdAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Almacén / Inventario
// ─────────────────────────────────────────────────────────────────────────────

export interface ItemInventario {
  id?: string;
  sku: string;
  descripcion: string;
  cantidadDisponible: number;
  costoPromedio?: number;
  updatedAt?: string;
}

export interface AbonoCliente {
  id?: string;
  facturaId: string;
  montoUSD: number;
  moneda: 'USD' | 'BS';
  montoBs?: number;
  tasaCambio?: number;
  fecha: string;
  metodoPago: string;
  referencia?: string;
  createdAt?: string;
}


