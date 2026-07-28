"use client";

import { useState, useRef, useEffect } from "react";
import { 
  FileText, 
  Loader2, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  DollarSign,
  Save,
  Trash2,
  Plus,
  ArrowLeft,
  Sparkles,
  Calendar,
  X,
  UserCheck
} from "lucide-react";
import { useRouter } from "next/navigation";
import { 
  crearFacturaProveedor,
  obtenerProveedores,
  obtenerOrdenesCliente,
  crearProveedor
} from "@/lib/api/importaciones";
import { Proveedor, OrdenCliente } from "@/types";
import { useTranslation } from "@/context/LanguageContext";

export default function NuevaFacturaProveedorPage() {
  const router = useRouter();
  const { language } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [ordenesPendientes, setOrdenesPendientes] = useState<OrdenCliente[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // IA State
  const [isProcessing, setIsProcessing] = useState(false);
  const [iaResult, setIaResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [proveedorId, setProveedorId] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [fechaEmision, setFechaEmision] = useState(() => new Date().toISOString().split('T')[0]);
  const [moneda, setMoneda] = useState("USD");
  const [total, setTotal] = useState(0);
  const [flete, setFlete] = useState(0);
  const [impuestos, setImpuestos] = useState(0);
  const [otrosGastos, setOtrosGastos] = useState(0);
  const [observaciones, setObservaciones] = useState("");
  const [ordenesVinculadas, setOrdenesVinculadas] = useState<string[]>([]);
  
  // Términos & Referencias
  const [offerValid, setOfferValid] = useState("15 Days");
  const [originCountry, setOriginCountry] = useState("United States of America");
  const [shippedFrom, setShippedFrom] = useState("Miami");
  const [freightTerm, setFreightTerm] = useState("AIR");
  const [portOfDestination, setPortOfDestination] = useState("Miami");
  const [proformaDateDue, setProformaDateDue] = useState("");
  const [peticionOferta, setPeticionOferta] = useState("");

  // Tabla de Ítems Facturados
  const [items, setItems] = useState<Array<{ 
    sku: string; 
    skuProveedor?: string;
    pos?: string;
    descripcion: string; 
    modelo?: string;
    unidad?: string;
    cantidad: number; 
    precioUnitario: number 
  }>>([
    { sku: "", skuProveedor: "", pos: "", descripcion: "", modelo: "", unidad: "uds", cantidad: 1, precioUnitario: 0 }
  ]);
  
  // Modal Proveedor
  const [showNuevoProveedor, setShowNuevoProveedor] = useState(false);
  const [nuevoProveedor, setNuevoProveedor] = useState({ nombre: "", rif: "", email: "", telefono: "", direccion: "" });
  const [savingProveedor, setSavingProveedor] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const provs = await obtenerProveedores();
        const ords = await obtenerOrdenesCliente();
        setProveedores(provs);
        const ordsValidas = ords.filter(o => o.estado !== 'anulado');
        setOrdenesPendientes(ordsValidas);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError(language === "es" ? "Por favor suba un archivo PDF válido." : "Please upload a valid PDF file.");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setError(language === "es" ? "El archivo excede el tamaño máximo (4MB)." : "File exceeds maximum size (4MB).");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setIaResult(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];

        const response = await fetch('/api/extract-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64: base64Data, mimeType: file.type })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Error extrayendo datos");
        }

        const data = await response.json();
        setIaResult(data);
        
        // Autocompletar formulario
        if (data.numeroDocumento) setNumeroFactura(data.numeroDocumento);
        if (data.totalDocumento) setTotal(Number(data.totalDocumento));
        if (data.flete) setFlete(Number(data.flete));
        if (data.impuestos) setImpuestos(Number(data.impuestos));
        if (data.observaciones) setObservaciones(data.observaciones);

        // Autocompletar Ítems extraídos
        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
          const mapped = data.items.map((i: any) => ({
            sku: i.sku || "",
            skuProveedor: i.skuProveedor || "",
            pos: i.pos || "",
            descripcion: i.descripcion || "",
            modelo: i.modelo || "",
            unidad: i.unidad || "uds",
            cantidad: Number(i.cantidadPedida || i.cantidad) || 1,
            precioUnitario: Number(i.precioUnitario || i.costoUnitario) || 0
          }));
          setItems(mapped);
        }

        // Intentar adivinar el proveedor
        if (data.entidad) {
          const pMatch = proveedores.find(p => p.nombre.toLowerCase().includes(data.entidad.toLowerCase()) || data.entidad.toLowerCase().includes(p.nombre.toLowerCase()));
          if (pMatch && pMatch.id) setProveedorId(pMatch.id);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || "Error procesando IA.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Recalcular Total automáticamente al cambiar ítems, flete o impuestos
  useEffect(() => {
    const subtotalItems = items.reduce((sum, item) => sum + (Number(item.cantidad || 0) * Number(item.precioUnitario || 0)), 0);
    const totalCalculado = subtotalItems + Number(flete || 0) + Number(impuestos || 0) + Number(otrosGastos || 0);
    if (subtotalItems > 0) {
      setTotal(Number(totalCalculado.toFixed(2)));
    }
  }, [items, flete, impuestos, otrosGastos]);

  const handleAddItem = () => {
    setItems([...items, { sku: "", skuProveedor: "", pos: "", descripcion: "", modelo: "", unidad: "uds", cantidad: 1, precioUnitario: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      setItems([{ sku: "", skuProveedor: "", pos: "", descripcion: "", modelo: "", unidad: "uds", cantidad: 1, precioUnitario: 0 }]);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const handleSaveFactura = async () => {
    if (!proveedorId || total <= 0) {
      setError("Por favor selecciona el Proveedor e ingresa el Monto Total de la factura.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      await crearFacturaProveedor({
        proveedorId,
        numeroFactura,
        fechaEmision,
        moneda,
        total,
        flete,
        impuestos,
        otrosGastos,
        observaciones,
        ordenesVinculadas,
        offerValid,
        originCountry,
        shippedFrom,
        freightTerm,
        portOfDestination,
        proformaDateDue,
        peticionOferta,
        items,
        iaData: iaResult
      });
      router.push('/facturas-proveedor');
    } catch (err: any) {
      setError(err.message || "Error al crear factura");
      setIsSubmitting(false);
    }
  };

  const toggleOrden = (id: string) => {
    if (ordenesVinculadas.includes(id)) {
      setOrdenesVinculadas(ordenesVinculadas.filter(x => x !== id));
    } else {
      setOrdenesVinculadas([...ordenesVinculadas, id]);
    }
  };

  const handleCrearProveedor = async () => {
    if (!nuevoProveedor.nombre) {
      alert("El nombre es requerido.");
      return;
    }
    setSavingProveedor(true);
    try {
      const provId = await crearProveedor(nuevoProveedor);
      const provs = await obtenerProveedores();
      setProveedores(provs);
      setProveedorId(provId.id || "");
      setShowNuevoProveedor(false);
      setNuevoProveedor({ nombre: "", rif: "", email: "", telefono: "", direccion: "" });
    } catch (err: any) {
      alert(err.message || "Error al crear proveedor");
    } finally {
      setSavingProveedor(false);
    }
  };

  const subtotalProductos = items.reduce((s, i) => s + (Number(i.cantidad || 0) * Number(i.precioUnitario || 0)), 0);

  if (loadingInitial) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto custom-scrollbar">
      <div className="glass-panel w-full max-w-6xl rounded-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200 border border-slate-800 shadow-2xl bg-slate-950/90 my-auto">
        
        {/* Encabezado Modal Estándar ERP */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-slate-100">
                  Cargar Factura Comercial de Proveedor
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
                  Previa: FAC-AUTO
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Botón Importar con IA */}
            <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer">
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Procesando IA...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  <span>Importar Doc/Img (IA)</span>
                </>
              )}
              <input 
                type="file" 
                accept="application/pdf" 
                className="hidden" 
                onChange={handleFileUpload} 
                ref={fileInputRef}
                disabled={isProcessing}
              />
            </label>
            
            <button 
              onClick={() => router.push('/facturas-proveedor')} 
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {iaResult && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Extracción IA exitosa: Proveedor <strong className="text-white">{iaResult.entidad || "Detectado"}</strong>, Factura Nro: <strong className="text-white font-mono">{iaResult.numeroDocumento}</strong></span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-955/40 border border-rose-900/40 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Sección 1: Proveedor Emisor, Responsable, Fecha, Moneda */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/60">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="h-3 w-3 text-indigo-400" /> PROVEEDOR EMISOR *
            </label>
            <div className="flex gap-2">
              <select 
                value={proveedorId} 
                onChange={e => setProveedorId(e.target.value)} 
                className="w-full px-3 py-2 rounded-xl text-xs glass-input text-slate-200"
              >
                <option value="" className="bg-slate-900 text-white">Seleccionar Proveedor...</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">{p.nombre}</option>
                ))}
              </select>
              <button 
                type="button" 
                onClick={() => setShowNuevoProveedor(true)} 
                className="px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold shrink-0 cursor-pointer"
                title="Agregar Nuevo Proveedor"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3 w-3 text-indigo-400" /> FECHA EMISIÓN *
            </label>
            <input 
              type="date" 
              value={fechaEmision} 
              onChange={e => setFechaEmision(e.target.value)} 
              className="w-full px-3 py-2 rounded-xl text-xs glass-input text-slate-200" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-indigo-400" /> MONEDA
            </label>
            <select 
              value={moneda} 
              onChange={e => setMoneda(e.target.value)} 
              className="w-full px-3 py-2 rounded-xl text-xs glass-input text-slate-200 font-bold"
            >
              <option value="USD" className="bg-slate-900 text-white">USD ($)</option>
              <option value="BS" className="bg-slate-900 text-white">BS (Bs.)</option>
              <option value="EUR" className="bg-slate-900 text-white">EUR (€)</option>
            </select>
          </div>
        </div>

        {/* Sección 2: Términos y Datos de Importación / Facturación */}
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">NÚMERO FACTURA / REF *</label>
              <input 
                type="text" 
                value={numeroFactura} 
                onChange={e => setNumeroFactura(e.target.value)} 
                placeholder="Ej. INV-2026-001" 
                className="w-full px-3 py-2 rounded-xl text-xs glass-input font-mono text-slate-200" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">CONDICIONES DE PAGO</label>
              <input 
                type="text" 
                value={offerValid} 
                onChange={e => setOfferValid(e.target.value)} 
                placeholder="Ej. 15 Days" 
                className="w-full px-3 py-2 rounded-xl text-xs glass-input text-slate-200" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">ORIGIN COUNTRY</label>
              <input 
                type="text" 
                value={originCountry} 
                onChange={e => setOriginCountry(e.target.value)} 
                className="w-full px-3 py-2 rounded-xl text-xs glass-input text-slate-200" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">SHIPPED FROM</label>
              <input 
                type="text" 
                value={shippedFrom} 
                onChange={e => setShippedFrom(e.target.value)} 
                className="w-full px-3 py-2 rounded-xl text-xs glass-input text-slate-200" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">FREIGHT TERM</label>
              <input 
                type="text" 
                value={freightTerm} 
                onChange={e => setFreightTerm(e.target.value)} 
                className="w-full px-3 py-2 rounded-xl text-xs glass-input text-slate-200" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">PORT OF DESTINATION</label>
              <input 
                type="text" 
                value={portOfDestination} 
                onChange={e => setPortOfDestination(e.target.value)} 
                className="w-full px-3 py-2 rounded-xl text-xs glass-input text-slate-200" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">PEDIDO PROVEEDOR (PO REF)</label>
              <input 
                type="text" 
                value={proformaDateDue} 
                onChange={e => setProformaDateDue(e.target.value)} 
                placeholder="Ej. PED-0003" 
                className="w-full px-3 py-2 rounded-xl text-xs glass-input text-slate-200 font-mono" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">REQUEST FOR QUOTE (NO.)</label>
              <input 
                type="text" 
                value={peticionOferta} 
                onChange={e => setPeticionOferta(e.target.value)} 
                className="w-full px-3 py-2 rounded-xl text-xs glass-input text-slate-200" 
              />
            </div>
          </div>
        </div>

        {/* Sección 3: Ítems de la Factura */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Ítems de Factura
            </h3>
            <button 
              type="button" 
              onClick={handleAddItem} 
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              + Añadir Ítem
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs min-w-[850px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="p-2.5 w-32">CÓDIGO</th>
                  <th className="p-2.5 w-28">COD. PROV.</th>
                  <th className="p-2.5 w-16">POS</th>
                  <th className="p-2.5">DESCRIPCIÓN</th>
                  <th className="p-2.5 w-28">MODELO</th>
                  <th className="p-2.5 w-20">UNID.</th>
                  <th className="p-2.5 w-24 text-center">CANT.</th>
                  <th className="p-2.5 w-28 text-right">PRECIO</th>
                  <th className="p-2.5 w-28 text-right">TOTAL</th>
                  <th className="p-2.5 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-2">
                      <input 
                        type="text" 
                        placeholder="CÓDIGO" 
                        value={item.sku} 
                        onChange={e => handleItemChange(idx, "sku", e.target.value)} 
                        className="w-full px-2 py-1.5 rounded-lg text-xs glass-input font-mono uppercase" 
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="text" 
                        placeholder="COD. PROV." 
                        value={item.skuProveedor || ""} 
                        onChange={e => handleItemChange(idx, "skuProveedor", e.target.value)} 
                        className="w-full px-2 py-1.5 rounded-lg text-xs glass-input font-mono" 
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="text" 
                        placeholder="POS" 
                        value={item.pos || ""} 
                        onChange={e => handleItemChange(idx, "pos", e.target.value)} 
                        className="w-full px-2 py-1.5 rounded-lg text-xs glass-input text-center" 
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="text" 
                        placeholder="Descripción del producto" 
                        value={item.descripcion} 
                        onChange={e => handleItemChange(idx, "descripcion", e.target.value)} 
                        className="w-full px-2 py-1.5 rounded-lg text-xs glass-input" 
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="text" 
                        placeholder="Modelo" 
                        value={item.modelo || ""} 
                        onChange={e => handleItemChange(idx, "modelo", e.target.value)} 
                        className="w-full px-2 py-1.5 rounded-lg text-xs glass-input" 
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="text" 
                        placeholder="Unid." 
                        value={item.unidad || "uds"} 
                        onChange={e => handleItemChange(idx, "unidad", e.target.value)} 
                        className="w-full px-2 py-1.5 rounded-lg text-xs glass-input text-center" 
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input 
                        type="number" 
                        min="1" 
                        value={item.cantidad} 
                        onChange={e => handleItemChange(idx, "cantidad", Number(e.target.value))} 
                        className="w-full px-2 py-1.5 rounded-lg text-xs glass-input font-mono text-center font-bold text-slate-200" 
                      />
                    </td>
                    <td className="p-2 text-right">
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        value={item.precioUnitario} 
                        onChange={e => handleItemChange(idx, "precioUnitario", Number(e.target.value))} 
                        className="w-full px-2 py-1.5 rounded-lg text-xs glass-input font-mono text-right font-bold text-slate-200" 
                      />
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-indigo-300">
                      ${(Number(item.cantidad || 0) * Number(item.precioUnitario || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-2 text-center">
                      <button 
                        type="button" 
                        onClick={() => handleRemoveItem(idx)} 
                        className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sección 4: Gastos y Totales */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-2">
          <div className="md:col-span-7 grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">FLETE ($)</label>
              <input 
                type="number" 
                step="0.01" 
                min="0" 
                value={flete} 
                onChange={e => setFlete(Number(e.target.value))} 
                className="w-full px-3 py-2 rounded-xl text-xs glass-input font-mono text-slate-200" 
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">ARANCEL ($)</label>
              <input 
                type="number" 
                step="0.01" 
                min="0" 
                value={impuestos} 
                onChange={e => setImpuestos(Number(e.target.value))} 
                className="w-full px-3 py-2 rounded-xl text-xs glass-input font-mono text-slate-200" 
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">OTROS GASTOS ($)</label>
              <input 
                type="number" 
                step="0.01" 
                min="0" 
                value={otrosGastos} 
                onChange={e => setOtrosGastos(Number(e.target.value))} 
                className="w-full px-3 py-2 rounded-xl text-xs glass-input font-mono text-slate-200" 
              />
            </div>
          </div>

          <div className="md:col-span-5 p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Subtotal de Ítems:</span>
              <span className="font-mono font-bold text-slate-200">${subtotalProductos.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-800">
              <span className="font-bold text-indigo-300">Total General USD:</span>
              <span className="font-mono font-black text-indigo-300 text-base">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Sección 5: Observaciones Generales */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase">OBSERVACIONES GENERALES</label>
          <textarea 
            value={observaciones} 
            onChange={e => setObservaciones(e.target.value)} 
            placeholder="Notas importantes, lugar de entrega, condiciones..." 
            className="w-full px-3.5 py-2.5 rounded-xl text-xs glass-input min-h-[80px] resize-none text-slate-200" 
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button 
            type="button" 
            onClick={() => router.push('/facturas-proveedor')} 
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleSaveFactura} 
            disabled={isSubmitting || !proveedorId || total <= 0} 
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar Cotización / Factura
          </button>
        </div>
      </div>

      {/* Modal Agregar Proveedor Rápido */}
      {showNuevoProveedor && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="border-b border-slate-800/60 pb-3 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-400" /> Nuevo Proveedor
              </h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nombre / Razón Social *</label>
                <input
                  type="text"
                  value={nuevoProveedor.nombre}
                  onChange={e => setNuevoProveedor({...nuevoProveedor, nombre: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                  placeholder="Nombre de la empresa"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Identificación (Opcional)</label>
                <input
                  type="text"
                  value={nuevoProveedor.rif}
                  onChange={e => setNuevoProveedor({...nuevoProveedor, rif: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setShowNuevoProveedor(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-white/5 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCrearProveedor}
                  disabled={savingProveedor || !nuevoProveedor.nombre}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {savingProveedor && <Loader2 className="h-3 w-3 animate-spin" />}
                  Guardar y Seleccionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
