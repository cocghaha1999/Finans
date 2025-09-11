#!/usr/bin/env node

// PWA to APK Converter - Minimal & Reliable
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const config = {
  appName: 'CostikFinans',
  packageName: 'com.costikfinans.app',
  webUrl: 'https://costikfinans.site',
  startUrl: '/',
  version: '1.0.0',
  versionCode: 1
};

console.log('🚀 APK Converter - Simple & Fast');

// Method 1: Using cordova-res + cordova build
async function buildWithCordovaSimple() {
  console.log('\n📱 Cordova Simple Build...');
  
  try {
    const tempDir = path.join(__dirname, '..', 'cordova-simple');
    const outDir = path.join(__dirname, '..', 'out');
    
    // Clean and create temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Install cordova if not present
    try {
      execSync('cordova --version', { stdio: 'pipe' });
    } catch {
      console.log('Installing Cordova...');
      execSync('npm install -g cordova', { stdio: 'inherit' });
    }
    
    // Create cordova project
    process.chdir(tempDir);
    execSync(`cordova create . ${config.packageName} "${config.appName}"`, { stdio: 'inherit' });
    
    // Replace www with our build
    const wwwDir = path.join(tempDir, 'www');
    if (fs.existsSync(wwwDir)) {
      fs.rmSync(wwwDir, { recursive: true, force: true });
    }
    
    // Copy build output
    fs.cpSync(outDir, wwwDir, { recursive: true });
    
    // Simple config.xml
    const configXml = `<?xml version='1.0' encoding='utf-8'?>
<widget id="${config.packageName}" version="${config.version}" xmlns="http://www.w3.org/ns/widgets">
    <name>${config.appName}</name>
    <description>Personal Finance App</description>
    <content src="index.html" />
    <platform name="android">
        <preference name="android-minSdkVersion" value="21" />
        <preference name="android-targetSdkVersion" value="33" />
    </platform>
    <allow-navigation href="*" />
    <allow-intent href="*" />
</widget>`;
    
    fs.writeFileSync('config.xml', configXml);
    
    // Add android platform and build
    execSync('cordova platform add android', { stdio: 'inherit' });
    execSync('cordova build android --debug', { stdio: 'inherit' });
    
    // Copy APK
    const apkSource = path.join(tempDir, 'platforms', 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    const apkTarget = path.join(__dirname, '..', 'public', 'downloads', 'costikfinans.apk');
    
    if (fs.existsSync(apkSource)) {
      fs.mkdirSync(path.dirname(apkTarget), { recursive: true });
      fs.copyFileSync(apkSource, apkTarget);
      
      const stats = fs.statSync(apkTarget);
      console.log(`✅ APK created: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      
      // Cleanup
      process.chdir(path.join(__dirname, '..'));
      fs.rmSync(tempDir, { recursive: true, force: true });
      
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error('❌ Cordova error:', error.message);
    return false;
  }
}

// Method 2: Direct PWA Wrapper (Minimal Android App)
function createMinimalAPK() {
  console.log('\n🔧 Creating Minimal APK Wrapper...');
  
  try {
    const tempDir = path.join(__dirname, '..', 'minimal-apk');
    const outputDir = path.join(__dirname, '..', 'public', 'downloads');
    
    // Create minimal Android project structure
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Create basic APK structure
    const apkDirs = [
      'src/main/java/com/costikfinans/app',
      'src/main/res/values',
      'src/main/res/layout',
      'src/main/assets'
    ];
    
    apkDirs.forEach(dir => {
      fs.mkdirSync(path.join(tempDir, dir), { recursive: true });
    });
    
    // MainActivity.java
    const mainActivity = `package com.costikfinans.app;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        WebView webView = new WebView(this);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.setWebViewClient(new WebViewClient());
        
        webView.loadUrl("${config.webUrl}");
        setContentView(webView);
    }
}`;
    
    fs.writeFileSync(path.join(tempDir, 'src/main/java/com/costikfinans/app/MainActivity.java'), mainActivity);
    
    // AndroidManifest.xml
    const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${config.packageName}">
    
    <uses-permission android:name="android.permission.INTERNET" />
    
    <application
        android:allowBackup="true"
        android:label="${config.appName}"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen">
        
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;
    
    fs.writeFileSync(path.join(tempDir, 'src/main/AndroidManifest.xml'), manifest);
    
    // strings.xml
    const strings = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${config.appName}</string>
</resources>`;
    
    fs.writeFileSync(path.join(tempDir, 'src/main/res/values/strings.xml'), strings);
    
    // build.gradle
    const buildGradle = `android {
    compileSdkVersion 33
    defaultConfig {
        applicationId "${config.packageName}"
        minSdkVersion 21
        targetSdkVersion 33
        versionCode ${config.versionCode}
        versionName "${config.version}"
    }
    buildTypes {
        debug {
            minifyEnabled false
        }
    }
}`;
    
    fs.writeFileSync(path.join(tempDir, 'build.gradle'), buildGradle);
    
    console.log('✅ Minimal APK structure created');
    return true;
    
  } catch (error) {
    console.error('❌ Minimal APK error:', error.message);
    return false;
  }
}

// Method 3: Use APK Online Service
async function downloadFromAPKService() {
  console.log('\n🌐 Online APK Service...');
  
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      url: config.webUrl,
      name: config.appName,
      package: config.packageName,
      version: config.version
    });
    
    const options = {
      hostname: 'pwa-to-apk.com',
      path: '/api/convert',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          try {
            const apkData = Buffer.concat(chunks);
            const outputDir = path.join(__dirname, '..', 'public', 'downloads');
            const apkPath = path.join(outputDir, 'costikfinans.apk');
            
            fs.mkdirSync(outputDir, { recursive: true });
            fs.writeFileSync(apkPath, apkData);
            
            console.log('✅ APK downloaded from online service');
            resolve(true);
          } catch {
            resolve(false);
          }
        });
      } else {
        resolve(false);
      }
    });
    
    req.on('error', () => resolve(false));
    req.write(postData);
    req.end();
    
    // Timeout after 30 seconds
    setTimeout(() => resolve(false), 30000);
  });
}

