"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/context/LanguageContext";
import {
  Usuario,
  RolUsuario,
} from "@/types";
import {
  obtenerUsuarios,
  guardarUsuario,
  actualizarUsuario,
  cambiarPasswordUsuario,
  cambiarEstadoUsuario,
  eliminarUsuario,
} from "@/lib/api/usuarios";
import { MODULOS_SISTEMA, getPermisosPorDefecto } from "@/lib/permisos";
import {
  Users,
  ShieldCheck,
  Crown,
  UserCheck,
  UserX,
  Plus,
  Search,
  KeyRound,
  Edit2,
  Trash2,
  Lock,
  Mail,
  Phone,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  Power,
  Shield,
  User,
} from "lucide-react";

export default function UsuariosPage() {
  const { usuario: currentUser, isMaster, isAdmin } = useAuth();
  const { language } = useTranslation();
  const t = (es: string, en: string) => (language === "es" ? es : en);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState<string>("todos");

  // Modales
  const [modalUsuario, setModalUsuario] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);

  // Modal Cambiar Password Directo
  const [modalPassword, setModalPassword] = useState(false);
  const [usuarioPassword, setUsuarioPassword] = useState<Usuario | null>(null);
  const [nuevoPassword, setNuevoPassword] = useState("");
  const [showPassModal, setShowPassModal] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passMessage, setPassMessage] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);

  // Formulario Usuario State
  const [formData, setFormData] = useState({
    username: "",
    nombre: "",
    apellido: "",
    email: "",
    cargo: "",
    telefono: "",
    rol: "standard" as RolUsuario,
    permisos: getPermisosPorDefecto("standard"),
    password: "",
    activo: true,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [showFormPassword, setShowFormPassword] = useState(false);

  const cargarLista = async () => {
    setLoading(true);
    try {
      const data = await obtenerUsuarios();
      setUsuarios(data);
    } catch (e) {
      console.error("Error al cargar usuarios:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarLista();
  }, []);

  const abrirModalCrear = () => {
    setUsuarioEditando(null);
    setFormData({
      username: "",
      nombre: "",
      apellido: "",
      email: "",
      cargo: "",
      telefono: "",
      rol: "standard",
      permisos: getPermisosPorDefecto("standard"),
      password: "",
      activo: true,
    });
    setFormError(null);
    setModalUsuario(true);
  };

  const abrirModalEditar = (u: Usuario) => {
    setUsuarioEditando(u);
    setFormData({
      username: u.username || u.email?.split("@")[0] || "",
      nombre: u.nombre,
      apellido: u.apellido || "",
      email: u.email || "",
      cargo: u.cargo || "",
      telefono: u.telefono || "",
      rol: u.rol,
      permisos: u.permisos || getPermisosPorDefecto(u.rol),
      password: u.password || "",
      activo: u.activo,
    });
    setFormError(null);
    setModalUsuario(true);
  };

  const abrirModalPassword = (u: Usuario) => {
    setUsuarioPassword(u);
    setNuevoPassword("");
    setPassMessage(null);
    setModalPassword(true);
  };

  const handleTogglePermiso = (ruta: string) => {
    setFormData((prev) => {
      const exists = prev.permisos.includes(ruta);
      const nuevos = exists
        ? prev.permisos.filter((p) => p !== ruta)
        : [...prev.permisos, ruta];
      return { ...prev, permisos: nuevos };
    });
  };

  const handleSeleccionarTodosPermisos = () => {
    setFormData((prev) => ({
      ...prev,
      permisos: MODULOS_SISTEMA.map((m) => m.ruta),
    }));
  };

  const handleLimpiarPermisos = () => {
    setFormData((prev) => ({
      ...prev,
      permisos: ["/"],
    }));
  };

  const handleGuardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanUser = formData.username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");

    if (!cleanUser) {
      setFormError("El nombre de usuario es obligatorio (ej. admin, julio, carlos).");
      return;
    }

    if (!formData.nombre.trim()) {
      setFormError("El nombre completo es obligatorio.");
      return;
    }

    if (!usuarioEditando && (!formData.password || formData.password.length < 4)) {
      setFormError("La contraseña inicial debe tener al menos 4 caracteres.");
      return;
    }

    // Regla de seguridad: Administradores no pueden crear o promover a Master
    if (!isMaster && formData.rol === "master") {
      setFormError("Solo un usuario con rol Master puede asignar o crear cuentas Master.");
      return;
    }

    // Verificar si el username ya está en uso por otro usuario
    const existente = usuarios.find(
      (u) =>
        u.username?.toLowerCase() === cleanUser &&
        (!usuarioEditando || u.id !== usuarioEditando.id)
    );
    if (existente) {
      setFormError(`El nombre de usuario "${cleanUser}" ya está en uso. Elige otro.`);
      return;
    }

    setFormLoading(true);
    try {
      if (usuarioEditando) {
        // Actualizar usuario existente
        await actualizarUsuario(usuarioEditando.id, {
          username: cleanUser,
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: formData.email || `${cleanUser}@maximport.local`,
          cargo: formData.cargo,
          telefono: formData.telefono,
          rol: formData.rol,
          permisos: formData.rol === "standard" ? formData.permisos : getPermisosPorDefecto(formData.rol),
          activo: formData.activo,
          ...(formData.password ? { password: formData.password } : {}),
        });
      } else {
        // Crear nuevo usuario
        const newId = "usr_" + Date.now();
        await guardarUsuario(newId, {
          username: cleanUser,
          password: formData.password,
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: formData.email,
          cargo: formData.cargo,
          telefono: formData.telefono,
          rol: formData.rol,
          permisos: formData.rol === "standard" ? formData.permisos : getPermisosPorDefecto(formData.rol),
          activo: formData.activo,
        });
      }

      setModalUsuario(false);
      await cargarLista();
    } catch (err: unknown) {
      console.error("Error al guardar usuario:", err);
      const e = err as { message?: string };
      setFormError(e.message || "Error al procesar el usuario.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleEstado = async (u: Usuario) => {
    if (u.rol === "master" && u.id === currentUser?.id) {
      alert("No puedes desactivar tu propia cuenta Master.");
      return;
    }
    if (u.rol === "master" && !isMaster) {
      alert("Solo un usuario Master puede modificar el estado de otra cuenta Master.");
      return;
    }

    try {
      await cambiarEstadoUsuario(u.id, !u.activo);
      await cargarLista();
    } catch (e) {
      console.error("Error al cambiar estado:", e);
      alert("Error al actualizar el estado del usuario.");
    }
  };

  const handleEliminarUsuario = async (u: Usuario) => {
    if (u.id === currentUser?.id) {
      alert("No puedes eliminar tu propia cuenta.");
      return;
    }
    if (u.rol === "master" && !isMaster) {
      alert("Solo un usuario Master puede eliminar cuentas Master.");
      return;
    }

    const confirmar = confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario ${u.nombre} (@${u.username})?`);
    if (!confirmar) return;

    try {
      await eliminarUsuario(u.id);
      await cargarLista();
    } catch (e) {
      console.error("Error al eliminar usuario:", e);
      alert("Error al eliminar el usuario.");
    }
  };

  const handleGuardarNuevaPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioPassword) return;

    if (!nuevoPassword || nuevoPassword.length < 4) {
      setPassMessage({
        tipo: "error",
        texto: "La contraseña debe tener al menos 4 caracteres.",
      });
      return;
    }

    setPassLoading(true);
    setPassMessage(null);

    try {
      await cambiarPasswordUsuario(usuarioPassword.id, nuevoPassword);
      setPassMessage({
        tipo: "success",
        texto: `¡Contraseña actualizada exitosamente para @${usuarioPassword.username}! Ahora puede iniciar sesión con esta nueva clave.`,
      });
      await cargarLista();
      setTimeout(() => {
        setModalPassword(false);
      }, 1500);
    } catch (err: unknown) {
      console.error("Error al cambiar contraseña:", err);
      const e = err as { message?: string };
      setPassMessage({
        tipo: "error",
        texto: e.message || "Error al actualizar la contraseña.",
      });
    } finally {
      setPassLoading(false);
    }
  };

  // Filtrado de usuarios
  const usuariosFiltrados = usuarios.filter((u) => {
    const uUser = (u.username || "").toLowerCase();
    const uNombre = (u.nombre || "").toLowerCase();
    const uEmail = (u.email || "").toLowerCase();
    const uCargo = (u.cargo || "").toLowerCase();
    const b = busqueda.toLowerCase();

    const cumpleTexto = uUser.includes(b) || uNombre.includes(b) || uEmail.includes(b) || uCargo.includes(b);
    const cumpleRol = filtroRol === "todos" ? true : u.rol === filtroRol;
    return cumpleTexto && cumpleRol;
  });

  // Métricas
  const totalUsuarios = usuarios.length;
  const countMaster = usuarios.filter((u) => u.rol === "master").length;
  const countAdmin = usuarios.filter((u) => u.rol === "admin").length;
  const countStandard = usuarios.filter((u) => u.rol === "standard").length;
  const countActivos = usuarios.filter((u) => u.activo).length;

  return (
    <div className="space-y-6">
      {/* Encabezado del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-100 uppercase tracking-tight">
                {t("Usuarios y Permisos", "Users & Permissions")}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {t(
                  "Administración de usuarios, claves directas, roles (Master, Admin, Estándar) y permisos",
                  "Manage usernames, direct passwords, roles (Master, Admin, Standard) and access"
                )}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={abrirModalCrear}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t("Crear Nuevo Usuario", "Create New User")}</span>
        </button>
      </div>

      {/* KPI Cards de Roles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t("Total Usuarios", "Total Users")}
            </p>
            <p className="text-2xl font-black text-slate-100 mt-1">{totalUsuarios}</p>
            <p className="text-[10px] text-emerald-400 font-mono mt-0.5">{countActivos} activos</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/80 text-slate-300">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between border-l-4 border-amber-500">
          <div>
            <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Crown className="w-3.5 h-3.5" />
              Master
            </p>
            <p className="text-2xl font-black text-slate-100 mt-1">{countMaster}</p>
            <p className="text-[10px] text-slate-400">{t("Control Total", "Full Control")}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Crown className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between border-l-4 border-indigo-500">
          <div>
            <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              Administradores
            </p>
            <p className="text-2xl font-black text-slate-100 mt-1">{countAdmin}</p>
            <p className="text-[10px] text-slate-400">{t("Operaciones ERP", "ERP Operations")}</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between border-l-4 border-slate-600">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5" />
              Estándar
            </p>
            <p className="text-2xl font-black text-slate-100 mt-1">{countStandard}</p>
            <p className="text-[10px] text-slate-400">{t("Permisos Granulares", "Granular Perms")}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800 text-slate-400">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="glass-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={t("Buscar por usuario, nombre o cargo...", "Search by user, name or position...")}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs glass-input text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-bold shrink-0">{t("Rol:", "Role:")}</span>
          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
          >
            <option value="todos">{t("Todos los roles", "All roles")}</option>
            <option value="master">Master</option>
            <option value="admin">{t("Administrador", "Administrator")}</option>
            <option value="standard">{t("Usuario Estándar", "Standard User")}</option>
          </select>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400 font-mono">{t("Cargando usuarios...", "Loading users...")}</p>
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-300">{t("No se encontraron usuarios", "No users found")}</p>
            <p className="text-xs text-slate-500 mt-1">{t("Crea tu primer usuario con el botón superior", "Create your first user with the button above")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">{t("Usuario / Acceso", "Username / Access")}</th>
                  <th className="py-3.5 px-4">{t("Nombre y Apellido", "Full Name")}</th>
                  <th className="py-3.5 px-4">{t("Rol / Privilegio", "Role / Privilege")}</th>
                  <th className="py-3.5 px-4">{t("Módulos Asignados", "Assigned Modules")}</th>
                  <th className="py-3.5 px-4 text-center">{t("Estado", "Status")}</th>
                  <th className="py-3.5 px-4 text-right">{t("Acciones", "Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usuariosFiltrados.map((u) => {
                  const esMasterUser = u.rol === "master";
                  const esAdminUser = u.rol === "admin";
                  const displayUsername = u.username || u.email?.split("@")[0] || "usuario";
                  const iniciales = (u.nombre.charAt(0) + (u.apellido?.charAt(0) || "")).toUpperCase();

                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Usuario */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            esMasterUser
                              ? "bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20"
                              : esAdminUser
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                              : "bg-slate-800 text-slate-300"
                          }`}>
                            {iniciales || "U"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-100 flex items-center gap-1.5 font-mono text-xs text-indigo-300">
                              @{displayUsername}
                              {u.id === currentUser?.id && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 bg-indigo-500/25 text-indigo-200 rounded font-mono">
                                  {t("TÚ", "YOU")}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">{u.cargo || t("Sin cargo", "No position")}</div>
                          </div>
                        </div>
                      </td>

                      {/* Nombre Completo */}
                      <td className="py-3.5 px-4 font-bold text-slate-200">
                        {u.nombre} {u.apellido}
                      </td>

                      {/* Rol */}
                      <td className="py-3.5 px-4">
                        {esMasterUser ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <Crown className="w-3 h-3" />
                            MASTER
                          </span>
                        ) : esAdminUser ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            <ShieldCheck className="w-3 h-3" />
                            ADMIN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                            <Users className="w-3 h-3" />
                            ESTÁNDAR
                          </span>
                        )}
                      </td>

                      {/* Módulos */}
                      <td className="py-3.5 px-4">
                        {esMasterUser || esAdminUser ? (
                          <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t("Todos los módulos (15)", "All modules (15)")}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            <strong className="text-slate-200">{u.permisos?.length || 0}</strong> {t("módulos autorizados", "authorized modules")}
                          </span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 text-center">
                        {u.activo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <UserCheck className="w-3 h-3" />
                            {t("Activo", "Active")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            <UserX className="w-3 h-3" />
                            {t("Inactivo", "Inactive")}
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Cambiar Contraseña Directamente */}
                          <button
                            title={t("Cambiar contraseña directamente", "Change password directly")}
                            onClick={() => abrirModalPassword(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Editar Usuario */}
                          <button
                            title={t("Editar datos y permisos", "Edit user and permissions")}
                            onClick={() => abrirModalEditar(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Activar / Desactivar */}
                          <button
                            title={u.activo ? t("Desactivar cuenta", "Deactivate account") : t("Activar cuenta", "Activate account")}
                            onClick={() => handleToggleEstado(u)}
                            disabled={esMasterUser && u.id === currentUser?.id}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              u.activo
                                ? "text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                                : "text-emerald-400 hover:bg-emerald-500/10"
                            } disabled:opacity-30`}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          {/* Eliminar */}
                          <button
                            title={t("Eliminar usuario", "Delete user")}
                            onClick={() => handleEliminarUsuario(u)}
                            disabled={u.id === currentUser?.id || (esMasterUser && !isMaster)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Usuario */}
      {modalUsuario && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 pt-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {usuarioEditando ? t("Editar Usuario", "Edit User") : t("Crear Nuevo Usuario", "Create New User")}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t("Establece el nombre de usuario, contraseña, rol y módulos permitidos", "Set username, password, role and allowed modules")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalUsuario(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleGuardarUsuario} className="p-6 space-y-5">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Datos de Acceso */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  {t("Credenciales de Acceso (Usuario y Contraseña)", "Access Credentials (User & Password)")}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {t("Nombre de Usuario (Login)", "Username (Login)")} *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 font-mono text-xs font-bold">@</span>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, "") })}
                        required
                        autoCapitalize="none"
                        autoCorrect="off"
                        placeholder="ej. julio, admin, operador"
                        className="w-full pl-8 pr-3 py-2 rounded-xl text-xs glass-input text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {usuarioEditando ? t("Nueva Contraseña (Opcional)", "New Password (Optional)") : t("Contraseña de Acceso", "Password")} *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type={showFormPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={!usuarioEditando}
                        placeholder={usuarioEditando ? t("Dejar en blanco para mantener", "Leave blank to keep") : t("Mínimo 4 caracteres", "Min 4 chars")}
                        className="w-full pl-8 pr-9 py-2 rounded-xl text-xs glass-input text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="absolute inset-y-0 right-2.5 flex items-center text-slate-500 hover:text-slate-300"
                      >
                        {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Datos Personales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t("Nombre", "First Name")} *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    placeholder="Ej. Julio"
                    className="w-full px-3.5 py-2 rounded-xl text-xs glass-input text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t("Apellido", "Last Name")}
                  </label>
                  <input
                    type="text"
                    value={formData.apellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                    placeholder="Ej. Flores"
                    className="w-full px-3.5 py-2 rounded-xl text-xs glass-input text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t("Cargo / Puesto", "Job Title")}
                  </label>
                  <input
                    type="text"
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    placeholder="Ej. Gerente de Operaciones"
                    className="w-full px-3.5 py-2 rounded-xl text-xs glass-input text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t("Teléfono (Opcional)", "Phone (Optional)")}
                  </label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="+58 424 0000000"
                    className="w-full px-3.5 py-2 rounded-xl text-xs glass-input text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Selector de Rol */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  {t("Rol y Nivel de Privilegios", "Role & Privilege Level")} *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Master */}
                  <label
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      formData.rol === "master"
                        ? "bg-amber-500/10 border-amber-500/60 shadow-md shadow-amber-950/20"
                        : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                    } ${!isMaster ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Crown className={`w-4 h-4 ${formData.rol === "master" ? "text-amber-400" : "text-slate-500"}`} />
                        <span className="text-xs font-bold text-slate-100">Master</span>
                      </div>
                      <input
                        type="radio"
                        name="rol"
                        value="master"
                        disabled={!isMaster}
                        checked={formData.rol === "master"}
                        onChange={() => setFormData({ ...formData, rol: "master", permisos: getPermisosPorDefecto("master") })}
                        className="text-amber-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      {t("Control total del sistema y de todos los usuarios.", "Full control over entire ERP & users.")}
                    </p>
                  </label>

                  {/* Admin */}
                  <label
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      formData.rol === "admin"
                        ? "bg-indigo-500/10 border-indigo-500/60 shadow-md shadow-indigo-950/20"
                        : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className={`w-4 h-4 ${formData.rol === "admin" ? "text-indigo-400" : "text-slate-500"}`} />
                        <span className="text-xs font-bold text-slate-100">Administrador</span>
                      </div>
                      <input
                        type="radio"
                        name="rol"
                        value="admin"
                        checked={formData.rol === "admin"}
                        onChange={() => setFormData({ ...formData, rol: "admin", permisos: getPermisosPorDefecto("admin") })}
                        className="text-indigo-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      {t("Acceso a todos los módulos operativos y creación de usuarios estándar.", "All ERP operational modules & standard user management.")}
                    </p>
                  </label>

                  {/* Estándar */}
                  <label
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      formData.rol === "standard"
                        ? "bg-sky-500/10 border-sky-500/60 shadow-md shadow-sky-950/20"
                        : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Users className={`w-4 h-4 ${formData.rol === "standard" ? "text-sky-400" : "text-slate-500"}`} />
                        <span className="text-xs font-bold text-slate-100">Estándar</span>
                      </div>
                      <input
                        type="radio"
                        name="rol"
                        value="standard"
                        checked={formData.rol === "standard"}
                        onChange={() => setFormData({ ...formData, rol: "standard" })}
                        className="text-sky-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      {t("Acceso selectivo únicamente a los módulos marcados.", "Selective access only to checked modules.")}
                    </p>
                  </label>
                </div>
              </div>

              {/* Matriz de Permisos por Módulo (Solo para rol Estándar) */}
              {formData.rol === "standard" && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">
                        {t("Módulos Permitidos para este Usuario", "Allowed Modules for this User")}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        {t("Marca los módulos a los que este usuario tendrá acceso", "Check the modules this user is authorized to access")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSeleccionarTodosPermisos}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                      >
                        {t("Marcar Todos", "Select All")}
                      </button>
                      <span className="text-slate-700">·</span>
                      <button
                        type="button"
                        onClick={handleLimpiarPermisos}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {t("Limpiar", "Clear")}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {MODULOS_SISTEMA.map((m) => {
                      const checked = formData.permisos.includes(m.ruta);
                      return (
                        <label
                          key={m.key}
                          className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 cursor-pointer transition-all ${
                            checked
                              ? "bg-indigo-500/10 border-indigo-500/40 text-slate-200"
                              : "bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleTogglePermiso(m.ruta)}
                            className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="min-w-0">
                            <div className="font-bold truncate text-[11px]">
                              {language === "es" ? m.nombreEs : m.nombreEn}
                            </div>
                            <div className="text-[9.5px] text-slate-500 truncate">{m.ruta}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalUsuario(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {t("Cancelar", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                >
                  {formLoading
                    ? t("Guardando...", "Saving...")
                    : usuarioEditando
                    ? t("Actualizar Usuario", "Update User")
                    : t("Crear Usuario", "Create User")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cambiar Password Directamente */}
      {modalPassword && usuarioPassword && (
        <div className="fixed inset-0 z-[85] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setModalPassword(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  {t("Modificar Contraseña", "Change Password")}
                </h3>
                <p className="text-xs text-indigo-400 font-mono">@{usuarioPassword.username} ({usuarioPassword.nombre})</p>
              </div>
            </div>

            {passMessage && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                  passMessage.tipo === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
                }`}
              >
                {passMessage.tipo === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{passMessage.texto}</span>
              </div>
            )}

            <form onSubmit={handleGuardarNuevaPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {t("Nueva Contraseña de Acceso", "New Access Password")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassModal ? "text" : "password"}
                    value={nuevoPassword}
                    onChange={(e) => setNuevoPassword(e.target.value)}
                    required
                    minLength={4}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl text-xs glass-input text-slate-100 focus:outline-none focus:border-indigo-500/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassModal(!showPassModal)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassModal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalPassword(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  {t("Cancelar", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={passLoading}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                >
                  {passLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>{t("Guardando...", "Saving...")}</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{t("Guardar Contraseña", "Save Password")}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
