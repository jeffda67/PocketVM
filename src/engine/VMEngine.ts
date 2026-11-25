/**
 * Platform-neutral contract for a native virtual-machine runtime.
 *
 * This module deliberately ships only an unavailable adapter. It gives the
 * UI and future iOS/Android native modules one stable contract without
 * pretending that a VM can boot before a real engine is bundled.
 */

export type GuestArchitecture = 'aarch64';

export type EngineAcceleration = 'hardware' | 'jit' | 'interpreter' | 'none';

export type VMEngineCapabilities = {
  available: boolean;
  hostPlatform: string;
  guestArchitectures: GuestArchitecture[];
  acceleration: EngineAcceleration;
  reason: string;
};

export type VMEngineConfig = {
  vmId: string;
  name: string;
  guestArchitecture: GuestArchitecture;
  memoryMiB: number;
  vcpus: number;
  diskCapacityGiB: number;
  installerIsoUri?: string;
  diskImageUri?: string;
};

export interface VMEngine {
  getCapabilities(): Promise<VMEngineCapabilities>;
  prepare(config: VMEngineConfig): Promise<void>;
  start(vmId: string): Promise<void>;
  pause(vmId: string): Promise<void>;
  resume(vmId: string): Promise<void>;
  stop(vmId: string): Promise<void>;
  dispose(vmId: string): Promise<void>;
}

export class VMEngineUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VMEngineUnavailableError';
  }
}

/**
 * Safe placeholder used until a native QEMU adapter is implemented.
 * Every lifecycle operation fails explicitly instead of reporting success.
 */
export function createUnavailableVMEngine(hostPlatform: string): VMEngine {
  const unavailable = async (): Promise<never> => {
    throw new VMEngineUnavailableError(
      'PocketVM has no native virtualization runtime installed for ' +
        hostPlatform +
        '. Your VM profile and imported files are saved, but no guest has started.',
    );
  };

  return {
    getCapabilities: async () => ({
      available: false,
      hostPlatform,
      guestArchitectures: [],
      acceleration: 'none',
      reason:
        'Native QEMU system emulation is not integrated yet. The first planned guest target is AArch64 Linux.',
    }),
    prepare: unavailable,
    start: unavailable,
    pause: unavailable,
    resume: unavailable,
    stop: unavailable,
    dispose: unavailable,
  };
}
