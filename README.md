# Device Performance Monitor

A native macOS app that watches the live performance of **one app** on an Android
device, an iOS Simulator, or a real iPhone or iPad. You pick the platform, the
device and the app in a setup wizard — nothing is hardcoded.

## Install

```bash
brew install --cask Coursion-Studio/homebrew-tap/device-performance-monitor
```

Or download the DMG from [Releases](https://github.com/Coursion-Studio/device-performance-monitor/releases).

Requires macOS 14 or later. Notarized.

## What it measures

| | Android | iOS Simulator | iPhone / iPad |
| --- | --- | --- | --- |
| Memory (footprint, resident, swapped/compressed, per-category breakdown) | ✅ | ✅ | ✅ |
| App CPU | ✅ | ✅ | ✅ |
| Device CPU | ✅ | — | — |
| Threads | ✅ | ✅ | ✅ |
| Frame rate | ✅ | — | — |
| Janky frames, frame time p95 | ✅ | — | — |
| Battery level, temperature, thermal state | ✅ | — | — |
| Disk I/O | best-effort | — | ✅ |

Frame rate reads from SurfaceFlinger, so apps that render through a
`SurfaceView` — Unity and other engines — are measured properly rather than
reported as a flat zero.

A metric a platform cannot report renders as **explicitly unavailable, with the
reason**. It is never shown as a zero, because a zero is a measurement and
"we cannot see this here" is not.

## Also

- **Cache release test** (Android): ask the app to drop its caches and measure
  what actually came back. A leak will not release.
- **CSV export** of every sample, including the per-pool breakdown.

## Requirements

| Platform | Needs |
| --- | --- |
| Android | `brew install --cask android-platform-tools`, USB debugging approved |
| iOS Simulator | Xcode, with a simulator booted |
| iPhone / iPad | `pipx install pymobiledevice3`, device paired and trusted |

No admin password or root access is needed, including for real iOS devices.

---

© 2026 Coursion. All rights reserved.
