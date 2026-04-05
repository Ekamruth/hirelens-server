const { getEmails } = require("./gmail.service");
const { cleanEmail } = require("./parser.service");
const { analyzeEmail } = require("./gemini.service");
const { classifyEmail } = require("./classifier.service"); // 🔥 NEW
const SyncState = require("../models/syncState.model");

const Application = require("../models/application.model");

exports.syncUserEmails = async () => {
  const userId = "default-user";
    // 🔥 Get last sync
  const syncState = await SyncState.findOne({ userId });

  const lastSyncedAt = syncState?.lastSyncedAt || null;

  console.log("⏱️ Last synced at:", lastSyncedAt);

  const emails = await getEmails(lastSyncedAt);

  const results = [];

  for (let email of emails) {
    try {
      const emailId = email.id;

      // ✅ Skip duplicates
      const exists = await Application.findOne({ emailId });
      if (exists) continue;

      // 🔥 STEP 1: AI CLASSIFICATION (main fix)
      const classification = await classifyEmail(email);

      if (!classification?.isRelevant) {
        console.log("❌ Skipped (AI):", email.subject);
        continue;
      }

      console.log("✅ Relevant (AI):", email.subject);

      // 🔥 STEP 2: Clean email body
      const cleanText = cleanEmail(email);
      if (!cleanText) continue;

      // 🔥 STEP 3: Extraction
      const aiData = await analyzeEmail(cleanText);

      // log extraction for debugging
      console.log("Extraction result:", aiData);

      // ❌ Skip garbage AI output
      if (!aiData || aiData.ignore) {
        console.log("⚠️ Ignored after extraction:", email.subject);
        continue;
      }

      // rely on AI extraction (no local heuristics)

      // Reconcile classifier + extractor to avoid conflicting labels (e.g. classifier=interview but extractor=status=applied)
      const finalStatus = reconcileStatus(classification, aiData);

      // inject reconciled status back into aiData for validation and storage
      aiData.status = finalStatus;

      // 🔥 STEP 4: Strong validation (VERY IMPORTANT)
      if (!isValidApplication(aiData)) {
        console.log("🚫 Rejected (validation):", email.subject, "- aiData:", aiData);
        continue;
      }

      const doc = {
        emailId,
        company: aiData.company || null,
        role: aiData.role || null,
        status: normalizeStatus(aiData.status),
        appliedDate: aiData.date ? new Date(aiData.date) : null,
        link: aiData.link || null,
        notes: aiData.notes || null,
        rawEmailSnippet: cleanText.slice(0, 200),
      };

      const saved = await Application.create(doc);

      results.push(saved);
    } catch (err) {
      console.error("Error processing email:", err);
    }
  }
  // 🔥 Update sync time
  await SyncState.findOneAndUpdate(
    { userId },
    { lastSyncedAt: new Date() },
    { upsert: true }
  );

  return results;
};

// 🔧 status normalization
const normalizeStatus = (status = "") => {
  const s = status.toLowerCase();

  if (s.includes("reject")) return "rejected";
  if (s.includes("interview")) return "interview";
  if (s.includes("offer")) return "offer";
  if (s.includes("apply")) return "applied";

  return "unknown";
};

// 🔥 NEW: validation layer (protects DB from junk)
const isValidApplication = (data) => {
  // must have at least something meaningful
  if (!data.company && !data.role) return false;

  // reject empty junk
  if (data.status === "unknown" && !data.company) return false;

  return true;
};

// Map classifier reason to canonical status value used by the extractor/DB
const mapClassifierReasonToStatus = (reason) => {
  if (!reason) return null;
  const r = String(reason).toLowerCase();
  if (r.includes("application")) return "applied";
  if (r.includes("interview")) return "interview";
  if (r.includes("reject")) return "rejected";
  if (r.includes("offer")) return "offer";
  return null;
};

// Reconcile the classifier decision and the extractor output.
// Rules:
// - If both agree (normalized), return that value.
// - If they disagree, prefer the one with higher reported confidence (if available).
// - If no confidence is available, prefer the extractor only if it explicitly contains strong keywords; otherwise prefer classifier.
// - If still ambiguous, return "unknown" to avoid bad DB inserts.
const reconcileStatus = (classification = {}, aiData = {}) => {
  const extracted = normalizeStatus(aiData.status || "");
  const fromClassifier = mapClassifierReasonToStatus(classification?.reason);

  if (!fromClassifier && !extracted) return "unknown";
  if (fromClassifier && fromClassifier === extracted) return fromClassifier;

  // prefer classifier when it reports high confidence
  const classConf = Number(classification?.confidence || classification?.__confidence || 0);
  const aiConf = Number(aiData?.__confidence || 0);

  if (classConf >= 0.75 && fromClassifier) return fromClassifier;
  if (aiConf >= 0.75 && extracted) return extracted;

  // fallback: if extractor clearly resolved to applied/interview/offer/rejected, take it
  if (extracted && extracted !== "unknown") return extracted;

  // else prefer classifier if it provided a non-null mapping
  if (fromClassifier) return fromClassifier;

  return "unknown";
};