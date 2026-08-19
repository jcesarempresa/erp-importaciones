import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
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
    const snap = await getDocs(collection(db, COLECCION));
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Usuario[];
  }
}

/**
 * Obtener un usuario por su ID de documento.
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
 * Buscar usuario por username o email (case-insensitive).
 */
export async function buscarUsuarioPorLogin(identificador: string): Promise<Usuario | null> {
  try {
    const cleanId = identificador.trim().toLowerCase();
    const snap = await getDocs(collection(db, COLECCION));
    const encontrado = snap.docs.find((d) => {
      const data = d.data();
      const uUsername = (data.username || "").toLowerCase();
      const uEmail = (data.email || "").toLowerCase();
      return uUsername === cleanId || uEmail === cleanId;
    });

    if (!encontrado) return null;
    return { id: encontrado.id, ...encontrado.data() } as Usuario;
  } catch (e) {
    console.error("Error al buscar usuario por login:", e);
    return null;
  }
}

/**
 * Crear o registrar un nuevo usuario en Firestore con soporte de username y password directo.
 */
export async function guardarUsuario(
  id: string,
  datos: {
    username: string;
    password?: string;
    email?: string;
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

  const cleanUsername = (datos.username || datos.email?.split("@")[0] || "usuario")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "");

  const usuario: Usuario = {
    id,
    username: cleanUsername,
    password: datos.password || "123456",
    email: datos.email?.trim().toLowerCase() || `${cleanUsername}@maximport.local`,
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
 * Cambiar directamente la contraseña de cualquier usuario en Firestore.
 */
export async function cambiarPasswordUsuario(id: string, nuevoPassword: string): Promise<void> {
  const ref = doc(db, COLECCION, id);
  await updateDoc(ref, {
    password: nuevoPassword,
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
export async function inicializarMasterPorDefecto(
  id: string,
  username: string,
  password?: string
): Promise<Usuario> {
  const cleanUser = username.trim().toLowerCase();
  const masterDefault: Usuario = {
    id,
    username: cleanUser,
    password: password || "admin123",
    email: cleanUser.includes("@") ? cleanUser : `${cleanUser}@maximport.local`,
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

  await setDoc(doc(db, COLECCION, id), masterDefault, { merge: true });
  return masterDefault;
}
