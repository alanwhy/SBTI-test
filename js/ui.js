// ─────────────────────────────────────────────
//  SBTI 2.0  —  ui.js
//  UI 渲染层：逐题卡片模式 / 结果渲染 / 屏幕切换 / 事件绑定
// ─────────────────────────────────────────────

// ── 应用状态 ──────────────────────────────────
const app = {
  shuffledQuestions: [],
  answers: {},
  previewMode: false,
  currentIndex: 0,
  slideDir: "right", // 动画方向
};

// ── DOM 引用 ──────────────────────────────────
const screens = {
  intro: document.getElementById("intro"),
  test: document.getElementById("test"),
  result: document.getElementById("result"),
};
const questionCard = document.getElementById("questionCard");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const prevBtn = document.getElementById("prevBtn");
const submitBtn = document.getElementById("submitBtn");
const navHint = document.getElementById("navHint");

// ── 事件委托：绑在容器上，innerHTML 更新也不丢失 ────
questionCard.addEventListener("change", (e) => {
  if (e.target.type !== "radio") return;
  const { name, value } = e.target;
  const wasUnanswered = app.answers[name] === undefined;
  app.answers[name] = Number(value);

  // gate 清除
  if (name === "drink_gate_q1" && Number(value) !== 3) delete app.answers["drink_gate_q2"];
  if (name === "screen_gate_q1" && Number(value) < 3) delete app.answers["screen_gate_q2"];

  // 选中高亮
  questionCard.querySelectorAll(".option").forEach((el) => el.classList.remove("option-selected"));
  e.target.closest(".option").classList.add("option-selected");

  updateNav();

  // 只要选了就跳下一题（非末题）
  const qs = getVisibleQuestions();
  const isLast = app.currentIndex === qs.length - 1;
  if (!isLast) {
    setTimeout(() => {
      app.slideDir = "right";
      app.currentIndex++;
      renderCard();
    }, 380);
  }
});

// ── 工具函数 ──────────────────────────────────
function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    el.classList.toggle("active", key === name);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  // 同步 hash（只在非 intro 时写，intro 用空 hash 保持干净）
  const nextHash = name === "intro" ? "" : `#${name}`;
  if (location.hash !== nextHash) history.replaceState(null, "", nextHash || location.pathname);
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── 特殊题动态注入判断 ────────────────────────
function getVisibleQuestions() {
  const visible = [...app.shuffledQuestions];

  // 饮酒门 → 插入饮酒态度题
  const drinkGateIdx = visible.findIndex((q) => q.id === "drink_gate_q1");
  if (drinkGateIdx !== -1 && app.answers["drink_gate_q1"] === 3) {
    visible.splice(drinkGateIdx + 1, 0, specialQuestions[1]);
  }

  // 屏奴门 → 插入屏奴确认题
  const screenGateIdx = visible.findIndex((q) => q.id === "screen_gate_q1");
  if (screenGateIdx !== -1 && (app.answers["screen_gate_q1"] === 3 || app.answers["screen_gate_q1"] === 4)) {
    visible.splice(screenGateIdx + 1, 0, specialQuestions[3]);
  }

  return visible;
}

function getQuestionMetaLabel(q) {
  if (q.special) return "补充题";
  return app.previewMode ? dimensionMeta[q.dim].name : "维度已隐藏";
}

// ── 单题卡片渲染（只渲染 HTML，事件委托在外部）────────
function renderCard() {
  const qs = getVisibleQuestions();
  const total = qs.length;
  app.currentIndex = Math.max(0, Math.min(app.currentIndex, total - 1));
  const idx = app.currentIndex;
  const q = qs[idx];

  // 进度条
  progressBar.style.width = `${((idx + 1) / total) * 100}%`;
  progressText.textContent = `${idx + 1} / ${total}`;

  const answered = app.answers[q.id];
  const isSpecial = q.special;

  // 滑入动画
  questionCard.className = "question-card";
  void questionCard.offsetWidth;
  questionCard.className = `question-card animate-${app.slideDir}`;

  questionCard.innerHTML = `
    <article class="question">
      <div class="question-meta">
        <div class="badge${isSpecial ? " badge-rare" : ""}">
          第 ${idx + 1} 题${isSpecial ? " · 追加题" : ""}
        </div>
        <div class="q-dim-label">${getQuestionMetaLabel(q)}</div>
      </div>
      <div class="question-title">${q.text}</div>
      <div class="options">
        ${q.options
          .map((opt, i) => {
            const code = ["A", "B", "C", "D"][i] || String(i + 1);
            const sel = answered === opt.value;
            return `<label class="option${sel ? " option-selected" : ""}">
            <input type="radio" name="${q.id}" value="${opt.value}"${sel ? " checked" : ""} />
            <div class="option-code">${code}</div>
            <div class="option-label">${opt.label}</div>
          </label>`;
          })
          .join("")}
      </div>
    </article>
  `;

  updateNav();
}

