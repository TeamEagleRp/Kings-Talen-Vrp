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
  if (name) name.textContent = u.global_name || u.username || "Discord User";
  if (username) username.textContent = "@" + u.username;

  const adminLinks = document.querySelectorAll("[data-admin-only]");
  adminLinks.forEach(el => el.style.display = u.isAdmin ? "" : "none");

  const logout = document.querySelector("#logout-btn");
  if (logout) {
    logout.style.display = "";
    logout.disabled = false;

    // Use POST so logout is an explicit state-changing action.
    logout.addEventListener("click", async () => {
      if (logout.dataset.loggingOut === "1") return;

      logout.dataset.loggingOut = "1";
      logout.disabled = true;
      logout.setAttribute("aria-busy", "true");

      try {
        const response = await fetch("/auth/logout", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Accept": "application/json" },
          cache: "no-store"
        });

        if (!response.ok) throw new Error("Logout failed");

        // Replace the current history entry so Back does not return to the
        // authenticated page.
        window.location.replace("/");
      } catch (error) {
        console.error("Logout error:", error);
        logout.disabled = false;
        logout.dataset.loggingOut = "0";
        logout.removeAttribute("aria-busy");
        alert("تعذر تسجيل الخروج. حاول مرة أخرى.");
      }
    });
  }

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
