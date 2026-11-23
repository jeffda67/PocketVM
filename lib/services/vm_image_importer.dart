import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:path_provider/path_provider.dart';

class ImportedVmImage {
  const ImportedVmImage({required this.path, required this.name});
  final String path;
  final String name;
}

class VmImageImporter {
  static const supportedExtensions = ['iso', 'img', 'raw', 'qcow2', 'vmdk'];

  Future<ImportedVmImage?> pickAndCopyImage() async {
    final picked = await FilePicker.platform.pickFiles(type: FileType.custom, allowedExtensions: supportedExtensions, allowMultiple: false, withData: false);
    if (picked == null || picked.files.isEmpty) return null;
    final file = picked.files.single;
    final sourcePath = file.path;
    if (sourcePath == null) throw Exception('File picker did not provide a readable path.');
    final source = File(sourcePath);
    if (!await source.exists()) throw Exception('Selected file is no longer available.');
    final appDocs = await getApplicationDocumentsDirectory();
    final folder = Directory('${appDocs.path}/vm_images');
    await folder.create(recursive: true);
    final safeName = file.name.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '_');
    final target = File('${folder.path}/${DateTime.now().microsecondsSinceEpoch}_$safeName');
    await source.copy(target.path);
    return ImportedVmImage(path: target.path, name: file.name);
  }
}