function updateNav() {
  const qs = getVisibleQuestions();
  const total = qs.length;
  const idx = app.currentIndex;
  const q = qs[idx];
  const isLast = idx === total - 1;
  const answered = app.answers[q.id] !== undefined;

  prevBtn.disabled = idx === 0;

  if (isLast) {
    const allDone = qs.every((qq) => app.answers[qq.id] !== undefined);
    submitBtn.style.display = "";
    // 只要当前题已答就允许点击提交，有漏题时点击会跳转补充
    submitBtn.disabled = !answered;
    if (!answered) {
      navHint.textContent = "选完本题即可提交";
    } else if (!allDone) {
      const missing = qs.filter((qq) => app.answers[qq.id] === undefined).length;
      navHint.textContent = `⚠️ 还有 ${missing} 题未作答，点提交跳转补充`;
    } else {
      navHint.textContent = "全部完成，可以提交！";
    }
  } else {
    submitBtn.style.display = "none";
    navHint.textContent = answered ? "选完答案自动跳下一题" : "请选择一个选项";
  }
}

function goPrev() {
  if (app.currentIndex > 0) {
    app.slideDir = "left";
    app.currentIndex--;
    renderCard();
  }
}

// ── 维度列表渲染（高亮极端维度）────────────────
function renderDimList(result) {
  const dimList = document.getElementById("dimList");

  // 找出得分最极端的3个维度（H最高 或 L最低）
  const extremes = dimensionOrder
    .map((dim) => ({
      dim,
      rawScore: result.rawScores[dim],
      level: result.levels[dim],
      // 极端度：H=正方向最大值，L=负方向最大值
      extremeScore: result.levels[dim] === "H" ? result.rawScores[dim] : -result.rawScores[dim],
    }))
    .sort((a, b) => Math.abs(b.extremeScore) - Math.abs(a.extremeScore))
    .slice(0, 3)
    .map((x) => x.dim);

  dimList.innerHTML = dimensionOrder
    .map((dim) => {
      const level = result.levels[dim];
      const explanation = DIM_EXPLANATIONS[dim][level];
      const isExtreme = extremes.includes(dim);
      return `
      <div class="dim-item${isExtreme ? " dim-extreme" : ""}">
        <div class="dim-item-top">
          <div class="dim-item-name">${dimensionMeta[dim].name}${isExtreme ? " ★" : ""}</div>
          <div class="dim-item-score">${level} / ${result.rawScores[dim]}分</div>
        </div>
        <p>${explanation}</p>
      </div>
    `;
    })
    .join("");
}

// ── 结果页渲染 ────────────────────────────────
function renderResult() {
  const result = computeResult(app.answers);
  const type = result.finalType;

  document.getElementById("resultModeKicker").textContent = result.modeKicker;
  document.getElementById("resultTypeName").textContent = `${type.code}（${type.cn}）`;
  document.getElementById("matchBadge").textContent = result.badge;
  document.getElementById("resultTypeSub").textContent = result.sub;
  document.getElementById("resultDesc").textContent = type.desc;
  document.getElementById("posterCaption").textContent = type.intro;
  document.getElementById("funNote").textContent = result.special
    ? "本测试仅供娱乐。隐藏人格和兜底结果都是作者故意埋的损招，请勿基于此做任何严肃决策。"
    : "本测试仅供娱乐，别拿它当诊断、面试、相亲、分手、招魂、算命或人生判决书。";

  // 海报图
  const posterBox = document.getElementById("posterBox");
  const posterImage = document.getElementById("posterImage");
  const posterPlaceholder = document.getElementById("posterPlaceholder");
  const imageSrc = TYPE_IMAGES[type.code];
  if (imageSrc) {
    posterImage.src = imageSrc;
    posterImage.alt = `${type.code}（${type.cn}）`;
    posterImage.style.display = "block";
    posterPlaceholder.style.display = "none";
    posterBox.classList.remove("no-image");
  } else {
    posterImage.style.display = "none";
    posterPlaceholder.style.display = "flex";
    posterBox.classList.add("no-image");
    document.getElementById("posterPlaceholderLetter").textContent = type.code
      .replace(/[^A-Z0-9]/gi, "")
      .charAt(0)
      .toUpperCase();
  }

  // SIGMA 稀有徽章
  const sigmaBadgeEl = document.getElementById("sigmaBadge");
  if (sigmaBadgeEl) {
    sigmaBadgeEl.style.display = result.easterEggNote ? "inline-flex" : "none";
    sigmaBadgeEl.textContent = result.easterEggNote || "";
  }

  renderDimList(result);

  // 把结果存到 app，供分享功能使用
  app.lastResult = result;

  showScreen("result");
}

