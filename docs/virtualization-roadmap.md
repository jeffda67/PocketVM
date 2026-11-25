# PocketVM virtualization roadmap

**Research checked:** 2026-11-24  
**Status:** Architecture research plus a UI-facing engine contract. PocketVM does not currently boot a guest OS.

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
3. **Native engine contract:** `src/engine/VMEngine.ts` now defines getCapabilities, prepare, start, pause, resume, stop, and dispose. The current adapter is deliberately unavailable and reports that no runtime is installed; a real native adapter and structured progress/error events remain future work.
4. **Linux/Android development adapter:** first prove the minimal QEMU system-emulation core in a buildable Linux/Android harness, with one AArch64 guest, serial console, and one virtio block device. Keep GUI acceleration and networking out of the first milestone. This gives the project a testable native core without requiring a Mac.
5. **iOS adapter:** add a separate Swift/Objective-C++ bridge around the same minimal QEMU core. Use the interpreter/JIT-less path as the baseline; do not assume Hypervisor.framework or runtime code generation is available. Validate the native build through EAS/cloud macOS runners and real iPhone testing.
6. **Image store:** the UI now keeps one installer ISO reference separate from one writable-disk reference per VM, copies each into app-private storage, and cleans up replaced/removed files after saving the new profile state. A reusable cross-VM media library, multiple drives, disk creation/resize, and snapshots remain future work.

## First guest target

Start with a small AArch64 Linux image on QEMU's generic virt machine, using a serial console and virtio storage. Avoid a full graphical desktop initially. The first acceptance test should be: create a profile, import a known ARM64 Linux image, boot to a login prompt, send keyboard input, shut down cleanly, and boot again with persistent disk state.

## Milestones

- [x] Keep the UI honest that VM start is not implemented.
- [x] Copy imported media into app-private storage and persist file metadata.
- [x] Separate each VM's installer ISO from its writable virtual-disk attachment, including migration of older single-image profiles.
- [x] Add a typed native engine lifecycle interface and an explicit unavailable adapter; keep it disconnected until a real native build exists.
- [ ] Add a reusable cross-VM media library, multiple drive slots, and virtual-disk creation/resize.
- [ ] Build and benchmark a minimal AArch64 QEMU interpreter in a Linux/Android harness, then validate the JIT-less iOS port on a device.
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
