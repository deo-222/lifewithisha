/* =============================================================================
   Cozy room: static scene with small ambient motion (CSS only)
   Front view of a room on a 1920-wide canvas. Desktop shows the top 1080px;
   phones (portrait) see more of the floor, so the image runs to 1881px.
   Positions are canvas pixels: x = left edge, bottom = where the object's base sits, w = width.
   Height comes from each image's aspect ratio. Later objects are drawn in front.
   `p` overrides position/size in portrait (phone) mode. `float` makes an item hover.
   Real-world scale: the back wall is ~2.4m tall = 823px, so 1m ≈ 345px.
   ========================================================================== */

const CANVAS = { w: 1920, h: 1881, view: 1080 };

const ROOM = [
  // ---- on the wall. Only pieces that lead somewhere float; `label` + `go`/`act` make a piece clickable ----
  { id: "painting", src: "painting-framed", x: 110, bottom: 330, w: 230, aspect: 1.191, cls: "hung",
    p: { hide: true } },
  { id: "note-b", html: "note", text: "brand<br>voice ♡", tone: "pink", x: 208, bottom: 637, w: 110, h: 110, float: { rot: -7, dur: 7.5, delay: -5 },
    label: "about Isha", go: "#about",
    p: { x: 582, bottom: 262, w: 92, h: 92 } },
  { id: "note-a", html: "note", text: "stories that<br>stick", tone: "yellow", x: 1620, bottom: 300, w: 114, h: 114, float: { rot: 5, dur: 6.5, delay: -3 },
    label: "see the stories", go: "#work",
    p: { x: 1240, bottom: 505, w: 92, h: 92 } },
  { id: "vinyl", src: "vinyl-midnights", x: 1342, bottom: 238, w: 148, aspect: 0.996, cls: "spin hung",   // spins while music plays
    label: "my playlist ↗", act: "spotify",
    p: { x: 572, bottom: 455, w: 112 } },
  // a magnetic board (~65x85cm) with a letter in its envelope held up by a magnet
  { id: "board", html: "board", x: 1306, bottom: 566, w: 220, h: 288, cls: "hung",
    label: "let's connect ✉", act: "mail",
    p: { x: 1210, bottom: 400, w: 118, h: 154 } },
  { id: "bulb", src: "bulb", x: 1232, bottom: 470, w: 45, aspect: 0.662, float: { rot: 8, dur: 6.2, delay: -1.5 }, bulbglow: true,
    label: "what I'm good at", go: "#skills",
    p: { x: 1272, bottom: 640, w: 32 } },
  { id: "megaphone", src: "megaphone", x: 1600, bottom: 470, w: 80, aspect: 1.014, float: { rot: -6, dur: 7.2, delay: -3.5 },
    label: "say hi", go: "#contact",
    p: { x: 1252, bottom: 790, w: 66 } },

  // ---- name + tagline, centred on the wall above the desk ----
  { id: "words", html: "words", x: 630, bottom: 378, w: 660, h: 300, k: 1,
    p: { x: 600, bottom: 352, w: 720, h: 232, k: 0.78 } },

  // ---- floor, back to front ----
  { id: "rug", src: "rug-persian", x: 490, bottom: 1076, w: 940, aspect: 3.791, cls: "rug" },
  { id: "floorlamp", src: "lamp-red", x: 432, bottom: 905, w: 165, aspect: 0.276, shadow: 120, glow: true, cls: "lamp",
    label: "lights", act: "lamp",
    p: { x: 572, bottom: 905, w: 118 } },
  { id: "desk", src: "desk-console", x: 700, bottom: 930, w: 520, aspect: 1.55, shadow: 560 },

  // ---- on the desk (surface at y ≈ 608) ----
  { id: "books", html: "books", x: 712, bottom: 609, w: 110, h: 104 },   // eight spines, one per case study (labels + links per book)
  { id: "candle", src: "candle-amber", x: 826, bottom: 610, w: 38, aspect: 0.804, shadow: 40, flame: { fx: 0.49 },
    label: "make a wish", act: "candle" },
  { id: "imac", src: "imac", x: 862, bottom: 609, w: 258, aspect: 1.25, shadow: 180,
    label: "see my work", go: "#work",
    screen: [0.048, 0.072, 0.953, 0.68] },   // active display area (fractions), filled with a photo of Isha
  { id: "mug", src: "mug-bears", x: 1040, bottom: 616, w: 54, aspect: 1.312, shadow: 54, steam: true,
    label: "coffee chat? find me on LinkedIn ↗", act: "linkedin" },
  { id: "plant", src: "plant-pot", x: 1090, bottom: 610, w: 130, aspect: 1.263, shadow: 84 },

  // ---- by the right wall: side table (~55cm tall, scaled to the desk) with a record player on it ----
  { id: "sidetable", src: "side-table", x: 1530, bottom: 962, w: 211, aspect: 0.836, shadow: 230 },
  { id: "turntable", src: "turntable-pink", x: 1558, bottom: 736, w: 160, aspect: 1.11, shadow: 150,
    label: "play music", act: "music" },

  // ---- desk chair on the rug, in front of the desk (~1.2x the desk's height) ----
  { id: "chair", src: "chair-3q", x: 790, bottom: 1012, w: 323, aspect: 0.829, shadow: 270 },   // turned three-quarter toward the visitor

  // ---- on the floor ----
  { id: "cat", src: "cat-calico", x: 1080, bottom: 1066, w: 261, aspect: 1.702, shadow: 250, cls: "cat",
    label: "pet me", act: "cat",
    p: { x: 1076, bottom: 1062, w: 200 } },   // on the rug, beside the chair
];

