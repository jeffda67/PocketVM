# PocketVM

Experimental iOS VM manager. Currently a profile manager with image attachment/import, not a VM execution engine.

## Implemented
- Dark purple/blue Flutter dashboard
- VM profiles (OS type, RAM, virtual CPU, disk-size metadata)
- Local profile persistence and deletion
- Simulated run-state toggle (does not boot)
- Import supported image files into app Documents storage and attach them to a profile

## Image import
File picker accepts ISO, IMG, RAW, QCOW2, and VMDK. Imported files are copied into Documents/vm_images. Files are only stored and linked to profile metadata; they are not mounted or booted.

## Roadmap
- ARM64 Linux VM engine
- Console and guest input
- JIT research and iOS restrictions
- macOS guest feasibility research

## Development on Linux
Install Flutter, clone the repository, run `flutter pub get`, then `flutter run` on a supported target. iOS IPA builds require macOS/cloud macOS and signing.

**Current limitation:** Profile settings do not reserve resources or create a virtual disk. Actual guest execution is not implemented.
