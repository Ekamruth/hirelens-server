const express = require("express");
const router = express.Router();

const { getApplications } = require("../controllers/application.controller");

router.get("/applications", getApplications);

module.exports = router;