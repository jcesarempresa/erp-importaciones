import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
  writeBatch,
  runTransaction,
  where,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Cotizacion,
  OrdenCliente,
  PedidoProveedor,
  NotaEntrega,
  Factura,
  Cliente,
  Proveedor,
  Responsable,
  ItemRecibido,
  ItemPedidoProveedor,
  ItemInventario,
  Producto,
  FacturaItem,
  RecepcionImportacion,
  DistribucionRecepcion,
  AbonoCliente,
} from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces exportadas
// ─────────────────────────────────────────────────────────────────────────────
export interface ReconciliacionResponse {
  success: boolean;
  message: string;
  log: string[];
  distribucion: Array<{
    ordenClienteId: string;
    clienteNombre?: string;
    sku: string;
    cantidadAsignada: number;
  }>;
}

export interface DashboardStats {
  ordenesActivas: number;
  enImportacion: number;
  cxcMonto: number;
  presupuestos: number;
}

export interface SecuenciaConfig {
  prefijo: string;
  siguiente: number;
  longitud: number;
}

export interface SecuenciasMap {
  [tipo: string]: SecuenciaConfig;
}

const DEFAULT_SECUENCIAS: SecuenciasMap = {
  cotizacion:       { prefijo: "COT-", siguiente: 1, longitud: 4 },
  pedido:           { prefijo: "PED-", siguiente: 1, longitud: 4 },
  orden_cliente:    { prefijo: "ORC-", siguiente: 1, longitud: 4 },
  pedido_proveedor: { prefijo: "PED-", siguiente: 1, longitud: 4 },
  despacho:         { prefijo: "DES-", siguiente: 1, longitud: 4 },
  factura:          { prefijo: "FAC-", siguiente: 1, longitud: 4 },
  compra:           { prefijo: "COM-", siguiente: 1, longitud: 4 },
  cliente:          { prefijo: "CLI-", siguiente: 1, longitud: 4 },
  proveedor:        { prefijo: "PROV-", siguiente: 1, longitud: 4 },
};

// Helper: mapear snapshot de colección a array tipado
function snapToArray<T>(snap: any): T[] {
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as T[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Correlativos (transaccional para evitar duplicados)
// ─────────────────────────────────────────────────────────────────────────────
async function generarCorrelativo(tipo: string): Promise<string> {
  const configRef = doc(db, "configuracion", "secuencias");
  let formattedId = "";
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(configRef);
    let secuencias: SecuenciasMap = snap.exists()
      ? (snap.data() as SecuenciasMap)
      : { ...DEFAULT_SECUENCIAS };

    const cfg = secuencias[tipo] ?? DEFAULT_SECUENCIAS[tipo];
    formattedId = `${cfg.prefijo}${String(cfg.siguiente).padStart(cfg.longitud, "0")}`;
    secuencias[tipo] = { ...cfg, siguiente: cfg.siguiente + 1 };
    tx.set(configRef, secuencias);
  });
  return formattedId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Clientes
// ─────────────────────────────────────────────────────────────────────────────
export async function obtenerClientes(): Promise<Cliente[]> {
  const snap = await getDocs(query(collection(db, "clientes"), orderBy("nombre", "asc")));
  return snapToArray<Cliente>(snap);
}

export async function crearCliente(cliente: Cliente): Promise<Cliente> {
  const codigo = await generarCorrelativo("cliente");
  const data = { ...cliente, codigo, createdAt: new Date().toISOString() };
  const ref = await addDoc(collection(db, "clientes"), data);
  return { id: ref.id, ...data };
}

export async function importarClientes(items: Cliente[]): Promise<void> {
  const batch = writeBatch(db);
  items.forEach((c) => {
    const ref = doc(collection(db, "clientes"));
    batch.set(ref, { ...c, createdAt: new Date().toISOString() });
  });
  await batch.commit();
}

export async function editarCliente(id: string, datos: Partial<Cliente>): Promise<Cliente> {
  const ref = doc(db, "clientes", id);
  await updateDoc(ref, { ...datos, updatedAt: new Date().toISOString() });
  const snap = await getDoc(ref);
  return { id, ...snap.data() } as Cliente;
}

export async function eliminarCliente(id: string): Promise<void> {
  const ref = doc(db, "clientes", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Cliente no encontrado.");
  // Guardar en historial antes de eliminar
  const historialRef = doc(collection(db, "clientes_eliminados"));
  await setDoc(historialRef, {
    ...snap.data(),
    clienteId: id,
    eliminadoEn: new Date().toISOString(),
  });
  await deleteDoc(ref);
}

// ─────────────────────────────────────────────────────────────────────────────
// Proveedores
// ─────────────────────────────────────────────────────────────────────────────
export async function obtenerProveedores(): Promise<Proveedor[]> {
  const snap = await getDocs(query(collection(db, "proveedores"), orderBy("nombre", "asc")));
  return snapToArray<Proveedor>(snap);
}

export async function crearProveedor(proveedor: Proveedor): Promise<Proveedor> {
  const codigo = await generarCorrelativo("proveedor");
  const data = { ...proveedor, codigo, createdAt: new Date().toISOString() };
  const ref = await addDoc(collection(db, "proveedores"), data);
  return { id: ref.id, ...data };
}

export async function importarProveedores(items: Proveedor[]): Promise<void> {
  const batch = writeBatch(db);
  items.forEach((p) => {
    const ref = doc(collection(db, "proveedores"));
    batch.set(ref, { ...p, createdAt: new Date().toISOString() });
  });
  await batch.commit();
}

// ─────────────────────────────────────────────────────────────────────────────
// Responsables
// ─────────────────────────────────────────────────────────────────────────────
export async function obtenerResponsables(): Promise<Responsable[]> {
  const snap = await getDocs(query(collection(db, "responsables"), orderBy("nombre", "asc")));
  return snapToArray<Responsable>(snap);
}

export async function crearResponsable(responsable: Responsable): Promise<Responsable> {
  const data = { ...responsable, createdAt: new Date().toISOString() };
  const ref = await addDoc(collection(db, "responsables"), data);
  return { id: ref.id, ...data };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Stats
// ─────────────────────────────────────────────────────────────────────────────
export async function obtenerStats(): Promise<DashboardStats> {
  const [ordenes, pedidos, facturas, cotizaciones] = await Promise.all([
    getDocs(query(collection(db, "ordenes_cliente"), where("estado", "in", ["pendiente", "parcial"]))),
    getDocs(query(collection(db, "pedidos_proveedor"), where("estado", "in", ["pendiente", "en_transito", "parcial"]))),
    getDocs(collection(db, "facturas")),
    getDocs(collection(db, "cotizaciones")),
  ]);
  let cxcMonto = 0;
  facturas.forEach((d) => { cxcMonto += d.data().saldoPendiente || 0; });
  return {
    ordenesActivas: ordenes.size,
    enImportacion: pedidos.size,
    cxcMonto,
    presupuestos: cotizaciones.size,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Cotizaciones
// ─────────────────────────────────────────────────────────────────────────────
export async function obtenerCotizaciones(): Promise<Cotizacion[]> {
  const snap = await getDocs(query(collection(db, "cotizaciones"), orderBy("createdAt", "desc")));
  return snapToArray<Cotizacion>(snap).filter(c => c.estado !== 'requerimiento' && c.estado !== 'presupuestado');
}

export async function crearCotizacion(
  clienteId: string,
  clienteNombre: string,
  items: Array<{ sku: string; descripcion: string; detalles?: string; modelo?: string; cantidad: number; precioUnitario: number }>,
  fecha?: string,
  responsableId?: string,
  responsableNombre?: string,
  flete?: number,
  arancel?: number,
  otrosGastos?: number,
  meta?: Partial<Cotizacion>
): Promise<Cotizacion> {
  const id = await generarCorrelativo("cotizacion");
  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);
  const data: Omit<Cotizacion, "id"> = {
    clienteId, clienteNombre, items,
    fecha: fecha || new Date().toISOString(),
    estado: "borrador",
    subtotal, impuestos: 0,
    flete: flete || 0,
    arancel: arancel || 0,
    otrosGastos: otrosGastos || 0,
    total: subtotal + (flete || 0) + (arancel || 0) + (otrosGastos || 0),
    responsableId, responsableNombre,
    createdAt: new Date().toISOString(),
    ...meta
  };
  await setDoc(doc(db, "cotizaciones", id), data);

  // Auto-registrar productos
  for (const item of items) {
    if (item.sku && item.descripcion) {
      await guardarProductoSiNoExiste(item.sku, item.descripcion, item.detalles);
    }
  }

  return { id, ...data };
}

export async function aprobarCotizacion(id: string): Promise<void> {
  await updateDoc(doc(db, "cotizaciones", id), { estado: "aprobado", updatedAt: new Date().toISOString() });
}

export async function revertirCotizacion(id: string): Promise<void> {
  await updateDoc(doc(db, "cotizaciones", id), { estado: "borrador", updatedAt: new Date().toISOString() });
}

export async function editarCotizacion(
  id: string,
  clienteId: string,
  clienteNombre: string,
  items: Array<{ sku: string; descripcion: string; detalles?: string; modelo?: string; cantidad: number; precioUnitario: number }>,
  fecha?: string,
  responsableId?: string,
  responsableNombre?: string,
  flete?: number,
  arancel?: number,
  otrosGastos?: number,
  meta?: Partial<Cotizacion>
): Promise<Cotizacion> {
  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);
  const updates = {
    clienteId, clienteNombre, items, fecha, subtotal, impuestos: 0,
    flete: flete || 0,
    arancel: arancel || 0,
    otrosGastos: otrosGastos || 0,
    total: subtotal + (flete || 0) + (arancel || 0) + (otrosGastos || 0),
    responsableId, responsableNombre,
    updatedAt: new Date().toISOString(),
    ...meta
  };
  await updateDoc(doc(db, "cotizaciones", id), updates);
  const snap = await getDoc(doc(db, "cotizaciones", id));
  
  // Auto-registrar productos
  for (const item of items) {
    if (item.sku && item.descripcion) {
      await guardarProductoSiNoExiste(item.sku, item.descripcion, item.detalles);
    }
  }
  
  return { id, ...snap.data() } as Cotizacion;
}

export async function anularCotizacion(id: string): Promise<void> {
  await updateDoc(doc(db, "cotizaciones", id), { estado: "anulado", updatedAt: new Date().toISOString() });
}

export async function importarCotizaciones(items: any[]): Promise<void> {
  const batch = writeBatch(db);
  for (const c of items) {
    const id = await generarCorrelativo("cotizacion");
    batch.set(doc(db, "cotizaciones", id), { ...c, createdAt: new Date().toISOString() });
  }
  await batch.commit();
}

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo de Productos
// ─────────────────────────────────────────────────────────────────────────────
export async function obtenerProductos(): Promise<Producto[]> {
  const snap = await getDocs(query(collection(db, "productos")));
  return snapToArray<Producto>(snap);
}

export async function guardarProductoSiNoExiste(sku: string, descripcion: string, detalles?: string): Promise<void> {
  if (!sku || !sku.trim()) return;
  const normalizedSku = sku.trim().toUpperCase();
  const q = query(collection(db, "productos"), where("sku", "==", normalizedSku));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, "productos"), {
      sku: normalizedSku,
      descripcion: descripcion.trim(),
      detalles: detalles || "",
      createdAt: new Date().toISOString()
    });
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Requerimientos (Pedidos Entrantes)
// ─────────────────────────────────────────────────────────────────────────────
export async function obtenerRequerimientos(): Promise<Cotizacion[]> {
  const snap = await getDocs(query(collection(db, "cotizaciones"), orderBy("createdAt", "desc")));
  return snapToArray<Cotizacion>(snap).filter(c => c.estado === 'requerimiento' || c.estado === 'presupuestado');
}

export async function crearRequerimiento(
  clienteId: string,
  clienteNombre: string,
  items: Array<{ sku: string; descripcion: string; detalles?: string; modelo?: string; cantidad: number; precioUnitario: number }>,
  fecha?: string,
  responsableId?: string,
  responsableNombre?: string,
  flete?: number,
  arancel?: number,
  otrosGastos?: number,
  meta?: Partial<Cotizacion>
): Promise<Cotizacion> {
  const id = await generarCorrelativo("pedido");
  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);
  const data: Omit<Cotizacion, "id"> = {
    clienteId, clienteNombre, items,
    fecha: fecha || new Date().toISOString(),
    estado: "requerimiento",
    subtotal, impuestos: 0,
    flete: flete || 0,
    arancel: arancel || 0,
    otrosGastos: otrosGastos || 0,
    total: subtotal + (flete || 0) + (arancel || 0) + (otrosGastos || 0),
    responsableId, responsableNombre,
    createdAt: new Date().toISOString(),
    ...meta
  };
  await setDoc(doc(db, "cotizaciones", id), data);

  // Auto-registrar productos
  for (const item of items) {
    if (item.sku && item.descripcion) {
      await guardarProductoSiNoExiste(item.sku, item.descripcion, item.detalles);
    }
  }

  return { id, ...data };
}

export async function editarRequerimiento(
  id: string,
  clienteId: string,
  clienteNombre: string,
  items: Array<{ sku: string; descripcion: string; detalles?: string; modelo?: string; cantidad: number; precioUnitario: number }>,
  fecha?: string,
  responsableId?: string,
  responsableNombre?: string,
  flete?: number,
  arancel?: number,
  otrosGastos?: number,
  meta?: Partial<Cotizacion>
): Promise<Cotizacion> {
  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precioUnitario, 0);
  const total = subtotal + (flete || 0) + (arancel || 0) + (otrosGastos || 0);
  const updates = { 
    clienteId, clienteNombre, items, fecha, 
    subtotal, flete, arancel, otrosGastos, total, 
    responsableId, responsableNombre, 
    updatedAt: new Date().toISOString(),
    ...meta
  };
  await updateDoc(doc(db, "cotizaciones", id), updates);
  const snap = await getDoc(doc(db, "cotizaciones", id));
  
  // Auto-registrar productos
  for (const item of items) {
    if (item.sku && item.descripcion) {
      await guardarProductoSiNoExiste(item.sku, item.descripcion, item.detalles);
    }
  }
  
  return { id, ...snap.data() } as Cotizacion;
}

