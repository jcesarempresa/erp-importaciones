"use client";

import { useState, useEffect, useRef } from "react";

export interface ProductoHistorico {
  sku: string;
  descripcion: string;
  precioUnitario?: number;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (producto: ProductoHistorico) => void;
  historico: ProductoHistorico[];
  placeholder?: string;
  campo: "sku" | "descripcion";
  className?: string;
  containerClassName?: string;
}

export default function ProductoAutocomplete({ value, onChange, onSelect, historico, placeholder, campo, className, containerClassName }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const sugerencias = value.trim().length >= 1
    ? historico
        .filter((p) =>
          campo === "sku"
            ? p.sku.toLowerCase().includes(value.toLowerCase())
            : p.descripcion.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 8)
    : [];

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${containerClassName || ""}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={`w-full ${className || ""}`}
        autoComplete="off"
      />

      {open && sugerencias.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          {sugerencias.map((p, i) => (
            <button
              key={`${p.sku}-${i}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()} // evita blur antes del click
              onClick={() => { onSelect(p); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 hover:bg-indigo-600/20 transition-colors border-b border-slate-800/50 last:border-0 group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-indigo-300 shrink-0">{p.sku}</span>
                <span className="text-xs text-slate-300 truncate group-hover:text-white">{p.descripcion}</span>
                {p.precioUnitario != null && (
                  <span className="text-xs text-slate-500 font-mono shrink-0">
                    ${p.precioUnitario.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
