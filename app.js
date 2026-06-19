const App = (() => {

  const STAGES = [
    { id:'seedling', name:'Setzling',      emoji:'🌱', minWaterings:0,
      seedling:true,  trunk:false, branches:false, canopy:false, blossoms:false, fruits:false,
      msg:'Ein kleiner Setzling! Gieße ihn regelmäßig. 🌱' },
    { id:'sprout',   name:'Jungtrieb',     emoji:'🪴', minWaterings:3,
      seedling:false, trunk:true,  branches:false, canopy:false, blossoms:false, fruits:false,
      msg:'Ein kleiner Stamm bildet sich! 🪴' },
    { id:'sapling',  name:'Jungbaum',      emoji:'🌿', minWaterings:7,
      seedling:false, trunk:true,  branches:true,  canopy:false, blossoms:false, fruits:false,
      msg:'Dein Baum bekommt erste Äste! 🌿' },
    { id:'young',    name:'Junger Baum',   emoji:'🌳', minWaterings:14,
      seedling:false, trunk:true,  branches:true,  canopy:true,  blossoms:false, fruits:false,
      msg:'Grünes Blätterdach entfaltet sich! 🌳' },
    { id:'flower',   name:'Blühender Baum',emoji:'🌸', minWaterings:21,
      seedling:false, trunk:true,  branches:true,  canopy:true,  blossoms:true,  fruits:false,
      msg:'Wunderschöne Blüten! 🌸 Dein Baum blüht!' },
    { id:'fruit',    name:'Fruchtbaum',    emoji:'🍎', minWaterings:35,
      seedling:false, trunk:true,  branches:true,  canopy:true,  blossoms:true,  fruits:true,
      msg:'Dein Baum trägt Früchte! 🍎 Beeindruckend!' },
    { id:'ancient',  name:'Alter Baum',    emoji:'🌲', minWaterings:60,
      seedling:false, trunk:true,  branches:true,  canopy:true,  blossoms:true,  fruits:true,
      msg:'Ein majestätischer alter Baum! 🌲' },
  ];

  // wateringInterval in Sekunden (default 86400 = 24h)
  // Der Baum stirbt nach 3 verpassten Intervallen
  let wateringInterval = 86400;

  let state = {
    alive: true,
    lastWatered: null,       // timestamp ms
    totalWaterings: 0,
    stageIndex: 0,
  };

  const STORAGE_KEY = 'mein_baum_v4';

  // ── Storage ──────────────────────────────────────────────────────────────────
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, wateringInterval }));
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!d) return;
      if (d.state)            state            = { ...state, ...d.state };
      if (d.wateringInterval) wateringInterval = d.wateringInterval;
    } catch(e) {}
  }

  // ── DOM helpers ──────────────────────────────────────────────────────────────
  // Lazy-loaded after DOMContentLoaded so IDs are guaranteed to exist
  const $ = id => document.getElementById(id);
  let el = {};

  function initEl() {
    el = {
      skyGradient:     $('skyGradient'),
      celestial:       $('celestialBody'),
      stars:           $('stars'),
      clouds:          $('clouds'),
      timeDisplay:     $('timeDisplay'),
      dayCounter:      $('dayCounter'),
      waterFill:       $('waterFill'),
      healthFill:      $('healthFill'),
      stageEmoji:      $('stageEmoji'),
      stageName:       $('stageName'),
      messageText:     $('messageText'),
      waterBtn:        $('waterBtn'),
      waterBtnSub:     $('waterBtnSub'),
      nextWaterInfo:   $('nextWaterInfo'),
      deathOverlay:    $('deathOverlay'),
      wateringOverlay: $('wateringOverlay'),
      waterDrops:      $('waterDrops'),
      seedlingGroup:   $('seedlingGroup'),
      trunkGroup:      $('trunkGroup'),
      branchGroup:     $('branchGroup'),
      canopyGroup:     $('canopyGroup'),
      blossomGroup:    $('blossomGroup'),
      fruitGroup:      $('fruitGroup'),
      deadGroup:       $('deadGroup'),
      potGroup:        $('potGroup'),
      fallenPetals:    $('fallenPetals'),
      intervalSlider:  $('intervalSlider'),
      intervalDisplay: $('intervalDisplay'),
    };
  }

  // ── Timing helpers ───────────────────────────────────────────────────────────
  function intervalMs()  { return wateringInterval * 1000; }
  function deathMs()     { return intervalMs() * 3; }

  function formatDuration(ms) {
    if (ms <= 0) return '0s';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0)  return `${d}T ${h%24}h ${m%60}m`;
    if (h > 0)  return `${h}h ${m%60}m ${s%60}s`;
    if (m > 0)  return `${m}m ${s%60}s`;
    return `${s}s`;
  }

  function formatInterval(sec) {
    if (sec < 60)   return `${sec} Sekunde${sec===1?'':'n'}`;
    if (sec < 3600) return `${Math.round(sec/60)} Minute${Math.round(sec/60)===1?'':'n'}`;
    if (sec < 86400) return `${Math.round(sec/3600)} Stunde${Math.round(sec/3600)===1?'':'n'}`;
    return `24 Stunden`;
  }

  // ── Sky / clock ──────────────────────────────────────────────────────────────
  function tod() {
    const n = new Date();
    return (n.getHours()*3600 + n.getMinutes()*60 + n.getSeconds()) / 86400;
  }

  function updateSky() {
    const t = tod();
    const h = Math.floor(t*24), m = Math.floor((t*24-h)*60);
    el.timeDisplay.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;

    const c = skyColors(h, m);
    el.skyGradient.style.background = `linear-gradient(to bottom,${c.top} 0%,${c.mid} 50%,${c.bottom} 100%)`;

    const moonTime = h < 6 || h >= 20;
    if (moonTime) {
      const mt = h >= 20 ? (h-20)/10 : (h+4)/10;
      el.celestial.style.cssText = `left:${5+mt*90}vw;top:${20+30*Math.sin(mt*Math.PI)}%;
        width:44px;height:44px;background:#e8e4d0;border-radius:50%;
        box-shadow:0 0 20px rgba(232,228,208,.6),0 0 60px rgba(232,228,208,.2);`;
      el.stars.style.opacity = '1'; el.clouds.style.opacity = '0.3';
    } else {
      const p = (t - 0.25) / 0.583;
      const x = 5 + p*90, y = 75 - 60*Math.sin(p*Math.PI);
      const dawn = h>=6&&h<9, dusk = h>=17&&h<20;
      const sc = dawn||dusk ? '#ff7043' : '#ffe066';
      const glow = dawn||dusk ? 'rgba(255,112,67,.5)' : 'rgba(255,224,102,.4)';
      el.celestial.style.cssText = `left:${x}vw;top:${y}%;width:56px;height:56px;
        background:${sc};border-radius:50%;
        box-shadow:0 0 20px ${glow},0 0 60px ${dawn||dusk?'rgba(255,152,0,.3)':'rgba(255,224,102,.2)'};
        transition:left 10s linear,top 10s linear,background 3s ease;`;
      el.stars.style.opacity = String(h<8||h>=18 ? 0.3 : 0);
      el.clouds.style.opacity = '0.85';
    }
  }

  function skyColors(h, m) {
    const f = m/60;
    const lerp = (a,b,t) => {
      t = Math.max(0,Math.min(1,t));
      const lc = (h1,h2) => {
        const [r1,g1,b1]=[parseInt(h1.slice(1,3),16),parseInt(h1.slice(3,5),16),parseInt(h1.slice(5,7),16)];
        const [r2,g2,b2]=[parseInt(h2.slice(1,3),16),parseInt(h2.slice(3,5),16),parseInt(h2.slice(5,7),16)];
        return '#'+[r1+(r2-r1)*t,g1+(g2-g1)*t,b1+(b2-b1)*t].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
      };
      return {top:lc(a.top,b.top),mid:lc(a.mid,b.mid),bottom:lc(a.bottom,b.bottom)};
    };
    const night = {top:'#050812',mid:'#0a0e2a',bottom:'#111840'};
    const predawn= {top:'#1a0a2e',mid:'#3b1f5e',bottom:'#7b3f6e'};
    const dawn  = {top:'#2d1b69',mid:'#c0392b',bottom:'#ff7043'};
    const morn  = {top:'#1a6bbd',mid:'#5aace0',bottom:'#fdd775'};
    const day   = {top:'#1c6ea4',mid:'#3498db',bottom:'#87ceeb'};
    const dusk1 = {top:'#1a3a6b',mid:'#2980b9',bottom:'#f39c12'};
    const dusk2 = {top:'#0d1b3e',mid:'#8e44ad',bottom:'#e74c3c'};
    if (h<5)  return night;
    if (h<6)  return lerp(night,predawn,f);
    if (h<7)  return lerp(predawn,dawn,f);
    if (h<8)  return lerp(dawn,morn,f);
    if (h<11) return lerp(morn,day,Math.min(f+(h-8)/3,1));
    if (h<16) return day;
    if (h<17) return lerp(day,dusk1,f);
    if (h<19) return lerp(dusk1,dusk2,f+(h-17)/2);
    if (h<20) return lerp(dusk2,night,f);
    return night;
  }

  function generateStars() {
    el.stars.innerHTML = '';
    for (let i=0;i<80;i++) {
      const s = document.createElement('div');
      s.className = 'star';
      const sz = Math.random()*2.5+0.5;
      s.style.cssText=`width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*65}%;
        --twinkle-dur:${2+Math.random()*4}s;--twinkle-delay:${-Math.random()*5}s;`;
      el.stars.appendChild(s);
    }
  }

  // ── Tree visuals ─────────────────────────────────────────────────────────────
  function applyStage(stage, anim=true) {
    const d = anim ? '1.5s' : '0s';
    const op = (e,v) => { e.style.transition=`opacity ${d} ease`; e.style.opacity=v; };
    op(el.seedlingGroup, stage.seedling  ? 1 : 0);
    op(el.trunkGroup,    stage.trunk     ? 1 : 0);
    op(el.branchGroup,   stage.branches  ? 1 : 0);
    op(el.canopyGroup,   stage.canopy    ? 1 : 0);
    op(el.blossomGroup,  stage.blossoms  ? 1 : 0);
    op(el.fruitGroup,    stage.fruits    ? 1 : 0);
    op(el.potGroup,      stage.seedling  ? 1 : 0);
    op(el.deadGroup,     0);
    el.stageEmoji.textContent = stage.emoji;
    el.stageName.textContent  = stage.name;
    el.fallenPetals.style.display = stage.blossoms ? 'block' : 'none';
  }

  function applyDead() {
    const op = (e,v) => { e.style.transition='opacity 2s ease'; e.style.opacity=v; };
    [el.seedlingGroup,el.canopyGroup,el.blossomGroup,el.fruitGroup,el.trunkGroup,el.branchGroup]
      .forEach(e => op(e,0));
    op(el.potGroup, 1);
    setTimeout(() => { op(el.deadGroup,1); el.deathOverlay.classList.add('visible'); }, 1500);
    el.stageEmoji.textContent = '💀';
    el.stageName.textContent  = 'Gestorben';
    el.fallenPetals.style.display = 'none';
  }

  function createPetals() {
    el.fallenPetals.innerHTML = '';
    for (let i=0;i<6;i++) {
      const p = document.createElement('div');
      p.className = 'fallen-petal';
      p.style.cssText = `left:${15+Math.random()*70}%;animation-delay:${-Math.random()*8}s;
        animation-duration:${7+Math.random()*5}s;transform:rotate(${Math.random()*360}deg);`;
      el.fallenPetals.appendChild(p);
    }
  }

  // ── Game logic ───────────────────────────────────────────────────────────────
  function waterLevel() {
    if (!state.lastWatered) return 0;
    return Math.max(0, Math.min(1, 1 - (Date.now()-state.lastWatered) / deathMs()));
  }
  function healthLevel() {
    const w = waterLevel();
    if (w > 0.66) return 1;
    if (w > 0.33) return 0.4 + (w-0.33)/0.33*0.6;
    return w/0.33*0.4;
  }
  function currentStage() {
    let s = STAGES[0];
    for (const st of STAGES) if (state.totalWaterings >= st.minWaterings) s = st;
    return s;
  }
  function canWater() {
    if (!state.lastWatered) return true;
    return (Date.now()-state.lastWatered) >= intervalMs();
  }
  function checkDeath() {
    if (!state.alive) return true;
    if (state.lastWatered && (Date.now()-state.lastWatered) >= deathMs()) {
      state.alive = false; save(); applyDead(); return true;
    }
    return false;
  }

  // ── UI update ────────────────────────────────────────────────────────────────
  function updateUI() {
    if (!state.alive) return;
    const wl = waterLevel(), hl = healthLevel();
    el.waterFill.style.width  = `${Math.round(wl*100)}%`;
    el.healthFill.style.width = `${Math.round(hl*100)}%`;
    document.body.classList.toggle('low-health',      hl < 0.4);
    document.body.classList.toggle('critical-health', hl < 0.15);

    el.dayCounter.textContent = `Gießung ${state.totalWaterings}`;

    const stage = currentStage();
    const si    = STAGES.indexOf(stage);
    if (si !== state.stageIndex) {
      state.stageIndex = si;
      applyStage(stage, true);
      showMsg(stage.msg);
      save();
    }

    if (canWater()) {
      el.waterBtn.disabled = false;
      el.waterBtnSub.textContent = 'Jetzt gießen!';
      el.nextWaterInfo.textContent = '';
    } else {
      el.waterBtn.disabled = true;
      const rem = intervalMs() - (Date.now()-state.lastWatered);
      el.waterBtnSub.textContent  = formatDuration(rem);
      el.nextWaterInfo.textContent = `Nächste Gießung in ${formatDuration(rem)} möglich`;
    }

    if (wl < 0.15) showMsg('⚠️ Dein Baum verdurstet fast! Gieße ihn sofort!');
    else if (wl < 0.35) showMsg('Dein Baum hat Durst... 💧 Zeit zum Gießen!');
  }

  let msgTimer = null;
  function showMsg(text, dur=0) {
    el.messageText.style.opacity = '0';
    setTimeout(() => { el.messageText.textContent=text; el.messageText.style.opacity='1'; }, 250);
    if (dur > 0) { clearTimeout(msgTimer); msgTimer = setTimeout(updateUI, dur); }
  }

  // ── Actions ──────────────────────────────────────────────────────────────────
  function water() {
    if (!canWater() || !state.alive) return;
    el.wateringOverlay.classList.add('visible');
    el.waterDrops.style.opacity = '1';
    setTimeout(() => {
      el.wateringOverlay.classList.remove('visible');
      el.waterDrops.style.opacity = '0';
      state.lastWatered = Date.now();
      state.totalWaterings++;
      save(); updateUI();
      showMsg('Gegossen! Dein Baum dankt dir! 💧✨', 4000);
    }, 1000);
  }

  function restart() {
    state = { alive:true, lastWatered:Date.now(), totalWaterings:1, stageIndex:0 };
    save();
    el.deathOverlay.classList.remove('visible');
    applyStage(STAGES[0], true);
    updateUI();
    showMsg('Neues Leben beginnt! 🌱');
  }

  // ── Interval slider ──────────────────────────────────────────────────────────
  // Logarithmic mapping: slider 0..100 → 1s..86400s
  function sliderToSec(v) {
    // 0 → 1s, 100 → 86400s (log scale)
    return Math.round(Math.exp(Math.log(1) + (v / 100) * (Math.log(86400) - Math.log(1))));
  }
  function secToSlider(s) {
    return Math.round(((Math.log(s) - Math.log(1)) / (Math.log(86400) - Math.log(1))) * 100);
  }

  function setWaterInterval(sliderVal) {
    wateringInterval = sliderToSec(Number(sliderVal));
    el.intervalDisplay.textContent = formatInterval(wateringInterval);
    save();
    updateUI();
  }

  function syncSlider() {
    if (!el.intervalSlider) return;
    el.intervalSlider.value = secToSlider(wateringInterval);
    el.intervalDisplay.textContent = formatInterval(wateringInterval);
  }

  function debugReset() {
    if (!confirm('Spielstand löschen und neu starten?')) return;
    localStorage.removeItem(STORAGE_KEY);
    wateringInterval = 86400;
    syncSlider();
    state = { alive:true, lastWatered:null, totalWaterings:0, stageIndex:0 };
    el.deathOverlay.classList.remove('visible');
    applyStage(STAGES[0], false);
    updateUI();
    showMsg('Willkommen! Gieße deinen Setzling zum Start! 🌱');
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    initEl();
    generateStars(); createPetals();
    load();
    syncSlider();
    applyStage(currentStage(), false);
    if (!checkDeath()) {
      updateUI();
      showMsg(state.totalWaterings === 0
        ? 'Willkommen! Gieße deinen Setzling zum Start! 🌱'
        : currentStage().msg);
    }
    setInterval(updateSky, 1000);
    setInterval(() => { if (!checkDeath()) updateUI(); }, 1000);
    updateSky();
  }

  return { init, water, restart, setWaterInterval, debugReset };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
