import { Storage } from "../storage.js";
import { escapeHtml, qs, qsa } from "../dom.js";
import { navigate } from "../router.js";
import { buildChoices, selectSmart, selectReview, selectByCategory, selectMock, selectRandom } from "../quiz-engine.js";
import { answerQuestion, recordStudySeconds, recordMockResult } from "../session.js";
import { pickCorrectMessage, pickWrongMessage, comboMessage, BADGES } from "../gamify.js";
import { ITEMS, PARTS, getPart } from "../../data/curriculum.js";
import { mascotMood, mascotMessage, mascotBlock } from "../mascot.js";

// 長文穴埋め形式の設問で、文章中の該当箇所（空欄番号や下線部の語句）をハイライト表示する
function renderPassage(q) {
  if (!q.passage) return "";
  let html = escapeHtml(q.passage);
  if (q.blankLabel) {
    const escapedLabel = escapeHtml(q.blankLabel);
    html = html.replace(escapedLabel, `<mark class="passage-blank">${escapedLabel}</mark>`);
  }
  return `<div class="passage-card card">
    <div class="passage-label">📄 次の文章を読み、下の問いに答えよ</div>
    <p class="passage-text">${html}</p>
  </div>`;
}

function buildQuestionList(mode, user, params) {
  const limit = Number(params.get("limit")) || undefined;
  if (mode === "smart") return selectSmart(user, limit || 10);
  if (mode === "review") return selectReview(user, limit || 30);
  if (mode === "category") {
    const partId = params.get("part") || null;
    const itemNo = params.get("item") ? Number(params.get("item")) : null;
    return selectByCategory(user, { partId, itemNo }, limit || 12);
  }
  if (mode === "mock") return selectMock(limit || 25);
  return selectRandom(limit || 10);
}