// the books on the desk: one spine per case study, in case order
const BOOKS = [
  { go: "#rutgers", n: "01", title: "Rutgers NB & Careers", c: "#6B2129", h: 0.98 },
  { go: "#sos", n: "02", title: "SOS Children's Villages", c: "#E9DCC7", h: 0.9 },
  { go: "#rambandhu", n: "03", title: "Ram Bandhu", c: "#C98B5A", h: 1 },
  { go: "#western", n: "04", title: "Western Equipments", c: "#5E7268", h: 0.86 },
  { go: "#sigvaris", n: "05", title: "Sigvaris Novomed", c: "#EDB2BD", h: 0.94 },
  { go: "#betterflour", n: "06", title: "The Better Flour", c: "#8A5A3B", h: 0.88 },
  { go: "#skincare", n: "07", title: "Sukin & G&M", c: "#F1D97A", h: 0.96 },
  { go: "#inicio", n: "08", title: "Inicio by Infra.Market", c: "#B9A28C", h: 0.84 },
];

// Pictures whose cast shadow is pre-rendered (assets/cast/), drawn with the same look as the CSS
// drop shadows but without a live blur, which is costly to redraw while the camera zooms.
// CAST_PAD is the margin those images carry around the object, in canvas px.
const CAST = new Set(["candle-amber", "imac", "mug-bears", "plant-pot", "desk-console", "side-table", "turntable-pink", "chair-3q", "lamp-red"]);
const CAST_PAD = 48;

// bulb centres on the string-lights image (fractions of its width/height)
const BULBS = [[0.03, 0.4], [0.163, 0.7], [0.312, 0.7], [0.456, 0.8], [0.633, 0.66], [0.791, 0.7], [0.966, 0.4]];

/* --------------------------------------------------------------------------- */

const $ = (s) => document.querySelector(s);
const scene = $("#scene");
// the room's visible size: the stage, not the window, so a classic scrollbar's width isn't counted
const stage = $(".stage");
const viewport = () => [stage.clientWidth, stage.clientHeight];
const portrait = () => { const [w, h] = viewport(); return w / h < 1.1; };
const els = [];   // { o, el, shadow }

function make(o) {
  const el = document.createElement("div");
  el.className = `obj ${o.cls || ""} ${o.float ? "float" : ""}`;
  el.dataset.id = o.id;
  if (o.float) el.style.cssText = `--rot:${o.float.rot}deg;--dur:${o.float.dur}s;--delay:${o.float.delay}s`;
  if (o.src) {
    if (CAST.has(o.src)) {
      const c = new Image(), h = o.w / o.aspect, px = (CAST_PAD / o.w) * 100, py = (CAST_PAD / h) * 100;
      c.className = "cast"; c.src = `assets/cast/${o.src}.webp`; c.alt = ""; c.decoding = "async";
      Object.assign(c.style, { left: `${-px}%`, top: `${-py}%`, width: `${100 + 2 * px}%`, height: `${100 + 2 * py}%` });
      el.classList.add("baked"); el.appendChild(c);
    }
    const i = new Image(); i.className = "pic"; i.src = `assets/${o.src}.webp`; i.alt = ""; i.decoding = "async";
    el.appendChild(i);
  } else {
    el.appendChild($(`#tpl-${o.html}`).content.cloneNode(true));
    if (o.html === "books") {
      BOOKS.forEach((b, i) => {
        const s = document.createElement("button");
        s.type = "button"; s.className = "book hot"; s.dataset.go = b.go; s.dataset.label = `${b.n} · ${b.title}`;
        s.setAttribute("aria-label", `Case study ${b.n}: ${b.title}`);
        s.style.cssText = `--c:${b.c};--h:${b.h};--i:${i}`;
        s.innerHTML = `<span class="book-n">${b.n}</span>`;
        el.appendChild(s);
      });
    }
    if (o.html === "note") {
      el.classList.add("note", `note-${o.tone}`); el.querySelector("p").innerHTML = o.text;
      if (o.tone !== "pink") el.querySelector(".tape").src = "assets/tape-gingham.webp";   // never pink tape on a pink note
    }
    else el.classList.add(o.html);
  }
  if (o.flame) el.insertAdjacentHTML("beforeend", `<span class="glow" style="left:${o.flame.fx * 100}%"></span><span class="flame" style="left:${o.flame.fx * 100}%"></span>`);
  if (o.steam) el.appendChild($("#tpl-steam").content.cloneNode(true));
  if (o.screen) {
    const [l, t, r, b] = o.screen, sc = document.createElement("div");
    sc.className = "screen";
    Object.assign(sc.style, { left: `${l * 100}%`, top: `${t * 100}%`, width: `${(r - l) * 100}%`, height: `${(b - t) * 100}%` });
    sc.appendChild($("#tpl-screen").content.cloneNode(true));
    el.appendChild(sc);
  }
  if (o.glow) el.insertAdjacentHTML("beforeend", `<span class="lampglow"></span>`);
  if (o.bulbglow) el.insertAdjacentHTML("beforeend", `<span class="bulbglow"></span>`);
  if (o.bulbs) BULBS.forEach(([bx, by], n) => el.insertAdjacentHTML("beforeend",
    `<span class="twinkle" style="left:${bx * 100}%;top:${by * 100}%;--d:${-((n * 1.3) % 3)}s;--t:${2.6 + (n % 3) * 0.6}s"></span>`));
  if (o.label) {   // clickable: a label on hover/focus, and an action or a section to go to (scroll.js handles both)
    el.classList.add("hot");
    el.tabIndex = 0; el.setAttribute("role", "button"); el.setAttribute("aria-label", o.label);
    el.dataset.label = o.label;
    if (o.go) el.dataset.go = o.go;
    if (o.act) el.dataset.act = o.act;
  }
  let shadow = null;
  if (o.shadow) { shadow = document.createElement("div"); shadow.className = "shadow"; scene.appendChild(shadow); }
  scene.appendChild(el);
  els.push({ o, el, shadow });
}

