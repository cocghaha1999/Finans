#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CostikFinans APK Builder başlatılıyor...');

// APK build konfigürasyonu
const apkConfig = {
  name: 'CostikFinans',
  packageName: 'com.costikfinans.app',
  version: '1.0.0',
  versionCode: 1,
  displayName: 'CostikFinans - Kişisel Finans',
  description: 'Gelir, gider ve finansal işlemlerinizi kolayca takip edin',
  author: 'CostikFinans Ekibi',
  website: process.env.NEXT_PUBLIC_APP_URL || 'https://costikfinans.vercel.app',
  backgroundColor: '#ffffff',
  themeColor: '#3b82f6',
  orientation: 'portrait',
  display: 'standalone',
  scope: '/',
  startUrl: '/',
  iconPath: './public/icons/icon-512x512.png',
  splashPath: './public/splash.html'
};

// Gerekli dizinleri oluştur
const buildDir = path.join(__dirname, '..', 'public', 'downloads');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// TWA konfigürasyon dosyası oluştur
const twaConfig = {
  packageId: apkConfig.packageName,
  host: apkConfig.website,
  name: apkConfig.name,
  launcherName: apkConfig.displayName,
  display: apkConfig.display,
  orientation: apkConfig.orientation,
  themeColor: apkConfig.themeColor,
  backgroundColor: apkConfig.backgroundColor,
  startUrl: apkConfig.startUrl,
  iconUrl: `${apkConfig.website}/icons/icon-512x512.png`,
  maskableIconUrl: `${apkConfig.website}/icons/icon-512x512.png`,
  monochromeIconUrl: `${apkConfig.website}/icons/icon-512x512.png`,
  splashScreenColor: apkConfig.backgroundColor,
  version: apkConfig.version,
  versionCode: apkConfig.versionCode,
  enableNotifications: true,
  enableLocationDelegation: false,
  enablePaymentDelegation: false,
  enablePhotoPickerDelegation: false,
  features: {
    playBilling: {
      enabled: false
    },
    locationDelegation: {
      enabled: false
    },
    googlePhotosSharing: {
      enabled: false
    }
  },
  signingKey: {
    path: './android.keystore',
    alias: 'android'
  },
  appVersionName: apkConfig.version,
  appVersionCode: apkConfig.versionCode,
  webManifestUrl: `${apkConfig.website}/manifest.json`,
  fallbackType: 'customtabs',
  shortcuts: [
    {
      name: 'Gelir Ekle',
      shortName: 'Gelir',
      url: '/?action=add-income',
      iconUrl: `${apkConfig.website}/icons/icon-192x192.png`
    },
    {
      name: 'Gider Ekle',
      shortName: 'Gider', 
      url: '/?action=add-expense',
      iconUrl: `${apkConfig.website}/icons/icon-192x192.png`
    }
  ]
};

// TWA konfigürasyonunu kaydet
const twaConfigPath = path.join(buildDir, 'twa-config.json');
fs.writeFileSync(twaConfigPath, JSON.stringify(twaConfig, null, 2));
console.log('✅ TWA konfigürasyonu oluşturuldu:', twaConfigPath);

// APK bilgi dosyası oluştur
const apkInfo = {
  name: apkConfig.name,
  displayName: apkConfig.displayName,
  packageName: apkConfig.packageName,
  version: apkConfig.version,
  versionCode: apkConfig.versionCode,
  description: apkConfig.description,
  author: apkConfig.author,
  website: apkConfig.website,
  downloadUrl: `${apkConfig.website}/downloads/costikfinans.apk`,
  size: '2.5 MB (tahmini)',
  requirements: {
    android: '5.0+',
    ram: '1 GB',
    storage: '50 MB'
  },
  features: [
    'Offline çalışma',
    'Push bildirimleri',
    'Ana ekran kısayolları',
    'Tam ekran deneyim'
  ],
  buildDate: new Date().toISOString(),
  buildType: 'release'
};

const apkInfoPath = path.join(buildDir, 'apk-info.json');
fs.writeFileSync(apkInfoPath, JSON.stringify(apkInfo, null, 2));
console.log('✅ APK bilgi dosyası oluşturuldu:', apkInfoPath);

// Basit APK placeholder oluştur (gerçek APK için build araçları gerekir)
const apkPlaceholder = `PK${Buffer.alloc(1000).fill(0).toString('binary')}`;
const apkPath = path.join(buildDir, 'costikfinans.apk');
fs.writeFileSync(apkPath, apkPlaceholder, 'binary');
console.log('✅ APK placeholder oluşturuldu:', apkPath);

console.log('\n🚀 APK Build işlemi tamamlandı!');
console.log('\n📁 Oluşturulan dosyalar:');
console.log(`  • TWA Config: ${twaConfigPath}`);
console.log(`  • APK Info: ${apkInfoPath}`);
console.log(`  • APK File: ${apkPath}`);

console.log('\n💡 Gerçek APK oluşturmak için:');
console.log('  • PWA Builder (https://pwabuilder.com) kullanın');
console.log('  • Capacitor ile native build yapın');
console.log('  • Android Studio ile manuel build edin');

console.log('\n✨ PWA kurulumu için siteyi ziyaret edin ve "Ana Ekrana Ekle" butonunu kullanın!');
