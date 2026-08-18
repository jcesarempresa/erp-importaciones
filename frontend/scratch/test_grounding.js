const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('No GEMINI_API_KEY found');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function run() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Investiga precios de Consola Sony PlayStation 4 (PS4) reacondicionada en Alibaba, AliExpress, eBay, Amazon.',
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    console.log('--- RESPONSE TEXT ---');
    console.log(response.text);

    console.log('\n--- GROUNDING METADATA ---');
    if (response.candidates && response.candidates[0] && response.candidates[0].groundingMetadata) {
      const metadata = response.candidates[0].groundingMetadata;
      console.log(JSON.stringify(metadata, null, 2));
    } else {
      console.log('No grounding metadata found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
