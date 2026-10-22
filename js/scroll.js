/* =============================================================================
   Scroll: room → Work → About → Contact
   Desktop: the room pins and Isha's photo holds on the iMac for a while; then the photo fades
   into a small copy of the Work heading on the screen, and the camera pushes in until that
   screen is the page itself, then the page scrolls on normally.
   Contact carries straight on from About on the same paper: the envelope rises in and the
   letter slides out of it as you scroll, then the megaphone floats in beside it.
   Phones: no pins, just a gentle push toward the screen as the room scrolls away.
   Reduced motion: no zoom at all.
   ========================================================================== */

const ZOOM = {
  length: 1.6,            // scroll distance of the zoom, in viewport heights
  swap: [0.15, 0.3],      // after a short hold, the photo on the screen fades into the Work heading
  fadeRoomText: [0.3, 0.38], // intro text + floating pieces stay until the camera moves, then fade quickly as it
                             // starts: their text and shadows are costly to redraw while the camera scales them
  push: [0.3, 0.92],      // camera move (progress range)
  dissolve: [0.92, 0.921], // once the camera has fully arrived, the full-size copy takes over in one step: the two
                           // line up exactly, and a cross-fade would show both copies' slightly different letter
                           // edges at once. The last stretch is still, so the page never moves before the hand-off.
  phonePush: 0.3,         // phones only travel this far into the zoom
  chair: [0, 0.14],       // the chair swings round to face the screen as soon as the scroll starts
};
const OUTRO = {
  length: 0.9,            // pinned scroll while the letter slides out, in viewport heights
  peek: 0.035,            // how much letter shows above the pocket before it rises (x envelope width)
  scrub: 1.2,             // seconds the animation takes to catch up with the scroll (higher = smoother)
};

gsap.registerPlugin(ScrollTrigger);
const calm = matchMedia("(prefers-reduced-motion: reduce)");
// Smooth scrolling (Lenis): the page glides after the wheel or trackpad instead of stepping. Lenis runs on
// GSAP's clock and tells ScrollTrigger about every step, so pins and animations always move with it.
// Touch screens keep their own native scrolling; reduced motion gets none.
const lenis = calm.matches ? null : new Lenis({ lerp: 0.085 });
if (lenis) {
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}
const scrollToY = (y) => (lenis ? lenis.scrollTo(y) : window.scrollTo({ top: y, behavior: "smooth" }));
// Getting around: in-page links (nav, case pills) and the room's objects all go through goTo().
// From the room, it first plays the zoom into the screen at an even pace (so "about" or "contact"
// get the same entrance as "work"), then glides on to the section.
let zoomST = null;   // the room's zoom trigger, on desktop
const scrollPos = () => (lenis ? lenis.scroll : window.scrollY);
const inOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);   // power2.inOut
let gliding = null;   // the current glide, so the visitor's own scrolling can take over at once
function glide(to, dur, onComplete) {
  stopGlide();
  const me = (gliding = { tween: null });
  const done = () => { if (gliding === me) { gliding = null; if (onComplete) onComplete(); } };
  if (lenis) return lenis.scrollTo(to, { duration: dur, easing: inOut, force: true, onComplete: done });
  const o = { y: window.scrollY };
  me.tween = gsap.to(o, { y: to, duration: dur, ease: "power2.inOut", onUpdate: () => window.scrollTo(0, o.y), onComplete: done });
}
// any scrolling of their own cancels a glide (and the second leg queued after it), instead of fighting it
const stopGlide = () => { if (gliding) { if (gliding.tween) gliding.tween.kill(); gliding = null; } };
addEventListener("wheel", stopGlide, { passive: true });
addEventListener("touchstart", stopGlide, { passive: true });
addEventListener("keydown", (e) => { if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)) stopGlide(); });
function goTo(sel) {
  const t = document.querySelector(sel); if (!t) return;
  const y = t.getBoundingClientRect().top + window.scrollY;
  const cur = scrollPos(), legTime = (d) => Math.min(2.2, 0.6 + (Math.abs(d) / innerHeight) * 0.22);
  if (calm.matches) return window.scrollTo(0, y);
  if (zoomST && cur < zoomST.end - 4 && y > zoomST.end - 4) {
    glide(zoomST.end, 2, () => { if (Math.abs(y - zoomST.end) > 4) glide(y, legTime(y - zoomST.end)); });
  } else glide(y, legTime(y - cur));
}
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || !document.querySelector(a.getAttribute("href"))) return;
  e.preventDefault();
  goTo(a.getAttribute("href"));
});
const handoff = document.querySelector(".handoff");
const workHead = document.querySelector("#work-head");
// the screen dissolves into an exact copy of the Work heading, which then hands over to the real one
const ghost = workHead.cloneNode(true);
ghost.removeAttribute("id");
ghost.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
ghost.querySelectorAll("a").forEach((a) => a.setAttribute("tabindex", "-1"));
handoff.appendChild(ghost);
// and a second copy lives on the iMac screen: laid out at browser size, shrunk by the camera's
// final zoom, so when the camera arrives the screen shows exactly the page underneath it
const site = document.createElement("div"), sitePage = document.createElement("div");
site.className = "screen-site"; site.setAttribute("aria-hidden", "true");
sitePage.className = "screen-page"; sitePage.appendChild(ghost.cloneNode(true));
site.appendChild(sitePage);
document.querySelector(".screen").appendChild(site);
const photo = document.querySelector(".screen-pol");
document.documentElement.style.setProperty("--zoom-len", ZOOM.length);

