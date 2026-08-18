"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTranslation } from "@/context/LanguageContext";
import {
  BarChart2,
  ShoppingCart,
  Truck,
  DollarSign,
  Users,
  Package,
  AlertTriangle,
  FileSpreadsheet,
  FileDown,
  Printer,
  Download,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ItemOrdenCliente {
  productoId: string;
  descripcion: string;
  cantidadPedida: number;
  cantidadRecibida: number;
  cantidadEntregada: number;
  precioUnitario: number;
  costo?: number;
}

interface OrdenCliente {
  id: string;
  clienteId: string;
  clienteNombre: string;
  fecha: string;
  estado: string;
  items: ItemOrdenCliente[];
  totalFacturado?: number;
}

interface Factura {
  id: string;
  clienteId: string;
  clienteNombre: string;
  ordenClienteId?: string;
  notasEntregaIds?: string[];
  monto: number;
  saldoPendiente: number;
  estado: string;
  fecha: string;
  fechaVencimiento?: string;
}

interface PedidoProveedor {
  id: string;
  proveedorId: string;
  proveedorNombre: string;
  fecha: string;
  estado: string;
  items: {
    productoId: string;
    descripcion: string;
    cantidadPedida: number;
    cantidadRecibida: number;
    precioUnitario: number;
    ordenesAsociadas?: { ordenClienteId: string; cantidadPrometida: number }[];
  }[];
  montoTotal: number;
}

interface FacturaProveedor {
  id: string;
  proveedorId: string;
  proveedorNombre: string;
  monto: number;
  saldoPendiente: number;
  estado: string;
  fecha: string;
}

// ─── Export Helpers ───────────────────────────────────────────────────────────

async function exportExcel(
  rows: Record<string, unknown>[],
  filename: string,
  sheetName = "Reporte"
) {
  if (!rows.length) return;
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : filename + ".xlsx");
}

async function exportPDF(
  columns: string[],
  rows: (string | number)[][],
  title: string,
  filename: string
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  // Title
  doc.setFontSize(14);
  doc.setTextColor(40);
  doc.text(title, 40, 40);

  // Date
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `Generado: ${new Date().toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    40,
    58
  );

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 70,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 40, right: 40 },
  });

  // Open in new tab for print preview instead of downloading
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="glass-card p-4 flex items-start gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 truncate">{title}</p>
        <p className="text-xl font-bold text-white">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({
  title,
  onExportExcel,
  onExportPDF,
}: {
  title: string;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <div className="flex items-center gap-2">
        {onExportExcel && (
          <button
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel
          </button>
        )}
        {onExportPDF && (
          <button
            onClick={onExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            PDF
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Tab Button ──────────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : "text-gray-400 hover:text-white hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    pendiente: "bg-yellow-500/20 text-yellow-300",
    parcial: "bg-blue-500/20 text-blue-300",
    completada: "bg-green-500/20 text-green-300",
    pagada: "bg-green-500/20 text-green-300",
    anulado: "bg-red-500/20 text-red-300",
    anulada: "bg-red-500/20 text-red-300",
    formalizado: "bg-purple-500/20 text-purple-300",
    en_transito: "bg-orange-500/20 text-orange-300",
    recibido: "bg-teal-500/20 text-teal-300",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        map[estado] ?? "bg-gray-500/20 text-gray-300"
      }`}
    >
      {estado}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabId =
  | "kpis"
  | "ordenes"
  | "cobros"
  | "rentabilidad"
  | "clientes"
  | "productos"
  | "proveedores";

