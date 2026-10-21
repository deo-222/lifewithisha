/* =============================================================================
   Scroll: room → Work → About → Contact
   Desktop: the room pins while the camera pushes into the iMac; the screen fills the
   browser and dissolves into the Work heading, then the page scrolls on normally.
   Contact carries straight on from About on the same paper: the envelope rises in and the
   letter slides out of it as you scroll, then the megaphone floats in beside it.
   Phones: no pins, just a gentle push toward the screen as the room scrolls away.
   Reduced motion: no zoom at all.
   ========================================================================== */

const ZOOM = {
  length: 1.5,            // scroll distance of the zoom, in viewport heights
  push: [0.08, 0.86],     // camera move (progress range)
  fadeRoomText: [0, 0.2], // intro text + floating pieces leave first
  dissolve: [0.8, 0.97],  // screen → Work heading
  phonePush: 0.3,         // phones only travel this far into the zoom
};
const OUTRO = {
  length: 0.9,            // pinned scroll while the letter slides out, in viewport heights
  peek: 0.035,            // how much letter shows above the pocket before it rises (x envelope width)
  scrub: 1.2,             // seconds the animation takes to catch up with the scroll (higher = smoother)
};

gsap.registerPlugin(ScrollTrigger);
const handoff = document.querySelector(".handoff");
const workHead = document.querySelector("#work-head");
// the screen dissolves into an exact copy of the Work heading, which then hands over to the real one
const ghost = workHead.cloneNode(true);
ghost.removeAttribute("id");
ghost.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
ghost.querySelectorAll("a").forEach((a) => a.setAttribute("tabindex", "-1"));
handoff.appendChild(ghost);

// Camera: scale grows geometrically (feels like a steady push), and the screen's centre glides
// from where it sits in the room to the middle of the browser. p = 0 is the room, 1 is screen-filling.
const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
function camera({ s: s0, ox: ox0, oy: oy0, vw, vh }, p) {
  const r = screenRect(), cx = r.x + r.w / 2, cy = r.y + r.h / 2, e = ease(p);
  const s1 = Math.max(vw / r.w, vh / r.h) * 1.02;                     // screen covers the browser
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
}
window.addEventListener("roomfit", () => applyZoom(zoomP));

const range = ([a, b], p) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const fading = () => document.querySelectorAll('.obj.float, .obj[data-id="words"]');

const mm = gsap.matchMedia();

/* ---------------- desktop / landscape ---------------- */
mm.add("(min-aspect-ratio: 11/10) and (prefers-reduced-motion: no-preference)", () => {
  document.documentElement.classList.add("zoom-on");
  const st = ScrollTrigger.create({
    trigger: ".stage", start: "top top", end: () => `+=${innerHeight * ZOOM.length}`,
    pin: true, pinSpacing: false, scrub: 0.6, invalidateOnRefresh: true,
    onUpdate(self) {
      const p = self.progress;
      applyZoom(range(ZOOM.push, p));
      const t = range(ZOOM.fadeRoomText, p);
      fading().forEach((el) => { el.style.opacity = 1 - t; });
      handoff.style.opacity = range(ZOOM.dissolve, p);
      handoff.style.visibility = p > 0 ? "visible" : "hidden";
    },
  });
  return () => {
    st.kill(); applyZoom(0); handoff.style.opacity = 0;
    fading().forEach((el) => { el.style.opacity = ""; });
    document.documentElement.classList.remove("zoom-on");
  };
});

/* ---------------- phones / portrait ---------------- */
mm.add("(max-aspect-ratio: 11/10) and (prefers-reduced-motion: no-preference)", () => {
  const st = ScrollTrigger.create({
    trigger: ".stage", start: "top top", end: "bottom top", scrub: 0.4,
    onUpdate(self) {
      applyZoom(self.progress * ZOOM.phonePush);
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
  if (letterST) window.scrollTo({ top: letterST.end + 2, behavior: "smooth" });
  else env.classList.add("is-open");   // reduced motion: no animation, the letter is already out
});

mm.add("(min-aspect-ratio: 11/10) and (prefers-reduced-motion: no-preference)", () => {
  envelopeIn({ trigger: stageC, start: "top bottom", end: "top top", scrub: OUTRO.scrub, invalidateOnRefresh: true });
  letterOut({ trigger: stageC, start: "top top", end: () => `+=${innerHeight * OUTRO.length}`,
    pin: true, scrub: OUTRO.scrub, invalidateOnRefresh: true });
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
const calm = matchMedia("(prefers-reduced-motion: reduce)");
// only on a real tap or click: a touch that turns into a scroll is cancelled (or moves), so it doesn't sparkle
let press = null;
document.addEventListener("pointerdown", (e) => { press = { x: e.clientX, y: e.clientY, t: performance.now() }; }, { passive: true });
document.addEventListener("pointercancel", () => { press = null; }, { passive: true });
document.addEventListener("pointerup", (e) => {
  const p = press; press = null;
  if (!p || calm.matches || e.button > 0) return;
  if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10 || performance.now() - p.t > 600) return;
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
