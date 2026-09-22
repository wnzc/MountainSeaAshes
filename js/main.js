/* UI 驱动：顶部 HUD / 底部灵兽卡 / 塔位菜单 / 结算 */
import { SPIRITS, SPIRIT_ORDER, ELEMENTS, WAVES, CHAIN_NAMES } from './data.js';
import { bus } from './eventBus.js';
import { Game, audio } from './engine.js';

const $ = (sel) => document.querySelector(sel);

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

export function initUI(game) {
  const hudWave = $('#hud-wave');
  const hudHp = $('#hud-hp');
  const hudGold = $('#hud-gold');
  const cardBar = $('#card-bar');
  const slotPanel = $('#slot-panel');
  const chainBanner = $('#chain-banner');
  const pausePanel = $('#pause-panel');
  const resultPanel = $('#result-panel');
  const resultTitle = $('#result-title');
  const resultStats = $('#result-stats');
  const bossBar = $('#boss-bar');
  const bossFill = $('#boss-fill');
  const toast = $('#toast');

  // ── 灵兽卡 ──
  const cardEls = new Map();
  for (const id of SPIRIT_ORDER) {
    const cfg = SPIRITS[id];
    const elc = el('button', 'spirit-card');
    elc.dataset.id = id;
    elc.innerHTML = `
      <span class="card-icon">${ELEMENTS[cfg.element].icon}</span>
      <span class="card-name">${cfg.name}</span>
      <span class="card-cost">${cfg.cost}</span>
    `;
    elc.addEventListener('click', () => {
      audio.unlock();
      game.selectCard(id);
    });
    cardBar.appendChild(elc);
    cardEls.set(id, elc);
  }

  function refreshCards() {
    for (const [id, elc] of cardEls) {
      const cfg = SPIRITS[id];
      const afford = game.gold >= cfg.cost;
      elc.classList.toggle('disabled', !afford);
      elc.classList.toggle('selected', game.selectedCard === id);
    }
  }

  // ── 顶部按钮 ──
  $('#btn-pause').addEventListener('click', () => {
    game.paused = true;
    pausePanel.classList.remove('hidden');
  });
  $('#btn-resume').addEventListener('click', () => {
    game.paused = false;
    pausePanel.classList.add('hidden');
  });
  $('#btn-restart-pause').addEventListener('click', () => {
    pausePanel.classList.add('hidden');
    game.start();
    toastMsg('重新开始');
  });
  $('#btn-speed').addEventListener('click', () => {
    game.speed = game.speed === 1 ? 2 : 1;
    $('#btn-speed').textContent = game.speed === 1 ? '×1' : '×2';
  });
  $('#btn-sound').addEventListener('click', () => {
    audio.enabled = !audio.enabled;
    $('#btn-sound').textContent = audio.enabled ? '♪' : '×';
  });

  // ── 塔位菜单 ──
  function showSlotPanel(slotId) {
    slotPanel.classList.add('hidden');
    if (!slotId) return;
    const slot = game.slots.get(slotId);
    if (!slot) return;

    if (!slot.spirit) {
      if (game.selectedCard) return; // 直接放置
      slotPanel.innerHTML = `<div class="panel-title">空塔位 ${slot.id}</div><div class="panel-hint">先点下方灵兽卡，再点此塔位放置</div>`;
      slotPanel.classList.remove('hidden');
      return;
    }

    const s = slot.spirit;
    const elInfo = ELEMENTS[s.element];
    const upCost = game.getUpgradeCost(s);
    const canUp = upCost != null && game.gold >= upCost;
    slotPanel.innerHTML = `
      <div class="panel-title" style="color:${elInfo.color}">${elInfo.icon} ${s.name} <small>Lv.${s.level}</small></div>
      <div class="panel-meta">${s.config.desc}</div>
      <div class="panel-meta">伤害 ${s.damage} · 范围 ${Math.round(s.range)} · 共鸣 ×${s.resonanceBonus.toFixed(2)}</div>
      <div class="panel-actions">
        <button id="btn-upgrade" ${canUp ? '' : 'disabled'}>${upCost == null ? '已满级' : `升级 ${upCost}`}</button>
        <button id="btn-sell">撤回 +${Math.floor(s.config.cost * 0.5)}</button>
      </div>
    `;
    slotPanel.classList.remove('hidden');
    $('#btn-upgrade')?.addEventListener('click', () => {
      game.upgradeSpirit(slotId);
      showSlotPanel(slotId);
      refreshCards();
    });
    $('#btn-sell')?.addEventListener('click', () => {
      game.sellSpirit(slotId);
      slotPanel.classList.add('hidden');
      game.selectedSlot = null;
      refreshCards();
    });
  }

  // ── 事件 ──
  bus.on('gold_changed', (g) => {
    hudGold.textContent = g;
    refreshCards();
  });

  bus.on('base_damaged', () => {
    hudHp.textContent = game.baseHp;
  });

  bus.on('wave_started', (idx) => {
    const n = Math.max(idx, 1);
    hudWave.textContent = `${Math.min(n, WAVES.length)}/${WAVES.length}`;
  });

  bus.on('wave_completed', () => {
    refreshCards();
  });

  bus.on('slot_selected', (id) => showSlotPanel(id));
  bus.on('card_selected', () => {
    refreshCards();
    slotPanel.classList.add('hidden');
  });

  bus.on('chain_reached', (level) => {
    if (level < 2) return;
    const name = CHAIN_NAMES[level] || `×${level} 连锁`;
    chainBanner.textContent = `×${level} ${name}`;
    chainBanner.className = level >= 4 ? 'chain-banner big ultimate' : level === 3 ? 'chain-banner big' : 'chain-banner';
    chainBanner.classList.remove('hidden');
    clearTimeout(chainBanner._t);
    chainBanner._t = setTimeout(() => chainBanner.classList.add('hidden'), level >= 4 ? 1800 : 1200);
  });

  bus.on('battle_finished', (victory) => {
    resultPanel.classList.remove('hidden');
    resultTitle.textContent = victory ? '山河复色' : '灵种熄灭';
    resultTitle.className = victory ? 'win' : 'lose';
    resultStats.textContent = `击杀 ${game.totalKills} · 剩余生命 ${game.baseHp} · 金币 ${game.gold}`;
  });

  $('#btn-retry').addEventListener('click', () => {
    resultPanel.classList.add('hidden');
    game.start();
  });
  $('#btn-home').addEventListener('click', () => {
    resultPanel.classList.add('hidden');
    $('#start-panel').classList.remove('hidden');
  });

  // ── 开始 ──
  $('#btn-start').addEventListener('click', () => {
    audio.unlock();
    $('#start-panel').classList.add('hidden');
    game.start();
    hudWave.textContent = `1/${WAVES.length}`;
    hudHp.textContent = game.baseHp;
    hudGold.textContent = game.gold;
    refreshCards();
    toastMsg('放置灵兽，守住灵种！');
  });

  function toastMsg(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.add('hidden'), 2200);
  }

  // Boss 血条
  function updateBossBar() {
    const boss = game.enemies.find((e) => e.isBoss && e.alive);
    if (boss) {
      bossBar.classList.remove('hidden');
      bossFill.style.width = `${(boss.hp / boss.maxHp) * 100}%`;
    } else {
      bossBar.classList.add('hidden');
    }
    requestAnimationFrame(updateBossBar);
  }
  updateBossBar();

  refreshCards();
}

export function bindInput(game, canvas) {
  // 按钮点击反馈
  for (const btn of document.querySelectorAll('button')) {
    btn.addEventListener('pointerdown', () => btn.classList.add('is-press'));
    btn.addEventListener('pointerup', () => btn.classList.remove('is-press'));
    btn.addEventListener('pointerleave', () => btn.classList.remove('is-press'));
  }

  const toLogical = (evt) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  canvas.addEventListener('pointerdown', (evt) => {
    const p = toLogical(evt);
    game.handlePointer(p.x, p.y);
  });
}
