#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

console.log('🔧 CostikFinans APK Builder (Node.js) başlatılıyor...');

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

// PWA Builder API kullanarak APK oluştur
async function buildWithPWABuilder() {
  console.log('🌐 PWA Builder API ile APK oluşturuluyor...');
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    // PWA Builder manifest URL'ini oluştur
    const manifestUrl = `${apkConfig.website}/manifest.json`;
    
    // PWA Builder API isteği
    const response = await fetch('https://pwabuilder-apk-web.azurewebsites.net/packages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: apkConfig.website,
        name: apkConfig.name,
        packageId: apkConfig.packageName,
        version: apkConfig.version,
        versionCode: apkConfig.versionCode,
        display: apkConfig.display,
        orientation: apkConfig.orientation,
        themeColor: apkConfig.themeColor,
        backgroundColor: apkConfig.backgroundColor,
        startUrl: apkConfig.startUrl,
        manifestUrl: manifestUrl,
        iconUrl: `${apkConfig.website}/icons/icon-512x512.png`,
        features: {
          locationDelegation: false,
          googlePhotosSharing: false,
          paymentDelegation: false
        }
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ PWA Builder isteği başarılı:', result);
      
      if (result.downloadUrl) {
        // APK'yı indir
        const apkResponse = await fetch(result.downloadUrl);
        if (apkResponse.ok) {
          const apkBuffer = await apkResponse.buffer();
          const apkPath = path.join(buildDir, 'costikfinans.apk');
          fs.writeFileSync(apkPath, apkBuffer);
          console.log('✅ APK indirildi ve kaydedildi:', apkPath);
          return true;
        }
      }
    }
    
    console.log('❌ PWA Builder API başarısız');
    return false;
  } catch (error) {
    console.error('❌ PWA Builder hatası:', error.message);
    return false;
  }
}