export async function aprobarRequerimiento(id: string): Promise<void> {
  const reqRef = doc(db, "cotizaciones", id);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error("Pedido no encontrado.");
  const reqData = reqSnap.data() as Cotizacion;

  const newId = await generarCorrelativo("cotizacion");
  const newCotizacion: Omit<Cotizacion, "id"> = {
    ...reqData,
    estado: "borrador",
    createdAt: new Date().toISOString(),
    pedidoOrigenId: id
  };
  
  const batch = writeBatch(db);
  batch.set(doc(db, "cotizaciones", newId), newCotizacion);
  batch.update(reqRef, { estado: "presupuestado", updatedAt: new Date().toISOString() });
  await batch.commit();
}

export async function anularRequerimiento(id: string): Promise<void> {
  await updateDoc(doc(db, "cotizaciones", id), { estado: "anulado", updatedAt: new Date().toISOString() });
}

export async function eliminarRequerimiento(id: string): Promise<void> {
  await deleteDoc(doc(db, "cotizaciones", id));
}

export async function eliminarCotizacion(id: string): Promise<void> {
  await deleteDoc(doc(db, "cotizaciones", id));
}

export async function revertirRequerimiento(id: string): Promise<void> {
  await updateDoc(doc(db, "cotizaciones", id), { estado: "requerimiento", updatedAt: new Date().toISOString() });
}

// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Órdenes de Clientes
// ─────────────────────────────────────────────────────────────────────────────
export async function obtenerOrdenesCliente(): Promise<OrdenCliente[]> {
  const snap = await getDocs(query(collection(db, "ordenes_cliente"), orderBy("createdAt", "desc")));
  return snapToArray<OrdenCliente>(snap);
}

export async function crearOrdenCliente(
  clienteId: string,
  clienteNombre: string,
  items: Array<{ sku: string; descripcion: string; detalles?: string; cantidadPedida: number; precioUnitario: number; proveedores?: { proveedorId: string; proveedorNombre: string; cantidad: number }[] }>,
  fecha?: string,
  responsableId?: string,
  responsableNombre?: string,
  observaciones?: string
): Promise<OrdenCliente> {
  const id = await generarCorrelativo("orden_cliente");
  const montoTotal = items.reduce((s, i) => s + i.cantidadPedida * i.precioUnitario * 1.16, 0);
  const fullItems = items.map((i) => ({ 
    ...i, 
    cantidadRecibida: 0, 
    cantidadEntregada: 0,
    proveedores: i.proveedores || []
  }));
  const data: Omit<OrdenCliente, "id"> = {
    clienteId, clienteNombre,
    fecha: fecha || new Date().toISOString(),
    estado: "pendiente",
    items: fullItems as any[],
    montoTotal,
    responsableId, responsableNombre,
    observaciones,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, "ordenes_cliente", id), data);
  await sincronizarPedidosProveedor();

  // Auto-registrar productos
  for (const item of items) {
    if (item.sku && item.descripcion) {
      await guardarProductoSiNoExiste(item.sku, item.descripcion, item.detalles);
    }
  }

  return { id, ...data };
}

