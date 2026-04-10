// ─────────────────────────────────────────────
//  SBTI 2.0  —  engine.js
//  算法层：加权距离匹配 + 三条彩蛋判定路径
// ─────────────────────────────────────────────

// ── 维度权重表 ────────────────────────────────
// 核心"定义性"维度权重更高，新数字维度权重更低以避免干扰经典类型
const DIM_WEIGHTS = {
  S1: 1.5,
  S2: 1.5,
  S3: 1.0,
  E1: 2.0,
  E2: 1.5,
  E3: 1.5,
  A1: 1.0,
  A2: 1.0,
  A3: 1.5,
  Ac1: 1.5,
  Ac2: 1.0,
  Ac3: 1.5,
  So1: 2.0,
  So2: 1.5,
  So3: 1.0,
  I1: 0.8,
  I2: 0.6,
};

// 最大加权距离（每维度最大 diff=2）
const WEIGHTED_MAX = dimensionOrder.reduce((sum, d) => sum + (DIM_WEIGHTS[d] || 1.0) * 2, 0);

// ── 基础转换 ─────────────────────────────────
// 每个维度由 3 道题贡献分数（每题 1-3 分），满分 9 分
// 新阈值：≤4=L / 5-6=M / ≥7=H
function sumToLevel(score) {
  if (score <= 4) return "L";
  if (score <= 6) return "M";
  return "H";
}

function levelNum(level) {
  return { L: 1, M: 2, H: 3 }[level] ?? 2;
}

function parsePattern(pattern) {
  // pattern 格式 "HHH-HMH-..." 去掉连字符后拆分为字符数组
  return pattern.replace(/-/g, "").split("");
}

// ── 特殊触发判定 ──────────────────────────────
function getDrunkTriggered(answers) {
  return answers["drink_gate_q2"] === 2;
}

function getReelsTrigger(answers) {
  // screen_gate_q1 选 3(6-8h) 或 4(8h+) 且 screen_gate_q2 选 3(我会死的)
  return (answers["screen_gate_q1"] === 3 || answers["screen_gate_q1"] === 4) && answers["screen_gate_q2"] === 3;
}

// 全中流：常规题（非 special）中超过 60% 选了对应"中间项"(value=2)
function getMidStreamTriggered(answers) {
  const regularQs = questions.filter((q) => !q.special);
  const midCount = regularQs.filter((q) => answers[q.id] === 2).length;
  return midCount / regularQs.length > 0.6;
}

// SIGMA 特殊标记：So1=H AND So2=H AND S1=H（极端自主型）
function getSigmaUnlocked(levels) {
  return levels.So1 === "H" && levels.So2 === "H" && levels.S1 === "H";
}