// Cordova ile APK oluştur
async function buildWithCordova() {
  console.log('📱 Cordova ile APK oluşturuluyor...');
  
  try {
    // Cordova kurulu mu kontrol et
    try {
      await execAsync('cordova --version');
    } catch {
      console.log('🔽 Cordova kuruluyor...');
      await execAsync('npm install -g cordova');
    }
    
    const tempDir = path.join(__dirname, '..', 'temp-cordova');
    const outDir = path.join(__dirname, '..', 'out');
    
    // Temp dizin hazırla
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Cordova projesi oluştur
    process.chdir(tempDir);
    await execAsync(`cordova create . ${apkConfig.packageName} "${apkConfig.displayName}"`);
    
    // Web dosyalarını kopyala
    const wwwDir = path.join(tempDir, 'www');
    if (fs.existsSync(wwwDir)) {
      fs.rmSync(wwwDir, { recursive: true, force: true });
    }
    
    // out dizinini www olarak kopyala
    if (!fs.existsSync(outDir)) {
      throw new Error('Next.js build çıktısı bulunamadı. Önce "npm run build" çalıştırın.');
    }
    
    fs.cpSync(outDir, wwwDir, { recursive: true });
    
    // Config.xml güncelle
    const configXml = `<?xml version='1.0' encoding='utf-8'?>
<widget id="${apkConfig.packageName}" version="${apkConfig.version}" xmlns="http://www.w3.org/ns/widgets">
    <name>${apkConfig.displayName}</name>
    <description>${apkConfig.description}</description>
    <author email="info@costikfinans.app" href="${apkConfig.website}">${apkConfig.author}</author>
    <content src="index.html" />
    <platform name="android">
        <allow-intent href="market:*" />
        <preference name="android-minSdkVersion" value="21" />
        <preference name="android-targetSdkVersion" value="34" />
        <preference name="android-compileSdkVersion" value="34" />
    </platform>
    <allow-navigation href="*" />
    <allow-intent href="*" />
    <preference name="Orientation" value="${apkConfig.orientation}" />
    <preference name="Fullscreen" value="false" />
</widget>`;
    
    fs.writeFileSync(path.join(tempDir, 'config.xml'), configXml);
    
    // Android platform ekle
    await execAsync('cordova platform add android');
    
    // APK build et
    await execAsync('cordova build android --debug');
    
    // APK'yı kopyala
    const apkSourcePath = path.join(tempDir, 'platforms', 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    const apkTargetPath = path.join(buildDir, 'costikfinans.apk');
    
    if (fs.existsSync(apkSourcePath)) {
      fs.copyFileSync(apkSourcePath, apkTargetPath);
      console.log('✅ Cordova APK oluşturuldu:', apkTargetPath);
      
      // Temp dizini temizle
      process.chdir(path.join(__dirname, '..'));
      fs.rmSync(tempDir, { recursive: true, force: true });
      
      return true;
    } else {
      console.log('❌ APK dosyası bulunamadı:', apkSourcePath);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Cordova build hatası:', error.message);
    return false;
  }
}

// Capacitor ile APK oluştur
async function buildWithCapacitor() {
  console.log('⚡ Capacitor ile APK oluşturuluyor...');
  
  try {
    // Capacitor kurulu mu kontrol et
    try {
      await execAsync('npx cap --version');
    } catch {
      console.log('🔽 Capacitor kuruluyor...');
      await execAsync('npm install -g @capacitor/cli @capacitor/android');
    }
    
    const tempDir = path.join(__dirname, '..', 'temp-capacitor');
    const outDir = path.join(__dirname, '..', 'out');
    
    // Temp dizin hazırla
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    
    process.chdir(tempDir);
    
    // Capacitor projesi başlat
    await execAsync(`npx cap init "${apkConfig.displayName}" "${apkConfig.packageName}" --web-dir="../out"`);
    
    // Android platform ekle
    await execAsync('npx cap add android');
    
    // Android strings.xml güncelle
    const stringsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${apkConfig.displayName}</string>
    <string name="title_activity_main">${apkConfig.displayName}</string>
    <string name="package_name">${apkConfig.packageName}</string>
    <string name="custom_url_scheme">costikfinans</string>
</resources>`;
    
    const stringsPath = path.join(tempDir, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
    fs.mkdirSync(path.dirname(stringsPath), { recursive: true });
    fs.writeFileSync(stringsPath, stringsXml);
    
    // Dosyaları kopyala ve sync et
    await execAsync('npx cap copy android');
    await execAsync('npx cap sync android');
    
    // Gradle build
    process.chdir(path.join(tempDir, 'android'));
    
    if (process.platform === 'win32') {
      await execAsync('gradlew.bat assembleDebug');
    } else {
      await execAsync('chmod +x ./gradlew && ./gradlew assembleDebug');
    }
    
    // APK'yı kopyala
    const apkSourcePath = path.join(tempDir, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    const apkTargetPath = path.join(buildDir, 'costikfinans.apk');
    
    if (fs.existsSync(apkSourcePath)) {
      fs.copyFileSync(apkSourcePath, apkTargetPath);
      console.log('✅ Capacitor APK oluşturuldu:', apkTargetPath);
      
      // Temp dizini temizle
      process.chdir(path.join(__dirname, '..'));
      fs.rmSync(tempDir, { recursive: true, force: true });
      
      return true;
    } else {
      console.log('❌ APK dosyası bulunamadı:', apkSourcePath);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Capacitor build hatası:', error.message);
    return false;
  }
}

// Ana fonksiyon
async function main() {
  const method = process.argv[2] || 'auto';
  
  console.log(`📱 APK build yöntemi: ${method}`);
  
  // Next.js build kontrolü
  const outDir = path.join(__dirname, '..', 'out');
  if (!fs.existsSync(outDir)) {
    console.log('🏗️ Next.js build bulunamadı, build başlatılıyor...');
    try {
      await execAsync('npm run build');
    } catch (error) {
      console.error('❌ Next.js build başarısız:', error.message);
      process.exit(1);
    }
  }
  
  let success = false;
  
  // APK build yöntemi seç
  switch (method) {
    case 'pwa':
      success = await buildWithPWABuilder();
      break;
    case 'cordova':
      success = await buildWithCordova();
      break;
    case 'capacitor':
      success = await buildWithCapacitor();
      break;
    case 'auto':
    default:
      // Otomatik: Sırayla dene
      console.log('🤖 Otomatik yöntem seçimi başlatılıyor...');
      
      success = await buildWithCapacitor();
      if (!success) {
        console.log('Capacitor başarısız, Cordova deneniyor...');
        success = await buildWithCordova();
      }
      if (!success) {
        console.log('Cordova başarısız, PWA Builder deneniyor...');
        success = await buildWithPWABuilder();
      }
      break;
  }
  
  if (success) {
    const apkPath = path.join(buildDir, 'costikfinans.apk');
    const stats = fs.statSync(apkPath);
    console.log('🎉 APK başarıyla oluşturuldu!');
    console.log(`📱 Dosya: ${apkPath}`);
    console.log(`📏 Boyut: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log('');
    console.log('📋 Kurulum için:');
    console.log('  1. APK dosyasını Android cihazınıza aktarın');
    console.log('  2. Bilinmeyen kaynaklardan yüklemeyi etkinleştirin');
    console.log('  3. APK dosyasını açıp yükleyin');
    
    // APK bilgi dosyası güncelle
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
      size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
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
      buildType: 'debug',
      buildMethod: method
    };
    
    const apkInfoPath = path.join(buildDir, 'apk-info.json');
    fs.writeFileSync(apkInfoPath, JSON.stringify(apkInfo, null, 2));
    console.log('✅ APK bilgi dosyası güncellendi:', apkInfoPath);
    
  } else {
    console.log('❌ APK oluşturulamadı - tüm yöntemler başarısız');
    console.log('💡 Öneriler:');
    console.log('  - Android Studio SDK\'sını kurun');
    console.log('  - ANDROID_HOME environment variable\'ını ayarlayın');
    console.log('  - Java JDK 11+ kurulu olduğundan emin olun');
    console.log('  - Node.js ve npm güncel olduğundan emin olun');
    process.exit(1);
  }
}

// Script başlat
main().catch(error => {
  console.error('❌ Beklenmeyen hata:', error);
  process.exit(1);
});
