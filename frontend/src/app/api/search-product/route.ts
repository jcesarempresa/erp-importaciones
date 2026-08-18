import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { setDefaultResultOrder } from 'node:dns';

setDefaultResultOrder('ipv4first');

export const maxDuration = 120;

// Helper: esperar N milisegundos
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: llamar a Gemini con reintentos automáticos ante errores 429/503
async function callGeminiWithRetry(ai: any, prompt: string, maxRetries = 4): Promise<string> {
  const delays = [3000, 6000, 12000, 20000]; // Esperas entre reintentos: 3s, 6s, 12s, 20s

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { tools: [{ googleSearch: {} }] }
      });
      return response.text || '';
    } catch (err: any) {
      const msg = err?.message || '';
      const isRetryable = msg.includes('503') || msg.includes('UNAVAILABLE') ||
                          msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') ||
                          msg.includes('high demand');

      if (isRetryable && attempt < maxRetries) {
        console.log(`Gemini error (intento ${attempt + 1}/${maxRetries + 1}), reintentando en ${delays[attempt] / 1000}s...`);
        await sleep(delays[attempt]);
        continue;
      }
      // Si no es reintentable o agotamos los intentos, relanzar
      throw err;
    }
  }
  throw new Error('Se agotaron los reintentos de Gemini.');
}

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

    // Llamar a Gemini con reintentos automáticos ante saturación
    const responseText = await callGeminiWithRetry(ai, prompt);
    
    let jsonString = responseText.trim();
    if (jsonString.includes('```json')) {
      jsonString = jsonString.split('```json')[1].split('```')[0];
    } else if (jsonString.includes('```')) {
      jsonString = jsonString.split('```')[1].split('```')[0];
    }

    const parsedData = JSON.parse(jsonString.trim());

    // Validar enlaces en el servidor y corregir enlaces rotos con alternativas seguras
    if (parsedData.fuentes && Array.isArray(parsedData.fuentes)) {
      const validatedFuentes = await Promise.all(
        parsedData.fuentes.map(async (f: any) => {
          const alive = await isUrlAlive(f.url);
          if (!alive) {
            // Reemplazar enlace roto con URL de búsqueda directa garantizada
            const queryTerm = encodeURIComponent(query);
            let fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(f.sitio + " " + query)}`;
            
            const lowerSitio = f.sitio.toLowerCase();
            if (lowerSitio.includes('aliexpress')) {
              fallbackUrl = `https://www.aliexpress.com/wholesale?SearchText=${queryTerm}`;
            } else if (lowerSitio.includes('alibaba')) {
              fallbackUrl = `https://www.alibaba.com/trade/search?SearchText=${queryTerm}`;
            } else if (lowerSitio.includes('ebay')) {
              fallbackUrl = `https://www.ebay.com/sch/i.html?_nkw=${queryTerm}`;
            } else if (lowerSitio.includes('amazon')) {
              fallbackUrl = `https://www.amazon.com/s?k=${queryTerm}`;
            }
            
            return {
              ...f,
              url: fallbackUrl,
              sitio: `${f.sitio} (Búsqueda Directa)`
            };
          }
          return f;
        })
      );
      parsedData.fuentes = validatedFuentes;
    }

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Error al investigar producto con Gemini:', error);
    return NextResponse.json(
      { error: 'No se pudo obtener respuesta de la IA después de varios intentos. Por favor intenta de nuevo en un momento.' },
      { status: 500 }
    );
  }
}

// Función auxiliar en el servidor para comprobar si un enlace está activo (evitar 404)
async function isUrlAlive(url: string): Promise<boolean> {
  if (!url || !url.startsWith('http')) return false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // Timeout rápido de 3.5 segundos para no colgar la consulta
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Si da 404, definitivamente está muerto
    if (res.status === 404) {
      return false;
    }
    return true;
  } catch (err) {
    // Si hay error de red o timeout, lo marcamos como inactivo para usar el buscador de respaldo
    return false;
  }
}
