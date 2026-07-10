import { Storage, todayISO } from "../storage.js";
import { escapeHtml, qs, fmtDateJP } from "../dom.js";
import { levelInfo, partAccuracy, BADGES } from "../gamify.js";
import { todayProgress } from "../session.js";
import { dueReviewCount } from "../quiz-engine.js";
import { PARTS } from "../../data/curriculum.js";
import { ALL_QUESTIONS } from "../../data/questions.js";
import { radarChartSVG, heatmapSVG } from "../charts.js";
import { navigate } from "../router.js";

function daysUntil(examDate) {
  if (!examDate) return null;
  const today = new Date(todayISO() + "T00:00:00");
  const target = new Date(examDate + "T00:00:00");
  return Math.ceil((target - today) / 86400000);
}

export function renderDashboard(root) {
  const username = Storage.getCurrentUsername();
  const user = Storage.getUser(username);
  if (!user) { navigate("/onboarding"); return; }

  const lvl = levelInfo(user.xp);
  const today = todayProgress(user);
  const todayPct = Math.min(1, today.answered / (today.goal || 10));
  const overallAcc = user.totals.answered > 0 ? user.totals.correct / user.totals.answered : null;
  const due = dueReviewCount(user);
  const daysLeft = daysUntil(user.examDate);

  const partRows = PARTS.map((p) => {
    const a = partAccuracy(user, p.id);
    const pct = Math.round(a.acc * 100);
    const status = a.asked === 0 ? "未着手" : a.acc >= 0.6 ? "基準達成" : "対策中";
    const statusClass = a.asked === 0 ? "muted" : a.acc >= 0.6 ? "ok" : "warn";
    return `
      <div class="gauge-row">
        <div class="gauge-label">
          <span class="gauge-dot" style="background:${p.color}"></span>
          <span>${escapeHtml(p.shortName)}</span>
          <span class="gauge-status ${statusClass}">${status}</span>
        </div>
        <div class="gauge-track"><div class="gauge-fill" style="width:${pct}%;background:${p.color}"></div>
          <div class="gauge-threshold" style="left:60%"></div>
        </div>
        <div class="gauge-pct">${a.asked > 0 ? pct + "%" : "-"} <span class="muted">(${a.correct}/${a.asked}問)</span></div>
      </div>`;
  }).join("");

  const radar = radarChartSVG(
    PARTS.map((p) => ({ label: p.shortName, value: partAccuracy(user, p.id).acc })),
    { size: 240 }
  );

  let paceHtml = "";
  if (daysLeft !== null) {
    const weakLeft = PARTS.filter((p) => partAccuracy(user, p.id).acc < 0.6).length;
    const tone = daysLeft < 0 ? "試験日が過ぎています" : `試験まであと <strong>${daysLeft}</strong> 日`;
    paceHtml = `
      <div class="card countdown-card">
        <div class="countdown-days">${tone}</div>
        <div class="muted">${weakLeft > 0 ? `合格ライン未達の分野が${weakLeft}つ残っています。優先的に取り組みましょう。` : "全分野が合格ラインに到達中です。この調子を維持しましょう！"}</div>
      </div>`;
  }

  root.innerHTML = `
    <div class="dashboard">
      <div class="dash-header">
        <div>
          <div class="hello">こんにちは、${escapeHtml(username)}さん</div>
          <div class="level-line">
            <span class="level-badge">Lv.${lvl.level}</span>
            <div class="xp-track"><div class="xp-fill" style="width:${Math.round(lvl.progress * 100)}%"></div></div>
            <span class="muted small">${user.xp - lvl.base}/${lvl.next - lvl.base}XP</span>
          </div>
        </div>
        <div class="streak-box">
          <div class="streak-flame">${user.streak.current > 0 ? "🔥" : "💤"}</div>
          <div class="streak-num">${user.streak.current}</div>
          <div class="muted small">日連続</div>
        </div>
      </div>

      ${paceHtml}

      <div class="card">
        <div class="card-title">今日の目標</div>
        <div class="today-row">
          <div class="today-track"><div class="today-fill" style="width:${Math.round(todayPct * 100)}%"></div></div>
          <div class="today-num">${today.answered}/${today.goal}問</div>
        </div>
        <div class="muted small">${todayPct >= 1 ? "本日の目標達成！お疲れさまでした🎉" : `あと${Math.max(0, today.goal - today.answered)}問で今日の目標達成です`}</div>
      </div>

      <div class="quick-actions">
        <button class="qa-btn qa-primary" data-nav="/quiz?mode=smart&limit=10">
          <span class="qa-icon">🚀</span><span>今日の学習<br><small>おすすめ10問</small></span>
        </button>
        <button class="qa-btn" data-nav="/review">
          <span class="qa-icon">🧠</span><span>苦手復習<br><small>${due > 0 ? due + "問あり" : "なし"}</small></span>
          ${due > 0 ? `<span class="qa-badge">${due}</span>` : ""}
        </button>
        <button class="qa-btn" data-nav="/category">
          <span class="qa-icon">📚</span><span>分野を選ぶ<br><small>50項目から</small></span>
        </button>
        <button class="qa-btn" data-nav="/mock">
          <span class="qa-icon">📝</span><span>模擬試験<br><small>本番形式</small></span>
        </button>
      </div>

      <div class="card">
        <div class="card-title">分野別 到達度（基礎試験の合格基準：各区分6割以上）</div>
        <div class="radar-wrap">${radar}</div>
        ${partRows}
        <div class="muted small" style="margin-top:8px;">総合正答率：${overallAcc !== null ? Math.round(overallAcc * 100) + "%" : "まだデータがありません"}（目安：総合8割以上）</div>
      </div>

      <div class="card">
        <div class="card-title">学習カレンダー</div>
        <div class="heatmap-wrap">${heatmapSVG(user.dailyLog)}</div>
        <div class="muted small">合計 ${user.totals.answered}問 / ${ALL_QUESTIONS.length}問中に挑戦済み</div>
      </div>

      <div class="card link-card" data-nav="/achievements">
        <div>🏅 実績バッジ：${(user.badges || []).length}/${BADGES.length}個 獲得</div>
        <div class="chevron">›</div>
      </div>
    </div>
  `;

  root.querySelectorAll("[data-nav]").forEach((el) => {
    el.addEventListener("click", () => navigate(el.dataset.nav));
  });

  const heatWrap = qs(".heatmap-wrap", root);
  if (heatWrap) heatWrap.scrollLeft = heatWrap.scrollWidth;
}