// Main execution
async function main() {
  const method = process.argv[2] || 'auto';
  
  console.log(`🎯 Building APK for: ${config.webUrl}`);
  console.log(`📦 Package: ${config.packageName}`);
  
  // Ensure Next.js is built
  const outDir = path.join(__dirname, '..', 'out');
  if (!fs.existsSync(outDir)) {
    console.log('🏗️ Building Next.js...');
    try {
      process.chdir(path.join(__dirname, '..'));
      execSync('npm run build', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Build failed');
      process.exit(1);
    }
  }
  
  let success = false;
  
  switch (method) {
    case 'cordova':
      success = await buildWithCordovaSimple();
      break;
    case 'minimal':
      success = createMinimalAPK();
      break;
    case 'online':
      success = await downloadFromAPKService();
      break;
    case 'auto':
    default:
      // Try all methods
      success = await buildWithCordovaSimple();
      if (!success) {
        success = await downloadFromAPKService();
      }
      if (!success) {
        success = createMinimalAPK();
      }
      break;
  }
  
  if (success) {
    const apkPath = path.join(__dirname, '..', 'public', 'downloads', 'costikfinans.apk');
    if (fs.existsSync(apkPath)) {
      const stats = fs.statSync(apkPath);
      console.log('\n🎉 APK Successfully Created!');
      console.log(`📁 File: ${apkPath}`);
      console.log(`📏 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log('🔗 Download: https://costikfinans.vercel.app/downloads/costikfinans.apk');
      
      // Update APK info
      const apkInfo = {
        name: config.appName,
        package: config.packageName,
        version: config.version,
        size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
        url: `${config.webUrl}/downloads/costikfinans.apk`,
        buildDate: new Date().toISOString(),
        method: method
      };
      
      fs.writeFileSync(
        path.join(__dirname, '..', 'public', 'downloads', 'apk-info.json'),
        JSON.stringify(apkInfo, null, 2)
      );
      
    } else {
      console.log('❌ APK file not found after build');
      process.exit(1);
    }
  } else {
    console.log('❌ All methods failed');
    console.log('💡 Try running with Android Studio installed');
    process.exit(1);
  }
}

main();
