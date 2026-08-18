"use client";

import { useState, useEffect, Fragment } from "react";
import { 
  Plus, 
  Trash2, 
  Container, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  FileSpreadsheet,
  Package,
  History,
  Search,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Printer,
  Edit2,
  X,
  Save
} from "lucide-react";
import { 
  registrarRecepcionImportacion, 
  obtenerPedidosProveedor, 
  obtenerRecepcionesImportacion, 
  actualizarRecepcionImportacion,
  eliminarRecepcionImportacion,
  obtenerEmpresa,
  ReconciliacionResponse 
} from "@/lib/api/importaciones";
import { ItemRecibido, PedidoProveedor, RecepcionImportacion } from "@/types";
import { useTranslation } from "@/context/LanguageContext";
import PrintRecepcion from "@/components/PrintRecepcion";

export default function RecepcionPage() {
  const { t, language } = useTranslation();
  // Estados para el Formulario
  const [pedidoProveedorId, setPedidoProveedorId] = useState("");
  const [contenedorId, setContenedorId] = useState("");
  const [items, setItems] = useState<(ItemRecibido & { descripcion?: string; cantidadPedida?: number; cantidadPreviamenteRecibida?: number })[]>([
    { sku: "", cantidadRecibida: 0, descripcion: "" }
  ]);
  const [pedidos, setPedidos] = useState<PedidoProveedor[]>([]);
  const [recepciones, setRecepciones] = useState<RecepcionImportacion[]>([]);
  const [empresa, setEmpresa] = useState<any>(null);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Print & Edit State
  const [printRecepcion, setPrintRecepcion] = useState<RecepcionImportacion | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecepcion, setEditingRecepcion] = useState<RecepcionImportacion | null>(null);
  const [editContenedorId, setEditContenedorId] = useState("");
  const [editItems, setEditItems] = useState<ItemRecibido[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  async function load() {
    setLoadingHistorial(true);
    try {
      const [dataPedidos, dataRecepciones, dataEmpresa] = await Promise.all([
        obtenerPedidosProveedor(),
        obtenerRecepcionesImportacion(),
        obtenerEmpresa()
      ]);
      setPedidos(dataPedidos.filter(p => p.estado === "formalizado" || p.estado === "parcial" || p.estado === "pendiente"));
      setRecepciones(dataRecepciones);
      setEmpresa(dataEmpresa);
    } catch (err) {
      console.error("Error cargando datos", err);
    } finally {
      setLoadingHistorial(false);
    }
  }

  const handleOpenEdit = (rec: RecepcionImportacion) => {
    setEditingRecepcion(rec);
    setEditContenedorId(rec.contenedorId);
    setEditItems(rec.itemsRecibidos ? rec.itemsRecibidos.map(i => ({ ...i })) : []);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRecepcion?.id) return;
    setEditSubmitting(true);
    try {
      await actualizarRecepcionImportacion(editingRecepcion.id, {
        contenedorId: editContenedorId,
        itemsRecibidos: editItems
      });
      setEditModalOpen(false);
      setEditingRecepcion(null);
      load();
    } catch (err: any) {
      alert(err.message || "Error al actualizar recepción.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === "es" ? "¿Está seguro de eliminar este registro de recepción?" : "Are you sure you want to delete this reception record?")) return;
    try {
      await eliminarRecepcionImportacion(id);
      load();
    } catch (err: any) {
      alert(err.message || "Error al eliminar recepción.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Estados de Operación
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReconciliacionResponse | null>(null);

  // Manejadores de Ítems Dinámicos
  const handleAddItem = () => {
    setItems([...items, { sku: "", cantidadRecibida: 0, descripcion: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ItemRecibido, value: any) => {
    const updated = [...items];
    if (field === "cantidadRecibida") {
      updated[index][field] = Math.max(0, parseInt(value) || 0);
    } else {
      updated[index][field] = value;
    }
    setItems(updated);
  };

  // Envío del Formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    // Validaciones de frontend básicas
    if (!pedidoProveedorId.trim()) {
      setError(language === "es" ? "Debe ingresar el ID del Pedido del Proveedor." : "You must enter the Supplier Order ID.");
      setLoading(false);
      return;
    }
    if (!contenedorId.trim()) {
      setError(language === "es" ? "Debe ingresar el ID del Contenedor." : "You must enter the Container ID.");
      setLoading(false);
      return;
    }
    
    const validItems = items.filter(item => item.sku.trim() !== "" && item.cantidadRecibida > 0);
    if (validItems.length === 0) {
      setError(language === "es" ? "Debe ingresar al menos un SKU válido con cantidad mayor a 0." : "You must enter at least one valid SKU with quantity greater than 0.");
      setLoading(false);
      return;
    }

    try {
      const response = await registrarRecepcionImportacion(
        pedidoProveedorId.trim(),
        contenedorId.trim(),
        validItems
      );
      setResult(response);
      // Limpiar formulario tras éxito
      setItems([{ sku: "", cantidadRecibida: 0 }]);
      // Recargar historial
      load();
    } catch (err: any) {
      setError(err.message || (language === "es" ? "Ocurrió un error inesperado." : "An unexpected error occurred."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Encabezado */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Container className="h-6 w-6 text-indigo-600" />
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{language === "es" ? "Recepción de Contenedores" : "Container Reception"}</h2>
        </div>
        <p className="text-xs text-slate-500">
          {language === "es" 
            ? "Registra el ingreso de mercancía del contenedor y distribuye el inventario a clientes mediante asignación FIFO."
            : "Register the container merchandise entry and distribute the inventory to clients using FIFO allocation."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario Principal */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6 space-y-6">
            
            {/* Campos del Contenedor y Pedido */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 block">{language === "es" ? "ID Pedido Proveedor" : "Supplier Order ID"}</label>
                <select
                  value={pedidoProveedorId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setPedidoProveedorId(id);
                    const selected = pedidos.find(p => p.id === id);
                    if (selected) {
                      setItems(selected.items.map(item => ({ 
                        sku: item.sku, 
                        cantidadRecibida: 0,
                        descripcion: item.descripcion || "Descripción no disponible",
                        cantidadPedida: item.cantidadPedida || 0,
                        cantidadPreviamenteRecibida: item.cantidadRecibida || 0
                      })));
                    } else {
                      setItems([{ sku: "", cantidadRecibida: 0, descripcion: "" }]);
                    }
                  }}
                  className="w-full px-3.5 py-2 rounded-xl text-xs glass-input text-slate-200"
                  disabled={loading}
                >
                  <option value="" className="bg-slate-900 text-white">{language === "es" ? "-- Seleccione un Pedido en Tránsito --" : "-- Select In-Transit Order --"}</option>
                  {pedidos.map(p => (
                    <option key={p.id} value={p.id!} className="bg-slate-900 text-white">
                      {p.id} - {p.proveedorNombre} ({p.fecha.split("T")[0]})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 block">{language === "es" ? "ID Contenedor / Guía" : "Container ID / Tracking"}</label>
                <input
                  type="text"
                  value={contenedorId}
                  onChange={(e) => setContenedorId(e.target.value)}
                  placeholder="Ej: CONT-40HQ-12345"
                  className="w-full px-3.5 py-2 rounded-xl text-xs glass-input text-slate-200"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Listado de SKUs */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-slate-400" />
                  {language === "es" ? "Mercancía Recibida (SKUs)" : "Received Goods (SKUs)"}
                </h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  disabled={loading}
                >
                  <Plus className="h-3 w-3" /> {language === "es" ? "Agregar Item" : "Add Item"}
                </button>
              </div>

              {/* Tabla dinámcia */}
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-4 items-center animate-in fade-in duration-200">
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={item.sku + (item.descripcion ? ` - ${item.descripcion}` : "")}
                            onChange={(e) => {
                              // Solo lectura real cuando se carga desde pedido
                              if (!pedidoProveedorId) {
                                handleItemChange(index, "sku", e.target.value);
                              }
                            }}
                            placeholder="SKU-BOMB-001"
                            className="w-full px-3.5 py-1.5 rounded-xl text-xs glass-input text-slate-200 truncate"
                            disabled={loading || !!pedidoProveedorId}
                            title={item.descripcion}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        {item.cantidadPedida !== undefined && (
                          <div className="text-[10px] text-slate-400 text-center font-medium">
                            Esp: <span className="font-bold text-indigo-400">{(item.cantidadPedida || 0) - (item.cantidadPreviamenteRecibida || 0)}</span> / {item.cantidadPedida}
                          </div>
                        )}
                        <input
                          type="number"
                          value={item.cantidadRecibida || ""}
                          onChange={(e) => handleItemChange(index, "cantidadRecibida", e.target.value)}
                          placeholder={language === "es" ? "Cant." : "Qty"}
                          className="w-full px-3.5 py-1.5 rounded-xl text-xs glass-input text-slate-200 text-center"
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 transition-all"
                      disabled={loading || items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Manejo de Errores en Formulario */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-rose-50/70 border border-rose-100/50 rounded-xl text-rose-700 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {/* Acción Principal */}
            <div className="flex justify-end pt-4 border-t border-slate-200/50">
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 disabled:bg-indigo-400"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {language === "es" ? "Procesando Conciliación..." : "Processing Reconciliation..."}
                  </>
                ) : (
                  <>
                    {language === "es" ? "Procesar Recepción" : "Process Reception"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* Panel Lateral de Resultados (Aero Glassmorphism) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel rounded-2xl p-6 min-h-[350px] flex flex-col justify-between">
            {result ? (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 border-b border-slate-200/50 pb-3">
                  <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">{language === "es" ? "Reconciliación Exitosa" : "Reconciliation Successful"}</h3>
                    <p className="text-[10px] text-slate-400">{language === "es" ? "Atómica y en lote completada" : "Atomic & batch completed"}</p>
                  </div>
                </div>

                {/* Resumen de Distribución */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <FileSpreadsheet className="h-3.5 w-3.5" /> {language === "es" ? "Distribución de Stock" : "Stock Distribution"}
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {result.distribucion.map((dist, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50/70 border border-slate-100/50 rounded-lg">
                        <div className="overflow-hidden pr-2">
                          <p className="font-semibold text-slate-700 truncate">{dist.clienteNombre || (language === "es" ? "Sin Nombre" : "No Name")}</p>
                          <span className="text-[9px] text-slate-400 font-mono">{dist.sku}</span>
                        </div>
                        <span className="shrink-0 font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px]">
                          +{dist.cantidadAsignada}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Logs Operativos */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === "es" ? "Bitácora de Eventos" : "Event Log"}</h4>
                  <div className="bg-slate-900/90 text-slate-300 font-mono text-[9px] p-3 rounded-lg max-h-32 overflow-y-auto leading-relaxed">
                    {result.log.map((logStr, idx) => (
                      <div key={idx} className="border-l-2 border-indigo-500 pl-1.5 mb-1.5 last:mb-0">
                        {logStr}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-400">
                <Container className="h-12 w-12 text-slate-300 mb-3 animate-pulse" />
                <h3 className="text-xs font-bold text-slate-500 mb-1">{language === "es" ? "Sin transacciones procesadas" : "No transactions processed"}</h3>
                <p className="text-[10px] max-w-[200px] leading-relaxed">
                  {language === "es" 
                    ? "Ingresa los datos del contenedor y procesa la recepción para ver la conciliación FIFO en tiempo real."
                    : "Enter the container details and process reception to view FIFO reconciliation in real-time."}
                </p>
              </div>
            )}

            <div className="border-t border-slate-200/50 pt-4 mt-6 text-center">
              <span className="text-[10px] text-slate-400 font-medium">Maxicom Bejuma S.A. &copy; 2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de Recepciones de Contenedores */}
      <div className="glass-panel rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-200">
                {language === "es" ? "Historial de Recepciones de Contenedores" : "Container Reception History"}
              </h3>
              <p className="text-xs text-slate-400">
                {language === "es" 
                  ? "Registro completo de contenedores recibidos y asignación de stock a clientes." 
                  : "Complete log of received containers and stock allocation to clients."}
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder={language === "es" ? "Buscar contenedor, SKU, pedido..." : "Search container, SKU, order..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs glass-input text-slate-200"
            />
          </div>
        </div>

        {loadingHistorial ? (
          <div className="py-12 flex justify-center items-center text-slate-400 gap-2 text-xs">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            {language === "es" ? "Cargando récord de recepciones..." : "Loading reception history..."}
          </div>
        ) : recepciones.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Container className="h-10 w-10 mx-auto mb-2 text-slate-600 opacity-50" />
            {language === "es" ? "No hay recepciones de contenedores registradas aún." : "No container receptions recorded yet."}
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-800/60 rounded-xl">
            <table className="w-full text-left text-xs min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3.5 px-4 w-32 shrink-0">{language === "es" ? "Fecha" : "Date"}</th>
                  <th className="py-3.5 px-4 w-44 shrink-0">{language === "es" ? "ID Contenedor / Guía" : "Container ID / Tracking"}</th>
                  <th className="py-3.5 px-4 w-36 shrink-0">{language === "es" ? "Pedido Proveedor" : "Supplier Order"}</th>
                  <th className="py-3.5 px-4">{language === "es" ? "Ítems / Cantidades" : "Items / Quantities"}</th>
                  <th className="py-3.5 px-4 w-40 shrink-0">{language === "es" ? "Asignaciones FIFO" : "FIFO Allocations"}</th>
                  <th className="py-3.5 px-4 w-48 text-right shrink-0">{language === "es" ? "Acciones" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {recepciones
                  .filter(r => {
                    if (!searchTerm.trim()) return true;
                    const q = searchTerm.toLowerCase();
                    return (
                      r.contenedorId.toLowerCase().includes(q) ||
                      r.pedidoProveedorId.toLowerCase().includes(q) ||
                      r.itemsRecibidos.some(i => i.sku.toLowerCase().includes(q)) ||
                      r.distribucion.some(d => d.clienteNombre?.toLowerCase().includes(q) || d.sku.toLowerCase().includes(q))
                    );
                  })
                  .map((rec) => {
                    const isExpanded = expandedId === rec.id;
                    const totalUnidades = rec.itemsRecibidos.reduce((s, i) => s + (i.cantidadRecibida || 0), 0);
                    return (
                      <Fragment key={rec.id}>
                        <tr className="border-b border-slate-800/40 hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 text-slate-300 font-mono w-32">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <Calendar className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                              {new Date(rec.fecha || rec.createdAt!).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 w-44">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono font-bold text-[11px] whitespace-nowrap">
                              <Container className="h-3 w-3 shrink-0" />
                              {rec.contenedorId}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-300 w-36 whitespace-nowrap">
                            {rec.pedidoProveedorId}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1.5">
                              {rec.itemsRecibidos.map((it, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono whitespace-nowrap">
                                  {it.sku}: <strong className="text-emerald-400">+{it.cantidadRecibida}</strong>
                                </span>
                              ))}
                            </div>
                            <span className="text-[10px] text-slate-500 block mt-0.5 whitespace-nowrap">
                              Total: {totalUnidades} {language === "es" ? "unidades" : "units"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 w-40 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 font-semibold text-[10px]">
                              {rec.distribucion.length} {language === "es" ? "destinos asignados" : "destinations allocated"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right w-48 shrink-0">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setPrintRecepcion(rec)}
                                title={language === "es" ? "Imprimir Comprobante" : "Print Voucher"}
                                className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-all cursor-pointer"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(rec)}
                                title={language === "es" ? "Editar Recepción" : "Edit Reception"}
                                className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-all cursor-pointer"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(rec.id!)}
                                title={language === "es" ? "Eliminar" : "Delete"}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : rec.id!)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition-all cursor-pointer ml-1"
                              >
                                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Fila Desplegable con la distribución completa */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="p-4 bg-slate-950/60 border-t border-slate-800">
                              <div className="space-y-3">
                                <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <Layers className="h-3.5 w-3.5" />
                                  {language === "es" ? "Desglose de Distribución FIFO / Asignaciones:" : "FIFO Distribution Breakdown / Allocations:"}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {rec.distribucion.map((dist, dIdx) => (
                                    <div key={dIdx} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center text-xs">
                                      <div className="overflow-hidden pr-2">
                                        <p className="font-semibold text-slate-200 truncate">{dist.clienteNombre || "Asignado"}</p>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          SKU: {dist.sku} {dist.ordenClienteId ? `(${dist.ordenClienteId})` : ""}
                                        </span>
                                      </div>
                                      <span className="shrink-0 font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[11px] font-mono">
                                        +{dist.cantidadAsignada}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Modal Imprimir Recepción */}
      {printRecepcion && empresa && (
        <PrintRecepcion
          recepcion={printRecepcion}
          empresa={empresa}
          onClose={() => setPrintRecepcion(null)}
          language={language}
        />
      )}

      {/* Modal Editar Recepción */}
      {editModalOpen && editingRecepcion && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                {language === "es" ? "Editar Recepción de Contenedor" : "Edit Container Reception"} — {editingRecepcion.contenedorId}
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">{language === "es" ? "ID Contenedor / Guía" : "Container ID / Tracking"}</label>
                <input
                  type="text"
                  value={editContenedorId}
                  onChange={(e) => setEditContenedorId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs glass-input text-slate-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2">{language === "es" ? "Mercancía Recibida (Cantidades)" : "Received Merchandise (Quantities)"}</label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {editItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 p-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs">
                      <span className="font-mono font-bold text-slate-300">{item.sku}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">{language === "es" ? "Cant. Recibida:" : "Qty Rec:"}</span>
                        <input
                          type="number"
                          value={item.cantidadRecibida || ""}
                          onChange={(e) => {
                            const updated = [...editItems];
                            updated[idx].cantidadRecibida = Math.max(0, parseInt(e.target.value) || 0);
                            setEditItems(updated);
                          }}
                          className="w-24 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono text-center"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                {language === "es" ? "Cancelar" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={editSubmitting}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-amber-600/20 disabled:opacity-50"
              >
                {editSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {language === "es" ? "Guardar Cambios" : "Save Changes"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
