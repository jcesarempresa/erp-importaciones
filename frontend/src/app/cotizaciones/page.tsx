"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  FileSpreadsheet, 
  FileText,
  Plus, 
  Check, 
  Loader2, 
  X, 
  AlertCircle,
  Calendar,
  Calculator,
  User,
  Trash2,
  Building2,
  ShieldAlert,
  UserCheck,
  Edit,
  Ban,
  Printer,
  ShoppingCart,
  RotateCcw,
  Upload,
  Mail,
  Phone,
  MapPin,
  List,
  Search
} from "lucide-react";
import { 
  obtenerCotizaciones, 
  crearCotizacion, 
  aprobarCotizacion, 
  editarCotizacion,
  anularCotizacion,
  revertirCotizacion,
  eliminarCotizacion,
  obtenerClientes, 
  crearCliente, 
  obtenerResponsables, 
  crearResponsable,
  obtenerHistoricoProductos,
  guardarProductosEnHistorico,
  obtenerEmpresa,
  EmpresaConfig
} from "@/lib/api/importaciones";
import { Cotizacion, Cliente, Responsable, ItemCotizacion } from "@/types";
import ItemsPreviewModal from "@/components/ItemsPreviewModal";
import ContactoSearchModal from "@/components/ContactoSearchModal";
import { useTranslation } from "@/context/LanguageContext";
import ProductoAutocomplete, { ProductoHistorico } from "@/components/ProductoAutocomplete";
import PrintCotizacion from "@/components/PrintCotizacion";

