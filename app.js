"use strict";

const STORAGE_KEY = "love-arcade-progress-v2";
const TODAY = new Date().toISOString().slice(0, 10);
const SECRET_GIFT_GOAL = 20000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const TRACKS = [
  { type: "file", title: "Mrs Magic - Strawberry Guy", src: "music/Mrs Magic - Strawberry Guy.mp3" },
  { type: "file", title: "LUV3MEMORE - Надеюсь, что тебе также хорошо", src: "music/LUV3MEMORE_надеюсь,_что_тебе_также_хорошо.mp3" },
  { type: "file", title: "Lucy Rose - Pale Blue Eyes", src: "music/Lucy Rose - Pale Blue Eyes.mp3" },
  { type: "file", title: "i don t like mirrors - i miss your warm hands", src: "music/i don t like mirrors - i miss your warm hands.mp3" },
  { type: "file", title: "Flxweroff - Killswitch", src: "music/Flxweroff - Killswitch.mp3" },
  { type: "file", title: "A Normal Life", src: "music/02 A Normal Life.mp3" },
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const defaultState = {
  accepted: false,
  hearts: 0,
  gamesWon: 0,
  gamesPlayed: 0,
  losses: 0,
  streak: 0,
  bestPuzzleMoves: null,
  quizDone: false,
  quizScore: 0,
  giftClaimedAt: null,
  firstGiftNoticeSeen: false,
  secretGiftSeen: false,
  secretMessagesUnlocked: false,
  lastReward: "",
  trackIndex: 0,
  volume: 0.55,
  musicEnabled: true,
  sfxEnabled: true,
  shuffleTracks: false,
  repeatTrack: false,
  usedPromos: {},
  rewards: [],
  shopPurchases: {},
  wheelLastSpin: null,
  wheelRotation: 0,
  achievements: {},
  dailies: {
    date: TODAY,
    winGame: false,
    earnHearts: 0,
    puzzleUnder80: false,
  },
};

let state = loadState();
let currentQuizIndex = 0;
let quizCorrect = 0;
let memoryState = null;
let puzzleState = null;
let chessState = null;
let activeGame = null;
let audioCtx = null;
let pendingResult = null;

const achievements = [
  { id: "yes", title: "Сказала да", reward: 500, text: "самый важный старт" },
  { id: "night", title: "Ночная магия", reward: 350, text: "зашла вечером или ночью" },
  { id: "firstWin", title: "Первая победа", reward: 400, text: "выиграна первая игра" },
  { id: "streak5", title: "Серия из 5", reward: 1000, text: "пять побед подряд" },
  { id: "memoryFast", title: "Память сердца", reward: 700, text: "Memory на высокой сложности за 24 хода или меньше" },
  { id: "puzzleFast", title: "Мастер пятнашек", reward: 900, text: "пятнашки 4x4 или 5x5 меньше чем за 80 ходов" },
  { id: "quizPerfect", title: "Знает нас", reward: 1200, text: "викторина без ошибок" },
  { id: "chessHard", title: "Королева доски", reward: 1400, text: "мат роботу на 4 или 5 уровне" },
  { id: "giftReady", title: "Подарок открыт", reward: 0, text: "цель достигнута" },
];

const shopItems = [
  { id: "chupa", title: "Чупа-чупс один на двоих", price: 1500, limit: null },
  { id: "cola", title: "Ванильная кола с доставкой", price: 15000, limit: null },
  { id: "popcorn", title: "Попкорн с доставкой", price: 10000, limit: null },
  { id: "hug", title: "Обнимашки", price: 500, limit: null },
  { id: "come-over", title: "Прийти к тебе тогда когда ты этого захочешь и побыть рядом", price: 10000, limit: null },
  { id: "kiss", title: "Поцелуй", price: 1000, limit: null },
  { id: "bracelets", title: "Парные браслеты", price: 25000, limit: 1 },
  { id: "handmade", title: "Подарок своими руками", price: 50000, limit: 1 },
  { id: "cook", title: "Приготовить что-то вкусное для тебя", price: 75000, limit: 1 },
  { id: "wish", title: "Желание", price: 100000, limit: 3 },
  { id: "mom", title: "Знакомство с мамой", price: 250000, limit: 1 },
];

const wheelRewards = [
  "Поцелуй",
  "Обнимашки",
  "Говорю о том что очень тебя люблю",
];

const dailyTasks = [
  { id: "winGame", title: "Выиграй 1 игру", reward: 180, target: 1 },
  { id: "earnHearts", title: "Набери 1000 hearts", reward: 220, target: 1000 },
  { id: "puzzleUnder80", title: "Пятнашки за 80 ходов", reward: 260, target: 1 },
];

const memoryLevels = {
  easy: { label: "Лёгкий", pairs: 6, columns: 4, reward: 140, fast: 14 },
  normal: { label: "Средний", pairs: 8, columns: 4, reward: 240, fast: 18 },
  hard: { label: "Сложный", pairs: 12, columns: 6, reward: 420, fast: 24 },
};

const chessLevelLabels = {
  1: "1 новичок",
  2: "2 ученик",
  3: "3 средний",
  4: "4 эксперт",
  5: "5 супер сильный",
};

const chessStyles = {
  balanced: { label: "Сбалансированный", depthBonus: 0, random: 10, attack: 1, defense: 1, material: 1 },
  attacker: { label: "Атакующий", depthBonus: 0, random: 8, attack: 1.35, defense: 0.85, material: 0.95 },
  defender: { label: "Защитник", depthBonus: 0, random: 6, attack: 0.9, defense: 1.35, material: 1.05 },
  tactician: { label: "Тактик", depthBonus: 1, random: 2, attack: 1.15, defense: 1.05, material: 1.15 },
  risky: { label: "Авантюрист", depthBonus: -1, random: 18, attack: 1.55, defense: 0.65, material: 0.85 },
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || JSON.parse(localStorage.getItem("love-arcade-progress-v1"));
    const merged = { ...defaultState, ...saved };
    merged.trackIndex = Math.min(merged.trackIndex || 0, TRACKS.length - 1);
    merged.usedPromos = { ...defaultState.usedPromos, ...(saved?.usedPromos || {}) };
    merged.shopPurchases = { ...defaultState.shopPurchases, ...(saved?.shopPurchases || {}) };
    merged.rewards = Array.isArray(saved?.rewards) ? saved.rewards : [];
    merged.dailies = { ...defaultState.dailies, ...(saved?.dailies || {}) };
    if (merged.dailies.date !== TODAY) merged.dailies = { ...defaultState.dailies };
    return merged;
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function addReward(title, source, options = {}) {
  state.rewards.unshift({
    id: uid("reward"),
    title,
    source,
    createdAt: new Date().toISOString(),
    special: options.special || null,
  });
  saveState();
  renderRewards();
}

function ensureFirstGiftReward() {
  const exists = state.rewards.some((item) => item.special === "firstGift") || state.giftClaimedAt;
  if (!exists) {
    addReward("Первый подарок", "Подарок за ответ «Да»", { special: "firstGift" });
  }
}

function showModal({ title, body, actions = [], details = "" }) {
  const root = $("#modalRoot");
  const buttons = actions.length ? actions : [{ label: "Хорошо" }];
  root.innerHTML = `
    <div class="modal-card">
      <h3>${title}</h3>
      <p>${body}</p>
      ${details ? `<div class="modal-details">${details}</div>` : ""}
      <div class="modal-actions">
        ${buttons.map((button, index) => `<button class="${index === 0 ? "primary-btn" : "soft-btn"}" data-modal-action="${index}">${button.label}</button>`).join("")}
      </div>
    </div>
  `;
  root.classList.remove("hidden");
  $$("[data-modal-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = buttons[Number(button.dataset.modalAction)]?.action;
      root.classList.add("hidden");
      root.innerHTML = "";
      if (action) action();
    });
  });
}

