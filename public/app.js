async function getJSON(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function setupHeader() {
  const data = await getJSON("/api/me");

  if (!data.authenticated) {
    if (!location.pathname.endsWith("/index.html") && location.pathname !== "/") {
      location.href = "/index.html";
    }
    return null;
  }

  const u = data.user;
  const img = document.querySelector("#account-avatar");
  const name = document.querySelector("#account-name");
  const username = document.querySelector("#account-username");

  if (img) {
    img.src = u.avatar
      ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128`
      : "/assets/1.webp";
  }
  if (name) name.textContent = u.displayName;
  if (username) username.textContent = "@" + u.username;

  const adminLinks = document.querySelectorAll("[data-admin-only]");
  adminLinks.forEach(el => el.style.display = u.isAdmin ? "" : "none");

  const logout = document.querySelector("#logout-btn");
  if (logout) logout.style.display = "";

  const serverName = document.querySelector("#server-name");
  const serverLogo = document.querySelector("#server-logo");
  if (serverName && data.server) serverName.textContent = data.server.name;
  if (serverLogo && data.server) serverLogo.src = data.server.logo;

  const footerServerName = document.querySelector("#footer-server-name");
  const footerYear = document.querySelector("#footer-year");
  if (footerServerName && data.server) footerServerName.textContent = data.server.name;
  if (footerYear) footerYear.textContent = new Date().getFullYear();

  return data;
}

function setupMenu() {
  const btn = document.querySelector("#menu-btn");
  const drawer = document.querySelector("#drawer");
  if (!btn || !drawer) return;

  btn.addEventListener("click", () => drawer.classList.toggle("open"));
}

function setupBackButton() {
  const btn = document.querySelector("#home-btn");
  if (btn) btn.addEventListener("click", () => location.href = "/home.html");
}

document.addEventListener("DOMContentLoaded", async () => {
  setupMenu();
  setupBackButton();
  try { await setupHeader(); } catch (e) { console.error(e); }
});
