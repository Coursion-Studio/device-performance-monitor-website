/* Device Performance Monitor — the two stages this app needs that the shared
   stage.js does not ship: a session chart that draws itself, and a terminal
   that answers real dpm commands. */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const STATIC = new URLSearchParams(location.search).has("static");
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── the session the whole site shows ─────────────────────────────────── */

  const SCREENS = [
    { name: "HomeScreen", seconds: 34, retained: 22 },
    { name: "ProductList", seconds: 46, retained: 44 },
    { name: "ProductDetail", seconds: 38, retained: 30 },
    { name: "Cart", seconds: 30, retained: 16 },
    { name: "Checkout", seconds: 42, retained: 52 },
    { name: "ProductList", seconds: 40, retained: 18 },
  ];

  function session() {
    let seed = 0x5deece66;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const points = [];
    let memory = 168;
    SCREENS.forEach((screen, index) => {
      for (let tick = 0; tick < screen.seconds; tick += 1) {
        const loading = tick < 8;
        if (loading) memory += screen.retained * 0.3 + (rand() - 0.5) * 1.2 + 1.2;
        else if (tick === 9) memory -= screen.retained * 0.52;
        else memory += (rand() - 0.5) * 0.44 + 0.18;
        const spike = loading ? 74 * (1 - tick / Math.max(1, screen.seconds - 1)) : 0;
        points.push({
          mb: memory,
          cpu: Math.min(96, Math.max(1.4, spike + 9.5 + (rand() - 0.5) * 8)),
          fps: spike > 40 ? 44 + (rand() - 0.5) * 14 : 59 + (rand() - 0.5) * 3,
          threads: Math.round(41 + index * 5.4 + tick * 0.08),
          disk: loading ? 380 + rand() * 160 : 14 + rand() * 26,
          screen: screen.name,
          band: index,
        });
      }
    });
    return points;
  }

  const POINTS = session();
  const MIN = Math.min(...POINTS.map((p) => p.mb));
  const MAX = Math.max(...POINTS.map((p) => p.mb));
  const AVG = POINTS.reduce((sum, p) => sum + p.mb, 0) / POINTS.length;

  /* ── the hero rig: a phone wired into a live readout ──────────────────── */

  const PLATFORMS = {
    android: {
      frame: "is-android",
      device: "Pixel 9 Pro",
      serial: "39021FDJH00TK9",
      screenSuffix: "Activity",
      command: "adb shell dumpsys meminfo com.example.shop",
      note: "Frame timing comes from gfxinfo, so jank and p95 are Android's alone.",
      scale: 1,
      tiles: [
        { key: "mem", label: "App memory", unit: "MB", color: "#5CC8FF" },
        { key: "cpu", label: "App CPU", unit: "%", color: "#C79BFF" },
        { key: "fps", label: "Frames per second", unit: "fps", color: "#5BE7B0" },
        { key: "threads", label: "Threads", unit: "", color: "#FFC46B" },
      ],
    },
    simulator: {
      frame: "is-simulator",
      device: "iPhone 17 Pro",
      serial: "B1C4E8F2-27A9-4E60",
      screenSuffix: "",
      command: "xcrun simctl spawn B1C4E8F2 footprint com.example.shop",
      note: "A simulator shares your Mac's CPU and GPU, so frame rate would be your machine's, not a phone's. It is left blank.",
      scale: 1.22,
      tiles: [
        { key: "mem", label: "Physical footprint", unit: "MB", color: "#5CC8FF" },
        { key: "cpu", label: "App CPU", unit: "%", color: "#C79BFF" },
        { key: "inRam", label: "Resident in RAM", unit: "MB", color: "#8BD4FF" },
        { key: "threads", label: "Threads", unit: "", color: "#FFC46B" },
      ],
    },
    iosDevice: {
      frame: "is-iphone",
      device: "iPhone 17",
      serial: "00008120-000A4D11",
      screenSuffix: "",
      command: "pymobiledevice3 developer dvt sysmon process monitor",
      note: "Screens come from the app's own DPM_SCREEN log lines — iOS has no non-invasive way to ask what is on screen.",
      scale: 0.74,
      tiles: [
        { key: "mem", label: "App memory", unit: "MB", color: "#5CC8FF" },
        { key: "cpu", label: "App CPU", unit: "%", color: "#C79BFF" },
        { key: "disk", label: "Disk write", unit: "KB/s", color: "#FF8AB0" },
        { key: "threads", label: "Threads", unit: "", color: "#FFC46B" },
      ],
    },
  };

  const SERIES = {
    mem: (p) => p.mb,
    inRam: (p) => p.mb * 0.88,
    cpu: (p) => p.cpu,
    fps: (p) => p.fps,
    disk: (p) => p.disk,
    threads: (p) => p.threads,
  };

  const DECIMALS = { mem: 1, inRam: 1, cpu: 1, fps: 0, disk: 0, threads: 0 };
  const SCALES = { mem: true, inRam: true };

  function rigStage(section) {
    const list = $("[data-rig-tiles]", section);
    const phone = $(".rig-phone", section);
    const screen = $("[data-rig-screen]", section);
    const note = $("[data-rig-note]", section);
    const command = $("[data-rig-command]", section);
    const requested = new URLSearchParams(location.search).get("rig");
    let platform = PLATFORMS[requested] ? requested : "android";
    let index = 40;

    const paint = () => {
      const spec = PLATFORMS[platform];
      const point = POINTS[index];
      const frames = POINTS.slice(Math.max(0, index - 44), index + 1);

      phone.className = `rig-phone ${spec.frame}`;
      screen.textContent = point.screen + spec.screenSuffix;
      note.textContent = spec.note;
      command.textContent = spec.command;
      $("[data-rig-device]", section).textContent = spec.device;
      $("[data-rig-serial]", section).textContent = spec.serial;

      spec.tiles.forEach((tile, slot) => {
        const node = list.children[slot];
        if (!node) return;
        const factor = SCALES[tile.key] ? spec.scale : 1;
        const numbers = frames.map((p) => SERIES[tile.key](p) * factor);
        $(".rig-label", node).textContent = tile.label;
        $(".rig-unit", node).textContent = tile.unit;
        $("[data-rig-value]", node).textContent =
          numbers[numbers.length - 1].toFixed(DECIMALS[tile.key]);
        const spark = $("[data-rig-spark]", node);
        spark.setAttribute("stroke", tile.color);
        const low = Math.min(...numbers);
        const high = Math.max(...numbers);
        const span = Math.max(1, high - low);
        spark.setAttribute(
          "d",
          numbers
            .map((n, i) => {
              const x = (i / Math.max(1, numbers.length - 1)) * 120;
              const y = 31 - ((n - low) / span) * 28;
              return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
            })
            .join(" ")
        );
      });
    };

    $$("[data-rig-platform]", section).forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.rigPlatform === platform) return;
        platform = button.dataset.rigPlatform;
        $$("[data-rig-platform]", section).forEach((other) =>
          other.classList.toggle("on", other === button)
        );
        if (!STATIC && !REDUCED) {
          list.classList.add("swapping");
          setTimeout(() => list.classList.remove("swapping"), 240);
        }
        paint();
      });
    });

    $$("[data-rig-platform]", section).forEach((button) =>
      button.classList.toggle("on", button.dataset.rigPlatform === platform)
    );
    paint();
    if (STATIC || REDUCED) return;

    let timer = null;
    const tick = () => {
      index = index + 1 >= POINTS.length ? 40 : index + 1;
      paint();
    };
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !timer) timer = setInterval(tick, 420);
          else if (!entry.isIntersecting && timer) {
            clearInterval(timer);
            timer = null;
          }
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(section);
  }

  /* ── stage one: the chart ─────────────────────────────────────────────── */

  function chartStage(section) {
    const W = 720;
    const H = 240;
    const top = MAX * 1.12;
    const x = (i) => (i / (POINTS.length - 1)) * W;
    const y = (mb) => H - (mb / top) * H;

    const line = $("[data-chart-line]", section);
    const fill = $("[data-chart-fill]", section);
    const head = $("[data-chart-head]", section);
    const rule = $("[data-chart-rule]", section);
    const bands = $("[data-chart-bands]", section);
    const labels = $("[data-chart-labels]", section);
    const plot = $("[data-chart-plot]", section);
    const readout = $("[data-chart-readout]", section);
    const state = $("[data-chart-state]", section);

    let starts = [];
    POINTS.forEach((point, index) => {
      if (index === 0 || point.band !== POINTS[index - 1].band) starts.push(index);
    });
    starts.forEach((start, i) => {
      const end = i + 1 < starts.length ? starts[i + 1] : POINTS.length - 1;
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", x(start));
      rect.setAttribute("y", 0);
      rect.setAttribute("width", Math.max(0, x(end) - x(start)));
      rect.setAttribute("height", H);
      rect.setAttribute("fill", i % 2 ? "rgb(255 255 255 / .04)" : "rgb(255 255 255 / .015)");
      bands.appendChild(rect);
      const label = document.createElement("span");
      label.textContent = POINTS[start].screen;
      label.style.left = `${(x(start) / W) * 100}%`;
      label.style.width = `${((x(end) - x(start)) / W) * 100}%`;
      labels.appendChild(label);
    });

    const path = (count) => {
      const parts = [];
      for (let i = 0; i < count; i += 1) {
        parts.push(`${i ? "L" : "M"}${x(i).toFixed(1)} ${y(POINTS[i].mb).toFixed(1)}`);
      }
      return parts.join(" ");
    };

    const tile = (name) => $(`[data-chart-tile-${name}]`, section);
    const banner = $("[data-chart-banner]", section);
    const screenChip = $("[data-chart-screenchip]", section);

    const draw = (count) => {
      const d = path(count);
      line.setAttribute("d", d);
      fill.setAttribute("d", `${d} L${x(count - 1).toFixed(1)} ${H} L0 ${H} Z`);
      const last = POINTS[count - 1];
      head.setAttribute("cx", x(count - 1));
      head.setAttribute("cy", y(last.mb));
      head.setAttribute("opacity", "1");
      $("[data-chart-min]", section).textContent = `${MIN.toFixed(1)} MB`;
      $("[data-chart-avg]", section).textContent = `${(
        POINTS.slice(0, count).reduce((sum, p) => sum + p.mb, 0) / count
      ).toFixed(1)} MB`;
      $("[data-chart-peak]", section).textContent = `${Math.max(
        ...POINTS.slice(0, count).map((p) => p.mb)
      ).toFixed(1)} MB`;
      $("[data-chart-count]", section).textContent = String(count);

      const now = POINTS[count - 1];
      tile("mem").textContent = now.mb.toFixed(1);
      tile("cpu").textContent = now.cpu.toFixed(1);
      tile("threads").textContent = String(now.threads);
      const delta = now.mb - POINTS[0].mb;
      tile("delta").textContent = `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`;
      screenChip.textContent = now.screen;
      // The app raises this once a climb is established, not on the first bump.
      banner.classList.toggle("show", count > POINTS.length * 0.45);
    };

    const finish = () => {
      draw(POINTS.length);
      state.textContent = "Stopped";
      state.classList.add("done");
    };

    if (STATIC || REDUCED) {
      finish();
    } else {
      let drawn = 1;
      let playing = false;
      const step = () => {
        if (!playing) return;
        drawn = Math.min(POINTS.length, drawn + 3);
        draw(drawn);
        if (drawn >= POINTS.length) {
          playing = false;
          finish();
          return;
        }
        requestAnimationFrame(step);
      };
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !playing && drawn < POINTS.length) {
              playing = true;
              requestAnimationFrame(step);
            }
          });
        },
        { threshold: 0.35 }
      );
      observer.observe(section);
      draw(1);
    }

    /* scrubbing: the chart answers the pointer rather than replaying a video */
    const scrub = (event) => {
      const box = plot.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
      const index = Math.round(ratio * (POINTS.length - 1));
      const point = POINTS[index];
      readout.hidden = false;
      rule.setAttribute("x1", x(index));
      rule.setAttribute("x2", x(index));
      rule.setAttribute("opacity", "1");
      $("[data-chart-value]", section).textContent = `${point.mb.toFixed(1)} MB`;
      $("[data-chart-screen]", section).textContent = point.screen;
      readout.style.left = `${Math.min(88, Math.max(4, ratio * 100))}%`;
    };
    plot.addEventListener("pointermove", scrub);
    plot.addEventListener("pointerleave", () => {
      readout.hidden = true;
      rule.setAttribute("opacity", "0");
    });
  }

  /* ── stage two: the terminal ──────────────────────────────────────────── */

  const DEVICES = [
    ["android", "39021FDJH00TK9", "Pixel 9 Pro", "ready"],
    ["simulator", "B1C4E8F2-27A9-4E60", "iPhone 17 Pro", "ready"],
    ["iosDevice", "00008120-000A4D11", "iPhone 17", "ready"],
  ];

  const APPS = [
    ["com.example.shop", "Shop", "yes"],
    ["com.example.shop.debug", "Shop (debug)", "no"],
    ["com.example.reader", "Reader", "no"],
  ];

  const HELP = [
    "dpm — Device Performance Monitor on the command line v1.7.0",
    "",
    "Usage: dpm <command> [options]",
    "",
    "Commands:",
    "  record   Sample one app's live metrics and write a session JSON.",
    "  battery  Record a labeled battery and thermal report.",
    "  devices  List connected devices and simulators.",
    "  apps     List the apps installed on a device.",
    "  docs     Print this reference as markdown or JSON.",
    "",
    "Exit codes: 0 ok · 1 over budget · 2 bad usage · 3 no device · 4 write error",
  ];

  function table(header, rows) {
    const widths = header.map((_, i) =>
      Math.max(header[i].length, ...rows.map((row) => row[i].length))
    );
    const line = (cells) =>
      cells.map((cell, i) => (i === cells.length - 1 ? cell : cell.padEnd(widths[i]))).join("  ");
    return [line(header), ...rows.map(line)];
  }

  function answer(input) {
    const parts = input.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return [];
    if (parts[0] !== "dpm") {
      return [{ text: `zsh: command not found: ${parts[0]}`, tone: "bad" }];
    }
    const command = parts[1] || "help";
    const flag = (name) => {
      const at = parts.indexOf(`--${name}`);
      return at > -1 ? parts[at + 1] : null;
    };
    switch (command) {
      case "devices": {
        const only = flag("platform");
        const rows = DEVICES.filter((row) => !only || row[0] === only);
        if (!rows.length) return [{ text: "dpm devices: no devices found", tone: "dim" }];
        return table(["PLATFORM", "SERIAL", "MODEL", "STATE"], rows).map((text, i) => ({
          text,
          tone: i ? "" : "dim",
        }));
      }
      case "apps": {
        const rows = parts.includes("--running") ? APPS.filter((row) => row[2] === "yes") : APPS;
        return table(["PACKAGE", "NAME", "RUNNING"], rows).map((text, i) => ({
          text,
          tone: i ? "" : "dim",
        }));
      }
      case "record": {
        const pkg = flag("package") || "com.example.shop";
        const budget = flag("max-app-memory");
        const out = flag("out") || "session.json";
        const lines = [
          { text: `dpm record: sampling ${pkg} on 39021FDJH00TK9 for 120s every 1s…`, tone: "dim" },
          {
            text: `dpm record: wrote 120 samples to ${out} · app memory avg 418 / peak 604 MB · CPU avg 22%`,
            tone: "dim",
          },
        ];
        if (budget && Number(budget) < 604) {
          lines.push({
            text: `dpm record: FAIL — peak app memory 604 MB exceeds ${budget} MB`,
            tone: "bad",
          });
          lines.push({ text: "exit 1 — the build stops here", tone: "dim" });
        } else if (budget) {
          lines.push({ text: "dpm record: PASS — within budget", tone: "good" });
        }
        return lines;
      }
      case "battery":
        return [
          { text: "dpm battery: recording main on 39021FDJH00TK9 for 600s every 5s…", tone: "dim" },
          {
            text: "dpm battery: wrote main — 4.8%/h drain, 33°C avg, 38°C peak — to battery.json",
            tone: "dim",
          },
        ];
      case "docs":
        return [
          { text: "# dpm — Device Performance Monitor CLI", tone: "" },
          { text: "…the whole reference, as markdown or --json.", tone: "dim" },
          { text: "See https://dpm.coursion.studio/cli.md", tone: "" },
        ];
      case "help":
      case "--help":
      case "-h":
        return HELP.map((text) => ({ text, tone: text.startsWith("  ") ? "" : "dim" }));
      case "version":
      case "--version":
        return [{ text: "1.7.0 (29)", tone: "" }];
      default: {
        const known = ["record", "battery", "devices", "apps", "docs", "help", "version"];
        const guess = known.find((name) => name.startsWith(command.slice(0, 3)));
        return [
          {
            text: `dpm: unknown command '${command}'${guess ? ` — did you mean '${guess}'?` : ""}`,
            tone: "bad",
          },
          { text: "Run 'dpm help' to see every command.", tone: "dim" },
        ];
      }
    }
  }

  function terminalStage(section) {
    const body = $("[data-term-body]", section);
    const input = $("[data-term-input]", section);
    if (!body || !input) return;

    const print = (text, tone = "") => {
      const row = document.createElement("div");
      row.className = `term-line${tone ? ` ${tone}` : ""}`;
      row.textContent = text === "" ? " " : text;
      body.appendChild(row);
      body.scrollTop = body.scrollHeight;
      return row;
    };

    const run = (command) => {
      print(`$ ${command}`, "cmd");
      answer(command).forEach((line) => print(line.text, line.tone));
      body.scrollTop = body.scrollHeight;
    };

    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      const value = input.value.trim();
      if (!value) return;
      run(value);
      input.value = "";
    });

    const demo = "dpm record --platform android --package com.example.shop --max-app-memory 400 --out perf.json";

    if (STATIC || REDUCED) {
      run("dpm devices");
      run(demo);
      return;
    }

    let started = false;
    const type = async () => {
      run("dpm devices");
      await new Promise((resolve) => setTimeout(resolve, 520));
      const row = print("$ ", "cmd");
      for (let i = 0; i < demo.length; i += 1) {
        row.textContent = `$ ${demo.slice(0, i + 1)}`;
        body.scrollTop = body.scrollHeight;
        await new Promise((resolve) => setTimeout(resolve, 14));
      }
      await new Promise((resolve) => setTimeout(resolve, 260));
      answer(demo).forEach((line) => print(line.text, line.tone));
      body.scrollTop = body.scrollHeight;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started) {
            started = true;
            type();
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(section);
  }

  /* ── copy buttons ─────────────────────────────────────────────────────── */

  function copyButtons() {
    $$(".copy-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const code = button.parentElement.querySelector("code");
        if (!code) return;
        navigator.clipboard.writeText(code.textContent.trim()).then(() => {
          button.classList.add("copied");
          const label = button.querySelector("span");
          const previous = label ? label.textContent : "";
          if (label) label.textContent = "Copied";
          setTimeout(() => {
            button.classList.remove("copied");
            if (label) label.textContent = previous;
          }, 1600);
        });
      });
    });
  }

  const boot = () => {
    $$('[data-stage="rig"]').forEach(rigStage);
    $$('[data-stage="chart"]').forEach(chartStage);
    $$('[data-stage="terminal"]').forEach(terminalStage);
    copyButtons();
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
