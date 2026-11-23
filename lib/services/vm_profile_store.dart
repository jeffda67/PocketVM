import 'package:shared_preferences/shared_preferences.dart';

import 'vm_profile.dart';

class VmProfileStore {
  static const _storageKey = 'pocketvm.vmProfiles.v1';

  Future<List<VmProfile>> loadProfiles() async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString(_storageKey);
    if (raw == null || raw.isEmpty) return [];
    try {
      return VmProfile.decodeList(raw);
    } catch (_) {
      // If saved data is malformed, keep the app usable rather than crashing.
      return [];
    }
  }

  Future<void> saveProfiles(List<VmProfile> profiles) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_storageKey, VmProfile.encodeList(profiles));
  }
}
