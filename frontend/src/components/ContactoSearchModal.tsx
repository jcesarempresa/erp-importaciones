"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Users, Building2, Edit2 } from "lucide-react";
import { Cliente, Proveedor } from "@/types";
import { useTranslation } from "@/context/LanguageContext";

interface Props {
  tipo: "cliente" | "proveedor";
  items: (Cliente | Proveedor)[];
  selected: any | null;
  onSelect: (item: any) => void;
  onCreateNew?: () => void;
  onEditCurrent?: () => void;
  placeholder?: string;
}

export default function ContactoSearchModal({ tipo, items, selected, onSelect, onCreateNew, onEditCurrent, placeholder }: Props) {
  const { language } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const label = tipo === "cliente"
    ? (language === "es" ? "Cliente" : "Customer")
    : (language === "es" ? "Proveedor" : "Supplier");
  const Icon = tipo === "cliente" ? Users : Building2;

  const filtered = items.filter(
    (i) =>
      i.nombre.toLowerCase().includes(query.toLowerCase()) ||
      i.rif.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  return (
    <>
      {/* Trigger */}
      <div className="flex gap-2 items-center">
        <div
          className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-sm cursor-default truncate"
          style={{ color: selected ? "rgb(226 232 240)" : "rgb(100 116 139)" }}
        >
          {selected ? (
            <span>
              <span className="font-semibold text-slate-100">{selected.nombre}</span>
              <span className="ml-2 text-slate-500 font-mono text-xs">{selected.rif}</span>
            </span>
          ) : (
            placeholder || (language === "es" ? `Seleccionar ${label}...` : `Select ${label}...`)
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={language === "es" ? `Buscar ${label}` : `Search ${label}`}
          className="p-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 transition-all shrink-0"
        >
          <Search className="h-4 w-4" />
        </button>
        {selected && onEditCurrent && (
          <button
            type="button"
            onClick={onEditCurrent}
            title={language === "es" ? `Editar ${label}` : `Edit ${label}`}
            className="p-2.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/40 border border-sky-500/30 text-sky-400 hover:text-sky-300 transition-all shrink-0"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        )}
        {onCreateNew && (
          <button
            type="button"
            onClick={onCreateNew}
            title={language === "es" ? `Nuevo ${label}` : `New ${label}`}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-all shrink-0 text-sm font-bold"
          >
            +
          </button>
        )}
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24 bg-slate-950/80 backdrop-blur-sm px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-slate-800">
              <Icon className="h-5 w-5 text-indigo-400 shrink-0" />
              <span className="text-sm font-bold text-slate-200">
                {language === "es" ? `Buscar ${label}` : `Search ${label}`}
              </span>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={language === "es" ? "Nombre o RIF..." : "Name or Tax ID..."}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Lista */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-sm">
                  <Icon className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  {language === "es" ? `No se encontraron ${label.toLowerCase()}s` : `No ${label.toLowerCase()}s found`}
                </div>
              ) : (
                filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-indigo-600/15 transition-colors group ${
                      selected?.id === item.id ? "bg-indigo-600/10 border-l-2 border-indigo-500" : ""
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
                      {item.nombre}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{item.rif}</div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 text-xs text-slate-500 text-center">
              {filtered.length} {language === "es" ? `resultado${filtered.length !== 1 ? "s" : ""}` : `result${filtered.length !== 1 ? "s" : ""}`}
              {onCreateNew && (
                <button
                  type="button"
                  onClick={() => { setOpen(false); onCreateNew(); }}
                  className="ml-3 text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  + {language === "es" ? `Registrar nuevo ${label.toLowerCase()}` : `Register new ${label.toLowerCase()}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
