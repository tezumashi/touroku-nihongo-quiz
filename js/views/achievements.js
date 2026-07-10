import { Storage } from "../storage.js";
import { escapeHtml } from "../dom.js";
import { navigate } from "../router.js";
import { BADGES } from "../gamify.js";

export function renderAchievements(root) {
  const username = Storage.getCurrentUsername();
  const user = Storage.getUser(username);
  if (!user) { navigate("/onboarding"); return; }
  const owned = new Set(user.badges || []);

  const categories = [];
  BADGES.forEach((b) => {
    const cat = b.category || "その他";
    let group = categories.find((c) => c.name === cat);
    if (!group) { group = { name: cat, badges: [] }; categories.push(group); }
    group.badges.push(b);
  });

  root.innerHTML = `
    <div class="achievements-view">
      <h2 class="page-title">実績バッジ</h2>
      <p class="muted small">${owned.size} / ${BADGES.length} 個獲得</p>
      ${categories.map((group) => {
        const earnedInGroup = group.badges.filter((b) => owned.has(b.id)).length;
        return `
        <div class="badge-category">
          <div class="badge-category-head">${escapeHtml(group.name)}<span class="muted small">${earnedInGroup}/${group.badges.length}</span></div>
          <div class="badge-grid">
            ${group.badges.map((b) => `
              <div class="badge-card ${owned.has(b.id) ? "earned" : "locked"}">
                <div class="badge-icon">${b.icon}</div>
                <div class="badge-name">${escapeHtml(b.name)}</div>
                <div class="muted small">${escapeHtml(b.desc)}</div>
              </div>`).join("")}
          </div>
        </div>`;
      }).join("")}
    </div>
  `;
}