export async function editarOrdenCliente(
  id: string,
  clienteId: string,
  clienteNombre: string,
  items: Array<{ sku: string; descripcion: string; detalles?: string; cantidadPedida: number; precioUnitario: number; proveedores?: { proveedorId: string; proveedorNombre: string; cantidad: number }[]; cantidadRecibida?: number; cantidadEntregada?: number }>,
  fecha?: string,
  responsableId?: string,
  responsableNombre?: string,
  observaciones?: string
): Promise<OrdenCliente> {
  const montoTotal = items.reduce((s, i) => s + i.cantidadPedida * i.precioUnitario * 1.16, 0);
  const fullItems = items.map((i) => ({
    sku: i.sku,
    descripcion: i.descripcion,
    cantidadPedida: i.cantidadPedida,
    precioUnitario: i.precioUnitario,
    cantidadRecibida: i.cantidadRecibida || 0,
    cantidadEntregada: i.cantidadEntregada || 0,
    proveedores: i.proveedores || []
  }));
  const updates = { 
    clienteId, 
    clienteNombre, 
    items: fullItems, 
    fecha, 
    montoTotal, 
    responsableId, 
    responsableNombre, 
    updatedAt: new Date().toISOString() 
  };
  await updateDoc(doc(db, "ordenes_cliente", id), updates);
  await sincronizarPedidosProveedor();
  const snap = await getDoc(doc(db, "ordenes_cliente", id));

  // Auto-registrar productos
  for (const item of items) {
    if (item.sku && item.descripcion) {
      await guardarProductoSiNoExiste(item.sku, item.descripcion, item.detalles);
    }
  }

  return { id, ...snap.data() } as OrdenCliente;
}

export async function anularOrdenCliente(id: string): Promise<void> {
  await updateDoc(doc(db, "ordenes_cliente", id), { estado: "anulado", updatedAt: new Date().toISOString() });
  await sincronizarPedidosProveedor();
}

export async function importarOrdenes(items: any[]): Promise<void> {
  const batch = writeBatch(db);
  for (const o of items) {
    const id = await generarCorrelativo("orden_cliente");
    batch.set(doc(db, "ordenes_cliente", id), { ...o, createdAt: new Date().toISOString() });
  }
  await batch.commit();
  await sincronizarPedidosProveedor();
}

// ─────────────────────────────────────────────────────────────────────────────
// Pedidos a Proveedor
// ─────────────────────────────────────────────────────────────────────────────
export async function obtenerPedidosProveedor(): Promise<PedidoProveedor[]> {
  const snap = await getDocs(query(collection(db, "pedidos_proveedor"), orderBy("createdAt", "desc")));
  return snapToArray<PedidoProveedor>(snap);
}

export async function crearPedidoProveedor(
  proveedorId: string,
  proveedorNombre: string,
  items: Array<{ sku: string; descripcion?: string; detalles?: string; cantidadPedida: number }>,
  fecha?: string,
  responsableId?: string,
  responsableNombre?: string,
  observaciones?: string
): Promise<PedidoProveedor> {
  const id = await generarCorrelativo("pedido_proveedor");
  const fullItems = items.map((i) => ({ ...i, cantidadRecibida: 0, ordenesAsociadas: [] }));
  const data: Omit<PedidoProveedor, "id"> = {
    proveedorId, proveedorNombre,
    fecha: fecha || new Date().toISOString(),
    estado: "pendiente",
    items: fullItems,
    responsableId, responsableNombre,
    observaciones,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, "pedidos_proveedor", id), data);
  return { id, ...data };
}

export async function editarPedidoProveedor(
  id: string,
  proveedorId: string,
  proveedorNombre: string,
  items: Array<{ sku: string; descripcion?: string; detalles?: string; cantidadPedida: number; costoUnitario?: number }>,
  fecha?: string,
  responsableId?: string,
  responsableNombre?: string,
  observaciones?: string
): Promise<PedidoProveedor> {
  const updates = { proveedorId, proveedorNombre, items, fecha, responsableId, responsableNombre, updatedAt: new Date().toISOString() };
  await updateDoc(doc(db, "pedidos_proveedor", id), updates);
  const snap = await getDoc(doc(db, "pedidos_proveedor", id));
  return { id, ...snap.data() } as PedidoProveedor;
}

export async function anularPedidoProveedor(id: string): Promise<void> {
  await updateDoc(doc(db, "pedidos_proveedor", id), { estado: "anulado", updatedAt: new Date().toISOString() });
}

// ─────────────────────────────────────────────────────────────────────────────
// Despachos / Notas de Entrega
// ─────────────────────────────────────────────────────────────────────────────
export async function obtenerDespachos(): Promise<NotaEntrega[]> {
  const snap = await getDocs(query(collection(db, "notas_entrega"), orderBy("createdAt", "desc")));
  return snapToArray<NotaEntrega>(snap);
}

export async function crearDespacho(
  ordenClienteId: string,
  itemsDespachados: Array<{ sku: string; cantidadDespachada: number }>
): Promise<any> {
  const id = await generarCorrelativo("despacho");
  const result = await runTransaction(db, async (transaction) => {
    const ordenRef = doc(db, "ordenes_cliente", ordenClienteId);
    const ordenSnap = await transaction.get(ordenRef);
    if (!ordenSnap.exists()) throw new Error("Orden de cliente no encontrada.");
    const orden = ordenSnap.data() as OrdenCliente;

    // Actualizar cantidad entregada en los items de la orden
    const updatedItems = orden.items.map((item) => {
      const dItem = itemsDespachados.find((di) => di.sku === item.sku);
      if (dItem) {
        const nuevaEntregada = (item.cantidadEntregada || 0) + dItem.cantidadDespachada;
        if (nuevaEntregada > (item.cantidadRecibida || 0)) {
          throw new Error(`No se puede despachar más de lo recibido para el SKU ${item.sku}.`);
        }
        return { ...item, cantidadEntregada: nuevaEntregada };
      }
      return item;
    });

    const total = itemsDespachados.reduce((s, i) => {
      const item = orden.items.find((oi) => oi.sku === i.sku);
      return s + i.cantidadDespachada * (item?.precioUnitario || 0);
    }, 0);

    const data = {
      clienteId: orden.clienteId,
      clienteNombre: orden.clienteNombre,
      ordenClienteId,
      fecha: new Date().toISOString(),
      estado: "pendiente_facturacion",
      items: itemsDespachados,
      total,
      createdAt: new Date().toISOString(),
    };

    // Registrar el despacho
    transaction.set(doc(db, "notas_entrega", id), data);
    // Guardar los items actualizados en la orden
    transaction.update(ordenRef, { items: updatedItems, updatedAt: new Date().toISOString() });

    return { id, ...data };
  });

  return result;
}

export async function anularDespacho(despachoId: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const despachoRef = doc(db, "notas_entrega", despachoId);
    const despachoSnap = await transaction.get(despachoRef);
    if (!despachoSnap.exists()) throw new Error("Despacho no encontrado.");
    const despacho = despachoSnap.data();

    if (despacho.estado === "anulado") {
      return; // Ya está anulado
    }
    if (despacho.estado === "facturado") {
      throw new Error("No se puede anular un despacho facturado. Debe anular primero la factura correspondiente.");
    }

    // Actualizar la orden de cliente
    const ordenRef = doc(db, "ordenes_cliente", despacho.ordenClienteId);
    const ordenSnap = await transaction.get(ordenRef);
    if (ordenSnap.exists()) {
      const orden = ordenSnap.data() as OrdenCliente;
      const updatedItems = orden.items.map((item) => {
        const dItem = despacho.items.find((di: any) => di.sku === item.sku);
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

    // Cambiar estado a anulado
    transaction.update(despachoRef, { estado: "anulado", updatedAt: new Date().toISOString() });
  });
}

export async function anularFactura(facturaId: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const facturaRef = doc(db, "facturas", facturaId);
    const facturaSnap = await transaction.get(facturaRef);
    if (!facturaSnap.exists()) throw new Error("Factura no encontrada.");
    const factura = facturaSnap.data() as Factura;

    if (factura.estado === "anulada") {
      return; // Ya está anulada
    }
    if (factura.saldoPendiente < factura.totalFactura) {
      throw new Error("No se puede anular una factura con cobros o abonos registrados. Debe anular los cobros primero.");
    }

    // Regresar despachos asociados al estado pendiente_facturacion
    if (Array.isArray(factura.notasEntregaIds)) {
      for (const desId of factura.notasEntregaIds) {
        const desRef = doc(db, "notas_entrega", desId);
        const desSnap = await transaction.get(desRef);
        if (desSnap.exists()) {
          transaction.update(desRef, { estado: "pendiente_facturacion", updatedAt: new Date().toISOString() });
        }
      }
    }

    // Cambiar estado a anulada
    transaction.update(facturaRef, { estado: "anulada", saldoPendiente: 0, updatedAt: new Date().toISOString() });
  });
}

