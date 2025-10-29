// src/index.ts
import type { Request, Response } from "express";
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");

const app = express();
app.use(cors());
app.use(express.json());

// صحّة السيرفر
app.get("/health", (_req: Request, res: Response) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);

// راوتر الأوث
app.use("/auth", authRoutes);

// 404
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Not found", path: req.originalUrl });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