export function renderQuizSession(root, params) {
  // 同じ#view要素を再利用して新しいセッションを始める場合に備え、回答ロックを解除する。
  root.dataset.locked = "0";
  const username = Storage.getCurrentUsername();
  let user = Storage.getUser(username);
  if (!user) { navigate("/onboarding"); return; }

  const mode = params.get("mode") || "smart";
  const timeLimit = params.get("time") ? Number(params.get("time")) : null;
  const questions = buildQuestionList(mode, user, params);

  if (questions.length === 0) {
    root.innerHTML = `
      <div class="quiz-empty card">
        <div class="empty-emoji">🎉</div>
        <h2>復習する問題がありません</h2>
        <p class="muted">現在、復習期日が来ている苦手問題はありません。素晴らしい状態です！<br>新しい問題にチャレンジしましょう。</p>
        <button class="btn btn-primary" id="go-smart">今日の学習を始める</button>
        <button class="btn btn-ghost" id="go-home">ホームに戻る</button>
      </div>`;
    qs("#go-smart", root).addEventListener("click", () => navigate("/quiz?mode=smart&limit=10"));
    qs("#go-home", root).addEventListener("click", () => navigate("/home"));
    return;
  }

  const startTime = Date.now();
  let idx = 0;
  let comboCount = 0;
  let correctCount = 0;
  let totalXp = 0;
  const wrongList = [];
  const byPart = {};
  let timerInterval = null;
  let remainingSec = timeLimit;
  let finished = false;

  function currentChoicesCache() {
    return buildChoices(questions[idx]);
  }

  function renderTimer() {
    if (timeLimit == null) return "";
    const m = Math.floor(remainingSec / 60);
    const s = String(remainingSec % 60).padStart(2, "0");
    const warn = remainingSec <= 60 ? "timer-warn" : "";
    return `<div class="quiz-timer ${warn}">⏱ ${m}:${s}</div>`;
  }

  let questionShownAt = Date.now();

  function renderQuestion() {
    const q = questions[idx];
    const part = getPart(q.part);
    const { choices, correctIndex } = currentChoicesCache();
    questionShownAt = Date.now();
    root.innerHTML = `
      <div class="quiz-stage">
        <div class="quiz-top">
          <button class="icon-btn" id="quiz-quit" aria-label="中断してホームへ">✕</button>
          <div class="quiz-progress-track"><div class="quiz-progress-fill" style="width:${Math.round((idx / questions.length) * 100)}%"></div></div>
          ${renderTimer()}
        </div>
        <div class="quiz-meta">
          <span class="tag" style="background:${part.color}22;color:${part.color}">${escapeHtml(part.shortName)}</span>
          <span class="muted small">第${q.item}項目：${escapeHtml(ITEMS[q.item].name)}</span>
          <span class="muted small quiz-count">${idx + 1} / ${questions.length}</span>
        </div>
        ${renderPassage(q)}
        <div class="quiz-question card">
          <p>${escapeHtml(q.q)}</p>
        </div>
        <div class="quiz-choices" id="choices">
          ${choices.map((c, i) => `<button class="choice-btn" data-i="${i}"><span class="choice-mark">${"①②③④"[i]}</span><span>${escapeHtml(c)}</span></button>`).join("")}
        </div>
        <div id="feedback" class="feedback-panel hidden"></div>
      </div>
    `;

    qs("#quiz-quit", root).addEventListener("click", () => {
      if (confirm("学習を中断してホームに戻りますか？ここまでの記録は保存されます。")) {
        cleanup();
        finalize(true);
      }
    });

    qsa(".choice-btn", root).forEach((btn) => {
      btn.addEventListener("click", () => onAnswer(Number(btn.dataset.i), correctIndex, choices, q));
    });
  }

  function onAnswer(chosenIndex, correctIndex, choices, q) {
    if (root.dataset.locked === "1") return;
    root.dataset.locked = "1";
    const isCorrect = chosenIndex === correctIndex;
    const elapsedSeconds = (Date.now() - questionShownAt) / 1000;
    comboCount = isCorrect ? comboCount + 1 : 0;
    if (isCorrect) correctCount += 1;
    else wrongList.push({ q, chosen: choices[chosenIndex] });

    if (mode === "mock") {
      const p = q.part;
      byPart[p] = byPart[p] || { asked: 0, correct: 0 };
      byPart[p].asked += 1;
      if (isCorrect) byPart[p].correct += 1;
    }

    qsa(".choice-btn", root).forEach((btn, i) => {
      btn.disabled = true;
      if (i === correctIndex) btn.classList.add("choice-correct");
      else if (i === chosenIndex) btn.classList.add("choice-wrong");
    });

    const { user: updatedUser, xpGained, newBadges, isHesitant: hesitant } = answerQuestion(username, { question: q, isCorrect, comboCount, elapsedSeconds });
    user = updatedUser;
    totalXp += xpGained;

    const combo = comboMessage(comboCount);
    const badgeHtml = newBadges.length
      ? `<div class="badge-toast">${newBadges.map((id) => {
          const b = BADGES.find((x) => x.id === id);
          return b ? `<div class="badge-toast-item">${b.icon} 新しい実績「${escapeHtml(b.name)}」を獲得！</div>` : "";
        }).join("")}</div>`
      : "";

    const panel = qs("#feedback", root);
    panel.className = `feedback-panel ${isCorrect ? "feedback-ok" : "feedback-ng"}`;
    panel.innerHTML = `
      <div class="feedback-head">
        <span class="feedback-icon">${isCorrect ? "⭕" : "❌"}</span>
        <span class="feedback-msg">${isCorrect ? pickCorrectMessage() : pickWrongMessage()}</span>
        <span class="feedback-xp">+${xpGained}XP</span>
      </div>
      ${combo ? `<div class="combo-msg">${combo}</div>` : ""}
      ${hesitant ? `<div class="hesitant-note">⏳ 迷った末の正解のようですね。この問題はまだ「復習リスト」に残しておきます。</div>` : ""}
      <div class="feedback-exp"><strong>正解：</strong>${escapeHtml(q.correct)}<br>${escapeHtml(q.exp)}</div>
      ${badgeHtml}
      <button class="btn btn-primary btn-block" id="next-btn">${idx + 1 >= questions.length ? "結果を見る" : "次の問題へ"}</button>
    `;
    qs("#next-btn", panel).addEventListener("click", () => {
      idx += 1;
      root.dataset.locked = "0";
      if (idx >= questions.length) { cleanup(); finalize(false); }
      else renderQuestion();
    });
  }

  function cleanup() {
    if (timerInterval) clearInterval(timerInterval);
  }

  function finalize(aborted) {
    if (finished) return;
    finished = true;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    recordStudySeconds(username, elapsed);

    let mockSummary = "";
    if (mode === "mock") {
      const partRows = PARTS.map((p) => {
        const st = byPart[p.id] || { asked: 0, correct: 0 };
        const pct = st.asked > 0 ? Math.round((st.correct / st.asked) * 100) : 0;
        const pass = st.asked > 0 && st.correct / st.asked >= 0.6;
        return `<div class="mock-row"><span>${escapeHtml(p.shortName)}</span><span class="${pass ? "ok" : "warn"}">${st.correct}/${st.asked}（${pct}%）${st.asked > 0 ? (pass ? "✓合格ライン" : "") : ""}</span></div>`;
      }).join("");
      const overallPct = questions.length > 0 ? correctCount / questions.length : 0;
      const overallPass = overallPct >= 0.8;
      const allPartsPass = PARTS.every((p) => {
        const st = byPart[p.id];
        return !st || st.asked === 0 || st.correct / st.asked >= 0.6;
      });
      const passed = overallPass && allPartsPass;
      recordMockResult(username, {
        date: Storage.todayISO(),
        totalQ: questions.length,
        correct: correctCount,
        byPart,
        passed,
      });
      mockSummary = `
        <div class="card">
          <div class="card-title">分野別結果（合格基準：各区分6割以上・総合8割以上）</div>
          ${partRows}
          <div class="mock-verdict ${passed ? "ok" : "warn"}">${passed ? "🎉 合格基準を満たしています！" : "この模試では合格基準に届いていません。苦手分野を重点的に復習しましょう。"}</div>
        </div>`;
    }

    const answeredCount = aborted ? Math.max(1, idx) : questions.length;
    const accuracyFraction = questions.length > 0 ? correctCount / answeredCount : 0;
    const accuracy = questions.length > 0 ? Math.round(accuracyFraction * 100) : 0;
    const mood = mascotMood(accuracyFraction);

    root.innerHTML = `
      <div class="result-screen">
        ${mascotBlock(mood, escapeHtml(mascotMessage(mood)))}
        <div class="result-hero">
          <div class="result-score">${correctCount}<span class="muted">/${aborted ? idx : questions.length}</span></div>
          <div class="muted">正答率 ${accuracy}%　獲得XP +${totalXp}</div>
        </div>
        ${mockSummary}
        ${wrongList.length > 0 ? `
        <div class="card">
          <div class="card-title">間違えた問題（${wrongList.length}問）</div>
          ${wrongList.map(({ q, chosen }) => `
            <div class="wrong-item">
              ${q.passage ? `<div class="muted small wrong-passage">${escapeHtml(q.passage)}</div>` : ""}
              <div class="wrong-q">${escapeHtml(q.q)}</div>
              <div class="muted small">あなたの回答：${escapeHtml(chosen)}</div>
              <div class="wrong-correct">正解：${escapeHtml(q.correct)}</div>
              <div class="muted small">${escapeHtml(q.exp)}</div>
            </div>`).join("")}
        </div>` : `<div class="card center-note">🎯 全問正解でした！お見事です。</div>`}
        <div class="result-actions">
          ${wrongList.length > 0 ? `<button class="btn btn-primary btn-block" id="retry-wrong">間違えた問題を復習する</button>` : ""}
          <button class="btn btn-ghost btn-block" id="back-home">ホームに戻る</button>
        </div>
      </div>
    `;
    const retryBtn = qs("#retry-wrong", root);
    if (retryBtn) retryBtn.addEventListener("click", () => navigate("/review"));
    qs("#back-home", root).addEventListener("click", () => navigate("/home"));
  }

  if (timeLimit != null) {
    timerInterval = setInterval(() => {
      remainingSec -= 1;
      const timerEl = qs(".quiz-timer", root);
      if (timerEl) {
        const m = Math.floor(remainingSec / 60);
        const s = String(remainingSec % 60).padStart(2, "0");
        timerEl.textContent = `⏱ ${m}:${s}`;
        timerEl.classList.toggle("timer-warn", remainingSec <= 60);
      }
      if (remainingSec <= 0) {
        cleanup();
        finalize(true);
      }
    }, 1000);
  }

  renderQuestion();
  return cleanup;
}
