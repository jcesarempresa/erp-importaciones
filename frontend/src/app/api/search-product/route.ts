import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { setDefaultResultOrder } from 'node:dns';

setDefaultResultOrder('ipv4first');

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Falta la consulta de búsqueda.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'No se ha configurado la API Key de Gemini en el servidor.' 
      }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Eres un asistente experto en compras e investigación de mercado internacional.
      Investiga precios actuales y especificaciones comerciales del siguiente producto en internet, 
      enfocándote en precios de venta al mayor, distribuidores o mercados FOB/CIF (ej. Alibaba, Amazon Business, eBay o tiendas mayoristas especializadas):
      
      Producto: "${query}"
      
      Debes retornar obligatoriamente un objeto JSON con el siguiente formato estricto, sin bloques de código markdown (\`\`\`json) ni texto adicional:
      {
        "descripcion": "Descripción comercial limpia, atractiva y concisa del producto en español (ej. iPhone 15 Pro Max 256GB - Titanio Natural)",
        "detalles": "Especificaciones técnicas principales, dimensiones, peso, o empaque estándar encontrados",
        "precioEstimado": 899.99,
        "fuentes": [
          {
            "sitio": "Nombre del distribuidor o tienda (ej. Alibaba, Amazon)",
            "precio": "Rango de precio o precio unitario listado (ej. $850 - $920)",
            "url": "Enlace web EXACTO, completo y directo de la fuente o producto encontrado (ej. 'https://www.ebay.com/itm/123456789' o la URL larga de búsqueda específica de Alibaba, NUNCA un enlace genérico como 'https://www.ebay.com' o 'https://alibaba.com'). Utiliza las URLs de origen proporcionadas por los metadatos de búsqueda."
          }
        ]
      }
      
      Nota: En la propiedad 'precioEstimado', coloca solo el número decimal como un tipo number en JSON, representando el costo unitario promedio en USD.
      Utiliza la herramienta de búsqueda de Google para encontrar información real, verídica y del presente año.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const responseText = response.text || '';
    
    let jsonString = responseText.trim();
    if (jsonString.includes('```json')) {
      jsonString = jsonString.split('```json')[1].split('```')[0];
    } else if (jsonString.includes('```')) {
      jsonString = jsonString.split('```')[1].split('```')[0];
    }

    const parsedData = JSON.parse(jsonString.trim());
    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Error al investigar producto con Gemini:', error);
    return NextResponse.json({ error: error.message || 'Error al realizar la investigación con IA.' }, { status: 500 });
  }
}
