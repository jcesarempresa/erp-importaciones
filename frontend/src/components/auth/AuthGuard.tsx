"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ShieldAlert, ArrowLeft, Lock, RefreshCw } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Link from "next/link";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, usuario, loading, hasPermission } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      router.push("/login");
    }
  }, [loading, user, isLoginPage, router]);

  // Si estamos en /login, no mostramos el layout de Dashboard (Header / Sidebar)
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Pantalla de carga mientras se verifica el estado de autenticación
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <div className="relative flex items-center justify-center mb-6">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <Lock className="w-6 h-6 text-indigo-400 absolute" />
        </div>
        <h2 className="text-lg font-black tracking-widest text-slate-100 uppercase">MAXIMPORT ERP</h2>
        <p className="text-xs text-indigo-400 font-mono mt-1">Verificando sesión segura...</p>
      </div>
    );
  }

  // Si no está autenticado y no está en /login, retornamos pantalla de redirección
  if (!user || !usuario) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200 p-4">
        <div className="glass-card p-8 max-w-md text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-100 mb-2">Sesión Requerida</h2>
          <p className="text-xs text-slate-400 mb-6">
            Debes iniciar sesión con tus credenciales corporativas para acceder al sistema ERP.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30"
          >
            Ir a Inicio de Sesión
          </Link>
        </div>
      </div>
    );
  }

  // Verificar si el usuario tiene permiso para la ruta actual
  const tieneAcceso = hasPermission(pathname);

  if (!tieneAcceso) {
    return (
      <div className="relative min-h-screen bg-slate-950">
        <Sidebar />
        <Header />
        <main className="pl-80 pt-40 min-h-screen">
          <div className="p-8 max-w-2xl mx-auto text-center">
            <div className="glass-card p-10 border border-rose-500/30 shadow-2xl shadow-rose-950/20">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto mb-6">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-black uppercase px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full tracking-wider font-mono">
                Acceso Restringido (403)
              </span>
              <h2 className="text-2xl font-black text-slate-100 mt-4 mb-2">Módulo no autorizado</h2>
              <p className="text-sm text-slate-400 mb-8 max-w-md mx-auto">
                Tu cuenta ({usuario.email}) tiene rol <strong className="text-slate-200 capitalize">{usuario.rol}</strong> y no cuenta con permisos asignados para acceder a la ruta <code className="text-indigo-400 font-mono text-xs">{pathname}</code>.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link
                  href="/"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al Panel Principal
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Layout estándar autenticado
  return (
    <div className="relative min-h-screen bg-slate-950">
      <Sidebar />
      <Header />
      <main className="pl-80 pt-40 min-h-screen">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
