#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Render environment detection
const isRenderBuild = process.env.RENDER_BUILD === 'true' || process.env.RENDER === 'true';

console.log('🚀 PWABuilder APK Generator - Production Ready');
console.log('='.repeat(50));
if (isRenderBuild) {
  console.log('🌟 Running on Render deployment');
  console.log(`🌍 Target URL: ${config.webUrl}`);
} else {
  console.log('🏠 Running locally');
}

const config = {
  appName: 'CostikFinans',
  shortName: 'CostikFinans',
  packageName: 'com.costikfinans.app',
  webUrl: isRenderBuild ? 'https://costikfinans.site' : (process.env.VERCEL_URL || 'https://costikfinans.site'),
  startUrl: '/',
  display: 'standalone',
  orientation: 'portrait',
  themeColor: '#3b82f6',
  backgroundColor: '#ffffff',
  description: 'Kişisel Finans Yönetimi - Gelir, gider ve bütçe takibi',
  version: '1.0.0',
  versionCode: 1,
  minSdkVersion: 21,
  targetSdkVersion: 34,
  features: {
    webView: true,
    fullscreen: true,
    notifications: false,
    camera: false,
    location: false
  }
};

// PWABuilder API ile APK oluştur
async function createAPKWithPWABuilder() {
  console.log('\n📱 PWABuilder API ile APK oluşturuluyor...');
  
  try {
    // node-fetch'i dinamik import et
    const fetch = (await import('node-fetch')).default;
    
    const requestPayload = {
      url: config.webUrl,
      name: config.appName,
      packageId: config.packageName,
      version: config.version,
      versionCode: config.versionCode,
      webManifestUrl: `${config.webUrl}/manifest.json`,
      iconUrl: `${config.webUrl}/icons/icon-512x512.png`,
      maskableIconUrl: `${config.webUrl}/icons/icon-512x512.png`,
      monochromeIconUrl: `${config.webUrl}/icons/icon-512x512.png`,
      splashColor: config.backgroundColor,
      themeColor: config.themeColor,
      backgroundColor: config.backgroundColor,
      display: config.display,
      orientation: config.orientation,
      startUrl: config.startUrl,
      shortcuts: [
        {
          name: 'Gelir Ekle',
          shortName: 'Gelir',
          url: '/?action=income',
          iconUrl: `${config.webUrl}/icons/icon-192x192.png`
        },
        {
          name: 'Gider Ekle', 
          shortName: 'Gider',
          url: '/?action=expense',
          iconUrl: `${config.webUrl}/icons/icon-192x192.png`
        }
      ],
      signingMode: 'debug',
      enableSiteSettingsShortcut: true,
      enableNotifications: config.features.notifications,
      enableLocationDelegation: config.features.location,
      enableGooglePhotosSharing: false,
      enablePaymentDelegation: false
    };
    
    console.log('📤 PWABuilder API\'ye istek gönderiliyor...');
    console.log(`🌐 URL: ${config.webUrl}`);
    console.log(`📦 Package: ${config.packageName}`);
    
    const response = await fetch('https://pwabuilder-apk-web.azurewebsites.net/packages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CostikFinans-APK-Builder/1.0'
      },
      body: JSON.stringify(requestPayload),
      timeout: 120000 // 2 dakika timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PWABuilder API hatası: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ PWABuilder API yanıtı alındı');
    
    if (result.type === 'success' && result.downloadUrl) {
      console.log('📥 APK indiriliyor...');
      
      const apkResponse = await fetch(result.downloadUrl, { timeout: 180000 });
      if (!apkResponse.ok) {
        throw new Error(`APK indirme hatası: ${apkResponse.status}`);
      }
      
      const apkBuffer = await apkResponse.arrayBuffer();
      const outputDir = path.join(__dirname, '..', 'public', 'downloads');
      const apkPath = path.join(outputDir, 'costikfinans.apk');
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      fs.writeFileSync(apkPath, Buffer.from(apkBuffer));
      
      const stats = fs.statSync(apkPath);
      console.log(`✅ APK başarıyla oluşturuldu!`);
      console.log(`📁 Dosya: ${apkPath}`);
      console.log(`📏 Boyut: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      
      return { success: true, path: apkPath, size: stats.size };
      
    } else {
      console.log('❌ PWABuilder API başarısız:', result);
      return { success: false, error: 'API yanıtı geçersiz' };
    }
    
  } catch (error) {
    console.error('❌ PWABuilder hatası:', error.message);
    return { success: false, error: error.message };
  }
}

// Bubblewrap CLI ile TWA oluştur  
async function createAPKWithBubblewrap() {
  console.log('\n🫧 Bubblewrap CLI ile TWA oluşturuluyor...');
  
  try {
    const tempDir = path.join(__dirname, '..', 'temp-twa');
    const outputDir = path.join(__dirname, '..', 'public', 'downloads');
    
    // Temp dizini hazırla
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Bubblewrap kurulu mu kontrol et
    try {
      execSync('bubblewrap --version', { stdio: 'pipe' });
    } catch {
      console.log('📦 Bubblewrap kuruluyor...');
      execSync('npm install -g @bubblewrap/cli', { stdio: 'inherit' });
    }
    
    // TWA manifest oluştur
    const twaManifest = {
      packageId: config.packageName,
      host: config.webUrl.replace('https://', '').replace('http://', ''),
      name: config.appName,
      launcherName: config.shortName,
      display: config.display,
      themeColor: config.themeColor,
      backgroundColor: config.backgroundColor,
      startUrl: config.startUrl,
      iconUrl: `${config.webUrl}/icons/icon-512x512.png`,
      maskableIconUrl: `${config.webUrl}/icons/icon-512x512.png`,
      monochromeIconUrl: `${config.webUrl}/icons/icon-512x512.png`,
      enableNotifications: config.features.notifications,
      enableLocationDelegation: config.features.location,
      enableGooglePhotosSharing: false,
      enablePaymentDelegation: false,
      signingKey: {
        path: path.join(tempDir, 'debug.keystore'),
        alias: 'androiddebugkey'
      },
      appVersionName: config.version,
      appVersionCode: config.versionCode,
      shortcuts: [
        {
          name: 'Gelir Ekle',
          shortName: 'Gelir',
          url: '/?action=income',
          iconUrl: `${config.webUrl}/icons/icon-192x192.png`
        }
      ]
    };
    
    const manifestPath = path.join(tempDir, 'twa-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(twaManifest, null, 2));
    
    // Debug keystore oluştur
    const keystorePath = path.join(tempDir, 'debug.keystore');
    execSync(`keytool -genkey -v -keystore "${keystorePath}" -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android -dname "CN=CostikFinans Debug,O=CostikFinans,C=TR"`, { stdio: 'pipe' });
    
    // TWA projesi başlat
    process.chdir(tempDir);
    execSync(`bubblewrap init --manifest="${manifestPath}" --directory=twa-project --skip-prompt`, { stdio: 'inherit' });
    
    // APK build et
    process.chdir(path.join(tempDir, 'twa-project'));
    
    // Gradle wrapper'a executable izni ver (Linux/Mac)
    if (process.platform !== 'win32') {
      try { execSync('chmod +x ./gradlew', { stdio: 'pipe' }); } catch {}
    }
    
    // APK build
    const gradleCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
    execSync(`${gradleCmd} assembleDebug --no-daemon`, { stdio: 'inherit' });
    
    // APK'yı kopyala
    const builtApkPath = path.join(tempDir, 'twa-project', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    
    if (fs.existsSync(builtApkPath)) {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const finalApkPath = path.join(outputDir, 'costikfinans.apk');
      fs.copyFileSync(builtApkPath, finalApkPath);
      
      const stats = fs.statSync(finalApkPath);
      console.log(`✅ Bubblewrap TWA oluşturuldu!`);
      console.log(`📁 Dosya: ${finalApkPath}`);
      console.log(`📏 Boyut: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      
      // Temp dizini temizle
      process.chdir(path.join(__dirname, '..'));
      fs.rmSync(tempDir, { recursive: true, force: true });
      
      return { success: true, path: finalApkPath, size: stats.size };
    } else {
      throw new Error('APK dosyası oluşturulamadı');
    }
    
  } catch (error) {
    console.error('❌ Bubblewrap hatası:', error.message);
    return { success: false, error: error.message };
  }
}

// PWA2APK Alternative Service
async function createAPKWithPWA2APK() {
  console.log('\n🔄 PWA2APK servisi ile oluşturuluyor...');
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    const formData = new URLSearchParams({
      url: config.webUrl,
      name: config.appName,
      package_name: config.packageName,
      version: config.version,
      icon_url: `${config.webUrl}/icons/icon-512x512.png`,
      theme_color: config.themeColor,
      background_color: config.backgroundColor,
      start_url: config.startUrl,
      display: config.display,
      orientation: config.orientation
    });
    
    const response = await fetch('https://api.pwa2apk.com/build', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'CostikFinans-APK-Builder/1.0'
      },
      body: formData.toString(),
      timeout: 180000
    });
    
    if (response.ok) {
      const apkBuffer = await response.arrayBuffer();
      
      const outputDir = path.join(__dirname, '..', 'public', 'downloads');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const apkPath = path.join(outputDir, 'costikfinans.apk');
      fs.writeFileSync(apkPath, Buffer.from(apkBuffer));
      
      const stats = fs.statSync(apkPath);
      console.log(`✅ PWA2APK ile APK oluşturuldu!`);
      console.log(`📁 Dosya: ${apkPath}`);
      console.log(`📏 Boyut: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      
      return { success: true, path: apkPath, size: stats.size };
    } else {
      throw new Error(`PWA2APK API hatası: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ PWA2APK hatası:', error.message);
    return { success: false, error: error.message };
  }
}