// ── 开始测试 ──────────────────────────────────
function startTest(preview = false) {
  app.previewMode = preview;
  app.answers = {};

  const shuffledRegular = shuffle(questions.filter((q) => !q.special));

  // 在随机位置插入 drink_gate_q1
  const drink = specialQuestions[0];
  const drinkInsertAt = Math.floor(Math.random() * shuffledRegular.length) + 1;

  // 在随机位置插入 screen_gate_q1（不与 drink 位置相邻）
  const screen = specialQuestions[2];
  let screenInsertAt;
  do {
    screenInsertAt = Math.floor(Math.random() * shuffledRegular.length) + 1;
  } while (Math.abs(screenInsertAt - drinkInsertAt) < 3);

  // 按位置排序插入
  const insertions = [
    { idx: drinkInsertAt, q: drink },
    { idx: screenInsertAt > drinkInsertAt ? screenInsertAt + 1 : screenInsertAt, q: screen },
  ].sort((a, b) => a.idx - b.idx);

  app.shuffledQuestions = [...shuffledRegular];
  let offset = 0;
  insertions.forEach(({ idx, q }) => {
    app.shuffledQuestions.splice(idx + offset, 0, q);
    offset++;
  });

  app.currentIndex = 0;
  app.slideDir = "right";
  renderCard();
  showScreen("test");
}

// ── 事件绑定 ──────────────────────────────────
document.getElementById("startBtn").addEventListener("click", () => startTest(false));
document.getElementById("backIntroBtn").addEventListener("click", () => showScreen("intro"));
document.getElementById("prevBtn").addEventListener("click", goPrev);
document.getElementById("submitBtn").addEventListener("click", () => {
  const qs = getVisibleQuestions();
  const firstMissing = qs.findIndex((qq) => app.answers[qq.id] === undefined);
  if (firstMissing !== -1) {
    // 有漏题：跳转到第一道未答题
    app.slideDir = firstMissing < app.currentIndex ? "left" : "right";
    app.currentIndex = firstMissing;
    renderCard();
  } else {
    renderResult();
  }
});
document.getElementById("restartBtn").addEventListener("click", () => startTest(false));
document.getElementById("toTopBtn").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

document.getElementById("shareBtn")?.addEventListener("click", () => generateShareCard());

// ── Hash 路由 ──────────────────────────────────
// 支持的 hash：
//   #test              → 直接进入测试
//   #result            → 结果页（需已有 app.lastResult）
//   #result/CTRL       → 调试：直接渲染指定类型结果（不需做题）
function renderResultForType(code) {
  const type = TYPE_LIBRARY[code];
  if (!type) {
    console.warn(`[router] 未知类型 code: ${code}`);
    showScreen("intro");
    return;
  }
  // 构造一个 mock result（维度全设为 M）
  const mockLevels = {};
  const mockRaw = {};
  dimensionOrder.forEach((d) => {
    mockLevels[d] = "M";
    mockRaw[d] = 6;
  });
  const result = {
    finalType: type,
    modeKicker: `[调试] ${type.code}`,
    badge: `调试模式 · ${type.code}（${type.cn}）`,
    sub: "此为调试直跳，维度数据为模拟值。",
    levels: mockLevels,
    rawScores: mockRaw,
    special: false,
    easterEggNote: null,
  };
  app.lastResult = result;

  document.getElementById("resultModeKicker").textContent = result.modeKicker;
  document.getElementById("resultTypeName").textContent = `${type.code}（${type.cn}）`;
  document.getElementById("matchBadge").textContent = result.badge;
  document.getElementById("resultTypeSub").textContent = result.sub;
  document.getElementById("resultDesc").textContent = type.desc;
  document.getElementById("posterCaption").textContent = type.intro;
  document.getElementById("funNote").textContent = "本测试仅供娱乐。";

  const posterBox = document.getElementById("posterBox");
  const posterImage = document.getElementById("posterImage");
  const posterPlaceholder = document.getElementById("posterPlaceholder");
  const imageSrc = TYPE_IMAGES[type.code];
  if (imageSrc) {
    posterImage.src = imageSrc;
    posterImage.alt = `${type.code}（${type.cn}）`;
    posterImage.style.display = "block";
    posterPlaceholder.style.display = "none";
    posterBox.classList.remove("no-image");
  } else {
    posterImage.style.display = "none";
    posterPlaceholder.style.display = "flex";
    posterBox.classList.add("no-image");
    document.getElementById("posterPlaceholderLetter").textContent = type.code
      .replace(/[^A-Z0-9]/gi, "")
      .charAt(0)
      .toUpperCase();
  }

  const sigmaBadgeEl = document.getElementById("sigmaBadge");
  if (sigmaBadgeEl) sigmaBadgeEl.style.display = "none";

  renderDimList(result);
  showScreen("result");
}

function handleHash() {
  const hash = location.hash; // e.g. "#result/CTRL" or "#test"
  if (!hash || hash === "#" || hash === "#intro") {
    showScreen("intro");
  } else if (hash === "#test") {
    startTest(false);
  } else if (hash.startsWith("#result/")) {
    const code = decodeURIComponent(hash.slice(8));
    renderResultForType(code);
  } else if (hash === "#result") {
    if (app.lastResult) showScreen("result");
    else showScreen("intro");
  }
}

// 页面首次加载处理 hash
handleHash();
// 浏览器前进/后退
window.addEventListener("popstate", handleHash);
