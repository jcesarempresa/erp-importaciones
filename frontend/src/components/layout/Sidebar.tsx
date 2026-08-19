"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  ShoppingCart, 
  Truck, 
  PackageCheck, 
  Receipt, 
  Settings, 
  Compass,
  Users,
  UploadCloud,
  Package,
  Inbox,
  Landmark,
  BarChart2,
  ShieldCheck,
  Crown,
  KeyRound,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import ChangePasswordModal from "@/components/auth/ChangePasswordModal";

const allMenuItems = [
  { translationKey: "menu.dashboard", href: "/", icon: LayoutDashboard },
  { translationKey: "menu.contacts", href: "/contactos", icon: Users },
  { translationKey: "menu.customerRequests", href: "/pedidos-entrantes", icon: Inbox },
  { translationKey: "menu.quotes", href: "/cotizaciones", icon: FileSpreadsheet },
  { translationKey: "menu.clientOrders", href: "/ordenes-cliente", icon: ShoppingCart },
  { translationKey: "menu.supplierOrders", href: "/pedidos-proveedor", icon: Compass },
  { translationKey: "menu.reception", href: "/importaciones/recepcion", icon: Truck },
  { translationKey: "menu.warehouse", href: "/almacen", icon: Package },
  { translationKey: "menu.deliveries", href: "/despachos", icon: PackageCheck },
  { translationKey: "menu.billing", href: "/facturacion", icon: Receipt },
  { translationKey: "menu.ap", href: "/facturas-proveedor", icon: Landmark },
  { translationKey: "menu.reports", href: "/reportes", icon: BarChart2 },
  { translationKey: "menu.users", href: "/usuarios", icon: ShieldCheck },
  { translationKey: "menu.importHistory", href: "/importar", icon: UploadCloud },
  { translationKey: "menu.config", href: "/configuracion", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { t, language } = useTranslation();
  const { usuario, logout, hasPermission, isMaster, isAdmin } = useAuth();
  const [modalPassword, setModalPassword] = useState(false);

  // Filtrar los ítems del menú según los permisos del usuario activo
  const visibleMenuItems = allMenuItems.filter((item) => {
    // La ruta /usuarios solo es visible para Master y Admin
    if (item.href === "/usuarios") {
      return isMaster || isAdmin;
    }
    return hasPermission(item.href);
  });

  const nombreUsuario = usuario ? `${usuario.nombre} ${usuario.apellido || ""}`.trim() : "Usuario ERP";
  const iniciales = usuario ? (usuario.nombre.charAt(0) + (usuario.apellido?.charAt(0) || "")).toUpperCase() : "U";
  const rolLabel =
    usuario?.rol === "master"
      ? "Master"
      : usuario?.rol === "admin"
      ? language === "es" ? "Administrador" : "Administrator"
      : language === "es" ? "Usuario Estándar" : "Standard User";

  const handleLogout = async () => {
    if (confirm(language === "es" ? "¿Deseas cerrar tu sesión actual?" : "Do you want to log out?")) {
      await logout();
    }
  };

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 w-80 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between p-5 shadow-2xl">
        <div className="overflow-y-auto pr-1">
          {/* Identificador Visual de la Aplicación */}
          <div className="flex items-center gap-4 px-3 py-4 mb-6 border-b border-slate-800/60">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-indigo-650 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
              <LayoutDashboard className="h-6 w-6 text-slate-100" />
            </div>
            <div>
              <h1 className="font-black text-slate-100 tracking-widest text-sm uppercase">MAXIMPORT</h1>
              <span className="text-[9px] text-indigo-400 font-extrabold tracking-widest uppercase">
                {language === "es" ? "ERP Solutions" : "ERP Solutions"}
              </span>
            </div>
          </div>

          {/* Listado de Rutas Filtradas por Permisos */}
          <nav className="space-y-1">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const translatedName = t(item.translationKey);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 group",
                    isActive
                      ? "bg-indigo-600/15 text-indigo-300 shadow-sm border border-indigo-500/20"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/50"
                  )}
                >
                  <Icon 
                    className={cn(
                      "h-4 w-4 transition-transform duration-250 group-hover:scale-110 shrink-0",
                      isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
                    )} 
                  />
                  <span className="truncate">{translatedName}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer con Información de Perfil y Sesión */}
        <div className="border-t border-slate-800/60 pt-4 px-2 flex flex-col gap-2.5 shrink-0 bg-slate-950">
          {/* Card de Usuario Activo */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/70 border border-slate-800/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                usuario?.rol === "master"
                  ? "bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 shadow-md shadow-amber-500/20"
                  : usuario?.rol === "admin"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-slate-800 text-slate-300"
              }`}>
                {iniciales}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-bold text-slate-200 leading-tight truncate" title={nombreUsuario}>
                  {nombreUsuario}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  {usuario?.rol === "master" && <Crown className="w-2.5 h-2.5 text-amber-400" />}
                  {usuario?.rol === "admin" && <ShieldCheck className="w-2.5 h-2.5 text-indigo-400" />}
                  <span className={`text-[9.5px] font-bold uppercase truncate ${
                    usuario?.rol === "master" ? "text-amber-400" : usuario?.rol === "admin" ? "text-indigo-400" : "text-slate-400"
                  }`}>
                    {rolLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones de Sesión */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setModalPassword(true)}
                title={language === "es" ? "Cambiar mi contraseña" : "Change password"}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-white/5 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                title={language === "es" ? "Cerrar sesión" : "Log out"}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Modal de Cambio de Contraseña Propia */}
      {modalPassword && (
        <ChangePasswordModal onClose={() => setModalPassword(false)} />
      )}
    </>
  );
}
