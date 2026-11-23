import 'dart:convert';

enum GuestOs { linux, other }

class VmProfile {
  const VmProfile({
    required this.id,
    required this.name,
    required this.os,
    required this.ramMb,
    required this.cpuCount,
    required this.diskGb,
    this.isRunning = false,
    this.imagePath,
    this.imageName,
  });

  final String id;
  final String name;
  final GuestOs os;
  final int ramMb;
  final int cpuCount;
  final int diskGb;
  final bool isRunning;
  final String? imagePath;
  final String? imageName;

  VmProfile copyWith({bool? isRunning, String? imagePath, String? imageName}) => VmProfile(id: id, name: name, os: os, ramMb: ramMb, cpuCount: cpuCount, diskGb: diskGb, isRunning: isRunning ?? this.isRunning, imagePath: imagePath ?? this.imagePath, imageName: imageName ?? this.imageName);

  Map<String, Object?> toJson() => {
        'id': id,
        'name': name,
        'os': os.name,
        'ramMb': ramMb,
        'cpuCount': cpuCount,
        'diskGb': diskGb,
        'isRunning': isRunning,
        'imagePath': imagePath,
        'imageName': imageName,
      };

  factory VmProfile.fromJson(Map<String, dynamic> json) => VmProfile(
        id: json['id'] as String,
        name: json['name'] as String,
        os: GuestOs.values.firstWhere(
          (value) => value.name == json['os'],
          orElse: () => GuestOs.other,
        ),
        ramMb: json['ramMb'] as int,
        cpuCount: json['cpuCount'] as int,
        diskGb: json['diskGb'] as int,
        isRunning: json['isRunning'] as bool? ?? false,
        imagePath: json['imagePath'] as String?,
        imageName: json['imageName'] as String?,
      );

  static String encodeList(List<VmProfile> profiles) =>
      jsonEncode(profiles.map((profile) => profile.toJson()).toList());

  static List<VmProfile> decodeList(String raw) =>
      (jsonDecode(raw) as List<dynamic>)
          .map((entry) => VmProfile.fromJson(entry as Map<String, dynamic>))
          .toList();
}