export default function CotizacionesPage() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingItems, setViewingItems] = useState<ItemCotizacion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Print & empresa ──────────────────────────────────────────────────────
  const [printTarget, setPrintTarget] = useState<Cotizacion | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaConfig>({ nombre: "", rif: "", logoUrl: "", direccion: "", telefono: "", email: "" });

  // Estados para Modal de Nueva Cotización
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [selectedResponsableId, setSelectedResponsableId] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0]);
  const [formItems, setFormItems] = useState<Array<{ pos?: string; sku: string; skuProveedor?: string; descripcion: string; detalles: string; modelo: string; unidad?: string; plazo?: string; fechaEntrega?: string; cantidad: number; precioUnitario: number; showDetalles?: boolean }>>([
    { pos: "", sku: "", skuProveedor: "", descripcion: "", detalles: "", modelo: "", unidad: "", plazo: "", fechaEntrega: "", cantidad: 1, precioUnitario: 0 }
  ]);

  // Metadatos para PDF
  const [billToDireccion, setBillToDireccion] = useState("");
  const [shipToDireccion, setShipToDireccion] = useState("");
  const [customerNo, setCustomerNo] = useState("");
  const [peticionOferta, setPeticionOferta] = useState("");
  const [offerValid, setOfferValid] = useState("15 Days");
  const [freightTerm, setFreightTerm] = useState("AIR");
  const [proformaDateDue, setProformaDateDue] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [originCountry, setOriginCountry] = useState("United States of America");
  const [shippedFrom, setShippedFrom] = useState("Miami");
  const [portOfDestination, setPortOfDestination] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState<string>("");
  const [bancoSeleccionado, setBancoSeleccionado] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [historicoProductos, setHistoricoProductos] = useState<ProductoHistorico[]>([]);

  // Cargos variables
  const [flete, setFlete] = useState<number>(0);
  const [arancel, setArancel] = useState<number>(0);
  const [otrosGastos, setOtrosGastos] = useState<number>(0);

  // Estados para Registro Rápido de Cliente
  const [showQuickClientForm, setShowQuickClientForm] = useState(false);
  const [quickCliEditingId, setQuickCliEditingId] = useState<string | null>(null);
  const [quickCliNombre, setQuickCliNombre] = useState("");
  const [quickCliRif, setQuickCliRif] = useState("");
  const [quickCliEmail, setQuickCliEmail] = useState("");
  const [quickCliTelefono, setQuickCliTelefono] = useState("");
  const [quickCliDireccion, setQuickCliDireccion] = useState("");
  const [quickCliDireccionDespacho, setQuickCliDireccionDespacho] = useState("");
  const [quickCliRequiereRif, setQuickCliRequiereRif] = useState(true);
  const [quickCliSubmitting, setQuickCliSubmitting] = useState(false);
  const [quickCliError, setQuickCliError] = useState<string | null>(null);

  // Estados para Registro Rápido de Responsable
  const [showQuickResponsableForm, setShowQuickResponsableForm] = useState(false);
  const [quickRespNombre, setQuickRespNombre] = useState("");
  const [quickRespRol, setQuickRespRol] = useState("Operador");
  const [quickRespEmail, setQuickRespEmail] = useState("");
  const [quickRespSubmitting, setQuickRespSubmitting] = useState(false);
  const [quickRespError, setQuickRespError] = useState<string | null>(null);

  // Estados para extracción de PDF (IA)
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Estados para búsqueda de precios por IA (Gemini Grounding)
  const [aiSearchModalOpen, setAiSearchModalOpen] = useState(false);
  const [aiSearchIndex, setAiSearchIndex] = useState<number | null>(null);
  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [aiSearchResult, setAiSearchResult] = useState<{
    descripcion: string;
    detalles: string;
    precioEstimado: number;
    fuentes?: Array<{ sitio: string; precio: string; url: string }>;
  } | null>(null);
  const [aiSearchError, setAiSearchError] = useState<string | null>(null);

  const handleOpenSearchModal = (index: number) => {
    setAiSearchIndex(index);
    setAiSearchQuery(formItems[index].descripcion || "");
    setAiSearchResult(null);
    setAiSearchError(null);
    setAiSearchModalOpen(true);
  };

  const handleAISearch = async () => {
    if (!aiSearchQuery.trim()) return;
    setAiSearchLoading(true);
    setAiSearchError(null);
    setAiSearchResult(null);
    try {
      const res = await fetch("/api/search-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiSearchQuery }),
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setAiSearchResult(data);
    } catch (err: any) {
      setAiSearchError(err.message || "Error al realizar la investigación con IA.");
    } finally {
      setAiSearchLoading(false);
    }
  };

  const handleApplyAISearchResult = () => {
    if (aiSearchIndex === null || !aiSearchResult) return;
    const updated = [...formItems];
    updated[aiSearchIndex].descripcion = aiSearchResult.descripcion;
    updated[aiSearchIndex].detalles = aiSearchResult.detalles;
    updated[aiSearchIndex].precioUnitario = aiSearchResult.precioEstimado || 0;
    // Auto show details if details text was found
    if (aiSearchResult.detalles) {
      updated[aiSearchIndex].showDetalles = true;
    }
    setFormItems(updated);
    setAiSearchModalOpen(false);
  };

  async function loadData() {
    setLoading(true);
    try {
      const [cots, clis, resps] = await Promise.all([
        obtenerCotizaciones(),
        obtenerClientes(),
        obtenerResponsables()
      ]);
      setCotizaciones(cots);
      setClientes(clis);
      setResponsables(resps);
      
      setSelectedClienteId("");
      if (resps.length > 0) {
        setSelectedResponsableId(resps[0].id || "");
      }
    } catch (err: any) {
      setError(err.message || (language === "es" ? "Error al cargar datos." : "Error loading data."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    obtenerHistoricoProductos().then(setHistoricoProductos).catch(() => {});
    obtenerEmpresa().then(setEmpresa).catch(() => {});
  }, []);

  // Print handler
  const handlePrint = (cot: Cotizacion) => {
    setPrintTarget(cot);
  };

  // Al abrir el modal, sincronizar selectedCliente con selectedClienteId
  useEffect(() => {
    if (modalOpen && selectedClienteId && !selectedCliente) {
      const c = clientes.find((x) => x.id === selectedClienteId);
      if (c) setSelectedCliente(c as Cliente);
    }
  }, [modalOpen]);

  const handleAddFormItem = () => {
    setFormItems([...formItems, { sku: "", skuProveedor: "", descripcion: "", detalles: "", modelo: "", cantidad: 1, precioUnitario: 0 }]);
  };

  const handleRemoveFormItem = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const handleFormItemChange = (index: number, field: string, value: any) => {
    const updated = [...formItems];
    (updated[index] as any)[field] = value;
    setFormItems(updated);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Límite de 3.5MB para evitar 413 Payload Too Large en Vercel o timeouts
    if (file.size > 3.5 * 1024 * 1024) {
      setExtractError('El archivo es demasiado grande (máx 3.5MB). Intente comprimir el documento o usar una imagen de menor resolución.');
      return;
    }

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

          const { items, entidad, entidadRif, entidadDireccion, entidadEmail, entidadTelefono, observaciones: obs, numeroDocumento } = await response.json();
          if (numeroDocumento) setCustomerNo(numeroDocumento);
          if (obs) setObservaciones(obs);
          if (items && Array.isArray(items)) {
            // Map the API structure to the form items structure
            const newItems = items.map(item => ({
              pos: item.pos || "",
              sku: item.sku || "",
              skuProveedor: item.skuProveedor || "",
              descripcion: item.descripcion || "",
              detalles: item.detalles || "",
              showDetalles: !!item.detalles,
              modelo: "", // IA no extrae modelo, dejamos vacío o usamos otra logica
              unidad: item.unidad || "",
              plazo: item.plazo || "",
              fechaEntrega: item.fechaEntrega || "",
              cantidad: item.cantidadPedida || 1,
              precioUnitario: item.precioUnitario || 0
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
                setSelectedCliente(matching as Cliente);
              } else {
                try {
                  const nuevo = await crearCliente({
                    nombre: entidad,
                    rif: entidadRif || "Por actualizar",
                    email: entidadEmail || "Por actualizar",
                    telefono: entidadTelefono || "Por actualizar",
                    direccion: entidadDireccion || "Por actualizar"
                  });
                  setClientes(prev => [...prev, nuevo]);
                  setSelectedClienteId(nuevo.id || "");
                  setSelectedCliente(nuevo as Cliente);
                } catch(e) {
                  console.error("Auto-create client error", e);
                }
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

  // Cotizaciones: sin IVA — solo dólares
  const subtotal = formItems.reduce((acc, curr) => acc + ((curr.cantidad || 0) * (curr.precioUnitario || 0)), 0);
  const total = subtotal + (flete || 0) + (arancel || 0) + (otrosGastos || 0);

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

    const validItems = formItems.filter(i => i.sku.trim() !== "" && i.cantidad > 0 && i.precioUnitario >= 0);
    if (validItems.length === 0) {
      setFormError(language === "es" ? "Debe ingresar al menos un CÓDIGO válido." : "You must enter at least one valid CODE.");
      setSubmitting(false);
      return;
    }

    try {
      const clienteSeleccionado = selectedCliente ?? clientes.find((c) => c.id === selectedClienteId);
      const meta: Partial<Cotizacion> = {
        billToDireccion, shipToDireccion, customerNo, peticionOferta,
        offerValid, freightTerm, proformaDateDue, deliveryTerms,
        originCountry, shippedFrom, portOfDestination,
        observaciones,
        bancoSeleccionado
      };

      if (editingId) {
        await editarCotizacion(
          editingId,
          clienteSeleccionado!.id!, 
          clienteSeleccionado!.nombre, 
          validItems.map(i => ({ sku: i.sku, skuProveedor: i.skuProveedor || "", descripcion: i.descripcion || "", detalles: i.detalles || "", modelo: i.modelo || "", cantidad: i.cantidad, precioUnitario: i.precioUnitario })), 
          new Date(fecha).toISOString(),
          resp.id,
          resp.nombre,
          flete,
          arancel,
          otrosGastos,
          meta
        );
      } else {
        await crearCotizacion(
          clienteSeleccionado!.id!, 
          clienteSeleccionado!.nombre, 
          validItems, 
          new Date(fecha).toISOString(),
          resp.id,
          resp.nombre,
          flete,
          arancel,
          otrosGastos,
          meta
        );
      }
      // Guardar historial de productos
      guardarProductosEnHistorico(validItems).then((res) => {
        obtenerHistoricoProductos().then(setHistoricoProductos).catch(() => {});
      }).catch(() => {});
      setModalOpen(false);
      setEditingId(null);
      setSelectedCliente(null);
      setFormItems([{ sku: "", skuProveedor: "", descripcion: "", detalles: "", modelo: "", cantidad: 1, precioUnitario: 0 }]);
      setFlete(0);
      setArancel(0);
      setOtrosGastos(0);
      
      // Reset meta
      setBillToDireccion("");
      setShipToDireccion("");
      setCustomerNo("");
      setPeticionOferta("");
      setOfferValid("15 Days");
      setFreightTerm("AIR");
      setProformaDateDue("");
      setDeliveryTerms("");
      setOriginCountry("United States of America");
      setShippedFrom("Miami");
      setPortOfDestination("");
      
      await loadData();
    } catch (err: any) {
      setFormError(err.message || (language === "es" ? "Error al registrar cotización." : "Error registering quotation."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateQuickCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quickCliRequiereRif && !quickCliRif.trim()) {
      setQuickCliError(language === "es" ? "El RIF/Cédula es requerido." : "RIF/ID is required.");
      return;
    }
    setQuickCliSubmitting(true);
    setQuickCliError(null);
    const finalRif = quickCliRequiereRif ? quickCliRif : "";
    try {
      const nuevo = await crearCliente({
        nombre: quickCliNombre,
        rif: finalRif,
        email: quickCliEmail,
        telefono: quickCliTelefono,
        direccion: quickCliDireccion,
        direccionDespacho: quickCliDireccionDespacho
      });
      const clis = await obtenerClientes();
      setClientes(clis);
      setSelectedClienteId(nuevo.id || "");
      setBillToDireccion(nuevo.direccion || "");
      setShipToDireccion(nuevo.direccionDespacho || nuevo.direccion || "");
      setShowQuickClientForm(false);
      // Resetear campos
      setQuickCliNombre("");
      setQuickCliRif("");
      setQuickCliRequiereRif(true);
      setQuickCliEmail("");
      setQuickCliTelefono("");
      setQuickCliDireccion("");
      setQuickCliDireccionDespacho("");
    } catch (err: any) {
      setQuickCliError(err.message || (language === "es" ? "Error al registrar el cliente." : "Error registering customer."));
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

  const handleAprobar = async (id: string) => {
    if (!confirm(language === "es" 
      ? "¿Está seguro de aprobar esta cotización? Se generará una orden de cliente automáticamente."
      : "Are you sure you want to approve this quotation? A customer order will be automatically generated.")) return;
    try {
      await aprobarCotizacion(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || (language === "es" ? "Error al aprobar cotización." : "Error approving quotation."));
    }
  };

  const handleAnular = async (id: string) => {
    if (!confirm(language === "es"
      ? "¿Está seguro de anular esta cotización? Esta acción no se puede deshacer."
      : "Are you sure you want to void this quotation? This action cannot be undone.")) return;
    try {
      await anularCotizacion(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || (language === "es" ? "Error al anular cotización." : "Error voiding quotation."));
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm(language === "es"
      ? "¿Está seguro de ELIMINAR permanentemente esta cotización? Esta acción no se puede deshacer."
      : "Are you sure you want to PERMANENTLY DELETE this quotation? This action cannot be undone.")) return;
    try {
      await eliminarCotizacion(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || (language === "es" ? "Error al eliminar." : "Error deleting."));
    }
  };

  const handleRevertir = async (id: string) => {
    if (!confirm(language === "es" 
      ? "¿Está seguro de revertir esta cotización a borrador?" 
      : "Are you sure you want to revert this quotation to draft?")) return;
    try {
      await revertirCotizacion(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || (language === "es" ? "Error al revertir cotización." : "Error reverting quotation."));
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
    setSelectedClienteId("");
    setSelectedResponsableId("");
    setFecha(new Date().toISOString().split("T")[0]);
    setFormItems([{ sku: "", skuProveedor: "", descripcion: "", detalles: "", modelo: "", cantidad: 1, precioUnitario: 0 }]);
    setBillToDireccion("");
    setShipToDireccion("");
    setCustomerNo("");
    setPeticionOferta("");
    setOfferValid("15 Days");
    setFreightTerm("AIR");
    setProformaDateDue("");
    setDeliveryTerms("");
    setOriginCountry("United States of America");
    setShippedFrom("Miami");
    setPortOfDestination("");
    setSubmitting(false);
    setFormError(null);
    setObservaciones("");
    setBancoSeleccionado("");
    setEditingId(null);
    setSelectedCliente(null);
    setFlete(0);
    setArancel(0);
    setOtrosGastos(0);
    setShowQuickClientForm(false);
    setQuickCliNombre("");
    setQuickCliRif("");
    setQuickCliEmail("");
    setQuickCliTelefono("");
    setQuickCliDireccion("");
    setQuickCliDireccionDespacho("");
    setQuickCliRequiereRif(true);
    setQuickCliSubmitting(false);
    setQuickCliError(null);
    setShowQuickResponsableForm(false);
    setQuickRespNombre("");
    setQuickRespRol("Operador");
    setQuickRespEmail("");
    setQuickRespSubmitting(false);
    setQuickRespError(null);
    setIsExtractingPdf(false);
    setExtractError(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <FileSpreadsheet className="h-6 w-6 text-indigo-400" />
            <h2 className="text-2xl font-bold text-slate-100 tracking-tight">{language === "es" ? "Cotizaciones y Presupuestos" : "Quotations and Budgets"}</h2>
          </div>
          <p className="text-xs text-slate-400">
            {language === "es" 
              ? "Gestiona los presupuestos emitidos, sus responsables de carga y aprueba pedidos."
              : "Manage issued budgets, cargo supervisors, and approve orders."}
          </p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setSelectedClienteId("");
            setSelectedCliente(null);
            if (responsables.length > 0) setSelectedResponsableId(responsables[0].id || "");
            setFecha(new Date().toISOString().split("T")[0]);
            setFormItems([{ sku: "", skuProveedor: "", descripcion: "", detalles: "", modelo: "", cantidad: 1, precioUnitario: 0 }]);
            setFlete(0);
            setArancel(0);
            setOtrosGastos(0);
            setModalOpen(true);
            setShowQuickClientForm(false);
            setShowQuickResponsableForm(false);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-500/20 active:scale-95 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> {language === "es" ? "Nueva Cotización" : "New Quotation"}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-955/40 border border-rose-800/40 rounded-xl text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Listado de Cotizaciones */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-slate-400 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <span className="text-xs">{language === "es" ? "Cargando cotizaciones..." : "Loading quotations..."}</span>
          </div>
        ) : cotizaciones.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-center p-6">
            <FileSpreadsheet className="h-10 w-10 text-slate-600 mb-2" />
            <p className="text-xs">{language === "es" ? "No hay cotizaciones registradas. Crea una para comenzar." : "No quotations registered. Create one to start."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 bg-slate-900/20 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4">{language === "es" ? "Código" : "Code"}</th>
                  <th className="p-4">{language === "es" ? "Cliente" : "Customer"}</th>
                  <th className="p-4">{language === "es" ? "Responsable" : "Cargo Supervisor"}</th>
                  <th className="p-4">{language === "es" ? "Fecha" : "Date"}</th>
                  <th className="p-4">{language === "es" ? "Items" : "Items"}</th>
                  <th className="p-4">{language === "es" ? "Total" : "Total"}</th>
                  <th className="p-4">{language === "es" ? "Estado" : "Status"}</th>
                  <th className="p-4 text-right">{language === "es" ? "Acciones" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {cotizaciones.map((cot) => (
                  <tr key={cot.id} className="hover:bg-white/2 transition-colors">
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 font-mono font-bold text-[11px] border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                        {cot.id}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-200">{cot.clienteNombre}</td>
                    <td className="p-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">{language === "es" ? "Cargo" : "Role"}</span>
                        <span className="font-medium">{cot.responsableNombre || (language === "es" ? "No asignado" : "Unassigned")}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400">{new Date(cot.fecha).toLocaleDateString()}</td>
                    <td className="p-4 text-slate-300">
                      <button
                        onClick={() => setViewingItems(cot.items)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-colors flex items-center gap-2 text-xs font-medium"
                        title={language === "es" ? "Ver Detalles" : "View Details"}
                      >
                        <List className="h-3 w-3" />
                        {cot.items.length} {language === "es" ? "ítems" : "items"}
                      </button>
                    </td>
                    <td className="p-4 font-mono font-bold text-indigo-400">
                      ${cot.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      {((cot.flete || 0) > 0 || (cot.arancel || 0) > 0 || (cot.otrosGastos || 0) > 0) && (
                        <div className="text-[9px] text-slate-500 font-normal">
                          (Subt: ${cot.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          { (cot.flete || 0) > 0 && ` + Flete` }
                          { (cot.arancel || 0) > 0 && ` + Aran` }
                          )
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        cot.estado === "aprobado" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        cot.estado === "borrador" ? "bg-slate-500/10 text-slate-400 border border-slate-500/20" :
                        cot.estado === "anulado" ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse" :
                        "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {cot.estado === "aprobado" ? (language === "es" ? "APROBADO" : "APPROVED") :
                         cot.estado === "borrador" ? (language === "es" ? "BORRADOR" : "DRAFT") :
                         cot.estado === "anulado" ? (language === "es" ? "ANULADO" : "VOIDED") :
                         cot.estado.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end items-center">
                        {/* Print Button (Always available) */}
                        <button
                          onClick={() => handlePrint(cot)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                          title={language === "es" ? "Imprimir Presupuesto" : "Print Budget"}
                        >
                          <Printer className="h-3 w-3" /> {language === "es" ? "Imprimir" : "Print"}
                        </button>
                        
                        {/* Load to Order (Only when approved) */}
                        {cot.estado === "aprobado" && (
                          <>

                            <button
                              onClick={() => handleRevertir(cot.id!)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1 border border-amber-500/50"
                              title={language === "es" ? "Revertir Aprobación" : "Revert Approval"}
                            >
                              <RotateCcw className="h-3 w-3" />
                            </button>
                          </>
                        )}

                        {cot.estado !== "aprobado" && cot.estado !== "anulado" && (
                          <>
                            <button
                              onClick={() => handleAprobar(cot.id!)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                              title={language === "es" ? "Aprobar Cotización" : "Approve Quotation"}
                            >
                              <Check className="h-3 w-3" /> {language === "es" ? "Aprobar" : "Approve"}
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(cot.id!);
                                setSelectedClienteId(cot.clienteId);
                                setSelectedResponsableId(cot.responsableId || "");
                                setFecha(cot.fecha.split("T")[0]);
                                setFormItems(cot.items.map(item => ({
                                  sku: item.sku,
                                  skuProveedor: item.skuProveedor || "",
                                  descripcion: item.descripcion || "",
                                  detalles: item.detalles || "",
                                  modelo: item.modelo || "",
                                  cantidad: item.cantidad,
                                  precioUnitario: item.precioUnitario
                                })));
                                setFlete(cot.flete || 0);
                                setArancel(cot.arancel || 0);
      setOtrosGastos(cot.otrosGastos || 0);
      setObservaciones(cot.observaciones || "");
      setBancoSeleccionado(cot.bancoSeleccionado || "");
                                
                                setBillToDireccion(cot.billToDireccion || "");
                                setShipToDireccion(cot.shipToDireccion || "");
                                setCustomerNo(cot.customerNo || "");
                                setPeticionOferta(cot.peticionOferta || "");
                                setOfferValid(cot.offerValid || "15 Days");
                                setFreightTerm(cot.freightTerm || "AIR");
                                setProformaDateDue(cot.proformaDateDue || "");
                                setDeliveryTerms(cot.deliveryTerms || "");
                                setOriginCountry(cot.originCountry || "United States of America");
                                setShippedFrom(cot.shippedFrom || "Miami");
                                setPortOfDestination(cot.portOfDestination || "");
                                
                                setModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                              title={language === "es" ? "Editar Cotización" : "Edit Quotation"}
                            >
                              <Edit className="h-3 w-3" /> {language === "es" ? "Editar" : "Edit"}
                            </button>
                            <button
                              onClick={() => handleAnular(cot.id!)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                              title={language === "es" ? "Anular Cotización" : "Void Quotation"}
                            >
                              <Ban className="h-3 w-3" /> {language === "es" ? "Anular" : "Void"}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleEliminar(cot.id!)}
                          className="px-2.5 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1 border border-red-500/20"
                          title={language === "es" ? "Eliminar permanentemente" : "Delete permanently"}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal / Formulario Nueva Cotización (Estilo Facturación) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-7xl max-h-[95vh] overflow-y-auto rounded-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200 border border-slate-800/80 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-indigo-400" /> 
                  {editingId 
                    ? (language === "es" ? `Editar Cotización (Ref: ${editingId.slice(-6).toUpperCase()})` : `Edit Quotation (Ref: ${editingId.slice(-6).toUpperCase()})`)
                    : (language === "es" ? "Crear Nueva Cotización (Presupuesto)" : "Create New Quotation (Budget)")}
                </h3>
                {!editingId && (
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20" title="Última cotización registrada">
                    Previa: {cotizaciones.length > 0 ? (cotizaciones[0].peticionOferta || cotizaciones[0].id?.slice(-6).toUpperCase()) : "Ninguna"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <label className={`relative overflow-hidden group cursor-pointer px-4 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-lg flex items-center gap-2 ${isExtractingPdf ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 hover:shadow-emerald-500/25'}`}>
                  {isExtractingPdf ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {language === "es" ? "Importar Doc/Img (IA)" : "Import Doc/Img (AI)"}
                  <input 
                    type="file" 
                    accept="application/pdf,image/png,image/jpeg,image/webp"
                    className="hidden" 
                    onChange={handlePdfUpload}
                    disabled={isExtractingPdf}
                  />
                </label>

                <button 
                  onClick={handleCloseModal}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
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
                      placeholder="Ej. Distribuidora Central"
                      value={quickCliNombre}
                      onChange={e => setQuickCliNombre(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                      disabled={quickCliSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">{language === "es" ? "RIF / Cédula" : "Tax ID / ID Card"} {quickCliRequiereRif && "*"}</label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={quickCliRequiereRif} 
                          onChange={e => setQuickCliRequiereRif(e.target.checked)}
                          className="w-3 h-3 accent-indigo-500 cursor-pointer"
                        />
                        <span className="text-[10px] text-slate-500">{language === "es" ? "Requerir" : "Require"}</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      required={quickCliRequiereRif}
                      placeholder={quickCliRequiereRif ? "Ej. J-40812345-9" : (language === "es" ? "No aplica" : "N/A")}
                      value={quickCliRif}
                      onChange={e => setQuickCliRif(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs glass-input ${!quickCliRequiereRif ? 'opacity-50 cursor-not-allowed bg-slate-900/50' : ''}`}
                      disabled={quickCliSubmitting || !quickCliRequiereRif}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{language === "es" ? "Dirección Física" : "Physical Address"}</label>
                    <input
                       type="text"
                       required
                       placeholder="Ej. Zona Industrial I..."
                       value={quickCliDireccion}
                       onChange={e => setQuickCliDireccion(e.target.value)}
                       className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                       disabled={quickCliSubmitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{language === "es" ? "Dirección de Despacho" : "Shipping Address"}</label>
                    <input
                       type="text"
                       placeholder="Opcional. Ej. Almacén 2..."
                       value={quickCliDireccionDespacho}
                       onChange={e => setQuickCliDireccionDespacho(e.target.value)}
                       className="w-full px-3 py-2 rounded-xl text-xs glass-input"
                       disabled={quickCliSubmitting}
                    />
                  </div>
                </div>

                {quickCliError && (
                  <div className="p-3 bg-rose-955/40 border border-rose-905/40 rounded-xl text-rose-300 text-[11px] flex items-center gap-2">
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
                    <label className="text-[10px] font-bold text-slate-400 uppercase">{language === "es" ? "Cargo / Rol" : "Position / Role"}</label>
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
                <h4 className="text-slate-200 font-bold">{language === "es" ? "No hay clientes registrados" : "No registered customers"}</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {language === "es" 
                    ? "Debes dar de alta al menos un cliente comercial antes de poder elaborar una cotización."
                    : "You must register at least one commercial customer before you can create a quotation."}
                </p>
                <button
                  type="button"
                  onClick={() => setShowQuickClientForm(true)}
                  className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer active:scale-95 transition-all"
                >
                  {language === "es" ? "Registrar Cliente Rápido" : "Register Customer Quick"}
                </button>
              </div>
            ) : responsables.length === 0 ? (
              <div className="p-8 text-center space-y-4">
                <ShieldAlert className="h-12 w-12 text-amber-400 mx-auto" />
                <h4 className="text-slate-200 font-bold">{language === "es" ? "No hay Responsables de Carga" : "No Cargo Supervisors"}</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {language === "es"
                    ? "Para tener trazabilidad sobre quién realiza cargas y modificaciones de documentos, debes registrar al menos un Responsable."
                    : "To have traceability on who performs document loading and modifications, you must register at least one Cargo Supervisor."}
                </p>
                <button
                  type="button"
                  onClick={() => setShowQuickResponsableForm(true)}
                  className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer active:scale-95 transition-all"
                >
                  {language === "es" ? "Registrar Responsable Rápido" : "Register Cargo Supervisor Quick"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-6">
                
                {/* Cabecera de la Factura/Cotización */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800/50">
                  <div className="md:col-span-12 space-y-1 min-w-0">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="h-3 w-3" /> {language === "es" ? "Cliente Comercial" : "Commercial Customer"}
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <ContactoSearchModal
                          items={clientes}
                          onSelect={(cli) => { 
                            setSelectedCliente(cli); 
                            setSelectedClienteId(cli.id!);
                            const full = clientes.find(c => c.id === cli.id);
                            if (full) {
                              setBillToDireccion(full.direccion || "");
                              setShipToDireccion(full.direccionDespacho || full.direccion || "");
                            }
                          }}
                          selected={selectedCliente}
                          tipo="cliente"
                          onCreateNew={() => setShowQuickClientForm(true)}
                          onEditCurrent={() => {
                            if (selectedCliente) {
                              setQuickCliEditingId(selectedCliente.id || null);
                              setQuickCliNombre(selectedCliente.nombre);
                              setQuickCliRif(selectedCliente.rif || "");
                              setQuickCliRequiereRif(!!selectedCliente.rif);
                              setQuickCliEmail(selectedCliente.email || "");
                              setQuickCliTelefono(selectedCliente.telefono || "");
                              setQuickCliDireccion(selectedCliente.direccion || "");
                              setQuickCliDireccionDespacho((selectedCliente as Cliente).direccionDespacho || "");
                              setShowQuickClientForm(true);
                            }
                          }}
                        />
                        {selectedCliente && (
                          <div className="mt-2 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1.5">
                            {selectedCliente.rif && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                <User className="h-3 w-3 text-slate-500 shrink-0" />
                                <span className="font-mono text-indigo-300">{selectedCliente.rif}</span>
                              </div>
                            )}
                            {selectedCliente.email && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                <Mail className="h-3 w-3 text-slate-500 shrink-0" />
                                <span className="truncate">{selectedCliente.email}</span>
                              </div>
                            )}
                            {selectedCliente.telefono && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                <Phone className="h-3 w-3 text-slate-500 shrink-0" />
                                <span className="truncate">{selectedCliente.telefono}</span>
                              </div>
                            )}
                            {selectedCliente.direccion && (
                              <div className="flex items-start gap-1.5 text-[11px] text-slate-400">
                                <MapPin className="h-3 w-3 text-slate-500 mt-0.5 shrink-0" />
                                <span className="truncate whitespace-normal leading-tight">{selectedCliente.direccion}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-5 space-y-1 min-w-0">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="h-3 w-3" /> {language === "es" ? "Responsable Carga" : "Responsible Agent"}
                    </label>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 min-w-0">
                        <select
                          value={selectedResponsableId}
                          onChange={(e) => setSelectedResponsableId(e.target.value)}
                          className="glass-input w-full px-3 py-2.5 rounded-xl text-sm truncate"
                        >
                        <option className="bg-slate-900 text-white"  value="">{language === "es" ? "-- Sin Responsable --" : "-- No Agent --"}</option>
                        {responsables.map((r) => (
                          <option className="bg-slate-900 text-white"  key={r.id} value={r.id}>{r.nombre} ({r.rol})</option>
                        ))}
                      </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowQuickResponsableForm(true)}
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-all shrink-0 text-sm font-bold"
                        title={language === "es" ? "Añadir Responsable" : "Add Agent"}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-4 space-y-1 min-w-0">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" /> {language === "es" ? "Fecha" : "Date"}
                    </label>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="glass-input w-full px-3 py-2 rounded-lg text-sm"
                      required
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="h-3 w-3" /> {language === "es" ? "Moneda" : "Currency"}
                    </label>
                    <input
                      type="text"
                      value="USD ($)"
                      disabled
                      className="glass-input w-full px-3 py-2 rounded-lg text-sm bg-slate-900/50 cursor-not-allowed opacity-70"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800/50">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === "es" ? "Validez de Oferta" : "Offer Validity"}</label>
                    <input type="text" value={offerValid} onChange={(e) => setOfferValid(e.target.value)} placeholder="15 Days" className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{language === "es" ? "Tiempo de Entrega" : "Delivery Terms"}</label>
                    <input type="text" value={deliveryTerms} onChange={(e) => setDeliveryTerms(e.target.value)} placeholder="Ej. 15-20 days" className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Origin Country</label>
                    <input type="text" value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} placeholder="USA" className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shipped From</label>
                    <input type="text" value={shippedFrom} onChange={(e) => setShippedFrom(e.target.value)} placeholder="Miami" className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Freight Term</label>
                    <input type="text" value={freightTerm} onChange={(e) => setFreightTerm(e.target.value)} placeholder="AIR" className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Port of Destination</label>
                    <input type="text" value={portOfDestination} onChange={(e) => setPortOfDestination(e.target.value)} placeholder="Miami" className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proforma Date Due</label>
                    <input type="text" value={proformaDateDue} onChange={(e) => setProformaDateDue(e.target.value)} className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Request for Quote (No.)</label>
                    <input type="text" value={peticionOferta} onChange={(e) => setPeticionOferta(e.target.value)} className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
                  </div>
                </div>

                {/* Líneas de Detalles */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <h4 className="text-xs font-semibold text-slate-300">{language === "es" ? "Ítems de Cotización" : "Quotation Items"}</h4>
                    <div className="flex items-center gap-4">
                      {/* PDF Upload Button moved to header */}
                      <button
                        type="button"
                        onClick={handleAddFormItem}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="h-3 w-3" /> {language === "es" ? "Añadir Ítem" : "Add Item"}
                      </button>
                    </div>
                  </div>
                  {extractError && (
                    <div className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                      {extractError}
                    </div>
                  )}
                  
                  <div className="hidden md:flex flex-wrap md:flex-nowrap items-center gap-1 px-2 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="w-full md:w-28 shrink-0 pl-2">{language === "es" ? "CÓDIGO" : "CODE"}</div>
                    <div className="w-full md:w-24 shrink-0 pl-1">{language === "es" ? "COD. PROV." : "VEND. CODE"}</div>
                    <div className="w-full md:w-10 shrink-0 text-center">POS</div>
                    <div className="w-full md:flex-1 pl-2">{language === "es" ? "Descripción" : "Desc."}</div>
                    <div className="w-full md:w-20 shrink-0 pl-2">{language === "es" ? "Modelo" : "Model"}</div>
                    <div className="w-full md:w-16 shrink-0 text-center">Unid.</div>
                    <div className="w-full md:w-16 shrink-0 text-center">Plazo</div>
                    <div className="w-full md:w-28 shrink-0 text-center">F. Entr.</div>
                    <div className="w-14 shrink-0 text-center">{language === "es" ? "Cant." : "Qty"}</div>
                    <div className="w-20 shrink-0 pr-2 text-right">{language === "es" ? "Precio" : "Price"}</div>
                    <div className="w-20 shrink-0 pr-2 text-right">Total</div>
                    <div className="w-8 shrink-0"></div>
                  </div>
                  <div className="space-y-2">
                    {formItems.map((item, index) => (
                      <div key={index}>
                      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-800/30 rounded-xl border border-slate-700/50">
                        <ProductoAutocomplete
                          value={item.sku}
                          onChange={(val) => handleFormItemChange(index, "sku", val.toUpperCase())}
                          onSelect={(prod) => {
                            handleFormItemChange(index, "sku", prod.sku);
                            handleFormItemChange(index, "descripcion", prod.descripcion);
                            if (prod.precioUnitario != null) {
                              handleFormItemChange(index, "precioUnitario", prod.precioUnitario);
                            }
                          }}
                          historico={historicoProductos}
                          campo="sku"
                          placeholder="CÓDIGO"
                          containerClassName="w-full md:w-28 shrink-0"
                          className="glass-input w-full px-2 py-2 rounded-lg text-sm font-mono"
                        />
                        <input
                          type="text"
                          placeholder={language === "es" ? "COD. PROV." : "VEND. CODE"}
                          value={item.skuProveedor || ""}
                          onChange={(e) => handleFormItemChange(index, "skuProveedor", e.target.value.toUpperCase())}
                          className="glass-input w-full md:w-24 shrink-0 px-2 py-2 rounded-lg text-sm font-mono"
                          title="SKU del Proveedor (Opcional)"
                        />
                        <input
                          type="text"
                          placeholder="POS"
                          value={item.pos || ""}
                          onChange={(e) => handleFormItemChange(index, "pos", e.target.value)}
                          className="glass-input w-full md:w-10 shrink-0 px-1 py-2 rounded-lg text-sm text-center font-mono"
                          title="Posición / Item No."
                        />
                        <ProductoAutocomplete
                          value={item.descripcion}
                          onChange={(val) => handleFormItemChange(index, "descripcion", val)}
                          onSelect={(prod) => {
                            handleFormItemChange(index, "sku", prod.sku);
                            handleFormItemChange(index, "descripcion", prod.descripcion);
                            if (prod.precioUnitario != null) {
                              handleFormItemChange(index, "precioUnitario", prod.precioUnitario);
                            }
                          }}
                          historico={historicoProductos}
                          campo="descripcion"
                          placeholder={language === "es" ? "Descripción del producto" : "Product description"}
                          containerClassName="w-full md:w-auto md:flex-1"
                          className="glass-input w-full px-2 py-2 rounded-lg text-sm"
                        />
                        <input
                          type="text"
                          placeholder={language === "es" ? "Modelo" : "Model"}
                          value={item.modelo || ""}
                          onChange={(e) => handleFormItemChange(index, "modelo", e.target.value)}
                          className="glass-input w-full md:w-20 shrink-0 px-2 py-2 rounded-lg text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Unid."
                          value={item.unidad || ""}
                          onChange={(e) => handleFormItemChange(index, "unidad", e.target.value)}
                          className="glass-input w-full md:w-16 shrink-0 px-1 py-2 rounded-lg text-sm text-center"
                        />

                        <input
                          type="text"
                          placeholder="Plazo"
                          value={item.plazo || ""}
                          onChange={(e) => handleFormItemChange(index, "plazo", e.target.value)}
                          className="glass-input w-full md:w-16 shrink-0 px-1 py-2 rounded-lg text-sm text-center"
                        />
                        <input
                          type="date"
                          placeholder="F. Entr."
                          value={item.fechaEntrega || ""}
                          onChange={(e) => handleFormItemChange(index, "fechaEntrega", e.target.value)}
                          className="glass-input w-full md:w-28 shrink-0 px-1 py-2 rounded-lg text-sm text-center"
                        />
                        <input
                          type="number"
                          placeholder={language === "es" ? "Cant." : "Qty"}
                          value={item.cantidad || ""}
                          onChange={(e) => handleFormItemChange(index, "cantidad", Number(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          className="glass-input w-14 shrink-0 px-1 py-2 rounded-lg text-sm text-center"
                          min="1"
                          required
                        />
                        <input
                          type="number"
                          placeholder={language === "es" ? "Precio U." : "Unit Price"}
                          value={item.precioUnitario !== undefined ? item.precioUnitario : ""}
                          onChange={(e) => handleFormItemChange(index, "precioUnitario", Number(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          className="glass-input w-20 shrink-0 px-2 py-2 rounded-lg text-sm text-right"
                          step="0.01"
                          min="0"
                          required
                        />
                        <div className="w-20 shrink-0 text-right px-1 font-mono text-xs text-slate-300 bg-slate-900/50 py-2 rounded-lg">
                          ${((item.cantidad || 0) * (item.precioUnitario || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...formItems];
                            updated[index].showDetalles = !updated[index].showDetalles;
                            setFormItems(updated);
                          }}
                          className={`p-2 rounded-lg transition-colors cursor-pointer shrink-0 ${item.showDetalles ? 'text-indigo-400 bg-indigo-500/20' : 'text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10'}`}
                          title={language === "es" ? "Añadir detalles/párrafo" : "Add details/paragraph"}
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenSearchModal(index)}
                          className="p-2 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer shrink-0"
                          title={language === "es" ? "Investigar con IA (Gemini)" : "Investigate with AI (Gemini)"}
                        >
                          <Search className="h-4 w-4" />
                        </button>
                        {formItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFormItem(index)}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {item.showDetalles && (
                        <div className="mt-2 w-full">
                          <textarea
                            placeholder={language === "es" ? "Especificaciones, detalles técnicos o información adicional tipo párrafo..." : "Specifications, technical details or additional paragraph info..."}
                            value={item.detalles || ""}
                            onChange={(e) => handleFormItemChange(index, "detalles", e.target.value)}
                            className="glass-input w-full px-3 py-2 rounded-lg text-xs min-h-[60px] resize-y"
                          />
                        </div>
                      )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Metadatos de Direcciones para el PDF */}
                <details className="group bg-slate-900/30 rounded-xl border border-slate-800/50 p-4">
                  <summary className="text-xs font-bold text-slate-300 cursor-pointer list-none flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-indigo-400" />
                      {language === "es" ? "Sobrescribir Direcciones en PDF" : "Override PDF Addresses"}
                    </span>
                    <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 mt-2 border-t border-slate-800/50">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Bill To (Address)</label>
                      <input type="text" value={billToDireccion} onChange={e => setBillToDireccion(e.target.value)} className="glass-input w-full px-3 py-2 rounded-lg text-xs" placeholder={selectedCliente?.direccion || "Use Client Default"} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Ship To (Address)</label>
                      <input type="text" value={shipToDireccion} onChange={e => setShipToDireccion(e.target.value)} className="glass-input w-full px-3 py-2 rounded-lg text-xs" placeholder={(selectedCliente as any)?.direccionDespacho || selectedCliente?.direccion || "Use Client Default"} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Customer No. (Opcional)</label>
                      <input type="text" value={customerNo} onChange={e => setCustomerNo(e.target.value)} className="glass-input w-full px-3 py-2 rounded-lg text-xs" placeholder="Ex: CUST-001" />
                    </div>
                  </div>
                </details>

                {/* Resumen y Totales */}
                <div className="flex flex-col md:flex-row justify-between gap-6 pt-4 border-t border-slate-800/60">
                  <div className="flex gap-4 w-full md:w-auto">
                    <div className="w-32">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        {language === "es" ? "Flete ($)" : "Freight ($)"}
                      </label>
                      <input
                        type="number"
                        value={flete || ""}
                        onChange={(e) => setFlete(Number(e.target.value))}
                        className="glass-input w-full px-3 py-2 rounded-lg text-sm text-right"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        {language === "es" ? "Arancel ($)" : "Duty ($)"}
                      </label>
                      <input
                        type="number"
                        value={arancel || ""}
                        onChange={(e) => setArancel(Number(e.target.value))}
                        className="glass-input w-full px-3 py-2 rounded-lg text-sm text-right"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        {language === "es" ? "Otros Gastos ($)" : "Other ($)"}
                      </label>
                      <input
                        type="number"
                        value={otrosGastos || ""}
                        onChange={(e) => setOtrosGastos(Number(e.target.value))}
                        className="glass-input w-full px-3 py-2 rounded-lg text-sm text-right"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-700/60 w-full md:w-80 space-y-2">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>{language === "es" ? "Subtotal de Ítems:" : "Items Subtotal:"}</span>
                      <span className="font-mono text-slate-300">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    {flete > 0 && (
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span>{language === "es" ? "Flete:" : "Freight:"}</span>
                        <span className="font-mono text-slate-300">${flete.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {arancel > 0 && (
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span>{language === "es" ? "Arancel:" : "Duty:"}</span>
                        <span className="font-mono text-slate-300">${arancel.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {otrosGastos > 0 && (
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span>{language === "es" ? "Otros Gastos:" : "Other:"}</span>
                        <span className="font-mono text-slate-300">${otrosGastos.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center font-bold text-sm text-indigo-400 pt-2 border-t border-slate-700/50">
                      <span>{language === "es" ? "Total General USD" : "Total USD"}:</span>
                      <span className="font-mono">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                
                {/* Observaciones y Cuentas Bancarias */}
                <div className="mt-8 border-t border-white/10 pt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {language === "es" ? "Cuenta Bancaria para Pago (Se muestra en PDF)" : "Payment Bank Account (Shown on PDF)"}
                      </label>
                      <select
                        value={bancoSeleccionado}
                        onChange={(e) => setBancoSeleccionado(e.target.value)}
                        className="glass-input w-full px-3 py-2.5 rounded-xl text-sm"
                      >
                        <option className="bg-slate-900 text-white" value="">
                          {language === "es" ? "-- No mostrar cuenta bancaria --" : "-- Do not show bank account --"}
                        </option>
                        {empresa.bancoNombre3 && (
                          <option className="bg-slate-900 text-white" value="cuenta3">{empresa.bancoNombre3}</option>
                        )}
                        {empresa.bancoNombre4 && (
                          <option className="bg-slate-900 text-white" value="cuenta4">{empresa.bancoNombre4}</option>
                        )}
                      </select>
                      {!empresa.bancoNombre3 && !empresa.bancoNombre4 && (
                        <p className="text-[10px] text-amber-400/80">
                          {language === "es" 
                            ? "⚠ No tienes cuentas bancarias internacionales configuradas. Configúralas en el menú Configuración > Mi Empresa." 
                            : "⚠ No international bank accounts configured. Set them up in Configuration > My Company."}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
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
                    {editingId 
                      ? (language === "es" ? "Actualizar Cotización" : "Update Quotation") 
                      : (language === "es" ? "Guardar Cotización" : "Save Quotation")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal de Búsqueda de Productos con IA (Gemini Grounding) */}
      {aiSearchModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setAiSearchModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>🔍</span> {language === "es" ? "Investigar Producto con IA" : "Investigate Product with AI"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {language === "es"
                  ? "Gemini buscará en internet en tiempo real para encontrar precios mayoristas, especificaciones y distribuidores."
                  : "Gemini will search the internet in real time to find wholesale prices, specs, and suppliers."}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {language === "es" ? "Término de Búsqueda / Producto" : "Search Term / Product"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiSearchQuery}
                    onChange={(e) => setAiSearchQuery(e.target.value)}
                    placeholder={language === "es" ? "Ej. iPhone 15 Pro Max 256GB precio mayorista" : "e.g. wholesale iPhone 15 Pro Max 256GB"}
                    className="glass-input flex-1 px-3 py-2 rounded-xl text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAISearch}
                    disabled={aiSearchLoading || !aiSearchQuery.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/30 text-white rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-500/10"
                  >
                    {aiSearchLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span>Buscar</span>
                    )}
                  </button>
                </div>
              </div>

              {aiSearchError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{aiSearchError}</span>
                </div>
              )}

              {aiSearchResult && (
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-300">{language === "es" ? "Resultados de la Investigación" : "Research Results"}</h4>
                    
                    <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase">{language === "es" ? "Descripción Sugerida" : "Suggested Description"}</div>
                        <input
                          type="text"
                          value={aiSearchResult.descripcion || ""}
                          onChange={(e) => setAiSearchResult({ ...aiSearchResult, descripcion: e.target.value })}
                          className="glass-input w-full px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 mt-1"
                        />
                      </div>

                      {(aiSearchResult.precioEstimado !== undefined) && (
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase">{language === "es" ? "Costo Unitario Sugerido ($ USD)" : "Suggested Unit Cost ($ USD)"}</div>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-2 text-emerald-400 font-bold text-sm">$</span>
                            <input
                              type="number"
                              value={aiSearchResult.precioEstimado}
                              onChange={(e) => setAiSearchResult({ ...aiSearchResult, precioEstimado: Number(e.target.value) })}
                              className="glass-input w-full pl-7 pr-3 py-2 rounded-xl text-sm font-extrabold text-emerald-450"
                              step="0.01"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase">{language === "es" ? "Especificaciones y Detalles" : "Specs and Details"}</div>
                        <textarea
                          value={aiSearchResult.detalles || ""}
                          onChange={(e) => setAiSearchResult({ ...aiSearchResult, detalles: e.target.value })}
                          className="glass-input w-full px-3 py-2 rounded-xl text-xs min-h-[100px] leading-relaxed mt-1"
                        />
                      </div>

                      {aiSearchResult.fuentes && aiSearchResult.fuentes.length > 0 && (
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">{language === "es" ? "Fuentes Encontradas" : "Found Sources"}</div>
                          <div className="space-y-1.5">
                            {aiSearchResult.fuentes.map((f, i) => (
                              <div key={i} className="flex justify-between items-center bg-slate-900/50 p-2 rounded-lg text-xs">
                                <div>
                                  <span className="font-semibold text-slate-300">{f.sitio}</span>
                                  {f.url && (
                                    <a
                                      href={f.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-400 hover:underline block text-[10px]"
                                    >
                                      Ver enlace
                                    </a>
                                  )}
                                </div>
                                <span className="font-mono text-emerald-400 font-bold">{f.precio}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setAiSearchModalOpen(false)}
                      className="px-4 py-2 border border-slate-800 hover:bg-white/5 rounded-xl text-slate-400 font-semibold text-xs transition-all cursor-pointer"
                    >
                      {language === "es" ? "Descartar" : "Discard"}
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyAISearchResult}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs transition-all cursor-pointer shadow-lg shadow-indigo-500/10 animate-pulse"
                    >
                      {language === "es" ? "Aplicar al Ítem" : "Apply to Item"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Overlay */}
      {printTarget && (
        <PrintCotizacion
          cotizacion={printTarget}
          empresa={empresa}
          language={language}
          clientes={clientes}
          onClose={() => setPrintTarget(null)}
        />
      )}
    {/* Items Preview Modal */}
      <ItemsPreviewModal
        isOpen={!!viewingItems}
        onClose={() => setViewingItems(null)}
        items={viewingItems || []}
      />
    </div>
  );
}
