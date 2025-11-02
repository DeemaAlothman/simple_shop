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
const ownerUploadRoutes = require("./routes/owner/uploads"); // ⬅️ جديد

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ✅ قدّم مجلد الرفع كـ static
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// --- Health ---
app.get("/health", (_req: Request, res: Response) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);

// --- Public/Auth ---
app.use("/auth", authRoutes);

// --- Catalog (public) ---
app.use("/catalog", catalogRoutes);
app.use("/catalog", catalogOffersRoutes); // /catalog/offers, /catalog/price ...

// --- Customer orders (requires auth inside the router) ---
app.use("/orders", customerOrderRoutes);

// --- Owner (requires OWNER auth inside sub-routers) ---
app.use("/owner", ownerRoutes); // brands, categories, products ...
app.use("/owner/orders", ownerOrderRoutes);
app.use("/owner", ownerOffersRoutes); // /owner/offers
app.use("/owner/uploads", ownerUploadRoutes); // ⬅️ POST /owner/uploads

// --- 404 ---
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Not found", path: req.originalUrl });
});

// --- Global error guard ---
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Server error" });
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server on http://localhost:${PORT}`);
});
