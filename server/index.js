const express = require("express");
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const session = require("express-session");
const MongoStore = require("connect-mongo").default || require("connect-mongo");
const passport = require("passport");

dotenv.config();

const authRoutes = require("./routes/auth");
const conversationRoutes = require("./routes/conversations");
const messageRoutes = require("./routes/messages");
const userRoutes = require("./routes/users");
const uploadRoutes = require("./routes/upload");
const friendRoutes = require("./routes/friends");
const { initSocket } = require("./socket/socket");
require("./config/passport");

const app = express();
let server;

if (process.env.NODE_ENV === "development") {
  try {
    const httpsOptions = {
      key: fs.readFileSync(path.join(__dirname, "../certs/key.pem")),
      cert: fs.readFileSync(path.join(__dirname, "../certs/cert.pem")),
    };
    server = https.createServer(httpsOptions, app);
    console.log("🛡️  HTTPS Server enabled for development");
  } catch (err) {
    console.error("❌ Failed to load SSL certificates, falling back to HTTP:", err.message);
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
}

// CORS configuration for production
const allowedOrigins = [
  process.env.CLIENT_URL || "https://localhost:5173",
  "https://localhost:5174",
  "https://baithak.vercel.app",
];

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const isLocalhost = origin && origin.includes("localhost");
      if (!origin || isLocalhost || allowedOrigins.some((o) => origin.startsWith(o.replace("*", "")))) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Session and Passport middleware
app.use(
  session({
    secret: process.env.JWT_SECRET || "baithak_secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Attach io to request for use in controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api", uploadRoutes);

// Health check
app.get("/", (req, res) => res.json({ status: "Baithak API running 🚀" }));

// Socket.IO
initSocket(io);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    
    // Increase timeout to 5 minutes for large file uploads
    server.timeout = 300000;          // 5 minutes
    server.keepAliveTimeout = 120000; // 2 minutes

    server.listen(process.env.PORT || 5000, () =>
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch((err) => console.error("❌ MongoDB error:", err));
