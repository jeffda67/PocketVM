import 'package:flutter/material.dart';

void main() => runApp(const PocketVmApp());

class PocketVmApp extends StatelessWidget {
  const PocketVmApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PocketVM',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0B0D14),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF8B5CF6),
          secondary: Color(0xFF35B9FF),
          surface: Color(0xFF171A25),
        ),
      ),
      home: const VmHomePage(),
    );
  }
}


class VmHomePage extends StatelessWidget {
  const VmHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0B0D14),
        title: const Text('PocketVM', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(onPressed: () {}, icon: const Icon(Icons.settings_outlined), tooltip: 'Settings'),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          const Text('Virtual machines', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text('Your virtual computers, in one place.', style: TextStyle(color: Colors.white.withValues(alpha: .65))),
          const SizedBox(height: 24),
          _FeatureCard(
            icon: Icons.computer_outlined,
            title: 'No VMs yet',
            subtitle: 'VM creation and guest boot are not available in this prototype.',
          ),
          const SizedBox(height: 14),
          FilledButton.icon(
            onPressed: () => _showComingSoon(context),
            icon: const Icon(Icons.add),
            label: const Text('Create virtual machine'),
            style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
          ),
          const SizedBox(height: 28),
          const Text('Planned features', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          const _FeatureCard(icon: Icons.linux, title: 'Linux guests', subtitle: 'ARM64 Linux support is the first engine milestone.'),
          const SizedBox(height: 12),
          const _FeatureCard(icon: Icons.speed, title: 'JIT research', subtitle: 'Explore acceleration options and iOS limitations.'),
          const SizedBox(height: 12),
          const _FeatureCard(icon: Icons.storage_outlined, title: 'Virtual disks & images', subtitle: 'Image import and storage configuration are planned.'),
          const SizedBox(height: 12),
          const _FeatureCard(icon: Icons.apple, title: 'macOS guests', subtitle: 'Long-term research item; not currently supported.'),
        ],
      ),
    );
  }


  void _showComingSoon(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('VM creation is planned for a future milestone.')),
    );
  }
}


class _FeatureCard extends StatelessWidget {
  const _FeatureCard({required this.icon, required this.title, required this.subtitle});
  final IconData icon;
  final String title;
  final String subtitle;


  @override
  Widget build(BuildContext context) {
    return Card(
      color: const Color(0xFF171A25),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(icon, size: 28, color: const Color(0xFF8B5CF6)),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
              const SizedBox(height: 4),
              Text(subtitle, style: TextStyle(color: Colors.white.withValues(alpha: .65))),
            ])),
          ],
        ),
      ),
    );
  }
}
