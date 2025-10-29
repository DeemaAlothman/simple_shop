const jwt = require("jsonwebtoken");

// استخراج التوكن من Authorization أو من body (اختياري للـ refresh)
function extractBearer(req) {
  const h = req.headers["authorization"] || req.headers["Authorization"];
  if (!h) return null;
  const [scheme, token] = String(h).split(" ");
  if (scheme?.toLowerCase() !== "bearer") return null;
  return token || null;
}

// يحوّل الـ id للنمط المناسب (BigInt-safe إذا لزم)
function parseUid(raw) {
  if (!raw) return null;
  try {
    // احتفظ به كنص على req.user.id، وحوّله BigInt فقط عند استعلام Prisma
    return String(raw);
  } catch {
    return null;
  }
}

function verifyAccessToken(req, res, next) {
  try {
    const token = extractBearer(req);
    if (!token) {
      return res
        .status(401)
        .json({ message: "Missing Authorization Bearer access token" });
    }
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const uid = parseUid(decoded?.id);
    if (!uid) {
      return res.status(401).json({ message: "Invalid access token payload" });
    }
    req.user = { id: uid, role: decoded?.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
}

function verifyRefreshToken(req, res, next) {
  try {
    // جرّب من الهيدر أولاً، ثم من body.refreshToken
    const tokenFromHeader = extractBearer(req);
    const token = tokenFromHeader || req.body?.refreshToken;
    if (!token) {
      return res.status(401).json({ message: "Missing refresh token" });
    }
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const uid = parseUid(decoded?.id);
    if (!uid) {
      return res.status(401).json({ message: "Invalid refresh token payload" });
    }
    req.user = { id: uid }; // ما في داعي للدور هنا
    next();
  } catch (_err) {
    return res
      .status(401)
      .json({ message: "Invalid or expired refresh token" });
  }
}

function checkRole(...allowed) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

module.exports = {
  verifyAccessToken,
  verifyRefreshToken,
  checkRole,
};
