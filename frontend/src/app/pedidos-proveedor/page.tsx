"use client";

import { useEffect, useState } from "react";
import { 
  Compass, 
  Loader2, 
  Plus, 
  X, 
  AlertCircle,
  Calendar,
  Building2,
  Trash2,
  Info,
  UserCheck,
  ShieldAlert,
  Edit,
  Ban,
  Printer,
  CheckCheck,
  Users,
  RefreshCcw,
  FileText,
  DollarSign
} from "lucide-react";
import { useRouter } from "next/navigation";
import { 
  obtenerPedidosProveedor, 
  crearPedidoProveedor, 
  editarPedidoProveedor,
  anularPedidoProveedor,
  obtenerProveedores, 
  crearProveedor, 
  obtenerResponsables,
  crearResponsable,
  formalizarPedidoProveedor,
  revertirPedidoProveedor,
  obtenerEmpresa,
  EmpresaConfig,
  obtenerProductos
} from "@/lib/api/importaciones";
import PrintPedidoProveedor from "@/components/PrintPedidoProveedor";
import { PedidoProveedor, Proveedor, Responsable, Producto } from "@/types";
import { useTranslation } from "@/context/LanguageContext";

export default function PedidosProveedorPage() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const [pedidos, setPedidos] = useState<PedidoProveedor[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [empresa, setEmpresa] = useState<EmpresaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para Modal de Nuevo Pedido a Proveedor
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProveedorId, setSelectedProveedorId] = useState("");
  const [selectedResponsableId, setSelectedResponsableId] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0]);
  const [formItems, setFormItems] = useState<Array<{ sku: string; skuProveedor?: string; descripcion?: string; detalles?: string; showDetalles?: boolean; cantidadPedida: number; costoUnitario?: number }>>([
    { sku: "", skuProveedor: "", descripcion: "", detalles: "", cantidadPedida: 1, costoUnitario: 0 }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [printPedido, setPrintPedido] = useState<PedidoProveedor | null>(null);

  // Estados para Registro Rápido de Proveedor
  const [showQuickProviderForm, setShowQuickProviderForm] = useState(false);
  const [quickProvNombre, setQuickProvNombre] = useState("");
  const [quickProvRif, setQuickProvRif] = useState("");
  const [quickProvEmail, setQuickProvEmail] = useState("");
  const [quickProvTelefono, setQuickProvTelefono] = useState("");
  const [quickProvDireccion, setQuickProvDireccion] = useState("");
  const [quickProvSubmitting, setQuickProvSubmitting] = useState(false);
  const [quickProvError, setQuickProvError] = useState<string | null>(null);

  // Estados para Registro Rápido de Responsable
  const [showQuickResponsableForm, setShowQuickResponsableForm] = useState(false);
  const [quickRespNombre, setQuickRespNombre] = useState("");
  const [quickRespRol, setQuickRespRol] = useState("Operador");
  const [quickRespEmail, setQuickRespEmail] = useState("");
  const [quickRespSubmitting, setQuickRespSubmitting] = useState(false);
  const [quickRespError, setQuickRespError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [peds, provs, resps, emp, prods] = await Promise.all([
        obtenerPedidosProveedor(),
        obtenerProveedores(),
        obtenerResponsables(),
        obtenerEmpresa(),
        obtenerProductos()
      ]);
      setPedidos(peds);
      setProveedores(provs);
      setResponsables(resps);
      setEmpresa(emp);
      setProductos(prods);

      if (provs.length > 0) {
        setSelectedProveedorId(provs[0].id || "");
      }
      if (resps.length > 0) {
        setSelectedResponsableId(resps[0].id || "");
      }
    } catch (err: any) {
      setError(err.message || (language === "es" ? "Error al cargar pedidos del proveedor." : "Error loading supplier orders."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleAddFormItem = () => {
    setFormItems([...formItems, { sku: "", skuProveedor: "", descripcion: "", cantidadPedida: 1, costoUnitario: 0 }]);
  };

  const handleRemoveFormItem = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const handleFormItemChange = (index: number, field: string, value: any) => {
    const updated = [...formItems];
    (updated[index] as any)[field] = value;
    if (field === "sku" && productos.length > 0) {
      const prod = productos.find(p => p.sku === value.toUpperCase());
      if (prod) {
        (updated[index] as any)["descripcion"] = prod.descripcion;
        (updated[index] as any)["detalles"] = prod.detalles || "";
      }
    }
    setFormItems(updated);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const provider = proveedores.find(p => p.id === selectedProveedorId);
    if (!provider) {
      setFormError(language === "es" ? "Debe seleccionar un proveedor registrado." : "You must select a registered supplier.");
      setSubmitting(false);
      return;
    }

    const resp = responsables.find(r => r.id === selectedResponsableId);
    if (!resp) {
      setFormError(language === "es" ? "Debe seleccionar un responsable de carga." : "You must select a cargo supervisor.");
      setSubmitting(false);
      return;
    }

    const validItems = formItems.filter(i => i.sku.trim() !== "" && i.cantidadPedida > 0);
    if (validItems.length === 0) {
      setFormError(language === "es" ? "Debe ingresar al menos un SKU válido." : "You must enter at least one valid SKU.");
      setSubmitting(false);
      return;
    }

    try {
      if (editingId) {
        await editarPedidoProveedor(
          editingId,
          provider.id!, 
          provider.nombre, 
          validItems, 
          new Date(fecha).toISOString(),
          resp.id,
          resp.nombre,
          observaciones
        );
      } else {
        await crearPedidoProveedor(
          provider.id!, 
          provider.nombre, 
          validItems, 
          new Date(fecha).toISOString(),
          resp.id,
          resp.nombre,
          observaciones
        );
      }
      setModalOpen(false);
      setEditingId(null);
      setFormItems([{ sku: "", skuProveedor: "", cantidadPedida: 1 }]);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || (language === "es" ? "Error al registrar/editar pedido consolidado." : "Error registering/editing consolidated order."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormalizar = async (id: string) => {
    const msg = language === "es" 
      ? "¿Está seguro de formalizar esta solicitud de mercancía? Se cerrará el pedido consolidado para enviarlo al proveedor." 
      : "Are you sure you want to finalize this merchandise request? The consolidated order will be closed to be sent to the supplier.";
    if (!confirm(msg)) return;
    try {
      await formalizarPedidoProveedor(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || (language === "es" ? "Error al formalizar pedido consolidado." : "Error finalizing consolidated order."));
    }
  };

  const handleRevertir = async (id: string) => {
    const msg = language === "es"
      ? "¿Está seguro de revertir este pedido a Pendiente? Podrá volver a editarlo."
      : "Are you sure you want to revert this order to Pending? You will be able to edit it again.";
    if (!confirm(msg)) return;
    try {
      await revertirPedidoProveedor(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || (language === "es" ? "Error al revertir el pedido." : "Error reverting the order."));
    }
  };

  const handleAnular = async (id: string) => {
    const msg = language === "es" 
      ? "¿Está seguro de anular este pedido a fábrica? Esta acción no se puede deshacer y liberará/cancelará las demandas asociadas." 
      : "Are you sure you want to void this factory order? This action cannot be undone and will release/cancel the associated demands.";
    if (!confirm(msg)) return;
    try {
      await anularPedidoProveedor(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || (language === "es" ? "Error al anular pedido consolidado." : "Error voiding consolidated order."));
    }
  };

  const handleCreateQuickProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickProvSubmitting(true);
    setQuickProvError(null);
    try {
      const nuevo = await crearProveedor({
        nombre: quickProvNombre,
        rif: quickProvRif,
        email: quickProvEmail,
        telefono: quickProvTelefono,
        direccion: quickProvDireccion
      });
      const provs = await obtenerProveedores();
      setProveedores(provs);
      setSelectedProveedorId(nuevo.id || "");
      setShowQuickProviderForm(false);
      // Resetear campos
      setQuickProvNombre("");
      setQuickProvRif("");
      setQuickProvEmail("");
      setQuickProvTelefono("");
      setQuickProvDireccion("");
    } catch (err: any) {
      setQuickProvError(err.message || (language === "es" ? "Error al registrar el proveedor." : "Error registering supplier."));
    } finally {
      setQuickProvSubmitting(false);
    }
  };

  const handleCreateQuickResponsable = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickRespSubmitting(true);
    setQuickRespError(null);
    try {
      const nuevo = await crearResponsable({
        nombre: quickRespNombre,
        rol: quickRespRol,
        email: quickRespEmail
      });
      const resps = await obtenerResponsables();
      setResponsables(resps);
      setSelectedResponsableId(nuevo.id || "");
      setShowQuickResponsableForm(false);
      // Resetear
      setQuickRespNombre("");
      setQuickRespRol("Operador");
      setQuickRespEmail("");
    } catch (err: any) {
      setQuickRespError(err.message || (language === "es" ? "Error al registrar responsable." : "Error registering cargo supervisor."));
    } finally {
      setQuickRespSubmitting(false);
    }
  };

  
  
  const handleCloseModal = () => {
    // Check if there is data
    const hasData = (formItems && formItems.length > 0 && formItems[0].sku !== "") || observaciones;
    if (hasData) {
      if (!window.confirm(language === "es" ? "¿Está seguro que desea descartar este pedido y cerrar?" : "Are you sure you want to discard this order and close?")) {
        return;
      }
    }
    setModalOpen(false);
    setSelectedProveedorId("");
    setSelectedResponsableId("");
    setFecha(new Date().toISOString().split("T")[0]);
    setFormItems([{ sku: "", skuProveedor: "", descripcion: "", detalles: "", cantidadPedida: 1, showDetalles: false }]);
    setSubmitting(false);
    setFormError(null);
    setObservaciones("");
    setEditingId(null);
    setPrintPedido(null);
    setShowQuickProviderForm(false);
    setQuickProvNombre("");
    setQuickProvRif("");
    setQuickProvEmail("");
    setQuickProvTelefono("");
    setQuickProvDireccion("");
    setQuickProvSubmitting(false);
    setQuickProvError(null);
    setShowQuickResponsableForm(false);
    setQuickRespNombre("");
    setQuickRespRol("Operador");
    setQuickRespEmail("");
    setQuickRespSubmitting(false);
    setQuickRespError(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Compass className="h-6 w-6 text-indigo-400" />
            <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
              {language === "es" ? "Pedidos Consolidados a Fábrica" : "Consolidated Factory Orders"}
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            {language === "es" 
              ? "Seguimiento de las órdenes de compra al proveedor, responsables y trazabilidad de importación por SKU."
              : "Tracking of supplier purchase orders, supervisors, and import traceability per SKU."}
          </p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            if (proveedores.length > 0) setSelectedProveedorId(proveedores[0].id || "");
            if (responsables.length > 0) setSelectedResponsableId(responsables[0].id || "");
            setFecha(new Date().toISOString().split("T")[0]);
            setFormItems([{ sku: "", skuProveedor: "", cantidadPedida: 1 }]);
            setModalOpen(true);
            setShowQuickProviderForm(false);
            setShowQuickResponsableForm(false);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-500/20 active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> {language === "es" ? "Nuevo Pedido Fábrica" : "New Factory Order"}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-955/40 border border-rose-900/40 rounded-xl text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Listado de Pedidos */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-slate-400 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <span className="text-xs">{language === "es" ? "Cargando pedidos..." : "Loading orders..."}</span>
          </div>
        ) : pedidos.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-center p-6">
            <Compass className="h-10 w-10 text-slate-600 mb-2" />
            <p className="text-xs">{language === "es" ? "No hay pedidos a fábrica registrados." : "No factory orders registered."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 bg-slate-900/20 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4">{language === "es" ? "ID Pedido" : "Order ID"}</th>
                  <th className="p-4">{language === "es" ? "Proveedor" : "Supplier"}</th>
                  <th className="p-4">{language === "es" ? "Responsable" : "Supervisor"}</th>
                  <th className="p-4">{language === "es" ? "Fecha" : "Date"}</th>
                  <th className="p-4">{language === "es" ? "Detalle Consolidado de SKUs" : "Consolidated SKU Details"}</th>
                  <th className="p-4">{language === "es" ? "Trazabilidad de Demandas" : "Demand Traceability"}</th>
                  <th className="p-4">{language === "es" ? "Estado" : "Status"}</th>
                  <th className="p-4 text-right">{language === "es" ? "Acciones" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {pedidos.map((ped) => (
                  <tr key={ped.id} className="hover:bg-white/2 transition-colors">
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 font-mono font-bold text-[11px] border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                        {ped.id}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-200">{ped.proveedorNombre}</td>
                    <td className="p-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">{language === "es" ? "Cargo" : "Role"}</span>
                        <span className="font-medium">{ped.responsableNombre || (language === "es" ? "No asignado" : "Unassigned")}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400">{new Date(ped.fecha).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="space-y-1">
                        {ped.items.map((i, idx) => (
                          <div key={idx} className="font-mono text-[10px] text-slate-300 bg-slate-950/30 p-1.5 rounded-lg border border-slate-900/50 mb-1">
                            <strong>{i.sku}</strong>: {language === "es" ? "Pedido" : "Ordered"} {i.cantidadPedida} / {language === "es" ? "Recibido" : "Received"} <strong className="text-indigo-400">{i.cantidadRecibida}</strong>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-2">
                        {ped.items.flatMap(i => 
                          (i.ordenesAsociadas || []).map((oa, oIdx) => (
                            <div key={`${i.sku}-${oIdx}`} className="bg-slate-950/30 p-2 rounded-lg border border-slate-900/50 flex flex-col gap-0.5 text-[9px]">
                              <span className="font-semibold text-slate-300">SKU: {i.sku}</span>
                              <span className="text-slate-500">{language === "es" ? "Orden Cliente" : "Customer Order"}: {oa.ordenClienteId}</span>
                              <div className="flex gap-4 font-mono text-[8.5px] mt-0.5">
                                  <span>{language === "es" ? "Prometida" : "Promised"}: <strong className="text-slate-300">{oa.cantidadPrometida}</strong></span>
                                  <span>{language === "es" ? "Recibida" : "Received"}: <strong className="text-indigo-400">{oa.cantidadRecibida}</strong></span>
                              </div>
                            </div>
                          ))
                        )}
                        {ped.items.every(i => !i.ordenesAsociadas || i.ordenesAsociadas.length === 0) && (
                          <span className="text-slate-500 text-[10px]">{language === "es" ? "Sin asignaciones FIFO aún." : "No FIFO allocations yet."}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        ped.estado === "recibido" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        ped.estado === "parcial" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        ped.estado === "formalizado" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                        ped.estado === "anulado" ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse" :
                        "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                      }`}>
                        {ped.estado === "pendiente" ? (language === "es" ? "PENDIENTE" : "PENDING") :
                         ped.estado === "formalizado" ? (language === "es" ? "FORMALIZADO" : "FORMALIZED") :
                         ped.estado === "parcial" ? (language === "es" ? "PARCIAL" : "PARTIAL") :
                         ped.estado === "recibido" ? (language === "es" ? "RECIBIDO" : "RECEIVED") :
                         (language === "es" ? "ANULADO" : "VOIDED")}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end items-center flex-wrap">
                        {ped.estado === "pendiente" && (
                          <>
                            <button
                              onClick={() => handleFormalizar(ped.id!)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                              title={language === "es" ? "Formalizar Solicitud de Compra" : "Finalize Purchase Order"}
                            >
                              <CheckCheck className="h-3 w-3" /> {language === "es" ? "Formalizar" : "Finalize"}
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(ped.id!);
                                setSelectedProveedorId(ped.proveedorId);
                                setSelectedResponsableId(ped.responsableId || "");
                                setFecha(ped.fecha.split("T")[0]);
                                setFormItems(ped.items.map(item => ({
                                  sku: item.sku,
                                  skuProveedor: item.skuProveedor || "",
                                  descripcion: item.descripcion || "",
                                  cantidadPedida: item.cantidadPedida,
                                  costoUnitario: item.costoUnitario || 0
                                })));
                                setModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                              title={language === "es" ? "Editar Pedido Fábrica" : "Edit Factory Order"}
                            >
                              <Edit className="h-3 w-3" /> {t("btn.edit")}
                            </button>
                            <button
                              onClick={() => handleAnular(ped.id!)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                              title={language === "es" ? "Anular Pedido Fábrica" : "Void Factory Order"}
                            >
                              <Ban className="h-3 w-3" /> {t("btn.anular")}
                            </button>
                          </>
                        )}
                        {ped.estado === "formalizado" && (
                          <>
                            <button
                              onClick={() => handleRevertir(ped.id!)}
                              className="px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                              title={language === "es" ? "Revertir a Pendiente" : "Revert to Pending"}
                            >
                              <RefreshCcw className="h-3 w-3" /> {language === "es" ? "Revertir" : "Revert"}
                            </button>
                            <button
                              onClick={() => handleAnular(ped.id!)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                              title={language === "es" ? "Anular Pedido Fábrica" : "Void Factory Order"}
                            >
                              <Ban className="h-3 w-3" /> {t("btn.anular")}
                            </button>
                          </>
                        )}
                        {ped.estado !== "anulado" && (
                          <button
                            onClick={() => router.push(`/pedidos-proveedor/${ped.id}/financiero`)}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                            title={language === "es" ? "Finanzas de Importación (CXP y Gastos Extras)" : "Import Finances (A/P & Extra Expenses)"}
                          >
                            <DollarSign className="h-3 w-3" /> {language === "es" ? "Finanzas" : "Finance"}
                          </button>
                        )}
                        {ped.estado !== "anulado" && (
                          <button
                            onClick={() => setPrintPedido(ped)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                            title={language === "es" ? "Imprimir Orden de Compra" : "Print Purchase Order"}
                          >
                            <Printer className="h-3 w-3" /> {language === "es" ? "Imprimir" : "Print"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal / Formulario Nuevo Pedido (Estilo Facturación) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-5xl rounded-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200 border border-slate-800/80 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
              <h3 className="text-md font-bold text-slate-200 flex items-center gap-2">
                <Compass className="h-5 w-5 text-indigo-400" /> 
                {editingId 
                  ? `${language === "es" ? "Editar Pedido a Fábrica" : "Edit Factory Order"} (Ref: ${editingId})` 
                  : (language === "es" ? "Crear Nuevo Pedido a Fábrica (Importación)" : "Create New Factory Order (Import)")}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {showQuickProviderForm ? (
              <form onSubmit={handleCreateQuickProveedor} className="space-y-4">
                <div className="border-b border-slate-800/50 pb-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-indigo-400" /> {language === "es" ? "Registrar Nuevo Proveedor / Fábrica" : "Register New Supplier / Factory"}
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{language === "es" ? "Nombre o Razón Social" : "Name or Business Name"}</label>
                    <input
                      type="text"
                      required
                      placeholder={language === "es" ? "Ej. Factory Parts Ltd" : "e.g. Factory Parts Ltd"}
                      value={quickProvNombre}
                      onChange={e => setQuickProvNombre(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                      disabled={quickProvSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{language === "es" ? "RIF / Identificación Fiscal" : "Tax ID / ID"}</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. J-30123456-7"
                      value={quickProvRif}
                      onChange={e => setQuickProvRif(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                      disabled={quickProvSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{language === "es" ? "Correo Electrónico" : "Email Address"}</label>
                    <input
                      type="email"
                      required
                      placeholder="sales@factoryparts.com"
                      value={quickProvEmail}
                      onChange={e => setQuickProvEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                      disabled={quickProvSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{language === "es" ? "Teléfono de Contacto" : "Contact Phone"}</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. +1 305-5555555"
                      value={quickProvTelefono}
                      onChange={e => setQuickProvTelefono(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                      disabled={quickProvSubmitting}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{language === "es" ? "Dirección Física" : "Physical Address"}</label>
                  <input
                     type="text"
                     required
                     placeholder={language === "es" ? "Ej. 100 Main St, Miami, FL, USA" : "e.g. 100 Main St, Miami, FL, USA"}
                     value={quickProvDireccion}
                     onChange={e => setQuickProvDireccion(e.target.value)}
                     className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                     disabled={quickProvSubmitting}
                  />
                </div>

                {quickProvError && (
                  <div className="p-3 bg-rose-955/40 border border-rose-900/40 rounded-xl text-rose-300 text-[11px] flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{quickProvError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => setShowQuickProviderForm(false)}
                    className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-white/5 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
                    disabled={quickProvSubmitting}
                  >
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                    disabled={quickProvSubmitting}
                  >
                    {quickProvSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {language === "es" ? "Guardar y Seleccionar" : "Save and Select"}
                  </button>
                </div>
              </form>
            ) : showQuickResponsableForm ? (
              <form onSubmit={handleCreateQuickResponsable} className="space-y-4">
                <div className="border-b border-slate-800/50 pb-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-indigo-400" /> {language === "es" ? "Registrar Nuevo Responsable de Carga" : "Register New Cargo Supervisor"}
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{language === "es" ? "Nombre Completo" : "Full Name"}</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez"
                      value={quickRespNombre}
                      onChange={e => setQuickRespNombre(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                      disabled={quickRespSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{language === "es" ? "Cargo / Rol" : "Cargo / Role"}</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Operador de Inventario, Supervisor"
                      value={quickRespRol}
                      onChange={e => setQuickRespRol(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                      disabled={quickRespSubmitting}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{language === "es" ? "Correo Electrónico" : "Email Address"}</label>
                  <input
                    type="email"
                    required
                    placeholder="juan.perez@maxicom.com"
                    value={quickRespEmail}
                    onChange={e => setQuickRespEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                    disabled={quickRespSubmitting}
                  />
                </div>

                {quickRespError && (
                  <div className="p-3 bg-rose-955/40 border border-rose-905/40 rounded-xl text-rose-300 text-[11px] flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{quickRespError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => setShowQuickResponsableForm(false)}
                    className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-white/5 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
                    disabled={quickRespSubmitting}
                  >
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                    disabled={quickRespSubmitting}
                  >
                    {quickRespSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {language === "es" ? "Guardar y Seleccionar" : "Save and Select"}
                  </button>
                </div>
              </form>
            ) : proveedores.length === 0 ? (
              <div className="p-8 text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-amber-400 mx-auto" />
                <h4 className="text-slate-200 font-bold">{language === "es" ? "No hay proveedores registrados" : "No suppliers registered"}</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {language === "es" 
                    ? "Debes dar de alta al menos un proveedor comercial antes de poder elaborar un pedido de compra." 
                    : "You must register at least one commercial supplier before creating a purchase order."}
                </p>
                <button
                  type="button"
                  onClick={() => setShowQuickProviderForm(true)}
                  className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer active:scale-95 transition-all"
                >
                  {language === "es" ? "Registrar Proveedor Rápido" : "Quick Register Supplier"}
                </button>
              </div>
            ) : responsables.length === 0 ? (
              <div className="p-8 text-center space-y-4">
                <ShieldAlert className="h-12 w-12 text-amber-400 mx-auto" />
                <h4 className="text-slate-200 font-bold">{language === "es" ? "No hay Responsables de Carga" : "No Cargo Supervisors registered"}</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {language === "es" 
                    ? "Para tener trazabilidad sobre quién realiza cargas y modificaciones de documentos, debes registrar al menos un Responsable." 
                    : "To track who performs document uploads and edits, you must register at least one supervisor."}
                </p>
                <button
                  type="button"
                  onClick={() => setShowQuickResponsableForm(true)}
                  className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer active:scale-95 transition-all"
                >
                  {language === "es" ? "Registrar Responsable Rápido" : "Quick Register Supervisor"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-6">
                
                {/* Cabecera del Documento - 4 Columnas con diseño anti-colisión */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-955/40 rounded-xl border border-slate-900">
                  
                  {/* Proveedor */}
                  <div className="space-y-1.5 min-w-0">
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-indigo-400" />
                      {language === "es" ? "Proveedor / Fábrica" : "Supplier / Factory"}
                    </label>
                    <div className="flex gap-2 items-center min-w-0">
                      <select
                        value={selectedProveedorId}
                        onChange={(e) => setSelectedProveedorId(e.target.value)}
                        className="w-full min-w-0 truncate px-3 py-2 rounded-xl text-xs glass-input focus:outline-none"
                        disabled={submitting}
                      >
                        {proveedores.map(p => (
                          <option className="bg-slate-900 text-white"  key={p.id} value={p.id}  >
                            {p.nombre} ({p.rif})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowQuickProviderForm(true)}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-white/5 text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer shrink-0"
                        title={language === "es" ? "Registrar Nuevo Proveedor" : "Register New Supplier"}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Responsable de Carga */}
                  <div className="space-y-1.5 min-w-0">
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <UserCheck className="h-3 w-3 text-indigo-400" />
                      {language === "es" ? "Responsable Carga" : "Cargo Supervisor"}
                    </label>
                    <div className="flex gap-2 items-center min-w-0">
                      <select
                        value={selectedResponsableId}
                        onChange={(e) => setSelectedResponsableId(e.target.value)}
                        className="w-full min-w-0 truncate px-3 py-2 rounded-xl text-xs glass-input focus:outline-none"
                        disabled={submitting}
                      >
                        {responsables.map(r => (
                          <option className="bg-slate-900 text-white"  key={r.id} value={r.id}  >
                            {r.nombre} ({r.rol})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowQuickResponsableForm(true)}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-white/5 text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer shrink-0"
                        title={language === "es" ? "Registrar Nuevo Responsable" : "Register New Cargo Supervisor"}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Fecha */}
                  <div className="space-y-1.5 min-w-0">
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-indigo-400" />
                      {language === "es" ? "Fecha Pedido" : "Order Date"}
                    </label>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs glass-input focus:outline-none"
                      disabled={submitting}
                    />
                  </div>

                  {/* Moneda */}
                  <div className="space-y-1.5 min-w-0">
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <Info className="h-3 w-3 text-indigo-400" />
                      {language === "es" ? "Moneda Compra" : "Purchase Currency"}
                    </label>
                    <input
                      type="text"
                      value="USD ($)"
                      disabled
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-900/50 border border-slate-800 text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-400 border-b border-slate-800/60 pb-2">
                    <span>{language === "es" ? "Lista de Productos Consolidados" : "Consolidated Product List"}</span>
                    <button 
                      type="button" 
                      onClick={handleAddFormItem}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> {language === "es" ? "Agregar Producto" : "Add Product"}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {formItems.map((item, idx) => (
                      <div key={idx}>
                      <div className="flex gap-2 items-center">
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            placeholder="SKU"
                            list="productos-list"
                            required
                            value={item.sku}
                            onChange={(e) => handleFormItemChange(idx, "sku", e.target.value.toUpperCase())}
                            className="w-1/4 px-3 py-2 rounded-xl text-xs glass-input focus:outline-none uppercase font-mono"
                            disabled={submitting}
                            title="Código Interno"
                          />
                          <input
                            type="text"
                            placeholder={language === "es" ? "COD. PROV." : "VEND. CODE"}
                            value={item.skuProveedor || ""}
                            onChange={(e) => handleFormItemChange(idx, "skuProveedor", e.target.value.toUpperCase())}
                            className="w-1/4 px-3 py-2 rounded-xl text-xs glass-input font-mono"
                            disabled={submitting}
                            title="SKU Proveedor"
                          />
                          <input
                            type="text"
                            placeholder={language === "es" ? "Descripción" : "Description"}
                            required
                            value={item.descripcion || ""}
                            onChange={(e) => handleFormItemChange(idx, "descripcion", e.target.value)}
                            className="flex-1 px-3 py-2 rounded-xl text-xs glass-input focus:outline-none"
                            disabled={submitting}
                          />
                        </div>
                        <input
                          type="number"
                          placeholder={language === "es" ? "Cantidad Pedida" : "Ordered Qty"}
                          required
                          value={item.cantidadPedida}
                          onChange={(e) => handleFormItemChange(idx, "cantidadPedida", Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-24 px-3 py-2 rounded-xl text-xs glass-input text-center"
                          disabled={submitting}
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder={language === "es" ? "Costo U." : "Unit Cost"}
                          value={item.costoUnitario !== undefined ? item.costoUnitario : ""}
                          onChange={(e) => handleFormItemChange(idx, "costoUnitario", Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-24 px-3 py-2 rounded-xl text-xs glass-input text-center"
                          disabled={submitting}
                          title={language === "es" ? "Costo de Compra Proveedor" : "Supplier Purchase Cost"}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...formItems];
                            updated[idx].showDetalles = !updated[idx].showDetalles;
                            setFormItems(updated);
                          }}
                          className={"p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 " + (item.showDetalles ? 'text-indigo-400 bg-indigo-500/20' : 'text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10')}
                          title={language === "es" ? "Añadir detalles/párrafo" : "Add details/paragraph"}
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFormItem(idx)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer transition-colors"
                          disabled={submitting || formItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {item.showDetalles && (
                        <div className="w-full mt-1">
                          <textarea
                            placeholder={language === "es" ? "Especificaciones, detalles técnicos o información adicional tipo párrafo..." : "Specifications, technical details or additional paragraph info..."}
                            value={item.detalles || ""}
                            onChange={(e) => handleFormItemChange(idx, "detalles", e.target.value)}
                            className="glass-input w-full px-3 py-2 rounded-lg text-xs min-h-[60px] resize-y"
                          />
                        </div>
                      )}
                      
                    </div>
                    ))}
                  </div>
                </div>

                <datalist id="productos-list">
                  {productos.map(p => (
                    <option className="bg-slate-900 text-white"  key={p.id} value={p.sku}>{p.descripcion}</option>
                  ))}
                </datalist>

                {formError && (
                  <div className="flex items-center gap-2 p-3 bg-rose-955/40 border border-rose-900/40 rounded-xl text-rose-300 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Botones de Acción */}

                
                {/* Observaciones Generales */}
                <div className="mt-8 border-t border-white/10 pt-6">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {language === "es" ? "Observaciones Generales" : "General Notes"}
                  </label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="glass-input w-full px-4 py-3 rounded-xl text-sm min-h-[100px]"
                    placeholder={language === "es" ? "Notas importantes, lugar de entrega, condiciones..." : "Important notes, delivery place, terms..."}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-white/5 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
                    disabled={submitting}
                  >
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-500/10 active:scale-95"
                    disabled={submitting}
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {editingId ? (language === "es" ? "Actualizar Pedido" : "Update Order") : (language === "es" ? "Guardar Pedido" : "Save Order")}
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>
      )}

      {/* Vista de Impresión Overlay Modal */}
      {printPedido && empresa && (
        <PrintPedidoProveedor
          pedido={printPedido}
          empresa={empresa}
          proveedores={proveedores}
          productos={productos}
          onClose={() => setPrintPedido(null)}
          language={language}
        />
      )}
    </div>
  );
}