// Camera: scale grows geometrically (feels like a steady push), and the screen's centre glides
// from where it sits in the room to the middle of the browser. p = 0 is the room, 1 is screen-filling.
const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const endScale = (vw, vh, r = screenRect()) => Math.max(vw / r.w, vh / r.h) * 1.02;   // screen covers the browser
function camera({ s: s0, ox: ox0, oy: oy0, vw, vh }, p) {
  const r = screenRect(), cx = r.x + r.w / 2, cy = r.y + r.h / 2, e = ease(p);
  const s1 = endScale(vw, vh, r);
  const s = s0 * Math.pow(s1 / s0, e);
  const px = ox0 + cx * s0 + (vw / 2 - (ox0 + cx * s0)) * e;
  const py = oy0 + cy * s0 + (vh / 2 - (oy0 + cy * s0)) * e;
  return { s, ox: px - cx * s, oy: py - cy * s };
}
let zoomP = 0;
function applyZoom(p) {
  zoomP = p;
  const v = camera(roomFit, p);
  setView(v.s, v.ox, v.oy);
  cull(v);
}
// The cut-outs' drop shadows are costly to redraw at every step of the zoom, so anything the
// camera has pushed fully out of the browser is hidden until it comes back into view.
function cull({ s, ox, oy }) {
  const { vw, vh } = roomFit, pad = 60;   // canvas px of slack for shadows and floating pieces
  for (const { el, shadow } of els) {
    const x0 = ox + (el.offsetLeft - pad) * s, y0 = oy + (el.offsetTop - pad) * s;
    const x1 = ox + (el.offsetLeft + el.offsetWidth + pad) * s, y1 = oy + (el.offsetTop + el.offsetHeight + pad) * s;
    const out = x1 < 0 || y1 < 0 || x0 > vw || y0 > vh;
    el.classList.toggle("culled", out);
    if (shadow) shadow.classList.toggle("culled", out);
  }
}
function sizeSite() {
  const { vw, vh } = roomFit;
  Object.assign(sitePage.style, { width: `${vw}px`, height: `${vh}px`, transform: `translate(-50%, -50%) scale(${1 / endScale(vw, vh)})` });
}
sizeSite();
window.addEventListener("roomfit", () => { sizeSite(); applyZoom(zoomP); });

const range = ([a, b], p) => Math.min(1, Math.max(0, (p - a) / (b - a)));
// as the visit starts, the hint fades
const hint = document.querySelector(".room-hint");
function roomStart(t) {
  hint.style.opacity = 1 - range([0, 0.6], t);
  document.documentElement.classList.toggle("zoomed", t > 0.02);   // labels and pulses step aside once the zoom starts
}
const fading = () => document.querySelectorAll('.obj.float, .obj[data-id="words"]');

const mm = gsap.matchMedia();

