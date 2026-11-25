# PocketVM

Experimental iOS VM profile manager built with React Native, Expo and TypeScript. Development is supported on Linux; iOS builds can be produced with EAS Build in the cloud.

## Current prototype

- Dark neon-blue/purple PocketVM dashboard
- Create VM profiles with guest OS, RAM, CPU and virtual disk size
- Profiles saved locally with AsyncStorage
- Attach one installer ISO and one writable virtual disk separately to each VM profile; files are copied into PocketVM's private app storage with filename, format, MIME type, size, and import time
- Replace or remove either attachment; profile edits preserve both, and legacy single-image profiles are migrated by file extension
- Delete profiles
- Route start requests through an explicit native-engine contract that reports the runtime as unavailable instead of pretending a VM started

> **Important:** This prototype is a profile manager only. It does not boot virtual machines, emulate hardware, or implement JIT. The actual native virtualization backend is a separate research/development milestone, especially for iOS.

## Stack

- React Native
- Expo SDK 54
- TypeScript
- AsyncStorage
- Expo Document Picker

## Run on Linux

Install Node.js (LTS) and npm, then from the project directory:

```bash
npm install
npx expo start
```

Scan the QR code using Expo Go, or run the app in an Android emulator.

Type check:

```bash
npm run typecheck
```

## Virtualization feasibility

See [docs/virtualization-roadmap.md](docs/virtualization-roadmap.md) for the researched iOS/Android backend direction, JIT constraints, and macOS guest limitations. The current app still does not boot guests.

## Cloud iOS build

Install EAS CLI, authenticate, and configure the project:

```bash
npm install
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform ios --profile production
```

A distribution IPA requires appropriate Apple signing/account setup. Cloud building removes the need to own a Mac for compilation, but it does not bypass Apple's signing or iOS virtualization restrictions.

## Next milestones

1. Verify the updated app on a physical Android device and fix runtime issues.
2. Build a reusable media library with multiple installer ISOs and writable disks, plus virtual-disk creation and resize.
3. Build and benchmark a minimal native AArch64 QEMU interpreter for Android first, then assess the iOS port and signing constraints.
4. Connect the native engine contract to real prepare/start/pause/resume/stop operations and a serial console.
5. Evaluate macOS guest support separately; do not promise it on iOS.

## Project

PocketVM is experimental. No VM engine has been integrated yet.