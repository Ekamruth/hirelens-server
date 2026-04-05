// services/aiService.js

const { GoogleGenAI } = require("@google/genai");

// Initialize the GenAI client using the GEMINI_API_KEY env var.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Generic helper that generates content for a prompt and returns the plain text.
// Accepts model options (temperature, maxOutputTokens, etc.) and forwards them to the client.
async function generateContent(prompt, options = {}) {
  const model = process.env.GENAI_MODEL || "text-bison@001";
  console.log("GenAI model:", model);

  // default deterministic params
  const defaultOptions = {
    temperature: 0,
    // keep output reasonably sized
    maxOutputTokens: 512,
    // candidateCount or similar options may be supported by the client - allow override
  };

  const callOptions = Object.assign({ model, contents: prompt }, defaultOptions, options);

  const response = await ai.models.generateContent(callOptions);

  // Normalize common response shapes into a single string
  const text = response?.text || response?.output?.[0]?.content?.[0]?.text || JSON.stringify(response);
  return String(text);
}

async function analyzeEmail(content) {
  // A strict, few-shot prompt that asks for ONLY the JSON object and provides examples.
  const promptBase = `You are a high-precision extractor for job-related emails. Read the raw email text and RETURN ONLY a single JSON object (no explanation, no backticks, no extra text) with the following fields:
company, role, status, date

Field details and strict rules:
- company: company name mentioned in the email. If unknown, return an empty string.
- role: job title mentioned in the email. If unknown, return an empty string.
- status: one of the exact values: applied | interview | rejected | offer | unknown
  - Set "applied" ONLY when the email explicitly says the application was received/submitted/accepted for consideration (examples: "we have received your application", "application received", "thank you for applying", "your application has been submitted").
  - Set "interview" ONLY when the email explicitly mentions an interview invitation or scheduling (words like "interview", "invite", "scheduled", "phone screen", "video call", "onsite", or a concrete interview date/time).
  - Set "rejected" or "offer" only when the email explicitly communicates rejection or an offer.
  - If none of the above are explicit, set status to "unknown" (do NOT infer "applied" from vague phrasing, newsletters, or job-alert style emails).
- date: return an ISO date (YYYY-MM-DD) if a specific date is mentioned for an interview or offer; otherwise return an empty string.

Output rules:
- Return ONLY the JSON object. If a value is unknown, return an empty string for that field.
- Include an optional "__confidence" (0.0-1.0) and optional "__evidence" (short verbatim excerpt <=140 chars) if helpful — these are optional but allowed.
- Normalize company and role to a readable form (e.g., "Acme Corp", "Software Engineer").

Examples (valid outputs):
Email:
"Hello,\nWe have received your application for Front-end Developer at Capgemini. We'll reach out soon.\nThanks"
Output:
{"company":"Capgemini","role":"Front-end Developer","status":"applied","date":""}

Email:
"Dear Candidate,\nYour interview is scheduled for May 10th for the role of Software Engineer at Acme Corp.\nRegards"
Output:
{"company":"Acme Corp","role":"Software Engineer","status":"interview","date":"2026-05-10"}

Email (ambiguous):
"Hi,\nWe thought you may be interested in this role. Check out the job posting.\nThanks"
Output:
{"company":"","role":"","status":"unknown","date":""}

Now extract for this email (return only the JSON object):\n\n"${content}"`;

  try {
    // First attempt with deterministic params
    const text = await generateContent(promptBase, { temperature: 0 });

    // Try parse, extract JSON substring if necessary
    try {
      return JSON.parse(text);
    } catch (e) {
      const jsonMatch = (text || "").match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e2) {
          // fall through to retry
        }
      }
    }

    // Retry once with an even stricter instruction and include previous response for context
    const retryPrompt = promptBase + "\n\nPREVIOUS RESPONSE:\n" + text + "\n\nReturn ONLY the JSON object now.";

    const retryText = await generateContent(retryPrompt, { temperature: 0 });
    try {
      return JSON.parse(retryText);
    } catch (e) {
      const jsonMatch2 = (retryText || "").match(/\{[\s\S]*\}/);
      if (jsonMatch2) {
        try {
          return JSON.parse(jsonMatch2[0]);
        } catch (e2) {
          // give up below
        }
      }
    }

    // Last resort: return raw text to let caller decide (we avoid local heuristics here as requested)
    return { __raw: text };
  } catch (err) {
    console.error("GenAI Error:", err?.message || err);
    throw err;
  }
}

module.exports = { generateContent, analyzeEmail };