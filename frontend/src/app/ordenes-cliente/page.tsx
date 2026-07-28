"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { 
  ShoppingCart, 
  Loader2, 
  Plus, 
  X, 
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Calendar,
  User,
  Trash2,
  Info,
  Building2,
  UserCheck,
  ShieldAlert,
  Edit,
  Ban,
  Check,
  Search,
  Printer,
  Upload
} from "lucide-react";
import { 
  obtenerOrdenesCliente, 
  crearOrdenCliente, 
  editarOrdenCliente,
  anularOrdenCliente,
  obtenerClientes, 
  crearCliente, 
  obtenerResponsables, 
  crearResponsable,
  obtenerProveedores,
  crearProveedor,
  obtenerCotizaciones,
  obtenerProductos,
  obtenerEmpresa,
  EmpresaConfig
} from "@/lib/api/importaciones";
import PrintOrdenCliente from "@/components/PrintOrdenCliente";
import { OrdenCliente, Cliente, Responsable, Proveedor, Cotizacion, Producto } from "@/types";
import { useTranslation } from "@/context/LanguageContext";

import { Suspense } from "react";

function OrdenesClienteContent() {
  const { t, language } = useTranslation();
  const searchParams = useSearchParams();
  const [ordenes, setOrdenes] = useState<OrdenCliente[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cotizacionesAprobadas, setCotizacionesAprobadas] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaConfig | null>(null);
  const [printingOrden, setPrintingOrden] = useState<OrdenCliente | null>(null);

  // Estados para Modal de Nueva Orden
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [selectedResponsableId, setSelectedResponsableId] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0]);
  const [formItems, setFormItems] = useState<Array<{
    sku: string;
    skuProveedor?: string;
    descripcion: string;
    detalles?: string;
    showDetalles?: boolean;
    cantidadPedida: number;
    precioUnitario: number;
    proveedores: Array<{ proveedorId: string; proveedorNombre: string; cantidad: number }>;
  }>>([
    { sku: "", skuProveedor: "", descripcion: "", detalles: "", cantidadPedida: 1, precioUnitario: 0, proveedores: [] }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estados para extracción de PDF (IA)
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Estados para Registro Rápido de Cliente
  const [showQuickClientForm, setShowQuickClientForm] = useState(false);
  const [quickCliNombre, setQuickCliNombre] = useState("");
  const [quickCliRif, setQuickCliRif] = useState("");
  const [quickCliEmail, setQuickCliEmail] = useState("");
  const [quickCliTelefono, setQuickCliTelefono] = useState("");
  const [quickCliDireccion, setQuickCliDireccion] = useState("");
  const [quickCliSubmitting, setQuickCliSubmitting] = useState(false);
  const [quickCliError, setQuickCliError] = useState<string | null>(null);

  // Estados para Registro Rápido de Responsable
  const [showQuickResponsableForm, setShowQuickResponsableForm] = useState(false);
  const [quickRespNombre, setQuickRespNombre] = useState("");
  const [quickRespRol, setQuickRespRol] = useState("Operador");
  const [quickRespEmail, setQuickRespEmail] = useState("");
  const [quickRespSubmitting, setQuickRespSubmitting] = useState(false);
  const [quickRespError, setQuickRespError] = useState<string | null>(null);

  // Estado para Modal de Importar Presupuesto
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSearchQuery, setImportSearchQuery] = useState("");

  // Estados para Registro Rápido de Proveedor
  const [showQuickProvForm, setShowQuickProvForm] = useState(false);
  const [quickProvNombre, setQuickProvNombre] = useState("");
  const [quickProvRif, setQuickProvRif] = useState("");
  const [quickProvEmail, setQuickProvEmail] = useState("");
  const [quickProvTelefono, setQuickProvTelefono] = useState("");
  const [quickProvDireccion, setQuickProvDireccion] = useState("");
  const [quickProvRequiereRif, setQuickProvRequiereRif] = useState(true);
  const [quickProvSubmitting, setQuickProvSubmitting] = useState(false);
  const [quickProvError, setQuickProvError] = useState<string | null>(null);
  const [quickProvItemIndex, setQuickProvItemIndex] = useState<number | null>(null);
  const [quickProvSubIndex, setQuickProvSubIndex] = useState<number | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [ords, clis, resps, provs, cots, prods, emp] = await Promise.all([
        obtenerOrdenesCliente(),
        obtenerClientes(),
        obtenerResponsables(),
        obtenerProveedores(),
        obtenerCotizaciones(),
        obtenerProductos(),
        obtenerEmpresa()
      ]);
      setOrdenes(ords);
      setClientes(clis);
      setResponsables(resps);
      setProveedores(provs);
      setProductos(prods);
      setEmpresa(emp);
      setCotizacionesAprobadas(cots.filter(c => c.estado === "aprobado"));
      
      const fromCotId = searchParams.get("fromCot");
      let prefilled = false;

      if (fromCotId) {
        const cot = cots.find(c => c.id === fromCotId && c.estado === "aprobado");
        if (cot) {
          setSelectedClienteId(cot.clienteId);
          if (cot.responsableId) {
            setSelectedResponsableId(cot.responsableId);
          }
          setFormItems(cot.items.map(i => ({
            sku: i.sku,
            skuProveedor: i.skuProveedor || "",
            descripcion: i.descripcion || "",
            cantidadPedida: i.cantidad,
            precioUnitario: i.precioUnitario,
            proveedores: []
          })));
          setModalOpen(true);
          prefilled = true;
          // Clean URL so it doesn't reopen on refresh
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }

      if (!prefilled) {
        if (clis.length > 0) {
          setSelectedClienteId(clis[0].id || "");
        }
        if (resps.length > 0) {
          setSelectedResponsableId(resps[0].id || "");
        }
      }
    } catch (err: any) {
      setError(err.message || "Error al cargar órdenes de clientes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [searchParams]);

  const handleAddFormItem = () => {
    setFormItems([...formItems, { sku: "", skuProveedor: "", descripcion: "", detalles: "", cantidadPedida: 1, precioUnitario: 0, proveedores: [] }]);
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

  const handleAddProveedorToItem = (idx: number) => {
    const updated = [...formItems];
    if (!updated[idx].proveedores) {
      updated[idx].proveedores = [];
    }
    
    const currentSum = updated[idx].proveedores.reduce((acc, p) => acc + (p.cantidad || 0), 0);
    const totalPedida = updated[idx].cantidadPedida || 1;
    let remaining = totalPedida - currentSum;
    
    // Si ya nos pasamos de la cantidad, asignamos 1 por defecto para no romper el input numérico
    if (remaining <= 0) remaining = 1;

    updated[idx].proveedores.push({ proveedorId: "", proveedorNombre: "", cantidad: remaining });
    setFormItems(updated);
  };

  const handleRemoveProveedorFromItem = (idx: number, pIdx: number) => {
    const updated = [...formItems];
    if (updated[idx].proveedores) {
      updated[idx].proveedores = updated[idx].proveedores.filter((_, i) => i !== pIdx);
    }
    setFormItems(updated);
  };

  const handleProveedorChange = (idx: number, pIdx: number, field: string, value: any) => {
    const updated = [...formItems];
    if (updated[idx].proveedores && updated[idx].proveedores[pIdx]) {
      (updated[idx].proveedores[pIdx] as any)[field] = value;
    }
    setFormItems(updated);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingPdf(true);
    setExtractError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const response = await fetch('/api/extract-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              pdfBase64: base64Data,
              mimeType: file.type
            })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Error al analizar PDF');
          }

          const { items, entidad, observaciones: obs } = await response.json();
          if (obs) setObservaciones(obs);
          if (items && Array.isArray(items)) {
            // Map the API structure to the form items structure
            const newItems = items.map(item => ({
              sku: item.sku || "",
              skuProveedor: item.skuProveedor || "",
              descripcion: item.descripcion || "",
              cantidadPedida: item.cantidadPedida || 1,
              precioUnitario: item.precioUnitario || 0,
              proveedores: []
            }));

            // Filter out empty items if replacing the first default one
            if (formItems.length === 1 && !formItems[0].sku && !formItems[0].descripcion) {
              setFormItems(newItems);
            } else {
              setFormItems([...formItems, ...newItems]);
            }

            if (entidad) {
              const upperEntidad = entidad.toUpperCase();
              const matching = clientes.find(c => c.nombre.toUpperCase().includes(upperEntidad) || upperEntidad.includes(c.nombre.toUpperCase()));
              if (matching) {
                setSelectedClienteId(matching.id || "");
              }
            }

          }
        } catch (err: any) {
          setExtractError(err.message || 'Error de extracción de PDF');
        } finally {
          setIsExtractingPdf(false);
          // reset input
          e.target.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setExtractError('No se pudo leer el archivo');
      setIsExtractingPdf(false);
    }
  };

  // Cálculo de totales
  const subtotal = formItems.reduce((acc, curr) => acc + ((curr.cantidadPedida || 0) * (curr.precioUnitario || 0)), 0);
  const impuestos = 0; // Las órdenes de venta no llevan impuestos por defecto (opcional en factura)
  const total = subtotal;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const client = clientes.find(c => c.id === selectedClienteId);
    if (!client) {
      setFormError(language === "es" ? "Debe seleccionar un cliente registrado." : "You must select a registered customer.");
      setSubmitting(false);
      return;
    }

    const resp = responsables.find(r => r.id === selectedResponsableId);
    if (!resp) {
      setFormError(language === "es" ? "Debe seleccionar un responsable de carga." : "You must select a cargo supervisor.");
      setSubmitting(false);
      return;
    }

    const validItems = formItems.filter(i => i.sku.trim() !== "" && i.cantidadPedida > 0 && i.precioUnitario >= 0);
    if (validItems.length === 0) {
      setFormError(language === "es" ? "Debe ingresar al menos un SKU válido." : "You must enter at least one valid SKU.");
      setSubmitting(false);
      return;
    }

    // Validar asignaciones de proveedores
    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i];
      const provs = item.proveedores || [];
      const sum = provs.reduce((acc, p) => acc + (p.cantidad || 0), 0);
      if (provs.length > 0 && sum > item.cantidadPedida) {
        setFormError(language === "es" ? `La suma de proveedores en el SKU ${item.sku} excede la cantidad total pedida.` : `Supplier sum for SKU ${item.sku} exceeds total ordered quantity.`);
        setSubmitting(false);
        return;
      }
      if (provs.some(p => !p.proveedorId)) {
        setFormError(language === "es" ? `Debe seleccionar el proveedor en las asignaciones del SKU ${item.sku}.` : `You must select a supplier in assignments for SKU ${item.sku}.`);
        setSubmitting(false);
        return;
      }
    }

    try {
      if (editingId) {
        const ordenActual = ordenes.find(o => o.id === editingId);
        const itemsConCantidades = validItems.map(i => {
          const itemOriginal = ordenActual?.items.find(orig => orig.sku === i.sku);
          return {
            sku: i.sku,
            skuProveedor: i.skuProveedor || "",
            descripcion: i.descripcion || "",
            detalles: i.detalles || "",
            cantidadPedida: i.cantidadPedida,
            precioUnitario: i.precioUnitario,
            cantidadRecibida: itemOriginal?.cantidadRecibida || 0,
            cantidadEntregada: itemOriginal?.cantidadEntregada || 0,
            proveedores: i.proveedores || []
          };
        });
        await editarOrdenCliente(
          editingId,
          client.id!, 
          client.nombre, 
          itemsConCantidades, 
          new Date(fecha).toISOString(),
          resp.id,
          resp.nombre,
          observaciones
        );
      } else {
        await crearOrdenCliente(
          client.id!, 
          client.nombre, 
          validItems.map(i => ({
            sku: i.sku,
            skuProveedor: i.skuProveedor || "",
            descripcion: i.descripcion || "",
            cantidadPedida: i.cantidadPedida,
            precioUnitario: i.precioUnitario,
            proveedores: i.proveedores || []
          })), 
          new Date(fecha).toISOString(),
          resp.id,
          resp.nombre,
          observaciones
        );
      }
      setModalOpen(false);
      setEditingId(null);
      setFormItems([{ sku: "", skuProveedor: "", descripcion: "", detalles: "", cantidadPedida: 1, precioUnitario: 0, proveedores: [] }]);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || (language === "es" ? "Error al registrar/editar orden." : "Error registering/editing order."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnular = async (id: string) => {
    if (!confirm(language === "es" ? "¿Está seguro de anular esta orden de venta? Esta acción no se puede deshacer." : "Are you sure you want to void this sales order? This action cannot be undone.")) return;
    try {
      await anularOrdenCliente(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || (language === "es" ? "Error al anular orden." : "Error voiding order."));
    }
  };

  const handleCreateQuickCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickCliSubmitting(true);
    setQuickCliError(null);
    try {
      const nuevo = await crearCliente({
        nombre: quickCliNombre,
        rif: quickCliRif,
        email: quickCliEmail,
        telefono: quickCliTelefono,
        direccion: quickCliDireccion
      });
      const clis = await obtenerClientes();
      setClientes(clis);
      setSelectedClienteId(nuevo.id || "");
      setShowQuickClientForm(false);
      // Resetear campos
      setQuickCliNombre("");
      setQuickCliRif("");
      setQuickCliEmail("");
      setQuickCliTelefono("");
      setQuickCliDireccion("");
    } catch (err: any) {
      setQuickCliError(err.message || (language === "es" ? "Error al registrar el cliente." : "Error registering client."));
    } finally {
      setQuickCliSubmitting(false);
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

  const handleCreateQuickProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quickProvRequiereRif && !quickProvRif.trim()) {
      setQuickProvError(language === "es" ? "El RIF/Cédula es requerido." : "RIF/ID is required.");
      return;
    }
    setQuickProvSubmitting(true);
    setQuickProvError(null);
    const finalRif = quickProvRequiereRif ? quickProvRif : "";
    try {
      const nuevo = await crearProveedor({ 
        nombre: quickProvNombre,
        rif: finalRif,
        email: quickProvEmail,
        telefono: quickProvTelefono,
        direccion: quickProvDireccion
      });
      const provs = await obtenerProveedores();
      setProveedores(provs);
      
      if (quickProvItemIndex !== null && quickProvSubIndex !== null && formItems[quickProvItemIndex]) {
        handleProveedorChange(quickProvItemIndex, quickProvSubIndex, "proveedorId", nuevo.id);
        handleProveedorChange(quickProvItemIndex, quickProvSubIndex, "proveedorNombre", nuevo.nombre);
      }
      
      setShowQuickProvForm(false);
      setQuickProvNombre("");
      setQuickProvRif("");
      setQuickProvEmail("");
      setQuickProvTelefono("");
      setQuickProvDireccion("");
      setQuickProvRequiereRif(true);
      setQuickProvItemIndex(null);
      setQuickProvSubIndex(null);
    } catch (err: any) {
      setQuickProvError(err.message || (language === "es" ? "Error al registrar proveedor." : "Error registering supplier."));
    } finally {
      setQuickProvSubmitting(false);
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
    setCotizacionesAprobadas([]);
    setPrintingOrden(null);
    setSelectedClienteId("");
    setSelectedResponsableId("");
    setFecha(new Date().toISOString().split("T")[0]);
    setFormItems([{ sku: "", skuProveedor: "", descripcion: "", detalles: "", cantidadPedida: 1, precioUnitario: 0, proveedores: [] }]);
    setSubmitting(false);
    setFormError(null);
    setObservaciones("");
    setEditingId(null);
    setIsExtractingPdf(false);
    setExtractError(null);
    setShowQuickClientForm(false);
    setQuickCliNombre("");
    setQuickCliRif("");
    setQuickCliEmail("");
    setQuickCliTelefono("");
    setQuickCliDireccion("");
    setQuickCliSubmitting(false);
    setQuickCliError(null);
    setShowQuickResponsableForm(false);
    setQuickRespNombre("");
    setQuickRespRol("Operador");
    setQuickRespEmail("");
    setQuickRespSubmitting(false);
    setQuickRespError(null);
    setShowImportModal(false);
    setImportSearchQuery("");
    setShowQuickProvForm(false);
    setQuickProvNombre("");
    setQuickProvRif("");
    setQuickProvEmail("");
    setQuickProvTelefono("");
    setQuickProvDireccion("");
    setQuickProvRequiereRif(true);
    setQuickProvSubmitting(false);
    setQuickProvError(null);
    setQuickProvItemIndex(null);
    setQuickProvSubIndex(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <ShoppingCart className="h-6 w-6 text-indigo-400" />
            <h2 className="text-2xl font-bold text-slate-100 tracking-tight">{language === "es" ? "Órdenes de Clientes" : "Customer Orders"}</h2>
          </div>
          <p className="text-xs text-slate-400">
            {language === "es" 
              ? "Seguimiento de la demanda comprometida, existencias recibidas, despachos y responsables de carga." 
              : "Tracking of committed demand, received inventory, dispatches, and cargo supervisors."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all border border-slate-700 cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" /> {language === "es" ? "Importar Presupuesto" : "Import Budget"}
          </button>
          <button 
            onClick={() => {
              setEditingId(null);
              if (clientes.length > 0) setSelectedClienteId(clientes[0].id || "");
              if (responsables.length > 0) setSelectedResponsableId(responsables[0].id || "");
              setFecha(new Date().toISOString().split("T")[0]);
              setFormItems([{ sku: "", skuProveedor: "", descripcion: "", detalles: "", cantidadPedida: 1, precioUnitario: 0, proveedores: [] }]);
              setModalOpen(true);
              setShowQuickClientForm(false);
              setShowQuickResponsableForm(false);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-500/20 active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> {language === "es" ? "Nueva Orden de Venta" : "New Sales Order"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-955/40 border border-rose-800/40 rounded-xl text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Listado de Órdenes */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-slate-400 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <span className="text-xs">{language === "es" ? "Cargando órdenes..." : "Loading orders..."}</span>
          </div>
        ) : ordenes.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-center p-6">
            <ShoppingCart className="h-10 w-10 text-slate-600 mb-2" />
            <p className="text-xs">{language === "es" ? "No hay órdenes de clientes activas en el sistema." : "No active customer orders found in the system."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 bg-slate-900/20 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4">{language === "es" ? "ID Orden" : "Order ID"}</th>
                  <th className="p-4">{language === "es" ? "Cliente" : "Customer"}</th>
                  <th className="p-4">{language === "es" ? "Responsable" : "Supervisor"}</th>
                  <th className="p-4">{language === "es" ? "Fecha" : "Date"}</th>
                  <th className="p-4">{language === "es" ? "Detalle de SKUs (Ped/Rec/Desp)" : "SKU Details (Ord/Rec/Disp)"}</th>
                  <th className="p-4">{language === "es" ? "Monto Total" : "Total Amount"}</th>
                  <th className="p-4">{language === "es" ? "Estado" : "Status"}</th>
                  <th className="p-4 text-right">{language === "es" ? "Acciones" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {ordenes.map((ord) => (
                  <tr key={ord.id} className="hover:bg-white/2 transition-colors">
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 font-mono font-bold text-[11px] border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                        {ord.id}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-200">{ord.clienteNombre}</td>
                    <td className="p-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">{language === "es" ? "Cargo" : "Role"}</span>
                        <span className="font-medium">{ord.responsableNombre || (language === "es" ? "No asignado" : "Unassigned")}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400">{new Date(ord.fecha).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="space-y-1.5">
                        {ord.items.map((i, idx) => (
                          <div key={idx} className="flex flex-col text-[10px] bg-slate-950/30 p-1.5 rounded-lg border border-slate-900/40">
                            <span className="font-semibold text-slate-300">{i.sku}</span>
                            <span className="text-slate-500 text-[9px] truncate max-w-xs">{i.descripcion}</span>
                            <div className="flex gap-4 mt-1 font-mono text-[9px]">
                              <span>{language === "es" ? "Ped:" : "Ord:"} <strong className="text-slate-200">{i.cantidadPedida}</strong></span>
                              <span>{language === "es" ? "Rec:" : "Rec:"} <strong className="text-indigo-400">{i.cantidadRecibida}</strong></span>
                              <span>{language === "es" ? "Desp:" : "Disp:"} <strong className="text-emerald-400">{i.cantidadEntregada}</strong></span>
                            </div>
                            {i.proveedores && i.proveedores.length > 0 ? (
                              <div className="mt-1 space-y-0.5 border-t border-slate-900/50 pt-1">
                                {i.proveedores.map((p, pIdx) => (
                                  <div key={pIdx} className="text-[9px] text-amber-400 flex items-center justify-between gap-1 font-semibold bg-amber-500/10 px-1 py-0.5 rounded">
                                    <span className="flex items-center gap-1 truncate"><User className="h-3 w-3 text-amber-500 shrink-0" /> {p.proveedorNombre}</span>
                                    <span>Cant: {p.cantidad}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-1 text-[9px] text-slate-500 italic">
                                {language === "es" ? "Sin proveedor asignado" : "No supplier assigned"}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-indigo-400">
                      ${ord.montoTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        ord.estado === "completada" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        ord.estado === "parcial" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                        ord.estado === "anulado" ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse" :
                        "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                      }`}>
                        {ord.estado === "completada" ? (language === "es" ? "COMPLETADA" : "COMPLETED") :
                         ord.estado === "parcial" ? (language === "es" ? "PARCIAL" : "PARTIAL") :
                         ord.estado === "anulado" ? (language === "es" ? "ANULADO" : "VOIDED") :
                         (language === "es" ? "PENDIENTE" : "PENDING")}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end items-center">
                        {ord.estado === "pendiente" && (
                          <>
                            <button
                              onClick={() => {
                                setEditingId(ord.id!);
                                setSelectedClienteId(ord.clienteId);
                                setSelectedResponsableId(ord.responsableId || "");
                                setFecha(ord.fecha.split("T")[0]);
                                setFormItems(ord.items.map(item => ({
                                  sku: item.sku,
                                  skuProveedor: item.skuProveedor || "",
                                  descripcion: item.descripcion || "",
                                  cantidadPedida: item.cantidadPedida,
                                  precioUnitario: item.precioUnitario,
                                  proveedores: item.proveedores || []
                                })));
                                setModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                              title={language === "es" ? "Editar Orden de Venta" : "Edit Sales Order"}
                            >
                              <Edit className="h-3 w-3" /> {t("btn.edit")}
                            </button>
                            <button
                              onClick={() => handleAnular(ord.id!)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                              title={language === "es" ? "Anular Orden de Venta" : "Void Sales Order"}
                            >
                              <Ban className="h-3 w-3" /> {language === "es" ? "Anular" : "Void"}
                            </button>
                            <button
                              onClick={() => setPrintingOrden(ord)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                              title={language === "es" ? "Imprimir" : "Print"}
                            >
                              <Printer className="h-3 w-3" /> {language === "es" ? "Imprimir" : "Print"}
                            </button>
                          </>
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

      {/* Modal / Formulario Nueva Orden (Estilo Facturación) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-5xl rounded-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200 border border-slate-800/80 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
              <h3 className="text-md font-bold text-slate-200 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-indigo-400" /> 
                {editingId 
                  ? `${language === "es" ? "Editar Orden de Venta" : "Edit Sales Order"} (Ref: ${editingId})` 
                  : (language === "es" ? "Registrar Nueva Orden de Venta" : "Register New Sales Order")}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {showQuickClientForm ? (
              <form onSubmit={handleCreateQuickCliente} className="space-y-4">
                <div className="border-b border-slate-800/50 pb-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-indigo-400" /> {language === "es" ? "Registrar Nuevo Cliente Comercial" : "Register New Commercial Customer"}
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{language === "es" ? "Nombre o Razón Social" : "Name or Business Name"}</label>
                    <input
                      type="text"
                      required
                      placeholder={language === "es" ? "Ej. Distribuidora Central" : "e.g. Distribuidora Central"}
                      value={quickCliNombre}
                      onChange={e => setQuickCliNombre(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                      disabled={quickCliSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{language === "es" ? "RIF / Cédula" : "Tax ID / ID"}</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. J-40812345-9"
                      value={quickCliRif}
                      onChange={e => setQuickCliRif(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                      disabled={quickCliSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{language === "es" ? "Correo Electrónico" : "Email Address"}</label>
                    <input
                      type="email"
                      required
                      placeholder="compras@cliente.com"
                      value={quickCliEmail}
                      onChange={e => setQuickCliEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                      disabled={quickCliSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{language === "es" ? "Teléfono de Contacto" : "Contact Phone"}</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. +58 412-5555555"
                      value={quickCliTelefono}
                      onChange={e => setQuickCliTelefono(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                      disabled={quickCliSubmitting}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{language === "es" ? "Dirección Física" : "Physical Address"}</label>
                  <input
                    type="text"
                    required
                    placeholder={language === "es" ? "Ej. Zona Industrial I, Calle 4, Galpón 10" : "e.g. Industrial Zone I, 4th Street, Warehouse 10"}
                    value={quickCliDireccion}
                    onChange={e => setQuickCliDireccion(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                    disabled={quickCliSubmitting}
                  />
                </div>

                {quickCliError && (
                  <div className="p-3 bg-rose-955/40 border border-rose-900/40 rounded-xl text-rose-300 text-[11px] flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{quickCliError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => setShowQuickClientForm(false)}
                    className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-white/5 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
                    disabled={quickCliSubmitting}
                  >
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                    disabled={quickCliSubmitting}
                  >
                    {quickCliSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
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
            ) : clientes.length === 0 ? (
              <div className="p-8 text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-amber-400 mx-auto" />
                <h4 className="text-slate-200 font-bold">{language === "es" ? "No hay clientes registrados" : "No customers registered"}</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {language === "es" 
                    ? "Debes dar de alta al menos un cliente en el directorio antes de cargar órdenes de venta directas." 
                    : "You must register at least one customer in the directory before creating direct sales orders."}
                </p>
                <button
                  type="button"
                  onClick={() => setShowQuickClientForm(true)}
                  className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer active:scale-95 transition-all"
                >
                  {language === "es" ? "Registrar Cliente Rápido" : "Quick Register Customer"}
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
                  
                  {/* Cliente */}
                  <div className="space-y-1.5 min-w-0">
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <User className="h-3 w-3 text-indigo-400" />
                      {language === "es" ? "Cliente" : "Customer"}
                    </label>
                    <div className="flex gap-2 items-center min-w-0">
                      <select
                        value={selectedClienteId}
                        onChange={(e) => setSelectedClienteId(e.target.value)}
                        className="w-full min-w-0 truncate px-3 py-2 rounded-xl text-xs glass-input focus:outline-none"
                        disabled={submitting}
                      >
                        {clientes.map(c => (
                          <option className="bg-slate-900 text-white"  key={c.id} value={c.id}  >
                            {c.nombre} ({c.rif})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowQuickClientForm(true)}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-white/5 text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer shrink-0"
                        title={language === "es" ? "Registrar Nuevo Cliente" : "Register New Customer"}
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
                      {language === "es" ? "Fecha Orden" : "Order Date"}
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
                      {language === "es" ? "Moneda" : "Currency"}
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
                    <span>{language === "es" ? "Líneas de la Orden" : "Order Lines"}</span>
                    <div className="flex items-center gap-4">
                      {/* PDF Upload Button */}
                      <label className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer">
                        {isExtractingPdf ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> 
                        ) : (
                          <Upload className="h-3.5 w-3.5" /> 
                        )}
                        {language === "es" ? "Importar PDF (IA)" : "Import PDF (AI)"}
                        <input 
                          type="file" 
                          accept="application/pdf"
                          className="hidden" 
                          onChange={handlePdfUpload}
                          disabled={isExtractingPdf}
                        />
                      </label>

                      <button 
                        type="button" 
                        onClick={handleAddFormItem}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> {language === "es" ? "Agregar Item" : "Add Item"}
                      </button>
                    </div>
                  </div>
                  {extractError && (
                    <div className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                      {extractError}
                    </div>
                  )}

                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {formItems.map((item, idx) => (
                      <div key={idx} className="bg-slate-955/50 border border-slate-800/80 rounded-xl p-3 space-y-3">
                        <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                          <input
                            type="text"
                            placeholder="SKU-BOMB-001"
                            list="productos-list"
                            required
                            value={item.sku}
                            onChange={(e) => handleFormItemChange(idx, "sku", e.target.value.toUpperCase())}
                            className="w-full sm:w-28 px-3 py-2 rounded-xl text-xs glass-input font-mono"
                            disabled={submitting}
                            title="Código Interno"
                          />
                          <input
                            type="text"
                            placeholder={language === "es" ? "COD. PROV." : "VEND. CODE"}
                            value={item.skuProveedor || ""}
                            onChange={(e) => handleFormItemChange(idx, "skuProveedor", e.target.value.toUpperCase())}
                            className="w-full sm:w-24 px-2 py-2 rounded-xl text-xs glass-input font-mono"
                            disabled={submitting}
                            title="SKU Proveedor"
                          />
                          <input
                            type="text"
                            placeholder={language === "es" ? "Descripción del producto" : "Product description"}
                            required
                            value={item.descripcion}
                            onChange={(e) => handleFormItemChange(idx, "descripcion", e.target.value)}
                            className="flex-1 min-w-[200px] px-3 py-2 rounded-xl text-xs glass-input"
                            disabled={submitting}
                          />
                          <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                            <input
                              type="number"
                              placeholder={language === "es" ? "Cant." : "Qty."}
                              required
                              value={item.cantidadPedida}
                              onChange={(e) => handleFormItemChange(idx, "cantidadPedida", Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-24 px-3 py-2 rounded-xl text-xs glass-input text-center"
                              disabled={submitting}
                              title={language === "es" ? "Cantidad Total" : "Total Quantity"}
                            />
                            <input
                              type="number"
                              step="0.01"
                              placeholder={language === "es" ? "Precio U." : "Unit Price"}
                              required
                              value={item.precioUnitario !== undefined ? item.precioUnitario : ""}
                              onChange={(e) => handleFormItemChange(idx, "precioUnitario", Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-24 px-3 py-2 rounded-xl text-xs glass-input text-center"
                              disabled={submitting}
                            />
                            <div className="w-24 text-right pr-2 text-xs font-mono text-slate-300 font-bold bg-slate-900/50 py-2 rounded-xl">
                              ${((item.cantidadPedida || 0) * (item.precioUnitario || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...formItems];
                                updated[idx].showDetalles = !updated[idx].showDetalles;
                                setFormItems(updated);
                              }}
                              className={`p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${item.showDetalles ? 'text-indigo-400 bg-indigo-500/20 border border-indigo-500/20' : 'text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 border border-transparent'}`}
                              title={language === "es" ? "Añadir detalles/párrafo" : "Add details/paragraph"}
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveFormItem(idx)}
                              className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 hover:bg-rose-500/20 cursor-pointer transition-colors shrink-0"
                              disabled={submitting || formItems.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {item.showDetalles && (
                          <div className="w-full">
                            <textarea
                              placeholder={language === "es" ? "Especificaciones o información adicional..." : "Specifications or additional info..."}
                              value={item.detalles || ""}
                              onChange={(e) => handleFormItemChange(idx, "detalles", e.target.value)}
                              className="glass-input w-full px-3 py-2 rounded-lg text-xs min-h-[60px] resize-y"
                            />
                          </div>
                        )}

                        {/* Proveedores asignados a este ítem */}
                        <div className="pl-2 sm:pl-4 border-l-2 border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                              <Building2 className="h-3 w-3" /> {language === "es" ? "Proveedores Asignados" : "Assigned Suppliers"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddProveedorToItem(idx)}
                              className="text-[10px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 bg-sky-500/10 px-2 py-1 rounded-md"
                            >
                              <Plus className="h-3 w-3" /> {language === "es" ? "Asignar Proveedor" : "Assign Supplier"}
                            </button>
                          </div>
                          
                          {(item.proveedores || []).length === 0 && (
                            <div className="text-[10px] text-slate-600 italic">
                              {language === "es" ? "Ningún proveedor asignado (opcional)." : "No suppliers assigned (optional)."}
                            </div>
                          )}

                          {(item.proveedores || []).map((p, pIdx) => (
                            <div key={pIdx} className="flex gap-2 items-center">
                              <div className="flex gap-1 items-center flex-1">
                                <select
                                  value={p.proveedorId || ""}
                                  onChange={(e) => {
                                    const provId = e.target.value;
                                    const prov = proveedores.find(x => x.id === provId);
                                    handleProveedorChange(idx, pIdx, "proveedorId", provId);
                                    handleProveedorChange(idx, pIdx, "proveedorNombre", prov ? prov.nombre : "");
                                  }}
                                  className="w-full sm:max-w-xs px-2 py-1.5 rounded-lg text-xs glass-input focus:outline-none"
                                  disabled={submitting}
                                >
                                  <option className="bg-slate-900 text-white"  value=""  >
                                    {language === "es" ? "-- Seleccionar Proveedor --" : "-- Select Supplier --"}
                                  </option>
                                  {proveedores.map(prov => (
                                    <option className="bg-slate-900 text-white"  key={prov.id} value={prov.id}  >
                                      {prov.nombre}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => { 
                                    setQuickProvItemIndex(idx); 
                                    setQuickProvSubIndex(pIdx);
                                    setShowQuickProvForm(true); 
                                  }}
                                  className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-white/5 text-indigo-400 transition-all cursor-pointer shrink-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                              <input
                                type="number"
                                placeholder="Cant"
                                required
                                value={p.cantidad}
                                onChange={(e) => handleProveedorChange(idx, pIdx, "cantidad", Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-16 px-2 py-1.5 rounded-lg text-xs glass-input text-center"
                                disabled={submitting}
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveProveedorFromItem(idx, pIdx)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <datalist id="productos-list">
                    {productos.map(p => (
                      <option className="bg-slate-900 text-white"  key={p.id} value={p.sku}>{p.descripcion}</option>
                    ))}
                  </datalist>
                </div>

                {/* Resumen e Impuestos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800/60">
                  <div>
                    {formError && (
                      <div className="flex items-center gap-2 p-3 bg-rose-955/40 border border-rose-900/40 rounded-xl text-rose-300 text-xs">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{formError}</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-955/40 p-4 rounded-xl border border-slate-900 text-xs space-y-2 max-w-sm ml-auto w-full">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal:</span>
                      <span className="font-mono">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-indigo-400 border-t border-slate-850 pt-2">
                      <span>{language === "es" ? "Total Neto:" : "Net Total:"}</span>
                      <span className="font-mono">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

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
                    {editingId ? (language === "es" ? "Actualizar Orden" : "Update Order") : (language === "es" ? "Guardar Orden" : "Save Order")}
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Quick Proveedor */}
      {showQuickProvForm && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                {language === "es" ? "Registrar Proveedor" : "Register Supplier"}
              </h3>
              <button onClick={() => setShowQuickProvForm(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateQuickProveedor} className="p-4 space-y-4 bg-slate-950/50">
              {quickProvError && <div className="text-rose-400 text-[10px] bg-rose-500/10 p-2 rounded border border-rose-500/20">{quickProvError}</div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{language === "es" ? "Nombre Comercial" : "Business Name"}</label>
                  <input required type="text" value={quickProvNombre} onChange={(e) => setQuickProvNombre(e.target.value)} className="w-full px-3 py-2 rounded-xl text-xs glass-input" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{language === "es" ? "RIF / Cédula" : "Tax ID / ID"} {quickProvRequiereRif && "*"}</label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={quickProvRequiereRif} 
                        onChange={e => setQuickProvRequiereRif(e.target.checked)}
                        className="w-3 h-3 accent-indigo-500 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500">{language === "es" ? "Requerir" : "Require"}</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    required={quickProvRequiereRif}
                    placeholder={quickProvRequiereRif ? "Ej. J-12345678-9" : (language === "es" ? "No aplica" : "N/A")}
                    value={quickProvRif}
                    onChange={(e) => setQuickProvRif(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                    disabled={!quickProvRequiereRif}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{language === "es" ? "Email" : "Email"}</label>
                    <input type="email" value={quickProvEmail} onChange={(e) => setQuickProvEmail(e.target.value)} className="w-full px-3 py-2 rounded-xl text-xs glass-input" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{language === "es" ? "Teléfono" : "Phone"}</label>
                    <input type="tel" value={quickProvTelefono} onChange={(e) => setQuickProvTelefono(e.target.value)} className="w-full px-3 py-2 rounded-xl text-xs glass-input" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{language === "es" ? "Dirección" : "Address"}</label>
                  <textarea value={quickProvDireccion} onChange={(e) => setQuickProvDireccion(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-xl text-xs glass-input resize-none" />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" disabled={quickProvSubmitting} className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex justify-center items-center gap-2">
                  {quickProvSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {language === "es" ? "Guardar y Asignar" : "Save & Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Importar Presupuesto */}
      {showImportModal && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                {language === "es" ? "Importar Presupuesto Aprobado" : "Import Approved Budget"}
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-[60vh] flex flex-col overflow-hidden">
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder={language === "es" ? "Buscar por código o cliente..." : "Search by code or customer..."}
                  value={importSearchQuery}
                  onChange={(e) => setImportSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-200"
                />
              </div>
              <div className="overflow-y-auto flex-1 pr-1 space-y-2">
              {(() => {
                const filtered = cotizacionesAprobadas.filter(cot => {
                  const cli = clientes.find(c => c.id === cot.clienteId);
                  const q = importSearchQuery.toLowerCase();
                  return (cot.id?.toLowerCase().includes(q) || (cli?.nombre || "").toLowerCase().includes(q));
                });
                
                if (filtered.length === 0) {
                  return (
                    <div className="text-center text-slate-400 py-8 text-xs">
                      {language === "es" ? "No se encontraron presupuestos aprobados." : "No approved budgets found."}
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {filtered.map(cot => {
                      const cli = clientes.find(c => c.id === cot.clienteId);
                    return (
                      <div key={cot.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-800/60 transition-colors">
                        <div>
                          <div className="font-bold text-sm text-slate-200">{cot.id}</div>
                          <div className="text-xs text-slate-400">{cli?.nombre || "Cliente Desconocido"} • ${cot.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                        </div>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setSelectedClienteId(cot.clienteId);
                            if (cot.responsableId) setSelectedResponsableId(cot.responsableId);
                            setFormItems(cot.items.map(i => ({
                              sku: i.sku,
                              skuProveedor: i.skuProveedor || "",
                              descripcion: i.descripcion || "",
                              detalles: i.detalles || "",
                              cantidadPedida: i.cantidad,
                              precioUnitario: i.precioUnitario,
                              proveedores: []
                            })));
                            setFecha(new Date().toISOString().split("T")[0]);
                            setShowImportModal(false);
                            setModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white"
                        >
                          {language === "es" ? "Importar" : "Import"}
                        </button>
                      </div>
                    );
                    })}
                  </div>
                );
              })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vista de Impresión */}
      {printingOrden && empresa && (
        <PrintOrdenCliente
          orden={printingOrden}
          empresa={empresa}
          onClose={() => setPrintingOrden(null)}
          language={language}
          clientes={clientes}
        />
      )}
    </div>
  );
}

export default function OrdenesClientePage() {
  return (
    <Suspense fallback={<div className="p-8 text-white">Cargando módulo de órdenes...</div>}>
      <OrdenesClienteContent />
    </Suspense>
  );
}
