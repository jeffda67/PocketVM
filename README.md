# PocketVM

PocketVM is an experimental iOS virtual-machine manager inspired by UTM and Henge. The app currently provides a **local VM profile manager UI**, not a VM execution engine.

## Implemented
- Dark purple/blue Flutter dashboard
- Create VM profiles with guest type, RAM, virtual CPU count, and virtual disk size fields
- Save/load profiles locally using SharedPreferences
- Delete profiles
- UI-only running/stopped state toggle (does **not** boot a guest)

## Planned / research
- Import ISO and disk images
- ARM64 Linux guest execution engine
- VM console and keyboard/mouse input
- JIT execution research, including iOS platform and distribution limitations
- macOS guest feasibility (advanced research)

## Development on Linux
1. Install Flutter SDK on Linux.
2. Clone this repository.
3. Run `flutter pub get`.
4. Run `flutter run` on a supported target.

iOS IPA builds require a macOS build environment (e.g. a cloud macOS CI service) and appropriate signing for installation/distribution.

## Current status
- [x] Flutter app shell
- [x] VM profile model
- [x] Local profile persistence
- [x] Profile create/delete UI
- [x] Simulated run-state toggle
- [ ] VM engine / actual guest execution
- [ ] Image import
- [ ] Console and guest input
- [ ] JIT prototype
- [ ] macOS guest research

**Transparency:** profile RAM/CPU/disk fields are saved metadata only; no resources are reserved, no virtual disk is created, and no operating system boots yet.