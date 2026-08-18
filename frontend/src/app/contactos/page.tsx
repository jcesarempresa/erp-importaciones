"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Building2, 
  Plus, 
  Mail, 
  Phone, 
  MapPin, 
  Search,
  AlertTriangle,
  Edit,
  Trash2,
  X,
  Loader2,
  ShieldAlert
} from "lucide-react";
import { 
  obtenerClientes, crearCliente, editarCliente, eliminarCliente,
  obtenerProveedores, crearProveedor 
} from "@/lib/api/importaciones";
import { Cliente, Proveedor } from "@/types";
import { useTranslation } from "@/context/LanguageContext";

type ContactoItem = Cliente | Proveedor;

export default function ContactosPage() {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<"clientes" | "proveedores">("clientes");
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal de creación/edición
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Campos del formulario
  const [nombre, setNombre] = useState("");
  const [rif, setRif] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [direccionDespacho, setDireccionDespacho] = useState("");
  const [requiereRif, setRequiereRif] = useState(true);

  // Modal de confirmación de eliminación
  const [deletingItem, setDeletingItem] = useState<ContactoItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const [listClients, listProviders] = await Promise.all([
        obtenerClientes(),
        obtenerProveedores()
      ]);
      setClientes(listClients);
      setProveedores(listProviders);
    } catch (err: any) {
      setError(err.message || (language === "es" ? "Error al cargar contactos." : "Error loading contacts."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const resetForm = () => {
    setNombre(""); setRif(""); setEmail(""); setTelefono(""); setDireccion(""); setDireccionDespacho("");
    setRequiereRif(true);
    setEditingId(null); setFormError(null);
  };

  const openNew = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: ContactoItem) => {
    setEditingId(item.id || null);
    setNombre(item.nombre);
    setRif(item.rif);
    setEmail(item.email || "");
    setTelefono(item.telefono || "");
    setDireccion(item.direccion || "");
    setDireccionDespacho((item as Cliente).direccionDespacho || "");
    setRequiereRif(!!item.rif);
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    if (requiereRif && !rif.trim()) {
      setFormError(language === "es" ? "El RIF/Cédula es requerido." : "RIF/ID is required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const finalRif = requiereRif ? rif : "";
    try {
      const datos = activeTab === "clientes" 
        ? { nombre, rif: finalRif, email, telefono, direccion, direccionDespacho } 
        : { nombre, rif: finalRif, email, telefono, direccion };
      if (editingId) {
        // Modo edición — solo clientes por ahora
        await editarCliente(editingId, datos);
      } else {
        if (activeTab === "clientes") {
          await crearCliente(datos);
        } else {
          await crearProveedor(datos);
        }
      }
      setShowModal(false);
      resetForm();
      await cargarDatos();
    } catch (err: any) {
      setFormError(err.message || (language === "es" ? "Error al guardar el contacto." : "Error saving contact."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem?.id) return;
    setDeleteSubmitting(true);
    try {
      await eliminarCliente(deletingItem.id);
      setDeletingItem(null);
      await cargarDatos();
    } catch (err: any) {
      alert(err.message || (language === "es" ? "Error al eliminar el cliente." : "Error deleting customer."));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const listadoFiltrado: ContactoItem[] = (activeTab === "clientes" ? clientes : proveedores).filter(c =>
    c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.rif.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-indigo-500" />
            {language === "es" ? "Clientes y Proveedores" : "Customers & Suppliers"}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {language === "es" 
              ? "Gestión centralizada del directorio de contactos comerciales de Maxicom."
              : "Centralized management of Maxicom's commercial contacts directory."}
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          {language === "es" ? "Registrar" : "Register"} {activeTab === "clientes" ? (language === "es" ? "Cliente" : "Customer") : (language === "es" ? "Proveedor" : "Supplier")}
        </button>
      </div>

      {/* Tabs y Buscador */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 w-full sm:w-auto">
          <button
            onClick={() => { setActiveTab("clientes"); setSearchQuery(""); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === "clientes"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Users className="h-4 w-4" />
            {language === "es" ? "Clientes" : "Customers"} ({clientes.length})
          </button>
          <button
            onClick={() => { setActiveTab("proveedores"); setSearchQuery(""); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === "proveedores"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <Building2 className="h-4 w-4" />
            {language === "es" ? "Proveedores" : "Suppliers"} ({proveedores.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder={language === "es" ? "Buscar por nombre o RIF..." : "Search by name or Tax ID..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="glass-panel rounded-2xl border border-slate-800/50 p-6 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            <p className="text-slate-400 text-sm">
              {language === "es" ? "Cargando directorio de " : "Loading directory of "}
              {activeTab === "clientes" ? (language === "es" ? "clientes" : "customers") : (language === "es" ? "proveedores" : "suppliers")}...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-rose-400 gap-2">
            <AlertTriangle className="h-8 w-8" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : listadoFiltrado.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 font-medium">
              {language === "es" ? "No se encontraron " : "No "}
              {activeTab === "clientes" ? (language === "es" ? "clientes" : "customers") : (language === "es" ? "proveedores" : "suppliers")}
              {language === "es" ? "" : " found"}
            </p>
            <p className="text-slate-500 text-xs mt-1">
              {language === "es" ? "Registra un nuevo " : "Register a new "}
              {activeTab === "clientes" ? (language === "es" ? "cliente" : "customer") : (language === "es" ? "proveedor" : "supplier")}
              {language === "es" ? " usando el botón superior." : " using the top button."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/60 text-slate-400 text-[11px] font-semibold tracking-wider uppercase">
                  <th className="pb-3 pl-2">{language === "es" ? "Nombre / RIF" : "Name / Tax ID"}</th>
                  <th className="pb-3">{language === "es" ? "Contacto" : "Contact"}</th>
                  <th className="pb-3">{language === "es" ? "Dirección" : "Address"}</th>
                  <th className="pb-3">{language === "es" ? "Fecha Registro" : "Registration Date"}</th>
                  <th className="pb-3 text-right pr-2">{language === "es" ? "Acciones" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {listadoFiltrado.map((item) => (
                  <tr key={item.id} className="text-slate-200 text-sm hover:bg-white/5 transition-colors group">
                    <td className="py-4 pl-2">
                      <div className="font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors">{item.nombre}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                        {item.codigo && <span className="bg-slate-800/50 px-1.5 py-0.5 rounded text-[10px] border border-slate-700/50">{item.codigo}</span>}
                        {item.rif ? item.rif : <span className="text-slate-600 italic">{language === "es" ? "Sin RIF" : "No Tax ID"}</span>}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-col gap-1">
                        {item.email && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Mail className="h-3 w-3 text-slate-500" />{item.email}
                          </div>
                        )}
                        {item.telefono && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Phone className="h-3 w-3 text-slate-500" />{item.telefono}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 text-xs text-slate-400 max-w-xs">
                      <div className="flex items-start gap-1">
                        <MapPin className="h-3 w-3 text-slate-500 mt-0.5 shrink-0" />
                        <span className="truncate">{item.direccion || (language === "es" ? "No especificada" : "Not specified")}</span>
                      </div>
                    </td>
                    <td className="py-4 text-xs text-slate-500">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : (language === "es" ? "Histórico" : "Historical")}
                    </td>
                    <td className="py-4 pr-2">
                      <div className="flex gap-2 justify-end items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/40 text-sky-400 hover:text-sky-300 transition-all cursor-pointer"
                          title={language === "es" ? "Editar" : "Edit"}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        {activeTab === "clientes" && (
                          <button
                            onClick={() => setDeletingItem(item)}
                            className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 hover:text-rose-300 transition-all cursor-pointer"
                            title={language === "es" ? "Eliminar (se guarda en historial)" : "Delete (saved in history)"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Modal de Creación / Edición */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-800/80 p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  {activeTab === "clientes" ? <Users className="h-5 w-5 text-indigo-400" /> : <Building2 className="h-5 w-5 text-indigo-400" />}
                  {editingId
                    ? `${language === "es" ? "Editar" : "Edit"} ${activeTab === "clientes" ? (language === "es" ? "Cliente" : "Customer") : (language === "es" ? "Proveedor" : "Supplier")}`
                    : `${language === "es" ? "Registrar Nuevo" : "Register New"} ${activeTab === "clientes" ? (language === "es" ? "Cliente" : "Customer") : (language === "es" ? "Proveedor" : "Supplier")}`}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {language === "es" ? "Completa los campos comerciales requeridos." : "Complete the required commercial fields."}
                </p>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">{language === "es" ? "Nombre Comercial *" : "Business Name *"}</label>
                  <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)}
                    placeholder={language === "es" ? "Ej. Distribuidora Central C.A." : "e.g. Central Distributor Inc."}
                    className="glass-input w-full px-3 py-2 rounded-xl text-slate-200 text-sm focus:outline-none" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-400">{language === "es" ? "RIF / Cédula" : "Tax ID / ID"} {requiereRif && "*"}</label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={requiereRif} 
                        onChange={e => setRequiereRif(e.target.checked)}
                        className="w-3 h-3 accent-indigo-500 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500">{language === "es" ? "Requerir" : "Require"}</span>
                    </label>
                  </div>
                  <input type="text" value={rif} onChange={(e) => setRif(e.target.value)} required={requiereRif} disabled={!requiereRif}
                    placeholder={requiereRif ? "Ej. J-12345678-9" : (language === "es" ? "No aplica" : "N/A")}
                    className={`glass-input w-full px-3 py-2 rounded-xl text-slate-200 text-sm focus:outline-none ${!requiereRif ? 'opacity-50 cursor-not-allowed bg-slate-900/50' : ''}`} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">{language === "es" ? "Correo Electrónico" : "Email Address"}</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="glass-input w-full px-3 py-2 rounded-xl text-slate-200 text-sm focus:outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">{language === "es" ? "Teléfono" : "Phone Number"}</label>
                  <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Ej. 0249-1234567"
                    className="glass-input w-full px-3 py-2 rounded-xl text-slate-200 text-sm focus:outline-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">{language === "es" ? "Dirección Física / Fiscal" : "Physical / Fiscal Address"}</label>
                <textarea value={direccion} onChange={(e) => setDireccion(e.target.value)}
                  placeholder={language === "es" ? "Calle, Local, Ciudad, Estado..." : "Street, Unit, City, State..."} rows={2}
                  className="glass-input w-full px-3 py-2 rounded-xl text-slate-200 text-sm focus:outline-none resize-none" />
              </div>

              {activeTab === "clientes" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">{language === "es" ? "Dirección de Despacho" : "Shipping Address"}</label>
                  <textarea value={direccionDespacho} onChange={(e) => setDireccionDespacho(e.target.value)}
                    placeholder={language === "es" ? "Dirección para entregas..." : "Shipping address..."} rows={2}
                    className="glass-input w-full px-3 py-2 rounded-xl text-slate-200 text-sm focus:outline-none resize-none" />
                </div>
              )}

              {formError && (
                <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/60">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors text-sm font-medium">
                  {language === "es" ? "Cancelar" : "Cancel"}
                </button>
                <button type="submit" disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId 
                    ? (language === "es" ? "Guardar Cambios" : "Save Changes") 
                    : (language === "es" ? "Registrar" : "Register")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-rose-900/50 p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 shrink-0">
                <ShieldAlert className="h-6 w-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">{language === "es" ? "Eliminar cliente" : "Delete customer"}</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {language === "es" ? "¿Estás seguro de eliminar a " : "Are you sure you want to delete "}<strong className="text-slate-200">{deletingItem.nombre}</strong>{language === "es" ? "?" : "?"}
                </p>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                  <ShieldAlert className="h-3 w-3 text-amber-500" />
                  {language === "es" ? "El registro se moverá a " : "The record will be moved to "}
                  <span className="text-amber-400 font-mono">clientes_eliminados</span>
                  {language === "es" ? " en Firestore para mantener el historial." : " in Firestore to keep the history."}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-800/60">
              <button onClick={() => setDeletingItem(null)} disabled={deleteSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors text-sm font-medium">
                {language === "es" ? "Cancelar" : "Cancel"}
              </button>
              <button onClick={handleDelete} disabled={deleteSubmitting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm transition-all flex items-center gap-1.5 disabled:opacity-50">
                {deleteSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {language === "es" ? "Sí, eliminar" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