function resetProgress() {
  if (!confirm("Сбросить всё и вернуться к вопросу Да/Нет?")) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("love-arcade-progress-v1");
  state = { ...JSON.parse(JSON.stringify(defaultState)), volume: state.volume, trackIndex: state.trackIndex };
  saveState();
  closeGame();
  $("#gameApp").classList.add("hidden");
  $("#proposalGate").classList.remove("hidden");
  renderAll();
}

function init() {
  setupGate();
  setupNavigation();
  setupMusic();
  setupAmbient();
  setupServiceWorker();
  applyTimeMode();
  if (state.accepted) openApp();
  renderAll();
}

function setupGate() {
  $("#yesBtn").addEventListener("click", () => {
    playSfx("win");
    state.accepted = true;
    ensureFirstGiftReward();
    saveState();
    openApp();
    unlockAchievement("yes");
    if (!state.firstGiftNoticeSeen) {
      state.firstGiftNoticeSeen = true;
      saveState();
      showModal({
        title: "Теперь ты моя девушка",
        body: "Твой подарок ждёт тебя в разделе награды. Я безумно рад, что ты согласилась. Спасибо тебе, солнышко моё, я так люблю тебя 💗",
        actions: [{ label: "Открыть награды", action: () => setView("rewards") }],
      });
    }
  });

  const noBtn = $("#noBtn");
  const moveNo = () => {
    playSfx("tick");
    const box = $(".proposal-actions").getBoundingClientRect();
    const btn = noBtn.getBoundingClientRect();
    const yes = $("#yesBtn").getBoundingClientRect();
    let x = 0;
    let y = 0;
    for (let i = 0; i < 24; i += 1) {
      x = Math.random() * Math.max(0, box.width - btn.width);
      y = Math.random() * Math.max(0, box.height - btn.height);
      const candidate = {
        left: box.left + x,
        top: box.top + y,
        right: box.left + x + btn.width,
        bottom: box.top + y + btn.height,
      };
      const overlapsYes = !(candidate.right < yes.left - 10 || candidate.left > yes.right + 10 || candidate.bottom < yes.top - 10 || candidate.top > yes.bottom + 10);
      if (!overlapsYes) break;
    }
    noBtn.style.left = `${x}px`;
    noBtn.style.top = `${y}px`;
  };
  noBtn.addEventListener("pointerenter", moveNo);
  noBtn.addEventListener("pointerdown", moveNo);
}

function openApp() {
  ensureFirstGiftReward();
  $("#proposalGate").classList.add("hidden");
  $("#gameApp").classList.remove("hidden");
  applyTimeMode();
  renderAll();
}

function setupServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js?v=3").catch(() => {});
  }
}

function setupNavigation() {
  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      playSfx("click");
      setView(viewButton.dataset.view);
    }

    const gameButton = event.target.closest("[data-game]");
    if (gameButton) {
      playSfx("click");
      openGame(gameButton.dataset.game);
    }

    if (event.target.closest("[data-close-game]")) closeGame();

    const buyButton = event.target.closest("[data-buy]");
    if (buyButton) confirmShopPurchase(buyButton.dataset.buy);

    const claimRewardButton = event.target.closest("[data-claim-reward]");
    if (claimRewardButton) claimReward(claimRewardButton.dataset.claimReward);

    const settingsTab = event.target.closest("[data-settings-tab]");
    if (settingsTab) setSettingsTab(settingsTab.dataset.settingsTab);
  });

  $("#spinWheelBtn")?.addEventListener("click", spinWheel);
  $("#applyPromoBtn")?.addEventListener("click", applyPromo);
}

function setView(view) {
  $$(".view").forEach((el) => el.classList.remove("active"));
  $(`#${view}View`)?.classList.add("active");
  $$(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === view));
  renderAll();
}

function setSettingsTab(tab) {
  $$(".settings-pane").forEach((pane) => pane.classList.remove("active"));
  $(`#${tab}Settings`)?.classList.add("active");
  $$("[data-settings-tab]").forEach((button) => button.classList.toggle("active", button.dataset.settingsTab === tab));
}

function ensureAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playSfx(type) {
  if (!state.sfxEnabled) return;
  const ctx = ensureAudioContext();
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  const osc = ctx.createOscillator();
  const config = {
    click: [480, 0.05, "sine", 0.035],
    tick: [720, 0.04, "triangle", 0.03],
    move: [360, 0.08, "sine", 0.045],
    match: [660, 0.12, "triangle", 0.06],
    error: [160, 0.14, "sawtooth", 0.035],
    win: [880, 0.22, "triangle", 0.08],
  }[type] || [440, 0.08, "sine", 0.04];
  osc.frequency.setValueAtTime(config[0], now);
  if (type === "win") osc.frequency.exponentialRampToValueAtTime(config[0] * 1.65, now + config[1]);
  if (type === "error") osc.frequency.exponentialRampToValueAtTime(80, now + config[1]);
  osc.type = config[2];
  gain.gain.setValueAtTime(config[3] * state.volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + config[1]);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + config[1] + 0.02);
}

function setupMusic() {
  const audio = $("#audioPlayer");
  audio.volume = state.volume;
  audio.src = TRACKS[state.trackIndex].src;
  $("#volumeRange").value = Math.round(state.volume * 100);

  $("#playPause").addEventListener("click", async () => {
    if (!state.musicEnabled) {
      state.musicEnabled = true;
      $("#musicEnabledToggle").checked = true;
    }
    if (audio.paused) {
      await audio.play().catch(() => {});
    } else {
      audio.pause();
    }
    renderMusic();
  });
  $("#prevTrack").addEventListener("click", () => changeTrack(-1, true));
  $("#nextTrack").addEventListener("click", () => changeTrack(1, true));
  $("#volumeRange").addEventListener("input", (event) => {
    state.volume = Number(event.target.value) / 100;
    audio.volume = state.volume;
    saveState();
  });
  $("#shuffleBtn").addEventListener("click", () => {
    state.shuffleTracks = !state.shuffleTracks;
    saveState();
    renderMusic();
  });
  $("#repeatBtn").addEventListener("click", () => {
    state.repeatTrack = !state.repeatTrack;
    audio.loop = state.repeatTrack;
    saveState();
    renderMusic();
  });
  $("#musicEnabledToggle").addEventListener("change", (event) => {
    state.musicEnabled = event.target.checked;
    if (!state.musicEnabled) audio.pause();
    saveState();
    renderMusic();
  });
  $("#sfxEnabledToggle").addEventListener("change", (event) => {
    state.sfxEnabled = event.target.checked;
    saveState();
  });
  $("#resetProgressBtn").addEventListener("click", resetProgress);
  audio.addEventListener("ended", () => {
    if (!state.repeatTrack) changeTrack(1, true);
  });
  audio.addEventListener("play", renderMusic);
  audio.addEventListener("pause", renderMusic);
}

function changeTrack(delta, autoplay) {
  if (state.shuffleTracks && autoplay) {
    let next = Math.floor(Math.random() * TRACKS.length);
    if (TRACKS.length > 1) while (next === state.trackIndex) next = Math.floor(Math.random() * TRACKS.length);
    selectTrack(next, autoplay);
    return;
  }
  selectTrack((state.trackIndex + delta + TRACKS.length) % TRACKS.length, autoplay);
}

function selectTrack(index, autoplay = true) {
  state.trackIndex = index;
  const track = TRACKS[index];
  const audio = $("#audioPlayer");
  audio.src = track.src;
  audio.loop = state.repeatTrack;
  if (autoplay && state.musicEnabled) audio.play().catch(() => {});
  saveState();
  renderMusic();
}

function applyTimeMode() {
  const hour = new Date().getHours();
  const isNight = hour >= 20 || hour < 6;
  document.body.classList.toggle("night", isNight);
  $("#timeMood").textContent = isNight ? "night mode" : "day Mode";
  $("#secretMessage").textContent = isNight
    ? "Секретное ночное событие активно: атмосфера стала тише, глубже и немного волшебнее."
    : "Днём здесь больше света, мягких бликов и спокойного настроения.";
  if (isNight && state.accepted) unlockAchievement("night");
}

