require("dotenv").config();

const express = require("express");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3070);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOADS_DIR = path.join(ROOT, "uploads");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const achievementsFile = path.join(DATA_DIR, "achievements.json");
const logsFile = path.join(DATA_DIR, "logs.json");

if (!fs.existsSync(achievementsFile)) fs.writeFileSync(achievementsFile, "[]");
if (!fs.existsSync(logsFile)) fs.writeFileSync(logsFile, "[]");

const ADMIN_IDS = new Set([
  "977128257096921088",
  "1443579668195315844",
  "1521892362152968195",
  "913447258173894677"
]);

const SERVER = {
  name: "－𝗞𝗶𝗻𝗚s 𝗧𝗮𝗟𝗲𝗻 𝘃𝗥𝗽",
  logo: "/assets/1.webp",
  background: "/assets/2.webp",
  discord: "https://discord.gg/kt-t",
  discordShort: "kt-t",
  tiktok: "https://www.tiktok.com/@f.gni_?_r=1&_t=ZS-9AFnyyrrP8P",
  tiktokUser: "f.gni_"
};

const DESIGNER = {
  name: "𝑴𝑮〢𝓜𝓱𝓶𝓪𝓭 89",
  image: "/assets/35.png",
  email: "mg7app@gmail.com",
  discord: "https://discord.gg/DhjbmkwMG6",
  sponsorName: "𝗠𝗚 𝗖𝗼𝗗𝗲 </>",
  sponsorImage: "/assets/15.png"
};

const FOUNDERS = [
  { name: "نــعــمــل لا آجــلــكــم", image: "/assets/3.webp", username: "6fir" },
  { name: "الـشـلاقـي#", image: "/assets/4.webp", username: ".f.1.6." }
];

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(ROOT, "public")));
app.use("/uploads", express.static(UPLOADS_DIR));

app.use(session({
  secret: process.env.SESSION_SECRET || "kings-talen-vrp-session-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, UPLOADS_DIR),
    filename: (_, file, cb) => {
      const safe = Date.now() + "-" + file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, safe);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function isAdmin(req) {
  return Boolean(req.session.user && ADMIN_IDS.has(String(req.session.user.id)));
}

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/index.html");
  next();
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(403).send("Forbidden");
  next();
}

function addLog(req, action, details = "") {
  const logs = readJson(logsFile);
  logs.unshift({
    id: Date.now().toString(),
    action,
    details,
    userId: req.session.user?.id || "unknown",
    username: req.session.user?.username || "unknown",
    at: new Date().toISOString()
  });
  writeJson(logsFile, logs.slice(0, 500));
}

app.get("/auth/discord", (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID || "",
    redirect_uri: process.env.DISCORD_REDIRECT_URI || `http://localhost:${PORT}/auth/discord/callback`,
    response_type: "code",
    scope: "identify"
  });

  if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
    return res.status(500).send("Discord OAuth is not configured. Fill in the .env file first.");
  }

  res.redirect("https://discord.com/oauth2/authorize?" + params.toString());
});

app.get("/auth/discord/callback", async (req, res) => {
  try {
    if (!req.query.code) return res.redirect("/index.html?error=oauth");

    const body = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code: req.query.code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI || `http://localhost:${PORT}/auth/discord/callback`
    });

    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    if (!tokenResponse.ok) throw new Error("Discord token exchange failed.");

    const token = await tokenResponse.json();

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `${token.token_type} ${token.access_token}` }
    });

    if (!userResponse.ok) throw new Error("Discord user request failed.");

    const user = await userResponse.json();

    req.session.user = {
      id: user.id,
      username: user.username,
      global_name: user.global_name || user.username,
      avatar: user.avatar,
      discriminator: user.discriminator
    };

    addLog(req, "تسجيل دخول مسؤول", `Discord ID: ${user.id}`);
    res.redirect("/home.html");
  } catch (error) {
    console.error(error);
    res.redirect("/index.html?error=oauth");
  }
});

app.get("/auth/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/index.html"));
});

app.get("/api/me", (req, res) => {
  if (!req.session.user) return res.json({ loggedIn: false });

  const user = req.session.user;
  const avatar = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
    : `https://cdn.discordapp.com/embed/avatars/${Number(user.discriminator || 0) % 5}.png`;

  res.json({
    loggedIn: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.global_name,
      avatar,
      isAdmin: isAdmin(req)
    },
    server: SERVER
  });
});

app.get("/api/achievements", requireAuth, (req, res) => {
  res.json(readJson(achievementsFile));
});

app.post("/api/achievements", requireAdmin, upload.single("image"), (req, res) => {
  const { name, date, description } = req.body;

  if (!name || !description) {
    return res.status(400).json({ error: "اسم الإنجاز والوصف مطلوبان." });
  }

  const achievements = readJson(achievementsFile);
  const achievement = {
    id: Date.now().toString(),
    name: name.trim(),
    date: date ? date.trim() : "",
    description: description.trim(),
    image: req.file ? `/uploads/${req.file.filename}` : "",
    createdAt: new Date().toISOString(),
    createdBy: req.session.user.id
  };

  achievements.unshift(achievement);
  writeJson(achievementsFile, achievements);
  addLog(req, "مسؤول أضاف إنجاز", achievement.name);

  res.json({ ok: true, achievement });
});

app.delete("/api/achievements/:id", requireAdmin, (req, res) => {
  const achievements = readJson(achievementsFile);
  const found = achievements.find(x => x.id === req.params.id);

  if (!found) return res.status(404).json({ error: "الإنجاز غير موجود." });

  writeJson(
    achievementsFile,
    achievements.filter(x => x.id !== req.params.id)
  );

  if (found.image && found.image.startsWith("/uploads/")) {
    const file = path.join(UPLOADS_DIR, path.basename(found.image));
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }

  addLog(req, "مسؤول حذف إنجاز", found.name);
  res.json({ ok: true });
});

app.get("/api/logs", requireAdmin, (req, res) => {
  res.json(readJson(logsFile));
});

app.get("/api/server", requireAuth, (_, res) => {
  res.json({ server: SERVER, founders: FOUNDERS, designer: DESIGNER });
});

app.get("/api/admins", requireAdmin, (_, res) => {
  res.json([...ADMIN_IDS]);
});

app.listen(PORT, () => {
  console.log(`Kings Talen vRp running on http://localhost:${PORT}`);
});
