# PocketVM

PocketVM is an experimental iOS virtual-machine manager inspired by UTM and Henge. The initial milestone focuses on the app shell and project structure; VM execution is not implemented yet.

## Goals
- Manage VM profiles (initial UI prototype)
- Import Linux installation images
- Configure virtual CPU, RAM, and storage
- Boot ARM64 Linux guests as a first milestone
- Investigate JIT-compatible execution options and platform constraints
- Explore macOS guest support as a long-term research goal

## Development
This repository starts with a Flutter app so the UI can be developed on Linux. iOS release builds require a macOS build environment (for example, Codemagic).

1. Install Flutter on your development machine.
2. Run `flutter pub get`.
3. Run `flutter run` for a supported local target.
4. For iOS builds, configure a macOS CI workflow and Apple signing as needed.

## Status
- [x] Initial Flutter app shell
- [ ] VM profile persistence
- [ ] ISO/image import
- [ ] Linux guest execution engine
- [ ] JIT integration research/prototype
- [ ] VM console and input
- [ ] macOS guest feasibility research

## Disclaimer
PocketVM is experimental. It does not currently execute virtual machines. iOS restrictions, signing, JIT entitlements/availability, and guest OS licensing may affect future features.