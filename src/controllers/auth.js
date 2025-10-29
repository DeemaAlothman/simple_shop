const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ROLES = ["OWNER", "CUSTOMER"];
const ACCESS_EXP = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const REFRESH_EXP = process.env.REFRESH_TOKEN_EXPIRY || "30d";

function safeUser(u) {
  return {
    id: u.id?.toString(),
    name: u.name,
    phone: u.phone,
    email: u.email ?? null,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt?.toISOString?.(),
  };
}

async function signup(req, res) {
  try {
    const { name, phone, password, role } = req.body;
    if (!name || !phone || !password) {
      return res
        .status(400)
        .json({
          message: "name, phone, password are required",
          timestamp: new Date().toISOString(),
        });
    }
    let finalRole = "CUSTOMER";
    if (role === "OWNER" && process.env.ALLOW_OWNER_SIGNUP === "true")
      finalRole = "OWNER";
    if (!ROLES.includes(finalRole)) {
      return res
        .status(400)
        .json({ message: "Invalid role", timestamp: new Date().toISOString() });
    }
    if (!/^\+?\d{7,15}$/.test(phone)) {
      return res
        .status(400)
        .json({
          message: "Invalid phone format",
          timestamp: new Date().toISOString(),
        });
    }
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return res
        .status(400)
        .json({
          message: "User with this phone already exists",
          timestamp: new Date().toISOString(),
        });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, phone, passwordHash, role: finalRole },
    });
    return res
      .status(201)
      .json({
        message: "User created successfully",
        user: safeUser(user),
        timestamp: new Date().toISOString(),
      });
  } catch (error) {
    console.error("Signup error:", error);
    return res
      .status(500)
      .json({
        message: "Error creating user",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
  }
}

async function login(req, res) {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res
        .status(400)
        .json({
          message: "phone and password are required",
          timestamp: new Date().toISOString(),
        });
    }
    const user = await prisma.user.findUnique({ where: { phone } });
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) {
      return res
        .status(401)
        .json({
          message: "Invalid phone or password",
          timestamp: new Date().toISOString(),
        });
    }
    const payload = { id: user.id.toString(), role: user.role };
    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: ACCESS_EXP,
    });
    const refreshToken = jwt.sign(
      { id: user.id.toString() },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_EXP }
    );
    return res.json({
      message: "Login successful",
      accessToken,
      refreshToken,
      role: user.role,
      user: safeUser(user),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({
        message: "Error logging in",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
  }
}

async function refresh(req, res) {
  try {
    const uid = getUid(req);
    if (!uid)
      return res
        .status(401)
        .json({
          message: "Invalid token payload",
          timestamp: new Date().toISOString(),
        });
    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!user || !user.isActive) {
      return res
        .status(401)
        .json({
          message: "User not found or inactive",
          timestamp: new Date().toISOString(),
        });
    }
    const newAccessToken = jwt.sign(
      { id: user.id.toString(), role: user.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_EXP }
    );
    return res.json({
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Refresh error:", error);
    return res
      .status(500)
      .json({
        message: "Error refreshing token",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
  }
}

async function logout(_req, res) {
  try {
    return res.json({
      message: "Logged out successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res
      .status(500)
      .json({
        message: "Error logging out",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
  }
}

function toJSON(data) {
  return JSON.parse(
    JSON.stringify(data, (k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}
function getUid(req) {
  const id = req?.user?.uid ?? req?.user?.id;
  if (!id) return 0n;
  try {
    return BigInt(id);
  } catch {
    return BigInt(parseInt(id, 10) || 0);
  }
}

module.exports = { signup, login, refresh, logout, toJSON, getUid };
