import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { setDefaultResultOrder } from 'node:dns';

// Fix for Node.js 18+ undici fetch ENOTFOUND bug on Windows with IPv6
setDefaultResultOrder('ipv4first');

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { pdfBase64, mimeType } = await request.json();

    if (!pdfBase64) {
      return NextResponse.json({ error: 'Falta el documento PDF.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'No se ha configurado la API Key de Gemini en el servidor.' 
      }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // The prompt to instruct Gemini to extract the order items as JSON
    const prompt = `
      Eres un asistente experto en extracción de datos para un sistema ERP.
      Se te proporciona un documento (PDF, Factura, Cotización o Purchase Order).
      Extrae el nombre de la empresa principal (cliente o proveedor) y todas las líneas de artículos (items).
      Devuelve ÚNICAMENTE un objeto JSON con el siguiente formato, sin bloques de código ni texto adicional:
      {
        "entidad": "Nombre LEGAL de la empresa, cliente o proveedor. PREFIERE SIEMPRE el nombre que acompañe a la identificación fiscal o dirección (ej. FIBRANOVA C.A.) por encima de logotipos comerciales gigantes (ej. MASISA).",
        "entidadRif": "Identificación fiscal de la empresa (RIF, NIT, RUT, VAT). Si no hay, déjalo en blanco.",
        "entidadDireccion": "Dirección física de la empresa que emite o recibe. Si no hay, déjalo en blanco.",
        "entidadEmail": "Correo electrónico general o de contacto. Si no hay, déjalo en blanco.",
        "entidadTelefono": "Teléfono de contacto o fax de la empresa. Si no hay, déjalo en blanco.",
        "numeroDocumento": "El número de documento principal, Factura No., Invoice No., Order No., RFQ No., PO No. (Si no hay, déjalo en blanco).",
        "tipoDocumento": "Identifica qué tipo de documento es: 'Factura', 'Cotizacion', 'OrdenCompra', o 'Desconocido'.",
        "referenciasPO": "Si el documento es una factura, extrae aquí cualquier número de Purchase Order (PO No.) u orden de cliente que esté referenciada como texto separado por comas. Si no hay, déjalo en blanco.",
        "totalDocumento": Número decimal con el importe/total a pagar de la factura (solo si es factura o cotización con total, si no hay pon 0),
        "flete": Número decimal correspondiente a cargos por flete o envío (shipping, freight). Si no hay, pon 0,
        "impuestos": Número decimal correspondiente a impuestos (VAT, IVA, Tax). Si no hay, pon 0,
        "observaciones": "Captura cualquier nota importante, condiciones, normativas legales, lugares de entrega o texto general que aplique a toda la cotización/factura (por ejemplo: 'NOTAS IMPORTANTES: FAVOR INDICAR MEJOR LUGAR...'). Si no hay, déjalo en blanco.",
        "items": [
          {
            "pos": "Número de línea, posición o item de la orden original (ej. 1, 2, 10, 20). Si no hay, déjalo en blanco",
            "sku": "Código o Referencia interna del artículo (si no hay, déjalo en blanco)",
            "skuProveedor": "Número de parte del fabricante o código del proveedor (Part No, Item No). Si no hay, déjalo en blanco",
            "descripcion": "Nombre o descripción corta del artículo",
            "detalles": "Especificaciones técnicas completas, medidas, normas, párrafos informativos largos o descripciones detalladas adicionales",
            "cantidadPedida": Número entero de la cantidad pedida/facturada,
            "unidad": "Unidad de medida (ej. Unidad, PZA, KG, MTS). Si no hay, déjalo en blanco",
            "plazo": "Plazo de entrega de la oferta o item (ej. 15 días, 4 weeks). Si no hay, déjalo en blanco",
            "fechaEntrega": "Fecha exacta de entrega solicitada (ej. 15/08/2026). Si no hay, déjalo en blanco",
            "precioUnitario": Número decimal del precio unitario (usa 0 si no hay precio)
          }
        ]
      }
      No devuelvas nada más que el JSON puro.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType || 'application/pdf',
                data: pdfBase64
              }
            }
          ]
        }
      ]
    });

    const responseText = response.text || '';
    
    // Attempt to parse the response text as JSON
    // Gemini might return it wrapped in ```json ... ```
    let jsonString = responseText;
    if (jsonString.includes('```json')) {
      jsonString = jsonString.split('```json')[1].split('```')[0];
    } else if (jsonString.includes('```')) {
      jsonString = jsonString.split('```')[1].split('```')[0];
    }

    const parsedData = JSON.parse(jsonString.trim());

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Error al extraer datos con Gemini:', error);
    
    let errMsg = error.message || 'Error interno del servidor al procesar el documento con IA.';
    if (errMsg === 'fetch failed' && error.cause) {
      errMsg = `Error de red (fetch failed): ${error.cause.message || error.cause.code || JSON.stringify(error.cause)}. Verifica tu conexión a internet o VPN.`;
    }
    // Si el mensaje de error es un JSON de la API de Google, intentar parsearlo
    try {
      if (errMsg.startsWith('{') && errMsg.includes('"error"')) {
        const parsed = JSON.parse(errMsg);
        if (parsed.error?.code === 503) {
          errMsg = "El servicio de Inteligencia Artificial (Gemini) está temporalmente saturado por alta demanda. Por favor, intenta de nuevo en unos minutos.";
        } else if (parsed.error?.message) {
          errMsg = parsed.error.message;
        }
      } else if (errMsg.includes('503')) {
        errMsg = "El servicio de Inteligencia Artificial (Gemini) está temporalmente saturado por alta demanda. Por favor, intenta de nuevo en unos minutos.";
      }
    } catch(e) {
      // ignorar error de parseo
    }
    
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
