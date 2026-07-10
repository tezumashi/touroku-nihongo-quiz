import { Storage } from "../storage.js";
import { escapeHtml } from "../dom.js";
import { navigate } from "../router.js";
import { BADGES } from "../gamify.js";

export function renderAchievements(root) {
  const username = Storage.getCurrentUsername();
  const user = Storage.getUser(username);
  if (!user) { navigate("/onboarding"); return; }
  const owned = new Set(user.badges || []);

  root.innerHTML = `
    <div class="achievements-view">
      <h2 class="page-title">実績バッジ</h2>
      <p class="muted small">${owned.size} / ${BADGES.length} 個獲得</p>
      <div class="badge-grid">
        ${BADGES.map((b) => `
          <div class="badge-card ${owned.has(b.id) ? "earned" : "locked"}">
            <div class="badge-icon">${b.icon}</div>
            <div class="badge-name">${escapeHtml(b.name)}</div>
            <div class="muted small">${escapeHtml(b.desc)}</div>
          </div>`).join("")}
      </div>
    </div>
  `;
}
