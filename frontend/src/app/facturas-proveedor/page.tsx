"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Loader2, 
  Plus, 
  DollarSign,
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Ban,
  Trash2,
  Printer,
  Edit2,
  Save,
  X
} from "lucide-react";
import { 
  obtenerFacturasProveedor,
  obtenerProveedores,
  anularFacturaProveedor,
  eliminarFacturaProveedor,
  actualizarFacturaProveedor,
  obtenerEmpresa,
  EmpresaConfig
} from "@/lib/api/importaciones";
import { Proveedor } from "@/types";
import { useTranslation } from "@/context/LanguageContext";
import PrintFacturaProveedor from "@/components/PrintFacturaProveedor";

export default function FacturasProveedorPage() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const [facturas, setFacturas] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printFactura, setPrintFactura] = useState<any | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaConfig | null>(null);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingFactura, setEditingFactura] = useState<any | null>(null);
  const [editNumeroFactura, setEditNumeroFactura] = useState("");
  const [editFechaEmision, setEditFechaEmision] = useState("");
  const [editTotal, setEditTotal] = useState(0);
  const [editFlete, setEditFlete] = useState(0);
  const [editImpuestos, setEditImpuestos] = useState(0);
  const [editObservaciones, setEditObservaciones] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const handleOpenEdit = (fac: any) => {
    setEditingFactura(fac);
    setEditNumeroFactura(fac.numeroFactura || "");
    setEditFechaEmision(fac.fechaEmision ? fac.fechaEmision.split("T")[0] : new Date().toISOString().split("T")[0]);
    setEditTotal(Number(fac.total) || 0);
    setEditFlete(Number(fac.flete) || 0);
    setEditImpuestos(Number(fac.impuestos) || 0);
    setEditObservaciones(fac.observaciones || "");
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingFactura) return;
    const facId = editingFactura.id || editingFactura.facturaId;
    setEditSubmitting(true);
    try {
      const nuevoAbonado = Number(editingFactura.montoAbonado) || 0;
      const nuevoSaldo = Math.max(0, editTotal - nuevoAbonado);
      let nuevoEstado = editingFactura.estado;
      if (nuevoSaldo <= 0 && editTotal > 0) nuevoEstado = "Pagada";
      else if (nuevoAbonado > 0) nuevoEstado = "Parcial";
      else nuevoEstado = "Pendiente";

      await actualizarFacturaProveedor(facId, {
        numeroFactura: editNumeroFactura,
        fechaEmision: editFechaEmision,
        total: editTotal,
        flete: editFlete,
        impuestos: editImpuestos,
        observaciones: editObservaciones,
        saldoPendiente: nuevoSaldo,
        estado: nuevoEstado
      });

      setEditModalOpen(false);
      setEditingFactura(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Error al actualizar factura.");
    } finally {
      setEditSubmitting(false);
    }
  };

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [facs, provs, emp] = await Promise.all([
        obtenerFacturasProveedor(),
        obtenerProveedores(),
        obtenerEmpresa()
      ]);
      setFacturas(facs);
      setProveedores(provs);
      setEmpresa(emp);
    } catch (err: any) {
      setError(err.message || (language === "es" ? "Error al cargar facturas." : "Error loading invoices."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleAnular = async (id: string) => {
    const msg = language === "es" 
      ? "¿Está seguro de anular esta factura de proveedor? Esto desvinculará los pedidos asociados y marcará la factura como anulada." 
      : "Are you sure you want to void this supplier invoice? This will unlink associated orders and mark the invoice as voided.";
    if (!window.confirm(msg)) return;
    try {
      await anularFacturaProveedor(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || (language === "es" ? "Error al anular la factura." : "Error voiding invoice."));
    }
  };

  const handleEliminar = async (id: string) => {
    const msg = language === "es" 
      ? "¿Está seguro de ELIMINAR permanentemente esta factura de proveedor? Esta acción no se puede deshacer." 
      : "Are you sure you want to PERMANENTLY DELETE this supplier invoice? This action cannot be undone.";
    if (!window.confirm(msg)) return;
    try {
      await eliminarFacturaProveedor(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || (language === "es" ? "Error al eliminar la factura." : "Error deleting invoice."));
    }
  };

  const getProveedorNombre = (id: string) => {
    const prov = proveedores.find(p => p.id === id);
    return prov ? prov.nombre : "Desconocido";
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'pagada':
        return <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold tracking-wider flex items-center gap-1 w-max"><CheckCircle2 className="h-3 w-3"/> PAGADA</span>;
      case 'parcial':
        return <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold tracking-wider flex items-center gap-1 w-max"><Clock className="h-3 w-3"/> PARCIAL</span>;
      case 'anulada':
        return <span className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold tracking-wider w-max">ANULADA</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md bg-slate-500/10 text-slate-300 border border-slate-500/20 text-[10px] font-bold tracking-wider flex items-center gap-1 w-max"><AlertCircle className="h-3 w-3"/> PENDIENTE</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <FileText className="h-6 w-6 text-indigo-400" />
            <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
              {language === "es" ? "Facturas de Proveedor (CxP)" : "Supplier Invoices (A/P)"}
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            {language === "es" 
              ? "Control de cuentas por pagar, facturas comerciales y conciliación de importaciones."
              : "Accounts payable control, commercial invoices, and import reconciliation."}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => router.push('/facturas-proveedor/pagos')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 font-semibold text-xs transition-all shadow-lg shadow-black/20 active:scale-95 cursor-pointer"
          >
            <DollarSign className="h-4 w-4 text-emerald-400" /> {language === "es" ? "Registrar Pago" : "Register Payment"}
          </button>
          <button 
            onClick={() => router.push('/facturas-proveedor/nueva')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-500/20 active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> {language === "es" ? "Cargar Factura" : "Upload Invoice"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-955/40 border border-rose-900/40 rounded-xl text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Tarjetas de Resumen Financiero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-amber-500/50">
          <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mb-1">Deuda Total Pendiente</p>
          <p className="text-2xl font-black text-slate-100">
            ${facturas.filter(f => f.estado !== 'Anulada').reduce((s, f) => s + (Number(f.saldoPendiente) || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-emerald-500/50">
          <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mb-1">Facturas Pagadas</p>
          <p className="text-2xl font-black text-slate-100">
            {facturas.filter(f => f.estado === 'Pagada').length}
          </p>
        </div>
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-indigo-500/50">
          <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mb-1">Total Facturado</p>
          <p className="text-2xl font-black text-slate-100">
            ${facturas.filter(f => f.estado !== 'Anulada').reduce((s, f) => s + (Number(f.total) || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-slate-400 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <span className="text-xs">{language === "es" ? "Cargando facturas..." : "Loading invoices..."}</span>
          </div>
        ) : facturas.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-center p-6">
            <FileText className="h-10 w-10 text-slate-600 mb-2" />
            <p className="text-xs">{language === "es" ? "No hay facturas de proveedores registradas." : "No supplier invoices registered."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 bg-slate-900/20 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4">{language === "es" ? "ID Sistema" : "System ID"}</th>
                  <th className="p-4">{language === "es" ? "Factura Nro" : "Invoice No."}</th>
                  <th className="p-4">{language === "es" ? "Proveedor" : "Supplier"}</th>
                  <th className="p-4">{language === "es" ? "Fecha Emisión" : "Date"}</th>
                  <th className="p-4 text-right">{language === "es" ? "Total Factura" : "Total Invoice"}</th>
                  <th className="p-4 text-right">{language === "es" ? "Saldo Pendiente" : "Balance Due"}</th>
                  <th className="p-4">{language === "es" ? "Estado" : "Status"}</th>
                  <th className="p-4 text-right">{language === "es" ? "Acciones" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {facturas.map((fac) => (
                  <tr key={fac.id || fac.facturaId} className="hover:bg-white/2 transition-colors">
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 font-mono font-bold text-[11px] border border-indigo-500/20">
                        {fac.facturaId || fac.id}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-200">{fac.numeroFactura || 'S/N'}</td>
                    <td className="p-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-500" />
                        <span className="font-semibold">{getProveedorNombre(fac.proveedorId)}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(fac.fechaEmision || fac.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono text-[11px] text-slate-300">
                      ${Number(fac.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right font-mono text-[11px] font-bold text-amber-400">
                      ${Number(fac.saldoPendiente).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4">
                      {getEstadoBadge(fac.estado)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end items-center">
                        <button
                          onClick={() => setPrintFactura(fac)}
                          className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/80 text-white border border-slate-700/80 transition-all cursor-pointer inline-flex items-center justify-center"
                          title={language === "es" ? "Imprimir/Previsualizar Factura" : "Print/Preview Invoice"}
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(fac)}
                          className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-all cursor-pointer inline-flex items-center justify-center"
                          title={language === "es" ? "Editar Factura" : "Edit Invoice"}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {fac.estado?.toLowerCase() !== 'anulada' && fac.estado?.toLowerCase() !== 'pagada' && (
                          <button
                            onClick={() => handleAnular(fac.id || fac.facturaId)}
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-all cursor-pointer inline-flex items-center justify-center"
                            title={language === "es" ? "Anular Factura" : "Void Invoice"}
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEliminar(fac.id || fac.facturaId)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer inline-flex items-center justify-center"
                          title={language === "es" ? "Eliminar Factura" : "Delete Invoice"}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Modal de Impresión */}
      {printFactura && empresa && (
        <PrintFacturaProveedor
          factura={printFactura}
          empresa={empresa}
          proveedores={proveedores}
          onClose={() => setPrintFactura(null)}
          language={language}
        />
      )}

      {/* Modal Editar Factura de Proveedor */}
      {editModalOpen && editingFactura && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                {language === "es" ? "Editar Factura de Proveedor" : "Edit Supplier Invoice"} — {editingFactura.facturaId || editingFactura.id}
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Número Factura / Ref</label>
                  <input
                    type="text"
                    value={editNumeroFactura}
                    onChange={(e) => setEditNumeroFactura(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs glass-input text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Fecha Emisión</label>
                  <input
                    type="date"
                    value={editFechaEmision}
                    onChange={(e) => setEditFechaEmision(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs glass-input text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-indigo-300 uppercase block mb-1">Total ($)</label>
                  <input
                    type="number"
                    value={editTotal}
                    onChange={(e) => setEditTotal(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs glass-input font-mono font-bold text-indigo-300 bg-indigo-500/5"
                    min="0" step="0.01"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Flete ($)</label>
                  <input
                    type="number"
                    value={editFlete}
                    onChange={(e) => setEditFlete(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs glass-input font-mono"
                    min="0" step="0.01"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Impuestos ($)</label>
                  <input
                    type="number"
                    value={editImpuestos}
                    onChange={(e) => setEditImpuestos(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs glass-input font-mono"
                    min="0" step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Observaciones</label>
                <textarea
                  value={editObservaciones}
                  onChange={(e) => setEditObservaciones(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs glass-input min-h-[60px] resize-none"
                />
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
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-amber-600/20 disabled:opacity-50 cursor-pointer"
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
