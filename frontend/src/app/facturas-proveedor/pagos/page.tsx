"use client";

import { useEffect, useState } from "react";
import { 
  DollarSign, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  FileText
} from "lucide-react";
import { useRouter } from "next/navigation";
import { 
  obtenerFacturasProveedor,
  obtenerProveedores,
  registrarPagoProveedor
} from "@/lib/api/importaciones";
import { Proveedor } from "@/types";
import { useTranslation } from "@/context/LanguageContext";

export default function RegistrarPagoProveedorPage() {
  const router = useRouter();
  const { t, language } = useTranslation();
  
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [facturasPendientes, setFacturasPendientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [proveedorId, setProveedorId] = useState("");
  const [montoTotal, setMontoTotal] = useState<number | "">("");
  const [referencia, setReferencia] = useState("");
  const [metodoPago, setMetodoPago] = useState("Transferencia");
  const [fechaPago, setFechaPago] = useState(() => new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState("");
  
  // Facturas a Pagar
  const [pagosFacturas, setPagosFacturas] = useState<{facturaId: string; montoAplicado: number; saldoOriginal: number}[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const provs = await obtenerProveedores();
        const facs = await obtenerFacturasProveedor();
        setProveedores(provs);
        // Filtrar facturas que no estén pagadas ni anuladas
        setFacturasPendientes(facs.filter(f => f.estado !== 'Anulada' && f.estado !== 'Pagada' && f.saldoPendiente > 0));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleProveedorChange = (id: string) => {
    setProveedorId(id);
    setMontoTotal("");
    setPagosFacturas([]);
  };

  const facturasDelProveedor = facturasPendientes.filter(f => f.proveedorId === proveedorId);
  const totalDeuda = facturasDelProveedor.reduce((s, f) => s + Number(f.saldoPendiente), 0);

  const toggleFactura = (fac: any) => {
    const isSelected = pagosFacturas.find(p => p.facturaId === fac.facturaId || p.facturaId === fac.id);
    if (isSelected) {
      setPagosFacturas(pagosFacturas.filter(p => p.facturaId !== fac.facturaId && p.facturaId !== fac.id));
    } else {
      setPagosFacturas([...pagosFacturas, { 
        facturaId: fac.facturaId || fac.id, 
        montoAplicado: Number(fac.saldoPendiente), 
        saldoOriginal: Number(fac.saldoPendiente) 
      }]);
    }
  };

  const handleMontoAplicadoChange = (facturaId: string, monto: number) => {
    setPagosFacturas(prev => prev.map(p => {
      if (p.facturaId === facturaId) {
        return { ...p, montoAplicado: Math.min(monto, p.saldoOriginal) }; // No pagar de más
      }
      return p;
    }));
  };

  const autoDistribuir = () => {
    if (!montoTotal || montoTotal <= 0) return;
    let montoDisponible = Number(montoTotal);
    const distribucion: any[] = [];

    // Ordenar facturas por fecha (las más viejas primero)
    const facturasOrdenadas = [...facturasDelProveedor].sort((a, b) => 
      new Date(a.fechaEmision || a.createdAt).getTime() - new Date(b.fechaEmision || b.createdAt).getTime()
    );

    for (const fac of facturasOrdenadas) {
      if (montoDisponible <= 0) break;
      const deuda = Number(fac.saldoPendiente);
      const aplicar = Math.min(deuda, montoDisponible);
      distribucion.push({
        facturaId: fac.facturaId || fac.id,
        montoAplicado: aplicar,
        saldoOriginal: deuda
      });
      montoDisponible -= aplicar;
    }

    setPagosFacturas(distribucion);
  };

  const totalAplicado = pagosFacturas.reduce((s, p) => s + p.montoAplicado, 0);

  const handleSavePago = async () => {
    if (!proveedorId || !montoTotal || Number(montoTotal) <= 0 || pagosFacturas.length === 0) {
      setError("Falta Proveedor, Monto Total o Facturas a Pagar");
      return;
    }

    // Validar que el total aplicado cuadre aproximadamente con el monto del pago
    // Permitir pequeña tolerancia por redondeos
    if (Math.abs(totalAplicado - Number(montoTotal)) > 1) {
      setError("El total distribuido en las facturas debe ser igual al Monto Total del Pago.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await registrarPagoProveedor({
        proveedorId,
        montoTotal: Number(montoTotal),
        referencia,
        metodoPago,
        fechaPago,
        notas,
        pagosFacturas
      });
      router.push('/facturas-proveedor');
    } catch (err: any) {
      setError(err.message || "Error al registrar el pago");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <DollarSign className="h-6 w-6 text-emerald-400" />
        <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
          {language === "es" ? "Registrar Pago a Proveedor" : "Register Supplier Payment"}
        </h2>
      </div>

      {error && (
        <div className="p-4 bg-rose-955/40 border border-rose-900/40 rounded-xl text-rose-300 text-xs flex gap-2 items-start">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="glass-panel p-6 rounded-2xl space-y-6">
        
        {/* Paso 1: Datos del Pago */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/60 pb-2">
            <Building2 className="h-4 w-4 text-emerald-400" /> 1. Datos del Pago
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Proveedor / Beneficiario</label>
              <select
                value={proveedorId}
                onChange={e => handleProveedorChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs glass-input"
              >
                <option value="" className="bg-slate-900 text-white">-- Seleccionar Proveedor --</option>
                {proveedores.map(p => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">{p.nombre}</option>
                ))}
              </select>
              {proveedorId && (
                <p className="text-[10px] text-emerald-400 font-bold">Deuda Pendiente Total: ${totalDeuda.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase text-emerald-400">Monto Total del Pago ($)</label>
              <input
                type="number"
                value={montoTotal}
                onChange={e => setMontoTotal(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl text-xs glass-input font-mono font-bold text-emerald-300 bg-emerald-500/5"
                min="0" step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Fecha de Pago</label>
              <input
                type="date"
                value={fechaPago}
                onChange={e => setFechaPago(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs glass-input"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Método</label>
              <select
                value={metodoPago}
                onChange={e => setMetodoPago(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs glass-input"
              >
                <option value="Transferencia" className="bg-slate-900 text-white">Transferencia (Wire)</option>
                <option value="TDC" className="bg-slate-900 text-white">Tarjeta de Crédito</option>
                <option value="Cripto" className="bg-slate-900 text-white">Criptomonedas (USDT)</option>
                <option value="Efectivo" className="bg-slate-900 text-white">Efectivo</option>
                <option value="Otro" className="bg-slate-900 text-white">Otro</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Referencia</label>
              <input
                type="text"
                value={referencia}
                onChange={e => setReferencia(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                placeholder="Tx Hash, Ref Banco..."
              />
            </div>
          </div>

        </div>

        {/* Paso 2: Distribución en Facturas */}
        <div className="space-y-4">
          <div className="flex justify-between items-end border-b border-slate-800/60 pb-2">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-400" /> 2. Aplicar a Facturas
            </h3>
            <button
              onClick={autoDistribuir}
              disabled={!montoTotal || !proveedorId}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded cursor-pointer transition-colors disabled:opacity-50"
            >
              Auto-Distribuir (FIFO)
            </button>
          </div>

          {!proveedorId ? (
            <p className="text-xs text-slate-500 text-center p-4">Seleccione un proveedor para ver sus facturas pendientes.</p>
          ) : facturasDelProveedor.length === 0 ? (
            <p className="text-xs text-emerald-500/80 text-center p-4">Este proveedor no tiene facturas con saldo pendiente.</p>
          ) : (
            <div className="space-y-2">
              {facturasDelProveedor.map(fac => {
                const facId = fac.facturaId || fac.id;
                const pago = pagosFacturas.find(p => p.facturaId === facId);
                const isSelected = !!pago;

                return (
                  <div key={facId} className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isSelected ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-800/60 bg-slate-900/30 hover:border-slate-700'}`}>
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFactura(fac)}
                        className="accent-emerald-500 rounded border-slate-700 bg-slate-900 w-4 h-4"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-200">{fac.numeroFactura || 'S/N'} <span className="text-[10px] text-slate-500 font-mono">({facId})</span></p>
                        <p className="text-[10px] text-slate-400">Fecha: {new Date(fac.fechaEmision || fac.createdAt).toLocaleDateString()} | Total: ${Number(fac.total).toLocaleString('en-US')}</p>
                      </div>
                    </label>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="text-right flex-1 sm:flex-none">
                        <p className="text-[10px] text-slate-400 uppercase mb-0.5">Saldo Deuda</p>
                        <p className="text-xs font-mono font-bold text-rose-400">${Number(fac.saldoPendiente).toLocaleString('en-US', {minimumFractionDigits:2})}</p>
                      </div>
                      {isSelected && (
                        <div className="w-32">
                          <p className="text-[10px] text-emerald-400 font-bold uppercase mb-0.5">Abono</p>
                          <input
                            type="number"
                            value={pago.montoAplicado}
                            onChange={e => handleMontoAplicadoChange(facId, Number(e.target.value))}
                            className="w-full px-2 py-1 rounded text-xs glass-input font-mono bg-black/40"
                            min="0" step="0.01"
                            max={pago.saldoOriginal}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Totales y validación */}
          {proveedorId && (
            <div className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-300">Total Distribuido:</span>
              <span className={`text-lg font-mono font-black ${Math.abs(totalAplicado - Number(montoTotal)) > 1 ? 'text-rose-400' : 'text-emerald-400'}`}>
                ${totalAplicado.toLocaleString('en-US', {minimumFractionDigits: 2})} / ${Number(montoTotal || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
              </span>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-800/60 flex justify-end">
          <button 
            onClick={handleSavePago}
            disabled={isSubmitting || !proveedorId || !montoTotal || pagosFacturas.length === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Confirmar y Registrar Pago
          </button>
        </div>

      </div>
    </div>
  );
}
