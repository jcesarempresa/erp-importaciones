const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend/src/lib/api/importaciones.ts');

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');

  // 1. Add "pedido" to DEFAULT_SECUENCIAS
  content = content.replace(
    /cotizacion:\s*\{\s*prefijo:\s*"COT-",\s*siguiente:\s*1,\s*longitud:\s*4\s*\}/,
    'cotizacion:       { prefijo: "COT-", siguiente: 1, longitud: 4 },\n  pedido:           { prefijo: "PED-", siguiente: 1, longitud: 4 }'
  );

  // 2. Update crearRequerimiento to use "pedido"
  content = content.replace(
    /const id = await generarCorrelativo\("cotizacion"\); \/\/ We share the ID correlativo with cotizaciones/,
    'const id = await generarCorrelativo("pedido");'
  );

  // 3. Update obtenerCotizaciones to filter out "requerimiento" and "presupuestado"
  content = content.replace(
    /export async function obtenerCotizaciones\(\): Promise<Cotizacion\[\]> \{\s*const snap = await getDocs\(query\(collection\(db, "cotizaciones"\), orderBy\("createdAt", "desc"\)\)\);\s*return snapToArray<Cotizacion>\(snap\);\s*\}/,
    `export async function obtenerCotizaciones(): Promise<Cotizacion[]> {
  const snap = await getDocs(query(collection(db, "cotizaciones"), orderBy("createdAt", "desc")));
  return snapToArray<Cotizacion>(snap).filter(c => c.estado !== 'requerimiento' && c.estado !== 'presupuestado');
}`
  );

  // 3.5 Update obtenerRequerimientos to include "presupuestado"
  content = content.replace(
    /return snapToArray<Cotizacion>\(snap\)\.filter\(c => c\.estado === 'requerimiento'\);/,
    `return snapToArray<Cotizacion>(snap).filter(c => c.estado === 'requerimiento' || c.estado === 'presupuestado');`
  );

  // 4. Update aprobarRequerimiento
  // Note: we need to fetch the existing requerimiento first
  const aprobarOld = `export async function aprobarRequerimiento(id: string): Promise<void> {
  // En requerimientos, "aprobar" significa pasarlo a Cotizacin
  await updateDoc(doc(db, "cotizaciones", id), { estado: "borrador", updatedAt: new Date().toISOString() });
}`;

  const aprobarNew = `export async function aprobarRequerimiento(id: string): Promise<void> {
  // En requerimientos, "aprobar" (Presupuestar) crea una Cotizacin nueva y marca el pedido como presupuestado
  const reqRef = doc(db, "cotizaciones", id);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error("Pedido no encontrado.");
  const reqData = reqSnap.data() as Cotizacion;

  const newId = await generarCorrelativo("cotizacion");
  const newCotizacion: Omit<Cotizacion, "id"> = {
    ...reqData,
    estado: "borrador",
    createdAt: new Date().toISOString(),
    pedidoOrigenId: id // Guardamos referencia
  };
  
  const batch = writeBatch(db);
  batch.set(doc(db, "cotizaciones", newId), newCotizacion);
  batch.update(reqRef, { estado: "presupuestado", updatedAt: new Date().toISOString() });
  await batch.commit();
}`;

  // Since encoding might mess up the tilde in Cotización, let's use regex
  const regexAprobar = /export async function aprobarRequerimiento\(id: string\): Promise<void> \{[\s\S]*?updateDoc\(doc\(db, "cotizaciones", id\), \{ estado: "borrador".*?\n\}/;
  content = content.replace(regexAprobar, aprobarNew);

  // 5. Add eliminarRequerimiento and eliminarCotizacion
  const regexAnular = /export async function anularRequerimiento\(id: string\): Promise<void> \{[\s\S]*?\n\}/;
  const deleteFns = `
export async function eliminarRequerimiento(id: string): Promise<void> {
  await deleteDoc(doc(db, "cotizaciones", id));
}

export async function eliminarCotizacion(id: string): Promise<void> {
  await deleteDoc(doc(db, "cotizaciones", id));
}
`;
  content = content.replace(regexAnular, match => match + '\n' + deleteFns);

  // Need to import writeBatch and deleteDoc if not already imported
  if (!content.includes('writeBatch')) {
    content = content.replace(/import \{([\s\S]*?)\} from "firebase\/firestore";/, 'import { writeBatch,$1} from "firebase/firestore";');
  }
  if (!content.includes('deleteDoc')) {
    content = content.replace(/import \{([\s\S]*?)\} from "firebase\/firestore";/, 'import { deleteDoc,$1} from "firebase/firestore";');
  }

  fs.writeFileSync(file, content);
  console.log('Updated importaciones.ts');
}