/* ---------------- desktop / landscape ---------------- */
mm.add("(min-aspect-ratio: 11/10) and (prefers-reduced-motion: no-preference)", () => {
  document.documentElement.classList.add("zoom-on");
  const st = zoomST = ScrollTrigger.create({
    trigger: ".stage", start: "top top", end: () => `+=${innerHeight * ZOOM.length}`,
    pin: true, pinSpacing: false, scrub: true, invalidateOnRefresh: true,   // no extra lag: Lenis already smooths it
    onUpdate(self) {
      const p = self.progress;
      applyZoom(range(ZOOM.push, p));
      roomStart(range(ZOOM.chair, p));
      const t = range(ZOOM.fadeRoomText, p);
      fading().forEach((el) => { el.style.opacity = 1 - t; el.style.visibility = t >= 1 ? "hidden" : ""; });   // gone = not drawn
      const w = range(ZOOM.swap, p);
      site.style.opacity = w; photo.style.opacity = 1 - w;
      const h = range(ZOOM.dissolve, p);
      handoff.style.opacity = h;
      // once the copy has taken over, the room behind it is hidden, so a slow frame can never show it through
      document.documentElement.classList.toggle("handed", h >= 1);
    },
  });
  return () => {
    zoomST = null; roomStart(0);
    st.kill(); applyZoom(0); handoff.style.opacity = 0; site.style.opacity = 0; photo.style.opacity = "";
    document.documentElement.classList.remove("handed");
    fading().forEach((el) => { el.style.opacity = ""; el.style.visibility = ""; });
    document.documentElement.classList.remove("zoom-on");
  };
});

/* ---------------- phones / portrait ---------------- */
mm.add("(max-aspect-ratio: 11/10) and (prefers-reduced-motion: no-preference)", () => {
  const st = ScrollTrigger.create({
    trigger: ".stage", start: "top top", end: "bottom top", scrub: 0.4,
    onUpdate(self) {
      applyZoom(self.progress * ZOOM.phonePush);
      roomStart(range([0, 0.15], self.progress));
      fading().forEach((el) => { el.style.opacity = 1 - range([0, 0.5], self.progress); });
    },
  });
  return () => { st.kill(); applyZoom(0); fading().forEach((el) => { el.style.opacity = ""; }); };
});

/* ---------------- Contact: the envelope arrives, the letter slides out ---------------- */
const stageC = document.querySelector(".contact-stage"), mega = stageC.querySelector(".mega"),
  env = stageC.querySelector(".envelope"), letter = stageC.querySelector(".letter");
// letter starts tucked so only its top edge shows above the pocket
const tuck = () => {
  const ew = env.offsetWidth, pocketDepth = env.offsetHeight * 0.38 - ew * 0.098;
  return Math.max(0, letter.offsetHeight - pocketDepth - ew * OUTRO.peek);
};
// megaphone rests just right of the letter's top corner
function placeMega() {
  const vw = stageC.clientWidth, ew = env.offsetWidth, envLeft = vw / 2 - ew / 2;
  const letterTop = env.offsetTop + env.offsetHeight - ew * 0.098 - letter.offsetHeight;
  const w = Math.min(ew * 0.24, 120);
  Object.assign(mega.style, { width: `${w}px`, left: `${Math.min(vw - w * 1.05, envLeft + ew * 0.83)}px`, top: `${Math.max(70, letterTop - w * 0.25)}px` });
}
placeMega();
window.addEventListener("resize", placeMega);

// 1) the envelope rises while the Contact screen scrolls up into view (no blank screen in between)
function envelopeIn(scrollTrigger) {
  // starts higher up its section and settles as you scroll, so it peeks out as soon as Contact appears
  return gsap.fromTo(env, { xPercent: -50, y: () => -innerHeight * 0.3, rotation: -2 },
    { xPercent: -50, y: 0, rotation: 0, ease: "none", scrollTrigger });
}
// 2) then the letter slides out, and the megaphone pops in at the end
let letterST = null;   // the letter's scroll trigger, so a click can play it too
function letterOut(scrollTrigger) {
  const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger,
    onUpdate: () => env.classList.toggle("is-open", tl.progress() > 0.4) });
  letterST = tl.scrollTrigger;
  return tl
    .fromTo(letter, { y: tuck }, { y: 0, duration: 0.8, ease: "power1.inOut" }, 0)
    .fromTo(letter, { rotation: 0 }, { rotation: 1.4, duration: 0.4, ease: "sine.out", yoyo: true, repeat: 1 }, 0)   // a slight lean while it's pulled
    .fromTo(mega, { opacity: 0, scale: 0.6, rotation: 12, y: 30 }, { opacity: 1, scale: 1, rotation: -14, y: 0, duration: 0.25, ease: "back.out(1.7)" }, 0.75);
}

