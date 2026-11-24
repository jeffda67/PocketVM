# PocketVM

Experimental iOS VM profile manager built with React Native, Expo and TypeScript. Development is supported on Linux; iOS builds can be produced with EAS Build in the cloud.

## Current prototype

- Dark neon-blue/purple PocketVM dashboard
- Create VM profiles with guest OS, RAM, CPU and virtual disk size
- Profiles saved locally with AsyncStorage
- Import an ISO or virtual disk file into PocketVM's private app storage, with filename, extension, MIME type, size, and import time saved in the VM profile
- Replace or remove imported files; deleting a VM also removes its managed image copy
- Delete profiles
- Clearly labels start/stop as not connected to a VM engine yet

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

1. Verify the app on Android/Expo Go and fix issues.
2. Improve image import to copy/manage guest image files safely and show metadata.
3. Research native ARM64 Linux virtualization options and iOS entitlement/JIT limitations.
4. Design a native engine interface and integrate only when a feasible backend is identified.
5. Evaluate macOS guest support separately.

## Project

PocketVM is experimental. No VM engine has been integrated yet.