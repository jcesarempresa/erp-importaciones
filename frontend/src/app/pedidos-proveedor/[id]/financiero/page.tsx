"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Receipt,
  Truck,
  Plus,
  Loader2,
  DollarSign,
  Calendar,
  AlertCircle,
  FileText,
  CreditCard,
  Trash2
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { PedidoProveedor } from "@/types";
import { useTranslation } from "@/context/LanguageContext";
import {
  obtenerFacturasProveedorPorPedido,
  crearFacturaProveedor,
  obtenerAbonosPorFactura,
  registrarAbonoProveedor,
  obtenerGastosPorPedido,
  crearGastoImportacion,
  eliminarGastoImportacion
} from "@/lib/api/importaciones";

export default function FinancieroPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const { t, language } = useTranslation();
  const router = useRouter();
  
  const [pedido, setPedido] = useState<PedidoProveedor | null>(null);
  const [facturas, setFacturas] = useState<any[]>([]);
  const [gastos, setGastos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States for Factura Modal
  const [showFacturaModal, setShowFacturaModal] = useState(false);
  const [facNum, setFacNum] = useState("");
  const [facFecha, setFacFecha] = useState(() => new Date().toISOString().split("T")[0]);
  const [facSubtotal, setFacSubtotal] = useState(0);
  const [facItems, setFacItems] = useState<any[]>([]);
  const [facSubmitting, setFacSubmitting] = useState(false);

  // States for Abono Modal
  const [showAbonoModal, setShowAbonoModal] = useState<string | null>(null); // facturaId
  const [abonoMonto, setAbonoMonto] = useState(0);
  const [abonoFecha, setAbonoFecha] = useState(() => new Date().toISOString().split("T")[0]);
  const [abonoMetodo, setAbonoMetodo] = useState("Transferencia");
  const [abonoRef, setAbonoRef] = useState("");
  const [abonoSubmitting, setAbonoSubmitting] = useState(false);

  // States for Gasto Modal
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [gastoConcepto, setGastoConcepto] = useState("");
  const [gastoMonto, setGastoMonto] = useState(0);
  const [gastoFecha, setGastoFecha] = useState(() => new Date().toISOString().split("T")[0]);
  const [gastoObs, setGastoObs] = useState("");
  const [gastoSubmitting, setGastoSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Obtener pedido
      const pedSnap = await getDoc(doc(db, "pedidos_proveedor", id));
      if (!pedSnap.exists()) {
        alert("Pedido no encontrado");
        router.push("/pedidos-proveedor");
        return;
      }
      setPedido({ id: pedSnap.id, ...pedSnap.data() } as PedidoProveedor);

      // 2. Obtener Facturas
      const facs = await obtenerFacturasProveedorPorPedido(id);
      
      // Obtener abonos para cada factura
      for (const f of facs) {
        const abonos = await obtenerAbonosPorFactura(f.id);
        f.abonos = abonos;
      }
      setFacturas(facs);

      // 3. Obtener Gastos Extras
      const gsts = await obtenerGastosPorPedido(id);
      setGastos(gsts);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const handleCrearFactura = async (e: React.FormEvent) => {
    e.preventDefault();
    setFacSubmitting(true);
    try {
      const subtotalCalc = facItems.reduce((acc, it) => acc + (it.cantidadFacturada * it.precioUnitario), 0);
      await crearFacturaProveedor({
        pedidoProveedorId: id,
        proveedorId: pedido?.proveedorId,
        numeroFactura: facNum,
        fechaEmision: new Date(facFecha).toISOString(),
        items: facItems,
        subtotal: subtotalCalc,
        impuestos: 0,
        total: subtotalCalc,
        montoAbonado: 0,
        saldoPendiente: subtotalCalc,
        estado: "pendiente"
      });
      setShowFacturaModal(false);
      setFacNum("");
      setFacItems([]);
      loadData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setFacSubmitting(false);
    }
  };

  const handleCrearAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAbonoModal) return;
    setAbonoSubmitting(true);
    try {
      await registrarAbonoProveedor({
        facturaProveedorId: showAbonoModal,
        monto: Number(abonoMonto),
        fecha: new Date(abonoFecha).toISOString(),
        metodoPago: abonoMetodo,
        referencia: abonoRef
      });
      setShowAbonoModal(null);
      setAbonoMonto(0);
      setAbonoRef("");
      loadData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setAbonoSubmitting(false);
    }
  };

  const handleCrearGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    setGastoSubmitting(true);
    try {
      await crearGastoImportacion({
        pedidoProveedorId: id,
        concepto: gastoConcepto,
        monto: Number(gastoMonto),
        fecha: new Date(gastoFecha).toISOString(),
        observaciones: gastoObs
      });
      setShowGastoModal(false);
      setGastoConcepto("");
      setGastoMonto(0);
      setGastoObs("");
      loadData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGastoSubmitting(false);
    }
  };

  const handleEliminarGasto = async (gastoId: string) => {
    if (!confirm("¿Eliminar este gasto extra?")) return;
    try {
      await eliminarGastoImportacion(gastoId);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading || !pedido) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Cálculos totales
  const totalFacturado = facturas.reduce((acc, f) => acc + f.total, 0);
  const totalPagadoCXP = facturas.reduce((acc, f) => acc + f.montoAbonado, 0);
  const saldoPendienteCXP = totalFacturado - totalPagadoCXP;

  const totalGastosExtras = gastos.reduce((acc, g) => acc + g.monto, 0);
  const costoTotalImportacion = totalFacturado + totalGastosExtras;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/pedidos-proveedor")}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-emerald-400" />
              Finanzas de Importación
            </h2>
            <p className="text-xs text-slate-400">
              Pedido <span className="font-mono text-indigo-400">{pedido.id}</span> - {pedido.proveedorNombre}
            </p>
          </div>
        </div>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center text-center border-b-4 border-indigo-500">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Costo Facturado (Fábrica)</span>
          <span className="text-2xl font-bold text-slate-100">${totalFacturado.toFixed(2)}</span>
          <div className="text-[10px] text-slate-500 mt-1">Saldo pendiente: <span className="text-amber-400">${saldoPendienteCXP.toFixed(2)}</span></div>
        </div>
        <div className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center text-center border-b-4 border-orange-500">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Gastos Extra de Importación</span>
          <span className="text-2xl font-bold text-orange-400">${totalGastosExtras.toFixed(2)}</span>
          <div className="text-[10px] text-slate-500 mt-1">Fletes, Aduanas, Agilizaciones</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center text-center border-b-4 border-emerald-500 bg-emerald-500/5">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Costo Total de Importación</span>
          <span className="text-3xl font-black text-white">${costoTotalImportacion.toFixed(2)}</span>
        </div>
      </div>

      {/* Grid de 2 Columnas: CXP y Gastos Extra */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Columna 1: Facturas a Proveedor (CXP) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-indigo-400" /> Facturas del Proveedor (CXP)
            </h3>
            <button
              onClick={() => {
                if (pedido && pedido.items) {
                  setFacItems(pedido.items.map(i => ({
                    sku: i.sku,
                    descripcion: i.descripcion || '',
                    cantidadFacturada: i.cantidadPedida,
                    precioUnitario: i.costoUnitario || 0
                  })));
                } else {
                  setFacItems([]);
                }
                setShowFacturaModal(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all cursor-pointer flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Añadir Factura
            </button>
          </div>

          <div className="space-y-4">
            {facturas.length === 0 ? (
              <div className="glass-panel p-6 rounded-2xl text-center text-slate-500 border border-dashed border-slate-700">
                <Receipt className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                <p className="text-xs">No hay facturas cargadas para este pedido.</p>
              </div>
            ) : (
              facturas.map((fac) => (
                <div key={fac.id} className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
                  <div className="p-4 bg-slate-900/40 border-b border-slate-800/60 flex justify-between items-center">
                    <div>
                      <div className="text-sm font-bold text-slate-200">Factura #{fac.numeroFactura}</div>
                      <div className="text-[10px] text-slate-400">{new Date(fac.fechaEmision).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-emerald-400">${fac.total.toFixed(2)}</div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        fac.estado === "pagada" ? "bg-emerald-500/20 text-emerald-400" :
                        fac.estado === "parcial" ? "bg-amber-500/20 text-amber-400" :
                        "bg-rose-500/20 text-rose-400"
                      }`}>
                        {fac.estado.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Abonado: <strong className="text-indigo-400">${fac.montoAbonado.toFixed(2)}</strong></span>
                      <span>Pendiente: <strong className="text-rose-400">${fac.saldoPendiente.toFixed(2)}</strong></span>
                    </div>

                    {fac.abonos && fac.abonos.length > 0 && (
                      <div className="bg-slate-950/50 rounded-lg p-2 mt-2 border border-slate-800/50">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Historial de Pagos</div>
                        <div className="space-y-1">
                          {fac.abonos.map((abo: any) => (
                            <div key={abo.id} className="flex justify-between text-[11px] text-slate-300">
                              <span>{new Date(abo.fecha).toLocaleDateString()} - {abo.metodoPago}</span>
                              <span className="font-mono">${abo.monto.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {fac.saldoPendiente > 0 && (
                      <button
                        onClick={() => setShowAbonoModal(fac.id)}
                        className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1 mt-2"
                      >
                        <CreditCard className="h-3 w-3" /> Registrar Pago / Abono
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Columna 2: Gastos Extra (Costos Importación) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <Truck className="h-5 w-5 text-orange-400" /> Gastos Extras
            </h3>
            <button
              onClick={() => setShowGastoModal(true)}
              className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs transition-all cursor-pointer flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Añadir Gasto
            </button>
          </div>

          <div className="space-y-3">
            {gastos.length === 0 ? (
              <div className="glass-panel p-6 rounded-2xl text-center text-slate-500 border border-dashed border-slate-700">
                <Truck className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                <p className="text-xs">No hay gastos extras registrados (Fletes, aduanas, etc).</p>
              </div>
            ) : (
              gastos.map((gasto) => (
                <div key={gasto.id} className="glass-panel p-4 rounded-xl border border-slate-800 flex justify-between items-center group">
                  <div className="flex gap-3 items-center">
                    <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center text-orange-400">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200">{gasto.concepto}</div>
                      <div className="text-[10px] text-slate-400">{new Date(gasto.fecha).toLocaleDateString()} {gasto.observaciones && ` - ${gasto.observaciones}`}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-base font-black text-orange-400">${gasto.monto.toFixed(2)}</div>
                    <button 
                      onClick={() => handleEliminarGasto(gasto.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Modals */}
      {/* Modal Nueva Factura */}
      {showFacturaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form onSubmit={handleCrearFactura} className="glass-panel w-full max-w-4xl rounded-2xl p-6 border border-slate-800 shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2"><Receipt className="h-5 w-5 text-indigo-400"/> Liquidación de Commercial Invoice</h3>
            <div className="grid grid-cols-2 gap-4 mb-4 shrink-0">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Número de Factura</label>
                <input required type="text" value={facNum} onChange={e=>setFacNum(e.target.value)} className="w-full px-3 py-2 rounded-xl text-xs glass-input" placeholder="Ej. INV-2024-001" disabled={facSubmitting}/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Fecha Emisión</label>
                <input required type="date" value={facFecha} onChange={e=>setFacFecha(e.target.value)} className="w-full px-3 py-2 rounded-xl text-xs glass-input" disabled={facSubmitting}/>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0 border border-slate-800 rounded-xl bg-slate-900/30 mb-4">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 z-10">
                  <tr>
                    <th className="p-2 font-semibold">SKU / Ítem</th>
                    <th className="p-2 font-semibold w-24 text-center">Cant. Pedida</th>
                    <th className="p-2 font-semibold w-28">Cant. Facturada</th>
                    <th className="p-2 font-semibold w-32">Precio Unit. ($)</th>
                    <th className="p-2 font-semibold w-24 text-right">Total ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {facItems.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="p-2 text-slate-300 font-medium">
                        <div>{it.sku}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-xs">{it.descripcion}</div>
                      </td>
                      <td className="p-2 text-slate-400 text-center">{pedido?.items?.find(x => x.sku === it.sku)?.cantidadPedida || 0}</td>
                      <td className="p-2">
                        <input type="number" min="0" required className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200"
                          value={it.cantidadFacturada} 
                          onChange={(e) => {
                            const newIt = [...facItems];
                            newIt[idx].cantidadFacturada = Number(e.target.value);
                            setFacItems(newIt);
                          }} 
                        />
                      </td>
                      <td className="p-2">
                        <input type="number" step="0.001" min="0" required className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200"
                          value={it.precioUnitario} 
                          onChange={(e) => {
                            const newIt = [...facItems];
                            newIt[idx].precioUnitario = Number(e.target.value);
                            setFacItems(newIt);
                          }} 
                        />
                      </td>
                      <td className="p-2 text-right font-mono text-emerald-400">
                        ${(it.cantidadFacturada * it.precioUnitario).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center shrink-0 pt-4 border-t border-slate-800">
              <div className="text-sm font-bold text-slate-300">
                TOTAL FACTURA: <span className="text-xl text-emerald-400 ml-2">${facItems.reduce((acc, it) => acc + (it.cantidadFacturada * it.precioUnitario), 0).toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={()=>setShowFacturaModal(false)} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-300 text-xs font-semibold cursor-pointer">Cancelar</button>
                <button type="submit" disabled={facSubmitting} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer">Liquidar Factura</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal Nuevo Abono */}
      {showAbonoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form onSubmit={handleCrearAbono} className="glass-panel w-full max-w-sm rounded-2xl p-6 border border-slate-800 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2"><CreditCard className="h-5 w-5 text-emerald-400"/> Registrar Pago/Abono</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Monto a Pagar ($)</label>
                <input required type="number" step="0.01" min="0.01" value={abonoMonto} onChange={e=>setAbonoMonto(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl text-xs glass-input font-mono" disabled={abonoSubmitting}/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Método de Pago</label>
                <select value={abonoMetodo} onChange={e=>setAbonoMetodo(e.target.value)} className="w-full px-3 py-2 rounded-xl text-xs glass-input bg-slate-900" disabled={abonoSubmitting}>
                  <option value="Transferencia">Transferencia (Wire)</option>
                  <option value="Zelle">Zelle</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Cripto">Criptomonedas</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Referencia</label>
                <input type="text" value={abonoRef} onChange={e=>setAbonoRef(e.target.value)} className="w-full px-3 py-2 rounded-xl text-xs glass-input" placeholder="Ej. Conf# 123456" disabled={abonoSubmitting}/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Fecha de Pago</label>
                <input required type="date" value={abonoFecha} onChange={e=>setAbonoFecha(e.target.value)} className="w-full px-3 py-2 rounded-xl text-xs glass-input" disabled={abonoSubmitting}/>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={()=>setShowAbonoModal(null)} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-300 text-xs font-semibold cursor-pointer">Cancelar</button>
              <button type="submit" disabled={abonoSubmitting} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer">Registrar Pago</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Nuevo Gasto */}
      {showGastoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form onSubmit={handleCrearGasto} className="glass-panel w-full max-w-sm rounded-2xl p-6 border border-slate-800 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2"><Truck className="h-5 w-5 text-orange-400"/> Registrar Gasto Extra</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Concepto / Motivo</label>
                <input required type="text" value={gastoConcepto} onChange={e=>setGastoConcepto(e.target.value)} className="w-full px-3 py-2 rounded-xl text-xs glass-input" placeholder="Ej. Trasbordo de camión accidentado" disabled={gastoSubmitting}/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Monto ($)</label>
                <input required type="number" step="0.01" min="0" value={gastoMonto} onChange={e=>setGastoMonto(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl text-xs glass-input font-mono" disabled={gastoSubmitting}/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Observaciones</label>
                <input type="text" value={gastoObs} onChange={e=>setGastoObs(e.target.value)} className="w-full px-3 py-2 rounded-xl text-xs glass-input" placeholder="Opcional" disabled={gastoSubmitting}/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Fecha del Gasto</label>
                <input required type="date" value={gastoFecha} onChange={e=>setGastoFecha(e.target.value)} className="w-full px-3 py-2 rounded-xl text-xs glass-input" disabled={gastoSubmitting}/>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={()=>setShowGastoModal(false)} className="px-4 py-2 rounded-xl border border-slate-800 text-slate-300 text-xs font-semibold cursor-pointer">Cancelar</button>
              <button type="submit" disabled={gastoSubmitting} className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold cursor-pointer">Guardar Gasto</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