// for anyone who doesn't think to scroll: clicking the envelope glides the page to the point
// where the letter is fully out, so the scroll and the letter stay in step
env.querySelector(".env-open").addEventListener("click", () => {
  if (letterST) scrollToY(letterST.end + 2);
  else env.classList.add("is-open");   // reduced motion: no animation, the letter is already out
});

mm.add("(min-aspect-ratio: 11/10) and (prefers-reduced-motion: no-preference)", () => {
  const scrub = lenis ? true : OUTRO.scrub;   // with smooth scrolling, scrub lag would let the pin and the letter drift apart
  envelopeIn({ trigger: stageC, start: "top bottom", end: "top top", scrub, invalidateOnRefresh: true });
  letterOut({ trigger: stageC, start: "top top", end: () => `+=${innerHeight * OUTRO.length}`,
    pin: true, scrub, invalidateOnRefresh: true });
});
// phones: no pin. Both play as the Contact screen scrolls up into view.
mm.add("(max-aspect-ratio: 11/10) and (prefers-reduced-motion: no-preference)", () => {
  envelopeIn({ trigger: stageC, start: "top bottom", end: "top 35%", scrub: OUTRO.scrub, invalidateOnRefresh: true });
  letterOut({ trigger: stageC, start: "top 40%", end: "bottom bottom", scrub: OUTRO.scrub, invalidateOnRefresh: true });
});

// the nav gets a paper background while the paper pages are underneath it
ScrollTrigger.create({ trigger: "#work-head", start: "top 1px", end: () => ScrollTrigger.maxScroll(window) + 1,   // stays on at the very bottom
  toggleClass: { targets: ".topnav", className: "solid" } });

/* ---------------- Work: pieces pop in, reels play on view ---------------- */
mm.add("(prefers-reduced-motion: no-preference)", () => {
  gsap.utils.toArray(".case, .compact").forEach((c) => {
    gsap.from(c.querySelectorAll(".case-head > *, .story, .compact > .pill, .compact-head, .compact-hook"), {
      y: 28, opacity: 0, duration: 0.7, ease: "power2.out", stagger: 0.08,
      scrollTrigger: { trigger: c, start: "top 78%" },
    });
    if (c.querySelector(".case-stats")) gsap.from(c.querySelectorAll(".stat"), {   // results land like sticky notes being slapped on
      scale: 0.55, opacity: 0, rotation: () => gsap.utils.random(-14, 14), duration: 0.55, ease: "back.out(2.2)", stagger: 0.09,
      // replays every time the notes come into view, from above or below
      scrollTrigger: { trigger: c.querySelector(".case-stats"), start: "top 85%", end: "bottom 15%", toggleActions: "restart none restart none" },
    });
    gsap.from(c.querySelectorAll(".pol"), {
      y: 50, opacity: 0, duration: 0.7, ease: "power2.out", stagger: 0.07,
      scrollTrigger: { trigger: c.querySelector(".rail"), start: "top 88%" },
    });
  });
});

mm.add("(prefers-reduced-motion: no-preference)", () => {
  gsap.from(".award", { y: 40, opacity: 0, rotation: () => gsap.utils.random(-6, 6), duration: 0.6, ease: "back.out(1.6)", stagger: 0.08,
    scrollTrigger: { trigger: ".award-list", start: "top 85%" } });
  gsap.from(".about-pic", { y: 50, opacity: 0, rotation: 6, duration: 0.8, ease: "power3.out",
    scrollTrigger: { trigger: ".about-pic", start: "top 85%" } });
  gsap.from(".about-copy > *", { y: 26, opacity: 0, duration: 0.7, ease: "power2.out", stagger: 0.08,
    scrollTrigger: { trigger: ".about-copy", start: "top 80%" } });
  gsap.from(".skill", {          // skills drop onto the wall one by one
    y: -70, opacity: 0, rotation: () => gsap.utils.random(-18, 18), duration: 0.6, ease: "back.out(1.8)", stagger: 0.06,
    scrollTrigger: { trigger: ".skills", start: "top 82%", end: "bottom 18%", toggleActions: "restart none restart none" } });   // replays on every pass
  gsap.from(".tools li", { y: 16, opacity: 0, duration: 0.4, stagger: 0.03, scrollTrigger: { trigger: ".tools", start: "top 90%" } });
});

