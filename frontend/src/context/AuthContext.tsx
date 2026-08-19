"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword as fbUpdatePassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { Usuario } from "@/types";
import { tienePermiso, getPermisosPorDefecto } from "@/lib/permisos";
import { inicializarMasterPorDefecto } from "@/lib/api/usuarios";

interface AuthContextType {
  user: FirebaseUser | null;
  usuario: Usuario | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  cambiarPassword: (nuevaPassword: string) => Promise<void>;
  enviarRecuperacionPassword: (email: string) => Promise<void>;
  refrescarPerfil: () => Promise<void>;
  hasPermission: (ruta: string) => boolean;
  isMaster: boolean;
  isAdmin: boolean;
  isStandard: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  const cargarPerfil = async (fbUser: FirebaseUser): Promise<Usuario | null> => {
    try {
      const ref = doc(db, "usuarios", fbUser.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const u = { id: snap.id, ...snap.data() } as Usuario;
        // Actualizar último acceso
        try {
          await updateDoc(ref, { ultimoAcceso: new Date().toISOString() });
        } catch {
          // ignore
        }
        return u;
      }

      // Si no existe el documento en Firestore, creamos uno inicial
      // Si el email contiene "admin" o es el primer usuario, lo promovemos a master
      const esPrimerMaster = fbUser.email?.toLowerCase().includes("admin") || false;
      const nuevoUsuario: Usuario = {
        id: fbUser.uid,
        email: fbUser.email || "",
        nombre: fbUser.displayName || fbUser.email?.split("@")[0] || "Usuario",
        apellido: "",
        rol: esPrimerMaster ? "master" : "admin",
        permisos: getPermisosPorDefecto(esPrimerMaster ? "master" : "admin"),
        activo: true,
        cargo: esPrimerMaster ? "Administrador Master" : "Administrador",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ultimoAcceso: new Date().toISOString(),
      };

      await setDoc(ref, nuevoUsuario, { merge: true });
      return nuevoUsuario;
    } catch (e) {
      console.error("Error al cargar perfil de usuario:", e);
      return null;
    }
  };

  const refrescarPerfil = async () => {
    if (auth.currentUser) {
      const u = await cargarPerfil(auth.currentUser);
      setUsuario(u);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        const profile = await cargarPerfil(fbUser);
        setUsuario(profile);
      } else {
        setUser(null);
        setUsuario(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const profile = await cargarPerfil(cred.user);

      if (profile && profile.activo === false) {
        await signOut(auth);
        setUser(null);
        setUsuario(null);
        throw new Error("Tu cuenta se encuentra desactivada. Contacta al administrador.");
      }

      setUser(cred.user);
      setUsuario(profile);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      // Si el usuario no existe en Firebase Auth, verificar si la base de datos de usuarios está vacía
      if (e.code === "auth/invalid-credential" || e.code === "auth/user-not-found") {
        try {
          const snap = await getDocs(collection(db, "usuarios"));
          if (snap.empty) {
            // Inicialización automática del primer usuario Master del sistema
            const newCred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
            const masterProfile = await inicializarMasterPorDefecto(newCred.user.uid, email.trim());
            setUser(newCred.user);
            setUsuario(masterProfile);
            return;
          }
        } catch {
          // fallback a error original
        }
      }
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUsuario(null);
  };

  const cambiarPassword = async (nuevaPassword: string) => {
    if (!auth.currentUser) throw new Error("No hay una sesión activa");
    await fbUpdatePassword(auth.currentUser, nuevaPassword);
  };

  const enviarRecuperacionPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
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
        enviarRecuperacionPassword,
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
