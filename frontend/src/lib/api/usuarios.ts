import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Usuario, RolUsuario } from "@/types";
import { getPermisosPorDefecto } from "@/lib/permisos";

const COLECCION = "usuarios";

/**
 * Obtener todos los usuarios del sistema ordenados por fecha de creación descendente.
 */
export async function obtenerUsuarios(): Promise<Usuario[]> {
  try {
    const q = query(collection(db, COLECCION), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Usuario[];
  } catch (e) {
    console.error("Error al obtener usuarios:", e);
    // Fallback sin order si no hay índice
    const snap = await getDocs(collection(db, COLECCION));
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Usuario[];
  }
}

/**
 * Obtener un usuario por su UID / ID de documento.
 */
export async function obtenerUsuarioPorId(id: string): Promise<Usuario | null> {
  try {
    const ref = doc(db, COLECCION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Usuario;
  } catch (e) {
    console.error("Error al obtener usuario por ID:", e);
    return null;
  }
}

/**
 * Crear o registrar un nuevo usuario en Firestore.
 */
export async function guardarUsuario(
  id: string,
  datos: {
    email: string;
    nombre: string;
    apellido?: string;
    rol: RolUsuario;
    permisos?: string[];
    activo?: boolean;
    telefono?: string;
    cargo?: string;
    avatarUrl?: string;
  }
): Promise<Usuario> {
  const permisos = datos.permisos && datos.permisos.length > 0
    ? datos.permisos
    : getPermisosPorDefecto(datos.rol);

  const usuario: Usuario = {
    id,
    email: datos.email.trim().toLowerCase(),
    nombre: datos.nombre.trim(),
    apellido: datos.apellido?.trim() || "",
    rol: datos.rol,
    permisos,
    activo: datos.activo !== undefined ? datos.activo : true,
    telefono: datos.telefono?.trim() || "",
    cargo: datos.cargo?.trim() || "",
    avatarUrl: datos.avatarUrl || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, COLECCION, id), usuario, { merge: true });
  return usuario;
}

/**
 * Actualizar datos de un usuario existente.
 */
export async function actualizarUsuario(
  id: string,
  datos: Partial<Omit<Usuario, "id" | "createdAt">>
): Promise<void> {
  const ref = doc(db, COLECCION, id);
  await updateDoc(ref, {
    ...datos,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Cambiar estado de activación de un usuario (Activo / Inactivo).
 */
export async function cambiarEstadoUsuario(id: string, activo: boolean): Promise<void> {
  const ref = doc(db, COLECCION, id);
  await updateDoc(ref, {
    activo,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Eliminar un usuario de Firestore.
 */
export async function eliminarUsuario(id: string): Promise<void> {
  const ref = doc(db, COLECCION, id);
  await deleteDoc(ref);
}

/**
 * Inicializar usuario Master por defecto si la base de datos está vacía.
 */
export async function inicializarMasterPorDefecto(uid: string, email: string): Promise<Usuario> {
  const masterDefault: Usuario = {
    id: uid,
    email: email.toLowerCase(),
    nombre: "Administrador Master",
    apellido: "Principal",
    rol: "master",
    permisos: getPermisosPorDefecto("master"),
    activo: true,
    cargo: "Director de Operaciones / Master",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ultimoAcceso: new Date().toISOString(),
  };

  await setDoc(doc(db, COLECCION, uid), masterDefault, { merge: true });
  return masterDefault;
}