const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  const v = e.target;
  if (e.isIntersecting) { v.preload = "auto"; v.play().catch(() => {}); } else v.pause();
}), { threshold: 0.6 });
document.querySelectorAll(".pol-reel video").forEach((v) => io.observe(v));
document.querySelectorAll(".reel-sound").forEach((b) => b.addEventListener("click", () => {
  const v = b.parentElement.querySelector("video"), on = v.muted;
  document.querySelectorAll(".pol-reel video").forEach((x) => { x.muted = true; });
  document.querySelectorAll(".reel-sound").forEach((x) => { x.textContent = "sound off"; x.setAttribute("aria-pressed", "false"); });
  v.muted = !on; if (on) { v.play().catch(() => {}); b.textContent = "sound on"; b.setAttribute("aria-pressed", "true"); }
}));

// story tabs: click or arrow keys to switch between challenge / insight / idea
document.querySelectorAll(".story-tabs").forEach((list) => {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const select = (t) => tabs.forEach((x) => {
    const on = x === t;
    x.setAttribute("aria-selected", on); x.tabIndex = on ? 0 : -1;
    document.getElementById(x.getAttribute("aria-controls")).hidden = !on;
  });
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(t));
    t.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      const n = tabs[(i + d + tabs.length) % tabs.length]; select(n); n.focus(); e.preventDefault();
    });
  });
});

// strips that are wider than the screen get a hint, arrows and a soft fade on the edge with more to see.
// 06–08 sit side by side, so they share one control that moves all three strips together.
function railControls(rails, after) {
  const nav = document.createElement("div");
  nav.className = "rail-nav";
  nav.innerHTML = '<button type="button" class="rail-btn" data-dir="-1" aria-label="Scroll back">←</button>'
    + '<span class="rail-hint">scroll for more</span>'
    + '<button type="button" class="rail-btn" data-dir="1" aria-label="Scroll for more">→</button>';
  after.after(nav);
  const [prev, next] = nav.querySelectorAll(".rail-btn");
  const max = (r) => r.scrollWidth - r.clientWidth;
  const update = () => {
    rails.forEach((r) => {
      r.classList.toggle("more-left", r.scrollLeft > 8);
      r.classList.toggle("more-right", r.scrollLeft < max(r) - 8);
    });
    const live = rails.filter((r) => max(r) >= 8);
    nav.hidden = !live.length;
    prev.disabled = live.every((r) => r.scrollLeft < 8);
    next.disabled = live.every((r) => r.scrollLeft > max(r) - 8);
    nav.classList.toggle("untouched", live.every((r) => r.scrollLeft < 8));
  };
  // step one polaroid at a time, so it lines up with the snapping
  const step = (rail, dir) => {
    const pad = parseFloat(getComputedStyle(rail).scrollPaddingLeft) || 0, x = rail.scrollLeft;
    const r0 = rail.getBoundingClientRect().left;
    const starts = [...rail.children].map((c) => c.getBoundingClientRect().left - r0 + x - pad);
    const target = dir > 0 ? starts.find((s) => s > x + 8) : [...starts].reverse().find((s) => s < x - 8);
    rail.scrollTo({ left: target ?? (dir > 0 ? rail.scrollWidth : 0), behavior: "smooth" });
  };
  nav.addEventListener("click", (e) => {
    const b = e.target.closest(".rail-btn"); if (!b) return;
    rails.forEach((r) => step(r, +b.dataset.dir));
  });
  rails.forEach((r) => {
    r.addEventListener("scroll", update, { passive: true });
    new ResizeObserver(update).observe(r);
    r.querySelectorAll("img, video").forEach((m) => m.addEventListener("load", update));
  });
  update();
}
const trio = document.querySelector(".trio");
if (trio) railControls([...trio.querySelectorAll(".rail")], trio);
document.querySelectorAll(".rail").forEach((r) => { if (!trio || !trio.contains(r)) railControls([r], r); });

