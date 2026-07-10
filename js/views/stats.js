import { Storage } from "../storage.js";
import { escapeHtml, fmtSeconds, fmtDateJP } from "../dom.js";
import { navigate } from "../router.js";
import { partAccuracy } from "../gamify.js";
import { PARTS, ITEMS } from "../../data/curriculum.js";
import { radarChartSVG } from "../charts.js";

export function renderStats(root) {
  const username = Storage.getCurrentUsername();
  const user = Storage.getUser(username);
  if (!user) { navigate("/onboarding"); return; }

  const radar = radarChartSVG(PARTS.map((p) => ({ label: p.shortName, value: partAccuracy(user, p.id).acc })), { size: 260 });

  const itemRows = Object.entries(user.itemStats)
    .map(([itemNo, st]) => ({ itemNo: Number(itemNo), ...st, acc: st.asked > 0 ? st.correct / st.asked : 0 }))
    .filter((r) => r.asked > 0)
    .sort((a, b) => a.acc - b.acc)
    .slice(0, 8);

  const overallAcc = user.totals.answered > 0 ? Math.round((user.totals.correct / user.totals.answered) * 100) : null;

  const mockHistory = (user.mockResults || []);
  const maxScorePct = mockHistory.length ? Math.max(...mockHistory.map((r) => r.correct / r.totalQ)) : 0;

  root.innerHTML = `
    <div class="stats-view">
      <h2 class="page-title">学習統計</h2>

      <div class="stat-summary-grid">
        <div class="stat-box"><div class="stat-num">${user.totals.answered}</div><div class="muted small">総回答数</div></div>
        <div class="stat-box"><div class="stat-num">${overallAcc !== null ? overallAcc + "%" : "-"}</div><div class="muted small">総合正答率</div></div>
        <div class="stat-box"><div class="stat-num">${fmtSeconds(user.totals.studySeconds)}</div><div class="muted small">総学習時間</div></div>
        <div class="stat-box"><div class="stat-num">${user.streak.longest}</div><div class="muted small">最長連続日数</div></div>
      </div>

      <div class="card">
        <div class="card-title">分野別正答率</div>
        <div class="radar-wrap">${radar}</div>
      </div>

      <div class="card">
        <div class="card-title">要注意項目（正答率が低い順）</div>
        ${itemRows.length === 0 ? `<div class="muted small">まだデータがありません。学習を始めましょう。</div>` : itemRows.map((r) => `
          <div class="weak-item-row">
            <span class="item-num">${r.itemNo}</span>
            <span class="item-name">${escapeHtml(ITEMS[r.itemNo].name)}</span>
            <span class="${r.acc >= 0.6 ? "ok" : "warn"}">${Math.round(r.acc * 100)}%（${r.correct}/${r.asked}）</span>
          </div>`).join("")}
      </div>

      <div class="card">
        <div class="card-title">模擬試験スコア推移</div>
        ${mockHistory.length === 0 ? `<div class="muted small">まだ模試を受けていません。</div>` : `
          <div class="mock-chart">
            ${mockHistory.slice(-10).map((r) => {
              const pct = Math.round((r.correct / r.totalQ) * 100);
              return `<div class="mock-bar-wrap"><div class="mock-bar ${r.passed ? "ok-bg" : ""}" style="height:${Math.max(6, pct)}%"></div><div class="muted" style="font-size:10px">${pct}%</div></div>`;
            }).join("")}
          </div>
          <div class="muted small">直近${Math.min(10, mockHistory.length)}回・最高スコア ${Math.round(maxScorePct * 100)}%</div>
        `}
      </div>
    </div>
  `;
}
