"use client";

import { useState, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ArrowRight,
  Download,
  Loader2,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  importarClientes,
  importarProveedores,
  importarCotizaciones,
  importarOrdenes,
} from "@/lib/api/importaciones";
import { useTranslation } from "@/context/LanguageContext";

type DocType = "clientes" | "proveedores" | "cotizaciones" | "ordenes";


// Columnas y filas de ejemplo por tipo de documento
const TEMPLATES: Record<DocType, { headers: string[]; example: Record<string, any> }> = {
  clientes: {
    headers: ["nombre", "rif", "email", "telefono", "direccion"],
    example: {
      nombre: "Distribuidora El Carmen C.A.",
      rif: "J-30456123-4",
      email: "contacto@elcarmen.com",
      telefono: "0249-5551122",
      direccion: "Av. Principal Sector El Centro, Bejuma",
    },
  },
  proveedores: {
    headers: ["nombre", "rif", "email", "telefono", "direccion"],
    example: {
      nombre: "Shanghai Industrial Pumps Ltd",
      rif: "N-11223344-5",
      email: "orders@shanghaipumps.com",
      telefono: "+86-21-998877",
      direccion: "Pudong New District, Shanghai, China",
    },
  },
  cotizaciones: {
    headers: ["clienteNombre", "clienteId", "fecha", "estado", "subtotal", "impuestos", "total", "sku_1", "descripcion_1", "cantidad_1", "precioUnitario_1"],
    example: {
      clienteNombre: "Ferretería La Central",
      clienteId: "CLI-001",
      fecha: "2026-06-30",
      estado: "aprobado",
      subtotal: 1200,
      impuestos: 192,
      total: 1392,
      sku_1: "SKU-BOMB-001",
      descripcion_1: "Bomba de Agua 1HP",
      cantidad_1: 10,
      precioUnitario_1: 120,
    },
  },
  ordenes: {
    headers: ["clienteNombre", "clienteId", "fecha", "estado", "montoTotal", "sku_1", "descripcion_1", "cantidadPedida_1", "precioUnitario_1"],
    example: {
      clienteNombre: "Distribuidora Bejuma C.A.",
      clienteId: "CLI-002",
      fecha: "2026-06-30",
      estado: "pendiente",
      montoTotal: 2784,
      sku_1: "SKU-BOMB-001",
      descripcion_1: "Bomba de Agua 1HP",
      cantidadPedida_1: 20,
      precioUnitario_1: 120,
    },
  },
};

// Convertir filas flat de Excel a objetos con items anidados
function flatToNestedItems(row: Record<string, any>, type: DocType): any {
  const items: any[] = [];
  let i = 1;
  while (row[`sku_${i}`]) {
    if (type === "cotizaciones") {
      items.push({
        sku: row[`sku_${i}`] || "",
        descripcion: row[`descripcion_${i}`] || "",
        cantidad: Number(row[`cantidad_${i}`]) || 0,
        precioUnitario: Number(row[`precioUnitario_${i}`]) || 0,
      });
    } else if (type === "ordenes") {
      items.push({
        sku: row[`sku_${i}`] || "",
        descripcion: row[`descripcion_${i}`] || "",
        cantidadPedida: Number(row[`cantidadPedida_${i}`]) || 0,
        cantidadRecibida: 0,
        cantidadEntregada: 0,
        precioUnitario: Number(row[`precioUnitario_${i}`]) || 0,
      });
    }
    i++;
  }

  const base: any = {
    clienteNombre: row.clienteNombre || row.nombre || "",
    clienteId: row.clienteId || "",
    fecha: row.fecha || new Date().toISOString(),
    estado: row.estado || "borrador",
  };

  if (type === "cotizaciones") {
    base.subtotal = Number(row.subtotal) || 0;
    base.impuestos = Number(row.impuestos) || 0;
    base.total = Number(row.total) || 0;
    base.items = items;
  } else if (type === "ordenes") {
    base.montoTotal = Number(row.montoTotal) || 0;
    base.items = items;
  }

  return base;
}

function processRows(rows: Record<string, any>[], type: DocType): any[] {
  if (type === "clientes" || type === "proveedores") return rows;
  return rows.map((r) => flatToNestedItems(r, type));
}

