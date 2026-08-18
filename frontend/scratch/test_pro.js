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
      model: 'gemini-2.5-pro',
      contents: 'Hola, di probando modelo pro.',
    });

    console.log('--- RESPONSE ---');
    console.log(response.text);
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
