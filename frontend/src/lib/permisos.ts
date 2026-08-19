import { ModuloPermiso, RolUsuario } from "@/types";

export const MODULOS_SISTEMA: ModuloPermiso[] = [
  {
    key: "dashboard",
    ruta: "/",
    nombreEs: "Panel de Control (Dashboard)",
    nombreEn: "Dashboard",
    descripcion: "Vista general de estadísticas, métricas y resumen de operaciones",
  },
  {
    key: "contactos",
    ruta: "/contactos",
    nombreEs: "Clientes y Proveedores",
    nombreEn: "Contacts & Partners",
    descripcion: "Directorio maestro de clientes y proveedores",
  },
  {
    key: "pedidos_entrantes",
    ruta: "/pedidos-entrantes",
    nombreEs: "Solicitudes de Clientes (RFQ)",
    nombreEn: "Customer Requests",
    descripcion: "Requerimientos iniciales y presupuestos entrantes",
  },
  {
    key: "cotizaciones",
    ruta: "/cotizaciones",
    nombreEs: "Cotizaciones (Presupuestos)",
    nombreEn: "Quotes & Estimates",
    descripcion: "Emisión de cotizaciones, precios de venta y búsqueda con IA",
  },
  {
    key: "ordenes_cliente",
    ruta: "/ordenes-cliente",
    nombreEs: "Órdenes de Clientes",
    nombreEn: "Customer Orders",
    descripcion: "Seguimiento de pedidos en firme, asignación de proveedores y estados",
  },
  {
    key: "pedidos_proveedor",
    ruta: "/pedidos-proveedor",
    nombreEs: "Pedidos a Proveedores (PO)",
    nombreEn: "Supplier Purchase Orders",
    descripcion: "Órdenes de compra internacionales a fábricas y suplidores",
  },
  {
    key: "recepcion",
    ruta: "/importaciones/recepcion",
    nombreEs: "Recepción de Contenedores",
    nombreEn: "Container Reception",
    descripcion: "Registro de llegada de contenedores y descargo en aduana/puerto",
  },
  {
    key: "almacen",
    ruta: "/almacen",
    nombreEs: "Almacén e Inventario",
    nombreEn: "Warehouse & Inventory",
    descripcion: "Control de stock disponible, valorización y movimientos",
  },
  {
    key: "despachos",
    ruta: "/despachos",
    nombreEs: "Despachos y Entregas",
    nombreEn: "Deliveries & Shipments",
    descripcion: "Notas de entrega, salidas de almacén y despachos parciales",
  },
  {
    key: "facturacion",
    ruta: "/facturacion",
    nombreEs: "Facturación y Cuentas por Cobrar (CxC)",
    nombreEn: "Billing & Accounts Receivable",
    descripcion: "Emisión de facturas fiscales/comerciales, abonos y control de pagos",
  },
  {
    key: "facturas_proveedor",
    ruta: "/facturas-proveedor",
    nombreEs: "Facturas de Proveedor (CxP)",
    nombreEn: "Accounts Payable (AP)",
    descripcion: "Control de pagos a proveedores y cuentas por pagar",
  },
  {
    key: "reportes",
    ruta: "/reportes",
    nombreEs: "Reportes y Análisis Empresarial",
    nombreEn: "Reports & Analytics",
    descripcion: "Análisis de rentabilidad, antigüedad de saldos, clientes y productos",
  },
  {
    key: "importar",
    ruta: "/importar",
    nombreEs: "Importar Historial (Excel)",
    nombreEn: "Import History",
    descripcion: "Carga masiva de datos y migración de historiales",
  },
  {
    key: "configuracion",
    ruta: "/configuracion",
    nombreEs: "Configuración de Empresa",
    nombreEn: "Company Settings",
    descripcion: "Datos fiscales, logo, cuentas bancarias y parámetros del sistema",
  },
  {
    key: "usuarios",
    ruta: "/usuarios",
    nombreEs: "Gestión de Usuarios y Permisos",
    nombreEn: "User Management & RBAC",
    descripcion: "Control de acceso, roles Master/Admin/Estándar y contraseñas",
  },
];

/**
 * Retorna las rutas autorizadas por defecto para un rol dado.
 */
export function getPermisosPorDefecto(rol: RolUsuario): string[] {
  if (rol === "master") {
    // Master tiene todas las rutas
    return MODULOS_SISTEMA.map((m) => m.ruta);
  }
  if (rol === "admin") {
    // Administrador tiene acceso a todo excepto configuraciones master delicadas
    return MODULOS_SISTEMA.map((m) => m.ruta);
  }
  // Usuario estándar por defecto: Dashboard, Contactos, Cotizaciones, Órdenes
  return ["/", "/contactos", "/cotizaciones", "/ordenes-cliente"];
}

/**
 * Verifica si un usuario tiene permiso para acceder a una ruta determinada.
 */
export function tienePermiso(
  ruta: string,
  rol: RolUsuario | undefined,
  permisos: string[] | undefined
): boolean {
  if (!rol) return false;
  if (rol === "master") return true;
  if (rol === "admin") {
    // Admin puede acceder a todas las rutas operativas y gestión de usuarios
    return true;
  }
  if (!permisos || !Array.isArray(permisos)) return false;

  // Coincidencia exacta o por prefijo de ruta (ej. /importaciones/recepcion)
  return permisos.some((p) => {
    if (p === ruta) return true;
    if (p !== "/" && ruta.startsWith(p)) return true;
    return false;
  });
}
