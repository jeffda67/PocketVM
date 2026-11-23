import 'package:flutter/material.dart';

import 'models/vm_profile.dart';
import 'services/vm_profile_store.dart';
import 'services/vm_image_importer.dart';

void main() => runApp(const PocketVmApp());

class PocketVmApp extends StatelessWidget {
  const PocketVmApp({super.key});

  @override
  Widget build(BuildContext context) {
    const purple = Color(0xFF8B5CF6);
    return MaterialApp(
      title: 'PocketVM',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0B0D14),
        colorScheme: const ColorScheme.dark(primary: purple, secondary: Color(0xFF35B9FF), surface: Color(0xFF171A25)),
        useMaterial3: true,
      ),
      home: const VmHomePage(),
    );
  }
}

class VmHomePage extends StatefulWidget {
  const VmHomePage({super.key});
  @override
  State<VmHomePage> createState() => _VmHomePageState();
}

class _VmHomePageState extends State<VmHomePage> {
  final _store = VmProfileStore();
  final _imageImporter = VmImageImporter();
  List<VmProfile> _profiles = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _loadProfiles(); }

  Future<void> _loadProfiles() async {
    final profiles = await _store.loadProfiles();
    if (!mounted) return;
    setState(() { _profiles = profiles; _loading = false; });
  }

  Future<void> _save() => _store.saveProfiles(_profiles);

  Future<void> _createProfile() async {
    final profile = await showDialog<VmProfile>(context: context, builder: (context) => const CreateVmDialog());
    if (profile == null) return;
    setState(() => _profiles = [..._profiles, profile]);
    await _save();
  }

  Future<void> _toggleRunState(VmProfile profile) async {
    // UI-only toggle; this does not start or stop an operating system.
    setState(() {
      _profiles = _profiles.map((item) => item.id == profile.id ? item.copyWith(isRunning: !item.isRunning) : item).toList();
    });
    await _save();
  }

  Future<void> _importImage(VmProfile profile) async {
    try {
      final image = await _imageImporter.pickAndCopyImage();
      if (image == null || !mounted) return;
      setState(() => _profiles = _profiles.map((item) => item.id == profile.id ? item.copyWith(imagePath: image.path, imageName: image.name) : item).toList());
      await _save();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Image copied: ${image.name}')));
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Import failed: $error')));
    }
  }

  Future<void> _deleteProfile(VmProfile profile) async {
    setState(() => _profiles = _profiles.where((item) => item.id != profile.id).toList());
    await _save();
  }

  @override
  Widget build(BuildContext context) {
    final runningCount = _profiles.where((vm) => vm.isRunning).length;
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0B0D14),
        title: const Text('PocketVM', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [IconButton(onPressed: () => showAboutDialog(context: context, applicationName: 'PocketVM', applicationVersion: '0.1.0', children: const [Text('VM profiles are stored locally. Run-state controls are simulated; guest execution is not implemented yet.')]), icon: const Icon(Icons.info_outline), tooltip: 'About')],
      ),
      floatingActionButton: FloatingActionButton.extended(onPressed: _createProfile, icon: const Icon(Icons.add), label: const Text('New VM profile')),
      body: _loading ? const Center(child: CircularProgressIndicator()) : ListView(
        padding: const EdgeInsets.fromLTRB(18, 12, 18, 100),
        children: [
          const Text('Virtual machines', style: TextStyle(fontSize: 27, fontWeight: FontWeight.w800)),
          const SizedBox(height: 7),
          Text('Manage your VM profiles', style: TextStyle(color: Colors.white.withOpacity(.65))),
          const SizedBox(height: 18),
          _SummaryCard(vmCount: _profiles.length, runningCount: runningCount),
          const SizedBox(height: 22),
          if (_profiles.isEmpty) _EmptyState(onCreate: _createProfile) else ...[
            const Text('Your profiles', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            ..._profiles.map((profile) => VmProfileCard(profile: profile, onToggle: () => _toggleRunState(profile), onDelete: () => _deleteProfile(profile), onImportImage: () => _importImage(profile))),
          ],
          const SizedBox(height: 24),
          const Text('Engine roadmap', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          const RoadmapTile(icon: Icons.memory, title: 'ARM64 Linux engine', detail: 'Guest execution is the first engine milestone.', state: 'Not implemented'),
          const RoadmapTile(icon: Icons.speed, title: 'JIT acceleration', detail: 'Research native-code execution and iOS constraints.', state: 'Research'),
          const RoadmapTile(icon: Icons.folder_open, title: 'Image import', detail: 'Attach ISO and disk image files to profiles.', state: 'Planned'),
          const RoadmapTile(icon: Icons.apple, title: 'macOS guests', detail: 'Long-term feasibility and licensing investigation.', state: 'Research'),
        ],
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.vmCount, required this.runningCount});
  final int vmCount, runningCount;
  @override
  Widget build(BuildContext context) => Card(
    color: const Color(0xFF171A25),
    child: Padding(padding: const EdgeInsets.all(16), child: Row(children: [
      const Icon(Icons.devices, color: Color(0xFF8B5CF6), size: 28), const SizedBox(width: 14),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('$vmCount profiles', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        Text('$runningCount marked running', style: TextStyle(color: Colors.white.withOpacity(.65))),
      ])),
    ])),
  );
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onCreate});
  final VoidCallback onCreate;
  @override
  Widget build(BuildContext context) => Card(color: const Color(0xFF171A25), child: Padding(
    padding: const EdgeInsets.all(22), child: Column(children: [
      const Icon(Icons.computer, size: 48, color: Color(0xFF8B5CF6)), const SizedBox(height: 12),
      const Text('No VM profiles yet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
      const SizedBox(height: 6),
      Text('Create a profile to save your planned VM settings.', textAlign: TextAlign.center, style: TextStyle(color: Colors.white.withOpacity(.65))),
      const SizedBox(height: 14), OutlinedButton.icon(onPressed: onCreate, icon: const Icon(Icons.add), label: const Text('Create profile')),
    ]),
  ));
}

