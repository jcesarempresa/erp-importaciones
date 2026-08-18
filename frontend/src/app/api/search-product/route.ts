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
      enfocándote en precios de venta al mayor, distribuidores o mercados FOB/CIF (ej. Alibaba, AliExpress, Amazon, eBay o tiendas mayoristas especializadas en China, USA, Europa y todo el mundo):
      
      Producto: "${query}"
      
      Debes buscar y listar obligatoriamente entre 5 y 10 fuentes reales y diferentes con los mejores precios del mercado actual. 
      Ordena la lista de fuentes de la más económica a la más costosa.
      
      Debes retornar obligatoriamente un objeto JSON con el siguiente formato estricto, sin bloques de código markdown (\`\`\`json) ni texto adicional:
      {
        "descripcion": "Descripción comercial limpia, atractiva y concisa del producto en español (ej. iPhone 15 Pro Max 256GB - Titanio Natural)",
        "detalles": "Especificaciones técnicas principales, dimensiones, peso, o empaque estándar encontrados",
        "precioEstimado": 899.99,
        "fuentes": [
          {
            "sitio": "Nombre del distribuidor o tienda (ej. AliExpress (China), Alibaba (Mayorista), eBay (USA), Amazon (USA))",
            "precio": "Rango de precio o precio unitario listado (ej. $150.00)",
            "url": "URL PÚBLICA Y VERIFICADA. Prohibido usar enlaces de redirección interna de Google (como 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/...'). Esos enlaces de redirigido de Google fallan con error 404. En su lugar, debes construir u obtener la URL pública real directa del producto, o en su defecto, una URL de búsqueda directa en esa tienda con los mejores términos para ese producto específico, por ejemplo:
             - Para AliExpress: 'https://www.aliexpress.com/wholesale?SearchText=playstation+4+console'
             - Para eBay: 'https://www.ebay.com/sch/i.html?_nkw=playstation+4+console+refurbished'
             - Para Alibaba: 'https://www.alibaba.com/trade/search?SearchText=playstation+4+console'
             - Para Amazon: 'https://www.amazon.com/s?k=playstation+4+console+renewed'
            Asegúrate de formatear correctamente las URLs para que sean públicas, válidas y de acceso mundial."
          }
        ]
      }
      
      Nota: En la propiedad 'precioEstimado', coloca solo el número decimal como un tipo number en JSON, representando el costo unitario promedio en USD.
      Utiliza la herramienta de búsqueda de Google para encontrar información real, verídica y del presente año. Incluye enlaces de fuentes de China, USA y globales que estén verificados y listos para hacer clic.
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
