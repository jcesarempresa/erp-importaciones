"use client";

import { useEffect, useState, Fragment } from "react";
import { Receipt, DollarSign, X, Loader2, AlertCircle, Ban, FilePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { 
  obtenerFacturas, 
  registrarPagoFactura, 
  anularFactura, 
  actualizarFactura,
  obtenerDespachos, 
  obtenerOrdenesCliente,
  obtenerClientes,
  crearFacturaDesdeDespachos, 
  obtenerConfigIVA 
} from "@/lib/api/importaciones";
import { Factura, NotaEntrega, OrdenCliente, FacturaItem, Cliente, AbonoCliente } from "@/types";
import { useTranslation } from "@/context/LanguageContext";
import PrintFactura from "@/components/PrintFactura";

export default function FacturacionPage() {
  const { t, language } = useTranslation();
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados del Modal de Abono
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
  const [montoPago, setMontoPago] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Estados detallados para abonos
  const [monedaPago, setMonedaPago] = useState<"USD" | "BS">("USD");
  const [montoPagoBs, setMontoPagoBs] = useState("");
  const [tasaPago, setTasaPago] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [referenciaPago, setReferenciaPago] = useState("");
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split("T")[0]);
  const [expandedFacturaId, setExpandedFacturaId] = useState<string | null>(null);
  const [abonosMap, setAbonosMap] = useState<Record<string, AbonoCliente[]>>({});

  // Estados del Modal de Facturación de Despachos (Consolidado)
  const [despachosPendientes, setDespachosPendientes] = useState<NotaEntrega[]>([]);
  const [ordenesClienteMap, setOrdenesClienteMap] = useState<Record<string, OrdenCliente>>({});
  const [editableInvoiceItems, setEditableInvoiceItems] = useState<Array<{ sku: string; descripcion: string; cantidad: number; precioUnitario: number }>>([]);
  const [facturarModalOpen, setFacturarModalOpen] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [selectedDespachosIds, setSelectedDespachosIds] = useState<string[]>([]);
  const [ivaConfig, setIvaConfig] = useState({ sigla: "IVA", porcentaje: 16, activo: true });
  const [flete, setFlete] = useState("");
  const [otrosGastos, setOtrosGastos] = useState("");
  const [tasaCambio, setTasaCambio] = useState("");
  const [bancoSeleccionado, setBancoSeleccionado] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [billing, setBilling] = useState(false);

  // Estados del Modal de Edición de Factura
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingFactura, setEditingFactura] = useState<Factura | null>(null);
  const [editItems, setEditItems] = useState<FacturaItem[]>([]);
  const [editFlete, setEditFlete] = useState("");
  const [editOtrosGastos, setEditOtrosGastos] = useState("");
  const [editTasaCambio, setEditTasaCambio] = useState("");
  const [editBancoSeleccionado, setEditBancoSeleccionado] = useState("");
  const [editObservaciones, setEditObservaciones] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  
  // Estados para tasas oficiales y paralelas
  const [rates, setRates] = useState<{ oficial: number; paralelo: number } | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  
  // Print State
  const [printFactura, setPrintFactura] = useState<Factura | null>(null);
  const [empresa, setEmpresa] = useState<any>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  async function loadFacturas() {
    setLoading(true);
    setError(null);
    try {
      const [data, emp, cls] = await Promise.all([
        obtenerFacturas(),
        import("@/lib/api/importaciones").then(m => m.obtenerEmpresa()),
        obtenerClientes()
      ]);
      setFacturas(data);
      setEmpresa(emp);
      setClientes(cls);
    } catch (err: any) {
      setError(err.message || (language === "es" ? "Error al cargar facturas." : "Error loading invoices."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFacturas();
    obtenerConfigIVA().then(setIvaConfig).catch(console.error);

    // Fetch dollar rates
    async function getRates() {
      try {
        const res = await fetch("https://ve.dolarapi.com/v1/dolares");
        if (res.ok) {
          const data = await res.json();
          const oficial = data.find((d: any) => d.fuente === "oficial")?.promedio || 0;
          const paralelo = data.find((d: any) => d.fuente === "paralelo")?.promedio || 0;
          if (oficial > 0 && paralelo > 0) {
            setRates({ oficial, paralelo });
          }
        }
      } catch (err) {
        console.error("Error loading dollar API rates:", err);
      }
    }
    getRates();
  }, []);

  const handleAnularFactura = async (id: string) => {
    if (!confirm(language === "es" 
      ? "¿Está seguro de anular esta factura? Las notas de entrega asociadas volverán al estado pendiente de facturación."
      : "Are you sure you want to void this invoice? The associated delivery notes will return to pending billing status.")) return;
    try {
      await anularFactura(id);
      await loadFacturas();
    } catch (err: any) {
      alert(err.message || (language === "es" ? "Error al anular la factura." : "Error voiding the invoice."));
    }
  };

  const handleOpenFacturarModal = async () => {
    try {
      const [allDespachos, ordenesData] = await Promise.all([
        obtenerDespachos(),
        obtenerOrdenesCliente()
      ]);

      const ordMap: Record<string, OrdenCliente> = {};
      ordenesData.forEach(o => { if (o.id) ordMap[o.id] = o; });
      setOrdenesClienteMap(ordMap);

      const pending = allDespachos.filter(d => d.estado === "pendiente_facturacion");
      setDespachosPendientes(pending);
      setFacturarModalOpen(true);
      setSelectedClienteId("");
      setSelectedDespachosIds([]);
      setEditableInvoiceItems([]);
      setFlete("");
      setOtrosGastos("");
      setTasaCambio(rates ? rates.paralelo.toFixed(2) : "");
      setBancoSeleccionado("");
      setObservaciones("");
    } catch (err: any) {
      alert((language === "es" ? "Error al cargar despachos pendientes: " : "Error loading pending deliveries: ") + err.message);
    }
  };

  const updateSelectedDespachos = (newIds: string[]) => {
    setSelectedDespachosIds(newIds);
    const selectedDespachos = despachosPendientes.filter(d => newIds.includes(d.id!));
    const itemMap = new Map<string, { sku: string; descripcion: string; cantidad: number; precioUnitario: number }>();

    for (const des of selectedDespachos) {
      const orden = ordenesClienteMap[des.ordenClienteId];
      for (const item of des.items) {
        const ordenItem = orden?.items?.find(i => i.sku === item.sku);
        const sku = item.sku;
        const cantidad = item.cantidadDespachada;
        const descripcion = ordenItem?.descripcion || item.descripcion || sku;
        const precioUnitario = ordenItem?.precioUnitario ?? item.precioUnitario ?? 0;

        if (itemMap.has(sku)) {
          const existing = itemMap.get(sku)!;
          existing.cantidad += cantidad;
        } else {
          itemMap.set(sku, { sku, descripcion, cantidad, precioUnitario });
        }
      }
    }

    setEditableInvoiceItems(Array.from(itemMap.values()));
  };

  const handleGenerarFactura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDespachosIds.length === 0) {
      alert(language === "es" ? "Debe seleccionar al menos un despacho para facturar." : "You must select at least one delivery note to invoice.");
      return;
    }
    const tasaNum = parseFloat(tasaCambio);
    if (!tasaCambio || isNaN(tasaNum) || tasaNum <= 0) {
      alert(language === "es" ? "La Tasa de Cambio es estrictamente requerida para generar la factura." : "Exchange Rate is strictly required to generate the invoice.");
      return;
    }
    setBilling(true);
    try {
      const tasaNum = parseFloat(tasaCambio);
      const fleteNum = parseFloat(flete) || 0;
      const otrosNum = parseFloat(otrosGastos) || 0;
      
      const subtotalCustom = editableInvoiceItems.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0);
      const formattedItems = editableInvoiceItems.map(i => ({
        sku: i.sku,
        descripcion: i.descripcion,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        subtotal: i.cantidad * i.precioUnitario
      }));

      await crearFacturaDesdeDespachos(selectedDespachosIds, { 
        subtotalCustom,
        items: formattedItems,
        tasaCambio: isNaN(tasaNum) ? undefined : tasaNum,
        flete: fleteNum,
        otrosGastos: otrosNum,
        bancoSeleccionado,
        observaciones
      });
      setFacturarModalOpen(false);
      await loadFacturas();
    } catch (err: any) {
      alert(err.message || (language === "es" ? "Error al crear la factura consolidada." : "Error creating consolidated invoice."));
    } finally {
      setBilling(false);
    }
  };

  const handleOpenPago = (factura: Factura) => {
    setSelectedFactura(factura);
    setMontoPago(factura.saldoPendiente.toFixed(2));
    setMonedaPago("USD");
    setMontoPagoBs("");
    setTasaPago(rates ? rates.paralelo.toFixed(2) : "");
    setMetodoPago("Efectivo");
    setReferenciaPago("");
    setFechaPago(new Date().toISOString().split("T")[0]);
    setModalOpen(true);
    setFormError(null);
  };

  const toggleExpandFactura = async (id: string) => {
    if (expandedFacturaId === id) {
      setExpandedFacturaId(null);
      return;
    }
    setExpandedFacturaId(id);
    try {
      const { obtenerAbonosFactura } = await import("@/lib/api/importaciones");
      const abonos = await obtenerAbonosFactura(id);
      setAbonosMap(prev => ({ ...prev, [id]: abonos }));
    } catch (err) {
      console.error("Error loading payments:", err);
    }
  };

  const handleOpenEditModal = async (fac: Factura) => {
    setEditingFactura(fac);
    setEditError(null);
    setEditModalOpen(true);
    
    let itemsToEdit: FacturaItem[] = fac.items && fac.items.length > 0 ? [...fac.items] : [];

    // Si la factura no tenía items guardados (creada previamente), los reconstruimos desde los despachos asociados
    if (itemsToEdit.length === 0 && Array.isArray(fac.notasEntregaIds) && fac.notasEntregaIds.length > 0) {
      try {
        const [allDespachos, ordenesData] = await Promise.all([
          obtenerDespachos(),
          obtenerOrdenesCliente()
        ]);
        const ordMap: Record<string, OrdenCliente> = {};
        ordenesData.forEach(o => { if (o.id) ordMap[o.id] = o; });

        const selectedDespachos = allDespachos.filter(d => fac.notasEntregaIds.includes(d.id!));
        const itemMap = new Map<string, { sku: string; descripcion: string; cantidad: number; precioUnitario: number }>();

        for (const des of selectedDespachos) {
          const orden = ordMap[des.ordenClienteId];
          for (const item of des.items) {
            const ordenItem = orden?.items?.find(i => i.sku === item.sku);
            const sku = item.sku;
            const cantidad = item.cantidadDespachada;
            const descripcion = ordenItem?.descripcion || item.descripcion || sku;
            const precioUnitario = ordenItem?.precioUnitario ?? item.precioUnitario ?? 0;

            if (itemMap.has(sku)) {
              const existing = itemMap.get(sku)!;
              existing.cantidad += cantidad;
            } else {
              itemMap.set(sku, { sku, descripcion, cantidad, precioUnitario });
            }
          }
        }

        itemsToEdit = Array.from(itemMap.values()).map(i => ({
          sku: i.sku,
          descripcion: i.descripcion,
          cantidad: i.cantidad,
          precioUnitario: i.precioUnitario,
          subtotal: i.cantidad * i.precioUnitario
        }));
      } catch (e) {
        console.error("Error al reconstruir items de factura:", e);
      }
    }

    setEditItems(itemsToEdit);
    setEditFlete(fac.flete?.toString() || "");
    setEditOtrosGastos(fac.otrosGastos?.toString() || "");
    setEditTasaCambio(fac.tasaCambio?.toString() || (rates ? rates.paralelo.toFixed(2) : ""));
    setEditBancoSeleccionado(fac.bancoSeleccionado || "");
    setEditObservaciones(fac.observaciones || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFactura?.id) return;

    const tasaNum = parseFloat(editTasaCambio);
    if (!editTasaCambio || isNaN(tasaNum) || tasaNum <= 0) {
      setEditError(language === "es" ? "La Tasa de Cambio es estrictamente requerida." : "Exchange Rate is strictly required.");
      return;
    }

    setEditSubmitting(true);
    setEditError(null);

    try {
      const valFlete = parseFloat(editFlete) || 0;
      const valOtros = parseFloat(editOtrosGastos) || 0;
      const subtotal = editItems.length > 0 
        ? editItems.reduce((sum, item) => sum + (item.cantidad * item.precioUnitario), 0)
        : editingFactura.subtotal;
        
      const porcentajeIVA = ivaConfig.activo ? ivaConfig.porcentaje / 100 : 0;
      const impuestos = subtotal * porcentajeIVA;
      const totalFactura = subtotal + valFlete + valOtros + impuestos;
      const totalBs = totalFactura * tasaNum;

      await actualizarFactura(editingFactura.id, {
        items: editItems,
        subtotal,
        flete: valFlete,
        otrosGastos: valOtros,
        impuestos,
        totalFactura,
        tasaCambio: tasaNum,
        totalBs,
        bancoSeleccionado: editBancoSeleccionado,
        observaciones: editObservaciones
      });

      setEditModalOpen(false);
      setEditingFactura(null);
      await loadFacturas();
    } catch (err: any) {
      setEditError(err.message || (language === "es" ? "Error al actualizar la factura." : "Error updating invoice."));
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFactura?.id) return;
    
    setSubmitting(true);
    setFormError(null);

    let finalMontoUSD = 0;
    let finalMontoBs: number | undefined = undefined;
    let finalTasa: number | undefined = undefined;

    if (monedaPago === "USD") {
      const parsedMonto = parseFloat(montoPago);
      if (isNaN(parsedMonto) || parsedMonto <= 0) {
        setFormError(language === "es" ? "El monto ingresado debe ser un número mayor a cero." : "The entered amount must be a number greater than zero.");
        setSubmitting(false);
        return;
      }
      if (parsedMonto > selectedFactura.saldoPendiente + 0.01) {
        setFormError(language === "es" ? "El monto del pago no puede exceder el saldo pendiente de la factura." : "The payment amount cannot exceed the pending balance of the invoice.");
        setSubmitting(false);
        return;
      }
      finalMontoUSD = Math.min(parsedMonto, selectedFactura.saldoPendiente);
    } else {
      const parsedMontoBs = parseFloat(montoPagoBs);
      const parsedTasa = parseFloat(tasaPago);

      if (isNaN(parsedMontoBs) || parsedMontoBs <= 0) {
        setFormError(language === "es" ? "El monto en Bolívares debe ser un número mayor a cero." : "The entered Bs. amount must be a number greater than zero.");
        setSubmitting(false);
        return;
      }
      if (isNaN(parsedTasa) || parsedTasa <= 0) {
        setFormError(language === "es" ? "La tasa de cambio ingresada debe ser un número mayor a cero." : "The entered exchange rate must be a number greater than zero.");
        setSubmitting(false);
        return;
      }

      finalMontoUSD = parsedMontoBs / parsedTasa;
      if (finalMontoUSD > selectedFactura.saldoPendiente + 0.01) {
        setFormError(language === "es" ? `El monto del pago ($${finalMontoUSD.toFixed(2)}) excede el saldo pendiente ($${selectedFactura.saldoPendiente.toFixed(2)}).` : `The payment amount ($${finalMontoUSD.toFixed(2)}) exceeds the pending balance ($${selectedFactura.saldoPendiente.toFixed(2)}).`);
        setSubmitting(false);
        return;
      }
      finalMontoUSD = Math.min(finalMontoUSD, selectedFactura.saldoPendiente);
      finalMontoBs = parsedMontoBs;
      finalTasa = parsedTasa;
    }

    try {
      await registrarPagoFactura(selectedFactura.id, {
        montoUSD: finalMontoUSD,
        moneda: monedaPago,
        montoBs: finalMontoBs,
        tasaCambio: finalTasa,
        fecha: fechaPago,
        metodoPago,
        referencia: referenciaPago || undefined
      });
      
      // Actualizar listado local de abonos de la factura si está expandida
      if (expandedFacturaId === selectedFactura.id) {
        const { obtenerAbonosFactura } = await import("@/lib/api/importaciones");
        const abonos = await obtenerAbonosFactura(selectedFactura.id);
        setAbonosMap(prev => ({ ...prev, [selectedFactura.id!]: abonos }));
      }

      setModalOpen(false);
      setSelectedFactura(null);
      setMontoPago("");
      setMontoPagoBs("");
      setReferenciaPago("");
      await loadFacturas();
    } catch (err: any) {
      setFormError(err.message || (language === "es" ? "Error al registrar el abono." : "Error registering the payment."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Receipt className="h-6 w-6 text-indigo-400" />
            <h2 className="text-2xl font-bold text-slate-100 tracking-tight">{language === "es" ? "Facturación & Cuentas por Cobrar (CxC)" : "Invoicing & Accounts Receivable (A/R)"}</h2>
          </div>
          <p className="text-xs text-slate-400">
            {language === "es" 
              ? "Administración de cuentas por cobrar de clientes, cobros recibidos y abonos transaccionales."
              : "Management of customer accounts receivable, payments received, and transactional credits."}
          </p>
        </div>
        <button
          onClick={handleOpenFacturarModal}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-500/10"
        >
          <FilePlus className="h-4 w-4" /> {language === "es" ? "Facturar Despachos" : "Invoice Deliveries"}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-955/40 border border-rose-900/40 rounded-xl text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Listado de Facturas */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-slate-400 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <span className="text-xs">{language === "es" ? "Cargando facturas..." : "Loading invoices..."}</span>
          </div>
        ) : facturas.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-center p-6">
            <Receipt className="h-10 w-10 text-slate-600 mb-2" />
            <p className="text-xs">{language === "es" ? "No hay facturas registradas en el sistema." : "No invoices registered in the system."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 bg-slate-900/20 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4">{language === "es" ? "ID Factura" : "Invoice ID"}</th>
                  <th className="p-4">{language === "es" ? "Cliente" : "Customer"}</th>
                  <th className="p-4">{language === "es" ? "Fecha" : "Date"}</th>
                  <th className="p-4">{language === "es" ? "Total Factura" : "Invoice Total"}</th>
                  <th className="p-4">{language === "es" ? "Saldo Pendiente" : "Pending Balance"}</th>
                  <th className="p-4">{language === "es" ? "Estado" : "Status"}</th>
                  <th className="p-4 text-right">{language === "es" ? "Acciones" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {facturas.map((fac) => (
                  <Fragment key={fac.id}>
                    <tr className="hover:bg-white/2 transition-colors">
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 font-mono font-bold text-[11px] border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                          {fac.id}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-slate-200">{fac.clienteNombre}</td>
                      <td className="p-4 text-slate-400">{new Date(fac.fecha).toLocaleDateString()}</td>
                      <td className="p-4 font-mono text-slate-300">
                        <div>${fac.totalFactura.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        {fac.totalBs ? <div className="text-[10px] text-slate-500">Bs. {fac.totalBs.toLocaleString(undefined, { minimumFractionDigits: 2 })} (Tasa: {fac.tasaCambio})</div> : null}
                      </td>
                      <td className="p-4 font-mono font-bold text-emerald-400">
                        ${fac.saldoPendiente.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          fac.estado === "pagada" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          fac.estado === "parcial" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          fac.estado === "anulada" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                          "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        }`}>
                          {fac.estado === "pagada" ? (language === "es" ? "PAGADA" : "PAID") :
                           fac.estado === "parcial" ? (language === "es" ? "PARCIAL" : "PARTIAL") :
                           fac.estado === "anulada" ? (language === "es" ? "ANULADA" : "VOIDED") :
                           (language === "es" ? "PENDIENTE" : "PENDING")}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setPrintFactura(fac)}
                            className="px-2.5 py-1 rounded bg-slate-500/10 hover:bg-slate-500/20 text-slate-300 border border-slate-500/20 font-bold text-[10px] transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            {language === "es" ? "Imprimir" : "Print"}
                          </button>
                          {fac.estado !== "anulada" && (
                            <button
                              onClick={() => handleOpenEditModal(fac)}
                              className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 font-bold text-[10px] transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <Pencil className="w-3 h-3" />
                              {language === "es" ? "Editar" : "Edit"}
                            </button>
                          )}
                          {fac.saldoPendiente > 0 && fac.estado !== "anulada" && (
                            <button
                              onClick={() => handleOpenPago(fac)}
                              className="px-2.5 py-1 rounded bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                            >
                              <DollarSign className="h-3 w-3" /> {language === "es" ? "Cobrar" : "Collect"}
                            </button>
                          )}
                          {fac.estado !== "anulada" && (fac.estado === "parcial" || fac.estado === "pagada") && (
                            <button
                              onClick={() => toggleExpandFactura(fac.id!)}
                              className="px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 font-bold text-[10px] transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              {expandedFacturaId === fac.id ? (language === "es" ? "Ocultar" : "Hide") : (language === "es" ? "Abonos" : "Payments")}
                            </button>
                          )}
                          {fac.estado === "pendiente" && fac.saldoPendiente === fac.totalFactura && (
                            <button
                              onClick={() => handleAnularFactura(fac.id!)}
                              className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-semibold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Ban className="h-3 w-3" /> {language === "es" ? "Anular" : "Void"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedFacturaId === fac.id && (
                      <tr className="bg-slate-900/30">
                        <td colSpan={7} className="p-4 border-b border-slate-800/85">
                          <div className="space-y-3 pl-4 border-l-2 border-indigo-500">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider">
                                {language === "es" ? "Historial de Abonos Recibidos" : "Received Payments History"}
                              </h4>
                            </div>
                            
                            {!abonosMap[fac.id!] ? (
                              <div className="flex items-center gap-2 text-slate-500 text-xs py-2">
                                <Loader2 className="h-4.5 w-4.5 animate-spin text-indigo-500" />
                                <span>{language === "es" ? "Cargando abonos..." : "Loading payments..."}</span>
                              </div>
                            ) : abonosMap[fac.id!].length === 0 ? (
                              <p className="text-xs text-slate-500 py-1">
                                {language === "es" ? "No se han registrado abonos para esta factura." : "No payments have been registered for this invoice."}
                              </p>
                            ) : (
                              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 max-w-3xl shadow-lg">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="border-b border-slate-800 bg-slate-900/30 text-slate-400 font-bold">
                                      <th className="p-2.5">{language === "es" ? "Fecha" : "Date"}</th>
                                      <th className="p-2.5">{language === "es" ? "Método" : "Method"}</th>
                                      <th className="p-2.5">{language === "es" ? "Referencia" : "Reference"}</th>
                                      <th className="p-2.5 text-right">{language === "es" ? "Monto Abonado" : "Amount Paid"}</th>
                                      <th className="p-2.5 text-right">{language === "es" ? "Equivalente en USD" : "USD Equivalent"}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-900/80">
                                    {abonosMap[fac.id!].map((abono) => (
                                      <tr key={abono.id || abono.createdAt} className="text-slate-300 hover:bg-white/1">
                                        <td className="p-2.5 font-mono">{new Date(abono.fecha).toLocaleDateString()}</td>
                                        <td className="p-2.5">{abono.metodoPago}</td>
                                        <td className="p-2.5 font-mono text-[10px] text-slate-500">{abono.referencia || "N/A"}</td>
                                        <td className="p-2.5 text-right font-mono font-semibold">
                                          {abono.moneda === "BS" ? (
                                            <span className="text-amber-400">Bs. {abono.montoBs?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                          ) : (
                                            <span className="text-slate-350">${abono.montoUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                          )}
                                          {abono.tasaCambio ? (
                                            <div className="text-[9px] text-slate-500 font-normal">Tasa: {abono.tasaCambio}</div>
                                          ) : null}
                                        </td>
                                        <td className="p-2.5 text-right font-mono font-bold text-emerald-400">
                                          ${abono.montoUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Modal Registrar Pago / Abono (Aero Glassmorphism) */}
      {modalOpen && selectedFactura && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-indigo-400" /> {language === "es" ? "Registrar Abono / Pago" : "Register Payment / Credit"}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">{language === "es" ? "Cliente:" : "Customer:"}</span>
                <span className="font-semibold text-slate-200">{selectedFactura.clienteNombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{language === "es" ? "Factura ID:" : "Invoice ID:"}</span>
                <span className="font-mono text-slate-300">{selectedFactura.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{language === "es" ? "Monto Original:" : "Original Amount:"}</span>
                <span className="font-mono text-slate-400">${selectedFactura.totalFactura.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-2 mt-2">
                <span className="text-slate-500 font-semibold">{language === "es" ? "Saldo Pendiente:" : "Pending Balance:"}</span>
                <span className="font-mono font-bold text-emerald-400">${selectedFactura.saldoPendiente.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <form onSubmit={handleRegisterPayment} className="space-y-4">
              {/* Selector de Moneda de Pago */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">{language === "es" ? "Moneda del Abono / Pago" : "Payment Currency"}</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMonedaPago("USD")}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                      monedaPago === "USD" 
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/10" 
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    $ USD
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonedaPago("BS")}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                      monedaPago === "BS" 
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/10" 
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    Bs. Bolívares
                  </button>
                </div>
              </div>

              {/* Campos dinámicos según Moneda */}
              {monedaPago === "USD" ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">{language === "es" ? "Monto a Cobrar / Abonar ($ USD)" : "Amount to Collect / Credit ($ USD)"}</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 text-xs">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={selectedFactura.saldoPendiente}
                      value={montoPago}
                      onChange={(e) => setMontoPago(e.target.value)}
                      placeholder={language === "es" ? "Monto en dólares" : "Amount in USD"}
                      className="w-full pl-7 pr-3 py-2 rounded-xl text-xs glass-input focus:outline-none border-indigo-500/50"
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">{language === "es" ? "Monto en Bs." : "Amount in Bs."}</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 text-xs">Bs.</span>
                        <input
                          type="number"
                          step="0.01;any"
                          min="0.01"
                          value={montoPagoBs}
                          onChange={(e) => setMontoPagoBs(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-9 pr-3 py-2 rounded-xl text-xs glass-input focus:outline-none border-indigo-500/50"
                          disabled={submitting}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">{language === "es" ? "Tasa del Abono" : "Payment Exchange Rate"}</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={tasaPago}
                        onChange={(e) => setTasaPago(e.target.value)}
                        placeholder="Ej. 36.50"
                        className="w-full px-3 py-2 rounded-xl text-xs glass-input focus:outline-none border-indigo-500/50 text-center font-mono"
                        disabled={submitting}
                        required
                      />
                    </div>
                  </div>

                  {/* Botones de Tasa Rápida */}
                  {rates && (
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setTasaPago(rates.oficial.toFixed(2))}
                        className="bg-slate-900 border border-slate-800 text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        Usar BCV: <strong>{rates.oficial.toFixed(2)}</strong>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTasaPago(rates.paralelo.toFixed(2))}
                        className="bg-slate-900 border border-slate-800 text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        Usar Binance: <strong>{rates.paralelo.toFixed(2)}</strong>
                      </button>
                    </div>
                  )}

                  {/* Conversión y validación de Bs a USD */}
                  {montoPagoBs && tasaPago && !isNaN(parseFloat(montoPagoBs)) && !isNaN(parseFloat(tasaPago)) && parseFloat(tasaPago) > 0 && (
                    <div className="flex justify-between items-center text-xs bg-indigo-500/10 border border-indigo-500/20 p-2.5 rounded-xl">
                      <span className="text-indigo-300 font-semibold">{language === "es" ? "Equivalente a abonar:" : "Equivalent to credit:"}</span>
                      <span className="font-mono font-bold text-indigo-400">
                        ${(parseFloat(montoPagoBs) / parseFloat(tasaPago)).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Método de Pago y Referencia */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">{language === "es" ? "Método de Pago" : "Payment Method"}</label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs glass-input focus:outline-none cursor-pointer"
                    disabled={submitting}
                  >
                    {monedaPago === "USD" ? (
                      <>
                        <option className="bg-slate-900 text-white" value="Efectivo USD">Efectivo USD</option>
                        <option className="bg-slate-900 text-white" value="Zelle">Zelle</option>
                        <option className="bg-slate-900 text-white" value="Transferencia USD">Wire / Transferencia</option>
                      </>
                    ) : (
                      <>
                        <option className="bg-slate-900 text-white" value="Pago Móvil">Pago Móvil</option>
                        <option className="bg-slate-900 text-white" value="Transferencia Bs">Transferencia Bs</option>
                        <option className="bg-slate-900 text-white" value="Efectivo Bs">Efectivo Bs</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">{language === "es" ? "Referencia" : "Reference"}</label>
                  <input
                    type="text"
                    value={referenciaPago}
                    onChange={(e) => setReferenciaPago(e.target.value)}
                    placeholder={language === "es" ? "Nro. Referencia" : "Ref Number"}
                    className="w-full px-3 py-2 rounded-xl text-xs glass-input focus:outline-none"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Fecha Pago */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">{language === "es" ? "Fecha del Abono" : "Payment Date"}</label>
                <input
                  type="date"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs glass-input focus:outline-none font-mono"
                  disabled={submitting}
                  required
                />
              </div>

              {formError && (
                <div className="flex items-center gap-2 p-3 bg-rose-955/40 border border-rose-900/40 rounded-xl text-rose-300 text-xs">
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
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  {language === "es" ? "Registrar Cobro" : "Register Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Facturar Despachos Consolidados (Aero Glassmorphism) */}
      {facturarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-indigo-400" /> {language === "es" ? "Facturar Notas de Entrega / Despachos" : "Invoice Delivery Notes / Shipments"}
              </h3>
              <button 
                onClick={() => setFacturarModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleGenerarFactura} className="space-y-4">
              {/* Selección de Cliente */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">{language === "es" ? "Seleccionar Cliente" : "Select Customer"}</label>
                <select
                  value={selectedClienteId}
                  onChange={(e) => {
                    setSelectedClienteId(e.target.value);
                    updateSelectedDespachos([]);
                  }}
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-950/60 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option className="bg-slate-900 text-white"  value="">{language === "es" ? "-- Seleccionar Cliente --" : "-- Select Customer --"}</option>
                  {Array.from(
                    new Map(despachosPendientes.map(d => [d.clienteId, d.clienteNombre])).entries()
                  ).map(([id, nombre]) => (
                    <option className="bg-slate-900 text-white"  key={id} value={id}>{nombre}</option>
                  ))}
                </select>
              </div>

              {/* Lista de Despachos Pendientes */}
              {selectedClienteId && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400">{language === "es" ? "Notas de Entrega Pendientes" : "Pending Delivery Notes"}</label>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {despachosPendientes.filter(d => d.clienteId === selectedClienteId).length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">{language === "es" ? "No hay despachos pendientes para este cliente." : "No pending deliveries for this customer."}</p>
                    ) : (
                      despachosPendientes
                        .filter(d => d.clienteId === selectedClienteId)
                        .map((d) => {
                          const isChecked = selectedDespachosIds.includes(d.id!);
                          return (
                            <label 
                              key={d.id} 
                              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                                isChecked 
                                  ? "border-indigo-500 bg-indigo-500/5" 
                                  : "border-slate-800 bg-slate-950/20 hover:bg-slate-900/30"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    updateSelectedDespachos([...selectedDespachosIds, d.id!]);
                                  } else {
                                    updateSelectedDespachos(selectedDespachosIds.filter(id => id !== d.id));
                                  }
                                }}
                                className="rounded border-slate-800 text-indigo-650 focus:ring-0 cursor-pointer"
                              />
                              <div className="flex-1 text-[11px]">
                                <div className="flex justify-between font-bold">
                                  <span className="text-slate-300 font-mono">{d.id}</span>
                                  <span className="text-indigo-400 font-mono">
                                    ${d.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 flex justify-between mt-1">
                                  <span>{language === "es" ? "Fecha:" : "Date:"} {new Date(d.fecha).toLocaleDateString()}</span>
                                  <span>SKUs: {d.items.length}</span>
                                </div>
                              </div>
                            </label>
                          );
                        })
                    )}
                  </div>
                </div>
              )}

              {/* Tabla Editable de Ítems / Productos */}
              {editableInvoiceItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      {language === "es" ? "Ítems y Precios de Facturación (Editable)" : "Invoice Items & Prices (Editable)"}
                    </label>
                    <span className="text-[10px] text-indigo-400 font-mono">
                      {editableInvoiceItems.length} {language === "es" ? "productos" : "products"}
                    </span>
                  </div>
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-955/60 max-h-48 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-slate-900/80 text-slate-400 font-bold uppercase text-[10px] sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                          <th className="p-2.5">{language === "es" ? "SKU / Descripción" : "SKU / Description"}</th>
                          <th className="p-2.5 text-center">{language === "es" ? "Cant." : "Qty"}</th>
                          <th className="p-2.5 text-right">{language === "es" ? "Precio U. ($)" : "Unit Price ($)"}</th>
                          <th className="p-2.5 text-right">{language === "es" ? "Subtotal ($)" : "Subtotal ($)"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {editableInvoiceItems.map((item, idx) => (
                          <tr key={item.sku} className="hover:bg-white/2 transition-colors">
                            <td className="p-2.5">
                              <div className="font-mono font-bold text-slate-200">{item.sku}</div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[170px]">{item.descripcion}</div>
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-slate-300">{item.cantidad}</td>
                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.precioUnitario}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setEditableInvoiceItems(editableInvoiceItems.map((it, i) => i === idx ? { ...it, precioUnitario: val } : it));
                                }}
                                className="w-24 px-2 py-1 bg-slate-900 border border-slate-700/80 rounded-lg text-right font-mono font-bold text-indigo-300 focus:outline-none focus:border-indigo-500"
                                disabled={billing}
                              />
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-emerald-400">
                              ${(item.cantidad * item.precioUnitario).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totales consolidados */}
              {selectedDespachosIds.length > 0 && (() => {
                const subtotal = editableInvoiceItems.reduce((sum, item) => sum + (item.cantidad * item.precioUnitario), 0);
                const valFlete = parseFloat(flete) || 0;
                const valOtros = parseFloat(otrosGastos) || 0;
                const porcentajeIVA = ivaConfig.activo ? ivaConfig.porcentaje / 100 : 0;
                const impuestos = subtotal * porcentajeIVA;
                const total = subtotal + valFlete + valOtros + impuestos;

                return (
                  <div className="space-y-4">
                    <div className="bg-slate-955/40 border border-slate-900 rounded-xl p-4 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">{language === "es" ? "Subtotal Consolidado:" : "Consolidated Subtotal:"}</span>
                        <span className="font-mono text-slate-300">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      
                      {/* Inputs para gastos adicionales antes del impuesto */}
                      <div className="grid grid-cols-2 gap-3 py-2 border-y border-slate-900/50 my-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{language === "es" ? "Flete ($)" : "Freight ($)"}</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={flete}
                            onChange={(e) => setFlete(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-2 py-1.5 rounded-lg text-xs glass-input focus:outline-none"
                            disabled={billing}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{language === "es" ? "Otros Gastos ($)" : "Other Expenses ($)"}</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={otrosGastos}
                            onChange={(e) => setOtrosGastos(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-2 py-1.5 rounded-lg text-xs glass-input focus:outline-none"
                            disabled={billing}
                          />
                        </div>
                      </div>

                      {ivaConfig.activo && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">{ivaConfig.sigla} ({ivaConfig.porcentaje}%):</span>
                          <span className="font-mono text-slate-400">${impuestos.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-900 pt-2 mt-2">
                        <span className="text-slate-500 font-bold">{language === "es" ? "Total Factura:" : "Total Invoice:"}</span>
                        <span className="font-mono font-bold text-indigo-400">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div className="bg-slate-955/40 border border-slate-900 rounded-xl p-4 space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-400">{language === "es" ? "Tasa de Cambio (Requerida - Bs / USD)" : "Exchange Rate (Required - Bs / USD)"}</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={tasaCambio}
                          onChange={(e) => setTasaCambio(e.target.value)}
                          placeholder="Ej: 36.50"
                          className="w-full px-3 py-2 rounded-xl text-xs glass-input focus:outline-none border-indigo-500/50"
                          disabled={billing}
                          required
                        />
                        {rates && (
                          <div className="flex flex-wrap gap-2 pt-1.5">
                            <button
                              type="button"
                              onClick={() => setTasaCambio(rates.oficial.toFixed(2))}
                              className="bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-bold px-2.5 py-1 rounded-lg hover:border-indigo-500 transition-colors cursor-pointer"
                            >
                              Tasa BCV: {rates.oficial.toFixed(2)}
                            </button>
                            <button
                              type="button"
                              onClick={() => setTasaCambio(rates.paralelo.toFixed(2))}
                              className="bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-bold px-2.5 py-1 rounded-lg hover:border-indigo-500 transition-colors cursor-pointer"
                            >
                              Tasa Binance (Paralelo): {rates.paralelo.toFixed(2)}
                            </button>
                          </div>
                        )}
                      </div>
                      {tasaCambio && !isNaN(parseFloat(tasaCambio)) && (
                        <div className="flex justify-between items-center text-xs bg-indigo-500/10 border border-indigo-500/20 p-2.5 rounded-xl">
                          <span className="text-indigo-300 font-semibold">{language === "es" ? "Total Factura (Bs):" : "Total Invoice (Bs):"}</span>
                          <span className="font-mono font-bold text-indigo-400">Bs. {(total * parseFloat(tasaCambio)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </div>

                    {/* Bank Selection and Observaciones */}
                    <div className="space-y-4 pt-2">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-400">
                          {language === "es" ? "Cuenta Bancaria para Pago (Se muestra en PDF)" : "Payment Bank Account (Shown on PDF)"}
                        </label>
                        <select
                          value={bancoSeleccionado}
                          onChange={(e) => setBancoSeleccionado(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-xs glass-input focus:outline-none"
                          disabled={billing}
                        >
                          <option className="bg-slate-900 text-white" value="">
                            {language === "es" ? "-- No mostrar cuenta bancaria --" : "-- Do not show bank account --"}
                          </option>
                          {empresa?.bancoNombre1 && (
                            <option className="bg-slate-900 text-white" value="cuenta1">{empresa.bancoNombre1} (Nacional)</option>
                          )}
                          {empresa?.bancoNombre2 && (
                            <option className="bg-slate-900 text-white" value="cuenta2">{empresa.bancoNombre2} (Nacional)</option>
                          )}
                          {empresa?.bancoNombre3 && (
                            <option className="bg-slate-900 text-white" value="cuenta3">{empresa.bancoNombre3} (Internacional)</option>
                          )}
                          {empresa?.bancoNombre4 && (
                            <option className="bg-slate-900 text-white" value="cuenta4">{empresa.bancoNombre4} (Internacional)</option>
                          )}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-400">
                          {language === "es" ? "Observaciones / Condiciones" : "General Notes / Terms"}
                        </label>
                        <textarea
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          placeholder={language === "es" ? "Condiciones de pago, entrega, etc." : "Payment terms, delivery details, etc."}
                          className="w-full px-3 py-2 rounded-xl text-xs glass-input focus:outline-none min-h-[60px] resize-y"
                          disabled={billing}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setFacturarModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-white/5 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
                  disabled={billing}
                >
                  {language === "es" ? "Cancelar" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  disabled={billing || selectedDespachosIds.length === 0 || !tasaCambio || isNaN(parseFloat(tasaCambio))}
                >
                  {billing && <Loader2 className="h-3 w-3 animate-spin" />}
                  {language === "es" ? "Generar Factura" : "Generate Invoice"} ({selectedDespachosIds.length})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Imprimir Factura */}
      {printFactura && empresa && (
        <PrintFactura 
          factura={printFactura}
          empresa={empresa}
          clientes={clientes}
          onClose={() => setPrintFactura(null)}
          language={language}
        />
      )}

      {/* Modal Editar Factura */}
      {editModalOpen && editingFactura && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {language === "es" ? "Editar Factura" : "Edit Invoice"} {editingFactura.id}
                  </h3>
                  <p className="text-[10px] text-slate-400">{editingFactura.clienteNombre}</p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                disabled={editSubmitting}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-955/40 border border-rose-900/40 rounded-xl text-rose-300 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Tabla de ítems editables */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    {language === "es" ? "Ítems y Precios de Facturación (Editable)" : "Invoice Items & Prices (Editable)"}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditItems([
                        ...editItems,
                        { sku: `ITEM-${editItems.length + 1}`, descripcion: "Nuevo Producto", cantidad: 1, precioUnitario: 0, subtotal: 0 }
                      ]);
                    }}
                    className="px-2 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {language === "es" ? "Agregar Ítem" : "Add Item"}
                  </button>
                </div>

                {editItems.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center bg-slate-955/40 border border-slate-800 rounded-xl">
                    {language === "es" ? "No hay productos en esta factura. Haz clic en 'Agregar Ítem'." : "No products on this invoice. Click 'Add Item'."}
                  </p>
                ) : (
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-955/60 max-h-56 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-slate-900/80 text-slate-400 font-bold uppercase text-[10px] sticky top-0 z-10">
                        <tr>
                          <th className="p-2.5">{language === "es" ? "SKU / Descripción" : "SKU / Description"}</th>
                          <th className="p-2.5 text-center w-16">{language === "es" ? "Cant." : "Qty"}</th>
                          <th className="p-2.5 text-right w-24">{language === "es" ? "Precio U. ($)" : "Unit Price ($)"}</th>
                          <th className="p-2.5 text-right w-24">{language === "es" ? "Subtotal ($)" : "Subtotal ($)"}</th>
                          <th className="p-2.5 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {editItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-white/2">
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.sku}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditItems(editItems.map((it, i) => i === idx ? { ...it, sku: val } : it));
                                }}
                                className="w-full px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded font-mono font-bold text-slate-200 text-xs focus:outline-none focus:border-amber-500 mb-1"
                                placeholder="SKU"
                                disabled={editSubmitting}
                              />
                              <input
                                type="text"
                                value={item.descripcion || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditItems(editItems.map((it, i) => i === idx ? { ...it, descripcion: val } : it));
                                }}
                                className="w-full px-1.5 py-0.5 bg-slate-900 border border-slate-800/60 rounded text-slate-400 text-[10px] focus:outline-none focus:border-amber-500"
                                placeholder="Descripción"
                                disabled={editSubmitting}
                              />
                            </td>
                            <td className="p-2 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.cantidad}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setEditItems(editItems.map((it, i) => i === idx ? { ...it, cantidad: val } : it));
                                }}
                                className="w-14 px-1.5 py-1 bg-slate-900 border border-slate-700/80 rounded text-center font-mono font-bold text-slate-200 focus:outline-none focus:border-amber-500"
                                disabled={editSubmitting}
                              />
                            </td>
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.precioUnitario}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setEditItems(editItems.map((it, i) => i === idx ? { ...it, precioUnitario: val } : it));
                                }}
                                className="w-20 px-1.5 py-1 bg-slate-900 border border-slate-700/80 rounded text-right font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                                disabled={editSubmitting}
                              />
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-emerald-400">
                              ${((item.cantidad || 0) * (item.precioUnitario || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}
                                className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Eliminar ítem"
                                disabled={editSubmitting}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Totales y Gastos Adicionales */}
              {(() => {
                const subtotal = editItems.length > 0 
                  ? editItems.reduce((sum, item) => sum + (item.cantidad * item.precioUnitario), 0)
                  : editingFactura.subtotal;
                const valFlete = parseFloat(editFlete) || 0;
                const valOtros = parseFloat(editOtrosGastos) || 0;
                const porcentajeIVA = ivaConfig.activo ? ivaConfig.porcentaje / 100 : 0;
                const impuestos = subtotal * porcentajeIVA;
                const total = subtotal + valFlete + valOtros + impuestos;

                return (
                  <div className="space-y-4">
                    <div className="bg-slate-955/40 border border-slate-900 rounded-xl p-4 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">{language === "es" ? "Subtotal Consolidado:" : "Consolidated Subtotal:"}</span>
                        <span className="font-mono text-slate-300">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 py-2 border-y border-slate-900/50 my-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{language === "es" ? "Flete ($)" : "Freight ($)"}</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editFlete}
                            onChange={(e) => setEditFlete(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-2 py-1.5 rounded-lg text-xs glass-input focus:outline-none"
                            disabled={editSubmitting}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{language === "es" ? "Otros Gastos ($)" : "Other Expenses ($)"}</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editOtrosGastos}
                            onChange={(e) => setEditOtrosGastos(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-2 py-1.5 rounded-lg text-xs glass-input focus:outline-none"
                            disabled={editSubmitting}
                          />
                        </div>
                      </div>

                      {ivaConfig.activo && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">{ivaConfig.sigla} ({ivaConfig.porcentaje}%):</span>
                          <span className="font-mono text-slate-400">${impuestos.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-900 pt-2 mt-2">
                        <span className="text-slate-500 font-bold">{language === "es" ? "Total Factura:" : "Total Invoice:"}</span>
                        <span className="font-mono font-bold text-amber-400">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div className="bg-slate-955/40 border border-slate-900 rounded-xl p-4 space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-400">{language === "es" ? "Tasa de Cambio (Requerida - Bs / USD)" : "Exchange Rate (Required - Bs / USD)"}</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editTasaCambio}
                          onChange={(e) => setEditTasaCambio(e.target.value)}
                          placeholder="Ej: 36.50"
                          className="w-full px-3 py-2 rounded-xl text-xs glass-input focus:outline-none border-amber-500/50"
                          disabled={editSubmitting}
                          required
                        />
                        {rates && (
                          <div className="flex flex-wrap gap-2 pt-1.5">
                            <button
                              type="button"
                              onClick={() => setEditTasaCambio(rates.oficial.toFixed(2))}
                              className="bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-bold px-2.5 py-1 rounded-lg hover:border-amber-500 transition-colors cursor-pointer"
                            >
                              Tasa BCV: {rates.oficial.toFixed(2)}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditTasaCambio(rates.paralelo.toFixed(2))}
                              className="bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-bold px-2.5 py-1 rounded-lg hover:border-amber-500 transition-colors cursor-pointer"
                            >
                              Tasa Binance (Paralelo): {rates.paralelo.toFixed(2)}
                            </button>
                          </div>
                        )}
                      </div>
                      {editTasaCambio && !isNaN(parseFloat(editTasaCambio)) && (
                        <div className="flex justify-between items-center text-xs bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                          <span className="text-amber-300 font-semibold">{language === "es" ? "Total Factura (Bs):" : "Total Invoice (Bs):"}</span>
                          <span className="font-mono font-bold text-amber-400">Bs. {(total * parseFloat(editTasaCambio)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </div>

                    {/* Bank Selection and Observaciones (Edit) */}
                    <div className="space-y-4 pt-2">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-400">
                          {language === "es" ? "Cuenta Bancaria para Pago (Se muestra en PDF)" : "Payment Bank Account (Shown on PDF)"}
                        </label>
                        <select
                          value={editBancoSeleccionado}
                          onChange={(e) => setEditBancoSeleccionado(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-xs glass-input focus:outline-none"
                          disabled={editSubmitting}
                        >
                          <option className="bg-slate-900 text-white" value="">
                            {language === "es" ? "-- No mostrar cuenta bancaria --" : "-- Do not show bank account --"}
                          </option>
                          {empresa?.bancoNombre1 && (
                            <option className="bg-slate-900 text-white" value="cuenta1">{empresa.bancoNombre1} (Nacional)</option>
                          )}
                          {empresa?.bancoNombre2 && (
                            <option className="bg-slate-900 text-white" value="cuenta2">{empresa.bancoNombre2} (Nacional)</option>
                          )}
                          {empresa?.bancoNombre3 && (
                            <option className="bg-slate-900 text-white" value="cuenta3">{empresa.bancoNombre3} (Internacional)</option>
                          )}
                          {empresa?.bancoNombre4 && (
                            <option className="bg-slate-900 text-white" value="cuenta4">{empresa.bancoNombre4} (Internacional)</option>
                          )}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-400">
                          {language === "es" ? "Observaciones / Condiciones" : "General Notes / Terms"}
                        </label>
                        <textarea
                          value={editObservaciones}
                          onChange={(e) => setEditObservaciones(e.target.value)}
                          placeholder={language === "es" ? "Condiciones de pago, entrega, etc." : "Payment terms, delivery details, etc."}
                          className="w-full px-3 py-2 rounded-xl text-xs glass-input focus:outline-none min-h-[60px] resize-y"
                          disabled={editSubmitting}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-white/5 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
                  disabled={editSubmitting}
                >
                  {language === "es" ? "Cancelar" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  disabled={editSubmitting || !editTasaCambio || isNaN(parseFloat(editTasaCambio))}
                >
                  {editSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  {language === "es" ? "Guardar Cambios" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
