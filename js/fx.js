/* =============================================================================
   Sound: a soft click, a purr and a meow for the cat, and a gentle lo-fi loop for the
   record player. Everything is synthesised with the Web Audio API, so there are no audio
   files (and nothing to license). Sound starts only after the visitor's first click, as
   browsers require. The ♪ button in the nav turns all of it on or off (on phones it plays the music).
   ========================================================================== */

const Sound = (() => {
  let ctx = null, master = null;
  let on = true;
  try { on = localStorage.getItem("sound") !== "off"; } catch (e) { /* storage can be blocked */ }

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { /* older Safari */ }   // iPhones: play through the silent switch
      ctx = new AC(); master = ctx.createGain(); master.gain.value = on ? 1 : 0; master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  const noiseBuffer = (secs) => {
    const b = ctx.createBuffer(1, ctx.sampleRate * secs, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  };

  // a soft wooden "tock"
  function click() {
    if (!on || !audio()) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(950, t); o.frequency.exponentialRampToValueAtTime(420, t + 0.05);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.1);
  }

  // purr: low rumble pulsing ~24 times a second, breathing in and out twice
  function purr() {
    if (!on || !audio()) return;
    const t = ctx.currentTime, src = ctx.createBufferSource(); src.buffer = noiseBuffer(2.4);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 220;
    const am = ctx.createGain(), lfo = ctx.createOscillator(), depth = ctx.createGain();
    lfo.frequency.value = 24; depth.gain.value = 0.5; am.gain.value = 0.5; lfo.connect(depth).connect(am.gain);
    const env = ctx.createGain(); env.gain.setValueAtTime(0.0001, t);
    [[0.35, 0.5], [0.9, 0.12], [1.35, 0.55], [2.2, 0.0001]].forEach(([dt, v]) => env.gain.exponentialRampToValueAtTime(Math.max(v, 0.0001), t + dt));
    src.connect(lp).connect(am).connect(env).connect(master);
    src.start(t); lfo.start(t); src.stop(t + 2.4); lfo.stop(t + 2.4);
  }

  // a short, rising "mrrp"
  function meow() {
    if (!on || !audio()) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = "sawtooth"; o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(760, t + 0.18); o.frequency.linearRampToValueAtTime(600, t + 0.45);
    bp.type = "bandpass"; bp.frequency.setValueAtTime(1100, t); bp.frequency.linearRampToValueAtTime(1600, t + 0.2); bp.Q.value = 3;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(bp).connect(g).connect(master); o.start(t); o.stop(t + 0.55);
  }

  /* ---- music: warm electric-piano chords over a soft bass, brushed hats and vinyl crackle ---- */
  const CHORDS = [   // Fmaj7 · Em7 · Dm7 · Cmaj7 (MIDI notes)
    [53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59],
  ];
  const BPM = 72, BEAT = 60 / BPM;
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  let bus = null, timer = null, next = 0, step = 0, crackle = null;
  const playing = () => !!timer;

  function keys(m, t, len, vel) {
    [0, 7].forEach((det, k) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = k ? "sine" : "triangle"; o.frequency.value = hz(m + (k ? 12 : 0)); o.detune.value = k ? 4 : -3;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel * (k ? 0.25 : 1), t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g).connect(bus); o.start(t); o.stop(t + len + 0.05);
    });
  }
  function bass(m, t, len) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = hz(m - 12);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(bus); o.start(t); o.stop(t + len + 0.05);
  }
  function hat(t, vel) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuffer(0.08);
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 6000;
    const g = ctx.createGain(); g.gain.setValueAtTime(vel, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    s.connect(hp).connect(g).connect(bus); s.start(t);
  }
  function schedule() {
    while (next < ctx.currentTime + 0.4) {
      const bar = Math.floor(step / 8) % CHORDS.length, chord = CHORDS[bar], beat = step % 8;   // eighth notes
      if (beat === 0) { chord.forEach((m, i) => keys(m, next + i * 0.012, BEAT * 3.6, 0.055)); bass(chord[0], next, BEAT * 1.8); }
      if (beat === 5) keys(chord[2] + 12, next, BEAT * 1.2, 0.03);
      if (beat === 4) bass(chord[0] + 7, next, BEAT * 1.5);
      if (beat % 2 === 1) hat(next, beat === 3 || beat === 7 ? 0.02 : 0.012);
      next += BEAT / 2; step++;
    }
  }
  function startMusic() {
    if (!audio()) return;
    bus = ctx.createGain(); bus.gain.setValueAtTime(0.0001, ctx.currentTime); bus.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 1.2);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2200;   // warm, a little muffled
    bus.connect(lp).connect(master);
    crackle = ctx.createBufferSource(); const b = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() < 0.0009 ? (Math.random() * 2 - 1) * 0.6 : (Math.random() * 2 - 1) * 0.004;
    // the needle-drop crackle plays for the first few seconds, then fades out under the music
    const cg = ctx.createGain(), t0 = ctx.currentTime;
    cg.gain.setValueAtTime(1, t0); cg.gain.setValueAtTime(1, t0 + 3); cg.gain.linearRampToValueAtTime(0, t0 + 4.5);
    crackle.buffer = b; crackle.loop = true; crackle.connect(cg).connect(bus); crackle.start(); crackle.stop(t0 + 4.6);
    next = ctx.currentTime + 0.1; step = 0; schedule(); timer = setInterval(schedule, 120);
    document.documentElement.classList.add("music-on");
  }
  function stopMusic() {
    if (!timer) return;
    clearInterval(timer); timer = null;
    const b = bus, c = crackle, t = ctx.currentTime;
    b.gain.cancelScheduledValues(t); b.gain.setValueAtTime(b.gain.value, t); b.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    setTimeout(() => { try { c.stop(); b.disconnect(); } catch (e) { /* already stopped */ } }, 900);
    document.documentElement.classList.remove("music-on");
  }
  const toggleMusic = () => (playing() ? stopMusic() : startMusic(), playing());

  function setOn(v) {
    on = v;
    try { localStorage.setItem("sound", v ? "on" : "off"); } catch (e) { /* ignore */ }
    if (ctx) master.gain.setTargetAtTime(v ? 1 : 0, ctx.currentTime, 0.05);
    if (!v) stopMusic();
  }
  return { click, purr, meow, toggleMusic, playing, setOn, isOn: () => on };
})();
