import { Storage } from "./storage.js";
import { navigate, onRoute, startRouter } from "./router.js";
import { renderOnboarding } from "./views/onboarding.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderQuizSession } from "./views/quizSession.js";
import { renderCategory } from "./views/category.js";
import { renderReview } from "./views/review.js";
import { renderMock } from "./views/mock.js";
import { renderStats } from "./views/stats.js";
import { renderAchievements } from "./views/achievements.js";
import { renderSettings } from "./views/settings.js";

const view = document.getElementById("view");
const nav = document.getElementById("bottom-nav");

const NAV_ITEMS = [
  { path: "/home", icon: "🏠", label: "ホーム" },
  { path: "/category", icon: "📚", label: "学習" },
  { path: "/review", icon: "🧠", label: "復習" },
  { path: "/stats", icon: "📊", label: "統計" },
  { path: "/settings", icon: "⚙️", label: "設定" },
];

function renderNav(activePath) {
  nav.innerHTML = NAV_ITEMS.map((it) => `
    <button class="nav-btn ${activePath === it.path ? "active" : ""}" data-nav="${it.path}">
      <span class="nav-icon">${it.icon}</span><span class="nav-label">${it.label}</span>
    </button>`).join("");
  nav.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.nav));
  });
}

let currentCleanup = null;

onRoute(({ path, params }) => {
  if (currentCleanup) { currentCleanup(); currentCleanup = null; }
  window.scrollTo(0, 0);

  const username = Storage.getCurrentUsername();
  if (!username && path !== "/onboarding") { navigate("/onboarding"); return; }

  const isOnboarding = path === "/onboarding" || !username;
  nav.classList.toggle("hidden", isOnboarding);
  document.getElementById("app-header").classList.toggle("hidden", isOnboarding);

  switch (path) {
    case "/onboarding":
      renderOnboarding(view);
      break;
    case "/home":
      renderDashboard(view);
      renderNav("/home");
      break;
    case "/quiz":
      currentCleanup = renderQuizSession(view, params) || null;
      renderNav("");
      break;
    case "/category":
      renderCategory(view);
      renderNav("/category");
      break;
    case "/review":
      renderReview(view);
      renderNav("/review");
      break;
    case "/mock":
      renderMock(view);
      renderNav("");
      break;
    case "/stats":
      renderStats(view);
      renderNav("/stats");
      break;
    case "/achievements":
      renderAchievements(view);
      renderNav("");
      break;
    case "/settings":
      renderSettings(view);
      renderNav("/settings");
      break;
    default:
      renderDashboard(view);
      renderNav("/home");
  }
});

startRouter();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
