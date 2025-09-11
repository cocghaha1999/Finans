# CostikFinans - Render.com Deployment Rehberi

## 📋 Proje Bilgileri
- **Site Adı:** CostikFinans
- **Teknoloji:** Next.js 15 (Static Export)
- **Deployment Platform:** Render.com
- **Tip:** Static Web Site

## 🚀 Deployment Adımları

### 1. GitHub Repository Hazırlığı
```bash
git add .
git commit -m "Render deployment ready"
git push origin main
```

### 2. Render.com'da Yeni Site Oluşturma
1. [Render.com](https://render.com) hesabınıza giriş yapın
2. **"New"** → **"Static Site"** seçin
3. GitHub repository'nizi seçin (`cocghaha1999/Finans`)
4. Aşağıdaki ayarları yapın:

### 3. Build & Deploy Ayarları
```yaml
Name: CostikFinans
Branch: main
Root Directory: (boş bırakın)
Build Command: pnpm install && pnpm run build
Publish Directory: out
```

### 4. Environment Variables (Opsiyonel)
```
NODE_VERSION=22.18.0
```

### 5. Custom Domain (costikfinans.site)
1. Site oluşturulduktan sonra **Settings** → **Custom Domains**
2. `costikfinans.site` domain'ini ekleyin
3. DNS ayarlarınızda CNAME kaydı oluşturun:
   ```
   Type: CNAME
   Name: @
   Value: [render-verilen-url]
   ```

## 📁 Proje Yapısı
- ✅ Static Export aktif (`next.config.mjs`)
- ✅ PWA desteği
- ✅ Offline çalışma
- ✅ Responsive tasarım
- ✅ SEO optimizasyonu

## 🔧 Build Komutları
```bash
# Dependencies yükle
pnpm install

# Development server
pnpm dev

# Production build
pnpm build

# Build sonucunu kontrol et
pnpm start
```

## 📊 Build Çıktısı
- **Total Pages:** 13 sayfa
- **Build Size:** ~512KB (First Load)
- **Static Pages:** ✅ Tüm sayfalar statik
- **PWA:** ✅ Service Worker aktif

## 🌐 Render.com Özel Ayarları
`render.yaml` dosyası ile otomatik deployment yapılandırılmıştır:
- Auto-deploy: Git push'larda otomatik deploy
- Build cache: Dependencies cache'lenir
- Static files: Gzip compression
- HTTPS: Otomatik SSL sertifikası

## 📝 Notlar
- Build süresi: ~2-3 dakika
- PWA özellikleri aktif
- Offline çalışma desteği
- Mobile-first responsive tasarım
- Firebase entegrasyonu mevcut