export async function actualizarFactura(facturaId: string, updates: Partial<Factura>): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const ref = doc(db, "facturas", facturaId);
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error("Factura no encontrada.");
    const currentData = snap.data() as Factura;

    if (currentData.estado === "anulada") {
      throw new Error("No se puede editar una factura anulada.");
    }

    let nuevoSaldo = currentData.saldoPendiente;
    if (updates.totalFactura !== undefined) {
      const cobrado = currentData.totalFactura - currentData.saldoPendiente;
      nuevoSaldo = Math.max(0, updates.totalFactura - cobrado);
    }

    transaction.update(ref, {
      ...updates,
      saldoPendiente: nuevoSaldo,
      updatedAt: new Date().toISOString()
    });
  });
}

export async function crearFacturaDesdeDespachos(
  despachoIds: string[], 
  options?: { 
    subtotalCustom?: number;
    items?: FacturaItem[];
    tasaCambio?: number; 
    flete?: number; 
    otrosGastos?: number;
    bancoSeleccionado?: string;
    observaciones?: string;
  }
): Promise<any> {
  if (!despachoIds || despachoIds.length === 0) throw new Error("Debe seleccionar al menos un despacho.");
  
  const id = await generarCorrelativo("factura");

  const result = await runTransaction(db, async (transaction) => {
    // 1. Obtener la configuración del IVA
    const ivaRef = doc(db, "configuracion", "iva");
    const ivaSnap = await transaction.get(ivaRef);
    const ivaConfig = ivaSnap.exists() ? ivaSnap.data() as IVAConfig : { sigla: "IVA", porcentaje: 16, activo: true };

    let clienteId = "";
    let clienteNombre = "";
    let subtotalConsolidado = 0;

    // 2. Verificar y sumar cada despacho
    for (const desId of despachoIds) {
      const desRef = doc(db, "notas_entrega", desId);
      const desSnap = await transaction.get(desRef);
      if (!desSnap.exists()) throw new Error(`Despacho ${desId} no encontrado.`);
      const des = desSnap.data();

      if (des.estado !== "pendiente_facturacion") {
        throw new Error(`El despacho ${desId} ya ha sido facturado o está anulado.`);
      }

      if (!clienteId) {
        clienteId = des.clienteId;
        clienteNombre = des.clienteNombre;
      } else if (clienteId !== des.clienteId) {
        throw new Error("No se pueden consolidar despachos de diferentes clientes en una sola factura.");
      }

      subtotalConsolidado += des.total;

      // Actualizar estado del despacho a facturado
      transaction.update(desRef, { estado: "facturado", updatedAt: new Date().toISOString() });
    }

    if (options?.subtotalCustom !== undefined && !isNaN(options.subtotalCustom)) {
      subtotalConsolidado = options.subtotalCustom;
    }

    const flete = options?.flete || 0;
    const otrosGastos = options?.otrosGastos || 0;
    const porcentajeIVA = ivaConfig.activo ? (ivaConfig.porcentaje / 100) : 0;
    const impuestos = subtotalConsolidado * porcentajeIVA;
    const totalFactura = subtotalConsolidado + flete + otrosGastos + impuestos;

    const facturaData = {
      clienteId,
      clienteNombre,
      fecha: new Date().toISOString(),
      notasEntregaIds: despachoIds,
      items: options?.items || [],
      subtotal: subtotalConsolidado,
      flete,
      otrosGastos,
      impuestos,
      totalFactura,
      saldoPendiente: totalFactura,
      tasaCambio: options?.tasaCambio || null,
      totalBs: options?.tasaCambio ? totalFactura * options.tasaCambio : null,
      estado: "pendiente",
      observaciones: options?.observaciones || "",
      bancoSeleccionado: options?.bancoSeleccionado || "",
      createdAt: new Date().toISOString()
    };

    transaction.set(doc(db, "facturas", id), facturaData);

    return { id, ...facturaData };
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Facturas y CxC
// ─────────────────────────────────────────────────────────────────────────────
export async function obtenerFacturas(): Promise<Factura[]> {
  const snap = await getDocs(query(collection(db, "facturas"), orderBy("createdAt", "desc")));
  return snapToArray<Factura>(snap);
}

export async function registrarPagoFactura(
  facturaId: string,
  abono: Omit<AbonoCliente, "id" | "facturaId">
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const ref = doc(db, "facturas", facturaId);
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error("Factura no encontrada.");
    const factura = snap.data() as Factura;

    const nuevoSaldo = Math.max(0, (factura.saldoPendiente || 0) - abono.montoUSD);
    const nuevoEstado = nuevoSaldo === 0 ? "pagada" : "parcial";

    transaction.update(ref, {
      saldoPendiente: nuevoSaldo,
      estado: nuevoEstado,
      updatedAt: new Date().toISOString()
    });

    const abonoRef = doc(collection(db, "facturas", facturaId, "abonos"));
    transaction.set(abonoRef, {
      ...abono,
      createdAt: new Date().toISOString()
    });
  });
}

export async function obtenerAbonosFactura(facturaId: string): Promise<AbonoCliente[]> {
  const snap = await getDocs(query(collection(db, "facturas", facturaId, "abonos"), orderBy("createdAt", "desc")));
  return snapToArray<AbonoCliente>(snap);
}

// ─────────────────────────────────────────────────────────────────────────────
// Recepción de Importación (lógica FIFO simplificada en cliente)
// ─────────────────────────────────────────────────────────────────────────────
export async function registrarRecepcionImportacion(
  pedidoProveedorId: string,
  contenedorId: string,
  itemsRecibidos: ItemRecibido[],
  distribucionManual?: Array<{
    ordenClienteId: string;
    sku: string;
    cantidadAsignada: number;
  }>
): Promise<ReconciliacionResponse> {
  const log: string[] = [];
  const distribucion: ReconciliacionResponse["distribucion"] = [];

  const response = await runTransaction(db, async (transaction) => {
    const pedidoRef = doc(db, "pedidos_proveedor", pedidoProveedorId);
    const pedidoSnap = await transaction.get(pedidoRef);
    if (!pedidoSnap.exists()) {
      throw new Error(`El pedido del proveedor con ID ${pedidoProveedorId} no existe.`);
    }

    const pedidoData = pedidoSnap.data() as PedidoProveedor;

    // Recopilar IDs de órdenes de clientes
    const allClientOrderIds = new Set<string>();
    pedidoData.items.forEach(item => {
      if (Array.isArray(item.ordenesAsociadas)) {
        item.ordenesAsociadas.forEach(oa => {
          allClientOrderIds.add(oa.ordenClienteId);
        });
      }
    });

    // Cargar todas las órdenes de clientes involucradas
    const clientOrdersMap: Record<string, {
      id: string;
      ref: any;
      data: OrdenCliente;
      dirty: boolean;
    }> = {};

    for (const id of Array.from(allClientOrderIds)) {
      const orderRef = doc(db, "ordenes_cliente", id);
      const orderSnap = await transaction.get(orderRef);
      if (orderSnap.exists()) {
        clientOrdersMap[id] = {
          id,
          ref: orderRef,
          data: orderSnap.data() as OrdenCliente,
          dirty: false
        };
      }
    }

    // Cargar inventario existente
    const inventarioMap: Record<string, { ref: any, data: ItemInventario, dirty: boolean }> = {};
    for (const itemRecibido of itemsRecibidos) {
      const invRef = doc(db, "inventario", itemRecibido.sku);
      const invSnap = await transaction.get(invRef);
      if (invSnap.exists()) {
        inventarioMap[itemRecibido.sku] = { ref: invRef, data: invSnap.data() as ItemInventario, dirty: false };
      } else {
        const pedidoItem = pedidoData.items.find(i => i.sku === itemRecibido.sku);
        inventarioMap[itemRecibido.sku] = { 
          ref: invRef, 
          data: { 
            sku: itemRecibido.sku, 
            descripcion: pedidoItem?.descripcion || "", 
            cantidadDisponible: 0, 
            costoPromedio: pedidoItem?.costoUnitario || 0 
          }, 
          dirty: false 
        };
      }
    }

    // Procesar cada SKU recibido
    for (const itemRecibido of itemsRecibidos) {
      const { sku, cantidadRecibida } = itemRecibido;
      const pedidoItem = pedidoData.items.find(i => i.sku === sku);
      if (!pedidoItem) {
        log.push(`[Advertencia] SKU ${sku} no pertenece al pedido consolidado.`);
        continue;
      }

      let unidadesPorDistribuir = cantidadRecibida;

      if (distribucionManual && distribucionManual.length > 0) {
        // --- Distribución Manual ---
        const manualAllocations = distribucionManual.filter(d => d.sku === sku);
        for (const alloc of manualAllocations) {
          const clientOrder = clientOrdersMap[alloc.ordenClienteId];
          if (!clientOrder) continue;

          const orderItemIndex = clientOrder.data.items.findIndex(i => i.sku === sku);
          if (orderItemIndex !== -1) {
            const orderItem = clientOrder.data.items[orderItemIndex];
            const cantidadAsignada = Math.min(unidadesPorDistribuir, alloc.cantidadAsignada);
            if (cantidadAsignada > 0) {
              orderItem.cantidadRecibida = (orderItem.cantidadRecibida || 0) + cantidadAsignada;
              clientOrder.dirty = true;

              // Actualizar traza en el pedido del proveedor
              const oaEnPedido = pedidoItem.ordenesAsociadas?.find(o => o.ordenClienteId === alloc.ordenClienteId);
              if (oaEnPedido) {
                oaEnPedido.cantidadRecibida = (oaEnPedido.cantidadRecibida || 0) + cantidadAsignada;
              }

              unidadesPorDistribuir -= cantidadAsignada;
              distribucion.push({
                ordenClienteId: alloc.ordenClienteId,
                clienteNombre: clientOrder.data.clienteNombre,
                sku,
                cantidadAsignada
              });
              log.push(`[Manual] Asignadas ${cantidadAsignada} unidades de ${sku} a la orden ${alloc.ordenClienteId} (Cliente: ${clientOrder.data.clienteNombre})`);
            }
          }
        }
      } else {
        // --- Distribución FIFO ---
        const ordenesAsociadas = pedidoItem.ordenesAsociadas || [];
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

        for (const oa of ordenesAsociadasConFecha) {
          if (unidadesPorDistribuir <= 0) break;

          const clientOrder = clientOrdersMap[oa.ordenClienteId];
          const orderItemIndex = clientOrder.data.items.findIndex(i => i.sku === sku);

          if (orderItemIndex !== -1) {
            const orderItem = clientOrder.data.items[orderItemIndex];
            const pendiente = (orderItem.cantidadPedida || 0) - (orderItem.cantidadRecibida || 0);

            if (pendiente > 0) {
              const cantidadAsignada = Math.min(unidadesPorDistribuir, pendiente);
              orderItem.cantidadRecibida = (orderItem.cantidadRecibida || 0) + cantidadAsignada;
              clientOrder.dirty = true;

              // Actualizar traza en el pedido del proveedor
              const oaEnPedido = pedidoItem.ordenesAsociadas?.find(o => o.ordenClienteId === oa.ordenClienteId);
              if (oaEnPedido) {
                oaEnPedido.cantidadRecibida = (oaEnPedido.cantidadRecibida || 0) + cantidadAsignada;
              }

              unidadesPorDistribuir -= cantidadAsignada;
              distribucion.push({
                ordenClienteId: oa.ordenClienteId,
                clienteNombre: clientOrder.data.clienteNombre,
                sku,
                cantidadAsignada
              });
              log.push(`[FIFO] Asignadas ${cantidadAsignada} unidades de ${sku} a la orden ${oa.ordenClienteId} (Cliente: ${clientOrder.data.clienteNombre})`);
            }
          }
        }
      }

      // Actualizar cantidad recibida total del SKU en el pedido del proveedor
      pedidoItem.cantidadRecibida = (pedidoItem.cantidadRecibida || 0) + (cantidadRecibida - unidadesPorDistribuir);

      // Registrar sobrante como excedente
      if (unidadesPorDistribuir > 0) {
        log.push(`[Excedente] ${unidadesPorDistribuir} unidades de ${sku} al inventario general.`);
        distribucion.push({
          ordenClienteId: "EXCEDENTE_ALMACEN",
          clienteNombre: "Inventario General (Excedente)",
          sku,
          cantidadAsignada: unidadesPorDistribuir
        });

        const invEntry = inventarioMap[sku];
        if (invEntry) {
          invEntry.data.cantidadDisponible += unidadesPorDistribuir;
          invEntry.dirty = true;
        }
      }
    }

    // Actualizar órdenes modificadas
    for (const orderId in clientOrdersMap) {
      const clientOrder = clientOrdersMap[orderId];
      if (clientOrder.dirty) {
        let totalPedidas = 0;
        let totalRecibidas = 0;
        clientOrder.data.items.forEach(item => {
          totalPedidas += item.cantidadPedida || 0;
          totalRecibidas += item.cantidadRecibida || 0;
        });

        if (totalRecibidas === 0) {
          clientOrder.data.estado = "pendiente";
        } else if (totalRecibidas >= totalPedidas) {
          clientOrder.data.estado = "completada";
        } else {
          clientOrder.data.estado = "parcial";
        }
        clientOrder.data.updatedAt = new Date().toISOString();
        transaction.set(clientOrder.ref, clientOrder.data);
      }
    }

    // Actualizar pedido del proveedor
    let totalItemsPedidas = 0;
    let totalItemsRecibidas = 0;
    pedidoData.items.forEach(item => {
      totalItemsPedidas += item.cantidadPedida || 0;
      totalItemsRecibidas += item.cantidadRecibida || 0;
    });

    if (totalItemsRecibidas === 0) {
      pedidoData.estado = "pendiente";
    } else if (totalItemsRecibidas >= totalItemsPedidas) {
      pedidoData.estado = "recibido";
    } else {
      pedidoData.estado = "parcial";
    }
    pedidoData.updatedAt = new Date().toISOString();
    transaction.set(pedidoRef, pedidoData);

    // Actualizar Inventario (Almacén)
    for (const sku in inventarioMap) {
      if (inventarioMap[sku].dirty) {
        const entry = inventarioMap[sku];
        entry.data.updatedAt = new Date().toISOString();
        transaction.set(entry.ref, entry.data, { merge: true });
      }
    }

    // Escribir recepción en el historial
    const recepcionRef = doc(collection(db, "recepciones_importacion"));
    const recepcionData = {
      pedidoProveedorId,
      contenedorId,
      fecha: new Date().toISOString(),
      itemsRecibidos,
      distribucion,
      createdAt: new Date().toISOString()
    };
    transaction.set(recepcionRef, recepcionData);

    return { success: true, message: "Recepción e importación conciliada correctamente.", log, distribucion };
  });

  return response;
}

export async function obtenerRecepcionesImportacion(): Promise<RecepcionImportacion[]> {
  const snap = await getDocs(query(collection(db, "recepciones_importacion"), orderBy("createdAt", "desc")));
  return snapToArray<RecepcionImportacion>(snap);
}

export async function actualizarRecepcionImportacion(
  id: string,
  datos: Partial<RecepcionImportacion>
): Promise<void> {
  const ref = doc(db, "recepciones_importacion", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Recepción no encontrada.");

  const recepcionData = snap.data() as RecepcionImportacion;
  const pedidoProveedorId = recepcionData.pedidoProveedorId;
  const itemsRecibidos = datos.itemsRecibidos || recepcionData.itemsRecibidos || [];

  let distribucion: DistribucionRecepcion[] = [];

  if (datos.itemsRecibidos && pedidoProveedorId) {
    const pedidoRef = doc(db, "pedidos_proveedor", pedidoProveedorId);
    const pedidoSnap = await getDoc(pedidoRef);
    if (pedidoSnap.exists()) {
      const pedidoData = pedidoSnap.data() as PedidoProveedor;

      const allClientOrderIds = new Set<string>();
      pedidoData.items.forEach(item => {
        if (Array.isArray(item.ordenesAsociadas)) {
          item.ordenesAsociadas.forEach(oa => allClientOrderIds.add(oa.ordenClienteId));
        }
      });

      const clientOrdersMap: Record<string, OrdenCliente> = {};
      for (const orderId of Array.from(allClientOrderIds)) {
        const orderSnap = await getDoc(doc(db, "ordenes_cliente", orderId));
        if (orderSnap.exists()) {
          clientOrdersMap[orderId] = orderSnap.data() as OrdenCliente;
        }
      }

      for (const itemRecibido of itemsRecibidos) {
        const { sku, cantidadRecibida } = itemRecibido;
        const pedidoItem = pedidoData.items.find(i => i.sku === sku);
        let unidadesPorDistribuir = cantidadRecibida;

        if (pedidoItem) {
          const ordenesAsociadas = pedidoItem.ordenesAsociadas || [];
          const ordenesAsociadasConFecha = ordenesAsociadas
            .map(oa => ({
              ...oa,
              fechaOrden: clientOrdersMap[oa.ordenClienteId] ? new Date(clientOrdersMap[oa.ordenClienteId].fecha).getTime() : 0,
              exists: !!clientOrdersMap[oa.ordenClienteId]
            }))
            .filter(oa => oa.exists)
            .sort((a, b) => a.fechaOrden - b.fechaOrden);

          for (const oa of ordenesAsociadasConFecha) {
            if (unidadesPorDistribuir <= 0) break;
            const clientOrder = clientOrdersMap[oa.ordenClienteId];
            if (clientOrder) {
              const orderItem = clientOrder.items.find(i => i.sku === sku);
              if (orderItem) {
                const pendiente = (orderItem.cantidadPedida || 0);
                const cantidadAsignada = Math.min(unidadesPorDistribuir, pendiente > 0 ? pendiente : unidadesPorDistribuir);
                if (cantidadAsignada > 0) {
                  unidadesPorDistribuir -= cantidadAsignada;
                  distribucion.push({
                    ordenClienteId: oa.ordenClienteId,
                    clienteNombre: clientOrder.clienteNombre,
                    sku,
                    cantidadAsignada
                  });
                }
              }
            }
          }
        }

        // Registrar todo lo sobrante como excedente que ingresa al Almacén General
        if (unidadesPorDistribuir > 0) {
          distribucion.push({
            ordenClienteId: "EXCEDENTE_ALMACEN",
            clienteNombre: "Inventario General (Excedente Almacén)",
            sku,
            cantidadAsignada: unidadesPorDistribuir
          });

          // Actualizar inventario general
          const invRef = doc(db, "inventario", sku);
          const invSnap = await getDoc(invRef);
          if (invSnap.exists()) {
            const invData = invSnap.data();
            await updateDoc(invRef, {
              cantidadDisponible: (invData.cantidadDisponible || 0) + unidadesPorDistribuir,
              updatedAt: new Date().toISOString()
            });
          } else {
            const pedidoItem = pedidoData?.items.find(i => i.sku === sku);
            await setDoc(invRef, {
              sku,
              descripcion: pedidoItem?.descripcion || "",
              cantidadDisponible: unidadesPorDistribuir,
              costoPromedio: pedidoItem?.costoUnitario || 0,
              createdAt: new Date().toISOString()
            });
          }
        }
      }
    }
  }

  const updates: any = {
    ...datos,
    updatedAt: new Date().toISOString()
  };
  if (distribucion.length > 0) {
    updates.distribucion = distribucion;
  }

  await updateDoc(ref, updates);
}

export async function eliminarRecepcionImportacion(id: string): Promise<void> {
  const ref = doc(db, "recepciones_importacion", id);
  await deleteDoc(ref);
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuración de Secuencias
// ─────────────────────────────────────────────────────────────────────────────
export async function obtenerSecuencias(): Promise<SecuenciasMap> {
  const ref = doc(db, "configuracion", "secuencias");
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, DEFAULT_SECUENCIAS);
    return { ...DEFAULT_SECUENCIAS };
  }
  return snap.data() as SecuenciasMap;
}

export async function actualizarSecuencias(secuencias: SecuenciasMap): Promise<void> {
  await setDoc(doc(db, "configuracion", "secuencias"), secuencias);
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuración de Empresa
// ─────────────────────────────────────────────────────────────────────────────
export interface EmpresaConfig {
  nombre: string;
  rif?: string;
  logoUrl?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  bancoNombre1?: string;
  bancoDetalle1?: string;
  bancoNombre2?: string;
  bancoDetalle2?: string;
  bancoNombre3?: string;
  bancoDetalle3?: string;
  bancoNombre4?: string;
  bancoDetalle4?: string;
  updatedAt?: string;
}

export async function obtenerEmpresa(): Promise<EmpresaConfig> {
  const ref = doc(db, "configuracion", "empresa");
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { 
      nombre: "Mi Empresa ERP", 
      rif: "", 
      logoUrl: "", 
      direccion: "", 
      telefono: "", 
      email: "",
      bancoNombre1: "",
      bancoDetalle1: "",
      bancoNombre2: "",
      bancoDetalle2: "",
      bancoNombre3: "",
      bancoDetalle3: "",
      bancoNombre4: "",
      bancoDetalle4: ""
    };
  }
  const data = snap.data();
  return {
    nombre: data.nombre || "Mi Empresa ERP",
    rif: data.rif || "",
    logoUrl: data.logoUrl || "",
    direccion: data.direccion || "",
    telefono: data.telefono || "",
    email: data.email || "",
    bancoNombre1: data.bancoNombre1 || "",
    bancoDetalle1: data.bancoDetalle1 || "",
    bancoNombre2: data.bancoNombre2 || "",
    bancoDetalle2: data.bancoDetalle2 || "",
    bancoNombre3: data.bancoNombre3 || "",
    bancoDetalle3: data.bancoDetalle3 || "",
    bancoNombre4: data.bancoNombre4 || "",
    bancoDetalle4: data.bancoDetalle4 || "",
    updatedAt: data.updatedAt
  };
}

export async function actualizarEmpresa(datos: EmpresaConfig): Promise<void> {
  await setDoc(doc(db, "configuracion", "empresa"), {
    ...datos,
    updatedAt: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuración de IVA (solo aplica a Facturas)
// ─────────────────────────────────────────────────────────────────────────────
export interface IVAConfig {
  sigla: string;       // Ej: "IVA", "IGV", "IVA+IGTF"
  porcentaje: number;  // Ej: 16, 18, 0
  activo: boolean;     // Si false, las facturas tampoco llevan impuesto
}

const DEFAULT_IVA: IVAConfig = { sigla: "IVA", porcentaje: 16, activo: true };

export async function obtenerConfigIVA(): Promise<IVAConfig> {
  const ref = doc(db, "configuracion", "iva");
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ...DEFAULT_IVA };
  return snap.data() as IVAConfig;
}

export async function actualizarConfigIVA(config: IVAConfig): Promise<void> {
  await setDoc(doc(db, "configuracion", "iva"), {
    ...config,
    updatedAt: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Historial de Productos (para autocomplete en cotizaciones y órdenes)
// ─────────────────────────────────────────────────────────────────────────────
export interface ProductoHistorico {
  sku: string;
  descripcion: string;
  precioUnitario?: number;
}

export async function obtenerHistoricoProductos(): Promise<ProductoHistorico[]> {
  // Primero intentamos localStorage para respuesta instantánea
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem("erp_productos_historico");
    if (cached) {
      try { return JSON.parse(cached); } catch { /* continúa */ }
    }
  }
  // Si no hay caché, lo buscamos en Firestore
  const ref = doc(db, "configuracion", "productos_historico");
  const snap = await getDoc(ref);
  const productos: ProductoHistorico[] = snap.exists() ? (snap.data().items || []) : [];
  if (typeof window !== "undefined") {
    localStorage.setItem("erp_productos_historico", JSON.stringify(productos));
  }
  return productos;
}

export async function guardarProductosEnHistorico(
  nuevosItems: Array<{ sku: string; descripcion: string; precioUnitario?: number }>
): Promise<void> {
  const ref = doc(db, "configuracion", "productos_historico");
  const snap = await getDoc(ref);
  const existentes: ProductoHistorico[] = snap.exists() ? (snap.data().items || []) : [];

  // Fusionar: los nuevos actualizan el precio si el SKU ya existe
  const mapa = new Map<string, ProductoHistorico>(existentes.map((p) => [p.sku, p]));
  for (const item of nuevosItems) {
    if (item.sku?.trim()) {
      mapa.set(item.sku, {
        sku: item.sku,
        descripcion: item.descripcion || "",
        precioUnitario: item.precioUnitario ?? mapa.get(item.sku)?.precioUnitario,
      });
    }
  }

  const items = Array.from(mapa.values());
  await setDoc(ref, { items, updatedAt: new Date().toISOString() });

  // Actualizar caché local
  if (typeof window !== "undefined") {
    localStorage.setItem("erp_productos_historico", JSON.stringify(items));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sincronización Automática de Pedidos a Proveedor Consolidados
// ─────────────────────────────────────────────────────────────────────────────
export async function sincronizarPedidosProveedor(): Promise<void> {
  try {
    // 1. Obtener todas las órdenes de cliente activas (pendiente o parcial)
    const qOrds = query(collection(db, "ordenes_cliente"));
    const snapOrds = await getDocs(qOrds);
    const activeOrds = snapOrds.docs
      .map(d => ({ id: d.id, ...d.data() } as OrdenCliente))
      .filter(o => o.estado === "pendiente" || o.estado === "parcial");

    // 2. Obtener todos los pedidos a proveedores actuales que estén en estado 'pendiente'
    const qPeds = query(collection(db, "pedidos_proveedor"), where("estado", "==", "pendiente"));
    const snapPeds = await getDocs(qPeds);
    const pendingPeds = snapPeds.docs.map(d => ({ id: d.id, ...d.data() } as PedidoProveedor));

    // 3. Agrupar ítems de órdenes activas por proveedorId
    const itemsBySupplier: Record<string, {
      proveedorNombre: string;
      responsableId?: string;
      responsableNombre?: string;
      items: Record<string, {
        sku: string;
        descripcion: string;
        cantidadPedida: number;
        cantidadRecibida: number;
        ordenesAsociadas: Array<{ ordenClienteId: string; cantidadPrometida: number; cantidadRecibida: number }>;
      }>;
    }> = {};

    for (const ord of activeOrds) {
      for (const i of ord.items) {
        if (i.proveedores && i.proveedores.length > 0) {
          for (const p of i.proveedores) {
            if (p.proveedorId && p.proveedorId.trim()) {
              if (!itemsBySupplier[p.proveedorId]) {
                itemsBySupplier[p.proveedorId] = {
                  proveedorNombre: p.proveedorNombre || "Proveedor Desconocido",
                  responsableId: ord.responsableId,
                  responsableNombre: ord.responsableNombre,
                  items: {}
                };
              }
              const sku = i.sku;
              const supGroup = itemsBySupplier[p.proveedorId];
              
              if (!supGroup.items[sku]) {
                supGroup.items[sku] = {
                  sku,
                  descripcion: i.descripcion || "",
                  cantidadPedida: 0,
                  cantidadRecibida: 0,
                  ordenesAsociadas: []
                };
              }
              
              // Registrar asociación desde esta orden de cliente
              supGroup.items[sku].ordenesAsociadas.push({
                ordenClienteId: ord.id!,
                cantidadPrometida: p.cantidad,
                cantidadRecibida: 0 // En sincronización inicial, asume 0 hasta que PedidosProveedor lo actualice.
              });
              
              supGroup.items[sku].cantidadPedida += p.cantidad;
              // La cantidad recibida a nivel de Pedido Proveedor se calcula por otra vía (Recepciones)
            }
          }
        }
      }
    }

    // 4. Crear o Actualizar Pedidos a Proveedor
    const batch = writeBatch(db);
    const touchedPedIds = new Set<string>();

    for (const [provId, data] of Object.entries(itemsBySupplier)) {
      const existingPed = pendingPeds.find(p => p.proveedorId === provId);
      let itemsArray = Object.values(data.items);

      if (existingPed) {
        itemsArray = itemsArray.map(item => {
          const old = existingPed.items.find(i => i.sku === item.sku);
          return { ...item, costoUnitario: old?.costoUnitario || 0 };
        });
        const docRef = doc(db, "pedidos_proveedor", existingPed.id!);
        batch.update(docRef, {
          items: itemsArray,
          updatedAt: new Date().toISOString()
        });
        touchedPedIds.add(existingPed.id!);
      } else {
        const newId = await generarCorrelativo("pedido_proveedor");
        const docRef = doc(db, "pedidos_proveedor", newId);
        const newPedido: Omit<PedidoProveedor, "id"> = {
          proveedorId: provId,
          proveedorNombre: data.proveedorNombre,
          fecha: new Date().toISOString(),
          estado: "pendiente",
          items: itemsArray as any[],
          responsableId: data.responsableId,
          responsableNombre: data.responsableNombre,
          createdAt: new Date().toISOString()
        };
        batch.set(docRef, newPedido);
      }
    }

    // 5. Eliminar pedidos a proveedores pendientes que ya no tengan ítems asociados
    for (const ped of pendingPeds) {
      if (!touchedPedIds.has(ped.id!)) {
        const docRef = doc(db, "pedidos_proveedor", ped.id!);
        batch.delete(docRef);
      }
    }

    await batch.commit();
  } catch (error) {
    console.error("Error al sincronizar pedidos a proveedores:", error);
  }
}

export async function formalizarPedidoProveedor(id: string): Promise<void> {
  const ref = doc(db, "pedidos_proveedor", id);
  await updateDoc(ref, {
    estado: "formalizado",
    updatedAt: new Date().toISOString()
  });
}

export async function revertirPedidoProveedor(id: string): Promise<void> {
  const ref = doc(db, "pedidos_proveedor", id);
  await updateDoc(ref, {
    estado: "pendiente",
    updatedAt: new Date().toISOString()
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Almacén / Inventario
// ─────────────────────────────────────────────────────────────────────────────

export async function buscarCostoSKU(sku: string): Promise<number> {
  if (!sku) return 0;
  try {
    const pedsSnap = await getDocs(query(collection(db, "pedidos_proveedor")));
    for (const d of pedsSnap.docs) {
      const pData = d.data() as PedidoProveedor;
      const match = pData.items?.find(i => i.sku === sku);
      if (match && (match.costoUnitario || 0) > 0) {
        return match.costoUnitario!;
      }
    }

    const facsSnap = await getDocs(query(collection(db, "facturas_proveedor")));
    for (const d of facsSnap.docs) {
      const fData = d.data();
      if (Array.isArray(fData.items)) {
        const match = fData.items.find((i: any) => i.sku === sku);
        if (match && (match.precioUnitario || match.costoUnitario || 0) > 0) {
          return Number(match.precioUnitario || match.costoUnitario);
        }
      }
      if (fData.iaData && Array.isArray(fData.iaData.items)) {
        const match = fData.iaData.items.find((i: any) => i.sku === sku);
        if (match && (match.precioUnitario || 0) > 0) {
          return Number(match.precioUnitario);
        }
      }
    }

    const ordsSnap = await getDocs(query(collection(db, "ordenes_cliente")));
    for (const d of ordsSnap.docs) {
      const oData = d.data() as OrdenCliente;
      const match = oData.items?.find(i => i.sku === sku);
      if (match && (match.precioUnitario || 0) > 0) {
        return match.precioUnitario;
      }
    }
  } catch (e) {
    console.error("Error buscando costo de SKU", e);
  }
  return 0;
}

export async function obtenerInventario(): Promise<ItemInventario[]> {
  const ref = collection(db, "inventario");
  const snap = await getDocs(ref);
  const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ItemInventario));

  for (const item of items) {
    if (!item.costoPromedio || item.costoPromedio === 0) {
      const costoEncontrado = await buscarCostoSKU(item.sku);
      if (costoEncontrado > 0) {
        item.costoPromedio = costoEncontrado;
        updateDoc(doc(db, "inventario", item.sku), { costoPromedio: costoEncontrado }).catch(() => {});
      }
    }
  }

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// Facturas a Proveedor (Cuentas por Pagar)
// ─────────────────────────────────────────────────────────────────────────────
export async function obtenerFacturasProveedorPorPedido(pedidoId: string): Promise<any[]> {
  const q = query(collection(db, "facturas_proveedor"), where("pedidoProveedorId", "==", pedidoId));
  const snap = await getDocs(q);
  return snapToArray<any>(snap);
}

export async function actualizarFacturaProveedor(id: string, updates: any): Promise<void> {
  const ref = doc(db, "facturas_proveedor", id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: new Date().toISOString()
  });

  if (Array.isArray(updates.items)) {
    for (const item of updates.items) {
      if (item.sku && Number(item.precioUnitario || item.costoUnitario) > 0) {
        const invRef = doc(db, "inventario", item.sku);
        updateDoc(invRef, {
          costoPromedio: Number(item.precioUnitario || item.costoUnitario),
          updatedAt: new Date().toISOString()
        }).catch(() => {});
      }
    }
  }
}

export async function anularFacturaProveedor(id: string): Promise<void> {
  const ref = doc(db, "facturas_proveedor", id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    if (data.ordenesVinculadas && Array.isArray(data.ordenesVinculadas) && data.ordenesVinculadas.length > 0) {
      const batch = writeBatch(db);
      for (const ordId of data.ordenesVinculadas) {
        const ordRef = doc(db, "ordenes_cliente", ordId);
        batch.update(ordRef, {
          ultimaFacturaProveedorRef: null,
          updatedAt: new Date().toISOString()
        });
      }
      batch.update(ref, {
        estado: "Anulada",
        updatedAt: new Date().toISOString()
      });
      await batch.commit();
      return;
    }
  }
  await updateDoc(ref, {
    estado: "Anulada",
    updatedAt: new Date().toISOString()
  });
}

export async function eliminarFacturaProveedor(id: string): Promise<void> {
  const ref = doc(db, "facturas_proveedor", id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    if (data.ordenesVinculadas && Array.isArray(data.ordenesVinculadas) && data.ordenesVinculadas.length > 0) {
      const batch = writeBatch(db);
      for (const ordId of data.ordenesVinculadas) {
        const ordRef = doc(db, "ordenes_cliente", ordId);
        batch.update(ordRef, {
          ultimaFacturaProveedorRef: null,
          updatedAt: new Date().toISOString()
        });
      }
      batch.delete(ref);
      await batch.commit();
      return;
    }
  }
  await deleteDoc(ref);
}

// ─────────────────────────────────────────────────────────────────────────────
// Abonos a Proveedor
// ─────────────────────────────────────────────────────────────────────────────
export async function obtenerAbonosPorFactura(facturaId: string): Promise<any[]> {
  const q = query(collection(db, "abonos_proveedor"), where("facturaProveedorId", "==", facturaId));
  const snap = await getDocs(q);
  return snapToArray<any>(snap);
}

export async function registrarAbonoProveedor(abono: any): Promise<any> {
  return await runTransaction(db, async (transaction) => {
    // 1. Obtener la factura
    const facturaRef = doc(db, "facturas_proveedor", abono.facturaProveedorId);
    const facturaSnap = await transaction.get(facturaRef);
    if (!facturaSnap.exists()) throw new Error("Factura no encontrada.");
    const factura = facturaSnap.data();

    // 2. Crear abono
    const abonoRef = doc(collection(db, "abonos_proveedor"));
    const abonoData = { ...abono, createdAt: new Date().toISOString() };
    transaction.set(abonoRef, abonoData);

    // 3. Actualizar factura
    const nuevoAbonado = (factura.montoAbonado || 0) + abono.monto;
    const nuevoSaldo = factura.total - nuevoAbonado;
    let nuevoEstado = factura.estado;
    if (nuevoSaldo <= 0) nuevoEstado = "pagada";
    else if (nuevoAbonado > 0) nuevoEstado = "parcial";

    transaction.update(facturaRef, {
      montoAbonado: nuevoAbonado,
      saldoPendiente: nuevoSaldo,
      estado: nuevoEstado,
      updatedAt: new Date().toISOString()
    });

    return { id: abonoRef.id, ...abonoData };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Gastos de Importación (Gastos Extra)
// ─────────────────────────────────────────────────────────────────────────────
export async function obtenerGastosPorPedido(pedidoId: string): Promise<any[]> {
  const q = query(collection(db, "gastos_importacion"), where("pedidoProveedorId", "==", pedidoId));
  const snap = await getDocs(q);
  return snapToArray<any>(snap);
}

export async function crearGastoImportacion(gasto: any): Promise<any> {
  const data = { ...gasto, createdAt: new Date().toISOString() };
  const ref = await addDoc(collection(db, "gastos_importacion"), data);
  return { id: ref.id, ...data };
}

export async function eliminarGastoImportacion(id: string): Promise<void> {
  await deleteDoc(doc(db, "gastos_importacion", id));
}

// ─────────────────────────────────────────────────────────────────────────────
// Cuentas por Pagar (Facturas de Proveedor y Pagos)
// ─────────────────────────────────────────────────────────────────────────────
export async function obtenerFacturasProveedor(): Promise<any[]> {
  // En un entorno real se haría la llamada fetch al backend express `/api/cxp/facturas`
  // o se conectaría directamente a Firebase si se quiere mantener la consistencia con el resto.
  // Aquí usamos conexión directa a Firebase para consistencia con el proyecto actual.
  const snap = await getDocs(query(collection(db, "facturas_proveedor"), orderBy("createdAt", "desc")));
  return snapToArray<any>(snap);
}

export async function crearFacturaProveedor(data: any): Promise<any> {
  const { 
    proveedorId, numeroFactura, fechaEmision, 
    total, flete, impuestos, observaciones, 
    ordenesVinculadas, iaData, items 
  } = data;
  
  const id = await generarCorrelativo("compra");
  const batch = writeBatch(db);
  const factRef = doc(db, "facturas_proveedor", id);

  const itemsList = items || (iaData?.items ? iaData.items : []);

  const docData = {
    facturaId: id,
    proveedorId,
    numeroFactura: numeroFactura || 'S/N',
    fechaEmision,
    total: Number(total) || 0,
    flete: Number(flete) || 0,
    impuestos: Number(impuestos) || 0,
    observaciones: observaciones || '',
    ordenesVinculadas: ordenesVinculadas || [],
    iaData: iaData || null,
    items: itemsList,
    estado: 'Pendiente',
    saldoPendiente: Number(total) || 0,
    montoAbonado: 0,
    createdAt: new Date().toISOString()
  };

  batch.set(factRef, docData);

  // Vincular las órdenes de cliente
  if (Array.isArray(ordenesVinculadas) && ordenesVinculadas.length > 0) {
    for (const ordId of ordenesVinculadas) {
      const ordRef = doc(db, "ordenes_cliente", ordId);
      batch.update(ordRef, {
        tieneGastosVinculados: true,
        ultimaFacturaProveedorRef: id,
        updatedAt: new Date().toISOString()
      });
    }
  }

  // Actualizar costo en inventario para cada SKU
  if (Array.isArray(itemsList)) {
    for (const item of itemsList) {
      const pUnit = Number(item.precioUnitario || item.costoUnitario) || 0;
      if (item.sku && pUnit > 0) {
        const invRef = doc(db, "inventario", item.sku);
        batch.set(invRef, {
          sku: item.sku,
          descripcion: item.descripcion || "",
          costoPromedio: pUnit,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    }
  }

  await batch.commit();
  return { id, ...docData };
}

export async function obtenerPagosProveedor(): Promise<any[]> {
  const snap = await getDocs(query(collection(db, "pagos_proveedor"), orderBy("createdAt", "desc")));
  return snapToArray<any>(snap);
}

export async function registrarPagoProveedor(data: any): Promise<any> {
  const { 
    proveedorId, montoTotal, referencia, 
    metodoPago, fechaPago, notas, pagosFacturas 
  } = data;

  if (!pagosFacturas || pagosFacturas.length === 0) {
    throw new Error("No hay facturas seleccionadas para abonar.");
  }

  const id = await generarCorrelativo("despacho"); // Utilizaremos otro prefijo luego, pero por compatibilidad
  const pagoId = id.replace("DES-", "PPR-"); 

  const result = await runTransaction(db, async (transaction) => {
    let totalAplicado = 0;
    const facturasUpdates = [];

    // Validar y acumular
    for (const pago of pagosFacturas) {
      const { facturaId, montoAplicado } = pago;
      if (montoAplicado <= 0) continue;

      const fRef = doc(db, "facturas_proveedor", facturaId);
      const fSnap = await transaction.get(fRef);

      if (!fSnap.exists()) {
        throw new Error(`La factura ${facturaId} no existe.`);
      }

      const fData = fSnap.data();
      const currentSaldo = Number(fData.saldoPendiente) || 0;
      const currentAbonado = Number(fData.montoAbonado) || 0;

      if (montoAplicado > currentSaldo) {
        throw new Error(`El abono (${montoAplicado}) supera el saldo (${currentSaldo}) de la factura ${facturaId}.`);
      }

      const nuevoSaldo = currentSaldo - montoAplicado;
      const nuevoAbonado = currentAbonado + montoAplicado;
      let nuevoEstado = fData.estado;
      
      if (nuevoSaldo <= 0) {
        nuevoEstado = 'Pagada';
      } else if (nuevoAbonado > 0) {
        nuevoEstado = 'Parcial';
      }

      facturasUpdates.push({
        ref: fRef,
        updates: {
          saldoPendiente: nuevoSaldo,
          montoAbonado: nuevoAbonado,
          estado: nuevoEstado,
          updatedAt: new Date().toISOString()
        }
      });

      totalAplicado += montoAplicado;
    }

    if (totalAplicado > Number(montoTotal) + 0.1) {
      throw new Error("La suma distribuida en facturas supera el monto total del pago.");
    }

    const pagoRef = doc(db, "pagos_proveedor", pagoId);
    const pagoData = {
      pagoId,
      proveedorId,
      montoTotal: Number(montoTotal),
      referencia: referencia || '',
      metodoPago: metodoPago || 'Transferencia',
      fechaPago,
      notas: notas || '',
      distribucion: pagosFacturas,
      createdAt: new Date().toISOString()
    };

    transaction.set(pagoRef, pagoData);
    facturasUpdates.forEach(update => transaction.update(update.ref, update.updates));

    return { id: pagoId, ...pagoData };
  });

  return result;
}
