const fs = require('fs');

let content = fs.readFileSync('frontend/src/lib/api/importaciones.ts', 'utf8');

const additionalAPI = `
// ─────────────────────────────────────────────────────────────────────────────
// Requerimientos (Pedidos Entrantes)
// ─────────────────────────────────────────────────────────────────────────────
export async function obtenerRequerimientos(): Promise<Cotizacion[]> {
  const snap = await getDocs(query(collection(db, "cotizaciones"), orderBy("createdAt", "desc")));
  return snapToArray<Cotizacion>(snap).filter(c => c.estado === 'requerimiento');
}

export async function crearRequerimiento(
  clienteId: string,
  clienteNombre: string,
  items: Array<{ sku: string; descripcion: string; modelo?: string; cantidad: number; precioUnitario: number }>,
  fecha?: string,
  responsableId?: string,
  responsableNombre?: string,
  flete?: number,
  arancel?: number,
  otrosGastos?: number,
  meta?: Partial<Cotizacion>
): Promise<Cotizacion> {
  const id = await generarCorrelativo("cotizacion"); // We share the ID correlativo with cotizaciones
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
      await guardarProductoSiNoExiste(item.sku, item.descripcion);
    }
  }

  return { id, ...data };
}

export async function editarRequerimiento(
  id: string,
  clienteId: string,
  clienteNombre: string,
  items: Array<{ sku: string; descripcion: string; modelo?: string; cantidad: number; precioUnitario: number }>,
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
      await guardarProductoSiNoExiste(item.sku, item.descripcion);
    }
  }
  
  return { id, ...snap.data() } as Cotizacion;
}

export async function aprobarRequerimiento(id: string): Promise<void> {
  // En requerimientos, "aprobar" significa pasarlo a Cotización
  await updateDoc(doc(db, "cotizaciones", id), { estado: "borrador", updatedAt: new Date().toISOString() });
}

export async function anularRequerimiento(id: string): Promise<void> {
  await updateDoc(doc(db, "cotizaciones", id), { estado: "anulado", updatedAt: new Date().toISOString() });
}

export async function revertirRequerimiento(id: string): Promise<void> {
  await updateDoc(doc(db, "cotizaciones", id), { estado: "requerimiento", updatedAt: new Date().toISOString() });
}

// ─────────────────────────────────────────────────────────────────────────────
`;

content = content.replace('// ─────────────────────────────────────────────────────────────────────────────\n// Órdenes de Clientes', additionalAPI + '\n// ─────────────────────────────────────────────────────────────────────────────\n// Órdenes de Clientes');

fs.writeFileSync('frontend/src/lib/api/importaciones.ts', content);
console.log('API functions appended successfully');
