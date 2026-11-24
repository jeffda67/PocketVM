# PocketVM virtualization roadmap

**Research checked:** 2026-11-24  
**Status:** Architecture research only. PocketVM does not currently boot a guest OS.

## Executive decision

Build the first real engine around **QEMU system emulation for an AArch64 Linux guest**, with a deliberately small virtual machine (serial console first, then display and networking). Keep the React Native/Expo app as the management UI and put all native execution behind a platform-specific engine interface.

For iOS, the realistic baseline is a **JIT-less interpreter/emulation mode**, not hardware virtualization. A faster JIT-enabled mode may be explored only as an optional, device- and signing-dependent path; it must never be required for the normal signed build.

## Platform constraints

### iOS

- Apple's public Virtualization framework is a Mac API, not an iOS VM API. It supports Linux guests on Apple silicon and Intel Macs; Apple's documented macOS-guest path is specifically for Apple silicon Macs: https://developer.apple.com/documentation/virtualization and https://developer.apple.com/documentation/virtualization/virtualize-macos-on-a-mac.
- UTM's architecture notes explicitly say that Apple's Hypervisor.framework is not available on iOS. UTM uses QEMU for iOS and has a custom ARM64 TCTI path for JIT-less execution: https://github.com/utmapp/UTM/blob/main/Documentation/Architecture.md.
- UTM's iOS installation guide distinguishes its JIT-enabled sideloaded build from UTM SE, which uses a slower interpreter and does not require JIT. It also notes that JIT availability depends on the device, iOS version, and JIT-enabling/signing method: https://docs.getutm.app/installation/ios/.
- Apple's platform security documentation explains that writable-and-executable memory is tightly controlled on iOS/iPadOS and uses an Apple-only dynamic-code-signing entitlement: https://support.apple.com/en-ae/guide/security/sec15bfe098e/1/web.
- Therefore, an ordinary App Store-compatible IPA must not assume it can generate executable code at runtime. A profile saying "ARM64" does not mean the guest can run at native speed.

**PocketVM decision:** first target an interpreter-backed QEMU ARM64 system emulator, and benchmark it before promising usable desktop performance. Do not design the app around a private entitlement or a JIT workaround.

### QEMU execution model

QEMU's TCG is a dynamic translator that translates guest instruction blocks to host instructions. That is the fast JIT-style path; it is not automatically available in every sandbox. QEMU's documentation describes the translator and generated translation blocks: https://www.qemu.org/docs/master/devel/tcg.html.

UTM is a useful implementation reference because its iOS architecture uses a custom ARM64 TCTI/JIT-less path, while its macOS architecture can use QEMU with Hypervisor.framework. UTM's notes also describe an iOS-specific process model: QEMU runs its main loop on a pthread, rather than assuming it can spawn arbitrary child processes. PocketVM should study the current upstream and UTM fork diffs before choosing code to reuse.

### macOS guests

- Apple's supported macOS VM workflow is provided by Virtualization.framework on a Mac host; Apple documents configuring a macOS guest with the framework's macOS platform configuration.
- UTM's documented macOS path uses Virtualization.framework, while its iOS path uses QEMU. This is a different host capability, not a feature that can be switched on for an iPhone.
- **PocketVM iOS will not promise macOS guests.** Keep macOS guest support out of the initial mobile roadmap. Revisit it only if a separate macOS-hosted PocketVM app is built and tested on Apple hardware.

## Proposed architecture

1. **React Native UI:** VM profiles, image library, console/viewer, and user-facing status.
2. **Persistent VM model:** stable VM ID, guest architecture, RAM, vCPU count, disk capacity, boot media references, and engine-specific configuration. Keep file metadata separate from the engine's runtime state.
3. **Native engine contract:** getCapabilities, prepare, start, pause, resume, stop, and dispose, with structured progress and error events. The UI must show "unsupported" rather than pretending a placeholder action started a VM.
4. **iOS adapter:** a native Swift/Objective-C++ bridge around a minimal QEMU system-emulation build. First milestone: one AArch64 guest, serial console, one virtio block device, no GUI acceleration, no networking.
5. **Android adapter:** separate native integration. Do not assume iOS APIs or iOS signing constraints apply. Evaluate QEMU TCG first; only consider host acceleration where the target device and Android virtualization APIs actually permit it.
6. **Image store:** app-private copies with metadata and explicit cleanup. Later add multiple drives (boot ISO versus writable disk), disk creation, resize, and snapshots only after the engine can safely open the files.

## First guest target

Start with a small AArch64 Linux image on QEMU's generic virt machine, using a serial console and virtio storage. Avoid a full graphical desktop initially. The first acceptance test should be: create a profile, import a known ARM64 Linux image, boot to a login prompt, send keyboard input, shut down cleanly, and boot again with persistent disk state.

## Milestones

- [x] Keep the UI honest that VM start is not implemented.
- [x] Copy imported media into app-private storage and persist file metadata.
- [ ] Add a media library that distinguishes read-only installer ISOs from writable virtual disks.
- [ ] Add a typed native engine interface and capability reporting; keep it disconnected until a real native build exists.
- [ ] Build and benchmark a minimal AArch64 QEMU interpreter on an iOS device.
- [ ] Add serial console and lifecycle handling, then storage/network devices.
- [ ] Investigate optional JIT separately, with an explicit compatibility matrix and no dependency on it.
- [ ] Reassess macOS guests only for a future Mac-hosted product.

## Licensing and engineering gate

QEMU and UTM contain components under multiple open-source licenses. Before copying UTM-specific code or distributing a bundled engine, inventory every component, preserve notices, and confirm the exact license obligations. A QEMU integration is a native build project, not a JavaScript-only change.

## Sources

- Apple Virtualization framework: https://developer.apple.com/documentation/virtualization
- Apple macOS guest support: https://developer.apple.com/documentation/virtualization/virtualize-macos-on-a-mac
- Apple platform runtime security: https://support.apple.com/en-ae/guide/security/sec15bfe098e/1/web
- UTM architecture: https://github.com/utmapp/UTM/blob/main/Documentation/Architecture.md
- UTM iOS installation/JIT matrix: https://docs.getutm.app/installation/ios/
- QEMU TCG internals: https://www.qemu.org/docs/master/devel/tcg.html
