/**
 * Assessment Platform Server
 * Main entry point for the backend API
 * HCI Principles: Security, Error Prevention, Performance
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const { initializeDatabase } = require("./database/db");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

// Import routes
const authRoutes = require("./routes/auth");
const roomRoutes = require("./routes/rooms");
const questionRoutes = require("./routes/questions");
const examRoutes = require("./routes/exams");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Request logging (development only)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Assessment Platform API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/rooms/:roomCode/questions", questionRoutes);
app.use("/api/rooms/:roomCode", examRoutes);

// Serve static files (frontend) in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
  });
}

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();

    // Seed database in development
    if (process.env.NODE_ENV === "development") {
      const { seedDatabase } = require("./database/seed");
      await seedDatabase();
    }

    // Start listening
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║     Assessment Platform API Server                         ║
║                                                            ║
║     Running on: http://localhost:${PORT}                    ║
║     Environment: ${process.env.NODE_ENV || "development"}                           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
      console.log("Available endpoints:");
      console.log("  POST /api/auth/register    - Register new user");
      console.log("  POST /api/auth/login       - Login user");
      console.log("  GET  /api/auth/me          - Get current user");
      console.log("  POST /api/rooms            - Create room (teacher)");
      console.log("  GET  /api/rooms/teacher    - Get teacher rooms");
      console.log("  POST /api/rooms/join       - Join room (student)");
      console.log("  GET  /api/health           - Health check");
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  const { closeDatabase } = require("./database/db");
  await closeDatabase();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received. Shutting down gracefully...");
  const { closeDatabase } = require("./database/db");
  await closeDatabase();
  process.exit(0);
});

// Start the server
startServer();