// a little burst of glitter stars wherever someone clicks
const STARS = [0, 1, 2, 3, 4, 5].map((i) => `assets/star-${i}.webp`);
// only on a real tap or click: a touch that turns into a scroll is cancelled (or moves), so it doesn't sparkle
let press = null;
document.addEventListener("pointerdown", (e) => { press = { x: e.clientX, y: e.clientY, t: performance.now() }; }, { passive: true });
document.addEventListener("pointercancel", () => { press = null; }, { passive: true });
document.addEventListener("pointerup", (e) => {
  const p = press; press = null;
  if (!p || calm.matches || e.button > 0) return;
  if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10 || performance.now() - p.t > 600) return;
  Sound.click();
  const n = 6 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const s = document.createElement("img");
    s.src = STARS[Math.floor(Math.random() * STARS.length)]; s.alt = ""; s.className = "click-star";
    const size = 6 + Math.random() * 6;                                   // small: 6–12px
    Object.assign(s.style, { left: `${e.clientX}px`, top: `${e.clientY}px`, width: `${size}px` });
    document.body.appendChild(s);
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.6, d = 20 + Math.random() * 24;
    const dur = gsap.utils.random(0.6, 0.9);
    gsap.fromTo(s, { x: -size / 2, y: -size / 2, scale: 0.3, rotation: 0 },
      { x: Math.cos(a) * d - size / 2, y: Math.sin(a) * d - size / 2 + 10, scale: 1, rotation: gsap.utils.random(-120, 120),
        duration: dur, ease: "power2.out", onComplete: () => s.remove() });
    gsap.to(s, { opacity: 0, duration: dur * 0.4, delay: dur * 0.6, ease: "power1.in" });   // fully lit for most of the flight
    // shine: the glitter flickers as it catches the light
    gsap.fromTo(s, { "--shine": 1 }, { "--shine": 1.2, duration: 0.08, repeat: Math.round(dur / 0.08) - 1, yoyo: true, ease: "none", delay: Math.random() * 0.08 });
  }
  // a few white four-point glints flash in among the stars
  for (let i = 0; i < 3; i++) {
    const g = document.createElement("span"); g.className = "click-glint";
    const size = 6 + Math.random() * 5, a = Math.random() * Math.PI * 2, d = 8 + Math.random() * 24;
    Object.assign(g.style, { left: `${e.clientX + Math.cos(a) * d}px`, top: `${e.clientY + Math.sin(a) * d}px`, width: `${size}px`, height: `${size}px` });
    document.body.appendChild(g);
    gsap.fromTo(g, { xPercent: -50, yPercent: -50, scale: 0, rotation: 0, opacity: 1 },
      { scale: 1, rotation: 45, duration: 0.18, delay: 0.05 + i * 0.09, ease: "power2.out", yoyo: true, repeat: 1, onComplete: () => g.remove() });
  }
}, { passive: true });

// While the page is moving, objects slide under a still mouse pointer; without this they'd keep
// flicking into their hover state (labels flashing, pictures re-brightening) mid-scroll.
ScrollTrigger.addEventListener("scrollStart", () => document.documentElement.classList.add("is-scrolling"));
ScrollTrigger.addEventListener("scrollEnd", () => document.documentElement.classList.remove("is-scrolling"));

