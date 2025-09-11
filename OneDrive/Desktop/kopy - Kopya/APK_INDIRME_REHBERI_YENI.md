# APK İndirme ve Kurulum Rehberi (Güncellenmiş)

CostikFinans uygulamasını Android cihazınıza indirip kurmak için farklı yöntemler mevcuttur.

## 🚀 Hızlı Başlangıç

### Yöntem 1: PWA Kurulumu (Önerilen) ⭐
En hızlı ve güvenli yöntem:

1. **Tarayıcıda siteyi açın**: https://costikfinans.site
2. **Chrome menüsünü açın** (⋮ üç nokta)
3. **"Ana ekrana ekle"** seçeneğini seçin
4. **"Yükle"** butonuna basın

✅ **Avantajları:**
- 3 saniyede kurulum
- Otomatik güncelleme
- Uygulama gibi tam ekran deneyim
- Güvenli ve hızlı

---

### Yöntem 2: APK İndirme 📱

#### Otomatik İndirme
1. Sitede **"APK İndir"** butonuna basın
2. Dosya otomatik olarak indirilecek
3. İndirilen `CostikFinans.apk` dosyasını açın

#### Manuel İndirme
- **Direkt link**: [costikfinans.apk](https://costikfinans.site/downloads/costikfinans.apk)
- Dosya adı: `CostikFinans.apk`
- Boyut: ~2-5 MB

#### Kurulum Adımları
1. **Güvenlik ayarları**:
   - Ayarlar → Güvenlik → "Bilinmeyen kaynaklar" ✅
   - Veya Ayarlar → Uygulamalar → Chrome → "Bu kaynaktan yüklemeye izin ver" ✅

2. **CostikFinans.apk** dosyasına tıklayın

3. **"Yükle"** butonuna basın

4. Kurulum tamamlandığında **"Aç"** butonuna basın

---

## 🛠️ Geliştirici/Test Yöntemleri

### Yöntem 3: PWA Builder ile APK Oluşturma
1. [PWA Builder](https://pwabuilder.com) sitesine gidin
2. Site URL'sini girin: `https://costikfinans.vercel.app`
3. **"Generate"** butonuna tıklayın
4. **Android** seçeneğini seçin
5. APK'yı indirin ve kurun

### Yöntem 4: Lokal APK Build (Geliştiriciler için)

#### Windows PowerShell ile:
```powershell
# Otomatik build
.\scripts\build-apk-local.ps1

# Capacitor ile build
.\scripts\build-apk-local.ps1 -Method capacitor

# Cordova ile build
.\scripts\build-apk-local.ps1 -Method cordova

# Temizlik
.\scripts\build-apk-local.ps1 -Clean
```

#### Node.js ile:
```bash
# Otomatik yöntem seçimi
npm run build-apk

# Capacitor kullan
npm run build-apk-capacitor

# Cordova kullan  
npm run build-apk-cordova

# PWA Builder API kullan
npm run build-apk-pwa
```

---

## 🔧 Sorun Giderme

### "Paketin ayrıştırılmasında bir sorun oluştu" Hatası

**Olası nedenler ve çözümler:**

1. **APK dosyası bozuk/eksik**:
   - Yeniden indirin (internet bağlantınızı kontrol edin)
   - Farklı tarayıcı deneyin (Chrome önerilir)
   - Cache/çerezleri temizleyin

2. **Android sürümü uyumsuz**:
   - Minimum gereksinim: Android 5.0+
   - Cihaz bilgilerinizi kontrol edin

3. **Dosya boyutu kontrolü**:
   - APK 2MB'dan küçükse indirme hatası var
   - Dosya özelliklerinden boyutu kontrol edin

4. **İzin sorunu**:
   - "Bilinmeyen kaynaklar" iznini açın
   - Chrome'a "bu kaynaktan yükleme" iznini verin

### Alternatif Çözümler

**APK kurulmazsa:**
1. **PWA kurulumunu deneyin** (Yöntem 1) - En güvenilir
2. **Farklı cihazda test edin**
3. **Android Studio APK Analyzer** ile dosyayı kontrol edin
4. **ADB ile manuel kurulum**: `adb install costikfinans.apk`

---

## 📋 Sistem Gereksinimleri

### Minimum Gereksinimler
- **Android**: 5.0+ (API 21)
- **RAM**: 1 GB
- **Depolama**: 50 MB boş alan
- **İnternet**: İlk kurulum için gerekli

### Önerilen Gereksinimler  
- **Android**: 8.0+ (API 26)
- **RAM**: 2 GB+
- **Depolama**: 100 MB boş alan

---

## 🔐 Güvenlik

- **APK imzası**: Debug imzalı (geliştirme sürümü)
- **İzinler**: İnternet erişimi, depolama
- **Kaynak**: Açık kaynak, GitHub'da mevcut
- **Tarama**: Virüs taramasından geçmiş

---

## 📞 Destek

Sorun yaşıyorsanız:

1. **Hızlı çözüm**: PWA kurulumunu deneyin
2. **GitHub Issues**: Teknik sorunlar için
3. **Sistem bilgisi paylaşın**: 
   - Android sürümü
   - Cihaz modeli  
   - Hata mesajının ekran görüntüsü

---

## 📝 Notlar

- APK dosyası otomatik olarak güncellenir (CI/CD)
- PWA versiyonu her zaman en güncel
- Offline çalışma her iki yöntemde de desteklenir
- Veriler yerel olarak saklanır (güvenli)

**En iyi deneyim için PWA kurulumu önerilir!** 🚀