class VmProfileCard extends StatelessWidget {
  const VmProfileCard({required this.profile, required this.onToggle, required this.onDelete, required this.onImportImage});
  final VmProfile profile;
  final VoidCallback onToggle, onDelete, onImportImage;
  @override
  Widget build(BuildContext context) => Card(color: const Color(0xFF171A25), margin: const EdgeInsets.only(bottom: 10), child: Padding(
    padding: const EdgeInsets.all(14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Icon(profile.os == GuestOs.linux ? Icons.terminal : Icons.desktop_windows, color: const Color(0xFF8B5CF6)),
        const SizedBox(width: 10), Expanded(child: Text(profile.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17))),
        Icon(Icons.circle, size: 12, color: profile.isRunning ? Colors.greenAccent : Colors.white24),
      ]),
      const SizedBox(height: 10),
      Text('${profile.os == GuestOs.linux ? 'Linux' : 'Other OS'}  •  ${profile.ramMb} MB RAM  •  ${profile.cpuCount} CPU  •  ${profile.diskGb} GB disk', style: TextStyle(color: Colors.white.withOpacity(.65), fontSize: 12)),
      const SizedBox(height: 8),
      Text(profile.imageName ?? 'No image attached', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.white54, fontSize: 12)),
      OutlinedButton.icon(onPressed: onImportImage, icon: const Icon(Icons.file_open), label: Text(profile.imageName == null ? 'Import ISO / disk image' : 'Replace image')),
      const SizedBox(height: 8),
      Row(children: [
        Expanded(child: OutlinedButton.icon(onPressed: onToggle, icon: Icon(profile.isRunning ? Icons.stop : Icons.play_arrow), label: Text(profile.isRunning ? 'Mark stopped' : 'Mark running'))),
        IconButton(onPressed: onDelete, icon: const Icon(Icons.delete_outline), tooltip: 'Delete profile'),
      ]),
    ]),
  ));
}

class RoadmapTile extends StatelessWidget {
  const RoadmapTile({required this.icon, required this.title, required this.detail, required this.state});
  final IconData icon;
  final String title, detail, state;
  @override
  Widget build(BuildContext context) => Card(color: const Color(0xFF171A25), margin: const EdgeInsets.only(bottom: 8), child: ListTile(
    leading: Icon(icon, color: const Color(0xFF35B9FF)), title: Text(title), subtitle: Text(detail),
    trailing: Text(state, style: const TextStyle(fontSize: 11, color: Colors.white54)),
  ));
}

class CreateVmDialog extends StatefulWidget {
  const CreateVmDialog({super.key});
  @override
  State<CreateVmDialog> createState() => _CreateVmDialogState();
}

class _CreateVmDialogState extends State<CreateVmDialog> {
  final _nameController = TextEditingController();
  GuestOs _os = GuestOs.linux;
  int _ram = 2048, _cpu = 2, _disk = 16;
  @override
  void dispose() { _nameController.dispose(); super.dispose(); }

  void _submit() {
    final name = _nameController.text.trim();
    if (name.isEmpty) return;
    Navigator.of(context).pop(VmProfile(id: DateTime.now().microsecondsSinceEpoch.toString(), name: name, os: _os, ramMb: _ram, cpuCount: _cpu, diskGb: _disk));
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    backgroundColor: const Color(0xFF171A25), title: const Text('New VM profile'),
    content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
      TextField(controller: _nameController, autofocus: true, onChanged: (_) => setState(() {}), decoration: const InputDecoration(labelText: 'Profile name', hintText: 'Ubuntu test VM')),
      const SizedBox(height: 12),
      DropdownButtonFormField<GuestOs>(value: _os, decoration: const InputDecoration(labelText: 'Guest OS'), items: const [
        DropdownMenuItem(value: GuestOs.linux, child: Text('Linux')), DropdownMenuItem(value: GuestOs.other, child: Text('Other / experimental')),
      ], onChanged: (value) => setState(() => _os = value ?? GuestOs.linux)),
      const SizedBox(height: 12),
      DropdownButtonFormField<int>(value: _ram, decoration: const InputDecoration(labelText: 'Memory (RAM)'), items: [1024, 2048, 4096, 8192].map((mb) => DropdownMenuItem(value: mb, child: Text('$mb MB'))).toList(), onChanged: (value) => setState(() => _ram = value ?? 2048)),
      const SizedBox(height: 12),
      DropdownButtonFormField<int>(value: _cpu, decoration: const InputDecoration(labelText: 'Virtual CPUs'), items: [1, 2, 4, 8].map((cores) => DropdownMenuItem(value: cores, child: Text('$cores cores'))).toList(), onChanged: (value) => setState(() => _cpu = value ?? 2)),
      const SizedBox(height: 12),
      DropdownButtonFormField<int>(value: _disk, decoration: const InputDecoration(labelText: 'Virtual disk size'), items: [8, 16, 32, 64, 128].map((gb) => DropdownMenuItem(value: gb, child: Text('$gb GB'))).toList(), onChanged: (value) => setState(() => _disk = value ?? 16)),
      const SizedBox(height: 8),
      Text('This saves a profile only. It does not allocate a disk or boot an operating system.', style: TextStyle(color: Colors.white.withOpacity(.6), fontSize: 12)),
    ])),
    actions: [TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')), FilledButton(onPressed: _nameController.text.trim().isEmpty ? null : _submit, child: const Text('Save profile'))],
  );
}
