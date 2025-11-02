// src/index.ts
import type { Request, Response, NextFunction } from "express";
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

// --- Routers ---
const authRoutes = require("./routes/auth");
const catalogRoutes = require("./routes/catalog");
const catalogOffersRoutes = require("./routes/catalog/offers");
const customerOrderRoutes = require("./routes/orders");
const ownerRoutes = require("./routes/owner");
const ownerOrderRoutes = require("./routes/owner/orders");
const ownerOffersRoutes = require("./routes/owner/offers");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// **Serve uploads folder publicly**
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Health
app.get("/health", (_req: Request, res: Response) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);

// Public/Auth
app.use("/auth", authRoutes);

// Catalog (public)
app.use("/catalog", catalogRoutes);
app.use("/catalog", catalogOffersRoutes);

// Customer orders
app.use("/orders", customerOrderRoutes);

// Owner
app.use("/owner", ownerRoutes);
app.use("/owner/orders", ownerOrderRoutes);
app.use("/owner", ownerOffersRoutes);

// 404
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Not found", path: req.originalUrl });
});

// Global error
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server on http://localhost:${PORT}`);
});