/* ---------------- the room: every labelled object does something ---------------- */
const roomScene = document.getElementById("scene");
const touch = matchMedia("(hover: none)");
let pets = 0;
// outside links open as an ordinary new-tab link: Safari treats window.open with options as a pop-up and can block it
function openTab(href) {
  Object.assign(document.createElement("a"), { href, target: "_blank", rel: "noopener noreferrer" }).click();
}
// the playlist pop-up: Spotify's embedded player on the page, which works where their full web player can load blank
const playlist = document.querySelector(".playlist"), playlistFrame = playlist.querySelector("iframe");
let playlistFrom = null;
function openPlaylist() {
  if (!playlistFrame.src) playlistFrame.src = "https://open.spotify.com/embed/playlist/3FPbDSFnM1eKzWLVyRI7tx?theme=0";
  if (Sound.playing()) ACTS.music();   // one soundtrack at a time
  playlistFrom = document.activeElement;
  playlist.hidden = false;
  if (lenis) lenis.stop();
  playlist.querySelector(".playlist-close").focus();
}
function closePlaylist() {
  if (playlist.hidden) return;
  playlist.hidden = true;
  if (lenis) lenis.start();
  if (playlistFrom) playlistFrom.focus({ preventScroll: true });
}
playlist.addEventListener("click", (e) => { if (e.target === playlist || e.target.closest(".playlist-close")) closePlaylist(); });
addEventListener("keydown", (e) => { if (e.key === "Escape") closePlaylist(); });
const ACTS = {
  cat(el) {
    pets++;
    if (pets % 3 === 0) Sound.meow(); else Sound.purr();
    gsap.fromTo(el, { scaleY: 0.95, scaleX: 1.02 }, { scaleY: 1, scaleX: 1, duration: 0.8, ease: "elastic.out(1, 0.4)", transformOrigin: "50% 100%" });
    for (let i = 0; i < 3; i++) {   // a few hearts drift up from the cat
      const h = document.createElement("span"); h.className = "heart"; h.textContent = "♡";
      Object.assign(h.style, { left: `${el.offsetLeft + el.offsetWidth * (0.35 + 0.3 * Math.random())}px`, top: `${el.offsetTop + el.offsetHeight * 0.1}px` });
      roomScene.appendChild(h);
      gsap.fromTo(h, { y: 0, opacity: 0, scale: 0.6 }, { y: -90 - Math.random() * 40, x: (Math.random() - 0.5) * 50, opacity: 1, scale: 1,
        duration: 1.4, delay: i * 0.18, ease: "power1.out", onComplete: () => h.remove() });
      gsap.to(h, { opacity: 0, duration: 0.5, delay: i * 0.18 + 0.9 });
    }
  },
  lamp() { roomScene.classList.toggle("lamp-off"); },
  candle(el) {
    if (el.classList.contains("out")) return;
    el.classList.add("out");
    const s = document.createElement("span"); s.className = "smoke"; el.appendChild(s);
    setTimeout(() => { el.classList.remove("out"); s.remove(); }, 2600);   // and it lights itself again
  },
  spotify() { openPlaylist(); },
  mail() { window.location.href = "mailto:deoisha278@gmail.com?subject=" + encodeURIComponent("Let's set up a chat"); },
  linkedin() { openTab("https://www.linkedin.com/in/ishadeo27"); },
  music() {
    if (!Sound.isOn()) setSound(true);
    Sound.toggleMusic();
    showMusic();
  },
};
function roomAct(el) {
  if (el.dataset.go) goTo(el.dataset.go);
  else if (ACTS[el.dataset.act]) ACTS[el.dataset.act](el);
  if (touch.matches) showTapLabel(el.dataset.label);
}
// Touch screens have no hover, so a tap shows the piece's label for a moment in one fixed spot near the
// bottom of the room, where it can't run off the screen or land on top of another piece.
const tapLabel = document.querySelector(".tap-label");
let tapTimer = null;
function showTapLabel(text) {
  tapLabel.textContent = text; tapLabel.classList.add("on");
  clearTimeout(tapTimer); tapTimer = setTimeout(() => tapLabel.classList.remove("on"), 1600);
}
roomScene.addEventListener("click", (e) => {
  const el = e.target.closest(".hot"); if (el) roomAct(el);
});
roomScene.addEventListener("keydown", (e) => {
  const el = e.target.closest(".obj.hot");   // books are real buttons and get Enter/Space for free
  if (el && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); roomAct(el); }
});

/* ---------------- the ♪ button: all sound on or off ---------------- */
// The ♪ button: on desktop it turns all sound on or off (the record player plays the music).
// Phones have no record player, so there it plays and pauses the music instead.
const soundBtn = document.querySelector(".sound-toggle");
const phone = matchMedia("(max-aspect-ratio: 11/10)");
function showMusic() {
  const now = Sound.playing();
  document.querySelectorAll('[data-act="music"]').forEach((m) => {
    m.dataset.label = now ? "pause music" : "play music"; m.setAttribute("aria-label", m.dataset.label);
  });
  if (!phone.matches) {
    const v = Sound.isOn();
    soundBtn.setAttribute("aria-pressed", v); soundBtn.setAttribute("aria-label", v ? "Sound on" : "Sound off");
    soundBtn.textContent = v ? "♪ on" : "♪ off";
  } else {
    soundBtn.setAttribute("aria-pressed", now); soundBtn.setAttribute("aria-label", now ? "Pause music" : "Play music");
    soundBtn.textContent = now ? "♪ stop" : "♪ play";
  }
}
function setSound(v) { Sound.setOn(v); showMusic(); }
showMusic();
phone.addEventListener("change", showMusic);
soundBtn.addEventListener("click", () => (phone.matches ? ACTS.music() : setSound(!Sound.isOn())));