function layout() {
  const pm = portrait();
  for (const { o, el, shadow } of els) {
    const q = pm && o.p ? { ...o, ...o.p } : o;
    el.hidden = !!q.hide; if (shadow) shadow.hidden = !!q.hide;
    if (q.k) el.style.setProperty("--k", q.k);
    if (o.bulbs) el.style.setProperty("--g", `${Math.round(q.w * 0.24)}px`);   // bulb glow scales with the string
    const h = q.h || q.w / o.aspect;
    Object.assign(el.style, { left: `${q.x}px`, top: `${q.bottom - h}px`, width: `${q.w}px`, height: `${h}px` });
    if (shadow) {
      const sw = o.shadow * (q.w / o.w);
      Object.assign(shadow.style, { left: `${q.x + q.w / 2 - sw / 2}px`, top: `${q.bottom - sw * 0.05}px`, width: `${sw}px`, height: `${sw * 0.1}px` });
    }
  }
}

// Desktop: cover-fit the top 1920x1080 of the canvas.
// Portrait (phones): fit ~700 canvas px across so the poster fits, and let the floor run down the screen.
function fitScene() {
  const [vw, vh] = viewport();
  let s, ox, oy;
  if (portrait()) {
    s = Math.min(vw / 800, vh / 1700);   // 800 canvas px across: desk, lamp and wall pieces all fit
    ox = vw / 2 - 960 * s; oy = 0;
  } else {
    s = Math.max(vw / CANVAS.w, vh / CANVAS.view);
    ox = (vw - CANVAS.w * s) / 2; oy = (vh - CANVAS.view * s) / 2;
  }
  Object.assign(roomFit, { s, ox, oy, vw, vh });
  setView(s, ox, oy);
  layout();
  window.dispatchEvent(new Event("roomfit"));   // scroll.js re-applies its zoom on top of the new framing
}
function setView(s, ox, oy) {
  const r = document.documentElement.style;
  r.setProperty("--s", s); r.setProperty("--ox", `${ox}px`); r.setProperty("--oy", `${oy}px`);
}
const roomFit = { s: 1, ox: 0, oy: 0, vw: 0, vh: 0 };

// the iMac's display area in canvas pixels (scroll.js zooms into it)
function screenRect() {
  const m = ROOM.find((o) => o.id === "imac"), [l, t, r, b] = m.screen, h = m.w / m.aspect, top = m.bottom - h;
  return { x: m.x + l * m.w, y: top + t * h, w: (r - l) * m.w, h: (b - t) * h };
}

const bg = new Image(); bg.src = "assets/room.webp"; bg.alt = ""; bg.className = "room";
scene.appendChild(bg);
ROOM.forEach(make);
scene.appendChild(Object.assign(document.createElement("div"), { className: "light" }));
fitScene();
window.addEventListener("resize", fitScene);

// fade the room in once the images are painted (never wait more than 3 s)
const loaded = (i) => (i.complete && i.naturalWidth) ? Promise.resolve() : new Promise((r) => { i.onload = i.onerror = r; });
Promise.race([Promise.all([...scene.querySelectorAll("img")].map(loaded)), new Promise((r) => setTimeout(r, 3000))])
  .then(() => requestAnimationFrame(() => scene.classList.add("is-ready")));
