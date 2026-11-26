/* =====================================================================
 * 🔮 JJ 럭키볼 (다른 게임에 얹어 쓰는 뽑기 부품)
 *  - 기계 = 팔레트 뚜껑을 덮은 'JJ 물감병', 공 = JJ 작품 썸네일(thumbs/NN.webp)이 든 캡슐
 *  - 붓 레버를 누르면 → 병 속 공이 물감처럼 소용돌이치고 → 캡슐이 열리며 '상품'이 나와요
 *
 *  쓰는 법 (같은 주소 hannaj1763-sketch.github.io 의 어느 게임에서나):
 *    <script src="https://hannaj1763-sketch.github.io/gallery2026/luckyball.js"></script>
 *    JJLucky.open({
 *      title: '오늘의 시작 단어',                 // 위 제목
 *      sub: '럭키볼에서 나온 단어로 시작해요',     // 작은 설명
 *      prizes: [{ icon: '🍎', title: '사과', desc: '빨간 과일', say: '사과', lang: 'ko-KR', data: {...} }, ...]
 *              또는 () => 상품 하나를 돌려주는 함수,
 *      balls: 3,                                   // 뽑을 수 있는 횟수 (생략하면 1번)
 *      again: true,                                // [한 번 더] 버튼 보이기
 *      okText: '이걸로 시작!',                     // 확인 버튼 글자
 *      onPick: (prize) => { ... },                 // 확인을 누르면 불려요
 *      onResult: (prize, 남은공) => { ... },       // 캡슐이 열릴 때마다 불려요 (여러 번 뽑을 때)
 *      onClose: () => { ... }                      // ✕ 로 닫았을 때
 *    상품에 art: '작품번호' 를 넣으면 그 그림이 든 캡슐이 열려요.
 *    });
 *  JJLucky.close() 로 닫을 수 있어요. 소리·읽어 주기는 기기에서 꺼 둘 수 있어요(🔊).
 * ===================================================================== */
