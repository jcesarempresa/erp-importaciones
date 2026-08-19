"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { Usuario } from "@/types";
import { tienePermiso, getPermisosPorDefecto } from "@/lib/permisos";
import {
  buscarUsuarioPorLogin,
  inicializarMasterPorDefecto,
  cambiarPasswordUsuario,
} from "@/lib/api/usuarios";

interface AuthContextType {
  user: FirebaseUser | null;
  usuario: Usuario | null;
  loading: boolean;
  login: (usernameOrEmail: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  cambiarPassword: (nuevaPassword: string) => Promise<void>;
  refrescarPerfil: () => Promise<void>;
  hasPermission: (ruta: string) => boolean;
  isMaster: boolean;
  isAdmin: boolean;
  isStandard: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "erp_session_user";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar sesión persistida al inicio
  useEffect(() => {
    async function initSession() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Usuario;
          // Validar con Firestore que el usuario siga activo y exista
          const ref = doc(db, "usuarios", parsed.id);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const currentData = { id: snap.id, ...snap.data() } as Usuario;
            if (currentData.activo) {
              setUsuario(currentData);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(currentData));
            } else {
              localStorage.removeItem(STORAGE_KEY);
              setUsuario(null);
            }
          } else {
            // Usuario fue eliminado
            localStorage.removeItem(STORAGE_KEY);
            setUsuario(null);
          }
        }
      } catch (e) {
        console.error("Error al restaurar sesión:", e);
      } finally {
        setLoading(false);
      }
    }

    initSession();

    // Sincronizar también con Firebase Auth por si se usa
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (usernameOrEmail: string, pass: string) => {
    const cleanInput = usernameOrEmail.trim();
    if (!cleanInput) throw new Error("Ingresa tu nombre de usuario o correo.");
    if (!pass) throw new Error("Ingresa tu contraseña.");

    // 1. Buscar en Firestore si existe este usuario por username o email
    let perfil = await buscarUsuarioPorLogin(cleanInput);

    // 2. Si no existe ningún usuario en la base de datos (primer inicio del sistema), auto-creamos al Master
    if (!perfil) {
      const snap = await getDocs(collection(db, "usuarios"));
      if (snap.empty) {
        const masterId = "master_" + Date.now();
        perfil = await inicializarMasterPorDefecto(masterId, cleanInput, pass);
      }
    }

    if (!perfil) {
      throw new Error("Usuario o contraseña incorrectos.");
    }

    if (perfil.activo === false) {
      throw new Error("Tu cuenta se encuentra desactivada. Contacta al administrador.");
    }

    // 3. Validar contraseña
    // Si el usuario tiene password guardado en Firestore, comparamos
    if (perfil.password && perfil.password !== pass) {
      // Intentar también con Firebase Auth por compatibilidad
      try {
        const email = cleanInput.includes("@") ? cleanInput : `${cleanInput.toLowerCase()}@maximport.local`;
        await signInWithEmailAndPassword(auth, email, pass);
      } catch {
        throw new Error("Usuario o contraseña incorrectos.");
      }
    }

    // Actualizar último acceso
    try {
      await updateDoc(doc(db, "usuarios", perfil.id), {
        ultimoAcceso: new Date().toISOString(),
      });
    } catch {
      // ignore
    }

    // Guardar sesión
    setUsuario(perfil);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(perfil));
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setUsuario(null);
  };

  const cambiarPassword = async (nuevaPassword: string) => {
    if (!usuario) throw new Error("No hay una sesión activa");
    await cambiarPasswordUsuario(usuario.id, nuevaPassword);
    const updated = { ...usuario, password: nuevaPassword, updatedAt: new Date().toISOString() };
    setUsuario(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const refrescarPerfil = async () => {
    if (usuario) {
      const ref = doc(db, "usuarios", usuario.id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as Usuario;
        setUsuario(data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    }
  };

  const hasPermission = (ruta: string): boolean => {
    if (!usuario) return false;
    return tienePermiso(ruta, usuario.rol, usuario.permisos);
  };

  const isMaster = usuario?.rol === "master";
  const isAdmin = usuario?.rol === "admin" || usuario?.rol === "master";
  const isStandard = usuario?.rol === "standard";

  return (
    <AuthContext.Provider
      value={{
        user,
        usuario,
        loading,
        login,
        logout,
        cambiarPassword,
        refrescarPerfil,
        hasPermission,
        isMaster,
        isAdmin,
        isStandard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser utilizado dentro de un AuthProvider");
  }
  return context;
};
