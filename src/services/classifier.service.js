const { generateContent } = require("./gemini.service");

async function classifyEmail(email) {
  const subject = email.subject || "";
  const snippet = email.snippet || "";

  const prompt = `
You are an email classifier specialized for job-application pipeline emails.

Task: Decide whether this email is a REAL job-application lifecycle message (application confirmation, interview invite, rejection, or offer).

Return ONLY a single JSON object and nothing else. No explanation, no backticks, no commentary.
The JSON must be exactly in this shape (extra fields are allowed but keep these keys):
{
  "isRelevant": true|false,
  "reason": "application_confirmation"|"interview_invite"|"rejection"|"offer"|"other"|"undetermined",
  "evidence": "short verbatim excerpt (<=140 chars) from subject or snippet that justifies the label",
  "confidence": 0.0
}

Rules (be strict):
- Only mark "isRelevant: true" when there is a clear, explicit signal in the subject/snippet about an application event.
- "application_confirmation": require explicit phrases like "we have received your application", "application received", "thank you for applying", "your application has been submitted", or "we received your application for".
- "interview_invite": require explicit mention of "interview", "invite", "scheduled", "we'd like to invite you", "1st round", "phone screen", "video call", or a specific interview date/time.
- "rejection" and "offer": require language that clearly states rejection or an offer.
- If none of the above are explicit, set "isRelevant": false with reason: "other" or "undetermined".
- "evidence" must be a short verbatim excerpt (<=140 chars) from the Subject or Snippet that supports the decision.
- "confidence" should be a number between 0.0 and 1.0 reflecting how explicit the evidence is (1.0 = explicit phrase present).

Examples (valid outputs):
Email:
Subject: We have received your application for Front-end Developer
Snippet: Thanks for applying — we'll review your profile
Output:
{"isRelevant": true, "reason": "application_confirmation", "evidence": "We have received your application for Front-end Developer", "confidence": 1.0}

Email:
Subject: Interview 1st Round - Profile Details Required
Snippet: We'd like to invite you to a phone interview on May 10
Output:
{"isRelevant": true, "reason": "interview_invite", "evidence": "invite you to a phone interview on May 10", "confidence": 1.0}

Email:
Subject: Weekly Jobs You May Like
Snippet: New roles in your area
Output:
{"isRelevant": false, "reason": "other", "evidence": "Weekly Jobs You May Like", "confidence": 0.1}

If you are uncertain, return {"isRelevant": false, "reason": "undetermined", "evidence": "", "confidence": 0.0}.

Email:
Subject: ${subject}
Snippet: ${snippet}
`;

  // Use the shared gemini service to get normalized text
  const text = await generateContent(prompt);

  // Models sometimes wrap JSON in markdown code fences (```json ... ```) or add stray text.
  // Normalize the output: strip code fences, extract the first JSON object, then parse.
  console.log("Classifier raw response:", text);

  const cleaned = String(text || "").trim()
    // strip leading/trailing triple-backtick fences with optional "json"
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // try to find the first JSON object substring
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  const toParse = jsonMatch ? jsonMatch[0] : cleaned;

  try {
    return JSON.parse(toParse);
  } catch (err) {
    // If parse still fails, return an explicit undetermined result and include raw text for debugging.
    console.warn("Classifier parse failed. Cleaned output:", cleaned);
    return { isRelevant: false, reason: "undetermined", __raw: text };
  }
}

module.exports = { classifyEmail };