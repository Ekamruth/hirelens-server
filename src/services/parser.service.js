const { htmlToText } = require("html-to-text");

function extractBody(payload) {
  if (!payload) return "";

  if (payload.parts) {
    for (let part of payload.parts) {
      if (part.mimeType === "text/plain") {
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }

      if (part.mimeType === "text/html") {
        const html = Buffer.from(part.body.data, "base64").toString("utf-8");
        return htmlToText(html);
      }
    }
  }

  if (payload.body && payload.body.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }

  return "";
}

function cleanEmail(emailData) {
  const body = extractBody(emailData.payload);
  return body.replace(/\s+/g, " ").trim();
}

module.exports = { cleanEmail };