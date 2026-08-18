"use client";

import { useEffect, useState } from "react";
import { PackageCheck, Plus, X, Loader2, AlertCircle, Ban } from "lucide-react";
import { obtenerDespachos, obtenerOrdenesCliente, crearDespacho, anularDespacho, obtenerEmpresa, EmpresaConfig } from "@/lib/api/importaciones";
import { NotaEntrega, OrdenCliente } from "@/types";
import { useTranslation } from "@/context/LanguageContext";
import PrintNotaEntrega from "@/components/PrintNotaEntrega";

export default function DespachosPage() {
  const { t, language } = useTranslation();
  const [despachos, setDespachos] = useState<NotaEntrega[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenCliente[]>([]);
  const [empresa, setEmpresa] = useState<EmpresaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados del Formulario de Despacho
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [itemsADespachar, setItemsADespachar] = useState<Array<{ sku: string; cantidadRecibida: number; cantidadEntregada: number; cantidadDespachada: number }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Print State
  const [printDespacho, setPrintDespacho] = useState<NotaEntrega | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [despachosData, ordenesData, emp] = await Promise.all([
        obtenerDespachos(),
        obtenerOrdenesCliente(),
        obtenerEmpresa()
      ]);
      setDespachos(despachosData);
      setEmpresa(emp);
      
      // Filtrar órdenes que tengan mercancía recibida en almacén pendiente de entregar
      const ordenesConStock = ordenesData.filter(o => 
        o.items.some(i => (i.cantidadRecibida || 0) > (i.cantidadEntregada || 0))
      );
      setOrdenes(ordenesConStock);
    } catch (err: any) {
      setError(err.message || (language === "es" ? "Error al cargar la información de despachos." : "Error loading delivery information."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId);
    setFormError(null);
    const order = ordenes.find(o => o.id === orderId);
    if (order) {
      const despachables = order.items
        .filter(i => (i.cantidadRecibida || 0) > (i.cantidadEntregada || 0))
        .map(i => ({
          sku: i.sku,
          cantidadRecibida: i.cantidadRecibida || 0,
          cantidadEntregada: i.cantidadEntregada || 0,
          cantidadDespachada: (i.cantidadRecibida || 0) - (i.cantidadEntregada || 0) // Pre-cargar saldo disponible
        }));
      setItemsADespachar(despachables);
    } else {
      setItemsADespachar([]);
    }
  };

  const handleQtyChange = (sku: string, val: number) => {
    setItemsADespachar(itemsADespachar.map(item => {
      if (item.sku === sku) {
        const max = item.cantidadRecibida - item.cantidadEntregada;
        return {
          ...item,
          cantidadDespachada: Math.max(0, Math.min(max, val))
        };
      }
      return item;
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    if (!selectedOrderId) {
      setFormError(language === "es" ? "Debe seleccionar una orden de cliente." : "You must select a customer order.");
      setSubmitting(false);
      return;
    }

    const payloadItems = itemsADespachar.filter(i => i.cantidadDespachada > 0);
    if (payloadItems.length === 0) {
      setFormError(language === "es" ? "Debe despachar al menos 1 unidad de algún SKU." : "You must ship at least 1 unit of some SKU.");
      setSubmitting(false);
      return;
    }

    try {
      await crearDespacho(
        selectedOrderId,
        payloadItems.map(i => ({ sku: i.sku, cantidadDespachada: i.cantidadDespachada }))
      );
      await loadData();
      setModalOpen(false);
      setSelectedOrderId("");
      setItemsADespachar([]);
    } catch (err: any) {
      setFormError(err.message || (language === "es" ? "Error al procesar el despacho." : "Error processing delivery."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnularDespacho = async (id: string) => {
    if (!confirm(language === "es"
      ? "¿Está seguro de anular este despacho? Esto devolverá los ítems a la orden de venta como pendientes de entrega."
      : "Are you sure you want to void this delivery? This will return the items to the sales order as pending delivery.")) return;
    try {
      await anularDespacho(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || (language === "es" ? "Error al anular despacho." : "Error voiding delivery."));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <PackageCheck className="h-6 w-6 text-indigo-400" />
            <h2 className="text-2xl font-bold text-slate-100 tracking-tight">{language === "es" ? "Despachos y Notas de Entrega" : "Deliveries & Delivery Notes"}</h2>
          </div>
          <p className="text-xs text-slate-400">
            {language === "es" 
              ? "Registra los envíos físicos de mercancía a clientes a partir del stock ingresado en contenedores."
              : "Register physical shipments of merchandise to customers from stock received in containers."}
          </p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> {language === "es" ? "Registrar Despacho" : "Register Delivery"}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-955/40 border border-rose-900/40 rounded-xl text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Listado de Despachos */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-slate-400 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <span className="text-xs">{language === "es" ? "Cargando despachos..." : "Loading deliveries..."}</span>
          </div>
        ) : despachos.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-center p-6">
            <PackageCheck className="h-10 w-10 text-slate-600 mb-2" />
            <p className="text-xs">{language === "es" ? "No hay notas de entrega registradas aún." : "No delivery notes registered yet."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 bg-slate-900/20 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4">{language === "es" ? "ID Despacho" : "Delivery ID"}</th>
                  <th className="p-4">{language === "es" ? "Cliente" : "Customer"}</th>
                  <th className="p-4">{language === "es" ? "Orden Relacionada" : "Related Order"}</th>
                  <th className="p-4">{language === "es" ? "Fecha" : "Date"}</th>
                  <th className="p-4">{language === "es" ? "SKUs Despachados" : "Shipped SKUs"}</th>
                  <th className="p-4">{language === "es" ? "Total Nota" : "Delivery Total"}</th>
                  <th className="p-4">{language === "es" ? "Estado" : "Status"}</th>
                  <th className="p-4 text-right">{language === "es" ? "Acciones" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {despachos.map((des) => (
                  <tr key={des.id} className="hover:bg-white/2 transition-colors">
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 font-mono font-bold text-[11px] border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                        {des.id}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-200">{des.clienteNombre}</td>
                    <td className="p-4 font-mono text-[10px] text-slate-400">{des.ordenClienteId}</td>
                    <td className="p-4 text-slate-400">{new Date(des.fecha).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="space-y-0.5">
                        {des.items.map((i, idx) => (
                          <div key={idx} className="font-mono text-[10px] text-slate-300">
                            {i.sku} x{i.cantidadDespachada}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-indigo-400">
                      ${des.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        des.estado === "facturado" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        des.estado === "anulado" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                        "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {des.estado === "facturado" ? (language === "es" ? "FACTURADO" : "INVOICED") :
                         des.estado === "anulado" ? (language === "es" ? "ANULADO" : "VOIDED") :
                         (language === "es" ? "PENDIENTE FACTURACIÓN" : "PENDING BILLING")}
                      </span>
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => setPrintDespacho(des)}
                        className="px-2.5 py-1 rounded bg-slate-500/10 hover:bg-slate-500/20 text-slate-300 border border-slate-500/20 font-bold text-[10px] transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        {language === "es" ? "Imprimir" : "Print"}
                      </button>
                      {des.estado === "pendiente_facturacion" && (
                        <button
                          onClick={() => handleAnularDespacho(des.id!)}
                          className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-[10px] transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Ban className="h-3 w-3" /> {language === "es" ? "Anular" : "Void"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Modal Registrar Despacho (Aero Glassmorphism) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-xl rounded-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                <PackageCheck className="h-4 w-4 text-indigo-400" /> {language === "es" ? "Registrar Nuevo Despacho" : "Register New Delivery"}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">{language === "es" ? "Seleccionar Orden con Stock en Almacén" : "Select Order with Warehouse Stock"}</label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => handleOrderChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs glass-input focus:outline-none bg-slate-900"
                  disabled={submitting}
                >
                  <option className="bg-slate-900 text-white"  value=""  >{language === "es" ? "-- Seleccione una orden disponible --" : "-- Select a pending order --"}</option>
                  {ordenes.map(o => (
                    <option className="bg-slate-900 text-white"  key={o.id} value={o.id}  >
                      {o.clienteNombre} ({o.id})
                    </option>
                  ))}
                </select>
              </div>

              {selectedOrderId && itemsADespachar.length === 0 && (
                <p className="text-slate-400 text-xs py-2">
                  {language === "es" 
                    ? "No hay SKUs en esta orden con mercancía en almacén pendiente de entregar." 
                    : "There are no SKUs in this order with warehouse stock pending shipment."}
                </p>
              )}

              {itemsADespachar.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-400 border-b border-slate-800/60 pb-1.5">
                    {language === "es" ? "Cantidades a Entregar" : "Quantities to Deliver"}
                  </div>

                  <div className="space-y-2">
                    {itemsADespachar.map((item) => {
                      const disponible = item.cantidadRecibida - item.cantidadEntregada;
                      return (
                        <div key={item.sku} className="flex justify-between items-center bg-slate-950/20 p-2.5 rounded-xl border border-slate-900">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-bold text-slate-200">{item.sku}</span>
                            <span className="text-[9px] text-slate-500">
                              {language === "es" ? "Recibido" : "Received"}: {item.cantidadRecibida} | {language === "es" ? "Entregado" : "Shipped"}: {item.cantidadEntregada} | {language === "es" ? "Disponible" : "Available"}: <strong className="text-indigo-400">{disponible}</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={disponible}
                              value={item.cantidadDespachada}
                              onChange={(e) => handleQtyChange(item.sku, parseInt(e.target.value) || 0)}
                              className="w-20 px-3 py-1.5 rounded-xl text-[11px] glass-input text-center"
                              disabled={submitting}
                            />
                            <span className="text-[10px] text-slate-400">{language === "es" ? "uds" : "pcs"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {formError && (
                <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-900/40 rounded-xl text-rose-300 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-white/5 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
                  disabled={submitting}
                >
                  {language === "es" ? "Cancelar" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                  disabled={submitting || itemsADespachar.length === 0}
                >
                  {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  {language === "es" ? "Procesar Despacho" : "Process Delivery"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Imprimir */}
      {printDespacho && empresa && (
        <PrintNotaEntrega 
          despacho={printDespacho}
          empresa={empresa}
          onClose={() => setPrintDespacho(null)}
          language={language}
        />
      )}
    </div>
  );
}
