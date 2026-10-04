require("dotenv").config();

const express = require("express");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = Number(process.env.PORT || 3070);
const ROOT = __dirname;
const dataDir = path.join(ROOT, "data");
const uploadDir = path.join(ROOT, "uploads");
const storeFile = path.join(dataDir, "store.json");
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

function createStore() {
  return { nextAchievementId: 1, nextLogId: 1, achievements: [], logs: [] };
}
function loadStore() {
  try {
    if (!fs.existsSync(storeFile)) return createStore();
    const parsed = JSON.parse(fs.readFileSync(storeFile, "utf8"));
    return {
      nextAchievementId: Number(parsed.nextAchievementId) || 1,
      nextLogId: Number(parsed.nextLogId) || 1,
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : []
    };
  } catch (e) {
    console.error("Could not read data/store.json:", e.message);
    return createStore();
  }
}
let store = loadStore();
function saveStore() {
  const temp = `${storeFile}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(store, null, 2), "utf8");
  fs.renameSync(temp, storeFile);
}

const ADMIN_IDS = new Set(
  String(process.env.ADMIN_IDS || "")
    .split(",").map(x => x.trim()).filter(Boolean)
);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadDir),
    filename: (_, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
    }
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (/^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error("يسمح فقط بملفات الصور."));
  }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: false,
  maxAge: 7 * 24 * 60 * 60 * 1000
};

app.use(session({
  secret: process.env.SESSION_SECRET || "change-this-secret",
  resave: false,
  saveUninitialized: false,
  cookie: sessionCookieOptions
}));

// Prevent authenticated pages/API responses from being restored from the browser cache
// after the user logs out.
app.use((req, res, next) => {
  if (req.path === "/home.html" || req.path === "/founders.html" ||
      req.path === "/achievements.html" || req.path === "/platforms.html" ||
      req.path === "/designer.html" || req.path === "/logs.html" ||
      req.path.startsWith("/api/")) {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
  }
  next();
});

app.use(express.static(path.join(ROOT, "public")));
app.use("/uploads", express.static(uploadDir));

function userFromSession(req) { return req.session?.user || null; }
function requireAuth(req, res, next) {
  if (!userFromSession(req)) return res.redirect("/");
  next();
}
function requireAdmin(req, res, next) {
  const user = userFromSession(req);
  if (!user || !ADMIN_IDS.has(user.id)) return res.status(403).json({ error: "غير مصرح." });
  next();
}
function logAction(user, action, details = "") {
  store.logs.unshift({
    id: store.nextLogId++,
    user_id: user.id,
    username: user.global_name || user.username || "Unknown",
    action,
    details,
    created_at: new Date().toISOString()
  });
  if (store.logs.length > 1000) store.logs.length = 1000;
  saveStore();
}

app.get("/auth/discord", (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID || "",
    redirect_uri: process.env.DISCORD_REDIRECT_URI || `http://localhost:${PORT}/auth/discord/callback`,
    response_type: "code",
    scope: "identify"
  });
  res.redirect("https://discord.com/oauth2/authorize?" + params.toString());
});

app.get("/auth/discord/callback", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.redirect("/?error=no_code");
    if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
      return res.redirect("/?error=discord_config");
    }

    const redirectUri = process.env.DISCORD_REDIRECT_URI || `http://localhost:${PORT}/auth/discord/callback`;
    const tokenBody = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code: String(code),
      redirect_uri: redirectUri
    });

    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error(JSON.stringify(tokenData));

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const u = await userResponse.json();
    if (!userResponse.ok) throw new Error(JSON.stringify(u));

    const user = {
      id: u.id,
      username: u.username,
      global_name: u.global_name || u.username,
      avatar: u.avatar,
      discriminator: u.discriminator,
      isAdmin: ADMIN_IDS.has(u.id)
    };

    req.session.user = user;
    logAction(user, "تسجيل دخول", "Discord OAuth2");
    res.redirect("/home.html");
  } catch (err) {
    console.error("Discord OAuth error:", err.message);
    res.redirect("/?error=oauth_failed");
  }
});

function logoutUser(req, res, wantsJson = false) {
  const user = userFromSession(req);
  if (user) logAction(user, "تسجيل خروج");

  // Destroy the server-side session first, then remove the browser cookie.
  req.session.destroy((err) => {
    res.clearCookie("connect.sid", {
      httpOnly: sessionCookieOptions.httpOnly,
      sameSite: sessionCookieOptions.sameSite,
      secure: sessionCookieOptions.secure,
      path: "/"
    });

    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");

    if (wantsJson) {
      if (err) return res.status(500).json({ ok: false, error: "تعذر تسجيل الخروج." });
      return res.json({ ok: true });
    }

    if (err) return res.redirect("/?error=logout_failed");
    return res.redirect("/");
  });
}

app.get("/auth/logout", (req, res) => logoutUser(req, res, false));
app.post("/auth/logout", (req, res) => logoutUser(req, res, true));

app.get("/api/me", (req, res) => {
  const user = userFromSession(req);
  if (!user) return res.status(401).json({ authenticated: false });
  res.json({
    authenticated: true,
    user,
    server: {
      name: "－𝗞𝗶𝗻𝗚s 𝗧𝗮𝗟𝗲𝗻 𝘃𝗥𝗽",
      logo: "/assets/1.webp"
    }
  });
});

app.get("/api/achievements", requireAuth, (req, res) => {
  res.json([...store.achievements].sort((a, b) => b.id - a.id));
});

app.post("/api/achievements", requireAdmin, upload.single("image"), (req, res) => {
  const user = req.session.user;
  const name = String(req.body.name || "").trim();
  const date = String(req.body.date || "").trim();
  const description = String(req.body.description || "").trim();

  if (!name || !description) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "اسم الإنجاز والوصف مطلوبان." });
  }

  const item = {
    id: store.nextAchievementId++,
    name,
    date: date || null,
    description,
    image: req.file ? `/uploads/${req.file.filename}` : null,
    created_by: user.id,
    created_by_name: user.global_name || user.username,
    created_at: new Date().toISOString()
  };
  store.achievements.push(item);
  saveStore();
  logAction(user, "إضافة إنجاز", `${name}${date ? ` | ${date}` : ""}`);
  res.json({ ok: true, id: item.id });
});

app.delete("/api/achievements/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const index = store.achievements.findIndex(x => x.id === id);
  if (index < 0) return res.status(404).json({ error: "الإنجاز غير موجود." });

  const [item] = store.achievements.splice(index, 1);
  if (item.image && item.image.startsWith("/uploads/")) {
    const p = path.join(ROOT, item.image.replace(/^\/+/, ""));
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  saveStore();
  logAction(req.session.user, "حذف إنجاز", item.name);
  res.json({ ok: true });
});

app.get("/api/logs", requireAdmin, (req, res) => {
  res.json(store.logs.slice(0, 500));
});

app.get("/api/admin", requireAuth, (req, res) => {
  res.json({ isAdmin: ADMIN_IDS.has(req.session.user.id) });
});

app.get("/api/health", (_, res) => res.json({ ok: true, port: PORT }));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message?.includes("يسمح")) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "حدث خطأ داخلي." });
});

app.listen(PORT, () => {
  console.log(`Kings TaLen vRp running on http://localhost:${PORT}`);
});