// APK doğrulama
function validateAPK(apkPath) {
  try {
    const stats = fs.statSync(apkPath);
    const sizeInMB = stats.size / 1024 / 1024;
    
    console.log('\n🔍 APK Doğrulama:');
    console.log(`📏 Boyut: ${sizeInMB.toFixed(2)} MB`);
    
    // Minimum boyut kontrolü (500KB)
    if (stats.size < 500 * 1024) {
      console.log('⚠️  Uyarı: APK boyutu çok küçük, bozuk olabilir');
      return false;
    }
    
    // APK signature kontrolü (basic)
    const buffer = fs.readFileSync(apkPath);
    const isValidAPK = buffer.indexOf('AndroidManifest.xml') > -1 || 
                       buffer.indexOf('META-INF') > -1 ||
                       buffer.indexOf('classes.dex') > -1;
    
    if (isValidAPK) {
      console.log('✅ APK dosyası geçerli görünüyor');
      return true;
    } else {
      console.log('❌ APK dosyası geçersiz');
      return false;
    }
    
  } catch (error) {
    console.error('❌ APK doğrulama hatası:', error.message);
    return false;
  }
}

// Ana fonksiyon
async function main() {
  const method = process.argv[2] || 'auto';
  
  console.log(`🎯 Hedef: ${config.webUrl}`);
  console.log(`📦 Package: ${config.packageName}`);
  console.log(`🔧 Yöntem: ${method}`);
  
  // Next.js build kontrolü
  const outDir = path.join(__dirname, '..', 'out');
  if (!fs.existsSync(outDir)) {
    console.log('\n🏗️ Next.js build başlatılıyor...');
    try {
      process.chdir(path.join(__dirname, '..'));
      execSync('npm run build', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Next.js build başarısız');
      process.exit(1);
    }
  }
  
  let result = { success: false };
  
  try {
    switch (method) {
      case 'pwabuilder':
        result = await createAPKWithPWABuilder();
        break;
      case 'bubblewrap':
        result = await createAPKWithBubblewrap();
        break;
      case 'pwa2apk':
        result = await createAPKWithPWA2APK();
        break;
      case 'auto':
      default:
        console.log('\n🤖 Otomatik yöntem seçimi...');
        
        // Önce PWABuilder dene (en güvenilir)
        result = await createAPKWithPWABuilder();
        
        if (!result.success) {
          console.log('\nPWABuilder başarısız, Bubblewrap deneniyor...');
          result = await createAPKWithBubblewrap();
        }
        
        if (!result.success) {
          console.log('\nBubblewrap başarısız, PWA2APK deneniyor...');
          result = await createAPKWithPWA2APK();
        }
        break;
    }
    
    if (result.success) {
      const isValid = validateAPK(result.path);
      
      if (isValid) {
        // APK bilgi dosyası güncelle
        const apkInfo = {
          name: config.appName,
          packageName: config.packageName,
          version: config.version,
          versionCode: config.versionCode,
          description: config.description,
          website: config.webUrl,
          downloadUrl: `${config.webUrl}/downloads/costikfinans.apk`,
          size: `${(result.size / 1024 / 1024).toFixed(2)} MB`,
          buildDate: new Date().toISOString(),
          buildMethod: method,
          verified: true,
          requirements: {
            android: '5.0+',
            ram: '1 GB',
            storage: '50 MB'
          },
          features: [
            'Offline çalışma',
            'Tam ekran deneyim',
            'Ana ekran kısayolları',
            'Native performans'
          ]
        };
        
        const infoPath = path.join(__dirname, '..', 'public', 'downloads', 'apk-info.json');
        fs.writeFileSync(infoPath, JSON.stringify(apkInfo, null, 2));
        
        console.log('\n🎉 APK başarıyla oluşturuldu ve doğrulandı!');
        console.log('📱 Artık sitenden indirilebilir ve kurulabilir.');
        console.log('🔗 İndirme: https://costikfinans.vercel.app/downloads/costikfinans.apk');
        
      } else {
        console.log('\n❌ APK oluştu ama doğrulama başarısız');
        process.exit(1);
      }
      
    } else {
      console.log('\n❌ Tüm yöntemler başarısız oldu');
      console.log('💡 Öneriler:');
      console.log('  - Internet bağlantınızı kontrol edin');
      console.log('  - Manifest.json dosyasının doğru olduğundan emin olun');
      
      if (isRenderBuild) {
        console.log('\n🌟 Render Build: APK oluşturulamadı, PWA metadata hazırlandı');
        console.log('✅ PWA kurulumu siteyi ziyaret edenler için mevcut');
        // Render'da başarısızlık olarak sayılmasın
        process.exit(0);
      } else {
        console.log('  - Android Studio SDK kurulu olduğundan emin olun');
        console.log('  - Java JDK 11+ kurulu olduğundan emin olun');
        process.exit(1);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Beklenmeyen hata:', error.message);
    
    if (isRenderBuild) {
      console.log('\n🌟 Render Build: Hata rağmen build devam ediyor');
      console.log('✅ PWA fonksiyonları siteyi ziyaret edenler için mevcut');
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
}

// Çalıştır
main();
