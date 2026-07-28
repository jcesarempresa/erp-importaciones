"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  TrendingUp, 
  ShoppingCart, 
  Truck, 
  DollarSign, 
  ArrowUpRight, 
  Clock, 
  CheckCircle,
  FileSpreadsheet,
  Loader2
} from "lucide-react";
import { obtenerStats, DashboardStats } from "@/lib/api/importaciones";
import { useTranslation } from "@/context/LanguageContext";

export default function DashboardHome() {
  const { t, language } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await obtenerStats();
        setStats(data);
      } catch (err: any) {
        setError(err.message || "Error al conectar con la base de datos.");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Banner Alegórico de Importaciones & Cadena de Suministro */}
      <div 
        className="relative overflow-hidden rounded-3xl border border-slate-800 p-8 sm:p-10 flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl bg-cover bg-center min-h-[220px]"
        style={{ backgroundImage: "url('/cargo_banner.png')" }}
      >
        {/* Máscara de Degradado Oscuro de Seguridad y Estilo para Contraste */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent z-0"></div>

        {/* Contenido (Textos e Indicadores) */}
        <div className="relative z-10 space-y-4 max-w-xl text-center md:text-left">
          <div className="flex flex-wrap justify-center md:justify-start items-center gap-2">
            <span className="text-[9px] font-black px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 uppercase tracking-widest rounded-md font-mono">
              {language === "es" ? "Operaciones USD" : "USD Operations"}
            </span>
            <span className="text-[9px] font-black px-2.5 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 uppercase tracking-widest rounded-md font-mono flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
              </span>
              {language === "es" ? "Tránsito Internacional" : "International Transit"}
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-3xl font-black text-slate-100 tracking-tight leading-none animate-pulse">
              {language === "es" ? "Importación Global y Logística" : "Global Import & Logistics"}
            </h2>
            <p className="text-xs text-slate-300 max-w-md leading-relaxed font-medium">
              {language === "es" 
                ? "Monitoreo y control de compras internacionales de cualquier origen del mundo (China, USA, Europa, Asia), consolidación en lote y cotizaciones directas en dólares." 
                : "Monitoring and control of international purchases from any origin in the world (China, USA, Europe, Asia), bulk consolidation, and direct dollar quotes."}
            </p>
          </div>

          {/* Puertos y Rutas de la Cadena de Suministro */}
          <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-[10px] text-slate-400 pt-1 font-mono">
            <span>{language === "es" ? "Rutas Activas" : "Active Routes"}: <strong className="text-indigo-300">{language === "es" ? "Cualquier Origen del Mundo" : "Any Origin in the World"}</strong></span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span>{language === "es" ? "Aduanas Conectadas" : "Connected Customs"}: <strong className="text-indigo-300">Vargas / Puerto Cabello</strong></span>
          </div>
        </div>

        {/* Badge lateral decorativo de Estado del Contenedor */}
        <div className="relative z-10 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center gap-1 shrink-0 text-center shadow-lg w-40 backdrop-blur-md">
          <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest">{language === "es" ? "Base de Datos" : "Database"}</span>
          <span className="text-xs font-black text-emerald-400 font-mono tracking-wider">FIRESTORE ACTIVE</span>
          <div className="w-16 h-1 bg-emerald-500/20 rounded-full overflow-hidden mt-1.5">
            <div className="w-full h-full bg-emerald-400 animate-pulse"></div>
          </div>
        </div>
      </div>



      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <span className="text-xs">{language === "es" ? "Cargando métricas de Firestore..." : "Loading Firestore metrics..."}</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-955/40 border border-rose-900/40 rounded-xl text-rose-300 text-xs">
          {error}
        </div>
      ) : (
        <>
          {/* Grid de Tarjetas de Indicadores */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1: Demanda Comprometida */}
            <div className="glass-panel rounded-2xl p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === "es" ? "Órdenes Activas" : "Active Orders"}</span>
                <h3 className="text-2xl font-extrabold text-slate-100">{stats?.ordenesActivas || 0}</h3>
                <p className="text-[9px] text-slate-400 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" /> {language === "es" ? "Clientes pendientes" : "Pending clients"}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                <ShoppingCart className="h-5 w-5" />
              </div>
            </div>

            {/* Card 2: Contenedores en Tránsito */}
            <div className="glass-panel rounded-2xl p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === "es" ? "En Importación" : "In Import"}</span>
                <h3 className="text-2xl font-extrabold text-slate-100">{stats?.enImportacion || 0}</h3>
                <p className="text-[9px] text-slate-400 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-amber-500" /> {language === "es" ? "Pedidos activos fábrica" : "Active factory orders"}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/20">
                <Truck className="h-5 w-5" />
              </div>
            </div>

            {/* Card 3: Cobranza Pendiente */}
            <div className="glass-panel rounded-2xl p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === "es" ? "Cuentas por Cobrar" : "Accounts Receivable"}</span>
                <h3 className="text-2xl font-extrabold text-emerald-400">
                  ${stats?.cxcMonto.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
                </h3>
                <p className="text-[9px] text-slate-400 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-emerald-500" /> {language === "es" ? "Por facturas emitidas" : "From issued invoices"}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>

            {/* Card 4: Cotizaciones Pendientes */}
            <div className="glass-panel rounded-2xl p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === "es" ? "Presupuestos" : "Quotes"}</span>
                <h3 className="text-2xl font-extrabold text-slate-100">{stats?.presupuestos || 0}</h3>
                <p className="text-[9px] text-slate-400 flex items-center gap-1">
                  {language === "es" ? "Historial total registrado" : "Total registered history"}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400 border border-pink-500/20">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
            </div>

          </div>

          {/* Grid de Secciones Secundarias */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Gráfico/Actividad Reciente (Mapeado con HTML/CSS) */}
            <div className="lg:col-span-2 glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{language === "es" ? "Actividad de Entregas" : "Delivery Activity"}</h3>
                <span className="text-[10px] text-slate-400 font-semibold">{language === "es" ? "Julio 2026" : "July 2026"}</span>
              </div>

              {/* Gráfico Simulado de Barras */}
              <div className="h-48 flex items-end justify-between pt-4 gap-4 px-2">
                {[45, 60, 30, 80, 50, 95, 70].map((val, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                    <div 
                      className="w-full bg-slate-800 hover:bg-indigo-500/70 rounded-t-lg transition-all duration-300 relative" 
                      style={{ height: `${val}%` }}
                    >
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] bg-slate-900 text-slate-200 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                        {val}%
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-500">{language === "es" ? "Sem" : "Wk"} {idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Accesos Directos Operativos */}
            <div className="lg:col-span-1 glass-panel rounded-2xl p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800/60 pb-3">
                  {language === "es" ? "Acciones Críticas" : "Critical Actions"}
                </h3>
                
                <div className="space-y-3">
                  <Link 
                    href="/importaciones/recepcion" 
                    className="flex items-center justify-between p-3 bg-slate-900/40 hover:bg-indigo-950/20 border border-slate-800/40 hover:border-indigo-900/30 rounded-xl transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                        <Truck className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">{language === "es" ? "Registrar Contenedor" : "Register Container"}</p>
                        <span className="text-[9px] text-slate-500">{language === "es" ? "Conciliación FIFO en lote" : "FIFO bulk reconciliation"}</span>
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>

                  <Link 
                    href="/facturacion"
                    className="flex items-center justify-between p-3 bg-slate-900/40 hover:bg-emerald-950/20 border border-slate-800/40 hover:border-emerald-900/30 rounded-xl transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                        <DollarSign className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">{language === "es" ? "Gestionar CxC y Facturas" : "Manage A/R & Invoices"}</p>
                        <span className="text-[9px] text-slate-500">{language === "es" ? "Abonos e historial" : "Payments & history"}</span>
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-emerald-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 text-center border-t border-slate-800/60 pt-4 mt-6">
                {language === "es" ? "ERP Central de Maxicom Bejuma v1.0.0" : "Maxicom Bejuma Central ERP v1.0.0"}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
