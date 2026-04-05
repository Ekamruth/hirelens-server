const { google } = require("googleapis");
const oauthClient = require("../config/oauth");

async function getEmails(afterDate = null) {
  const gmail = google.gmail({ version: "v1", auth: oauthClient });

  // 🔹 Build query dynamically
  let queryParts = ["application", "interview", "job", "offer", "rejected"];

  let query = queryParts.join(" OR ");

  if (afterDate) {
    const unixTime = Math.floor(new Date(afterDate).getTime() / 1000);
    query += ` after:${unixTime}`;
  }

  // 🔹 Step 1: Get message IDs
  const res = await gmail.users.messages.list({
    userId: "me",
    maxResults: 25, // increase gradually later
    q: query,
  });
  console.log("Gmail API - messages.list response:", res.data);
  if (!res.data.messages) return [];

  const messages = res.data.messages;

  // 🔹 Step 2: Fetch full emails in parallel (FAST 🚀)
  const fullEmails = await Promise.all(
    messages.map((msg) =>
      gmail.users.messages.get({
        userId: "me",
        id: msg.id,
      })
    )
  );

  // 🔹 Step 3: return only da ta
  // Normalize messages so callers can safely access common fields like subject/snippet
  const normalizeHeader = (payload, name) => {
    if (!payload || !payload.headers) return null;
    const h = payload.headers.find((hh) => hh.name.toLowerCase() === name.toLowerCase());
    return h ? h.value : null;
  };

  return fullEmails.map((e) => {
    const data = e.data || {};
    // add convenience fields
    data.subject = data.subject || normalizeHeader(data.payload, "Subject") || "";
    data.from = data.from || normalizeHeader(data.payload, "From") || "";
    data.date = data.date || data.internalDate || null;
    return data;
  });
}

module.exports = { getEmails };