function addHearts(amount, reason) {
  const before = state.hearts;
  state.hearts += amount;
  state.lastReward = `+${amount} hearts · ${reason}`;
  state.dailies.earnHearts += amount;
  saveState();
  animateCounter(before, state.hearts);
  showReward(`+${amount} hearts · ${reason}`);
  renderAll();
  if (state.hearts >= SECRET_GIFT_GOAL && !state.secretGiftSeen) {
    state.secretGiftSeen = true;
    saveState();
    showModal({
      title: "Секретный подарок открыт",
      body: "Напиши мне, чтобы забрать его. А если знаешь секретный промокод, введи его в настройках.",
      actions: [{ label: "Открыть подарок", action: () => setView("gift") }],
    });
  }
}

function animateCounter(from, to) {
  const start = performance.now();
  const duration = 700;
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const value = Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3)));
    $("#heartCount").textContent = `${value} hearts`;
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function showReward(text) {
  const toast = $("#rewardToast");
  toast.textContent = text;
  toast.classList.add("show");
  burstConfetti();
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function burstConfetti() {
  const colors = ["#ff5c8d", "#f6c766", "#79e2c2", "#8ec5ff", "#ff9cb8"];
  for (let i = 0; i < 28; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.left = `${44 + Math.random() * 12}%`;
    piece.style.top = "18%";
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty("--dx", `${Math.random() * 240 - 120}px`);
    document.body.appendChild(piece);
    piece.addEventListener("animationend", () => piece.remove());
  }
}

function completeWin(baseReward, reason) {
  playSfx("win");
  const beforeAchievements = new Set(Object.keys(state.achievements));
  state.gamesWon += 1;
  state.gamesPlayed += 1;
  state.streak += 1;
  state.losses = 0;
  state.dailies.winGame = true;
  const streakBonus = state.streak >= 3 ? Math.min(500, state.streak * 60) : 0;
  addHearts(baseReward + streakBonus, streakBonus ? `${reason} + серия` : reason);
  unlockAchievement("firstWin");
  if (state.streak >= 5) unlockAchievement("streak5");
  const gained = Object.keys(state.achievements)
    .filter((id) => !beforeAchievements.has(id))
    .map((id) => achievements.find((item) => item.id === id)?.title)
    .filter(Boolean);
  showResultModal("Победа", baseReward + streakBonus, gained);
}

function completeLoss() {
  playSfx("error");
  state.gamesPlayed += 1;
  state.losses += 1;
  state.streak = 0;
  if (state.losses >= 3) showReward("Секрет: даже серии поражений считаются частью истории");
  saveState();
  renderAll();
  showResultModal("Проигрыш", 0, []);
}

function unlockAchievement(id) {
  if (state.achievements[id]) return;
  const achievement = achievements.find((item) => item.id === id);
  if (!achievement) return;
  state.achievements[id] = new Date().toISOString();
  saveState();
  if (achievement.reward > 0) addHearts(achievement.reward, `достижение: ${achievement.title}`);
  renderAll();
}

function showResultModal(title, hearts, gainedAchievements) {
  const details = gainedAchievements.length
    ? `<strong>Полученные достижения:</strong><ul>${gainedAchievements.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : `<span class="muted">Новых достижений нет.</span>`;
  showModal({
    title,
    body: hearts > 0 ? `Получено: +${hearts} hearts.` : "В этот раз hearts не начислены.",
    details,
  });
}

function renderAll() {
  renderProgress();
  renderDaily();
  renderAchievements();
  renderGift();
  renderMusic();
  renderRewards();
  renderShop();
  renderWheel();
}

function renderProgress() {
  $("#heartCount").textContent = `${state.hearts} hearts`;
  $("#orbPercent").textContent = `${state.hearts}`;
  $("#lastReward").textContent = state.lastReward || "Пока наград нет. Самое приятное впереди.";
}

function renderDaily() {
  const markup = dailyTasks.map((task) => {
    const progress = getDailyProgress(task);
    const done = progress >= task.target;
    const claimed = state.dailies[`${task.id}Claimed`];
    return `
      <article class="task-item">
        <div class="task-top">
          <strong>${task.title}</strong>
          <span>${done ? "готово" : `${progress}/${task.target}`}</span>
        </div>
        <div class="task-meter"><span style="width:${Math.min(100, (progress / task.target) * 100)}%"></span></div>
        <button class="soft-btn" ${done && !claimed ? "" : "disabled"} data-daily="${task.id}">
          ${claimed ? "получено" : `+${task.reward} hearts`}
        </button>
      </article>
    `;
  }).join("");
  $("#dailyTasks").innerHTML = markup;
  $("#dailyPreview").innerHTML = markup;
  $$("[data-daily]").forEach((btn) => btn.addEventListener("click", () => claimDaily(btn.dataset.daily)));
}

function getDailyProgress(task) {
  if (task.id === "winGame") return state.dailies.winGame ? 1 : 0;
  if (task.id === "earnHearts") return Math.min(task.target, state.dailies.earnHearts);
  if (task.id === "puzzleUnder80") return state.dailies.puzzleUnder80 ? 1 : 0;
  return 0;
}

function claimDaily(id) {
  const task = dailyTasks.find((item) => item.id === id);
  if (!task || state.dailies[`${id}Claimed`] || getDailyProgress(task) < task.target) return;
  playSfx("match");
  state.dailies[`${id}Claimed`] = true;
  addHearts(task.reward, `daily task: ${task.title}`);
}

function renderAchievements() {
  const markup = achievements.map((item) => {
    const unlocked = Boolean(state.achievements[item.id]);
    return `
      <article class="achievement ${unlocked ? "" : "locked"}">
        <div class="achievement-top">
          <strong>${item.title}</strong>
          <span>${unlocked ? "открыто" : `+${item.reward}`}</span>
        </div>
        <p class="muted">${item.text}</p>
      </article>
    `;
  }).join("");
  $("#achievements").innerHTML = markup;
  $("#achievementPreview").innerHTML = markup;
}

function renderGift() {
  const ready = Boolean(state.giftClaimedAt);
  const panel = $("#giftPanel");
  panel.classList.toggle("unlocked", ready);
  if (state.giftClaimedAt) {
    $("#giftTitle").textContent = "Теперь ты моя девушка";
    $("#giftText").textContent = "Я безумно рад, что ты согласилась. Спасибо тебе, солнышко моё, я так люблю тебя 💗";
  } else {
    $("#giftTitle").textContent = "Первый подарок ждёт тебя в разделе награды.";
    $("#giftText").textContent = "Забери его там, и приложение сохранит дату и время этого момента.";
  }
  $("#giftStamp").textContent = state.giftClaimedAt ? `Получено: ${new Date(state.giftClaimedAt).toLocaleString()}` : "";
  $("#secretGiftPanel").classList.toggle("hidden", state.hearts < SECRET_GIFT_GOAL);
}

function renderMusic() {
  const audio = $("#audioPlayer");
  const track = TRACKS[state.trackIndex];
  $("#trackName").textContent = track.title;
  $("#trackStatus").textContent = audio.paused ? "пауза" : "играет";
  $("#playPause").textContent = audio.paused ? "Play" : "Pause";
  $("#shuffleBtn").classList.toggle("active", state.shuffleTracks);
  $("#repeatBtn").classList.toggle("active", state.repeatTrack);
  $("#musicEnabledToggle").checked = state.musicEnabled;
  $("#sfxEnabledToggle").checked = state.sfxEnabled;
  $("#messagesTabBtn").classList.toggle("hidden", !state.secretMessagesUnlocked);
  $("#trackList").innerHTML = TRACKS.map((item, index) => `
    <button class="track-option ${index === state.trackIndex ? "active" : ""}" data-track="${index}">
      ${item.title}
    </button>
  `).join("");
  $$("[data-track]").forEach((btn) => btn.addEventListener("click", () => selectTrack(Number(btn.dataset.track))));
}

function renderRewards() {
  const list = $("#rewardList");
  if (!list) return;
  if (!state.rewards.length) {
    list.innerHTML = `<article class="panel compact"><h3>Пока пусто</h3><p class="muted">Награды из колеса и магазина появятся здесь.</p></article>`;
    return;
  }
  list.innerHTML = state.rewards.map((reward) => `
    <article class="reward-card">
      <div>
        <strong>${reward.title}</strong>
        <p class="muted">${reward.source} · ${new Date(reward.createdAt).toLocaleString()}</p>
      </div>
      <button class="primary-btn" data-claim-reward="${reward.id}">${reward.special === "firstGift" ? "Забрать" : "Получено"}</button>
    </article>
  `).join("");
}

function claimReward(id) {
  const reward = state.rewards.find((item) => item.id === id);
  if (!reward) return;
  if (reward.special === "firstGift") {
    state.giftClaimedAt = new Date().toISOString();
    showModal({
      title: "Подарок получен",
      body: "Теперь ты моя девушка, я безумно рад что ты согласилась спасибо тебе солнышко моё, я так люблю тебя 💗",
    });
  }
  state.rewards = state.rewards.filter((item) => item.id !== id);
  saveState();
  renderAll();
}

function renderShop() {
  const list = $("#shopList");
  if (!list) return;
  list.innerHTML = [...shopItems].sort((a, b) => a.price - b.price).map((item) => {
    const bought = state.shopPurchases[item.id] || 0;
    const soldOut = item.limit !== null && bought >= item.limit;
    return `
      <article class="shop-card">
        <div>
          <strong>${item.title}</strong>
          <p class="muted">${item.price.toLocaleString()} hearts · ${item.limit === null ? "без ограничений" : `осталось ${Math.max(0, item.limit - bought)}`}</p>
        </div>
        <button class="primary-btn" data-buy="${item.id}" ${soldOut || state.hearts < item.price ? "disabled" : ""}>Купить</button>
      </article>
    `;
  }).join("");
}

function confirmShopPurchase(id) {
  const item = shopItems.find((entry) => entry.id === id);
  if (!item) return;
  const bought = state.shopPurchases[id] || 0;
  if (item.limit !== null && bought >= item.limit) return;
  if (state.hearts < item.price) {
    showModal({ title: "Не хватает hearts", body: `Для покупки нужно ${item.price.toLocaleString()} hearts.` });
    return;
  }
  showModal({
    title: "Подтвердить покупку",
    body: `Купить «${item.title}» за ${item.price.toLocaleString()} hearts?`,
    actions: [
      { label: "Купить", action: () => buyShopItem(item) },
      { label: "Отмена" },
    ],
  });
}

function buyShopItem(item) {
  state.hearts -= item.price;
  state.shopPurchases[item.id] = (state.shopPurchases[item.id] || 0) + 1;
  addReward(item.title, "Покупка в магазине");
  saveState();
  renderAll();
  showModal({ title: "Покупка готова", body: `Ты приобрела: ${item.title}. Награда добавлена во вкладку «Награды».` });
}

function renderWheel() {
  const status = $("#wheelStatus");
  const button = $("#spinWheelBtn");
  const wheel = $("#wheel");
  if (!status || !button) return;
  if (wheel) {
    wheel.style.transform = `rotate(${state.wheelRotation || 0}deg)`;
    wheel.innerHTML = wheelRewards.map((reward, index) => `
      <span class="wheel-label wheel-label-${index}">${reward}</span>
    `).join("");
  }
  if (wheel && !wheel.parentElement.querySelector(".wheel-pointer")) {
    wheel.insertAdjacentHTML("beforebegin", `<span class="wheel-pointer" aria-hidden="true"></span>`);
  }
  const last = state.wheelLastSpin ? new Date(state.wheelLastSpin).getTime() : 0;
  const canSpin = !last || Date.now() - last >= WEEK_MS;
  button.disabled = !canSpin;
  if (canSpin) {
    status.textContent = "Колесо готово.";
  } else {
    const next = new Date(last + WEEK_MS);
    status.textContent = `Следующая попытка: ${next.toLocaleString()}`;
  }
}

function spinWheel() {
  const last = state.wheelLastSpin ? new Date(state.wheelLastSpin).getTime() : 0;
  if (last && Date.now() - last < WEEK_MS) return;
  const wheel = $("#wheel");
  const button = $("#spinWheelBtn");
  const rewardIndex = Math.floor(Math.random() * wheelRewards.length);
  const reward = wheelRewards[rewardIndex];
  const sector = 360 / wheelRewards.length;
  const target = (state.wheelRotation || 0) + 360 * 7 + (360 - (rewardIndex * sector + sector / 2));
  state.wheelLastSpin = new Date().toISOString();
  state.wheelRotation = target;
  saveState();
  if (button) button.disabled = true;
  if (wheel) {
    wheel.classList.add("spinning");
    wheel.style.transform = `rotate(${target}deg)`;
  }
  window.setTimeout(() => {
    if (wheel) wheel.classList.remove("spinning");
    addReward(reward, "Колесо фортуны");
    renderAll();
    showModal({ title: "Колесо фортуны", body: `Выпало: ${reward}. Награда добавлена во вкладку «Награды».` });
  }, 3300);
}

function applyPromo() {
  const input = $("#promoInput");
  const code = input.value.trim();
  const normalized = code.toLowerCase();
  if (normalized === "солнышко") {
    if (state.usedPromos.sun) {
      $("#promoStatus").textContent = "Этот промокод уже был использован.";
      return;
    }
    state.usedPromos.sun = true;
    addHearts(10000, "промокод солнышко");
    $("#promoStatus").textContent = "+10000 hearts начислены.";
    input.value = "";
    return;
  }
  if (code.toUpperCase() === "ILU") {
    if (state.hearts < SECRET_GIFT_GOAL) {
      $("#promoStatus").textContent = "Секретный промокод откроется после 20 000 hearts.";
      return;
    }
    state.secretMessagesUnlocked = true;
    saveState();
    renderMusic();
    setSettingsTab("messages");
    $("#promoStatus").textContent = "Открыта вкладка сообщений.";
    input.value = "";
    return;
  }
  $("#promoStatus").textContent = "Промокод не найден.";
}

function openGame(game) {
  activeGame = game;
  const stage = $("#gameStage");
  document.body.classList.add("game-open");
  stage.classList.add("active");
  if (game === "memory") renderMemory("normal");
  if (game === "puzzle") renderPuzzle(4);
  if (game === "quiz") renderQuizStart();
  if (game === "chess") renderChess();
}

function closeGame() {
  activeGame = null;
  $("#gameStage").classList.remove("active");
  $("#gameStage").innerHTML = "";
  document.body.classList.remove("game-open");
}

function stageShell(title, subtitle, actions = "") {
  return `
    <div class="stage-head">
      <div>
        <p class="kicker">${subtitle}</p>
        <h3>${title}</h3>
      </div>
      <div class="stage-actions">
        ${actions}
        <button class="soft-btn" data-close-game>Назад</button>
      </div>
    </div>
  `;
}

function renderMemory(level = memoryState?.level || "normal") {
  const config = memoryLevels[level];
  const icons = ["♥", "✦", "☾", "♛", "✿", "◇", "★", "∞", "☼", "♪", "✧", "❣"];
  const selected = icons.slice(0, config.pairs);
  const deck = shuffleMemoryDeck([...selected, ...selected], config.columns).map((icon, index) => ({ icon, id: index, flipped: false, matched: false }));
  memoryState = { deck, moves: 0, lock: false, level, startedAt: Date.now() };
  drawMemory();
}

function drawMemory() {
  const config = memoryLevels[memoryState.level];
  $("#gameStage").innerHTML = stageShell(
    "Memory Love",
    `${config.label} · ходов: ${memoryState.moves}`,
    `
      <div class="segmented">
        ${Object.entries(memoryLevels).map(([key, item]) => `<button class="chip ${memoryState.level === key ? "active" : ""}" data-memory-level="${key}">${item.label}</button>`).join("")}
      </div>
      <button class="soft-btn" id="restartMemory">Заново</button>
    `
  ) + `<div class="memory-board memory-${memoryState.level}" style="--memory-cols:${config.columns}">${memoryState.deck.map((card, index) => `
      <button class="memory-card ${card.flipped || card.matched ? "flipped" : ""} ${card.matched ? "matched" : ""}" data-card="${index}">
        ${card.flipped || card.matched ? card.icon : ""}
      </button>
    `).join("")}</div>`;
  $("#restartMemory").addEventListener("click", () => renderMemory(memoryState.level));
  $$("[data-memory-level]").forEach((btn) => btn.addEventListener("click", () => renderMemory(btn.dataset.memoryLevel)));
  $$("[data-card]").forEach((btn) => btn.addEventListener("click", () => flipMemory(Number(btn.dataset.card))));
}

function shuffleMemoryDeck(items, columns) {
  let best = shuffle(items);
  let bestScore = scoreMemoryDeck(best, columns);
  for (let i = 0; i < 80 && bestScore > 0; i += 1) {
    const candidate = shuffle(items);
    const score = scoreMemoryDeck(candidate, columns);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

function scoreMemoryDeck(deck, columns) {
  let score = 0;
  deck.forEach((value, index) => {
    const neighbors = [index + 1, index - 1, index + columns, index - columns];
    neighbors.forEach((neighbor) => {
      if (neighbor >= 0 && neighbor < deck.length && deck[neighbor] === value) score += 1;
    });
  });
  return score;
}

function flipMemory(index) {
  if (memoryState.lock) return;
  const card = memoryState.deck[index];
  if (card.flipped || card.matched) return;
  playSfx("move");
  card.flipped = true;
  const open = memoryState.deck.filter((item) => item.flipped && !item.matched);
  if (open.length === 2) {
    memoryState.moves += 1;
    if (open[0].icon === open[1].icon) {
      playSfx("match");
      open.forEach((item) => {
        item.matched = true;
        item.flipped = false;
      });
      if (memoryState.deck.every((item) => item.matched)) {
        const config = memoryLevels[memoryState.level];
        const bonus = Math.max(50, config.reward - memoryState.moves * (memoryState.level === "hard" ? 8 : 6));
        completeWin(bonus, `Memory Love ${config.label}`);
        if (memoryState.level === "hard" && memoryState.moves <= config.fast) unlockAchievement("memoryFast");
      }
    } else {
      memoryState.lock = true;
      playSfx("error");
      setTimeout(() => {
        open.forEach((item) => { item.flipped = false; });
        memoryState.lock = false;
        drawMemory();
      }, 650);
    }
  }
  drawMemory();
}

function renderPuzzle(size = puzzleState?.size || 4) {
  const tiles = makeSolvablePuzzle(size);
  puzzleState = { tiles, size, moves: 0, startedAt: Date.now() };
  drawPuzzle();
}

function makeSolvablePuzzle(size) {
  const count = size * size;
  const tiles = [...Array(count - 1).keys()].map((n) => n + 1).concat(0);
  for (let i = 0; i < size * size * 24; i += 1) {
    const empty = tiles.indexOf(0);
    const moves = puzzleMoves(empty, size);
    const next = moves[Math.floor(Math.random() * moves.length)];
    [tiles[empty], tiles[next]] = [tiles[next], tiles[empty]];
  }
  return tiles;
}

function puzzleMoves(index, size = puzzleState.size) {
  const row = Math.floor(index / size);
  const col = index % size;
  return [
    row > 0 ? index - size : null,
    row < size - 1 ? index + size : null,
    col > 0 ? index - 1 : null,
    col < size - 1 ? index + 1 : null,
  ].filter((value) => value !== null);
}

function drawPuzzle() {
  const size = puzzleState.size;
  $("#gameStage").innerHTML = stageShell(
    "Пятнашки",
    `${size}x${size} · ходов: ${puzzleState.moves}`,
    `
      <div class="segmented">
        ${[3, 4, 5].map((value) => `<button class="chip ${size === value ? "active" : ""}" data-puzzle-size="${value}">${value}x${value}</button>`).join("")}
      </div>
      <button class="soft-btn" id="restartPuzzle">Перемешать</button>
    `
  ) + `<div class="puzzle-board" style="--puzzle-size:${size}">${puzzleState.tiles.map((tile, index) => `
      <button class="tile ${tile === 0 ? "empty" : ""}" data-tile="${index}">${tile || ""}</button>
    `).join("")}</div>`;
  $("#restartPuzzle").addEventListener("click", () => renderPuzzle(size));
  $$("[data-puzzle-size]").forEach((btn) => btn.addEventListener("click", () => renderPuzzle(Number(btn.dataset.puzzleSize))));
  $$("[data-tile]").forEach((btn) => btn.addEventListener("click", () => movePuzzle(Number(btn.dataset.tile))));
}

function movePuzzle(index) {
  const empty = puzzleState.tiles.indexOf(0);
  if (!puzzleMoves(empty).includes(index)) return;
  playSfx("move");
  [puzzleState.tiles[empty], puzzleState.tiles[index]] = [puzzleState.tiles[index], puzzleState.tiles[empty]];
  puzzleState.moves += 1;
  const solved = puzzleState.tiles.slice(0, -1).every((tile, index) => tile === index + 1);
  if (solved) {
    state.bestPuzzleMoves = state.bestPuzzleMoves ? Math.min(state.bestPuzzleMoves, puzzleState.moves) : puzzleState.moves;
    if (puzzleState.size >= 4 && puzzleState.moves <= 80) {
      state.dailies.puzzleUnder80 = true;
      unlockAchievement("puzzleFast");
    }
    const base = { 3: 220, 4: 520, 5: 760 }[puzzleState.size];
    const reward = Math.max(80, base - puzzleState.moves * (puzzleState.size + 1));
    completeWin(reward, `Пятнашки ${puzzleState.size}x${puzzleState.size}`);
  }
  drawPuzzle();
}

const quizQuestions = [
  { question: "Как зовут бабушкиного котика?", options: ["Юки", "Снежок", "Марсик", "Персик"], answer: "Юки", comment: "Правильно! Его зовут Юки" },
  { question: "На какой фильм мы в первый раз пошли в кинотеатр?", options: ["Иллюзия обмана", "Сказка о царе Салтане", "Аватар", "Ла-Ла Ленд"], answer: "Иллюзия обмана", comment: "Верно! «Иллюзия обмана» — наш первый фильм в кино" },
  { question: "Сколько раз я сказал что люблю тебя?", options: ["25", "67", "85", "счет потерян"], answer: "счет потерян", comment: "Счёт потерян, потому что я люблю тебя бесконечно ❤️" },
  { question: "Кто ты для меня?", options: ["самый дорогой человек", "моя любимая", "мое счастье и солнышко", "все перечисленное и даже больше"], answer: "все перечисленное и даже больше", comment: "Ты — всё для меня, и даже больше чем слова могут выразить 💕" },
];

function renderQuizStart() {
  if (state.quizDone) {
    $("#gameStage").innerHTML = stageShell("Викторина уже пройдена", "одноразовая игра") +
      `<p class="muted">Результат сохранён: ${state.quizScore}/${quizQuestions.length}. Повторное получение hearts отключено.</p>`;
    return;
  }
  currentQuizIndex = 0;
  quizCorrect = 0;
  drawQuiz();
}

function drawQuiz() {
  const q = quizQuestions[currentQuizIndex];
  $("#gameStage").innerHTML = stageShell(q.question, `вопрос ${currentQuizIndex + 1} из ${quizQuestions.length}`) +
    `<div class="quiz-options">${q.options.map((option) => `<button class="quiz-option" data-answer="${option}">${option}</button>`).join("")}</div>`;
  $$("[data-answer]").forEach((btn) => btn.addEventListener("click", () => answerQuiz(btn.dataset.answer)));
}

function answerQuiz(answer) {
  const q = quizQuestions[currentQuizIndex];
  if (answer === q.answer) {
    quizCorrect += 1;
    playSfx("match");
  } else {
    playSfx("error");
  }
  $$(".quiz-option").forEach((btn) => {
    btn.disabled = true;
    btn.classList.toggle("correct", btn.dataset.answer === q.answer);
    btn.classList.toggle("wrong", btn.dataset.answer === answer && answer !== q.answer);
  });
  $("#gameStage").insertAdjacentHTML("beforeend", `
    <div class="quiz-comment">
      <strong>${answer === q.answer ? q.comment : `Правильный ответ: ${q.answer}`}</strong>
      <button id="nextQuizBtn" class="primary-btn">Дальше</button>
    </div>
  `);
  $("#nextQuizBtn").addEventListener("click", () => {
    currentQuizIndex += 1;
    if (currentQuizIndex >= quizQuestions.length) finishQuiz();
    else drawQuiz();
  });
}

function finishQuiz() {
  state.quizDone = true;
  state.quizScore = quizCorrect;
  const reward = 500 + quizCorrect * 250;
  completeWin(reward, "Викторина");
  if (quizCorrect === quizQuestions.length) unlockAchievement("quizPerfect");
  $("#gameStage").innerHTML = stageShell("Викторина завершена", `${quizCorrect}/${quizQuestions.length}`) +
    `<p class="muted">Результат сохранён. Эту викторину нельзя пройти повторно ради hearts.</p>`;
}

const pieceChars = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};

const pieceValue = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

function initialBoard() {
  return [
    ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"],
    ["bP", "bP", "bP", "bP", "bP", "bP", "bP", "bP"],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["wP", "wP", "wP", "wP", "wP", "wP", "wP", "wP"],
    ["wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"],
  ];
}

function renderChess(options = {}) {
  const previous = chessState || {};
  chessState = {
    phase: "setup",
    board: null,
    selected: null,
    turn: "w",
    mode: options.mode || previous.mode || "ai",
    level: options.level || previous.level || 1,
    style: options.style || previous.style || "balanced",
    playerColor: options.playerColor || previous.playerColor || "w",
    status: "Выбери режим и нажми «Играть»",
  };
  drawChessSetup();
}

function startChessGame() {
  chessState = {
    ...chessState,
    phase: "playing",
    board: initialBoard(),
    selected: null,
    turn: "w",
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    pendingPromotion: null,
    halfmove: 0,
    fullmove: 1,
    status: "Ход белых",
    over: false,
    lastMove: null,
    animateLastMove: false,
  };
  drawChess();
  if (chessState.mode === "ai" && chessState.playerColor === "b") setTimeout(aiMove, 500);
}

function drawChessSetup() {
  $("#gameStage").innerHTML = stageShell("Шахматы", "настройка партии") + `
    <div class="chess-setup">
      <div class="chess-setup-art">
        <span>♔</span><span>♕</span><span>♘</span><span>♜</span>
      </div>
      <aside class="chess-side panel compact">
        <label class="range-label">Режим
          <select id="chessMode">
            <option value="ai" ${chessState.mode === "ai" ? "selected" : ""}>с роботом</option>
            <option value="two" ${chessState.mode === "two" ? "selected" : ""}>для двоих</option>
          </select>
        </label>
        <label class="range-label">Твоя сторона
          <select id="playerColor" ${chessState.mode === "two" ? "disabled" : ""}>
            <option value="w" ${chessState.playerColor === "w" ? "selected" : ""}>белые</option>
            <option value="b" ${chessState.playerColor === "b" ? "selected" : ""}>чёрные</option>
          </select>
        </label>
        <label class="range-label">Сила робота
          <select id="chessLevel" ${chessState.mode === "two" ? "disabled" : ""}>
            ${[1, 2, 3, 4, 5].map((level) => `<option value="${level}" ${chessState.level === level ? "selected" : ""}>${chessLevelLabels[level]}</option>`).join("")}
          </select>
        </label>
        <label class="range-label">Стиль робота
          <select id="chessStyle" ${chessState.mode === "two" ? "disabled" : ""}>
            ${Object.entries(chessStyles).map(([key, style]) => `<option value="${key}" ${chessState.style === key ? "selected" : ""}>${style.label}</option>`).join("")}
          </select>
        </label>
        <button id="startChessBtn" class="primary-btn big">Играть</button>
      </aside>
    </div>
  `;
  $("#chessMode").addEventListener("change", (e) => {
    chessState.mode = e.target.value;
    drawChessSetup();
  });
  $("#playerColor").addEventListener("change", (e) => {
    chessState.playerColor = e.target.value;
  });
  $("#chessLevel").addEventListener("change", (e) => {
    chessState.level = Number(e.target.value);
  });
  $("#chessStyle").addEventListener("change", (e) => {
    chessState.style = e.target.value;
  });
  $("#startChessBtn").addEventListener("click", startChessGame);
}

function displayOrder() {
  const flip = chessState.mode === "ai" && chessState.playerColor === "b";
  const rows = [...Array(8).keys()];
  const cols = [...Array(8).keys()];
  return { rows: flip ? rows.reverse() : rows, cols: flip ? cols.reverse() : cols, flip };
}

function displayDelta(fr, fc, tr, tc) {
  const { flip } = displayOrder();
  const fromDisplayC = flip ? 7 - fc : fc;
  const toDisplayC = flip ? 7 - tc : tc;
  const fromDisplayR = flip ? 7 - fr : fr;
  const toDisplayR = flip ? 7 - tr : tr;
  return {
    x: `${(fromDisplayC - toDisplayC) * 100}%`,
    y: `${(fromDisplayR - toDisplayR) * 100}%`,
  };
}

function drawChess() {
  if (chessState.phase !== "playing") return drawChessSetup();
  const { rows, cols } = displayOrder();
  const hints = chessState.selected ? legalMovesFor(chessState, chessState.selected.r, chessState.selected.c) : [];
  const board = rows.map((r) => cols.map((c) => {
    const piece = chessState.board[r][c];
    const selected = chessState.selected && chessState.selected.r === r && chessState.selected.c === c;
    const hintMove = hints.find((m) => m.tr === r && m.tc === c);
    const lastFrom = chessState.lastMove && chessState.lastMove.fr === r && chessState.lastMove.fc === c;
    const lastTo = chessState.lastMove && chessState.lastMove.tr === r && chessState.lastMove.tc === c;
    const delta = lastTo ? displayDelta(chessState.lastMove.fr, chessState.lastMove.fc, r, c) : { x: "0%", y: "0%" };
    const fly = lastTo && chessState.animateLastMove;
    return `<button class="square ${(r + c) % 2 ? "dark" : "light"} ${selected ? "selected" : ""} ${hintMove ? "hint" : ""} ${hintMove && piece ? "capture-hint" : ""} ${lastFrom ? "last-from" : ""} ${lastTo ? "last-to" : ""}" data-sq="${r},${c}">
      ${piece ? `<span class="piece ${piece[0] === "w" ? "white-piece" : "black-piece"} ${fly ? "fly" : ""}" style="--from-x:${delta.x};--from-y:${delta.y}">${pieceChars[piece]}</span>` : ""}
    </button>`;
  }).join("")).join("");

  $("#gameStage").innerHTML = stageShell("Шахматы", chessState.status, `
    <button class="soft-btn" id="newChess">Новая партия</button>
  `) + `
    <div class="chess-wrap">
      <div class="chess-board">${board}</div>
      <aside class="chess-side panel compact">
        <h3>${chessState.mode === "ai" ? `${chessLevelLabels[chessState.level]} · ${chessStyles[chessState.style].label}` : "Игра для двоих"}</h3>
        <p class="muted">${chessState.mode === "ai" ? `Ты играешь за ${chessState.playerColor === "w" ? "белых" : "чёрных"}.` : "Передавайте ход друг другу на одном устройстве."}</p>
        <p class="muted">Кружочки показывают доступные ходы. Последний ход подсвечивается двумя полями.</p>
        ${chessState.pendingPromotion ? promotionMarkup() : ""}
      </aside>
    </div>
  `;
  $("#newChess").addEventListener("click", () => renderChess({ mode: chessState.mode, level: chessState.level, style: chessState.style, playerColor: chessState.playerColor }));
  $$("[data-sq]").forEach((btn) => btn.addEventListener("click", () => {
    const [r, c] = btn.dataset.sq.split(",").map(Number);
    clickSquare(r, c);
  }));
  $$("[data-promote]").forEach((btn) => btn.addEventListener("click", () => choosePromotion(btn.dataset.promote)));
  chessState.animateLastMove = false;
}

function promotionMarkup() {
  return `
    <div class="promotion-box">
      <strong>Выбери превращение</strong>
      <div class="control-row">
        ${["Q", "R", "B", "N"].map((type) => `<button class="icon-btn" data-promote="${type}">${pieceChars[chessState.pendingPromotion.color + type]}</button>`).join("")}
      </div>
    </div>
  `;
}

function humanCanMove(color) {
  return chessState.mode === "two" || color === chessState.playerColor;
}

function clickSquare(r, c) {
  if (chessState.over || chessState.pendingPromotion) return;
  const piece = chessState.board[r][c];
  if (!humanCanMove(chessState.turn)) return;
  if (!chessState.selected) {
    if (piece && piece[0] === chessState.turn) {
      chessState.selected = { r, c };
      playSfx("click");
      drawChess();
    }
    return;
  }
  const moves = legalMovesFor(chessState, chessState.selected.r, chessState.selected.c);
  const move = moves.find((m) => m.tr === r && m.tc === c);
  if (move) {
    if (move.promotion) {
      chessState.pendingPromotion = { ...move, color: chessState.turn };
      drawChess();
      return;
    }
    commitChessMove(move);
  } else {
    playSfx(piece && piece[0] === chessState.turn ? "click" : "error");
    chessState.selected = piece && piece[0] === chessState.turn ? { r, c } : null;
  }
  drawChess();
  maybeAiTurn();
}

function choosePromotion(type) {
  if (!chessState.pendingPromotion) return;
  commitChessMove({ ...chessState.pendingPromotion, promotion: type });
  chessState.pendingPromotion = null;
  drawChess();
  maybeAiTurn();
}

function maybeAiTurn() {
  if (!chessState.over && chessState.mode === "ai" && chessState.turn !== chessState.playerColor) {
    setTimeout(aiMove, 460);
  }
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function applyMoveTo(board, move) {
  const next = cloneBoard(board);
  const moving = next[move.fr][move.fc];
  next[move.fr][move.fc] = null;
  if (move.enPassantCapture) next[move.fr][move.tc] = null;
  if (move.castle === "K") {
    next[move.fr][5] = next[move.fr][7];
    next[move.fr][7] = null;
  }
  if (move.castle === "Q") {
    next[move.fr][3] = next[move.fr][0];
    next[move.fr][0] = null;
  }
  next[move.tr][move.tc] = move.promotion ? moving[0] + (move.promotion === true ? "Q" : move.promotion) : moving;
  return next;
}

function commitChessMove(move) {
  const moving = chessState.board[move.fr][move.fc];
  const captured = chessState.board[move.tr][move.tc] || (move.enPassantCapture ? chessState.board[move.fr][move.tc] : null);
  chessState.board = applyMoveTo(chessState.board, move);
  updateCastlingRights(moving, move, captured);
  chessState.enPassant = moving[1] === "P" && Math.abs(move.tr - move.fr) === 2
    ? { r: (move.fr + move.tr) / 2, c: move.fc }
    : null;
  chessState.lastMove = move;
  chessState.animateLastMove = true;
  chessState.selected = null;
  chessState.turn = opposite(chessState.turn);
  if (chessState.turn === "w") chessState.fullmove += 1;
  playSfx(captured ? "match" : "move");
  updateChessStatus();
}

function updateCastlingRights(piece, move, captured) {
  if (piece === "wK") chessState.castling.wK = chessState.castling.wQ = false;
  if (piece === "bK") chessState.castling.bK = chessState.castling.bQ = false;
  if (piece === "wR" && move.fr === 7 && move.fc === 0) chessState.castling.wQ = false;
  if (piece === "wR" && move.fr === 7 && move.fc === 7) chessState.castling.wK = false;
  if (piece === "bR" && move.fr === 0 && move.fc === 0) chessState.castling.bQ = false;
  if (piece === "bR" && move.fr === 0 && move.fc === 7) chessState.castling.bK = false;
  if (captured === "wR" && move.tr === 7 && move.tc === 0) chessState.castling.wQ = false;
  if (captured === "wR" && move.tr === 7 && move.tc === 7) chessState.castling.wK = false;
  if (captured === "bR" && move.tr === 0 && move.tc === 0) chessState.castling.bQ = false;
  if (captured === "bR" && move.tr === 0 && move.tc === 7) chessState.castling.bK = false;
}

function updateChessStatus() {
  const legal = allLegalMoves(chessState, chessState.turn);
  const checked = isInCheck(chessState.board, chessState.turn);
  if (!legal.length) {
    chessState.over = true;
    if (checked) {
      const winner = opposite(chessState.turn);
      chessState.status = `${winner === "w" ? "Белые" : "Чёрные"} поставили мат`;
      if (chessState.mode === "ai") {
        if (winner === chessState.playerColor) {
          const reward = [0, 120, 240, 420, 720, 1100][chessState.level];
          completeWin(reward, `Шахматы · ${chessLevelLabels[chessState.level]}`);
          if (chessState.level >= 4) unlockAchievement("chessHard");
        } else {
          completeLoss();
        }
      } else {
        completeWin(260, "Шахматы для двоих");
      }
    } else {
      chessState.status = "Пат. Ничья";
      addHearts(90, "шахматная ничья");
    }
    return;
  }
  chessState.status = `${chessState.turn === "w" ? "Ход белых" : "Ход чёрных"}${checked ? " · шах" : ""}`;
}

function opposite(color) {
  return color === "w" ? "b" : "w";
}

function findKing(board, color) {
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      if (board[r][c] === `${color}K`) return { r, c };
    }
  }
  return null;
}

function isInCheck(board, color) {
  const king = findKing(board, color);
  return king ? isSquareAttacked(board, king.r, king.c, opposite(color)) : false;
}

function isSquareAttacked(board, r, c, byColor) {
  for (let rr = 0; rr < 8; rr += 1) {
    for (let cc = 0; cc < 8; cc += 1) {
      const piece = board[rr][cc];
      if (piece?.[0] === byColor && attacksSquare(board, rr, cc, r, c)) return true;
    }
  }
  return false;
}

function attacksSquare(board, fr, fc, tr, tc) {
  const piece = board[fr][fc];
  if (!piece) return false;
  const color = piece[0];
  const type = piece[1];
  const dr = tr - fr;
  const dc = tc - fc;
  if (type === "P") return dr === (color === "w" ? -1 : 1) && Math.abs(dc) === 1;
  if (type === "N") return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
  if (type === "K") return Math.max(Math.abs(dr), Math.abs(dc)) === 1;
  if (type === "B") return Math.abs(dr) === Math.abs(dc) && clearPath(board, fr, fc, tr, tc);
  if (type === "R") return (dr === 0 || dc === 0) && clearPath(board, fr, fc, tr, tc);
  if (type === "Q") return (Math.abs(dr) === Math.abs(dc) || dr === 0 || dc === 0) && clearPath(board, fr, fc, tr, tc);
  return false;
}

function clearPath(board, fr, fc, tr, tc) {
  const stepR = Math.sign(tr - fr);
  const stepC = Math.sign(tc - fc);
  let r = fr + stepR;
  let c = fc + stepC;
  while (r !== tr || c !== tc) {
    if (board[r][c]) return false;
    r += stepR;
    c += stepC;
  }
  return true;
}

function legalMovesFor(game, r, c) {
  const piece = game.board[r][c];
  if (!piece) return [];
  return pseudoMoves(game, r, c).filter((move) => !isInCheck(applyMoveTo(game.board, move), piece[0]));
}

function pseudoMoves(game, r, c) {
  const board = game.board;
  const piece = board[r][c];
  if (!piece) return [];
  const color = piece[0];
  const type = piece[1];
  const moves = [];
  const push = (tr, tc, extra = {}) => {
    if (tr < 0 || tr > 7 || tc < 0 || tc > 7) return false;
    if (!board[tr][tc]) {
      moves.push({ fr: r, fc: c, tr, tc, ...extra });
      return true;
    }
    if (board[tr][tc][0] !== color) moves.push({ fr: r, fc: c, tr, tc, ...extra });
    return false;
  };
  const ray = (dr, dc) => {
    for (let i = 1; i < 8; i += 1) {
      if (!push(r + dr * i, c + dc * i)) break;
    }
  };
  if (type === "P") {
    const dir = color === "w" ? -1 : 1;
    const start = color === "w" ? 6 : 1;
    const promotionRow = color === "w" ? 0 : 7;
    if (!board[r + dir]?.[c]) {
      push(r + dir, c, r + dir === promotionRow ? { promotion: true } : {});
      if (r === start && !board[r + dir * 2]?.[c]) push(r + dir * 2, c);
    }
    [c - 1, c + 1].forEach((tc) => {
      if (board[r + dir]?.[tc] && board[r + dir][tc][0] !== color) {
        push(r + dir, tc, r + dir === promotionRow ? { promotion: true } : {});
      }
      if (game.enPassant && game.enPassant.r === r + dir && game.enPassant.c === tc) {
        moves.push({ fr: r, fc: c, tr: r + dir, tc, enPassantCapture: true });
      }
    });
  }
  if (type === "N") [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]].forEach(([dr, dc]) => push(r + dr, c + dc));
  if (type === "B" || type === "Q") [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => ray(dr, dc));
  if (type === "R" || type === "Q") [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => ray(dr, dc));
  if (type === "K") {
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr || dc) push(r + dr, c + dc);
      }
    }
    const homeRow = color === "w" ? 7 : 0;
    if (r === homeRow && c === 4 && !isInCheck(board, color)) {
      if (game.castling[`${color}K`] && !board[homeRow][5] && !board[homeRow][6] &&
        !isSquareAttacked(board, homeRow, 5, opposite(color)) && !isSquareAttacked(board, homeRow, 6, opposite(color))) {
        moves.push({ fr: r, fc: c, tr: homeRow, tc: 6, castle: "K" });
      }
      if (game.castling[`${color}Q`] && !board[homeRow][3] && !board[homeRow][2] && !board[homeRow][1] &&
        !isSquareAttacked(board, homeRow, 3, opposite(color)) && !isSquareAttacked(board, homeRow, 2, opposite(color))) {
        moves.push({ fr: r, fc: c, tr: homeRow, tc: 2, castle: "Q" });
      }
    }
  }
  return moves;
}

function allLegalMoves(game, color) {
  const moves = [];
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      if (game.board[r][c]?.[0] === color) moves.push(...legalMovesFor(game, r, c));
    }
  }
  return moves;
}

function aiMove() {
  if (chessState.over || chessState.pendingPromotion || chessState.turn === chessState.playerColor) return;
  const moves = allLegalMoves(chessState, chessState.turn);
  if (!moves.length) return updateChessStatus();
  const move = chooseAiMove(moves);
  commitChessMove({ ...move, promotion: move.promotion ? "Q" : move.promotion });
  drawChess();
}

function chooseAiMove(moves) {
  const style = chessStyles[chessState.style] || chessStyles.balanced;
  const ordered = moves.sort((a, b) => scoreMove(b) - scoreMove(a));
  if (chessState.level === 1) return pickFromTop(ordered, 6, style.random);
  if (chessState.level === 2) return pickFromTop(ordered, 4, style.random * 0.75);
  const depth = Math.max(1, { 3: 2, 4: 3, 5: 4 }[chessState.level] + style.depthBonus);
  let best = moves[0];
  let bestScore = -Infinity;
  for (const move of ordered) {
    const score = -searchAfterMove(chessState, move, depth - 1, -Infinity, Infinity, opposite(chessState.turn));
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}

function pickFromTop(ordered, width, noise) {
  const pool = ordered.slice(0, Math.min(width, ordered.length));
  pool.sort((a, b) => scoreMove(b) + Math.random() * noise - (scoreMove(a) + Math.random() * noise));
  return pool[0] || ordered[0];
}

function searchAfterMove(game, move, depth, alpha, beta, colorToMove) {
  const next = {
    ...game,
    board: applyMoveTo(game.board, { ...move, promotion: move.promotion === true ? "Q" : move.promotion }),
    turn: colorToMove,
    enPassant: null,
    castling: { ...game.castling },
  };
  if (depth <= 0) return evaluateBoard(next.board, chessState.turn);
  const moves = allLegalMoves(next, colorToMove);
  if (!moves.length) return isInCheck(next.board, colorToMove) ? -999999 : 0;
  let best = -Infinity;
  const ordered = moves.sort((a, b) => scoreMoveForBoard(next.board, b) - scoreMoveForBoard(next.board, a));
  for (const child of ordered) {
    const score = -searchAfterMove(next, child, depth - 1, -beta, -alpha, opposite(colorToMove));
    best = Math.max(best, score);
    alpha = Math.max(alpha, score);
    if (alpha >= beta) break;
  }
  return best;
}

function scoreMove(move) {
  return scoreMoveForBoard(chessState.board, move);
}

function scoreMoveForBoard(board, move) {
  const style = chessStyles[chessState.style] || chessStyles.balanced;
  const target = board[move.tr][move.tc] || (move.enPassantCapture ? board[move.fr][move.tc] : null);
  const promotion = move.promotion ? 500 : 0;
  const moving = board[move.fr][move.fc];
  const forward = moving?.[0] === "b" ? move.tr - move.fr : move.fr - move.tr;
  const center = 14 - (Math.abs(3.5 - move.tr) + Math.abs(3.5 - move.tc)) * 4;
  const captureScore = target ? pieceValue[target[1]] * 10 - pieceValue[moving[1]] : 0;
  const attackScore = (forward * 10 + center) * style.attack;
  const materialScore = captureScore * style.material;
  return materialScore + promotion + attackScore + Math.random() * (chessState.level >= 5 ? style.random * 0.02 : style.random);
}

function evaluateBoard(board, perspective) {
  const style = chessStyles[chessState.style] || chessStyles.balanced;
  let score = 0;
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const piece = board[r][c];
      if (!piece) continue;
      const color = piece[0];
      const type = piece[1];
      const center = 14 - (Math.abs(3.5 - r) + Math.abs(3.5 - c)) * 4;
      const pawnAdvance = type === "P" ? (color === "w" ? 6 - r : r - 1) * 8 : 0;
      const kingPenalty = type === "K" ? -Math.max(0, 24 - (Math.abs(3.5 - r) + Math.abs(3.5 - c)) * 6) : 0;
      const value = pieceValue[type] * style.material + (type !== "K" ? center * style.attack : kingPenalty * style.defense) + pawnAdvance;
      score += color === perspective ? value : -value;
    }
  }
  return score;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function setupAmbient() {
  const canvas = $("#ambientCanvas");
  const ctx = canvas.getContext("2d");
  const particles = [];
  function resize() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  function seed() {
    particles.length = 0;
    const count = Math.min(70, Math.floor(window.innerWidth / 18));
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: 1 + Math.random() * 3,
        speed: 0.15 + Math.random() * 0.55,
        hue: Math.random() > 0.55 ? "255, 92, 141" : "246, 199, 102",
      });
    }
  }
  function frame() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles.forEach((p) => {
      p.y -= p.speed;
      p.x += Math.sin((p.y + p.size) * 0.01) * 0.18;
      if (p.y < -10) {
        p.y = window.innerHeight + 10;
        p.x = Math.random() * window.innerWidth;
      }
      ctx.fillStyle = `rgba(${p.hue}, 0.52)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(frame);
  }
  resize();
  seed();
  frame();
  window.addEventListener("resize", () => {
    resize();
    seed();
  });
}

init();
