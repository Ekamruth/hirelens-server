const express = require("express");
const router = express.Router();

const { syncEmails } = require("../controllers/sync.controller");

// Allow both POST (API) and GET (quick browser check) for convenience
router.post("/sync-emails", syncEmails);
router.get("/sync-emails", syncEmails);

module.exports = router;