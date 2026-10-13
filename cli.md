# dpm — Device Performance Monitor CLI

`dpm` is the Device Performance Monitor app running headless: it samples a real Android device, iOS Simulator or iPhone/iPad, writes JSON, and exits non-zero when a performance budget is exceeded. Install it from the app: Settings → Command line → Install.

## Commands

### `dpm record` — Sample one app's live metrics and write a session JSON.

Samples the app for --duration seconds with the same collectors the app uses, then writes every sample plus a min/avg/max summary per metric. Budgets turn it into a CI gate: the command exits 1 when one is exceeded.

```
dpm record --platform <android|simulator|iosDevice> --package <id> --out <file.json> [options]
```

| Option | Meaning |
| --- | --- |
| `--platform <android\|simulator\|iosDevice>` | Where the app runs. **Required.** |
| `--package <id>` | Package name or bundle identifier. **Required.** |
| `--out <file.json>` | Where to write the session. Use - for stdout. **Required.** |
| `--serial <id>` | Device serial or UDID. Default: the first ready device. |
| `--duration <seconds>` | How long to sample. Default `60`. |
| `--interval <seconds>` | Time between samples. Default `1`. |
| `--max-app-memory <MB>` | Fail when peak app memory goes over this. |
| `--max-cpu <%>` | Fail when average app CPU goes over this. |
| `--quiet` | Only print errors. |

```bash
dpm record --platform android --package com.example.app --duration 60 --out session.json
```

```bash
dpm record --platform android --package com.example.app \
  --duration 120 --max-app-memory 400 --max-cpu 60 --out ci.json
```

### `dpm battery` — Record a labeled battery and thermal report.

Records drain rate, average and peak temperature and the charge curve under a label, so one run per branch can be diffed in CI. Android only. With --package it also reads the app's versionName.

```
dpm battery --label <name> --out <file.json> [options]
```

| Option | Meaning |
| --- | --- |
| `--label <name>` | What this run is, e.g. the branch. **Required.** |
| `--out <file.json>` | Where to write the report. Use - for stdout. **Required.** |
| `--serial <id>` | Device serial. Default: the first ready device. |
| `--package <id>` | App to stamp the report with. |
| `--duration <seconds>` | How long to record. Default `600`. |
| `--interval <seconds>` | Time between readings. Default `5`. |
| `--quiet` | Only print errors. |

```bash
dpm battery --label "$(git branch --show-current)" \
  --package com.example.app --duration 600 --out battery.json
```

### `dpm devices` — List connected devices and simulators.

Shows every device each installed toolchain can see, with the serial to pass as --serial. Platforms whose tool is missing are skipped.

```
dpm devices [options]
```

| Option | Meaning |
| --- | --- |
| `--platform <android\|simulator\|iosDevice>` | Only list one platform. |
| `--json` | Print JSON instead of a table. |

```bash
dpm devices
```

```bash
dpm devices --platform android --json
```

### `dpm apps` — List the apps installed on a device.

Prints package names you can pass to record. Only your own apps unless --all is given.

```
dpm apps --platform <android|simulator|iosDevice> [options]
```

| Option | Meaning |
| --- | --- |
| `--platform <android\|simulator\|iosDevice>` | Where to look. **Required.** |
| `--serial <id>` | Device serial or UDID. Default: the first ready device. |
| `--all` | Include system apps. |
| `--running` | Only apps that are running now. |
| `--json` | Print JSON instead of a table. |

```bash
dpm apps --platform android --running
```

```bash
dpm apps --platform android --json
```

### `dpm docs` — Print this reference as markdown or JSON.

Writes the full command reference — flags, defaults, exit codes and what the JSON contains — so an AI agent or a docs site can read it instead of guessing.

```
dpm docs [options]
```

| Option | Meaning |
| --- | --- |
| `--json` | Print JSON instead of a table. |

```bash
dpm docs > dpm.md
```

```bash
dpm docs --json
```

## Exit codes

- `0` — Success
- `1` — A budget was exceeded — the CI gate failed
- `2` — Bad usage — unknown command or option
- `3` — No tool, device or running app to read
- `4` — Could not write the output

## Reading the output

`dpm record` writes `summary` (min/avg/max per metric, e.g. `app_memory` in MB and `cpu_app` in percent), `samples` (every reading) and, when a budget was given, `gate` with `passed` and `failures`. `dpm battery` writes `drainPerHour`, `avgTempC`, `peakTempC` and the charge curve.

Run `dpm help <command>` for the authoritative flag list of the installed version.

