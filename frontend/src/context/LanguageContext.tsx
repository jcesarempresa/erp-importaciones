"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "es" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Diccionario de traducciones
const translations: Record<Language, Record<string, string>> = {
  es: {
    // Sidebar
    "menu.dashboard": "Panel de Control",
    "menu.contacts": "Clientes y Proveedores",
    "menu.quotes": "Cotizaciones (Presupuestos)",
    "menu.clientOrders": "Órdenes de Clientes",
    "menu.supplierOrders": "Pedidos a Proveedores",
    "menu.reception": "Recepción de Contenedores",
    "menu.deliveries": "Despachos y Entregas",
    "menu.billing": "Facturación y CxC",
    "menu.ap": "Facturas de Proveedor (CxP)",
    "menu.reports": "Reportes y Análisis",
    "menu.warehouse": "Almacén",
    "menu.importHistory": "Importar Historial",
    "menu.customerRequests": "Pedidos de Clientes",
    "menu.users": "Usuarios y Permisos",
    "menu.config": "Configuración",

    // General
    "btn.save": "Guardar",
    "btn.cancel": "Cancelar",
    "btn.edit": "Editar",
    "btn.delete": "Eliminar",
    "btn.add": "Agregar",
    "btn.close": "Cerrar",
    "btn.approve": "Aprobar",
    "btn.anular": "Anular",
    "label.client": "Cliente",
    "label.provider": "Proveedor",
    "label.responsable": "Responsable de Carga",
    "label.date": "Fecha",
    "label.status": "Estado",
    "label.total": "Total",
    "label.subtotal": "Subtotal",
    "label.codigo": "Código",
    "label.description": "Descripción",
    "label.quantity": "Cantidad",
    "label.price": "Precio Unitario",
    "label.actions": "Acciones",

    // Quotes page
    "quote.title": "Cotizaciones y Presupuestos",
    "quote.subtitle": "Elabora presupuestos con cargos de flete y arancel personalizados.",
    "quote.new": "Nueva Cotización",
    "quote.edit": "Editar Cotización",
    "quote.freight": "Flete ($)",
    "quote.duty": "Arancel ($)",
    "quote.other": "Otros Gastos ($)",
    "quote.subtotalItems": "Subtotal de Ítems",
    "quote.totalUsd": "Total General USD",

    // Client orders page
    "order.title": "Órdenes de Clientes",
    "order.subtitle": "Seguimiento de la demanda, asignación de proveedores y formalización.",
    "order.new": "Nueva Orden de Venta",
    "order.formalize": "Formalizar Solicitud",
    "order.closeManual": "Completar Orden",
    "order.itemSupplier": "Proveedor por Ítem",
    "order.noSupplier": "-- Asignar Proveedor --",

    // Supplier orders page
    "supplier.title": "Pedidos a Proveedores",
    "supplier.subtitle": "Solicitudes automáticas consolidadas por proveedor y listas para enviar.",
    "supplier.new": "Nuevo Pedido",
    "supplier.assocOrders": "Órdenes Asociadas / Clientes",

    // Reception page
    "reception.title": "Recepción de Contenedores",
    "reception.subtitle": "Registra el ingreso de mercancía y distribuye de forma manual o FIFO.",
    "reception.manualMode": "Habilitar Distribución Manual",
    "reception.assocClients": "Distribución a Clientes Pendientes",
    "reception.btn": "Procesar Recepción",

    // Deliveries page
    "delivery.title": "Despachos y Entregas",
    "delivery.subtitle": "Registra los envíos físicos de mercancía a clientes.",
    "delivery.new": "Registrar Despacho",
    "delivery.autoInvoice": "Generar Factura Automáticamente",

    // Billing page
    "billing.title": "Facturación & Cuentas por Cobrar",
    "billing.subtitle": "Administración de cuentas por cobrar de clientes y pagos.",
    "billing.pay": "Cobrar / Abonar",
    "billing.invoiceDespacho": "Facturar Despacho Manual"
  },
  en: {
    // Sidebar
    "menu.dashboard": "Dashboard",
    "menu.contacts": "Clients & Suppliers",
    "menu.quotes": "Quotes (Budgets)",
    "menu.clientOrders": "Customer Orders",
    "menu.supplierOrders": "Supplier Requests",
    "menu.reception": "Container Reception",
    "menu.deliveries": "Deliveries & Shipments",
    "menu.billing": "Invoicing & A/R",
    "menu.ap": "Supplier Invoices (A/P)",
    "menu.reports": "Reports & Analytics",
    "menu.warehouse": "Warehouse",
    "menu.importHistory": "Import History",
    "menu.customerRequests": "Customer Requests",
    "menu.users": "Users & Permissions",
    "menu.config": "Configuration",

    // General
    "btn.save": "Save",
    "btn.cancel": "Cancel",
    "btn.edit": "Edit",
    "btn.delete": "Delete",
    "btn.add": "Add Item",
    "btn.close": "Close",
    "btn.approve": "Approve",
    "btn.anular": "Void",
    "label.client": "Client",
    "label.provider": "Supplier",
    "label.responsable": "Cargo Manager",
    "label.date": "Date",
    "label.status": "Status",
    "label.total": "Total",
    "label.subtotal": "Subtotal",
    "label.codigo": "Code",
    "label.description": "Description",
    "label.quantity": "Quantity",
    "label.price": "Unit Price",
    "label.actions": "Actions",

    // Quotes page
    "quote.title": "Quotes & Budgets",
    "quote.subtitle": "Prepare quotes with customized freight and customs duty charges.",
    "quote.new": "New Quote",
    "quote.edit": "Edit Quote",
    "quote.freight": "Freight ($)",
    "quote.duty": "Customs Duty ($)",
    "quote.other": "Other Expenses ($)",
    "quote.subtotalItems": "Items Subtotal",
    "quote.totalUsd": "Grand Total USD",

    // Client orders page
    "order.title": "Customer Orders",
    "order.subtitle": "Track demand, assign suppliers, and formalize requests.",
    "order.new": "New Sales Order",
    "order.formalize": "Formalize Request",
    "order.closeManual": "Complete Order",
    "order.itemSupplier": "Supplier per Item",
    "order.noSupplier": "-- Assign Supplier --",

    // Supplier orders page
    "supplier.title": "Supplier Orders",
    "supplier.subtitle": "Automated requests consolidated by supplier and ready to send.",
    "supplier.new": "New Order",
    "supplier.assocOrders": "Associated Orders / Clients",

    // Reception page
    "reception.title": "Container Reception",
    "reception.subtitle": "Register cargo arrival and distribute manually or via FIFO.",
    "reception.manualMode": "Enable Manual Distribution",
    "reception.assocClients": "Distribution to Pending Clients",
    "reception.btn": "Process Reception",

    // Deliveries page
    "delivery.title": "Deliveries & Shipments",
    "delivery.subtitle": "Register physical shipments of merchandise to clients.",
    "delivery.new": "Register Delivery",
    "delivery.autoInvoice": "Generate Invoice Automatically",

    // Billing page
    "billing.title": "Invoicing & Accounts Receivable",
    "billing.subtitle": "Management of customer accounts receivable and collections.",
    "billing.pay": "Collect / Pay",
    "billing.invoiceDespacho": "Invoice Delivery Note"
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("es");

  useEffect(() => {
    const stored = localStorage.getItem("app_lang") as Language;
    if (stored === "es" || stored === "en") {
      setLanguageState(stored);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app_lang", lang);
  };

  const t = (key: string): string => {
    const langDict = translations[language];
    return langDict[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
};
