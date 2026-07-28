"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Settings, 
  UploadCloud, 
  Save, 
  Check, 
  AlertCircle, 
  Loader2, 
  FileJson, 
  Hash,
  Database,
  Building2,
  Image as ImageIcon,
  X
} from "lucide-react";
import { 
  obtenerSecuencias, 
  actualizarSecuencias, 
  SecuenciasMap,
  importarClientes,
  importarProveedores,
  importarCotizaciones,
  importarOrdenes,
  obtenerEmpresa,
  actualizarEmpresa,
  EmpresaConfig,
  obtenerConfigIVA,
  actualizarConfigIVA,
  IVAConfig
} from "@/lib/api/importaciones";
import { useTranslation } from "@/context/LanguageContext";

export default function ConfiguracionPage() {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<"empresa" | "secuencias" | "importacion">("empresa");

  // ── Empresa ───────────────────────────────────────────────────────────────
  const [empresa, setEmpresa] = useState<EmpresaConfig>({ nombre: "", rif: "", logoUrl: "", direccion: "", telefono: "", email: "" });
  const [empresaLoading, setEmpresaLoading] = useState(true);
  const [empresaSaving, setEmpresaSaving] = useState(false);
  const [empresaSuccess, setEmpresaSuccess] = useState<string | null>(null);
  const [empresaError, setEmpresaError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── Secuencias ────────────────────────────────────────────────────────────
  const [secuencias, setSecuencias] = useState<SecuenciasMap | null>(null);
  const [secuenciasLoading, setSecuenciasLoading] = useState(true);
  const [secuenciasError, setSecuenciasError] = useState<string | null>(null);
  const [secuenciasSuccess, setSecuenciasSuccess] = useState<string | null>(null);
  const [secuenciasSaving, setSecuenciasSaving] = useState(false);

  // ── Configuración IVA ─────────────────────────────────────────────────────
  const [ivaConfig, setIvaConfig] = useState<IVAConfig>({ sigla: "IVA", porcentaje: 16, activo: true });
  const [ivaSaving, setIvaSaving] = useState(false);
  const [ivaSuccess, setIvaSuccess] = useState<string | null>(null);
  const [ivaError, setIvaError] = useState<string | null>(null);

  // ── Importación ───────────────────────────────────────────────────────────
  const [importType, setImportType] = useState<"clientes" | "proveedores" | "cotizaciones" | "ordenes">("clientes");
  const [importData, setImportData] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadAll() {
      try {
        const [emp, seq, iva] = await Promise.all([
          obtenerEmpresa(),
          obtenerSecuencias(),
          obtenerConfigIVA(),
        ]);
        setEmpresa(emp);
        setSecuencias(seq);
        setIvaConfig(iva);
      } catch (err: any) {
        setSecuenciasError(err.message || "Error al cargar configuración.");
      } finally {
        setEmpresaLoading(false);
        setSecuenciasLoading(false);
      }
    }
    loadAll();
  }, []);

  // ── Handlers Empresa ──────────────────────────────────────────────────────
  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setEmpresa((prev) => ({ ...prev, logoUrl: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmpresaSaving(true);
    setEmpresaError(null);
    setEmpresaSuccess(null);
    try {
      await actualizarEmpresa(empresa);
      // Actualizar localStorage para que el sidebar lo lea inmediatamente
      localStorage.setItem("erp_empresa", JSON.stringify(empresa));
      window.dispatchEvent(new Event("empresa_updated"));
      setEmpresaSuccess(language === "es" ? "Configuración de empresa guardada correctamente." : "Company configuration saved successfully.");
      setTimeout(() => setEmpresaSuccess(null), 4000);
    } catch (err: any) {
      setEmpresaError(err.message || (language === "es" ? "Error al guardar la configuración." : "Error saving configuration."));
    } finally {
      setEmpresaSaving(false);
    }
  };

  // ── Handlers Secuencias ───────────────────────────────────────────────────
  const handleSaveSecuencias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secuencias) return;
    setSecuenciasSaving(true);
    setSecuenciasError(null);
    setSecuenciasSuccess(null);
    try {
      await actualizarSecuencias(secuencias);
      setSecuenciasSuccess(language === "es" ? "Secuencias y correlativos guardados correctamente." : "Sequences and correlatives saved successfully.");
      setTimeout(() => setSecuenciasSuccess(null), 4000);
    } catch (err: any) {
      setSecuenciasError(err.message || (language === "es" ? "Error al actualizar secuencias." : "Error updating sequences."));
    } finally {
      setSecuenciasSaving(false);
    }
  };

  const handleSecuenciaChange = (tipo: string, key: "prefijo" | "siguiente" | "longitud", value: string | number) => {
    if (!secuencias) return;
    setSecuencias({ ...secuencias, [tipo]: { ...secuencias[tipo], [key]: value } });
  };

  // ── Handlers IVA ─────────────────────────────────────────────────────────
  const handleSaveIVA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIvaSaving(true);
    setIvaError(null);
    setIvaSuccess(null);
    try {
      await actualizarConfigIVA(ivaConfig);
      setIvaSuccess(language === "es" ? "Configuración de IVA guardada correctamente." : "VAT configuration saved successfully.");
      setTimeout(() => setIvaSuccess(null), 4000);
    } catch (err: any) {
      setIvaError(err.message || (language === "es" ? "Error al guardar IVA." : "Error saving VAT."));
    } finally {
      setIvaSaving(false);
    }
  };

  // ── Handlers Importación ──────────────────────────────────────────────────
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    setImportSuccess(null);
    if (!importData.trim()) { 
      setImportError(language === "es" ? "Por favor ingrese el contenido JSON a importar." : "Please enter the JSON content to import."); 
      return; 
    }
    try {
      setImportLoading(true);
      const parsed = JSON.parse(importData);
      if (!Array.isArray(parsed)) throw new Error(language === "es" ? "El JSON de importación debe ser un arreglo de elementos." : "The import JSON must be an array of elements.");
      if (importType === "clientes") await importarClientes(parsed);
      else if (importType === "proveedores") await importarProveedores(parsed);
      else if (importType === "cotizaciones") await importarCotizaciones(parsed);
      else if (importType === "ordenes") await importarOrdenes(parsed);
      setImportSuccess(language === "es" ? `Importación de ${parsed.length} registros realizada exitosamente.` : `Import of ${parsed.length} records successfully completed.`);
      setImportData("");
    } catch (err: any) {
      setImportError(err.message || (language === "es" ? "Error al procesar la importación. Verifique el formato JSON." : "Error processing the import. Please verify the JSON format."));
    } finally {
      setImportLoading(false);
    }
  };

  const getTemplatePlaceholder = () => {
    if (importType === "clientes") return `[\n  {\n    "nombre": "Distribuidora Metales C.A.",\n    "rif": "J-12345678-9",\n    "email": "contacto@metales.com",\n    "telefono": "+58 212 555-1234",\n    "direccion": "Zona Industrial, Caracas"\n  }\n]`;
    if (importType === "proveedores") return `[\n  {\n    "nombre": "Global Logistics Corp",\n    "rif": "N-99988877-6",\n    "email": "sales@globallogistics.com",\n    "telefono": "+1 305 555-9876",\n    "direccion": "Miami FL"\n  }\n]`;
    if (importType === "cotizaciones") return `[\n  {\n    "clienteId": "CLI-001",\n    "clienteNombre": "Distribuidora Metales C.A.",\n    "fecha": "2026-06-30T00:00:00.000Z",\n    "estado": "aprobado",\n    "items": [{ "sku": "SKU-A", "descripcion": "Láminas de Aluminio", "cantidad": 10, "precioUnitario": 150.00 }],\n    "total": 1740.00\n  }\n]`;
    return `[\n  {\n    "clienteId": "CLI-001",\n    "clienteNombre": "Distribuidora Metales C.A.",\n    "fecha": "2026-06-30T00:00:00.000Z",\n    "estado": "pendiente",\n    "items": [{ "sku": "SKU-A", "descripcion": "Láminas de Aluminio", "cantidadPedida": 10, "precioUnitario": 150.00, "cantidadRecibida": 0, "cantidadEntregada": 0 }],\n    "montoTotal": 1740.00\n  }\n]`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-8 h-8 text-sky-500 animate-spin-slow" />
            {language === "es" ? "Configuración del Sistema" : "System Configuration"}
          </h1>
          <p className="text-slate-400 mt-1">
            {language === "es" 
              ? "Personaliza tu empresa, correlativos y migra datos históricos." 
              : "Personalize your company, sequence numbers, and migrate historical data."}
          </p>
        </div>

        {/* Selector de Pestañas */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl gap-1">
          {([
            { id: "empresa",     label: language === "es" ? "Mi Empresa" : "My Company",          Icon: Building2   },
            { id: "secuencias",  label: language === "es" ? "Secuencias" : "Sequences",          Icon: Hash        },
            { id: "importacion", label: language === "es" ? "Importación Histórica" : "Historical Import", Icon: UploadCloud },
          ] as const).map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                activeTab === id ? "bg-sky-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── TAB: EMPRESA ────────────────────────────────────────────────── */}
      {activeTab === "empresa" && (
        <div className="space-y-6">
          {empresaLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSaveEmpresa} className="space-y-6">
              {empresaSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex items-center gap-3">
                  <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-emerald-400 text-sm font-medium">{empresaSuccess}</span>
                </div>
              )}
              {empresaError && (
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-red-400 text-sm font-medium">{empresaError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Logo */}
                <div className="lg:col-span-1">
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 h-full">
                    <h3 className="font-bold text-white text-base border-b border-slate-800/80 pb-3">
                      {language === "es" ? "Logo de la Empresa" : "Company Logo"}
                    </h3>
                    <div className="flex flex-col items-center gap-4">
                      {/* Preview del logo */}
                      <div className="w-32 h-32 rounded-2xl bg-slate-800 border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden relative group">
                        {empresa.logoUrl ? (
                          <>
                            <img src={empresa.logoUrl} alt="Logo empresa" className="w-full h-full object-contain p-2" />
                            <button type="button"
                              onClick={() => setEmpresa((p) => ({ ...p, logoUrl: "" }))}
                              className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <div className="text-center text-slate-500">
                            <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                            <span className="text-xs">{language === "es" ? "Sin logo" : "No logo"}</span>
                          </div>
                        )}
                      </div>

                      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
                      <button type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="w-full py-2 px-4 rounded-xl border border-slate-700 hover:border-sky-500 text-slate-300 hover:text-sky-400 text-sm font-medium transition-all flex items-center justify-center gap-2">
                        <UploadCloud className="w-4 h-4" />
                        {language === "es" ? "Subir imagen" : "Upload Image"}
                      </button>

                      <div className="w-full space-y-1">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {language === "es" ? "O pega una URL" : "Or paste a URL"}
                        </label>
                        <input type="url" value={empresa.logoUrl || ""}
                          onChange={(e) => setEmpresa((p) => ({ ...p, logoUrl: e.target.value }))}
                          placeholder="https://..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white text-xs focus:outline-none focus:border-sky-500" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Datos de la empresa */}
                <div className="lg:col-span-2">
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-white text-base border-b border-slate-800/80 pb-3">
                      {language === "es" ? "Datos de la Empresa" : "Company Information"}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {language === "es" ? "Nombre de la Empresa *" : "Company Name *"}
                        </label>
                        <input type="text" required value={empresa.nombre}
                          onChange={(e) => setEmpresa((p) => ({ ...p, nombre: e.target.value }))}
                          placeholder={language === "es" ? "Ej. Maxicom Bejuma C.A." : "e.g., Maxicom Bejuma C.A."}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-white text-sm focus:outline-none focus:border-sky-500 font-semibold" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {language === "es" ? "RIF / NIT" : "Tax ID / RIF / NIT"}
                        </label>
                        <input type="text" value={empresa.rif || ""}
                          onChange={(e) => setEmpresa((p) => ({ ...p, rif: e.target.value }))}
                          placeholder="Ej. J-12345678-9"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-sky-500 font-mono" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {language === "es" ? "Teléfono" : "Phone"}
                        </label>
                        <input type="text" value={empresa.telefono || ""}
                          onChange={(e) => setEmpresa((p) => ({ ...p, telefono: e.target.value }))}
                          placeholder="Ej. 0249-1234567"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-sky-500" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {language === "es" ? "Correo" : "Email"}
                        </label>
                        <input type="email" value={empresa.email || ""}
                          onChange={(e) => setEmpresa((p) => ({ ...p, email: e.target.value }))}
                          placeholder="contacto@empresa.com"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-sky-500" />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {language === "es" ? "Dirección" : "Address"}
                        </label>
                        <textarea value={empresa.direccion || ""}
                          onChange={(e) => setEmpresa((p) => ({ ...p, direccion: e.target.value }))}
                          placeholder="Av. Principal, Local 5, Ciudad..."
                          rows={2}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-sky-500 resize-none" />
                      </div>

                      {/* Cuentas Bancarias */}
                      <div className="sm:col-span-2 border-t border-slate-800/80 pt-4 mt-2 space-y-6">
                        {/* Sección 1: Cuentas Nacionales */}
                        <div>
                          <h4 className="font-bold text-slate-200 text-sm mb-3">
                            {language === "es" ? "Cuentas Bancarias Nacionales (Bolívares o USD Custodia)" : "National Bank Accounts (Bs. / USD Custodia)"}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                {language === "es" ? "Nombre / Etiqueta Cuenta Nacional 1" : "National Account 1 Name"}
                              </label>
                              <input type="text" value={empresa.bancoNombre1 || ""}
                                onChange={(e) => setEmpresa((p) => ({ ...p, bancoNombre1: e.target.value }))}
                                placeholder="Ej. Banesco Bolívares"
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-sky-500" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                {language === "es" ? "Nombre / Etiqueta Cuenta Nacional 2" : "National Account 2 Name"}
                              </label>
                              <input type="text" value={empresa.bancoNombre2 || ""}
                                onChange={(e) => setEmpresa((p) => ({ ...p, bancoNombre2: e.target.value }))}
                                placeholder="Ej. Mercantil USD Custodia"
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-sky-500" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                {language === "es" ? "Detalles Cuenta Nacional 1" : "National Account 1 Details"}
                              </label>
                              <textarea value={empresa.bancoDetalle1 || ""}
                                onChange={(e) => setEmpresa((p) => ({ ...p, bancoDetalle1: e.target.value }))}
                                placeholder="Nro de Cuenta, Banco, Beneficiario, RIF..."
                                rows={3}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-sky-500 resize-none font-mono" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                {language === "es" ? "Detalles Cuenta Nacional 2" : "National Account 2 Details"}
                              </label>
                              <textarea value={empresa.bancoDetalle2 || ""}
                                onChange={(e) => setEmpresa((p) => ({ ...p, bancoDetalle2: e.target.value }))}
                                placeholder="Nro de Cuenta, Banco, Beneficiario, RIF..."
                                rows={3}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-sky-500 resize-none font-mono" />
                            </div>
                          </div>
                        </div>

                        {/* Sección 2: Cuentas Internacionales */}
                        <div className="border-t border-slate-800/80 pt-4">
                          <h4 className="font-bold text-slate-200 text-sm mb-3">
                            {language === "es" ? "Cuentas Bancarias Internacionales (Zelle, ACH, Wire Transfer)" : "International Bank Accounts (Zelle, ACH, Wire)"}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                {language === "es" ? "Nombre / Etiqueta Cuenta Internacional 1" : "International Account 1 Name"}
                              </label>
                              <input type="text" value={empresa.bancoNombre3 || ""}
                                onChange={(e) => setEmpresa((p) => ({ ...p, bancoNombre3: e.target.value }))}
                                placeholder="Ej. Chase Bank Wire"
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-sky-500" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                {language === "es" ? "Nombre / Etiqueta Cuenta Internacional 2" : "International Account 2 Name"}
                              </label>
                              <input type="text" value={empresa.bancoNombre4 || ""}
                                onChange={(e) => setEmpresa((p) => ({ ...p, bancoNombre4: e.target.value }))}
                                placeholder="Ej. Banesco Panamá USD"
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-sky-500" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                {language === "es" ? "Detalles Cuenta Internacional 1" : "International Account 1 Details"}
                              </label>
                              <textarea value={empresa.bancoDetalle3 || ""}
                                onChange={(e) => setEmpresa((p) => ({ ...p, bancoDetalle3: e.target.value }))}
                                placeholder="SWIFT/BIC, Routing ABA, Cuenta, Beneficiario, Dirección del Banco..."
                                rows={3}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-sky-500 resize-none font-mono" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                {language === "es" ? "Detalles Cuenta Internacional 2" : "International Account 2 Details"}
                              </label>
                              <textarea value={empresa.bancoDetalle4 || ""}
                                onChange={(e) => setEmpresa((p) => ({ ...p, bancoDetalle4: e.target.value }))}
                                placeholder="SWIFT/BIC, IBAN, Cuenta, Beneficiario, Dirección del Banco..."
                                rows={3}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-sky-500 resize-none font-mono" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={empresaSaving}
                  className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2.5 px-6 rounded-xl transition duration-300 disabled:opacity-50 cursor-pointer">
                  {empresaSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {language === "es" ? "Guardar Configuración de Empresa" : "Save Company Settings"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ─── TAB: SECUENCIAS ──────────────────────────────────────────────── */}
      {activeTab === "secuencias" && (
        <div className="space-y-6">
          {secuenciasLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
              <p className="text-slate-400 mt-4 font-medium">
                {language === "es" ? "Cargando configuración de secuencias..." : "Loading sequence settings..."}
              </p>
            </div>
          ) : secuenciasError ? (
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <span className="text-red-400 text-sm font-medium">{secuenciasError}</span>
            </div>
          ) : (
            <form onSubmit={handleSaveSecuencias} className="space-y-6">
              {secuenciasSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex items-center gap-3">
                  <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-emerald-400 text-sm font-medium">{secuenciasSuccess}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {secuencias && Object.keys(secuencias).map((tipo) => {
                  const item = secuencias[tipo];
                  const label =
                    tipo === "cotizacion" ? (language === "es" ? "Cotizaciones" : "Quotations (Budgets)") :
                    tipo === "orden_cliente" ? (language === "es" ? "Órdenes de Clientes" : "Customer Orders") :
                    tipo === "pedido_proveedor" ? (language === "es" ? "Pedidos a Fábrica (Proveedor)" : "Supplier Requests") :
                    tipo === "despacho" ? (language === "es" ? "Despachos (Notas de Entrega)" : "Deliveries & Shipments") :
                    tipo === "factura" ? (language === "es" ? "Facturas Comerciales" : "Commercial Invoices") : tipo;

                  return (
                    <div key={tipo} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition duration-300 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                        <h3 className="font-bold text-white text-base">{label}</h3>
                        <span className="text-xs text-sky-500 bg-sky-500/10 px-2.5 py-1 rounded-full font-mono font-semibold">
                          {item.prefijo}{String(item.siguiente).padStart(item.longitud, "0")}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            {language === "es" ? "Prefijo" : "Prefix"}
                          </label>
                          <input type="text" value={item.prefijo}
                            onChange={(e) => handleSecuenciaChange(tipo, "prefijo", e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-sky-500 font-mono" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            {language === "es" ? "Siguiente" : "Next"}
                          </label>
                          <input type="number" value={item.siguiente}
                            onChange={(e) => handleSecuenciaChange(tipo, "siguiente", parseInt(e.target.value) || 1)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-sky-500 font-mono" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            {language === "es" ? "Longitud" : "Length"}
                          </label>
                          <input type="number" value={item.longitud}
                            onChange={(e) => handleSecuenciaChange(tipo, "longitud", parseInt(e.target.value) || 4)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-sky-500 font-mono" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end pt-4">
                <button type="submit" disabled={secuenciasSaving}
                  className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2.5 px-6 rounded-xl transition duration-300 disabled:opacity-50 cursor-pointer">
                  {secuenciasSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {language === "es" ? "Guardar Correlativos" : "Save Sequences"}
                </button>
              </div>
            </form>
          )}

          {/* ── Panel de Configuración de IVA ── */}
          <form onSubmit={handleSaveIVA}
            className="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">
                  {language === "es" ? "Configuración de Impuesto (IVA / Otro)" : "Tax Configuration (VAT / Other)"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === "es"
                    ? "Este impuesto solo aplica a Facturas. Cotizaciones, Órdenes y Pedidos no incluyen impuesto."
                    : "This tax only applies to Invoices. Quotations, Orders, and Supplier requests do not include tax."}
                </p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${ivaConfig.activo ? "bg-amber-500/15 text-amber-400" : "bg-slate-800 text-slate-500"}`}>
                {ivaConfig.activo ? `${ivaConfig.sigla} ${ivaConfig.porcentaje}%` : (language === "es" ? "Desactivado" : "Disabled")}
              </span>
            </div>

            {ivaSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex items-center gap-2 text-emerald-400 text-sm">
                <Check className="w-4 h-4 shrink-0" /> {ivaSuccess}
              </div>
            )}
            {ivaError && (
              <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" /> {ivaError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {language === "es" ? "Sigla del Impuesto" : "Tax Label (Acronym)"}
                </label>
                <input type="text" value={ivaConfig.sigla}
                  onChange={(e) => setIvaConfig((p) => ({ ...p, sigla: e.target.value }))}
                  placeholder="Ej: IVA, IGV, IGTF"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-white text-sm focus:outline-none focus:border-amber-500 font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {language === "es" ? "Porcentaje (%)" : "Percentage (%)"}
                </label>
                <input type="number" min={0} max={100} step={0.01} value={ivaConfig.porcentaje}
                  onChange={(e) => setIvaConfig((p) => ({ ...p, porcentaje: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-white text-sm focus:outline-none focus:border-amber-500 font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {language === "es" ? "Estado" : "Status"}
                </label>
                <button type="button"
                  onClick={() => setIvaConfig((p) => ({ ...p, activo: !p.activo }))}
                  className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    ivaConfig.activo
                      ? "bg-amber-500/15 border border-amber-500/40 text-amber-400 hover:bg-amber-500/25"
                      : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700"
                  }`}>
                  {ivaConfig.activo ? (language === "es" ? "✓ Activo" : "✓ Active") : (language === "es" ? "○ Inactivo" : "○ Inactive")}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={ivaSaving}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2.5 px-6 rounded-xl transition duration-300 disabled:opacity-50 cursor-pointer">
                {ivaSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {language === "es" ? `Guardar Configuración de ${ivaConfig.sigla || "Impuesto"}` : `Save ${ivaConfig.sigla || "Tax"} Settings`}
              </button>
            </div>
          </form>
        </div>
      )}


      {/* ─── TAB: IMPORTACIÓN ─────────────────────────────────────────────── */}
      {activeTab === "importacion" && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Database className="w-5 h-5 text-sky-500" />
              {language === "es" ? "Cargar Documentos y Datos Históricos" : "Load Documents and Historical Data"}
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              {language === "es"
                ? "Esta sección le permite migrar datos de un sistema externo pegando un arreglo de objetos en formato JSON."
                : "This section allows you to migrate data from an external system by pasting an array of objects in JSON format."}
            </p>
            <form onSubmit={handleImportSubmit} className="space-y-5">
              {importError && (
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-red-400 text-sm font-medium">{importError}</span>
                </div>
              )}
              {importSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex items-center gap-3">
                  <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-emerald-400 text-sm font-medium">{importSuccess}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {(["clientes", "proveedores", "cotizaciones", "ordenes"] as const).map((type) => {
                  const lbl = 
                    type === "clientes" ? (language === "es" ? "Clientes" : "Customers") :
                    type === "proveedores" ? (language === "es" ? "Proveedores" : "Suppliers") :
                    type === "cotizaciones" ? (language === "es" ? "Cotizaciones" : "Quotations") :
                    (language === "es" ? "Órdenes Cliente" : "Customer Orders");
                  return (
                    <button key={type} type="button"
                      onClick={() => { setImportType(type); setImportError(null); setImportSuccess(null); }}
                      className={`py-3 px-4 rounded-xl border text-sm font-bold capitalize transition duration-300 cursor-pointer ${
                        importType === type
                          ? "bg-sky-600/10 border-sky-500 text-sky-400"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}>
                      {lbl}
                    </button>
                  );
                })}
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-slate-300">
                    {language === "es" ? "Datos JSON a importar" : "JSON Data to Import"}
                  </label>
                  <button type="button" onClick={() => setImportData(getTemplatePlaceholder())}
                    className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer">
                    <FileJson className="w-3.5 h-3.5" />
                    {language === "es" ? "Cargar Plantilla de Ejemplo" : "Load Example Template"}
                  </button>
                </div>
                <textarea value={importData} onChange={(e) => setImportData(e.target.value)}
                  placeholder={getTemplatePlaceholder()} rows={10}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 text-sm font-mono focus:outline-none focus:border-sky-500" />
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={importLoading}
                  className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2.5 px-6 rounded-xl transition duration-300 disabled:opacity-50 cursor-pointer">
                  {importLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                  {language === "es" ? "Iniciar Importación" : "Start Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
