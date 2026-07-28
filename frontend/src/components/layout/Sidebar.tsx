"use client";

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
  Landmark
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/context/LanguageContext";

const menuItems = [
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
  { translationKey: "menu.importHistory", href: "/importar", icon: UploadCloud },
  { translationKey: "menu.config", href: "/configuracion", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { t, language } = useTranslation();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 w-80 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between p-5 shadow-2xl">
      <div>
        {/* Identificador Visual de la Aplicación */}
        <div className="flex items-center gap-4 px-3 py-5 mb-8 border-b border-slate-800/60">
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

        {/* Listado de Rutas */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const translatedName = t(item.translationKey);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 group",
                  isActive
                    ? "bg-indigo-600/15 text-indigo-300 shadow-sm border border-indigo-500/20"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/50"
                )}
              >
                <Icon 
                  className={cn(
                    "h-5 w-5 transition-transform duration-250 group-hover:scale-110",
                    isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
                  )} 
                />
                {translatedName}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer con Información de Perfil */}
      <div className="border-t border-slate-800/60 pt-5 px-2 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
            JF
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-200 leading-none truncate">Julio Flores</p>
            <span className="text-[10px] text-slate-500 truncate">
              {language === "es" ? "Administrador" : "Administrator"}
            </span>
          </div>
        </div>
        <Link
          href="/configuracion"
          className="flex items-center gap-3 px-2 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors"
        >
          <Settings className="h-4 w-4" />
          {t("menu.config")}
        </Link>
      </div>
    </aside>
  );
}
