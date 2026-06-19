const App = (() => {

  // ── Wachstumsstufen ───────────────────────────────────────────────────────────
  const STAGES = [
    { name:'Setzling',       emoji:'🌱', min:0,  seedling:true,  trunk:false, branches:false, canopy:false, blossoms:false, fruits:false, msg:'Ein kleiner Setzling! Gieße ihn regelmäßig. 🌱' },
    { name:'Jungtrieb',      emoji:'🪴', min:3,  seedling:false, trunk:true,  branches:false, canopy:false, blossoms:false, fruits:false, msg:'Ein kleiner Stamm bildet sich! 🪴' },
    { name:'Jungbaum',       emoji:'🌿', min:7,  seedling:false, trunk:true,  branches:true,  canopy:false, blossoms:false, fruits:false, msg:'Erste Äste wachsen! 🌿' },
    { name:'Junger Baum',    emoji:'🌳', min:14, seedling:false, trunk:true,  branches:true,  canopy:true,  blossoms:false, fruits:false, msg:'Ein grünes Blätterdach! 🌳' },
    { name:'Blühender Baum', emoji:'🌸', min:21, seedling:false, trunk:true,  branches:true,  canopy:true,  blossoms:true,  fruits:false, msg:'Wunderschöne Blüten! 🌸' },
    { name:'Fruchtbaum',     emoji:'🍎', min:35, seedling:false, trunk:true,  branches:true,  canopy:true,  blossoms:true,  fruits:true,  msg:'Dein Baum trägt Früchte! 🍎' },
    { name:'Alter Baum',     emoji:'🌲', min:60, seedling:false, trunk:true,  branches:true,  canopy:true,  blossoms:true,  fruits:true,  msg:'Ein majestätischer alter Baum! 🌲' },
  ];

  // ── Zustand ───────────────────────────────────────────────────────────────────
  // wateringInterval: Sekunden zwischen Gießungen (default 86400 = 24h)
  let wateringInterval = 86400;

  let state = {
    alive:          true,
    lastWatered:    null,  // ms timestamp oder null
    totalWaterings: 0,
    stageIndex:     0,
  };

  // ── Storage ───────────────────────────────────────────────────────────────────
  const KEY = 'mein_baum_v5';

  function save() {
    localStorage.setItem(KEY, JSON.stringify({ state, wateringInterval }));
  }

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (!d) return;
      if (d.state)            Object.assign(state, d.state);
      if (d.wateringInterval) wateringInterval = Number(d.wateringInterval);
    } catch(e) { /* korrupter Stand → ignorieren */ }
  }

  // ── DOM ───────────────────────────────────────────────────────────────────────
  let el = {};

  function initEl() {
    el = {
      skyGradient:     document.getElementById('skyGradient'),
      celestial:       document.getElementById('celestialBody'),
      stars:           document.getElementById('stars'),
      clouds:          document.getElementById('clouds'),
      timeDisplay:     document.getElementById('timeDisplay'),
      dayCounter:      document.getElementById('dayCounter'),
      waterFill:       document.getElementById('waterFill'),
      healthFill:      document.getElementById('healthFill'),
      stageEmoji:      document.getElementById('stageEmoji'),
      stageName:       document.getElementById('stageName'),
      messageText:     document.getElementById('messageText'),
      waterBtn:        document.getElementById('waterBtn'),
      waterBtnSub:     document.getElementById('waterBtnSub'),
      nextWaterInfo:   document.getElementById('nextWaterInfo'),
      deathOverlay:    document.getElementById('deathOverlay'),
      wateringOverlay: document.getElementById('wateringOverlay'),
      waterDrops:      document.getElementById('waterDrops'),
      seedlingGroup:   document.getElementById('seedlingGroup'),
      trunkGroup:      document.getElementById('trunkGroup'),
      branchGroup:     document.getElementById('branchGroup'),
      canopyGroup:     document.getElementById('canopyGroup'),
      blossomGroup:    document.getElementById('blossomGroup'),
      fruitGroup:      document.getElementById('fruitGroup'),
      deadGroup:       document.getElementById('deadGroup'),
      potGroup:        document.getElementById('potGroup'),
      fallenPetals:    document.getElementById('fallenPetals'),
      intervalSlider:  document.getElementById('intervalSlider'),
      intervalDisplay: document.getElementById('intervalDisplay'),
    };
  }

  // ── Zeithelfer ────────────────────────────────────────────────────────────────
  function intervalMs() { return wateringInterval * 1000; }
  function deathMs()    { return intervalMs() * 3; }
  function now()        { return Date.now(); }

  function formatDuration(ms) {
    if (ms <= 0) return '0s';
    const totalSec = Math.ceil(ms / 1000);
    const s = totalSec % 60;
    const m = Math.floor(totalSec / 60) % 60;
    const h = Math.floor(totalSec / 3600) % 24;
    const d = Math.floor(totalSec / 86400);
    if (d > 0)  return `${d}T ${h}h ${m}m`;
    if (h > 0)  return `${h}h ${m}m ${s}s`;
    if (m > 0)  return `${m}m ${s}s`;
    return `${s}s`;
  }

  function formatInterval(sec) {
    sec = Number(sec);
    if (sec < 60)    return `${sec} Sek.`;
    if (sec < 3600)  return `${Math.round(sec/60)} Min.`;
    if (sec < 86400) return `${+(sec/3600).toFixed(1)} Std.`;
    return '24 Std.';
  }

  // ── Spiellogik ────────────────────────────────────────────────────────────────
  function canWater() {
    if (!state.alive) return false;
    if (state.lastWatered === null) return true;
    return (now() - state.lastWatered) >= intervalMs();
  }

  function isDead() {
    if (state.lastWatered === null) return false;
    return (now() - state.lastWatered) >= deathMs();
  }

  function waterLevel() {
    if (state.lastWatered === null) return 1; // noch nie gegossen → voll (Setzling ist frisch)
    return Math.max(0, Math.min(1, 1 - (now() - state.lastWatered) / deathMs()));
  }

  function healthLevel() {
    const w = waterLevel();
    if (w > 0.66) return 1;
    if (w > 0.33) return 0.4 + (w - 0.33) / 0.33 * 0.6;
    return (w / 0.33) * 0.4;
  }

  function currentStage() {
    let s = STAGES[0];
    for (const st of STAGES) {
      if (state.totalWaterings >= st.min) s = st;
    }
    return s;
  }

  // ── Baum-Visuals ──────────────────────────────────────────────────────────────
  function setOp(elem, val, dur) {
    elem.style.transition = `opacity ${dur} ease`;
    elem.style.opacity    = String(val);
  }

  function applyStage(stage, anim) {
    const d = anim ? '1.5s' : '0s';
    setOp(el.seedlingGroup, stage.seedling  ? 1 : 0, d);
    setOp(el.trunkGroup,    stage.trunk     ? 1 : 0, d);
    setOp(el.branchGroup,   stage.branches  ? 1 : 0, d);
    setOp(el.canopyGroup,   stage.canopy    ? 1 : 0, d);
    setOp(el.blossomGroup,  stage.blossoms  ? 1 : 0, d);
    setOp(el.fruitGroup,    stage.fruits    ? 1 : 0, d);
    setOp(el.potGroup,      stage.seedling  ? 1 : 0, d);
    setOp(el.deadGroup,     0, d);
    el.stageEmoji.textContent = stage.emoji;
    el.stageName.textContent  = stage.name;
    el.fallenPetals.style.display = stage.blossoms ? 'block' : 'none';
  }

  function applyDead() {
    const d = '2s';
    [el.seedlingGroup, el.canopyGroup, el.blossomGroup,
     el.fruitGroup, el.trunkGroup, el.branchGroup].forEach(e => setOp(e, 0, d));
    setOp(el.potGroup, 1, d);
    setTimeout(() => {
      setOp(el.deadGroup, 1, d);
      el.deathOverlay.classList.add('visible');
    }, 1500);
    el.stageEmoji.textContent = '💀';
    el.stageName.textContent  = 'Gestorben';
    el.fallenPetals.style.display = 'none';
  }

  function createPetals() {
    el.fallenPetals.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const p = document.createElement('div');
      p.className = 'fallen-petal';
      p.style.cssText = `left:${15+Math.random()*70}%;
        animation-delay:${-Math.random()*8}s;
        animation-duration:${7+Math.random()*5}s;
        transform:rotate(${Math.random()*360}deg);`;
      el.fallenPetals.appendChild(p);
    }
  }

  // ── UI aktualisieren ──────────────────────────────────────────────────────────
  let msgTimer = null;

  function showMsg(text, autoClearMs) {
    el.messageText.style.opacity = '0';
    setTimeout(() => {
      el.messageText.textContent = text;
      el.messageText.style.opacity = '1';
    }, 200);
    clearTimeout(msgTimer);
    if (autoClearMs) msgTimer = setTimeout(updateUI, autoClearMs);
  }

  function updateUI() {
    // Tod prüfen
    if (isDead() && state.alive) {
      state.alive = false;
      save();
      applyDead();
      return;
    }
    if (!state.alive) return;

    // Balken
    el.waterFill.style.width  = `${Math.round(waterLevel()  * 100)}%`;
    el.healthFill.style.width = `${Math.round(healthLevel() * 100)}%`;
    document.body.classList.toggle('low-health',      healthLevel() < 0.4);
    document.body.classList.toggle('critical-health', healthLevel() < 0.15);

    // Zähler
    el.dayCounter.textContent = `Gießung ${state.totalWaterings}`;

    // Wachstumsstufe
    const stage = currentStage();
    const si    = STAGES.indexOf(stage);
    if (si !== state.stageIndex) {
      state.stageIndex = si;
      applyStage(stage, true);
      showMsg(stage.msg, 5000);
      save();
    }

    // Gieß-Button — CSS-Klasse statt disabled (disabled blockiert onclick)
    if (canWater()) {
      el.waterBtn.classList.remove('btn-cooling');
      el.waterBtnSub.textContent   = 'Jetzt gießen!';
      el.nextWaterInfo.textContent = '';
    } else {
      const rem = intervalMs() - (now() - state.lastWatered);
      el.waterBtn.classList.add('btn-cooling');
      el.waterBtnSub.textContent   = formatDuration(rem);
      el.nextWaterInfo.textContent = `Nächste Gießung in ${formatDuration(rem)}`;
    }

    // Durst-Nachrichten (nur wenn kein stage-Wechsel gerade)
    if (waterLevel() < 0.15) {
      showMsg('⚠️ Dein Baum verdurstet fast! Gieße ihn sofort!');
    } else if (waterLevel() < 0.35) {
      showMsg('Dein Baum hat Durst… 💧 Zeit zum Gießen!');
    }
  }

  // ── Gießen ────────────────────────────────────────────────────────────────────
  function water() {
    if (!canWater()) return;

    // Klasse statt disabled, damit der Click-Handler immer feuert
    el.waterBtn.classList.add('btn-cooling');
    el.wateringOverlay.classList.add('visible');
    el.waterDrops.style.opacity = '1';

    setTimeout(() => {
      el.wateringOverlay.classList.remove('visible');
      el.waterDrops.style.opacity = '0';

      state.lastWatered = now();
      state.totalWaterings++;
      save();
      updateUI();
      showMsg('Gegossen! Dein Baum dankt dir! 💧✨', 4000);
    }, 900);
  }

  // ── Neustart ─────────────────────────────────────────────────────────────────
  function restart() {
    state = { alive:true, lastWatered:now(), totalWaterings:1, stageIndex:0 };
    save();
    el.deathOverlay.classList.remove('visible');
    applyStage(STAGES[0], true);
    updateUI();
    showMsg('Neues Leben beginnt! 🌱');
  }

  // ── Intervall-Regler ──────────────────────────────────────────────────────────
  // Slider: 0–100  →  log-skaliert  →  1s–86400s
  function sliderToSec(v) {
    const t = Number(v) / 100;
    return Math.round(Math.exp(t * Math.log(86400)));  // 1s … 86400s
  }

  function secToSlider(s) {
    return Math.round((Math.log(Math.max(1, s)) / Math.log(86400)) * 100);
  }

  function setWaterInterval(sliderVal) {
    wateringInterval = sliderToSec(sliderVal);
    el.intervalDisplay.textContent = formatInterval(wateringInterval);
    save();
    updateUI();
  }

  function syncSlider() {
    if (!el.intervalSlider) return;
    el.intervalSlider.value        = secToSlider(wateringInterval);
    el.intervalDisplay.textContent = formatInterval(wateringInterval);
  }

  function debugReset() {
    if (!confirm('Spielstand löschen und neu starten?')) return;
    localStorage.removeItem(KEY);
    wateringInterval = 86400;
    state = { alive:true, lastWatered:null, totalWaterings:0, stageIndex:0 };
    syncSlider();
    el.deathOverlay.classList.remove('visible');
    applyStage(STAGES[0], false);
    updateUI();
    showMsg('Willkommen! Gieße deinen Setzling! 🌱');
  }

  // ── Himmel ────────────────────────────────────────────────────────────────────
  function updateSky() {
    const d  = new Date();
    const h  = d.getHours();
    const m  = d.getMinutes();
    const s  = d.getSeconds();
    const pad = n => String(n).padStart(2, '0');
    el.timeDisplay.textContent = `${pad(h)}:${pad(m)}`;

    const t = (h * 3600 + m * 60 + s) / 86400;
    const c = skyColors(h, m);
    el.skyGradient.style.background =
      `linear-gradient(to bottom,${c.top} 0%,${c.mid} 50%,${c.bottom} 100%)`;

    if (h < 6 || h >= 20) {
      // Mond
      const mt = h >= 20 ? (h - 20) / 10 : (h + 4) / 10;
      const mx = 5 + mt * 90;
      const my = 20 + 30 * Math.sin(mt * Math.PI);
      el.celestial.style.cssText =
        `position:absolute;left:${mx}vw;top:${my}%;width:44px;height:44px;
         background:#e8e4d0;border-radius:50%;
         box-shadow:0 0 20px rgba(232,228,208,.6),0 0 60px rgba(232,228,208,.2);`;
      el.stars.style.opacity  = '1';
      el.clouds.style.opacity = '0.3';
    } else {
      // Sonne
      const p  = (t - 0.25) / 0.583;
      const sx = 5 + p * 90;
      const sy = 75 - 60 * Math.sin(p * Math.PI);
      const isDawn = h >= 6 && h < 9, isDusk = h >= 17 && h < 20;
      const sc   = isDawn || isDusk ? '#ff7043' : '#ffe066';
      const glow = isDawn || isDusk ? 'rgba(255,112,67,.5)' : 'rgba(255,224,102,.4)';
      el.celestial.style.cssText =
        `position:absolute;left:${sx}vw;top:${sy}%;width:56px;height:56px;
         background:${sc};border-radius:50%;
         box-shadow:0 0 20px ${glow},0 0 60px ${isDawn||isDusk?'rgba(255,152,0,.3)':'rgba(255,224,102,.2)'};
         transition:left 10s linear,top 10s linear,background 3s ease;`;
      el.stars.style.opacity  = String(h < 8 || h >= 18 ? 0.3 : 0);
      el.clouds.style.opacity = '0.85';
    }
  }

  function skyColors(h, m) {
    const f = m / 60;
    const lerp = (a, b, t) => {
      t = Math.max(0, Math.min(1, t));
      const lc = (c1, c2) => {
        const hex = v => Math.round(v).toString(16).padStart(2,'0');
        const r1=parseInt(c1.slice(1,3),16), g1=parseInt(c1.slice(3,5),16), b1=parseInt(c1.slice(5,7),16);
        const r2=parseInt(c2.slice(1,3),16), g2=parseInt(c2.slice(3,5),16), b2=parseInt(c2.slice(5,7),16);
        return '#'+hex(r1+(r2-r1)*t)+hex(g1+(g2-g1)*t)+hex(b1+(b2-b1)*t);
      };
      return { top:lc(a.top,b.top), mid:lc(a.mid,b.mid), bottom:lc(a.bottom,b.bottom) };
    };
    const N={top:'#050812',mid:'#0a0e2a',bottom:'#111840'};
    const D={top:'#1c6ea4',mid:'#3498db',bottom:'#87ceeb'};
    if (h< 5) return N;
    if (h< 6) return lerp(N,{top:'#1a0a2e',mid:'#3b1f5e',bottom:'#7b3f6e'},f);
    if (h< 7) return lerp({top:'#1a0a2e',mid:'#3b1f5e',bottom:'#7b3f6e'},{top:'#2d1b69',mid:'#c0392b',bottom:'#ff7043'},f);
    if (h< 8) return lerp({top:'#2d1b69',mid:'#c0392b',bottom:'#ff7043'},{top:'#1a6bbd',mid:'#5aace0',bottom:'#fdd775'},f);
    if (h<11) return lerp({top:'#1a6bbd',mid:'#5aace0',bottom:'#fdd775'},D, Math.min(f+(h-8)/3,1));
    if (h<16) return D;
    if (h<17) return lerp(D,{top:'#1a3a6b',mid:'#2980b9',bottom:'#f39c12'},f);
    if (h<19) return lerp({top:'#1a3a6b',mid:'#2980b9',bottom:'#f39c12'},{top:'#0d1b3e',mid:'#8e44ad',bottom:'#e74c3c'},f+(h-17)/2);
    if (h<20) return lerp({top:'#0d1b3e',mid:'#8e44ad',bottom:'#e74c3c'},N,f);
    return N;
  }

  function generateStars() {
    el.stars.innerHTML = '';
    for (let i = 0; i < 80; i++) {
      const s  = document.createElement('div');
      const sz = Math.random() * 2.5 + 0.5;
      s.className = 'star';
      s.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*65}%;
        --twinkle-dur:${2+Math.random()*4}s;--twinkle-delay:${-Math.random()*5}s;`;
      el.stars.appendChild(s);
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    initEl();
    load();
    generateStars();
    createPetals();
    syncSlider();

    // Visuellen Ausgangszustand setzen
    const stage = currentStage();
    state.stageIndex = STAGES.indexOf(stage);
    applyStage(stage, false);

    if (isDead() && state.alive) {
      state.alive = false;
      save();
      applyDead();
    } else {
      updateUI();
      showMsg(state.totalWaterings === 0
        ? 'Willkommen! Gieße deinen Setzling! 🌱'
        : stage.msg);
    }

    // Click-Listener per JS (onclick auf disabled-Button feuert nicht)
    el.waterBtn.addEventListener('click', water);

    setInterval(updateSky, 1000);
    setInterval(updateUI,  1000);
    updateSky();
  }

  return { init, water, restart, setWaterInterval, debugReset };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