(function () {
  if (window.JJLucky) return;
  const me = document.currentScript && document.currentScript.src;
  const BASE = me ? me.replace(/[^/]*$/, '') : 'https://hannaj1763-sketch.github.io/gallery2026/';
  const THUMB = id => `${BASE}thumbs/${id}.webp`;
  const PAL = [['#ff8fd0', '#ffd1ea', '#be185d'], ['#7ef0e3', '#ccfbf1', '#0f766e'], ['#fde047', '#fef9c3', '#a16207'], ['#a5b4fc', '#e0e7ff', '#4338ca'], ['#fb923c', '#ffedd5', '#9a3412']];
  let IDS = [], imgs = {}, st = null, raf = 0, ac = null, muted = (() => { try { return localStorage.getItem('jjlucky_mute') === '1'; } catch (e) { return false; } })();

  // ---------- 그림 준비 ----------
  function loadIds() {
    if (IDS.length) return Promise.resolve(IDS);
    return fetch(BASE + 'thumbs/index.json').then(r => r.json()).then(j => (IDS = (j.works || []).map(w => w.id)))
      .catch(() => (IDS = Array.from({ length: 72 }, (_, i) => String(i + 2).padStart(2, '0'))));
  }
  function img(id) { if (!imgs[id]) { const im = new Image(); im.src = THUMB(id); imgs[id] = im; } return imgs[id]; }

  // ---------- 소리 ----------
  function tone(f, type, dur, delay = 0, vol = .14) {
    if (muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + delay;
      o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(.001, t); g.gain.exponentialRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + .03);
    } catch (e) {}
  }
  const sMix = () => { [262, 330, 392, 523, 392, 440, 587, 659].forEach((f, i) => tone(f, 'triangle', .14, i * .14)); for (let i = 0; i < 8; i++) tone(180 + Math.random() * 240, 'sine', .08, i * .16 + .05, .1); };
  const sPop = () => { tone(700, 'square', .06, 0, .1); tone(1100, 'sine', .18, .05, .12); };
  const sWin = () => [[523, .12, 0], [659, .12, .12], [784, .12, .24], [1047, .4, .36], [784, .14, .55], [1047, .5, .72]].forEach(([f, d, t]) => tone(f, 'triangle', d, t, .18));
  function say(text, lang) {
    if (muted || !text) return;
    const clean = String(text).replace(/[\p{Extended_Pictographic}️]/gu, '').trim(); if (!clean) return;
    try {
      const N = window.AtelierApp || (window.parent && window.parent.AtelierApp);
      if (N && typeof N.speak === 'function' && N.speak(clean, .9) === 'ok') return;
    } catch (e) {}
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(clean); u.lang = lang || (/^[A-Za-z0-9\s!?.,'-]+$/.test(clean) ? 'en-US' : 'ko-KR'); u.rate = .92; u.pitch = 1.1; speechSynthesis.speak(u); } catch (e) {}
  }

  // ---------- 화면 ----------
  const CSS = `
  .jl-ov{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:max(12px,env(safe-area-inset-top)) 14px max(14px,env(safe-area-inset-bottom));
    background:radial-gradient(circle at 50% 30%,#3b1d5c 0%,#140a24 70%);color:#fff;font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif;user-select:none;-webkit-user-select:none;animation:jlIn .25s ease}
  @keyframes jlIn{from{opacity:0}}
  .jl-ov *{box-sizing:border-box}
  .jl-x{position:absolute;top:max(10px,env(safe-area-inset-top));right:12px;width:40px;height:40px;border-radius:50%;border:none;background:rgba(255,255,255,.14);color:#fff;font-size:20px;cursor:pointer}
  .jl-snd{position:absolute;top:max(10px,env(safe-area-inset-top));left:12px;width:40px;height:40px;border-radius:50%;border:none;background:rgba(255,255,255,.14);color:#fff;font-size:18px;cursor:pointer}
  .jl-hd{text-align:center;margin-bottom:8px}
  .jl-hd small{display:inline-block;font-size:11px;font-weight:900;letter-spacing:1.5px;color:#fde047;background:rgba(253,224,71,.14);border:1px solid rgba(253,224,71,.4);border-radius:99px;padding:3px 10px}
  .jl-hd h2{margin:6px 0 2px;font-size:clamp(22px,6.4vw,30px);font-weight:900;letter-spacing:-.5px;text-shadow:0 0 18px rgba(255,143,208,.55)}
  .jl-hd p{margin:0;font-size:13px;color:#e9d5ff}
  .jl-stage{position:relative;display:flex;flex-direction:column;align-items:center}
  .jl-lid{position:relative;width:min(56vw,230px);height:34px;margin-bottom:-6px;z-index:3;border-radius:60% 40% 55% 45%/70% 70% 30% 30%;
    background:radial-gradient(circle at 18% 55%,#ff5fa2 0 6px,transparent 7px),radial-gradient(circle at 34% 40%,#fde047 0 6px,transparent 7px),radial-gradient(circle at 50% 58%,#4ade80 0 6px,transparent 7px),radial-gradient(circle at 66% 40%,#60a5fa 0 6px,transparent 7px),radial-gradient(circle at 84% 52%,#1e1b4b 0 7px,transparent 8px),linear-gradient(180deg,#f6dfb0,#d9ad6a);
    box-shadow:0 4px 0 #b07a3c,0 8px 14px rgba(0,0,0,.35)}
  .jl-lid::after{content:'';position:absolute;left:12%;right:30%;bottom:-14px;height:16px;background:radial-gradient(circle at 10% 0,#ff5fa2 0 7px,transparent 8px),radial-gradient(circle at 45% 0,#a78bfa 0 5px,transparent 6px),radial-gradient(circle at 80% 0,#7ef0e3 0 6px,transparent 7px)}
  .jl-dome{position:relative;width:min(66vw,270px);aspect-ratio:.86;border-radius:34px 34px 54px 54px/34px 34px 70px 70px;overflow:hidden;
    background:linear-gradient(90deg,rgba(255,255,255,.22),rgba(255,255,255,.04) 30%,rgba(255,255,255,.02) 70%,rgba(255,255,255,.16)),radial-gradient(circle at 50% 110%,rgba(255,143,208,.45),rgba(20,10,36,.75) 70%);
    border:4px solid rgba(255,255,255,.55);box-shadow:inset 0 0 0 3px rgba(126,240,227,.25),inset 0 -24px 40px rgba(255,143,208,.35),0 0 40px rgba(126,240,227,.25),0 16px 30px rgba(0,0,0,.55)}
  .jl-dome canvas{position:absolute;inset:0;width:100%;height:100%}
  .jl-dome .hl{position:absolute;top:10%;left:9%;width:9%;height:58%;border-radius:20px;background:linear-gradient(180deg,rgba(255,255,255,.7),rgba(255,255,255,0));pointer-events:none}
  .jl-dome .lbl{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) rotate(-4deg);background:#fffbeb;color:#9d174d;border:2px dashed #f9a8d4;border-radius:10px;padding:4px 10px;font-size:12px;font-weight:900;letter-spacing:1px;opacity:.85;pointer-events:none;white-space:nowrap}
  .jl-cap{display:none}
  .jl-base{position:relative;width:min(76vw,310px);height:46px;margin-top:-4px;border-radius:14px;background:linear-gradient(180deg,#f6dfb0,#c99556);box-shadow:0 5px 0 #8b5a2b,0 12px 20px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:3}
  .jl-base::before{content:'';width:58px;height:22px;border-radius:0 0 30px 30px;background:#2a1640;box-shadow:inset 0 4px 8px rgba(0,0,0,.6)}
  .jl-dial{position:absolute;right:-6px;bottom:24px;width:22px;height:150px;transform-origin:50% 90%;transform:rotate(18deg);transition:transform .7s cubic-bezier(.34,1.56,.64,1);pointer-events:none;
    background:linear-gradient(180deg,#ff5fa2 0 16%,#fff7fb 16% 22%,#e5e7eb 22% 34%,#9ca3af 34% 36%,#f59e0b 36% 100%);border-radius:40% 40% 10px 10px/30% 30% 10px 10px;box-shadow:inset -4px 0 0 rgba(0,0,0,.15),0 4px 8px rgba(0,0,0,.35)}
  .jl-cnt{position:absolute;bottom:7%;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.65);border:1px solid rgba(255,255,255,.25);border-radius:99px;padding:5px 13px;font-size:13px;font-weight:800;white-space:nowrap;z-index:2}
  .jl-cnt b{color:#7ef0e3}
  .jl-go{margin-top:16px;width:min(86vw,360px);border:none;border-radius:99px;padding:15px;font-size:20px;font-weight:900;cursor:pointer;color:#3b0764;background:linear-gradient(135deg,#fde047,#ff8fd0);box-shadow:0 8px 25px rgba(255,143,208,.45);font-family:inherit}
  .jl-go:active{transform:scale(.97)} .jl-go:disabled{opacity:.45}
  .jl-mix{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;z-index:5;overflow:hidden;background:#140a24}
  .jl-mix::before{content:'';position:absolute;inset:-50%;background:conic-gradient(from 0deg,#ff8fd0,#fde047,#7ef0e3,#a5b4fc,#ff8fd0);opacity:.28;filter:blur(30px);animation:jlSpin 2.4s linear infinite}
  @keyframes jlSpin{to{transform:rotate(360deg)}}
  .jl-mix h3,.jl-mix canvas{position:relative}
  .jl-mix.on{display:flex}
  .jl-mix h3{font-size:clamp(24px,7vw,34px);font-weight:900;text-align:center;line-height:1.35;animation:jlPulse .8s infinite;margin:0 0 10px}
  @keyframes jlPulse{50%{transform:scale(1.05);opacity:.85}}
  .jl-mix canvas{width:min(94vw,480px);height:52vh}
  .jl-res{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;padding:16px;background:rgba(10,5,20,.92);z-index:6;overflow-y:auto}
  .jl-res.on{display:flex}
  .jl-res canvas.cf{position:fixed;inset:0;width:100%;height:100%;pointer-events:none}
  .jl-open{position:relative;width:150px;height:150px;margin-bottom:6px}
  .jl-half{position:absolute;left:0;width:150px;height:75px;overflow:hidden}
  .jl-half.t{top:0;border-radius:75px 75px 0 0;animation:jlTop .7s .25s cubic-bezier(.3,1.4,.5,1) forwards}
  .jl-half.b{bottom:0;border-radius:0 0 75px 75px;animation:jlBot .7s .25s cubic-bezier(.3,1.4,.5,1) forwards}
  .jl-half.t img{width:150px;height:150px;object-fit:cover;display:block}
  @keyframes jlTop{to{transform:translate(-62px,-6px) rotate(-32deg)}}
  @keyframes jlBot{to{transform:translate(62px,-2px) rotate(32deg)}}
  .jl-burst{position:absolute;left:50%;top:50%;width:10px;height:10px;border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 0 0 0 rgba(253,224,71,.9);animation:jlBurst .9s .3s ease-out forwards}
  @keyframes jlBurst{to{box-shadow:0 0 0 90px rgba(253,224,71,0)}}
  .jl-card{width:min(88vw,360px);text-align:center;background:linear-gradient(160deg,#fff,#fff0f7);color:#3b0764;border:3px solid #ff8fd0;border-radius:26px;padding:20px 16px 16px;box-shadow:0 0 0 4px rgba(255,255,255,.25),0 0 40px rgba(255,143,208,.55);animation:jlPop .6s .55s cubic-bezier(.22,1,.36,1) both}
  @keyframes jlPop{from{transform:scale(.3) rotate(-10deg);opacity:0}}
  .jl-card .ic{font-size:54px;line-height:1}
  .jl-card .lb{font-size:13px;font-weight:900;color:#db2777;margin-top:6px}
  .jl-card h4{margin:6px 0;font-size:clamp(26px,8vw,38px);font-weight:900;word-break:keep-all;line-height:1.2}
  .jl-card p{margin:0 0 12px;font-size:14.5px;color:#6b21a8;line-height:1.5;word-break:keep-all}
  .jl-card .sp{border:none;border-radius:99px;padding:9px 16px;font-weight:900;font-size:14px;background:#7ef0e3;color:#134e4a;cursor:pointer;font-family:inherit}
  .jl-btns{display:flex;gap:8px;margin-top:14px;width:min(88vw,360px)}
  .jl-btns button{flex:1;border:none;border-radius:16px;padding:14px 8px;font-size:16px;font-weight:900;cursor:pointer;font-family:inherit}
  .jl-btns .a{background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.3)} .jl-btns .k{background:linear-gradient(135deg,#fde047,#ff8fd0);color:#3b0764}`;
  function ensureCss() { if (document.getElementById('jl-css')) return; const s = document.createElement('style'); s.id = 'jl-css'; s.textContent = CSS; document.head.appendChild(s); }

  // ---------- 캡슐(공) 그리기 ----------
  function drawBall(c, b) {
    const { x, y, r, p, rot, id } = b;
    c.save(); c.translate(x, y); c.rotate(rot);
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.clip();
    const im = img(id);
    if (im.complete && im.naturalWidth) c.drawImage(im, -r, -r, r * 2, r * 2); else { c.fillStyle = p[1]; c.fillRect(-r, -r, r * 2, r); }
    const g = c.createLinearGradient(0, 0, 0, r); g.addColorStop(0, p[0]); g.addColorStop(1, p[2]);
    c.fillStyle = g; c.fillRect(-r, 0, r * 2, r);
    c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(-r, -r * .07, r * 2, r * .14);
    c.restore();
    c.save(); c.translate(x, y);
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2; c.stroke();
    const sh = c.createRadialGradient(-r * .35, -r * .4, r * .05, 0, 0, r); sh.addColorStop(0, 'rgba(255,255,255,.55)'); sh.addColorStop(.35, 'rgba(255,255,255,.05)'); sh.addColorStop(1, 'rgba(0,0,0,.25)');
    c.fillStyle = sh; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function newBall(w, h, i, big) {
    const r = big ? Math.max(30, w * .12) : Math.max(22, w * .11);
    return { x: w * .2 + Math.random() * w * .6, y: big ? h * .6 + Math.random() * h * .3 : h * .35 + Math.random() * h * .3, vx: (Math.random() - .5) * (big ? 14 : 1.4), vy: big ? -10 - Math.random() * 14 : (Math.random() - .5) * 1.4,
      r: r * (.92 + Math.random() * .14), p: PAL[i % PAL.length], rot: Math.random() * 6.28, vr: (Math.random() - .5) * (big ? .25 : .03), id: IDS[Math.floor(Math.random() * IDS.length)] || '02' };
  }
  function sizeCanvas(cv) { const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); cv.width = r.width * d; cv.height = r.height * d; const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); return { c, w: r.width, h: r.height }; }

  function domeLoop() {
    if (!st) return;
    const { c, w, h } = st.dome; const pad = 8;
    c.clearRect(0, 0, w, h);
    if (st.left > 0) {
      for (const b of st.balls) {
        b.vy += .12; if (st.shake > 0) { const a = Math.atan2(b.y - h / 2, b.x - w / 2) + 1.6; b.vx += Math.cos(a) * st.shake * .9 + (Math.random() - .5) * st.shake * .4; b.vy += Math.sin(a) * st.shake * .9 - Math.random() * st.shake * .5; }
        b.vx *= .985; b.vy *= .985; b.x += b.vx; b.y += b.vy; b.rot += b.vr + b.vx * .01;
        if (b.x < b.r + pad) { b.x = b.r + pad; b.vx = Math.abs(b.vx) * .6; } if (b.x > w - b.r - pad) { b.x = w - b.r - pad; b.vx = -Math.abs(b.vx) * .6; }
        if (b.y < b.r + pad) { b.y = b.r + pad; b.vy = Math.abs(b.vy) * .6; } if (b.y > h - b.r - pad) { b.y = h - b.r - pad; b.vy = -Math.abs(b.vy) * .35; b.vx *= .9; }
      }
      for (let i = 0; i < st.balls.length; i++) for (let j = i + 1; j < st.balls.length; j++) {
        const a = st.balls[i], b = st.balls[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.r + b.r;
        if (d < m && d > 0) { const o = (m - d) / 2, nx = dx / d, ny = dy / d; a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o; const p = nx * (a.vx - b.vx) + ny * (a.vy - b.vy); if (p > 0) { a.vx -= p * nx * .85; a.vy -= p * ny * .85; b.vx += p * nx * .85; b.vy += p * ny * .85; } }
      }
      if (st.shake > 0) st.shake = Math.max(0, st.shake - .15);
      st.balls.forEach(b => drawBall(c, b));
    }
    raf = requestAnimationFrame(domeLoop);
  }

  function pickPrize() {
    const P = st.opts.prizes;
    if (typeof P === 'function') return P();
    if (!P || !P.length) return { icon: '🎨', title: 'JJ의 그림', desc: '오늘도 멋진 하루!' };
    let p = P[Math.floor(Math.random() * P.length)];
    if (P.length > 1 && st.last && p.title === st.last.title) p = P.filter(x => x.title !== st.last.title)[Math.floor(Math.random() * (P.length - 1))];
    return p;
  }
  function draw() {
    if (!st || st.busy || st.left <= 0) return;
    st.busy = true; st.left--; render();
    const dial = st.el.querySelector('.jl-dial'); dial.style.transform = 'rotate(-38deg)'; setTimeout(() => { if (st) dial.style.transform = 'rotate(30deg)'; }, 260); setTimeout(() => { if (st) dial.style.transform = 'rotate(18deg)'; }, 600);
    st.shake = 5; sMix();
    setTimeout(() => mix(1400, () => { const p = pickPrize(); st.last = p; st.ballId = p.art || IDS[Math.floor(Math.random() * IDS.length)] || '02'; result(p); st.busy = false; render(); }), 320);
  }
  function mix(ms, done) {
    const box = st.el.querySelector('.jl-mix'); box.classList.add('on');
    const { c, w, h } = sizeCanvas(box.querySelector('canvas')), cx = w / 2, cy = h / 2, R = Math.min(w, h) * .42;
    const bs = Array.from({ length: 14 }, (_, i) => Object.assign(newBall(w, h, i, true), { ang: i / 14 * Math.PI * 2, rad: R * (.35 + Math.random() * .65) })), t0 = performance.now();
    (function lp(now) {
      const t = (now - t0) / ms, sp = .04 + t * .22;
      c.clearRect(0, 0, w, h);
      c.save(); c.globalAlpha = .35; c.strokeStyle = '#fff'; c.lineWidth = 2;
      for (let k = 0; k < 3; k++) { c.beginPath(); for (let a = 0; a < 12; a += .1) { const rr = a * R / 12; c.lineTo(cx + Math.cos(a + now / 300 + k * 2.1) * rr, cy + Math.sin(a + now / 300 + k * 2.1) * rr); } c.stroke(); }
      c.restore();
      for (const b of bs) { b.ang += sp * (1.4 - b.rad / R * .6); const pull = t > .7 ? (1 - (t - .7) / .3 * .85) : 1; b.x = cx + Math.cos(b.ang) * b.rad * pull; b.y = cy + Math.sin(b.ang) * b.rad * pull * .8; b.rot += .2; drawBall(c, b); }
      if (t < 1 && st) requestAnimationFrame(lp); else { box.classList.remove('on'); if (st) done(); }
    })(t0);
  }
  function confetti(cv) {
    const { c, w, h } = sizeCanvas(cv), ic = ['⭐', '✨', '🎉', '💖', '🌟', '🎨'], ps = Array.from({ length: 42 }, (_, i) => { const a = Math.random() * 6.28, s = 4 + Math.random() * 11; return { x: w / 2, y: h * .36, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 4, s: 16 + Math.random() * 16, i: ic[i % ic.length], r: Math.random() * 6, vr: (Math.random() - .5) * .15, al: 1 }; });
    (function lp() { c.clearRect(0, 0, w, h); let n = 0; for (const p of ps) { if (p.al <= .02) continue; n++; p.vy += .25; p.vx *= .98; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.al -= .011; c.save(); c.globalAlpha = Math.max(0, p.al); c.translate(p.x, p.y); c.rotate(p.r); c.font = p.s + 'px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.i, 0, 0); c.restore(); } if (n && st) requestAnimationFrame(lp); })();
  }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  function result(p) {
    const box = st.el.querySelector('.jl-res'), o = st.opts, pal = PAL[Math.floor(Math.random() * PAL.length)];
    box.innerHTML = `<canvas class="cf"></canvas>
      <div class="jl-open"><div class="jl-burst"></div>
        <div class="jl-half t"><img src="${THUMB(st.ballId)}" alt=""></div>
        <div class="jl-half b" style="background:linear-gradient(${pal[0]},${pal[2]})"></div></div>
      <div class="jl-card"><div class="ic">${esc(p.icon || '🌟')}</div><div class="lb">${esc(p.label || o.label || '짠! 럭키볼에서 나온 건')}</div>
        <h4>${esc(p.title)}</h4>${p.desc ? `<p>${esc(p.desc)}</p>` : ''}${p.say !== false ? '<button class="sp">🔊 들어 보기</button>' : ''}</div>
      <div class="jl-btns">${o.again !== false && st.left > 0 ? `<button class="a">${esc(o.againText || '🔄 한 번 더')} (${st.left})</button>` : ''}<button class="k">${esc(o.okText || '좋아요!')}</button></div>`;
    box.classList.add('on'); sPop(); setTimeout(sWin, 350); confetti(box.querySelector('canvas.cf'));
    if (o.onResult) try { o.onResult(p, st.left); } catch (e) { console.log(e); }
    const text = p.say === false ? '' : (p.say || p.title);
    setTimeout(() => say(text, p.lang), 900);
    const sp = box.querySelector('.sp'); if (sp) sp.onclick = () => say(text, p.lang);
    const ag = box.querySelector('.a'); if (ag) ag.onclick = () => { box.classList.remove('on'); draw(); };
    box.querySelector('.k').onclick = () => { const cb = o.onPick; close(); if (cb) try { cb(p); } catch (e) { console.log(e); } };
  }
  function render() {
    if (!st) return;
    st.el.querySelector('.jl-cnt b').textContent = st.left;
    const g = st.el.querySelector('.jl-go'); g.disabled = st.left <= 0 || st.busy; g.textContent = st.left > 0 ? (st.opts.goText || '🔮 럭키볼 뽑기!') : '럭키볼을 다 썼어요';
  }
  function open(opts = {}) {
    close(); ensureCss();
    const el = document.createElement('div'); el.className = 'jl-ov';
    el.innerHTML = `<button class="jl-snd">${muted ? '🔇' : '🔊'}</button>${opts.closable === false ? '' : '<button class="jl-x">✕</button>'}
      <div class="jl-hd"><small>JJ LUCKY BALL</small><h2>${esc(opts.title || 'JJ 럭키볼')}</h2>${opts.sub ? `<p>${esc(opts.sub)}</p>` : ''}</div>
      <div class="jl-stage"><div class="jl-lid"></div>
        <div class="jl-dome"><canvas></canvas><div class="lbl">JJ PAINT</div><div class="hl"></div><div class="jl-cnt">내 럭키볼 <b>0</b>개</div></div>
        <div class="jl-base"><div class="jl-dial"></div></div></div>
      <button class="jl-go">🔮 럭키볼 뽑기!</button>
      <div class="jl-mix"><h3>붓으로 휘휘~<br>무엇이 나올까?</h3><canvas></canvas></div>
      <div class="jl-res"></div>`;
    document.body.appendChild(el);
    st = { el, opts, left: opts.balls == null ? 1 : opts.balls, balls: [], shake: 0, busy: false };
    el.querySelector('.jl-snd').onclick = e => { muted = !muted; try { localStorage.setItem('jjlucky_mute', muted ? '1' : '0'); } catch (x) {} e.currentTarget.textContent = muted ? '🔇' : '🔊'; };
    const x = el.querySelector('.jl-x'); if (x) x.onclick = () => { const cb = opts.onClose; close(); if (cb) cb(); };
    el.querySelector('.jl-go').onclick = draw; el.querySelector('.jl-base').onclick = draw;
    loadIds().then(() => {
      if (!st) return;
      st.dome = sizeCanvas(el.querySelector('.jl-dome canvas'));
      st.balls = Array.from({ length: 11 }, (_, i) => newBall(st.dome.w, st.dome.h, i, false));
      st.balls.forEach(b => img(b.id)); render(); domeLoop();
      if (opts.auto) setTimeout(draw, 500);
    });
    render();
  }
  function close() { cancelAnimationFrame(raf); try { speechSynthesis.cancel(); } catch (e) {} if (st && st.el) st.el.remove(); st = null; }
  window.JJLucky = { open, close, say };
})();
