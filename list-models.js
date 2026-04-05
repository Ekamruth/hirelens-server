require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

(async () => {
  try {
    const resp = await ai.models.list();
    const models = resp?.models || resp?.data?.models || resp;
    const list = Array.isArray(models) ? models : [];
    console.log('Models available (excerpt):');
    list.slice(0, 100).forEach(m => {
      const id = m.name || m.model || m.id || m.modelId || '(unknown)';
      const methods = m.supportedMethods || m.supported?.methods || m.features || [];
      console.log('-', id, '\n   supported:', Array.isArray(methods) ? methods.join(', ') : methods, '\n');
    });
    if (!list.length) console.log('No models returned. Raw response:', JSON.stringify(resp, null, 2));
  } catch (e) {
    console.error('Failed to list models:', e?.message || e);
    if (e?.response) console.error('Response body:', JSON.stringify(e.response?.data || e.response, null, 2));
    process.exit(1);
  }
})();
