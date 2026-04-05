require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");

const authRoutes = require("./src/routes/auth.routes");
const syncRoutes = require("./src/routes/sync.routes");
const applicationRoutes = require("./src/routes/application.routes");

connectDB();
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/auth", authRoutes);   // → /auth, /auth/oauth2callback
app.use("/api", syncRoutes);    // → /api/sync-emails 
app.use("/api", applicationRoutes);

// Support legacy redirect URI at root (/oauth2callback) by forwarding to the mounted auth route
app.get('/oauth2callback', (req, res) => {
  const qs = req.url.split('?')[1];
  res.redirect(`/auth/oauth2callback${qs ? '?' + qs : ''}`);
});

// Health check (optional but useful)
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("🔥 Error:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});