import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { createUnavailableVMEngine } from './src/engine/VMEngine';

type VMImage = { uri: string; name: string; size?: number; mimeType?: string; importedAt: string; format: string };
type MediaKind = 'installer' | 'disk';
type VM = { id: string; name: string; os: string; ram: number; cpu: number; disk: number; bootIso?: VMImage | string; diskImage?: VMImage | string; image?: VMImage | string; status: 'Stopped' | 'Running' };
const STORAGE_KEY = 'pocketvm.profiles.v1';
const DISK_IMAGE_FORMATS = new Set(['qcow2', 'img', 'raw', 'vhd', 'vhdx', 'vdi', 'vmdk']);
const vmEngine = createUnavailableVMEngine(Platform.OS);
const initial: VM[] = [];

const imageUri = (image?: VMImage | string) => typeof image === 'string' ? image : image?.uri;
const imageName = (image?: VMImage | string) => !image ? 'No file attached' : typeof image === 'string' ? image.split('/').pop() || 'Imported image' : image.name;
const formatBytes = (bytes?: number) => {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return 'Size unavailable';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes, unit = 0;
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit += 1; }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
};
const imageMeta = (image: VMImage | string) => typeof image === 'string'
  ? 'Older attachment · stored path'
  : `${image.format.toUpperCase()} · ${formatBytes(image.size)} · saved in app storage`;
const inferImageFormat = (image: VMImage | string) => {
  if (typeof image !== 'string') return image.format.toLowerCase();
  const fileName = image.split('/').pop() || '';
  return fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : '';
};
const migrateVM = (vm: VM): VM => {
  const migrated = { ...vm };
  const legacyImage = migrated.image;
  delete migrated.image;
  if (legacyImage && !migrated.bootIso && !migrated.diskImage) {
    if (inferImageFormat(legacyImage) === 'iso') migrated.bootIso = legacyImage;
    else migrated.diskImage = legacyImage;
  }
  return migrated;
};

