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
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const { initializeDatabase, closeDatabase } = require("./database/db");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { logger, stream } = require("./utils/logger");
const { metricsMiddleware } = require("./middleware/metrics");

// Import routes
const authRoutes = require("./routes/auth");
const roomRoutes = require("./routes/rooms");
const questionRoutes = require("./routes/questions");
const examRoutes = require("./routes/exams");
const healthRoutes = require("./routes/health");
const metricsRoutes = require("./routes/metrics");

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Validate required environment variables
const requiredEnvVars = ["JWT_SECRET", "DATABASE_URL"];
if (NODE_ENV === "production") {
  requiredEnvVars.push("CLIENT_URL");
}

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingEnvVars.join(", ")}`);
  process.exit(1);
}

const CLIENT_URL = NODE_ENV === "production" 
  ? process.env.CLIENT_URL 
  : ["http://localhost:5173", "http://localhost:3000"];

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: NODE_ENV === "production",
}));

// Compression middleware
app.use(compression());

// Request ID middleware for tracing
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = Array.isArray(CLIENT_URL) ? CLIENT_URL : [CLIENT_URL];
    
    if (NODE_ENV === "development" || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  exposedHeaders: ["X-Request-ID"],
  maxAge: 600, // 10 minutes
};

app.use(cors(corsOptions));

// Body parsing middleware with size limits
app.use(express.json({ 
  limit: process.env.MAX_REQUEST_SIZE || "10mb",
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_REQUEST_SIZE || "10mb" }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Logging middleware
if (NODE_ENV === "production") {
  // Create logs directory if it doesn't exist
  const logDir = path.join(__dirname, "../logs");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }
  
  // Use combined log format in production with file streaming
  app.use(morgan('combined', { stream }));
} else {
  // Use dev log format in development
  app.use(morgan('dev', { stream }));
}

// Metrics middleware (optional)
if (process.env.ENABLE_METRICS === "true") {
  app.use(metricsMiddleware);
}

// Rate limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
  message: {
    success: false,
    error: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
});

// Apply rate limiting to all routes except health check
app.use("/api", (req, res, next) => {
  if (req.path === "/health") {
    return next();
  }
  return limiter(req, res, next);
});

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: {
    success: false,
    error: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter);

// Health check (no auth required)
app.use("/api/health", healthRoutes);

// Metrics endpoint (protected)
if (process.env.ENABLE_METRICS === "true") {
  app.use("/api/metrics", metricsRoutes);
}

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/rooms/:roomCode/questions", questionRoutes);
app.use("/api/rooms/:roomCode", examRoutes);

// Serve frontend in production
if (NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../frontend/dist");
  
  // Check if frontend build exists
  if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath, {
      maxAge: '1y',
      etag: true,
      immutable: true,
    }));

    // Handle client-side routing
    app.get("*", (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith("/api")) {
        return next();
      }
      
      // Send the frontend's index.html for all non-API routes
      res.sendFile(path.join(frontendPath, "index.html"), (err) => {
        if (err) {
          logger.error(`Error serving frontend: ${err.message}`);
          res.status(500).send("Error loading application");
        }
      });
    });
  } else {
    logger.warn("Frontend build not found. Static file serving disabled.");
  }
}

// 404 handler (should be after all routes)
app.use(notFoundHandler);

// Global error handler (should be last)
app.use(errorHandler);

// Start server with graceful shutdown
async function startServer() {
  try {
    // Initialize database connection
    await initializeDatabase();

    // Seed database in development
    if (NODE_ENV === "development") {
      const { seedDatabase } = require("./database/seed");
      await seedDatabase();
    }

    const server = app.listen(PORT, () => {
      logger.info(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║     Assessment Platform API Server                         ║
║                                                            ║
║     Running on: ${process.env.SERVER_URL || `http://localhost:${PORT}`}             
║     Environment: ${NODE_ENV}                          
║     Request ID: Enabled                                    
║     Rate Limiting: Enabled                                 
║     Metrics: ${process.env.ENABLE_METRICS === "true" ? "Enabled" : "Disabled"}                                  
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });

    // Increase server timeout for production
    if (NODE_ENV === "production") {
      server.timeout = 120000; // 2 minutes
    }

    return server;
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  
  let exitCode = 0;
  
  try {
    // Close database connection
    await closeDatabase();
    
    // Close server
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }
    
    logger.info("Graceful shutdown completed");
  } catch (error) {
    logger.error("Error during shutdown:", error);
    exitCode = 1;
  }
  
  process.exit(exitCode);
}

// Handle shutdown signals
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  shutdown("UNCAUGHT_EXCEPTION");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  shutdown("UNHANDLED_REJECTION");
});

let server;
startServer().then(s => server = s);