export default function ReportesPage() {
  const { language } = useTranslation();
  const t = (es: string, en: string) => (language === "es" ? es : en);

  const [tab, setTab] = useState<TabId>("kpis");
  const [loading, setLoading] = useState(true);

  // Raw data
  const [ordenes, setOrdenes] = useState<OrdenCliente[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [pedidosProv, setPedidosProv] = useState<PedidoProveedor[]>([]);
  const [facturasProv, setFacturasProv] = useState<FacturaProveedor[]>([]);

  // Expanded rows
  const [expandedOrdenes, setExpandedOrdenes] = useState<Set<string>>(new Set());

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [
          ordenesSnap,
          facturasSnap,
          pedidosProvSnap,
          facturasProvSnap,
        ] = await Promise.all([
          getDocs(query(collection(db, "ordenes_cliente"), orderBy("fecha", "desc"))),
          getDocs(query(collection(db, "facturas"), orderBy("fecha", "desc"))),
          getDocs(query(collection(db, "pedidos_proveedor"), orderBy("fecha", "desc"))),
          getDocs(query(collection(db, "facturas_proveedor"), orderBy("fecha", "desc"))),
        ]);

        setOrdenes(
          ordenesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as OrdenCliente))
        );
        setFacturas(
          facturasSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Factura))
        );
        setPedidosProv(
          pedidosProvSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PedidoProveedor))
        );
        setFacturasProv(
          facturasProvSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FacturaProveedor))
        );
      } catch (e) {
        console.error("Error loading reports data", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalOrdenes = ordenes.length;
    const ordenesActivas = ordenes.filter(
      (o) => o.estado !== "anulado" && o.estado !== "completada"
    ).length;
    const totalFacturado = facturas
      .filter((f) => f.estado !== "anulada")
      .reduce((s, f) => s + (f.monto ?? 0), 0);
    const cxcPendiente = facturas
      .filter((f) => f.estado !== "anulada")
      .reduce((s, f) => s + (f.saldoPendiente ?? 0), 0);
    const cxpPendiente = facturasProv
      .filter((f) => f.estado !== "anulada")
      .reduce((s, f) => s + (f.saldoPendiente ?? 0), 0);
    const costoPedidos = pedidosProv
      .filter((p) => p.estado !== "anulado")
      .reduce((s, p) => s + (p.montoTotal ?? 0), 0);

    // Items listos para despachar (recibidos pero no entregados)
    const itemsListos: {
      ordenId: string;
      cliente: string;
      descripcion: string;
      pendiente: number;
    }[] = [];
    ordenes.forEach((o) => {
      if (o.estado === "anulado") return;
      (o.items ?? []).forEach((item) => {
        const pendiente =
          (item.cantidadRecibida ?? 0) - (item.cantidadEntregada ?? 0);
        if (pendiente > 0) {
          itemsListos.push({
            ordenId: o.id,
            cliente: o.clienteNombre,
            descripcion: item.descripcion,
            pendiente,
          });
        }
      });
    });

    return { totalOrdenes, ordenesActivas, totalFacturado, cxcPendiente, cxpPendiente, costoPedidos, itemsListos };
  }, [ordenes, facturas, pedidosProv, facturasProv]);

  // ── Ordenes Detail ──────────────────────────────────────────────────────────
  const ordenesRows = useMemo(() => {
    return ordenes
      .filter((o) => o.estado !== "anulado")
      .map((o) => {
        const totalPedido = (o.items ?? []).reduce(
          (s, i) => s + (i.cantidadPedida ?? 0) * (i.precioUnitario ?? 0),
          0
        );
        const totalEntregado = (o.items ?? []).reduce(
          (s, i) => s + (i.cantidadEntregada ?? 0) * (i.precioUnitario ?? 0),
          0
        );
        const totalRecibido = (o.items ?? []).reduce(
          (s, i) => s + (i.cantidadRecibida ?? 0),
          0
        );
        const totalPedidoQty = (o.items ?? []).reduce(
          (s, i) => s + (i.cantidadPedida ?? 0),
          0
        );
        const totalEntregadoQty = (o.items ?? []).reduce(
          (s, i) => s + (i.cantidadEntregada ?? 0),
          0
        );
        const pendienteEntregaQty = (o.items ?? []).reduce(
          (s, i) =>
            s + Math.max(0, (i.cantidadRecibida ?? 0) - (i.cantidadEntregada ?? 0)),
          0
        );
        const pendienteLlegadaQty = (o.items ?? []).reduce(
          (s, i) =>
            s + Math.max(0, (i.cantidadPedida ?? 0) - (i.cantidadRecibida ?? 0)),
          0
        );
        const facturasOrden = facturas.filter(
          (f) => f.ordenClienteId === o.id && f.estado !== "anulada"
        );
        const totalFacturadoOrden = facturasOrden.reduce(
          (s, f) => s + (f.monto ?? 0),
          0
        );
        const saldoPendienteOrden = facturasOrden.reduce(
          (s, f) => s + (f.saldoPendiente ?? 0),
          0
        );
        return {
          orden: o,
          totalPedido,
          totalEntregado,
          totalRecibido,
          totalPedidoQty,
          totalEntregadoQty,
          pendienteEntregaQty,
          pendienteLlegadaQty,
          totalFacturadoOrden,
          saldoPendienteOrden,
        };
      });
  }, [ordenes, facturas]);

  // ── Cobros (CxC Aging) ──────────────────────────────────────────────────────
  const cobrosData = useMemo(() => {
    const hoy = Date.now();
    const buckets = { b0: 0, b30: 0, b60: 0, b90: 0, bMas90: 0 };
    facturas
      .filter((f) => f.estado !== "anulada" && (f.saldoPendiente ?? 0) > 0)
      .forEach((f) => {
        const venc = f.fechaVencimiento
          ? new Date(f.fechaVencimiento).getTime()
          : new Date(f.fecha).getTime() + 30 * 86400000;
        const dias = Math.floor((hoy - venc) / 86400000);
        if (dias <= 0) buckets.b0 += f.saldoPendiente;
        else if (dias <= 30) buckets.b30 += f.saldoPendiente;
        else if (dias <= 60) buckets.b60 += f.saldoPendiente;
        else if (dias <= 90) buckets.b90 += f.saldoPendiente;
        else buckets.bMas90 += f.saldoPendiente;
      });
    return { buckets, facturas };
  }, [facturas]);

  // ── Rentabilidad ─────────────────────────────────────────────────────────────
  const rentabilidadRows = useMemo(() => {
    // Build cost attribution map: ordenClienteId -> cost
    const costMap: Record<string, number> = {};
    pedidosProv.forEach((pp) => {
      (pp.items ?? []).forEach((item) => {
        (item.ordenesAsociadas ?? []).forEach((oa) => {
          const costo =
            ((item.precioUnitario ?? 0) * (oa.cantidadPrometida ?? 0));
          costMap[oa.ordenClienteId] =
            (costMap[oa.ordenClienteId] ?? 0) + costo;
        });
      });
    });

    return ordenes
      .filter((o) => o.estado !== "anulado")
      .map((o) => {
        const ingresos = facturas
          .filter((f) => f.ordenClienteId === o.id && f.estado !== "anulada")
          .reduce((s, f) => s + (f.monto ?? 0), 0);
        const costo = costMap[o.id] ?? 0;
        const margen = ingresos > 0 ? ((ingresos - costo) / ingresos) * 100 : 0;
        return {
          id: o.id,
          cliente: o.clienteNombre,
          fecha: o.fecha,
          ingresos,
          costo,
          utilidad: ingresos - costo,
          margen,
        };
      })
      .sort((a, b) => b.ingresos - a.ingresos);
  }, [ordenes, facturas, pedidosProv]);

  // ── Clientes ─────────────────────────────────────────────────────────────────
  const clientesRows = useMemo(() => {
    const map: Record<
      string,
      {
        nombre: string;
        ordenes: number;
        totalPedido: number;
        totalFacturado: number;
        totalCobrado: number;
        cxcBalance: number;
        unidadesPendientes: number;
      }
    > = {};

    ordenes.forEach((o) => {
      if (o.estado === "anulado") return;
      if (!map[o.clienteId]) {
        map[o.clienteId] = {
          nombre: o.clienteNombre,
          ordenes: 0,
          totalPedido: 0,
          totalFacturado: 0,
          totalCobrado: 0,
          cxcBalance: 0,
          unidadesPendientes: 0,
        };
      }
      const c = map[o.clienteId];
      c.ordenes++;
      c.totalPedido += (o.items ?? []).reduce(
        (s, i) => s + (i.cantidadPedida ?? 0) * (i.precioUnitario ?? 0),
        0
      );
      c.unidadesPendientes += (o.items ?? []).reduce(
        (s, i) =>
          s + Math.max(0, (i.cantidadPedida ?? 0) - (i.cantidadEntregada ?? 0)),
        0
      );
    });

    facturas.forEach((f) => {
      if (f.estado === "anulada") return;
      if (!map[f.clienteId]) return;
      const c = map[f.clienteId];
      c.totalFacturado += f.monto ?? 0;
      c.totalCobrado += (f.monto ?? 0) - (f.saldoPendiente ?? 0);
      c.cxcBalance += f.saldoPendiente ?? 0;
    });

    return Object.values(map).sort((a, b) => b.totalFacturado - a.totalFacturado);
  }, [ordenes, facturas]);

  // ── Productos ─────────────────────────────────────────────────────────────────
  const productosRows = useMemo(() => {
    const map: Record<
      string,
      {
        descripcion: string;
        unidadesPedidas: number;
        unidadesEntregadas: number;
        unidadesPendientes: number;
        ingresos: number;
        costo: number;
      }
    > = {};

    ordenes.forEach((o) => {
      if (o.estado === "anulado") return;
      (o.items ?? []).forEach((item) => {
        const key = item.productoId || item.descripcion;
        if (!map[key]) {
          map[key] = {
            descripcion: item.descripcion,
            unidadesPedidas: 0,
            unidadesEntregadas: 0,
            unidadesPendientes: 0,
            ingresos: 0,
            costo: 0,
          };
        }
        const p = map[key];
        p.unidadesPedidas += item.cantidadPedida ?? 0;
        p.unidadesEntregadas += item.cantidadEntregada ?? 0;
        p.unidadesPendientes += Math.max(
          0,
          (item.cantidadPedida ?? 0) - (item.cantidadEntregada ?? 0)
        );
        p.ingresos +=
          (item.cantidadEntregada ?? 0) * (item.precioUnitario ?? 0);
        p.costo += (item.cantidadEntregada ?? 0) * (item.costo ?? 0);
      });
    });

    return Object.values(map).sort((a, b) => b.ingresos - a.ingresos);
  }, [ordenes]);

  // ── Proveedores ──────────────────────────────────────────────────────────────
  const proveedoresRows = useMemo(() => {
    const map: Record<
      string,
      {
        nombre: string;
        ordenes: number;
        unidadesPedidas: number;
        unidadesRecibidas: number;
        costoTotal: number;
        cxpBalance: number;
      }
    > = {};

    pedidosProv.forEach((pp) => {
      if (pp.estado === "anulado") return;
      if (!map[pp.proveedorId]) {
        map[pp.proveedorId] = {
          nombre: pp.proveedorNombre,
          ordenes: 0,
          unidadesPedidas: 0,
          unidadesRecibidas: 0,
          costoTotal: 0,
          cxpBalance: 0,
        };
      }
      const p = map[pp.proveedorId];
      p.ordenes++;
      p.costoTotal += pp.montoTotal ?? 0;
      (pp.items ?? []).forEach((item) => {
        p.unidadesPedidas += item.cantidadPedida ?? 0;
        p.unidadesRecibidas += item.cantidadRecibida ?? 0;
      });
    });

    facturasProv.forEach((f) => {
      if (f.estado === "anulada") return;
      if (!map[f.proveedorId]) return;
      map[f.proveedorId].cxpBalance += f.saldoPendiente ?? 0;
    });

    return Object.values(map).sort((a, b) => b.costoTotal - a.costoTotal);
  }, [pedidosProv, facturasProv]);

  // ── Format helpers ───────────────────────────────────────────────────────────
  const fmt = (n: number) =>
    "$ " +
    new Intl.NumberFormat("es-DO", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(n);
  const pct = (n: number) => `${n.toFixed(1)}%`;

  // ── Tabs config ──────────────────────────────────────────────────────────────
  const tabs: { id: TabId; label: string }[] = [
    { id: "kpis", label: t("Resumen", "Summary") },
    { id: "ordenes", label: t("Órdenes", "Orders") },
    { id: "cobros", label: t("Cobros / CxC", "Receivables") },
    { id: "rentabilidad", label: t("Rentabilidad", "Profitability") },
    { id: "clientes", label: t("Clientes", "Clients") },
    { id: "productos", label: t("Productos", "Products") },
    { id: "proveedores", label: t("Proveedores", "Suppliers") },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">{t("Cargando reportes…", "Loading reports…")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart2 className="w-7 h-7 text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">
            {t("Reportes y Análisis", "Reports & Analytics")}
          </h1>
          <p className="text-sm text-gray-400">
            {t(
              "Visibilidad completa de órdenes, cobros, rentabilidad y más",
              "Full visibility into orders, billing, profitability and more"
            )}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tb) => (
          <TabBtn key={tb.id} active={tab === tb.id} onClick={() => setTab(tb.id)}>
            {tb.label}
          </TabBtn>
        ))}
      </div>

      {/* ── KPIs Tab ─────────────────────────────────────────────────────────── */}
      {tab === "kpis" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <KpiCard
              title={t("Total Órdenes", "Total Orders")}
              value={kpis.totalOrdenes.toString()}
              subtitle={t(`${kpis.ordenesActivas} activas`, `${kpis.ordenesActivas} active`)}
              icon={ShoppingCart}
              color="bg-blue-600"
            />
            <KpiCard
              title={t("Total Facturado", "Total Invoiced")}
              value={fmt(kpis.totalFacturado)}
              icon={DollarSign}
              color="bg-green-600"
            />
            <KpiCard
              title={t("CxC Pendiente", "Outstanding Receivables")}
              value={fmt(kpis.cxcPendiente)}
              icon={Clock}
              color="bg-yellow-600"
            />
            <KpiCard
              title={t("CxP Pendiente", "Outstanding Payables")}
              value={fmt(kpis.cxpPendiente)}
              icon={AlertTriangle}
              color="bg-red-600"
            />
            <KpiCard
              title={t("Costo Compras", "Purchase Cost")}
              value={fmt(kpis.costoPedidos)}
              icon={Truck}
              color="bg-purple-600"
            />
            <KpiCard
              title={t("Ítems Listos p/Despachar", "Items Ready to Ship")}
              value={kpis.itemsListos.length.toString()}
              icon={Package}
              color="bg-teal-600"
            />
          </div>

          {/* Items listos para despachar */}
          {kpis.itemsListos.length > 0 && (
            <div>
              <SectionHeader
                title={t("⚡ Ítems listos para despachar", "⚡ Items ready to dispatch")}
                onExportExcel={() =>
                  exportExcel(
                    kpis.itemsListos.map((i) => ({
                      Orden: i.ordenId.slice(-8).toUpperCase(),
                      Cliente: i.cliente,
                      Producto: i.descripcion,
                      "Cantidad Pendiente": i.pendiente,
                    })),
                    "items_listos_despachar"
                  )
                }
                onExportPDF={() =>
                  exportPDF(
                    ["Orden", "Cliente", "Producto", "Cant. Pendiente"],
                    kpis.itemsListos.map((i) => [
                      i.ordenId.slice(-8).toUpperCase(),
                      i.cliente,
                      i.descripcion,
                      i.pendiente,
                    ]),
                    "Ítems Listos para Despachar",
                    "items_listos_despachar"
                  )
                }
              />
              <div className="glass-card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">
                        {t("Orden", "Order")}
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">
                        {t("Cliente", "Client")}
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">
                        {t("Producto", "Product")}
                      </th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">
                        {t("Cant. Pendiente", "Pending Qty")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpis.itemsListos.map((item, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-2.5 px-4 text-blue-400 font-mono text-xs">
                          {item.ordenId.slice(-8).toUpperCase()}
                        </td>
                        <td className="py-2.5 px-4 text-gray-200">{item.cliente}</td>
                        <td className="py-2.5 px-4 text-gray-200">{item.descripcion}</td>
                        <td className="py-2.5 px-4 text-right text-green-400 font-semibold">
                          {item.pendiente}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Órdenes Tab ──────────────────────────────────────────────────────── */}
      {tab === "ordenes" && (
        <div>
          <SectionHeader
            title={t("Seguimiento de Órdenes de Cliente", "Customer Order Tracking")}
            onExportExcel={() =>
              exportExcel(
                ordenesRows.map((r) => ({
                  Orden: r.orden.id.slice(-8).toUpperCase(),
                  Cliente: r.orden.clienteNombre,
                  Fecha: r.orden.fecha,
                  Estado: r.orden.estado,
                  "Qty Pedida": r.totalPedidoQty,
                  "Qty Recibida": r.totalRecibido,
                  "Qty Entregada": r.totalEntregadoQty,
                  "Pte. Despacho": r.pendienteEntregaQty,
                  "Pte. Llegada": r.pendienteLlegadaQty,
                  "Total Orden": r.totalPedido,
                  "Total Facturado": r.totalFacturadoOrden,
                  "Saldo CxC": r.saldoPendienteOrden,
                })),
                "ordenes_seguimiento",
                "Órdenes"
              )
            }
            onExportPDF={() =>
              exportPDF(
                ["Orden","Cliente","Fecha","Estado","Ped.","Rec.","Entr.","P.Desp","P.Lleg","Facturado","Saldo"],
                ordenesRows.map((r) => [
                  r.orden.id.slice(-8).toUpperCase(),
                  r.orden.clienteNombre,
                  r.orden.fecha,
                  r.orden.estado,
                  r.totalPedidoQty,
                  r.totalRecibido,
                  r.totalEntregadoQty,
                  r.pendienteEntregaQty,
                  r.pendienteLlegadaQty,
                  r.totalFacturadoOrden,
                  r.saldoPendienteOrden,
                ]),
                "Seguimiento de Órdenes de Cliente",
                "ordenes_seguimiento"
              )
            }
          />
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 px-3 w-8" />
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">
                    {t("Orden", "Order")}
                  </th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">
                    {t("Cliente", "Client")}
                  </th>
                  <th className="text-left py-3 px-3 text-gray-400 font-medium">
                    {t("Fecha", "Date")}
                  </th>
                  <th className="text-center py-3 px-3 text-gray-400 font-medium">
                    {t("Estado", "Status")}
                  </th>
                  <th className="text-right py-3 px-3 text-gray-400 font-medium">
                    {t("Pedido", "Ordered")}
                  </th>
                  <th className="text-right py-3 px-3 text-gray-400 font-medium">
                    {t("Recibido", "Received")}
                  </th>
                  <th className="text-right py-3 px-3 text-gray-400 font-medium">
                    {t("Entregado", "Delivered")}
                  </th>
                  <th className="text-right py-3 px-3 text-yellow-400 font-medium">
                    {t("Pte. Desp.", "Pend. Ship")}
                  </th>
                  <th className="text-right py-3 px-3 text-orange-400 font-medium">
                    {t("Pte. Llegada", "Pend. Arrival")}
                  </th>
                  <th className="text-right py-3 px-3 text-gray-400 font-medium">
                    {t("Facturado", "Invoiced")}
                  </th>
                  <th className="text-right py-3 px-3 text-red-400 font-medium">
                    {t("Saldo CxC", "CxC Balance")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ordenesRows.map((r) => {
                  const isExpanded = expandedOrdenes.has(r.orden.id);
                  return (
                    <>
                      <tr
                        key={r.orden.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => {
                          setExpandedOrdenes((prev) => {
                            const next = new Set(prev);
                            if (next.has(r.orden.id)) next.delete(r.orden.id);
                            else next.add(r.orden.id);
                            return next;
                          });
                        }}
                      >
                        <td className="py-2.5 px-3 text-gray-400">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-blue-400 font-mono text-xs">
                          {r.orden.id.slice(-8).toUpperCase()}
                        </td>
                        <td className="py-2.5 px-3 text-gray-200">{r.orden.clienteNombre}</td>
                        <td className="py-2.5 px-3 text-gray-400 text-xs">{r.orden.fecha}</td>
                        <td className="py-2.5 px-3 text-center">
                          <StatusBadge estado={r.orden.estado} />
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-200">
                          {r.totalPedidoQty}
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-200">
                          {r.totalRecibido}
                        </td>
                        <td className="py-2.5 px-3 text-right text-green-400">
                          {r.totalEntregadoQty}
                        </td>
                        <td className="py-2.5 px-3 text-right text-yellow-400 font-semibold">
                          {r.pendienteEntregaQty > 0 ? r.pendienteEntregaQty : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-orange-400 font-semibold">
                          {r.pendienteLlegadaQty > 0 ? r.pendienteLlegadaQty : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-200">
                          {r.totalFacturadoOrden > 0 ? fmt(r.totalFacturadoOrden) : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-red-400 font-semibold">
                          {r.saldoPendienteOrden > 0 ? fmt(r.saldoPendienteOrden) : "-"}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${r.orden.id}-items`} className="bg-white/5">
                          <td colSpan={12} className="px-6 py-3">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-500">
                                  <th className="text-left py-1 pr-4">{t("Producto", "Product")}</th>
                                  <th className="text-right py-1 pr-4">{t("Pedido", "Ordered")}</th>
                                  <th className="text-right py-1 pr-4">{t("Recibido", "Received")}</th>
                                  <th className="text-right py-1 pr-4">{t("Entregado", "Delivered")}</th>
                                  <th className="text-right py-1 pr-4 text-yellow-400">{t("P.Desp.", "P.Ship")}</th>
                                  <th className="text-right py-1 pr-4 text-orange-400">{t("P.Llegada", "P.Arrive")}</th>
                                  <th className="text-right py-1">{t("Precio", "Price")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(r.orden.items ?? []).map((item, idx) => {
                                  const pDesp = Math.max(
                                    0,
                                    (item.cantidadRecibida ?? 0) - (item.cantidadEntregada ?? 0)
                                  );
                                  const pLleg = Math.max(
                                    0,
                                    (item.cantidadPedida ?? 0) - (item.cantidadRecibida ?? 0)
                                  );
                                  return (
                                    <tr key={idx} className="border-t border-white/5">
                                      <td className="py-1 pr-4 text-gray-300">{item.descripcion}</td>
                                      <td className="py-1 pr-4 text-right text-gray-300">
                                        {item.cantidadPedida}
                                      </td>
                                      <td className="py-1 pr-4 text-right text-gray-300">
                                        {item.cantidadRecibida ?? 0}
                                      </td>
                                      <td className="py-1 pr-4 text-right text-green-400">
                                        {item.cantidadEntregada ?? 0}
                                      </td>
                                      <td className="py-1 pr-4 text-right text-yellow-400 font-semibold">
                                        {pDesp > 0 ? pDesp : "-"}
                                      </td>
                                      <td className="py-1 pr-4 text-right text-orange-400 font-semibold">
                                        {pLleg > 0 ? pLleg : "-"}
                                      </td>
                                      <td className="py-1 text-right text-gray-300">
                                        {fmt(item.precioUnitario ?? 0)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Cobros Tab ───────────────────────────────────────────────────────── */}
      {tab === "cobros" && (
        <div className="space-y-6">
          {/* Aging buckets */}
          <div>
            <SectionHeader title={t("Antigüedad de Saldos (CxC)", "Receivables Aging")} />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                {
                  label: t("Al día", "Current"),
                  value: cobrosData.buckets.b0,
                  color: "bg-green-600",
                },
                {
                  label: t("1–30 días", "1–30 days"),
                  value: cobrosData.buckets.b30,
                  color: "bg-yellow-600",
                },
                {
                  label: t("31–60 días", "31–60 days"),
                  value: cobrosData.buckets.b60,
                  color: "bg-orange-600",
                },
                {
                  label: t("61–90 días", "61–90 days"),
                  value: cobrosData.buckets.b90,
                  color: "bg-red-600",
                },
                {
                  label: t("+90 días", "+90 days"),
                  value: cobrosData.buckets.bMas90,
                  color: "bg-red-800",
                },
              ].map((b) => (
                <div key={b.label} className="glass-card p-4 text-center">
                  <div className={`w-3 h-3 rounded-full ${b.color} mx-auto mb-2`} />
                  <p className="text-xs text-gray-400 mb-1">{b.label}</p>
                  <p className="text-lg font-bold text-white">{fmt(b.value)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Facturas detail */}
          <div>
            <SectionHeader
              title={t("Detalle de Facturas", "Invoice Detail")}
              onExportExcel={() =>
                exportExcel(
                  cobrosData.facturas
                    .filter((f) => f.estado !== "anulada")
                    .map((f) => ({
                      Factura: f.id.slice(-8).toUpperCase(),
                      Cliente: f.clienteNombre,
                      Fecha: f.fecha,
                      Vencimiento: f.fechaVencimiento ?? "",
                      Estado: f.estado,
                      Monto: f.monto,
                      Saldo: f.saldoPendiente,
                    })),
                  "facturas_cxc",
                  "CxC"
                )
              }
              onExportPDF={() =>
                exportPDF(
                  ["Factura", "Cliente", "Fecha", "Vencimiento", "Estado", "Monto", "Saldo"],
                  cobrosData.facturas
                    .filter((f) => f.estado !== "anulada")
                    .map((f) => [
                      f.id.slice(-8).toUpperCase(),
                      f.clienteNombre,
                      f.fecha,
                      f.fechaVencimiento ?? "-",
                      f.estado,
                      f.monto,
                      f.saldoPendiente,
                    ]),
                  "Detalle de Facturas – CxC",
                  "facturas_cxc"
                )
              }
            />
            <div className="glass-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      {t("Factura", "Invoice")}
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      {t("Cliente", "Client")}
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      {t("Fecha", "Date")}
                    </th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">
                      {t("Vencimiento", "Due Date")}
                    </th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">
                      {t("Estado", "Status")}
                    </th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">
                      {t("Monto", "Amount")}
                    </th>
                    <th className="text-right py-3 px-4 text-red-400 font-medium">
                      {t("Saldo", "Balance")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cobrosData.facturas
                    .filter((f) => f.estado !== "anulada")
                    .map((f) => (
                      <tr
                        key={f.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-2.5 px-4 text-blue-400 font-mono text-xs">
                          {f.id.slice(-8).toUpperCase()}
                        </td>
                        <td className="py-2.5 px-4 text-gray-200">{f.clienteNombre}</td>
                        <td className="py-2.5 px-4 text-gray-400 text-xs">{f.fecha}</td>
                        <td className="py-2.5 px-4 text-gray-400 text-xs">
                          {f.fechaVencimiento ?? "-"}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <StatusBadge estado={f.estado} />
                        </td>
                        <td className="py-2.5 px-4 text-right text-gray-200">
                          {fmt(f.monto ?? 0)}
                        </td>
                        <td className="py-2.5 px-4 text-right text-red-400 font-semibold">
                          {(f.saldoPendiente ?? 0) > 0 ? fmt(f.saldoPendiente) : "-"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Rentabilidad Tab ─────────────────────────────────────────────────── */}
      {tab === "rentabilidad" && (
        <div>
          <SectionHeader
            title={t("Rentabilidad por Orden", "Profitability by Order")}
            onExportExcel={() =>
              exportExcel(
                rentabilidadRows.map((r) => ({
                  Orden: r.id.slice(-8).toUpperCase(),
                  Cliente: r.cliente,
                  Fecha: r.fecha,
                  Ingresos: r.ingresos,
                  Costo: r.costo,
                  Utilidad: r.utilidad,
                  "Margen %": r.margen.toFixed(2),
                })),
                "rentabilidad_ordenes",
                "Rentabilidad"
              )
            }
            onExportPDF={() =>
              exportPDF(
                ["Orden", "Cliente", "Fecha", "Ingresos", "Costo", "Utilidad", "Margen %"],
                rentabilidadRows.map((r) => [
                  r.id.slice(-8).toUpperCase(),
                  r.cliente,
                  r.fecha,
                  r.ingresos,
                  r.costo,
                  r.utilidad,
                  r.margen.toFixed(2) + "%",
                ]),
                "Rentabilidad por Orden",
                "rentabilidad_ordenes"
              )
            }
          />
          {/* Totals bar */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="glass-card p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">{t("Ingresos Totales", "Total Revenue")}</p>
              <p className="text-xl font-bold text-green-400">
                {fmt(rentabilidadRows.reduce((s, r) => s + r.ingresos, 0))}
              </p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">{t("Costo Total", "Total Cost")}</p>
              <p className="text-xl font-bold text-red-400">
                {fmt(rentabilidadRows.reduce((s, r) => s + r.costo, 0))}
              </p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">{t("Utilidad Total", "Total Profit")}</p>
              <p className="text-xl font-bold text-blue-400">
                {fmt(rentabilidadRows.reduce((s, r) => s + r.utilidad, 0))}
              </p>
            </div>
          </div>
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    {t("Orden", "Order")}
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    {t("Cliente", "Client")}
                  </th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    {t("Fecha", "Date")}
                  </th>
                  <th className="text-right py-3 px-4 text-green-400 font-medium">
                    {t("Ingresos", "Revenue")}
                  </th>
                  <th className="text-right py-3 px-4 text-red-400 font-medium">
                    {t("Costo", "Cost")}
                  </th>
                  <th className="text-right py-3 px-4 text-blue-400 font-medium">
                    {t("Utilidad", "Profit")}
                  </th>
                  <th className="text-right py-3 px-4 text-purple-400 font-medium">
                    {t("Margen", "Margin")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rentabilidadRows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-2.5 px-4 text-blue-400 font-mono text-xs">
                      {r.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="py-2.5 px-4 text-gray-200">{r.cliente}</td>
                    <td className="py-2.5 px-4 text-gray-400 text-xs">{r.fecha}</td>
                    <td className="py-2.5 px-4 text-right text-green-400">
                      {fmt(r.ingresos)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-red-400">{fmt(r.costo)}</td>
                    <td className="py-2.5 px-4 text-right text-blue-400 font-semibold">
                      {fmt(r.utilidad)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          r.margen >= 20
                            ? "bg-green-500/20 text-green-300"
                            : r.margen >= 10
                            ? "bg-yellow-500/20 text-yellow-300"
                            : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        {pct(r.margen)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Clientes Tab ─────────────────────────────────────────────────────── */}
      {tab === "clientes" && (
        <div>
          <SectionHeader
            title={t("Análisis por Cliente", "Client Analysis")}
            onExportExcel={() =>
              exportExcel(
                clientesRows.map((c) => ({
                  Cliente: c.nombre,
                  Órdenes: c.ordenes,
                  "Total Pedido": c.totalPedido,
                  "Total Facturado": c.totalFacturado,
                  "Total Cobrado": c.totalCobrado,
                  "Saldo CxC": c.cxcBalance,
                  "Uds. Pendientes": c.unidadesPendientes,
                })),
                "clientes_analisis",
                "Clientes"
              )
            }
            onExportPDF={() =>
              exportPDF(
                ["Cliente", "Órdenes", "Total Pedido", "Facturado", "Cobrado", "Saldo CxC", "Uds. Pend."],
                clientesRows.map((c) => [
                  c.nombre,
                  c.ordenes,
                  c.totalPedido,
                  c.totalFacturado,
                  c.totalCobrado,
                  c.cxcBalance,
                  c.unidadesPendientes,
                ]),
                "Análisis por Cliente",
                "clientes_analisis"
              )
            }
          />
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    {t("Cliente", "Client")}
                  </th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">
                    {t("Órdenes", "Orders")}
                  </th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">
                    {t("Total Pedido", "Total Ordered")}
                  </th>
                  <th className="text-right py-3 px-4 text-green-400 font-medium">
                    {t("Facturado", "Invoiced")}
                  </th>
                  <th className="text-right py-3 px-4 text-blue-400 font-medium">
                    {t("Cobrado", "Collected")}
                  </th>
                  <th className="text-right py-3 px-4 text-red-400 font-medium">
                    {t("Saldo CxC", "CxC Balance")}
                  </th>
                  <th className="text-right py-3 px-4 text-yellow-400 font-medium">
                    {t("Uds. Pendientes", "Pending Units")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {clientesRows.map((c, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-2.5 px-4 text-gray-200 font-medium">{c.nombre}</td>
                    <td className="py-2.5 px-4 text-right text-gray-300">{c.ordenes}</td>
                    <td className="py-2.5 px-4 text-right text-gray-300">
                      {fmt(c.totalPedido)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-green-400">
                      {fmt(c.totalFacturado)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-blue-400">
                      {fmt(c.totalCobrado)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-red-400 font-semibold">
                      {c.cxcBalance > 0 ? fmt(c.cxcBalance) : "-"}
                    </td>
                    <td className="py-2.5 px-4 text-right text-yellow-400 font-semibold">
                      {c.unidadesPendientes > 0 ? c.unidadesPendientes : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Productos Tab ────────────────────────────────────────────────────── */}
      {tab === "productos" && (
        <div>
          <SectionHeader
            title={t("Análisis por Producto", "Product Analysis")}
            onExportExcel={() =>
              exportExcel(
                productosRows.map((p) => ({
                  Producto: p.descripcion,
                  "Uds. Pedidas": p.unidadesPedidas,
                  "Uds. Entregadas": p.unidadesEntregadas,
                  "Uds. Pendientes": p.unidadesPendientes,
                  Ingresos: p.ingresos,
                  Costo: p.costo,
                  "Margen %": p.ingresos > 0
                    ? (((p.ingresos - p.costo) / p.ingresos) * 100).toFixed(2)
                    : "0.00",
                })),
                "productos_analisis",
                "Productos"
              )
            }
            onExportPDF={() =>
              exportPDF(
                ["Producto", "Ped.", "Entr.", "Pend.", "Ingresos", "Costo", "Margen %"],
                productosRows.map((p) => [
                  p.descripcion,
                  p.unidadesPedidas,
                  p.unidadesEntregadas,
                  p.unidadesPendientes,
                  p.ingresos,
                  p.costo,
                  p.ingresos > 0
                    ? (((p.ingresos - p.costo) / p.ingresos) * 100).toFixed(2) + "%"
                    : "0%",
                ]),
                "Análisis por Producto",
                "productos_analisis"
              )
            }
          />
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    {t("Producto", "Product")}
                  </th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">
                    {t("Uds. Pedidas", "Units Ordered")}
                  </th>
                  <th className="text-right py-3 px-4 text-green-400 font-medium">
                    {t("Uds. Entregadas", "Units Delivered")}
                  </th>
                  <th className="text-right py-3 px-4 text-yellow-400 font-medium">
                    {t("Uds. Pendientes", "Units Pending")}
                  </th>
                  <th className="text-right py-3 px-4 text-green-400 font-medium">
                    {t("Ingresos", "Revenue")}
                  </th>
                  <th className="text-right py-3 px-4 text-red-400 font-medium">
                    {t("Costo", "Cost")}
                  </th>
                  <th className="text-right py-3 px-4 text-purple-400 font-medium">
                    {t("Margen", "Margin")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {productosRows.map((p, idx) => {
                  const margen =
                    p.ingresos > 0
                      ? ((p.ingresos - p.costo) / p.ingresos) * 100
                      : 0;
                  return (
                    <tr
                      key={idx}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-2.5 px-4 text-gray-200">{p.descripcion}</td>
                      <td className="py-2.5 px-4 text-right text-gray-300">
                        {p.unidadesPedidas}
                      </td>
                      <td className="py-2.5 px-4 text-right text-green-400">
                        {p.unidadesEntregadas}
                      </td>
                      <td className="py-2.5 px-4 text-right text-yellow-400 font-semibold">
                        {p.unidadesPendientes > 0 ? p.unidadesPendientes : "-"}
                      </td>
                      <td className="py-2.5 px-4 text-right text-green-400">
                        {fmt(p.ingresos)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-red-400">
                        {p.costo > 0 ? fmt(p.costo) : "-"}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            margen >= 20
                              ? "bg-green-500/20 text-green-300"
                              : margen >= 10
                              ? "bg-yellow-500/20 text-yellow-300"
                              : "bg-red-500/20 text-red-300"
                          }`}
                        >
                          {pct(margen)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Proveedores Tab ──────────────────────────────────────────────────── */}
      {tab === "proveedores" && (
        <div>
          <SectionHeader
            title={t("Análisis por Proveedor", "Supplier Analysis")}
            onExportExcel={() =>
              exportExcel(
                proveedoresRows.map((p) => ({
                  Proveedor: p.nombre,
                  Órdenes: p.ordenes,
                  "Uds. Pedidas": p.unidadesPedidas,
                  "Uds. Recibidas": p.unidadesRecibidas,
                  "Cumplim. %":
                    p.unidadesPedidas > 0
                      ? ((p.unidadesRecibidas / p.unidadesPedidas) * 100).toFixed(2)
                      : "0.00",
                  "Costo Total": p.costoTotal,
                  "Saldo CxP": p.cxpBalance,
                })),
                "proveedores_analisis",
                "Proveedores"
              )
            }
            onExportPDF={() =>
              exportPDF(
                ["Proveedor", "Órdenes", "Uds. Ped.", "Uds. Rec.", "Cumplim. %", "Costo Total", "Saldo CxP"],
                proveedoresRows.map((p) => [
                  p.nombre,
                  p.ordenes,
                  p.unidadesPedidas,
                  p.unidadesRecibidas,
                  p.unidadesPedidas > 0
                    ? ((p.unidadesRecibidas / p.unidadesPedidas) * 100).toFixed(2) + "%"
                    : "0%",
                  p.costoTotal,
                  p.cxpBalance,
                ]),
                "Análisis por Proveedor",
                "proveedores_analisis"
              )
            }
          />
          <div className="glass-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">
                    {t("Proveedor", "Supplier")}
                  </th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">
                    {t("Órdenes", "Orders")}
                  </th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">
                    {t("Uds. Pedidas", "Units Ordered")}
                  </th>
                  <th className="text-right py-3 px-4 text-green-400 font-medium">
                    {t("Uds. Recibidas", "Units Received")}
                  </th>
                  <th className="text-right py-3 px-4 text-blue-400 font-medium">
                    {t("% Cumplim.", "% Fulfill.")}
                  </th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">
                    {t("Costo Total", "Total Cost")}
                  </th>
                  <th className="text-right py-3 px-4 text-red-400 font-medium">
                    {t("Saldo CxP", "CxP Balance")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {proveedoresRows.map((p, idx) => {
                  const cumplimiento =
                    p.unidadesPedidas > 0
                      ? (p.unidadesRecibidas / p.unidadesPedidas) * 100
                      : 0;
                  return (
                    <tr
                      key={idx}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-2.5 px-4 text-gray-200 font-medium">{p.nombre}</td>
                      <td className="py-2.5 px-4 text-right text-gray-300">{p.ordenes}</td>
                      <td className="py-2.5 px-4 text-right text-gray-300">
                        {p.unidadesPedidas}
                      </td>
                      <td className="py-2.5 px-4 text-right text-green-400">
                        {p.unidadesRecibidas}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            cumplimiento >= 90
                              ? "bg-green-500/20 text-green-300"
                              : cumplimiento >= 70
                              ? "bg-yellow-500/20 text-yellow-300"
                              : "bg-red-500/20 text-red-300"
                          }`}
                        >
                          {pct(cumplimiento)}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-gray-200">
                        {fmt(p.costoTotal)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-red-400 font-semibold">
                        {p.cxpBalance > 0 ? fmt(p.cxpBalance) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