// ── 核心计算 ─────────────────────────────────
function computeResult(answers) {
  // 1. 计算各维度原始分
  const rawScores = {};
  dimensionOrder.forEach((dim) => {
    rawScores[dim] = 0;
  });
  questions.forEach((q) => {
    if (q.special) return;
    rawScores[q.dim] = (rawScores[q.dim] || 0) + Number(answers[q.id] || 0);
  });

  // 2. 转换为 L/M/H 等级
  const levels = {};
  Object.entries(rawScores).forEach(([dim, score]) => {
    levels[dim] = sumToLevel(score);
  });

  // 3. 用户向量（数值化）
  const userVector = dimensionOrder.map((dim) => levelNum(levels[dim]));

  // 4. 加权距离排名
  const ranked = NORMAL_TYPES.map((type) => {
    const typeLetters = parsePattern(type.pattern);
    let weightedDist = 0;
    let exact = 0;
    dimensionOrder.forEach((dim, i) => {
      const diff = Math.abs(userVector[i] - levelNum(typeLetters[i]));
      weightedDist += (DIM_WEIGHTS[dim] || 1.0) * diff;
      if (diff === 0) exact++;
    });

    // 签名维度加成：该类型权重最大的3个维度全部精确命中 → +5%（在最终相似度计算后加）
    const top3dims = [...dimensionOrder].sort((a, b) => (DIM_WEIGHTS[b] || 1) - (DIM_WEIGHTS[a] || 1)).slice(0, 3);
    const signatureBonus = top3dims.every((dim, _) => {
      const dIdx = dimensionOrder.indexOf(dim);
      return Math.abs(userVector[dIdx] - levelNum(typeLetters[dIdx])) === 0;
    });

    const rawSimilarity = Math.max(0, Math.round((1 - weightedDist / WEIGHTED_MAX) * 100));
    const similarity = Math.min(100, rawSimilarity + (signatureBonus ? 5 : 0));

    return { ...type, ...TYPE_LIBRARY[type.code], weightedDist, exact, similarity };
  }).sort((a, b) => {
    if (a.weightedDist !== b.weightedDist) return a.weightedDist - b.weightedDist;
    if (b.exact !== a.exact) return b.exact - a.exact;
    return b.similarity - a.similarity;
  });

  const bestNormal = ranked[0];

  // 5. 特殊路径判定（优先级：DRUNK > REELS > MIDSTREAM > 正常）
  const drunkTriggered = getDrunkTriggered(answers);
  const reelsTriggered = getReelsTrigger(answers);
  const midStreamTriggered = getMidStreamTriggered(answers);
  const sigmaUnlocked = getSigmaUnlocked(levels);

  let finalType;
  let modeKicker = "你的主类型";
  let badge = `匹配度 ${bestNormal.similarity}% · 精准命中 ${bestNormal.exact}/17 维`;
  let sub = "维度命中度较高，当前结果可视为你的第一人格画像。";
  let special = false;
  let secondaryType = null;
  let easterEggNote = null;

  if (drunkTriggered) {
    finalType = TYPE_LIBRARY.DRUNK;
    secondaryType = bestNormal;
    modeKicker = "隐藏人格已激活 🍶";
    badge = "匹配度 100% · 酒精异常因子已接管";
    sub = "乙醇亲和性过强，系统已直接跳过常规人格审判。";
    special = true;
  } else if (reelsTriggered) {
    finalType = TYPE_LIBRARY.REELS_HIDDEN;
    secondaryType = bestNormal;
    modeKicker = "隐藏人格已激活 📱";
    badge = "匹配度 100% · 屏幕数据已将你出卖";
    sub = "系统通过对你屏幕使用时长的分析，触发了屏奴隐藏人格。你的手机比你更了解你。";
    special = true;
  } else if (bestNormal.similarity < 60) {
    if (midStreamTriggered) {
      // 全中流：显示 OJBK 强化版
      finalType = { ...TYPE_LIBRARY.OJBK };
      finalType.desc = `【OJBK 全中流旗舰版】\n\n系统在检测到您超过60%的题目选择了中间选项后，陷入了存在主义危机。我们不知道该给您什么结论，因为您把每一个"也许"都选遍了。\n\n普通的无所谓人说「都行」，是因为他们确实无所谓。而您……您是连「确实无所谓」本身都无所谓的人。这是一种更高维度的无所谓。您站在无所谓的顶端，俯瞰着一切有所谓和无所谓的众生，用宇宙的眼光扫过这份测试，心想：中间项，最安全。\n\n朋友，测试不咬人。`;
      finalType.intro = "全中流旗舰版，你连答题都随便。";
      modeKicker = "全中流彩蛋已触发 🎯";
      badge = "中间选项命中率超过60% · 哲人级无所谓";
      sub = "你选了太多中间项，系统已经放弃理解你。";
      special = true;
    } else {
      finalType = TYPE_LIBRARY.HHHH;
      modeKicker = "系统强制兜底";
      badge = `标准人格库最高匹配仅 ${bestNormal.similarity}%`;
      sub = "标准人格库对你的脑回路集体罢工了，于是系统把你强制分配给了 HHHH。";
      special = true;
    }
  } else {
    finalType = bestNormal;
    // SIGMA 解锁提示（不覆盖结果，只加徽章）
    if (sigmaUnlocked && bestNormal.code !== "SIGMA") {
      easterEggNote = "⚡ 西格玛特质解锁：你的自我强度 + 边界感达到极端组合，SIGMA 人格与你擦肩而过。";
    }
  }

  return {
    rawScores,
    levels,
    ranked,
    bestNormal,
    finalType,
    modeKicker,
    badge,
    sub,
    special,
    secondaryType,
    easterEggNote,
    sigmaUnlocked,
  };
}
