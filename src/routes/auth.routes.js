const express = require("express");
const router = express.Router();

const { googleAuth, googleCallback } = require("../controllers/auth.controller");

// When this router is mounted at /auth in server.js, use the root path here
// so that GET /auth -> googleAuth
router.get("/", googleAuth);
router.get("/oauth2callback", googleCallback);

module.exports = router;