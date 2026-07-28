"use client";

import { useEffect, useState } from "react";
import { 
  Package, 
  Search,
  Loader2,
  AlertCircle
} from "lucide-react";
import { obtenerInventario } from "@/lib/api/importaciones";
import { ItemInventario } from "@/types";
import { useTranslation } from "@/context/LanguageContext";

export default function AlmacenPage() {
  const { t, language } = useTranslation();
  const [inventario, setInventario] = useState<ItemInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const inv = await obtenerInventario();
      setInventario(inv);
    } catch (err: any) {
      setError(err.message || (language === "es" ? "Error al cargar el inventario." : "Error loading inventory."));
    } finally {
      setLoading(false);
    }
  }

  const filteredInventario = inventario.filter(item => 
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Package className="h-8 w-8 text-indigo-500" />
            {language === "es" ? "Almacén (Stock Local)" : "Warehouse (Local Stock)"}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {language === "es" 
              ? "Gestiona el inventario físico disponible para entrega inmediata." 
              : "Manage physical inventory available for immediate delivery."}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 text-rose-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
          <input
            type="text"
            placeholder={language === "es" ? "Buscar por SKU o descripción..." : "Search by SKU or description..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
          />
        </div>
      </div>

      {/* Content */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          </div>
        ) : filteredInventario.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Package className="h-12 w-12 mx-auto text-slate-600 mb-4 opacity-50" />
            <p>{searchTerm ? (language === "es" ? "No se encontraron coincidencias." : "No matches found.") : (language === "es" ? "El almacén está vacío." : "The warehouse is empty.")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-950/50 border-b border-slate-800/80 text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-semibold">{language === "es" ? "SKU" : "SKU"}</th>
                  <th className="px-6 py-4 font-semibold">{language === "es" ? "Descripción" : "Description"}</th>
                  <th className="px-6 py-4 font-semibold text-center">{language === "es" ? "Stock Disponible" : "Available Stock"}</th>
                  <th className="px-6 py-4 font-semibold text-right">{language === "es" ? "Costo Promedio (U)" : "Avg Cost (U)"}</th>
                  <th className="px-6 py-4 font-semibold text-right">{language === "es" ? "Valorización Total" : "Total Value"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredInventario.map(item => {
                  const valorTotal = (item.cantidadDisponible || 0) * (item.costoPromedio || 0);
                  const tieneStock = item.cantidadDisponible > 0;
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono font-medium text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg">
                          {item.sku}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {item.descripcion}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold ${
                          tieneStock ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {item.cantidadDisponible} {language === "es" ? "uds" : "pcs"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-300 font-mono">
                        ${(item.costoPromedio || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-200 font-mono font-bold">
                        ${valorTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
