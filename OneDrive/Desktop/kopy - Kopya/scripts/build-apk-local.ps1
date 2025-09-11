#!/usr/bin/env pwsh
# CostikFinans Local APK Builder (Windows PowerShell)
# Bu script, yerel Windows makinenizde APK oluşturur

param(
    [string]$Method = "auto",
    [switch]$Clean = $false,
    [switch]$Help = $false
)

if ($Help) {
    Write-Host @"
CostikFinans APK Builder

Kullanım:
  .\build-apk-local.ps1 [-Method <capacitor|cordova|auto>] [-Clean] [-Help]

Parametreler:
  -Method   : APK build yöntemi (capacitor, cordova, auto)
  -Clean    : Temp dosyaları temizle
  -Help     : Bu yardım mesajını göster

Örnekler:
  .\build-apk-local.ps1                    # Otomatik yöntem seçimi
  .\build-apk-local.ps1 -Method capacitor  # Capacitor kullan
  .\build-apk-local.ps1 -Clean             # Temizlik yap
"@
    exit 0
}

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$TempDir = Join-Path $env:TEMP "CostikFinans-APK-Build"
$OutputDir = Join-Path $ProjectRoot "public\downloads"

Write-Host "🔧 CostikFinans APK Builder başlatılıyor..." -ForegroundColor Green
Write-Host "📁 Proje: $ProjectRoot" -ForegroundColor Blue
Write-Host "📱 Çıktı: $OutputDir" -ForegroundColor Blue

# Temizlik
if ($Clean) {
    Write-Host "🧹 Temp dosyalar temizleniyor..." -ForegroundColor Yellow
    if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
    if (Test-Path "$ProjectRoot\.next") { Remove-Item "$ProjectRoot\.next" -Recurse -Force }
    if (Test-Path "$ProjectRoot\out") { Remove-Item "$ProjectRoot\out" -Recurse -Force }
    Write-Host "✅ Temizlik tamamlandı" -ForegroundColor Green
    exit 0
}

# Gereksinimler kontrolü
function Test-Requirements {
    $missing = @()
    
    try { 
        $nodeVersion = node --version 
        Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
    } catch { 
        $missing += "Node.js" 
    }
    
    try { 
        $npmVersion = npm --version 
        Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
    } catch { 
        $missing += "npm" 
    }
    
    try { 
        $javaVersion = java -version 2>&1 | Select-Object -First 1
        Write-Host "✅ Java: $javaVersion" -ForegroundColor Green
    } catch { 
        $missing += "Java JDK" 
    }
    
    if ($missing.Count -gt 0) {
        Write-Host "❌ Eksik gereksinimler: $($missing -join ', ')" -ForegroundColor Red
        Write-Host "Kurulum için: https://nodejs.org ve https://www.oracle.com/java/technologies/downloads/" -ForegroundColor Yellow
        exit 1
    }
}

