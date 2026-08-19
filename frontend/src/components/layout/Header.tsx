"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Search, RefreshCw, Anchor, Globe, Shield, MapPin, Phone, Mail, LogOut, KeyRound, Crown, ShieldCheck } from "lucide-react";
import { obtenerEmpresa, EmpresaConfig } from "@/lib/api/importaciones";
import { useTranslation } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import ChangePasswordModal from "@/components/auth/ChangePasswordModal";

export default function Header() {
  const [empresa, setEmpresa] = useState<EmpresaConfig | null>(null);
  const [modalPass, setModalPass] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { language, setLanguage, t } = useTranslation();
  const { usuario, logout } = useAuth();

  const cargarEmpresa = async () => {
    try {
      const cached = localStorage.getItem("erp_empresa");
      if (cached) {
        setEmpresa(JSON.parse(cached));
      }
      const data = await obtenerEmpresa();
      setEmpresa(data);
      localStorage.setItem("erp_empresa", JSON.stringify(data));
    } catch (e) {
      console.error("Error al cargar datos de empresa en header:", e);
    }
  };

  useEffect(() => {
    cargarEmpresa();
    const handleUpdate = () => cargarEmpresa();
    window.addEventListener("empresa_updated", handleUpdate);
    return () => window.removeEventListener("empresa_updated", handleUpdate);
  }, []);

  // Forzar autoplay silenciado para evadir políticas estrictas de navegadores
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("Autoplay del video de fondo bloqueado o fallido, usando fallback estático:", err);
        });
      }
    }
  }, []);

  const nombreEmpresa = empresa?.nombre || "Maximport";
  const logoUrl = empresa?.logoUrl;
  const inicial = nombreEmpresa.charAt(0).toUpperCase();

  const telefono = empresa?.telefono || "+58 (424) 123-4567";
  const email = empresa?.email || "operaciones@maximport.com";
  const direccion = empresa?.direccion || "Av. Bolívar, Caracas, Venezuela";

  const userIniciales = usuario ? (usuario.nombre.charAt(0) + (usuario.apellido?.charAt(0) || "")).toUpperCase() : "U";

  return (
    <>
      <header className="fixed top-0 right-0 left-80 z-10 h-40 flex items-center justify-between px-8 border-b border-indigo-500/25 overflow-hidden shadow-xl bg-slate-950">
        {/* Fondo de Video Dinámico (Logística de Puertos) con Fallback a Imagen Estática */}
        <video
          ref={videoRef}
          loop
          muted
          playsInline
          poster="/cargo_banner.png"
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-95"
        >
          <source src="/cargo_video.mp4" type="video/mp4" />
        </video>

        {/* Máscara de Degradado para legibilidad del contenido */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/20 to-transparent z-0"></div>

        {/* Franja superior temática estilo contenedor */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-indigo-600 to-sky-400 z-10"></div>

        {/* Logo y Nombre de Empresa (Banner Superior - Logística Temática) */}
        <div className="flex items-center gap-5 min-w-0 relative z-10">
          {logoUrl ? (
            <div className="h-20 w-20 rounded-2xl bg-slate-900/90 border-2 border-indigo-500/40 flex items-center justify-center overflow-hidden shrink-0 shadow-2xl shadow-indigo-500/20">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5" />
            </div>
          ) : (
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 border-2 border-indigo-400/40 flex items-center justify-center text-white font-black text-3xl shadow-2xl shadow-indigo-500/30 shrink-0">
              {inicial}
            </div>
          )}
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg sm:text-2xl font-black text-slate-50 tracking-tight uppercase truncate max-w-[280px] sm:max-w-md lg:max-w-lg leading-none" title={nombreEmpresa}>
                {nombreEmpresa}
              </h2>
              <span className="shrink-0 text-[9px] font-black px-2 py-0.5 bg-indigo-500/25 border border-indigo-400/40 text-indigo-200 tracking-wider rounded-md uppercase font-mono">
                {language === "es" ? "Importación Global" : "Global Import"}
              </span>
            </div>

            <p className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase flex items-center gap-1.5">
              <Anchor className="h-3 w-3 text-sky-400" />
              {language === "es" ? "Sistema de Operaciones de Carga Internacional" : "International Cargo Operations System"}
            </p>

            {/* Fila de Datos Corporativos: Teléfono, Correo, Dirección */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-300 font-medium">
              <div className="flex items-center gap-1 shrink-0">
                <Phone className="h-3.5 w-3.5 text-indigo-455 shrink-0" />
                <span className="font-mono text-slate-400">Tlf:</span>
                <span className="font-bold text-slate-200">{telefono}</span>
              </div>
              <div className="hidden sm:inline text-slate-700">•</div>
              <div className="flex items-center gap-1 shrink-0">
                <Mail className="h-3.5 w-3.5 text-indigo-455 shrink-0" />
                <span className="font-mono text-slate-400">Email:</span>
                <span className="font-bold text-slate-200">{email}</span>
              </div>
              <div className="hidden sm:inline text-slate-700">•</div>
              <div className="flex items-center gap-1 min-w-0">
                <MapPin className="h-3.5 w-3.5 text-indigo-455 shrink-0" />
                <span className="font-mono text-slate-400">{language === "es" ? "Dirección:" : "Address:"}</span>
                <span className="font-bold text-slate-200 truncate max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]" title={direccion}>{direccion}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Búsqueda y Controles */}
        <div className="flex items-center gap-4 relative z-10">
          <div className="relative w-48 lg:w-56 hidden md:block">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-500" />
            </span>
            <input
              type="text"
              placeholder={language === "es" ? "Buscar contenedores, SKUs..." : "Search containers, SKUs..."}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs glass-input text-slate-200 focus:outline-none focus:border-indigo-500/40"
            />
          </div>

          {/* Indicador de Conexión de Datos */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
            </span>
            <span className="text-[10px] font-bold text-slate-300 font-mono tracking-wider">
              {language === "es" ? "Aduana Online" : "Customs Online"}
            </span>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-1.5 border-l border-slate-800/80 pl-3">
            <button 
              title={language === "es" ? "Cambiar Idioma" : "Change Language"}
              onClick={() => setLanguage(language === "es" ? "en" : "es")}
              className="flex items-center gap-1.5 p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-slate-800"
            >
              <Globe className="h-4 w-4 text-indigo-400" />
              <span className="text-[10px] font-bold font-mono tracking-tight uppercase">
                {language === "es" ? "ES" : "EN"}
              </span>
            </button>

            <button 
              title={language === "es" ? "Recargar panel corporativo" : "Reload corporate info"}
              onClick={cargarEmpresa}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            {/* Perfil Rápido */}
            {usuario && (
              <button
                type="button"
                onClick={() => setModalPass(true)}
                title={`${usuario.nombre} (${usuario.rol}) - ${language === "es" ? "Cambiar contraseña" : "Change password"}`}
                className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-colors ml-1 cursor-pointer"
              >
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                  usuario.rol === "master"
                    ? "bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 shadow-sm"
                    : usuario.rol === "admin"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-300"
                }`}>
                  {userIniciales}
                </div>
                <KeyRound className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-300 mr-1" />
              </button>
            )}
          </div>
        </div>
      </header>

      {modalPass && <ChangePasswordModal onClose={() => setModalPass(false)} />}
    </>
  );
}