export default function App() {
  const [vms, setVms] = useState<VM[]>(initial);
  const [loaded, setLoaded] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('My Linux VM');
  const [ram, setRam] = useState('2048');
  const [cpu, setCpu] = useState('2');
  const [disk, setDisk] = useState('16');
  const [guest, setGuest] = useState('Linux ARM64');
  const [selectedTab, setSelectedTab] = useState('Machines');

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (!active || !raw) return;
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setVms(parsed.map(item => migrateVM(item as VM)));
      })
      .catch(() => Alert.alert('Storage error', 'PocketVM could not read saved VM profiles.'))
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => { if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(vms)).catch(() => Alert.alert('Save error', 'Could not save VM profiles.')); }, [vms, loaded]);

  const createVM = () => {
    const parsedRam = Number(ram), parsedCpu = Number(cpu), parsedDisk = Number(disk);
    if (!name.trim() || !guest.trim() || !Number.isFinite(parsedRam) || parsedRam < 256 || !Number.isInteger(parsedCpu) || parsedCpu < 1 || !Number.isFinite(parsedDisk) || parsedDisk < 1) {
      Alert.alert('Check your settings', 'Enter a name and guest OS, RAM of at least 256 MB, at least 1 CPU core, and disk size of at least 1 GB.'); return;
    }
    const vm: VM = { id: editingId ?? Date.now().toString(), name: name.trim(), os: guest.trim(), ram: parsedRam, cpu: parsedCpu, disk: parsedDisk, status: 'Stopped' };
    setVms(old => editingId ? old.map(item => item.id === editingId ? { ...vm, bootIso: item.bootIso, diskImage: item.diskImage } : item) : [vm, ...old]);
    setShowCreate(false); setEditingId(null); setName('My Linux VM'); setRam('2048'); setCpu('2'); setDisk('16'); setGuest('Linux ARM64');
  };
  const editVM = (vm: VM) => { setEditingId(vm.id); setName(vm.name); setGuest(vm.os); setRam(String(vm.ram)); setCpu(String(vm.cpu)); setDisk(String(vm.disk)); setShowCreate(true); };
  const removeStoredImage = async (image?: VMImage | string) => {
    const uri = imageUri(image);
    const folder = FileSystem.documentDirectory ? FileSystem.documentDirectory + 'images/' : null;
    // Never delete a URI outside PocketVM's own image directory.
    if (!uri || !folder || !uri.startsWith(folder)) return;
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      Alert.alert('Storage cleanup warning', 'PocketVM could not remove an old image file.');
    }
  };
  const importImage = async (id: string, kind: MediaKind) => {
    let copiedUri: string | undefined;
    try {
      const owner = vms.find(vm => vm.id === id);
      if (!owner) throw new Error('This VM profile no longer exists.');
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (!FileSystem.documentDirectory) throw new Error('PocketVM app storage is unavailable on this device.');
      const folder = FileSystem.documentDirectory + 'images/';
      const folderInfo = await FileSystem.getInfoAsync(folder);
      if (!folderInfo.exists) await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
      const extension = asset.name.includes('.') ? asset.name.split('.').pop()!.toLowerCase() : 'unknown';
      const supported = kind === 'installer' ? extension === 'iso' : DISK_IMAGE_FORMATS.has(extension);
      if (!supported) {
        throw new Error(kind === 'installer'
          ? 'Choose an installer ISO (.iso).'
          : 'Choose a virtual disk (.qcow2, .img, .raw, .vhd, .vhdx, .vdi, or .vmdk).');
      }
      const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const target = folder + Date.now() + '_' + safeName;
      await FileSystem.copyAsync({ from: asset.uri, to: target });
      copiedUri = target;
      const copiedInfo = await FileSystem.getInfoAsync(target);
      if (!copiedInfo.exists || copiedInfo.isDirectory) throw new Error('PocketVM could not verify the copied file.');
      if (asset.size != null && copiedInfo.size != null && asset.size !== copiedInfo.size) throw new Error('The copied file size does not match the selected file.');
      const previous = kind === 'installer' ? owner.bootIso : owner.diskImage;
      const imported: VMImage = {
        uri: target,
        name: asset.name,
        size: copiedInfo.size ?? asset.size,
        mimeType: asset.mimeType,
        importedAt: new Date().toISOString(),
        format: extension,
      };
      const updated = vms.map(vm => vm.id !== id
        ? vm
        : kind === 'installer' ? { ...vm, bootIso: imported } : { ...vm, diskImage: imported });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setVms(updated);
      await removeStoredImage(previous);
      Alert.alert('File imported', asset.name + '\nA private copy and its file details are saved in PocketVM. Guest boot is not implemented yet.');
    } catch (error) {
      if (copiedUri) {
        try { await FileSystem.deleteAsync(copiedUri, { idempotent: true }); } catch { /* best-effort rollback */ }
      }
      Alert.alert('Import failed', error instanceof Error ? error.message : 'Could not copy the selected file.');
    }
  };
  const removeImage = (id: string, kind: MediaKind) => Alert.alert('Remove attached file?', 'This deletes PocketVM’s private copy of the selected file.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => {
      const vm = vms.find(item => item.id === id);
      const previous = kind === 'installer' ? vm?.bootIso : vm?.diskImage;
      const updated = vms.map(item => item.id !== id
        ? item
        : kind === 'installer' ? { ...item, bootIso: undefined } : { ...item, diskImage: undefined });
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setVms(updated);
        await removeStoredImage(previous);
      } catch {
        Alert.alert('Storage error', 'PocketVM could not save this change. The attached file was kept.');
      }
    } },
  ]);
  const removeVM = (id: string) => Alert.alert('Delete profile?', 'This removes the saved VM profile and its imported image file.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      const vm = vms.find(item => item.id === id);
      const updated = vms.filter(item => item.id !== id);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setVms(updated);
        await Promise.all([removeStoredImage(vm?.bootIso), removeStoredImage(vm?.diskImage), removeStoredImage(vm?.image)]);
      } catch {
        Alert.alert('Storage error', 'PocketVM could not delete this profile safely.');
      }
    } },
  ]);
  const toggleVM = async (vm: VM) => {
    try {
      await vmEngine.start(vm.id);
    } catch (error) {
      Alert.alert('VM engine not connected', error instanceof Error ? error.message : 'No native VM engine is installed.');
    }
  };
  const resetProfiles = () => Alert.alert('Delete all VM profiles?', 'This permanently clears all saved profiles and their imported image files from this app.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete all', style: 'destructive', onPress: async () => { try { await AsyncStorage.removeItem(STORAGE_KEY); setVms([]); await Promise.all(vms.flatMap(vm => [removeStoredImage(vm.bootIso), removeStoredImage(vm.diskImage), removeStoredImage(vm.image)])); } catch { Alert.alert('Storage error', 'PocketVM could not finish clearing saved data.'); } } }]);
  const Card = ({vm}: {vm:VM}) => (
    <View style={styles.card}>
      <View style={styles.cardHead}><View style={styles.osIcon}><Text style={styles.iconText}>▣</Text></View><View style={{flex:1}}><Text style={styles.vmName}>{vm.name}</Text><Text style={styles.subtitle}>{vm.os}</Text></View><View style={styles.badge}><Text style={styles.badgeText}>{vm.status}</Text></View></View>
      <View style={styles.stats}><Stat label="MEMORY" value={vm.ram >= 1024 ? (vm.ram/1024).toFixed(vm.ram%1024?1:0)+' GB' : vm.ram+' MB'}/><Stat label="CPU" value={vm.cpu+' cores'}/><Stat label="DISK" value={vm.disk+' GB'}/></View>
      <View style={styles.imageRow}>
        <View style={{flex:1}}>
          <Text style={styles.mediaKind}>INSTALLER ISO · READ-ONLY SOURCE</Text>
          <Text style={styles.imageLabel} numberOfLines={1}>{imageName(vm.bootIso)}</Text>
          <Text style={styles.imageMeta}>{vm.bootIso ? imageMeta(vm.bootIso) : 'Attach a bootable .iso installer'}</Text>
        </View>
        <TouchableOpacity style={styles.attachButton} onPress={() => importImage(vm.id, 'installer')}><Text style={styles.attachText}>{vm.bootIso ? 'Replace' : 'Add ISO'}</Text></TouchableOpacity>
        {vm.bootIso ? <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(vm.id, 'installer')}><Text style={styles.removeImageText}>Remove</Text></TouchableOpacity> : null}
      </View>
      <View style={styles.imageRow}>
        <View style={{flex:1}}>
          <Text style={styles.mediaKind}>WRITABLE VIRTUAL DISK</Text>
          <Text style={styles.imageLabel} numberOfLines={1}>{imageName(vm.diskImage)}</Text>
          <Text style={styles.imageMeta}>{vm.diskImage ? imageMeta(vm.diskImage) : 'Attach a QCOW2, IMG, RAW, VHD, VHDX, VDI, or VMDK disk'}</Text>
        </View>
        <TouchableOpacity style={styles.attachButton} onPress={() => importImage(vm.id, 'disk')}><Text style={styles.attachText}>{vm.diskImage ? 'Replace' : 'Add disk'}</Text></TouchableOpacity>
        {vm.diskImage ? <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(vm.id, 'disk')}><Text style={styles.removeImageText}>Remove</Text></TouchableOpacity> : null}
      </View>
      <View style={styles.actions}><TouchableOpacity style={styles.startButton} onPress={() => toggleVM(vm)}><Text style={styles.startText}>▶  Start VM</Text></TouchableOpacity><TouchableOpacity style={styles.editButton} onPress={() => editVM(vm)}><Text style={styles.editText}>Edit</Text></TouchableOpacity><TouchableOpacity style={styles.deleteButton} onPress={() => removeVM(vm.id)}><Text style={styles.deleteText}>⌫</Text></TouchableOpacity></View>
    </View>
  );
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.page}>
        {selectedTab === 'Machines' ? (
          <>
            <View style={styles.top}>
              <View style={styles.logo}><Text style={styles.logoText}>P</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.brand}>PocketVM</Text>
                <Text style={styles.tagline}>Virtual machines. In your pocket.</Text>
              </View>
              <View style={styles.statusDot} />
            </View>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>VIRTUALIZATION LAB  /  PREVIEW</Text>
              <Text style={styles.heroTitle}>Your machines.{'\n'}Your rules.</Text>
              <Text style={styles.heroDesc}>Manage your virtual machine profiles from one clean workspace.</Text>
              <View style={styles.heroBottom}>
                <View>
                  <Text style={styles.number}>{vms.length.toString().padStart(2, '0')}</Text>
                  <Text style={styles.heroLabel}>MACHINES</Text>
                </View>
                <TouchableOpacity style={styles.newButton} onPress={() => setShowCreate(true)}>
                  <Text style={styles.newButtonText}>＋  New VM</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Machines</Text>
              <Text style={styles.count}>{vms.length} PROFILE{vms.length === 1 ? '' : 'S'}</Text>
            </View>
            {vms.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>⌘</Text>
                <Text style={styles.emptyTitle}>No machines yet</Text>
                <Text style={styles.emptyDesc}>Create your first VM profile to get your workspace started.</Text>
                <TouchableOpacity style={styles.emptyButton} onPress={() => setShowCreate(true)}>
                  <Text style={styles.newButtonText}>Create first machine</Text>
                </TouchableOpacity>
              </View>
            ) : vms.map(vm => <Card key={vm.id} vm={vm} />)}
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>ENGINE STATUS  ·  IN DEVELOPMENT</Text>
              <Text style={styles.noticeText}>Profiles and local saving work in this prototype. Actual guest booting, hardware virtualization, and JIT are not connected yet.</Text>
            </View>
            <Text style={styles.footer}>POCKETVM  •  BUILD 0.2.0  •  EXPERIMENTAL</Text>
          </>
        ) : (
          <View style={styles.settingsPage}>
            <Text style={styles.settingsEyebrow}>POCKETVM</Text>
            <Text style={styles.settingsTitle}>Settings</Text>
            <View style={styles.settingsCard}>
              <Text style={styles.settingsCardTitle}>Storage</Text>
              <Text style={styles.settingsText}>VM profiles are stored locally. Installer ISOs and writable disk images have separate attachments; imported files are copied into PocketVM's private app storage with file details.</Text>
            </View>
            <View style={styles.settingsCard}>
              <Text style={styles.settingsCardTitle}>VM engine</Text>
              <Text style={styles.settingsText}>The native engine interface exists, but no QEMU runtime is installed yet. Starting a VM reports that it is unavailable.</Text>
            </View>
            <View style={styles.settingsCard}>
              <Text style={styles.settingsCardTitle}>App version</Text>
              <Text style={styles.settingsText}>PocketVM 0.2.0 · Experimental preview</Text>
            </View>
            <TouchableOpacity style={styles.resetButton} onPress={resetProfiles}>
              <Text style={styles.resetText}>Delete all VM profiles</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      <View style={styles.tabBar}><TouchableOpacity onPress={() => setSelectedTab('Machines')}><Text style={[styles.tab,selectedTab==='Machines'&&styles.activeTab]}>▣  Machines</Text></TouchableOpacity><TouchableOpacity onPress={() => setSelectedTab('Settings')}><Text style={[styles.tab,selectedTab==='Settings'&&styles.activeTab]}>⚙  Settings</Text></TouchableOpacity></View>
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => { setShowCreate(false); setEditingId(null); }}><View style={styles.modalShade}><ScrollView style={styles.modal}><Text style={styles.modalEyebrow}>CONFIGURE INSTANCE</Text><Text style={styles.modalTitle}>{editingId ? 'Edit VM' : 'Create VM'}</Text><Field label="MACHINE NAME" value={name} onChange={setName}/><Field label="GUEST OS" value={guest} onChange={setGuest}/><View style={styles.inputRow}><View style={{flex:1}}><Field label="RAM (MB)" value={ram} onChange={setRam} keyboard="numeric"/></View><View style={{flex:1}}><Field label="CPU CORES" value={cpu} onChange={setCpu} keyboard="numeric"/></View></View><Field label="DISK (GB)" value={disk} onChange={setDisk} keyboard="numeric"/><TouchableOpacity style={styles.createButton} onPress={createVM}><Text style={styles.createButtonText}>{editingId ? 'Save changes' : 'Create profile'}</Text></TouchableOpacity><TouchableOpacity onPress={() => { setShowCreate(false); setEditingId(null); }} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity></ScrollView></View></Modal>
    </SafeAreaView>
  );
}
function Stat({label,value}: {label:string;value:string}) { return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>; }
function Field({label,value,onChange,keyboard}: {label:string;value:string;onChange:(s:string)=>void;keyboard?:'numeric'}) { return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput style={styles.fieldInput} value={value} onChangeText={onChange} keyboardType={keyboard||'default'} placeholderTextColor="#697187"/></View>; }
const styles = StyleSheet.create({
 safe:{flex:1,backgroundColor:'#070911'},page:{paddingHorizontal:20,paddingTop:12,paddingBottom:112},
 top:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:28},logo:{width:42,height:42,borderRadius:13,backgroundColor:'#141c32',borderWidth:1,borderColor:'#3547a2',alignItems:'center',justifyContent:'center'},logoText:{fontSize:23,fontWeight:'900',color:'#89a4ff'},brand:{color:'#f3f5ff',fontSize:18,fontWeight:'800',letterSpacing:0.4},tagline:{color:'#747f9b',fontSize:12,marginTop:2},statusDot:{width:9,height:9,borderRadius:5,backgroundColor:'#7c91ff'},
 hero:{borderRadius:24,borderWidth:1,borderColor:'#2b365b',backgroundColor:'#11182a',padding:22,marginBottom:30},eyebrow:{fontSize:10,color:'#8b9eff',letterSpacing:2,fontWeight:'700'},heroTitle:{color:'#f5f6ff',fontSize:34,fontWeight:'900',lineHeight:39,marginTop:16},heroDesc:{color:'#929db8',fontSize:13,lineHeight:19,marginTop:10,maxWidth:260},heroBottom:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:22},number:{fontSize:28,color:'#a6b5ff',fontWeight:'800'},heroLabel:{color:'#66728f',fontSize:9,letterSpacing:1.5,fontWeight:'700'},newButton:{backgroundColor:'#687fff',paddingHorizontal:16,paddingVertical:12,borderRadius:13},newButtonText:{color:'#fff',fontWeight:'800',fontSize:13},
 sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:14},sectionTitle:{color:'#f2f4ff',fontSize:21,fontWeight:'800'},count:{color:'#67738f',fontSize:10,letterSpacing:1.4,fontWeight:'700'},
 card:{backgroundColor:'#0f1421',borderRadius:20,borderWidth:1,borderColor:'#202b42',padding:16,marginBottom:13},cardHead:{flexDirection:'row',alignItems:'center',gap:11},osIcon:{width:40,height:40,borderRadius:12,backgroundColor:'#1b2540',alignItems:'center',justifyContent:'center'},iconText:{color:'#9bacff',fontSize:18},vmName:{color:'#f2f4ff',fontSize:16,fontWeight:'800'},subtitle:{color:'#808da8',fontSize:12,marginTop:3},badge:{paddingVertical:5,paddingHorizontal:9,borderRadius:10,backgroundColor:'#202c45'},badgeText:{color:'#a5b5ff',fontSize:10,fontWeight:'700'},
 stats:{flexDirection:'row',marginTop:17,marginBottom:15},stat:{flex:1},statLabel:{color:'#6f7c98',fontSize:9,fontWeight:'700',letterSpacing:1},statValue:{color:'#e3e7ff',fontSize:13,fontWeight:'700',marginTop:5},
 imageRow:{borderTopWidth:1,borderTopColor:'#20283c',paddingTop:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},imageLabel:{color:'#8c98b1',fontSize:11,flex:1},attachButton:{borderRadius:8,borderWidth:1,borderColor:'#35466e',paddingHorizontal:10,paddingVertical:6},attachText:{color:'#9cb0ff',fontSize:11,fontWeight:'700'},actions:{flexDirection:'row',gap:8,marginTop:13},startButton:{flex:1,backgroundColor:'#1a2644',borderWidth:1,borderColor:'#354a7b',borderRadius:11,alignItems:'center',paddingVertical:11},startText:{color:'#a5b6ff',fontWeight:'800',fontSize:12},deleteButton:{width:42,borderRadius:11,alignItems:'center',justifyContent:'center',backgroundColor:'#191b27'},deleteText:{color:'#818ba3'},imageMeta:{color:'#697792',fontSize:10,marginTop:4},mediaKind:{color:'#8292bd',fontSize:9,fontWeight:'800',letterSpacing:1,marginBottom:4},removeImageButton:{borderRadius:8,backgroundColor:'#241722',paddingHorizontal:9,paddingVertical:7},removeImageText:{color:'#d99aa9',fontSize:10,fontWeight:'700'},
 empty:{borderRadius:20,borderWidth:1,borderColor:'#222b40',borderStyle:'dashed',padding:24,alignItems:'center'},emptyIcon:{color:'#667bcb',fontSize:28},emptyTitle:{color:'#f0f2ff',fontWeight:'800',fontSize:16,marginTop:8},emptyDesc:{color:'#77839d',fontSize:12,lineHeight:18,textAlign:'center',marginTop:8},emptyButton:{marginTop:16,backgroundColor:'#536df1',paddingVertical:11,paddingHorizontal:18,borderRadius:11},
 notice:{backgroundColor:'#111623',borderColor:'#252e43',borderWidth:1,borderRadius:15,padding:14,marginTop:20},noticeTitle:{color:'#9aa9ff',fontSize:10,fontWeight:'800',letterSpacing:1.2},noticeText:{color:'#8994ad',fontSize:11,lineHeight:17,marginTop:7},footer:{textAlign:'center',color:'#47516b',fontSize:9,letterSpacing:1.2,marginTop:23},
 editButton:{paddingHorizontal:12,justifyContent:'center',borderRadius:10,backgroundColor:'#172035',borderWidth:1,borderColor:'#273652'},editText:{color:'#9aabff',fontSize:12,fontWeight:'700'},
 settingsPage:{padding:4},settingsEyebrow:{color:'#94a6ff',fontSize:10,letterSpacing:2,fontWeight:'800',marginBottom:10},settingsTitle:{color:'#f4f6ff',fontSize:30,fontWeight:'900',marginBottom:20},settingsCard:{backgroundColor:'#111725',borderColor:'#26314a',borderWidth:1,borderRadius:16,padding:17,marginBottom:12},settingsCardTitle:{color:'#eef1ff',fontSize:15,fontWeight:'800',marginBottom:8},settingsText:{color:'#8995ae',fontSize:12,lineHeight:19},resetButton:{borderColor:'#60384a',borderWidth:1,borderRadius:12,padding:14,alignItems:'center',marginTop:8},resetText:{color:'#e49aaa',fontSize:12,fontWeight:'800'},
 tabBar:{position:'absolute',bottom:0,left:0,right:0,backgroundColor:'#0b101b',borderTopWidth:1,borderTopColor:'#1b2333',paddingBottom:18,paddingTop:13,flexDirection:'row',justifyContent:'space-around'},tab:{color:'#64708b',fontSize:12,fontWeight:'700'},activeTab:{color:'#9bacff'},
 modalShade:{flex:1,backgroundColor:'#000a',justifyContent:'flex-end'},modal:{backgroundColor:'#101625',borderTopLeftRadius:25,borderTopRightRadius:25,padding:24,paddingTop:30},modalEyebrow:{color:'#92a4ff',fontSize:10,letterSpacing:2,fontWeight:'800'},modalTitle:{fontSize:27,color:'#f3f5ff',fontWeight:'900',marginTop:8,marginBottom:20},field:{marginBottom:16},fieldLabel:{color:'#7d8ba8',fontSize:10,fontWeight:'800',letterSpacing:1,marginBottom:7},fieldInput:{borderWidth:1,borderColor:'#27334c',backgroundColor:'#0a0f19',borderRadius:12,padding:13,color:'#f1f3ff',fontSize:14},inputRow:{flexDirection:'row',gap:12},createButton:{backgroundColor:'#667dff',borderRadius:13,padding:15,alignItems:'center',marginTop:8},createButtonText:{color:'#fff',fontWeight:'900'},cancel:{padding:15,alignItems:'center'},cancelText:{color:'#8792ad',fontWeight:'700'}
});
