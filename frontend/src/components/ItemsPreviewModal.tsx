import React from "react";
import { X } from "lucide-react";
import { ItemCotizacion } from "@/types";
import { useTranslation } from "@/context/LanguageContext";

interface ItemsPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ItemCotizacion[];
}

export default function ItemsPreviewModal({ isOpen, onClose, items }: ItemsPreviewModalProps) {
  const { language } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-800/50">
          <h3 className="text-lg font-semibold text-white">
            {language === "es" ? "Detalles de Ítems" : "Items Details"}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-800/80 text-slate-300">
                  <th className="p-3 font-medium border-b border-slate-700">{language === "es" ? "Código" : "Código"}</th>
                  <th className="p-3 font-medium border-b border-slate-700">{language === "es" ? "Descripción" : "Description"}</th>
                  <th className="p-3 font-medium border-b border-slate-700 w-24 text-center">{language === "es" ? "Cant." : "Qty"}</th>
                  <th className="p-3 font-medium border-b border-slate-700 w-32 text-right">{language === "es" ? "Precio U." : "Unit Price"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-mono text-emerald-400 align-top">{item.sku}</td>
                    <td className="p-3 text-slate-300">
                      <div className="font-medium text-white">{item.descripcion}</div>
                      {item.detalles && <div className="text-xs text-slate-500 mt-1">{item.detalles}</div>}
                    </td>
                    <td className="p-3 text-center text-slate-300 align-top font-mono">{item.cantidad}</td>
                    <td className="p-3 text-right text-slate-300 align-top font-mono">${item.precioUnitario?.toFixed(2)}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-500">
                      {language === "es" ? "No hay ítems registrados." : "No items registered."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all font-medium"
          >
            {language === "es" ? "Cerrar" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
