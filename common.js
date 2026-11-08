// ===== あそぼう：ぜんぶの ゲームで つかう しくみ（おと・こえ・シール） =====
(function () {
  // ---------- おと ----------
  let AC;
  function ac() {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  function tone(freq, dur, type = 'sine', vol = .2, when = 0, slideTo) {
    try {
      const a = ac(), t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .05);
    } catch (e) {}
  }
  // ざーっ という おと（みず・しゃわー・けむり）
  function noise(dur, vol = .1, when = 0, freq = 1200) {
    try {
      const a = ac(), t = a.currentTime + when, n = Math.floor(a.sampleRate * dur);
      const buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = .8;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f).connect(g).connect(a.destination); s.start(t);
    } catch (e) {}
  }
  const S = {
    pop() { tone(500, .18, 'sine', .25, 0, 1400); tone(1200, .15, 'triangle', .1, .08); },
    tap() { tone(880 + Math.random() * 400, .12, 'triangle', .12); },
    plop() { tone(300, .2, 'sine', .3, 0, 120); tone(700, .1, 'triangle', .1, .05); },
    sparkle() { [1568, 2093, 2637].forEach((f, i) => tone(f, .25, 'sine', .08, i * .06)); },
    chime() { [784, 659, 523, 659, 784, 1046].forEach((f, i) => tone(f, .5, 'sine', .18, i * .22)); },
    fanfare() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i === 5 ? .7 : .25, 'triangle', .16, i * .13)); },
    yum() { [880, 1100, 1320].forEach((f, i) => tone(f, .2, 'sine', .15, i * .1)); },
    boing() { tone(220, .3, 'sine', .25, 0, 520); },
    oops() { tone(400, .18, 'triangle', .15, 0, 300); tone(300, .25, 'triangle', .15, .16, 220); },
    horn() { tone(440, .9, 'sawtooth', .07); tone(554, .9, 'sawtooth', .07); tone(660, .9, 'triangle', .05); },
    whistle() { tone(1046, .5, 'square', .05); tone(1318, .5, 'sine', .08); tone(1046, .8, 'square', .05, .55); tone(1318, .8, 'sine', .08, .55); },
    gatan() { tone(90, .08, 'square', .12); tone(70, .08, 'square', .12, .1); },
    chop() { tone(180, .07, 'square', .15, 0, 90); noise(.06, .15, 0, 3000); },
    water(d = .3) { noise(d, .08, 0, 2500); },
    blow() { noise(.5, .12, 0, 600); },
    ding() { tone(1760, .8, 'sine', .2); tone(2637, .6, 'sine', .08, .02); },
    tick() { tone(1500, .04, 'square', .05); },
  };

  // ---------- こえ ----------
  let lastSay = 0;
  function say(t) {
    lastSay = Date.now();
    if (window.AndroidTTS) { try { AndroidTTS.speak(t); } catch (e) {} return; }
    try {
      const u = new SpeechSynthesisUtterance(t); u.lang = 'ja-JP'; u.rate = .95; u.pitch = 1.3;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) {}
  }
  const PRAISE = ['すごい！', 'じょうず！', 'やったね！', 'ばっちり！', 'すてき！', 'かんぺき！'];
  const praise = () => PRAISE[(Math.random() * PRAISE.length) | 0];

  // ---------- シール ----------
  const STICKERS = [
    '🚄', '🚅', '🚃', '🚂', '🚝', '🚋', '🚌', '🚒',
    '🍓', '🍰', '🍩', '🍪', '🍦', '🍭', '🍬', '🍙', '🍛', '🍕', '🥞', '🍒', '🍑', '🍌',
    '🐰', '🐻', '🐼', '🐱', '🐶', '🐸', '🐷', '🐨', '🦊', '🐧', '🐹', '🐯', '🦄', '🐥',
    '🌸', '🌼', '🌻', '🌈', '⭐', '🌙', '☀️', '🎀', '💖', '👑', '🎈', '🧸',
  ];
  const KEY = 'asobou.stickers';
  function getStickers() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function saveStickers(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

  let stickerOpen = false;
  function award(done) {
    const have = getStickers();
    const fresh = STICKERS.filter(s => !have[s]);
    const pool = fresh.length ? fresh : STICKERS;
    const s = pool[(Math.random() * pool.length) | 0];
    have[s] = (have[s] || 0) + 1; saveStickers(have);
    showSticker(s, fresh.length > 0, done);
    return s;
  }
  function css() {
    if (document.getElementById('asobou-css')) return;
    const st = document.createElement('style'); st.id = 'asobou-css';
    st.textContent = `
      #stk { position: fixed; inset: 0; z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center;
        background: rgba(255, 227, 240, .88); font-family: "Hiragino Maru Gothic ProN", "BIZ UDPGothic", "Meiryo", sans-serif; }
      #stk .rays { position: absolute; width: 90vmin; height: 90vmin; border-radius: 50%;
        background: repeating-conic-gradient(#ffe066 0 10deg, #fff6c2 10deg 20deg); animation: stkspin 6s linear infinite; opacity: .85;
        -webkit-mask: radial-gradient(circle, #000 35%, transparent 70%); mask: radial-gradient(circle, #000 35%, transparent 70%); }
      #stk .big { position: relative; font-size: 34vmin; line-height: 1; background: #fff; border-radius: 50%; width: 46vmin; height: 46vmin;
        display: flex; align-items: center; justify-content: center; border: 2vmin dashed #ff7eb6; box-shadow: 0 2vmin 0 rgba(0,0,0,.1);
        animation: stkin .7s cubic-bezier(.3,1.6,.5,1) both; }
      #stk .t { position: relative; margin-top: 4vmin; font-size: 8vmin; font-weight: bold; color: #e0457b; text-shadow: .6vmin .6vmin 0 #fff; }
      #stk .new { position: absolute; top: -2vmin; right: -4vmin; font-size: 5vmin; background: #ff4f9a; color: #fff; border-radius: 4vmin;
        padding: .6vmin 2.4vmin; border: .8vmin solid #fff; transform: rotate(12deg); font-weight: bold; }
      @keyframes stkspin { to { transform: rotate(360deg); } }
      @keyframes stkin { 0% { transform: scale(0) rotate(-180deg); } 100% { transform: scale(1) rotate(0); } }
      .asb-fx { position: fixed; pointer-events: none; z-index: 9000; font-size: 7vmin; animation: asbup 1.4s ease-out forwards; }
      @keyframes asbup { to { transform: translateY(-26vh) scale(1.5) rotate(20deg); opacity: 0; } }
    `;
    document.head.appendChild(st);
  }
  function showSticker(s, isNew, done) {
    css(); stickerOpen = true;
    const d = document.createElement('div'); d.id = 'stk';
    d.innerHTML = `<div class="rays"></div><div class="big">${s}${isNew ? '<div class="new">あたらしい！</div>' : ''}</div><div class="t">シール ゲット！</div>`;
    document.body.appendChild(d);
    S.fanfare(); setTimeout(() => say('シール ゲット！'), 250);
    let closed = false;
    const close = () => {
      if (closed) return; closed = true; stickerOpen = false;
      d.style.transition = 'opacity .3s'; d.style.opacity = '0';
      setTimeout(() => { d.remove(); done && done(); }, 300);
    };
    setTimeout(() => d.addEventListener('pointerdown', e => { e.stopPropagation(); close(); }), 600);
    setTimeout(close, 3200);
  }

  // ハートや ほしが ふわっと でる
  function fx(x, y, ch) {
    css();
    const h = document.createElement('div'); h.className = 'asb-fx';
    h.textContent = ch || ['💖', '💛', '✨', '💕', '⭐'][(Math.random() * 5) | 0];
    h.style.left = (x - 30) + 'px'; h.style.top = (y - 30) + 'px';
    document.body.appendChild(h); setTimeout(() => h.remove(), 1500);
  }
  function confetti(x, y, n = 10, set) {
    for (let i = 0; i < n; i++) setTimeout(() =>
      fx(x + (Math.random() - .5) * 420, y + (Math.random() - .5) * 160, set ? set[i % set.length] : ['⭐', '✨', '🌸', '🌼', '💖'][i % 5]), i * 60);
  }

  const pick = a => a[(Math.random() * a.length) | 0];
  const ANIMALS = ['🐰', '🐻', '🐼', '🐱', '🐶', '🐸', '🐷', '🐨', '🦊', '🐧', '🐹', '🐯'];
  const ANIMAL_NAME = { '🐰': 'うさぎ', '🐻': 'くま', '🐼': 'ぱんだ', '🐱': 'ねこ', '🐶': 'いぬ', '🐸': 'かえる', '🐷': 'ぶた',
    '🐨': 'こあら', '🦊': 'きつね', '🐧': 'ぺんぎん', '🐹': 'はむすたー', '🐯': 'とら', '🦄': 'ゆにこーん', '🐥': 'ひよこ' };

  // ---------- でんしゃの かたち（よこから みた せんとうしゃ） ----------
  // x,y: ひだりうえ / L: はこの ながさ / Ht: たかさ / N: はなの ながさ
  const TRAIN = {
    NOSE: { long: .7, round: .4, kamo: .85, flat: .08 },
    body(c, x, y, L, Ht, N, shape) {
      if (c.beginPath) c.beginPath(); c.moveTo(x + 10, y); c.lineTo(x + L, y);
      const e = x + L + N;
      if (shape === 'round') { c.quadraticCurveTo(e, y, e, y + Ht * .6); }
      else if (shape === 'kamo') { c.bezierCurveTo(x + L + N * .3, y, x + L + N * .45, y + Ht * .5, x + L + N * .75, y + Ht * .6); c.quadraticCurveTo(e, y + Ht * .65, e, y + Ht * .85); }
      else if (shape === 'flat') { c.lineTo(e - Ht * .15, y); c.quadraticCurveTo(e, y, e, y + Ht * .15); }
      else { c.bezierCurveTo(x + L + N * .55, y, e, y + Ht * .7, e, y + Ht * .9); }
      c.lineTo(e, y + Ht); c.lineTo(x, y + Ht); c.lineTo(x, y + 10); c.quadraticCurveTo(x, y, x + 10, y); c.closePath();
    },
    win(c, x, y, L, Ht, N, shape) {
      if (c.beginPath) c.beginPath();
      if (shape === 'round') { c.moveTo(x + L, y + Ht * .1); c.quadraticCurveTo(x + L + N * .75, y + Ht * .1, x + L + N * .9, y + Ht * .45); c.lineTo(x + L, y + Ht * .45); }
      else if (shape === 'kamo') { c.moveTo(x + L + N * .02, y + Ht * .1); c.quadraticCurveTo(x + L + N * .28, y + Ht * .12, x + L + N * .4, y + Ht * .46); c.lineTo(x + L + N * .02, y + Ht * .46); }
      else if (shape === 'flat') { const w = L * .13, r = 6, wx = x + L + N - L * .16, wy = y + Ht * .12, h = Ht * .33;
        c.moveTo(wx + r, wy); c.arcTo(wx + w, wy, wx + w, wy + h, r); c.arcTo(wx + w, wy + h, wx, wy + h, r); c.arcTo(wx, wy + h, wx, wy, r); c.arcTo(wx, wy, wx + w, wy, r); }
      else { c.moveTo(x + L + N * .05, y + Ht * .08); c.quadraticCurveTo(x + L + N * .45, y + Ht * .1, x + L + N * .6, y + Ht * .42); c.lineTo(x + L + N * .05, y + Ht * .42); }
      c.closePath();
    },
    light(x, y, L, Ht, N, shape) {
      const k = { long: [.85, .78], round: [.85, .8], kamo: [.95, .8], flat: [1, .8] }[shape] || [.85, .78];
      return { x: shape === 'flat' ? x + L + N - L * .03 : x + L + N * k[0], y: y + Ht * k[1] };
    },
  };
  function loadMyTrain() { try { return JSON.parse(localStorage.getItem('asobou.mytrain') || 'null'); } catch (e) { return null; } }
  function saveMyTrain(o) { try { localStorage.setItem('asobou.mytrain', JSON.stringify(o)); return true; } catch (e) { return false; } }

  // はじめて さわったら おとを だせるように する
  addEventListener('pointerdown', () => ac(), { capture: true, passive: true });

  window.Asobou = { ac, tone, noise, S, say, praise, award, getStickers, STICKERS, fx, confetti, pick, ANIMALS, ANIMAL_NAME,
    TRAIN, loadMyTrain, saveMyTrain,
    get stickerOpen() { return stickerOpen; } };
})();
