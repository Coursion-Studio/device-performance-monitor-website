(() => {
  "use strict";

  const cfg = window.STAGE || {};
  const root = document.documentElement;
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const frozen = new URLSearchParams(location.search).has("static");
  const calm = () => still.matches || frozen;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const typing = (el) => el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);

  if (frozen) root.classList.add("reveal-all", "static");
  if (cfg.download) $$("[data-download]").forEach((a) => { a.href = cfg.download; });

  function watch(el, enter, leave, threshold = 0.35) {
    if (!el) return;
    if (!("IntersectionObserver" in window)) { enter(); return; }
    new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? enter() : leave && leave()));
    }, { threshold }).observe(el);
  }

  $$(".reveal").forEach((el) => {
    if (el.classList.contains("stage-hero")) {
      requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.add("in"); clearTimeout(window.__rv); }));
      return;
    }
    watch(el, () => el.classList.add("in"), null, 0.12);
  });
  $$("[data-live]").forEach((el) => {
    if (frozen) return;
    watch(el, () => el.classList.add("live"), () => el.classList.remove("live"), 0);
  });

  class Spring {
    constructor(value, response = 0.45, damping = 0.85) {
      this.x = value; this.v = 0; this.target = value;
      this.tune(response, damping);
    }
    tune(response, damping) {
      this.k = Math.pow((2 * Math.PI) / response, 2);
      this.c = (4 * Math.PI * damping) / response;
      return this;
    }
    to(target, velocity) {
      this.target = target;
      if (velocity !== undefined) this.v = velocity;
      return this;
    }
    jump(value) { this.x = this.target = value; this.v = 0; return this; }
    step(dt) {
      const a = -this.k * (this.x - this.target) - this.c * this.v;
      this.v += a * dt;
      this.x += this.v * dt;
    }
    get settled() { return Math.abs(this.x - this.target) < 0.01 && Math.abs(this.v) < 0.05; }
  }

  const tasks = new Set();
  let last = 0;
  function frame(now) {
    const dt = Math.min(0.064, (now - last) / 1000 || 0.016);
    last = now;
    tasks.forEach((task) => {
      const steps = Math.ceil(dt / (1 / 240));
      for (let i = 0; i < steps; i++) task.springs.forEach((s) => s.step(dt / steps));
      task.render();
      if (task.springs.every((s) => s.settled)) {
        task.springs.forEach((s) => s.jump(s.target));
        task.render();
        tasks.delete(task);
      }
    });
    if (tasks.size) requestAnimationFrame(frame);
  }
  function run(task) {
    if (!tasks.size) { last = performance.now(); requestAnimationFrame(frame); }
    tasks.add(task);
  }

  const PAL = window.STAGE_PALETTES || { default: null, palettes: [] };
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const lum = (hex) => {
    const c = rgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const onAccent = (hex) => (1.05 / (lum(hex) + 0.05) >= (lum(hex) + 0.05) / 0.0533 ? "#FFFFFF" : "#0B0A0C");
  const PAL_VARS = ["--pal-base", "--pal-accent", "--pal-second", "--pal-s1", "--pal-s2", "--pal-s3", "--pal-text", "--pal-text2", "--pal-text3", "--pal-chip", "--pal-rule", "--pal-border", "--on-accent"];
  const look = {
    palette: PAL.palettes.find((p) => p.id === (cfg.palette || PAL.default)) || PAL.palettes[0],
    mat: cfg.material || "glass"
  };

  function applyLook() {
    const p = look.palette;
    if (!p) return;
    const vars = {
      "--pal-base": p.base, "--pal-accent": p.accent, "--pal-second": p.second,
      "--pal-s1": p.stops[0] || "transparent", "--pal-s2": p.stops[1] || "transparent", "--pal-s3": p.stops[2] || "transparent",
      "--pal-text": p.fg.text, "--pal-text2": p.fg.text2, "--pal-text3": p.fg.text3,
      "--pal-chip": p.fg.chip, "--pal-rule": p.fg.rule, "--pal-border": p.fg.border,
      "--on-accent": onAccent(p.accent)
    };
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
    $$(".lp:not(.ghost)").forEach((el) => {
      el.dataset.mat = look.mat;
      el.toggleAttribute("data-light", p.light);
    });
  }
  applyLook();

  $$(".fan").forEach((fan) => {
    const items = $$(".fan-item", fan);
    const n = items.length;
    items.forEach((el, i) => {
      const deg = 162 + (18 - 162) * (n > 1 ? i / (n - 1) : 0.5);
      const rad = (deg * Math.PI) / 180;
      el.style.setProperty("--i", i);
      el.style.setProperty("--x", (Math.cos(rad) * 262).toFixed(1));
      el.style.setProperty("--y", (18 + Math.sin(rad) * 112).toFixed(1));
      el.style.setProperty("--r", ((90 - deg) * -0.07).toFixed(2) + "deg");
    });
  });

  const GLYPHS = {
    compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z" fill="currentColor"/>',
    mail: '<rect x="3.5" y="6" width="17" height="12" rx="2"/><path d="m4 7 8 6 8-6"/>',
    notes: '<path d="M7 4.5h10v15H7z"/><path d="M9.5 9h5M9.5 12h5M9.5 15h3"/>',
    music: '<path d="M10 17V6.5l9-2V15"/><circle cx="7.5" cy="17" r="2.5"/><circle cx="16.5" cy="15" r="2.5"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 9.5h16M8.5 3.5v3M15.5 3.5v3"/>',
    terminal: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="m7.5 10 2.5 2-2.5 2M12 15h4.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M6 6l1.8 1.8M16.2 16.2 18 18M6 18l1.8-1.8M16.2 7.8 18 6"/>',
    doc: '<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4"/>',
    calc: '<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>'
  };
  const svg = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[name] || GLYPHS.doc}</svg>`;

  function evaluate(src) {
    const s = src.replace(/×/g, "*").replace(/÷/g, "/").replace(/(\d)\s*x\s*(?=[\d(.])/gi, "$1*").replace(/,/g, "");
    if (!/\d/.test(s) || !/[-+*/^%()]/.test(s.replace(/^\s*-/, ""))) return null;
    let i = 0;
    const peek = () => { while (s[i] === " ") i++; return s[i]; };
    const fail = () => { throw 0; };
    const number = () => {
      peek();
      const m = /^(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/i.exec(s.slice(i));
      if (!m) fail();
      i += m[0].length;
      return parseFloat(m[0]);
    };
    const primary = () => {
      if (peek() === "(") { i++; const v = expr(); if (peek() !== ")") fail(); i++; return v; }
      return number();
    };
    const postfix = () => { let v = primary(); while (peek() === "%") { i++; v /= 100; } return v; };
    const power = () => { const b = postfix(); if (peek() === "^") { i++; return Math.pow(b, unary()); } return b; };
    const unary = () => {
      const c = peek();
      if (c === "-") { i++; return -unary(); }
      if (c === "+") { i++; return unary(); }
      return power();
    };
    const term = () => {
      let v = unary();
      for (let c = peek(); c === "*" || c === "/"; c = peek()) {
        i++;
        const r = unary();
        if (c === "/" && r === 0) fail();
        v = c === "*" ? v * r : v / r;
      }
      return v;
    };
    const expr = () => {
      let v = term();
      for (let c = peek(); c === "+" || c === "-"; c = peek()) { i++; v = c === "+" ? v + term() : v - term(); }
      return v;
    };
    try {
      const v = expr();
      return peek() === undefined && isFinite(v) ? v : null;
    } catch (e) { return null; }
  }
  const fmt = (v) => parseFloat(v.toPrecision(12)).toLocaleString(cfg.locale || "en-US", { maximumFractionDigits: 10 });

  function score(q, name) {
    const n = name.toLowerCase();
    if (n.startsWith(q)) return 300 - n.length;
    if (n.split(/\s+/).some((w) => w.startsWith(q))) return 200 - n.length;
    let at = -1, gaps = 0;
    for (const ch of q) {
      const next = n.indexOf(ch, at + 1);
      if (next < 0) return null;
      gaps += next - at - 1;
      at = next;
    }
    return 100 - gaps - n.length * 0.1;
  }

  const L = Object.assign({
    label: "Launcher",
    items: [],
    demo: "",
    maths: "Maths",
    kind: "Application",
    open: "Open",
    copy: "Copy",
    web: (q) => `Search the web for “${q}”`,
    webSub: "Web",
    copied: (t) => `Copied ${t}`,
    opened: (t) => `On your Mac, ${t} opens now`,
    sent: "Handed to your browser"
  }, cfg.launcher || {});

  function results(query, limit = 3) {
    const q = query.trim();
    if (!q) return [];
    const rows = [];
    const v = evaluate(q);
    if (v !== null) rows.push({ id: "calc", title: fmt(v), raw: String(parseFloat(v.toPrecision(12))), sub: `${L.maths} · ${q}`, glyph: "calc", trailing: L.copy, kind: "calc" });
    const lq = q.toLowerCase();
    L.items.map((item) => ({ item, s: score(lq, item.title) }))
      .filter((m) => m.s !== null)
      .sort((a, b) => b.s - a.s || a.item.title.localeCompare(b.item.title))
      .slice(0, limit)
      .forEach(({ item }) => rows.push({ id: "item:" + item.title, title: item.title, sub: item.sub || L.kind, glyph: item.glyph, item, trailing: L.open, kind: "item" }));
    if (L.web) rows.push({ id: "web", title: L.web(q), sub: L.webSub, glyph: "search", trailing: L.open, kind: "web" });
    return rows.slice(0, limit);
  }

  function rowEl(r) {
    const li = document.createElement("li");
    li.className = "lp-row";
    li.setAttribute("role", "option");
    const ico = document.createElement("span");
    ico.className = "lp-ico " + (r.item && r.item.colors ? "app" : "sym");
    if (r.item && r.item.colors) {
      ico.style.background = `linear-gradient(${r.item.colors[0]}, ${r.item.colors[1]})`;
      ico.style.color = r.item.fg || "#fff";
    }
    ico.innerHTML = svg(r.glyph);
    li.innerHTML = '<span class="lp-tx"><span class="lp-t"></span><span class="lp-s"></span></span><span class="lp-tr"></span>';
    li.prepend(ico);
    fill(li, r);
    return li;
  }
  function fill(li, r) {
    $(".lp-t", li).textContent = r.title;
    $(".lp-s", li).textContent = r.sub;
    $(".lp-tr", li).textContent = r.trailing || "";
  }

  $$('[data-stage="launcher"]').forEach((panel) => {
    const input = $(".lp-input", panel);
    const list = $(".lp-list", panel);
    const box = $(".lp-results", panel);
    const status = $(".lp-label", panel);
    const verb = $(".lp-verb", panel);
    const section = panel.closest("section") || document;
    let rows = [], sel = 0, els = new Map(), statusTimer = 0, auto = 0, touched = false;

    function render() {
      rows = results(input.value);
      sel = Math.min(sel, Math.max(0, rows.length - 1));
      const next = new Map();
      rows.forEach((r) => {
        let li = els.get(r.id);
        if (li) fill(li, r);
        else {
          li = rowEl(r);
          li.id = "lp-" + r.id.replace(/[^a-z0-9]/gi, "-");
          li.addEventListener("mousedown", (e) => e.preventDefault());
          li.addEventListener("click", () => { sel = rows.findIndex((x) => x.id === r.id); mark(); activate(); });
          if (!calm()) li.classList.add("enter");
        }
        next.set(r.id, li);
        list.appendChild(li);
      });
      els.forEach((li, id) => { if (!next.has(id)) li.remove(); });
      els = next;
      requestAnimationFrame(() => requestAnimationFrame(() => $$(".enter", list).forEach((li) => li.classList.remove("enter"))));
      box.classList.toggle("empty", !rows.length);
      mark();
    }
    function mark() {
      box.style.setProperty("--sel", sel);
      rows.forEach((r, n) => {
        const li = els.get(r.id);
        li.classList.toggle("sel", n === sel);
        li.setAttribute("aria-selected", n === sel ? "true" : "false");
      });
      const r = rows[sel];
      if (verb) verb.textContent = r ? r.trailing : L.open;
      if (r) input.setAttribute("aria-activedescendant", els.get(r.id).id); else input.removeAttribute("aria-activedescendant");
    }
    function say(text) {
      clearTimeout(statusTimer);
      status.textContent = text;
      status.classList.add("flash");
      statusTimer = setTimeout(() => { status.textContent = L.label; status.classList.remove("flash"); }, 1800);
    }
    function activate() {
      const r = rows[sel];
      if (!r) return;
      if (r.kind === "calc") {
        if (navigator.clipboard) navigator.clipboard.writeText(r.raw).catch(() => {});
        say(L.copied(r.title));
      } else if (r.kind === "item") say(L.opened(r.title));
      else say(L.sent);
    }
    function stopAuto() { clearTimeout(auto); auto = 0; }
    function typeIn(text, focus) {
      stopAuto();
      if (calm()) { input.value = text; render(); if (focus) input.focus({ preventScroll: true }); return; }
      input.value = "";
      render();
      let n = 0;
      const step = () => {
        input.value = text.slice(0, ++n);
        render();
        if (n < text.length) auto = setTimeout(step, 70 + Math.random() * 60);
        else { auto = 0; if (focus) input.focus({ preventScroll: true }); }
      };
      auto = setTimeout(step, 120);
    }

    status.textContent = L.label;
    input.addEventListener("input", () => { touched = true; stopAuto(); sel = 0; render(); });
    input.addEventListener("focus", () => { touched = true; stopAuto(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!rows.length) return;
        sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length;
        mark();
      } else if (e.key === "Enter") { e.preventDefault(); activate(); }
      else if (e.key === "Escape") { input.value = ""; sel = 0; render(); }
    });
    $$(".chip-q", section).forEach((b) => b.addEventListener("click", () => { touched = true; sel = 0; typeIn(b.dataset.q, true); }));

    if (frozen && L.demo) input.value = L.demo;
    render();
    watch(panel, () => {
      if (touched || input.value || !L.demo) return;
      touched = true;
      if (calm()) { input.value = L.demo; render(); return; }
      auto = setTimeout(() => typeIn(L.demo, false), 450);
    }, null, 0.6);
  });

  $$('[data-stage="appearance"]').forEach((stage) => {
    const panel = $(".lp", stage);
    const swatches = $(".swatches", stage);
    const name = $(".swatch-name", stage);
    const mats = $$(".mat", stage);
    const query = stage.dataset.query || L.demo || "";
    const ul = $(".lp-list", panel);
    const q = $(".lp-q-text", panel);
    if (q) q.textContent = query;
    results(query, 2).forEach((r, n) => {
      const li = rowEl(r);
      li.classList.add("stat");
      if (n === 0) li.classList.add("sel");
      ul.appendChild(li);
    });

    function crossfade(change) {
      const ghost = panel.cloneNode(true);
      ghost.classList.add("ghost");
      const cs = getComputedStyle(root);
      PAL_VARS.forEach((v) => ghost.style.setProperty(v, cs.getPropertyValue(v)));
      ghost.style.top = panel.offsetTop + "px";
      ghost.style.width = panel.offsetWidth + "px";
      panel.parentNode.appendChild(ghost);
      change();
      panel.classList.add("fresh");
      panel.getBoundingClientRect();
      requestAnimationFrame(() => {
        panel.classList.remove("fresh");
        ghost.style.opacity = "0";
        if (!calm()) ghost.style.transform = "translateX(-50%) scale(0.985)";
      });
      setTimeout(() => ghost.remove(), 400);
    }
    function describe() {
      if (!name) return;
      name.innerHTML = "";
      const b = document.createElement("b");
      b.textContent = look.palette.label;
      const mat = mats.find((m) => m.dataset.mat === look.mat);
      name.append(b, document.createTextNode(mat ? ` · ${mat.textContent.trim()}` : ""));
    }
    function radioGroup(items, pick) {
      items.forEach((b, n) => {
        b.addEventListener("click", () => pick(b));
        b.addEventListener("keydown", (e) => {
          const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
          if (!d) return;
          e.preventDefault();
          const to = items[(n + d + items.length) % items.length];
          to.focus();
          pick(to);
        });
      });
    }
    function check(items, on) {
      items.forEach((b) => {
        b.setAttribute("aria-checked", b === on ? "true" : "false");
        b.tabIndex = b === on ? 0 : -1;
      });
    }

    const allowed = cfg.palettes ? PAL.palettes.filter((p) => cfg.palettes.includes(p.id)) : PAL.palettes;
    const sw = allowed.map((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "swatch";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-label", p.label);
      b.title = p.label;
      b.style.setProperty("--b", p.base);
      b.style.setProperty("--a", p.accent);
      b.dataset.id = p.id;
      swatches.appendChild(b);
      return b;
    });
    check(sw, sw.find((b) => b.dataset.id === look.palette.id));
    check(mats, mats.find((m) => m.dataset.mat === look.mat));
    describe();

    radioGroup(sw, (b) => {
      const p = PAL.palettes.find((x) => x.id === b.dataset.id);
      if (p === look.palette) return;
      check(sw, b);
      crossfade(() => { look.palette = p; applyLook(); });
      describe();
    });
    radioGroup(mats, (b) => {
      if (b.dataset.mat === look.mat) return;
      check(mats, b);
      crossfade(() => { look.mat = b.dataset.mat; applyLook(); });
      describe();
    });
  });

  $$('[data-stage="keyboard"]').forEach((section) => {
    const kb = $(".kb", section);
    const pill = $(".kb-pill", section);
    const text = $(".kb-text", section);
    const keysEl = $(".kb-keys", section);
    const idleText = text.dataset.idle || text.textContent;
    const K = (id, label, w = 1, sm = false) => ({ id, label, w, sm });
    const letters = (s) => [...s].map((c) => K(c, c.toUpperCase()));
    const ROWS = [
      [K("`", "`"), ...letters("1234567890-="), K("delete", "⌫", 1.5, true)],
      [K("tab", "⇥", 1.5, true), ...letters("qwertyuiop[]\\")],
      [K("caps", "⇪", 1.75, true), ...letters("asdfghjkl;'"), K("return", "⏎", 1.75, true)],
      [K("shiftL", "⇧", 2.25, true), ...letters("zxcvbnm,./"), K("shiftR", "⇧", 2.25, true)],
      [K("fn", "fn", 1, true), K("controlL", "⌃"), K("optionL", "⌥"), K("commandL", "⌘", 1.25), K("space", "", 5), K("commandR", "⌘", 1.25), K("optionR", "⌥"), K("leftArrow", "←", 1, true), K("vertical", "", 1, true), K("rightArrow", "→", 1, true)]
    ];
    const caps = new Map();
    const cap = (id, label, sm) => {
      const c = document.createElement("div");
      c.className = "cap" + (sm ? " sm" : "");
      c.innerHTML = "<span></span>";
      c.firstChild.textContent = label;
      caps.set(id, c);
      return c;
    };
    ROWS.forEach((row) => {
      const r = document.createElement("div");
      r.className = "kb-row";
      row.forEach((k) => {
        const key = document.createElement("div");
        key.className = "key";
        key.style.setProperty("--w", k.w);
        if (k.id === "vertical") {
          key.classList.add("stack");
          key.append(cap("upArrow", "↑", true), cap("downArrow", "↓", true));
        } else key.append(cap(k.id, k.label, k.sm));
        r.appendChild(key);
      });
      kb.appendChild(r);
    });

    const CODE = {
      Backquote: "`", Minus: "-", Equal: "=", Backspace: "delete", Tab: "tab", BracketLeft: "[", BracketRight: "]", Backslash: "\\",
      CapsLock: "caps", Semicolon: ";", Quote: "'", Enter: "return", NumpadEnter: "return", ShiftLeft: "shiftL", ShiftRight: "shiftR",
      Comma: ",", Period: ".", Slash: "/", ControlLeft: "controlL", ControlRight: "controlL", AltLeft: "optionL", AltRight: "optionR",
      MetaLeft: "commandL", MetaRight: "commandR", OSLeft: "commandL", OSRight: "commandR", Space: "space",
      ArrowLeft: "leftArrow", ArrowRight: "rightArrow", ArrowUp: "upArrow", ArrowDown: "downArrow", IntlBackslash: "`"
    };
    const toId = (code) => CODE[code] || (/^Key[A-Z]$/.test(code) ? code[3].toLowerCase() : /^Digit\d$/.test(code) ? code[5] : null);
    const MOD = { controlL: "⌃", optionL: "⌥", optionR: "⌥", shiftL: "⇧", shiftR: "⇧", commandL: "⌘", commandR: "⌘" };
    const ORDER = ["⌃", "⌥", "⇧", "⌘"];
    const NAME = { space: "Space", return: "⏎", delete: "⌫", tab: "⇥", caps: "⇪", leftArrow: "←", rightArrow: "→", upArrow: "↑", downArrow: "↓" };
    const IDLE = (cfg.keyboard && cfg.keyboard.idle) || ["commandL", "space"];
    const down = new Set();
    let active = false, idleTimer = 0, recent = [];

    const light = (ids) => caps.forEach((c, id) => c.classList.toggle("on", ids.includes(id)));
    function showKeys(ids) {
      const mods = [...new Set(ids.filter((id) => MOD[id]).map((id) => MOD[id]))].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
      const rest = ids.filter((id) => !MOD[id]).map((id) => NAME[id] || id.toUpperCase());
      keysEl.innerHTML = "";
      [...mods, ...rest].forEach((t) => { const k = document.createElement("kbd"); k.textContent = t; keysEl.appendChild(k); });
    }
    function idle() {
      kb.classList.remove("live");
      pill.classList.remove("live");
      text.textContent = idleText;
      light(IDLE);
      showKeys(IDLE);
    }
    function update() {
      const ids = [...down];
      light(ids);
      kb.classList.add("live");
      pill.classList.add("live");
      if (ids.length) { recent = ids; text.textContent = text.dataset.listening || "Listening…"; }
      showKeys(ids.length ? ids : recent);
      clearTimeout(idleTimer);
      if (!ids.length) {
        text.textContent = text.dataset.pressed || "You pressed";
        idleTimer = setTimeout(idle, 2200);
      }
    }
    addEventListener("keydown", (e) => {
      if (!active || typing(e.target)) return;
      const id = toId(e.code);
      if (!id) return;
      if (id === "caps") { down.add(id); update(); setTimeout(() => { down.delete(id); update(); }, 180); return; }
      down.add(id);
      update();
    });
    addEventListener("keyup", (e) => {
      const id = toId(e.code);
      if (!id || !down.size) return;
      down.delete(id);
      if (id === "commandL" || id === "commandR") [...down].forEach((d) => { if (!MOD[d]) down.delete(d); });
      update();
    });
    addEventListener("blur", () => { if (down.size) { down.clear(); update(); } });
    idle();
    if (matchMedia("(hover: none)").matches) {
      if (text.dataset.touch) text.textContent = text.dataset.touch;
      return;
    }
    watch(kb, () => { active = true; }, () => { active = false; down.clear(); idle(); clearTimeout(idleTimer); }, 0.3);
  });

  $$('[data-stage="desk"]').forEach((section) => {
    const desk = $(".desk", section);
    const W = {};
    $$(".win", desk).forEach((el) => {
      W[el.dataset.win] = {
        el, skin: $(".win-skin", el), content: $(".win-content", el),
        s: { x: new Spring(0), y: new Spring(0), w: new Spring(0), h: new Spring(0) },
        target: null, laid: null
      };
    });
    const names = Object.keys(W);
    const MOVES = (cfg.desk && cfg.desk.moves) || [[names[0], "left"], [names[1], "right"], [names[0], "tl"], [names[1], "tr"], [names[0], "full"]];
    const KEYS = (cfg.desk && cfg.desk.keys) || { ArrowLeft: 0, ArrowRight: 1, KeyU: 2, KeyI: 3, KeyF: 4 };
    const snaps = $$(".snap", section);
    let area = null, cycle = 0, inView = false, pausedUntil = 0, step = 0;

    function measure() { area = { x: 6, y: 26, w: desk.clientWidth - 12, h: desk.clientHeight - 32 }; }
    function frameFor(target, win) {
      const g = 4, a = area, hw = (a.w - g) / 2, hh = (a.h - g) / 2;
      switch (target) {
        case "left": return { x: a.x, y: a.y, w: hw, h: a.h };
        case "right": return { x: a.x + hw + g, y: a.y, w: hw, h: a.h };
        case "tl": return { x: a.x, y: a.y, w: hw, h: hh };
        case "tr": return { x: a.x + hw + g, y: a.y, w: hw, h: hh };
        case "bl": return { x: a.x, y: a.y + hh + g, w: hw, h: hh };
        case "br": return { x: a.x + hw + g, y: a.y + hh + g, w: hw, h: hh };
        case "full": return { ...a };
        default: {
          const w = a.w * 0.55, h = a.h * 0.66;
          return win === names[0] ? { x: a.x + a.w * 0.08, y: a.y + a.h * 0.08, w, h } : { x: a.x + a.w - w - a.w * 0.06, y: a.y + a.h * 0.26, w, h };
        }
      }
    }
    function paint(win) {
      const s = win.s, t = win.laid;
      const x = s.x.x, y = s.y.x, w = Math.max(20, s.w.x), h = Math.max(20, s.h.x);
      win.content.style.transform = `translate(${x}px, ${y}px)`;
      win.content.style.clipPath = `inset(0px ${Math.max(0, t.w - w)}px ${Math.max(0, t.h - h)}px 0px round 7px)`;
      win.skin.style.transform = `translate(${x}px, ${y}px) scale(${w / t.w}, ${h / t.h})`;
    }
    function place(name, target, animate) {
      const win = W[name];
      const r = frameFor(target, name);
      win.target = target;
      win.laid = r;
      [win.skin, win.content].forEach((el) => { el.style.width = r.w + "px"; el.style.height = r.h + "px"; });
      const s = win.s;
      if (!animate || calm()) {
        s.x.jump(r.x); s.y.jump(r.y); s.w.jump(r.w); s.h.jump(r.h);
        paint(win);
        return;
      }
      s.x.to(r.x); s.y.to(r.y); s.w.to(r.w); s.h.to(r.h);
      run({ springs: [s.x, s.y, s.w, s.h], render: () => paint(win) });
    }
    function setFront(name) {
      Object.entries(W).forEach(([n, w]) => {
        w.el.classList.toggle("front", n === name);
        w.el.style.zIndex = n === name ? 2 : 1;
      });
    }
    function perform(n, animate = true) {
      const [name, target] = MOVES[n];
      setFront(name);
      place(name, target, animate);
      snaps.forEach((b, i) => b.classList.toggle("on", i === n));
    }
    function reset(animate) {
      names.forEach((n) => place(n, null, animate));
      snaps.forEach((b) => b.classList.remove("on"));
    }
    function tick() {
      clearTimeout(cycle);
      if (!inView || calm()) return;
      const wait = pausedUntil - Date.now();
      if (wait > 0) { cycle = setTimeout(tick, wait); return; }
      if (document.hidden) { cycle = setTimeout(tick, 1000); return; }
      if (step < MOVES.length) { perform(step++); cycle = setTimeout(tick, 1500); }
      else { reset(true); step = 0; cycle = setTimeout(tick, 1100); }
    }
    function user(n) {
      pausedUntil = Date.now() + 6000;
      step = (n + 1) % MOVES.length;
      perform(n);
      tick();
    }

    measure();
    if (calm()) { perform(0, false); perform(1, false); } else { reset(false); setFront(names[1]); }
    snaps.forEach((b, n) => b.addEventListener("click", () => user(n)));
    addEventListener("keydown", (e) => {
      if (!inView || !e.ctrlKey || !e.altKey || typing(e.target)) return;
      const n = KEYS[e.code];
      if (n !== undefined) { e.preventDefault(); user(n); }
    });
    addEventListener("resize", () => { measure(); Object.entries(W).forEach(([n, w]) => place(n, w.target, false)); });
    watch(desk, () => { if (!inView) { inView = true; cycle = setTimeout(tick, 700); } }, () => { inView = false; clearTimeout(cycle); }, 0.4);
  });

  $$('[data-stage="shelf"]').forEach((section) => {
    const stage = $(".shelf-stage", section);
    const fit = stage.parentNode;
    const file = $(".file", stage);
    const cursor = $(".cursor", stage);
    const count = $(".shelf-count", stage);
    const status = $(".stage-status", section);
    const M = Object.assign({
      watch: "Watch: grab, drag, drop.",
      parked: "Parked. Drag it out where it belongs.",
      back: "Back where it started.",
      turn: "Your turn. Drag it back out, then onto the shelf again."
    }, (cfg.shelf && cfg.shelf.messages) || {});
    const HOME = { x: 86, y: 154 }, PARK = { x: 426, y: 212 }, SHELF = { x: 370, y: 112, w: 264, h: 178 };
    const f = { x: new Spring(HOME.x), y: new Spring(HOME.y), s: new Spring(1), r: new Spring(0) };
    const c = { x: new Spring(170), y: new Spring(250) };
    let narrow = null, scale = 1, parked = false, drag = null, interacted = false, demoed = false, timers = [];

    const paint = () => { file.style.transform = `translate(${f.x.x}px, ${f.y.x}px) rotate(${f.r.x}deg) scale(${f.s.x})`; };
    const paintCursor = () => { cursor.style.transform = `translate(${c.x.x}px, ${c.y.x}px)`; };
    const go = () => run({ springs: Object.values(f), render: paint });
    const tune = (r, d) => Object.values(f).forEach((s) => s.tune(r, d));
    function fitStage() {
      const n = fit.clientWidth < 600;
      if (n !== narrow) {
        narrow = n;
        stage.classList.toggle("narrow", n);
        const shelfX = n ? 268 : 380;
        PARK.x = shelfX + 46;
        SHELF.x = shelfX - 10;
        if (parked) { f.x.jump(PARK.x); paint(); }
      }
      scale = Math.min(1, fit.clientWidth / (narrow ? 520 : 640));
      fit.style.setProperty("--s", scale);
    }
    const shelfUp = (on) => stage.classList.toggle("shelf-up", on);
    const over = (x, y) => x > SHELF.x && x < SHELF.x + SHELF.w && y > SHELF.y && y < SHELF.y + SHELF.h;
    const local = (e) => { const r = stage.getBoundingClientRect(); return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale }; };
    const say = (t) => { if (status) status.textContent = t; };
    const cancelDemo = () => { timers.forEach(clearTimeout); timers = []; cursor.classList.remove("on"); };

    function settle(toShelf, vx = 0, vy = 0) {
      parked = toShelf;
      stage.classList.remove("hot");
      file.classList.remove("lifted");
      file.classList.toggle("parked", toShelf);
      stage.classList.toggle("away", toShelf);
      if (count) count.textContent = toShelf ? "1" : "0";
      const dest = toShelf ? PARK : HOME;
      if (calm()) {
        f.x.jump(dest.x); f.y.jump(dest.y); f.s.jump(toShelf ? 0.62 : 1); f.r.jump(0); paint();
      } else {
        toShelf ? tune(0.42, 0.55) : tune(0.45, 0.85);
        f.x.to(dest.x, vx); f.y.to(dest.y, vy); f.s.to(toShelf ? 0.62 : 1); f.r.to(0);
        go();
      }
      if (!toShelf) setTimeout(() => { if (!parked && !drag) shelfUp(false); }, 260);
    }

    file.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      interacted = true;
      cancelDemo();
      const p = local(e);
      drag = { dx: p.x - f.x.x, dy: p.y - f.y.x, moved: false, start: p, hist: [{ ...p, t: e.timeStamp }] };
      file.setPointerCapture(e.pointerId);
      file.classList.add("dragging");
    });
    file.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const p = local(e);
      if (!drag.moved && Math.hypot(p.x - drag.start.x, p.y - drag.start.y) < 4) return;
      if (!drag.moved) {
        drag.moved = true;
        file.classList.add("lifted");
        shelfUp(true);
        tune(0.3, 0.75);
        f.s.to(1.08);
      }
      drag.hist.push({ ...p, t: e.timeStamp });
      if (drag.hist.length > 5) drag.hist.shift();
      const h = drag.hist, a = h[0], b = h[h.length - 1], dt = Math.max(1, b.t - a.t) / 1000;
      f.x.jump(p.x - drag.dx); f.y.jump(p.y - drag.dy);
      f.r.to(Math.max(-12, Math.min(12, ((b.x - a.x) / dt) * 0.012)) - 3);
      stage.classList.toggle("hot", over(f.x.x, f.y.x));
      paint();
      go();
    });
    const end = (e) => {
      if (!drag) return;
      const d = drag;
      drag = null;
      file.classList.remove("dragging");
      if (!d.moved) return;
      const h = d.hist, a = h[0], b = h[h.length - 1], dt = Math.max(1, b.t - a.t) / 1000;
      const fresh = e.timeStamp - b.t < 80;
      const hit = over(f.x.x, f.y.x);
      settle(hit, fresh ? (b.x - a.x) / dt : 0, fresh ? (b.y - a.y) / dt : 0);
      say(hit ? M.parked : M.back);
      file.dataset.dragged = "1";
      setTimeout(() => delete file.dataset.dragged, 0);
    };
    file.addEventListener("pointerup", end);
    file.addEventListener("pointercancel", end);
    file.addEventListener("click", () => {
      if (file.dataset.dragged) return;
      interacted = true;
      cancelDemo();
      if (parked) { settle(false); say(M.back); return; }
      shelfUp(true);
      tune(0.45, 0.85);
      f.s.to(1.08);
      go();
      timers.push(setTimeout(() => { settle(true); say(M.parked); }, calm() ? 0 : 220));
    });

    function demo() {
      if (demoed || interacted || calm()) return;
      demoed = true;
      const at = (ms, fn) => timers.push(setTimeout(fn, ms));
      const move = (x, y, resp = 0.5) => { c.x.tune(resp, 0.9).to(x); c.y.tune(resp, 0.9).to(y); run({ springs: [c.x, c.y], render: paintCursor }); };
      c.x.jump(190); c.y.jump(250); paintCursor();
      cursor.classList.add("on");
      say(M.watch);
      move(HOME.x + 14, HOME.y + 8);
      at(650, () => { file.classList.add("lifted"); tune(0.3, 0.75); f.s.to(1.08); go(); shelfUp(true); });
      at(1000, () => {
        tune(0.6, 0.85);
        const mid = (HOME.x + PARK.x) / 2 + 40;
        f.x.to(mid); f.y.to(74); f.r.to(-7); go();
        move(mid + 14, 82, 0.6);
      });
      at(1550, () => {
        tune(0.45, 0.8);
        f.x.to(PARK.x + 4); f.y.to(150); f.r.to(4); go();
        move(PARK.x + 18, 158, 0.45);
        stage.classList.add("hot");
      });
      at(2450, () => { settle(true); move(PARK.x + 54, 196, 0.5); });
      at(3300, () => { cursor.classList.remove("on"); say(M.turn); });
    }

    fitStage();
    if (frozen) { shelfUp(true); settle(true); }
    paint();
    addEventListener("resize", fitStage);
    watch(stage, () => { timers.push(setTimeout(demo, 1100)); }, () => { if (!interacted && !demoed) cancelDemo(); }, 0.55);
  });

  $$('[data-stage="permission"]').forEach((section) => {
    const sw = $(".sw[role=switch]", section);
    const row = sw.closest(".perm-row");
    const pill = $(".perm-status", section);
    const label = $("span", pill);
    const title = $("[data-granted]", section);
    const burst = $(".burst", section);
    const before = { label: label.textContent, title: title && title.textContent };
    sw.addEventListener("click", () => {
      const on = sw.getAttribute("aria-checked") !== "true";
      sw.setAttribute("aria-checked", String(on));
      row.classList.toggle("granted", on);
      pill.classList.toggle("ok", on);
      label.textContent = on ? pill.dataset.granted : before.label;
      if (title) title.textContent = on ? title.dataset.granted : before.title;
      $("svg", pill).innerHTML = on
        ? '<circle cx="12" cy="12" r="9" fill="currentColor" stroke="none"/><path d="m7.8 12.3 2.9 2.9 5.6-5.9" stroke="#0b1a10"/>'
        : '<circle cx="12" cy="12" r="8.5" stroke-dasharray="3 3.4"/>';
      if (on && !calm() && burst && burst.animate) sparkle(burst);
    });
  });

  function sparkle(host, count = 26, radius = 70) {
    const accent = getComputedStyle(root).getPropertyValue("--pal-accent").trim();
    for (let i = 0; i < count; i++) {
      const dot = document.createElement("span");
      const size = i % 3 === 0 ? 5 : 3;
      const angle = (i * 2.399963) % (Math.PI * 2);
      const reach = radius * (0.45 + 0.55 * (((i * 37) % 11) / 10));
      const x = Math.cos(angle) * reach, y = Math.sin(angle) * reach;
      dot.style.cssText = `width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px;background:${i % 4 === 0 ? "#fff" : i % 2 ? "var(--success)" : accent}`;
      host.appendChild(dot);
      dot.animate([
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(${x * 0.8}px, ${y * 0.8 + 4}px) scale(0.8)`, opacity: 0.9, offset: 0.55 },
        { transform: `translate(${x}px, ${y + 22}px) scale(0.4)`, opacity: 0 }
      ], { duration: 1200, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }).onfinish = () => dot.remove();
    }
  }

  window.Stage = { Spring, run, watch, evaluate, results, applyLook, look, sparkle };
})();