# APK build fonksiyonları
function Build-WithCapacitor {
    Write-Host "🔨 Capacitor ile APK oluşturuluyor..." -ForegroundColor Cyan
    
    # Capacitor kurulumu
    try {
        npm install -g @capacitor/cli @capacitor/android
        Write-Host "✅ Capacitor kuruldu" -ForegroundColor Green
    } catch {
        Write-Host "❌ Capacitor kurulumu başarısız" -ForegroundColor Red
        return $false
    }
    
    # Capacitor projesi başlat
    try {
        if (Test-Path "$TempDir\capacitor") { Remove-Item "$TempDir\capacitor" -Recurse -Force }
        New-Item -Path "$TempDir\capacitor" -ItemType Directory -Force | Out-Null
        Set-Location "$TempDir\capacitor"
        
        npx cap init CostikFinans com.costikfinans.app --web-dir=../../out
        npx cap add android
        
        # Android konfigürasyonu
        $stringsXml = @"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">CostikFinans</string>
    <string name="title_activity_main">CostikFinans</string>
    <string name="package_name">com.costikfinans.app</string>
    <string name="custom_url_scheme">costikfinans</string>
</resources>
"@
        $stringsPath = "android\app\src\main\res\values\strings.xml"
        New-Item -Path (Split-Path $stringsPath) -ItemType Directory -Force | Out-Null
        Set-Content -Path $stringsPath -Value $stringsXml -Encoding UTF8
        
        npx cap copy android
        npx cap sync android
        
        # Gradle build
        Set-Location "android"
        if ($IsWindows) {
            .\gradlew.bat assembleDebug
        } else {
            chmod +x ./gradlew
            ./gradlew assembleDebug
        }
        
        $apkPath = "app\build\outputs\apk\debug\app-debug.apk"
        if (Test-Path $apkPath) {
            Copy-Item $apkPath "$OutputDir\costikfinans.apk" -Force
            Write-Host "✅ Capacitor APK oluşturuldu" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "❌ Capacitor build hatası: $_" -ForegroundColor Red
    }
    
    return $false
}

function Build-WithCordova {
    Write-Host "🔨 Cordova ile APK oluşturuluyor..." -ForegroundColor Cyan
    
    # Cordova kurulumu
    try {
        npm install -g cordova
        Write-Host "✅ Cordova kuruldu" -ForegroundColor Green
    } catch {
        Write-Host "❌ Cordova kurulumu başarısız" -ForegroundColor Red
        return $false
    }
    
    try {
        if (Test-Path "$TempDir\cordova") { Remove-Item "$TempDir\cordova" -Recurse -Force }
        New-Item -Path "$TempDir\cordova" -ItemType Directory -Force | Out-Null
        Set-Location "$TempDir\cordova"
        
        cordova create . com.costikfinans.app CostikFinans
        
        # Web dosyalarını kopyala
        if (Test-Path "www") { Remove-Item "www" -Recurse -Force }
        Copy-Item "$ProjectRoot\out" "www" -Recurse
        
        # Config.xml
        $configXml = @"
<?xml version='1.0' encoding='utf-8'?>
<widget id="com.costikfinans.app" version="1.0.0" xmlns="http://www.w3.org/ns/widgets">
    <name>CostikFinans</name>
    <description>Kişisel Finans Yönetimi</description>
    <author email="info@costikfinans.app" href="https://costikfinans.vercel.app">CostikFinans Team</author>
    <content src="index.html" />
    <platform name="android">
        <allow-intent href="market:*" />
        <preference name="android-minSdkVersion" value="21" />
        <preference name="android-targetSdkVersion" value="34" />
    </platform>
    <allow-navigation href="*" />
    <allow-intent href="*" />
</widget>
"@
        Set-Content -Path "config.xml" -Value $configXml -Encoding UTF8
        
        cordova platform add android
        cordova build android --debug
        
        $apkPath = "platforms\android\app\build\outputs\apk\debug\app-debug.apk"
        if (Test-Path $apkPath) {
            Copy-Item $apkPath "$OutputDir\costikfinans.apk" -Force
            Write-Host "✅ Cordova APK oluşturuldu" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "❌ Cordova build hatası: $_" -ForegroundColor Red
    }
    
    return $false
}

# Ana akış
try {
    Set-Location $ProjectRoot
    
    # Gereksinimler
    Test-Requirements
    
    # Temp dizin hazırla
    if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
    New-Item -Path $TempDir -ItemType Directory -Force | Out-Null
    
    # Output dizin hazırla
    if (-not (Test-Path $OutputDir)) { New-Item -Path $OutputDir -ItemType Directory -Force | Out-Null }
    
    # Next.js build
    Write-Host "🏗️ Next.js build başlatılıyor..." -ForegroundColor Cyan
    pnpm build
    
    if (-not (Test-Path "out")) {
        Write-Host "❌ Next.js build başarısız - 'out' dizini bulunamadı" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Next.js build tamamlandı" -ForegroundColor Green
    
    # APK build yöntemi seç
    $success = $false
    
    if ($Method -eq "capacitor") {
        $success = Build-WithCapacitor
    } elseif ($Method -eq "cordova") {
        $success = Build-WithCordova
    } else {
        # Auto: Capacitor'ı dene, başarısızsa Cordova
        Write-Host "🤖 Otomatik yöntem seçimi..." -ForegroundColor Yellow
        $success = Build-WithCapacitor
        if (-not $success) {
            Write-Host "Capacitor başarısız, Cordova deneniyor..." -ForegroundColor Yellow
            $success = Build-WithCordova
        }
    }
    
    if ($success) {
        $apkSize = (Get-Item "$OutputDir\costikfinans.apk").Length
        Write-Host "🎉 APK başarıyla oluşturuldu!" -ForegroundColor Green
        Write-Host "📱 Dosya: $OutputDir\costikfinans.apk" -ForegroundColor Green
        Write-Host "📏 Boyut: $([math]::Round($apkSize / 1MB, 2)) MB" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Kurulum için:" -ForegroundColor Yellow
        Write-Host "  1. APK dosyasını Android cihazınıza aktarın"
        Write-Host "  2. Bilinmeyen kaynaklardan yüklemeyi etkinleştirin"
        Write-Host "  3. APK dosyasını açıp yükleyin"
    } else {
        Write-Host "❌ APK oluşturulamadı - tüm yöntemler başarısız" -ForegroundColor Red
        Write-Host "💡 Öneriler:" -ForegroundColor Yellow
        Write-Host "  - Android Studio SDK'sını kurun"
        Write-Host "  - ANDROID_HOME environment variable'ını ayarlayın"
        Write-Host "  - Java JDK 11+ kurulu olduğundan emin olun"
        exit 1
    }
    
} catch {
    Write-Host "❌ Beklenmeyen hata: $_" -ForegroundColor Red
    exit 1
} finally {
    # Temizlik
    if (Test-Path $TempDir) { 
        try { Remove-Item $TempDir -Recurse -Force } catch { }
    }
    Set-Location $ProjectRoot
}