export default function ImportarPage() {
  const { t, language } = useTranslation();
  const [docType, setDocType] = useState<DocType>("clientes");
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Descargar plantilla Excel ──────────────────────────────────────────────
  const handleDownloadTemplate = () => {
    const tpl = TEMPLATES[docType];
    const ws = XLSX.utils.json_to_sheet([tpl.example], { header: tpl.headers });

    // Estilos de cabecera (ancho automático)
    ws["!cols"] = tpl.headers.map(() => ({ wch: 22 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, `plantilla_${docType}.xlsx`);
  };

  // ── Leer archivo Excel cargado ─────────────────────────────────────────────
  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setSuccessMsg(null);
    setErrorMsg(null);

    const isXlsx = selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xls");
    if (!isXlsx) {
      setErrorMsg(language === "es" ? "Solo se aceptan archivos Excel (.xlsx o .xls). Descarga la plantilla y llena los datos." : "Only Excel files (.xlsx or .xls) are accepted. Download the template and fill in the data.");
      setFile(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (rows.length === 0) throw new Error(language === "es" ? "El archivo está vacío o no tiene datos." : "The file is empty or does not have any data.");
        const processed = processRows(rows, docType);
        setPreviewData(processed);
      } catch (err: any) {
        setErrorMsg(language === "es" ? `Error al procesar Excel: ${err.message}` : `Error processing Excel: ${err.message}`);
        setPreviewData([]);
        setFile(null);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  // ── Importar a Firestore ───────────────────────────────────────────────────
  const handleImport = async () => {
    if (previewData.length === 0) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      if (docType === "clientes") await importarClientes(previewData);
      else if (docType === "proveedores") await importarProveedores(previewData);
      else if (docType === "cotizaciones") await importarCotizaciones(previewData);
      else if (docType === "ordenes") await importarOrdenes(previewData);

      setSuccessMsg(language === "es" ? `¡Importación exitosa! Se cargaron ${previewData.length} registros en Firebase.` : `Import successful! Loaded ${previewData.length} records to Firebase.`);
      setPreviewData([]);
      setFile(null);
    } catch (err: any) {
      setErrorMsg(err.message || (language === "es" ? "Error al importar en Firestore." : "Error importing into Firestore."));
    } finally {
      setLoading(false);
    }
  };

  const docLabels: Record<DocType, string> = {
    clientes: language === "es" ? "Clientes" : "Customers",
    proveedores: language === "es" ? "Proveedores" : "Suppliers",
    cotizaciones: language === "es" ? "Cotizaciones" : "Quotations (Budgets)",
    ordenes: language === "es" ? "Órdenes de Clientes" : "Customer Orders",
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="h-7 w-7 text-indigo-500" />
          {language === "es" ? "Importador de Historial" : "History Importer"}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {language === "es" 
            ? "Descarga la plantilla Excel, llena los datos y sube el archivo para importar tus registros históricos." 
            : "Download the Excel template, fill in the data, and upload the file to import your historical records."}
        </p>
      </div>

      {/* Selector de tipo + botón descarga */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800/50 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">
            {language === "es" ? "1. Selecciona el Tipo de Registro" : "1. Select Record Type"}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(docLabels) as DocType[]).map((type) => (
              <button key={type} type="button"
                onClick={() => { setDocType(type); setFile(null); setPreviewData([]); setErrorMsg(null); setSuccessMsg(null); }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  docType === type
                    ? "bg-indigo-600/90 text-white border-indigo-500 shadow-md shadow-indigo-500/10"
                    : "bg-slate-900/40 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-slate-800/50"
                }`}>
                {docLabels[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Paso 2: Descarga de plantilla */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">
            {language === "es" ? "2. Descarga la Plantilla Excel" : "2. Download Excel Template"}
          </h2>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="p-3 rounded-xl bg-emerald-500/10 shrink-0">
              <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200">
                plantilla_{docType}.xlsx
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === "es" 
                  ? "Contiene las columnas requeridas y una fila de ejemplo. Agrega tus datos debajo." 
                  : "Contains the required columns and an example row. Add your data below."}
              </p>
            </div>
            <button onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all shrink-0 active:scale-95 shadow-lg shadow-emerald-500/10 cursor-pointer">
              <Download className="h-4 w-4" />
              {language === "es" ? "Descargar" : "Download"}
            </button>
          </div>
        </div>

        {/* Paso 3: Subir archivo */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">
            {language === "es" ? "3. Sube el Archivo Completado" : "3. Upload Completed File"}
          </h2>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 ${
              file
                ? "border-indigo-500/60 bg-indigo-500/5"
                : "border-slate-800 hover:border-indigo-600/60 bg-slate-950/20 hover:bg-white/5"
            }`}
          >
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls" className="hidden" />
            {file ? (
              <>
                <FileSpreadsheet className="h-10 w-10 text-indigo-400" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-indigo-300">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {language === "es"
                      ? `${previewData.length} registros detectados — listo para importar`
                      : `${previewData.length} records detected — ready to import`}
                  </p>
                </div>
              </>
            ) : (
              <>
                <UploadCloud className="h-10 w-10 text-slate-500" />
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-200">
                    {language === "es" ? "Arrastra tu archivo aquí o haz clic para examinar" : "Drag your file here or click to browse"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === "es" ? "Solo archivos Excel (.xlsx o .xls)" : "Excel files only (.xlsx or .xls)"}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Alertas */}
        {successMsg && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" /><span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-400 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" /><span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Previsualización */}
      {previewData.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800/50 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-md font-bold text-slate-200">
                {language === "es" ? "Previsualización de Carga" : "Upload Preview"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === "es"
                  ? `${previewData.length} registros listos. Verifica y confirma para guardar en Firebase.`
                  : `${previewData.length} records ready. Verify and confirm to save to Firebase.`}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setPreviewData([]); setFile(null); }}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer" 
                title={language === "es" ? "Limpiar" : "Clear"}>
                <Trash2 className="h-4 w-4" />
              </button>
              <button onClick={handleImport} disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {language === "es" 
                  ? `Confirmar Importación (${previewData.length} registros)` 
                  : `Confirm Import (${previewData.length} records)`}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-850 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                  {Object.keys(previewData[0]).slice(0, 6).map((key) => (
                    <th key={key} className="py-2.5 px-4">{key}</th>
                  ))}
                  {Object.keys(previewData[0]).length > 6 && <th className="py-2.5 px-4">...</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {previewData.slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="text-xs text-slate-300 hover:bg-white/5 transition-colors">
                    {Object.keys(row).slice(0, 6).map((key) => (
                      <td key={key} className="py-3 px-4 font-mono">
                        {typeof row[key] === "object" ? JSON.stringify(row[key]).slice(0, 40) + "…" : String(row[key])}
                      </td>
                    ))}
                    {Object.keys(row).length > 6 && <td className="py-3 px-4 text-slate-500">…</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previewData.length > 10 && (
            <p className="text-center text-[10px] text-slate-500">
              {language === "es"
                ? `Mostrando 10 de ${previewData.length} registros.`
                : `Showing 10 of ${previewData.length} records.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
