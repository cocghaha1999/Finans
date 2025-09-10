# CostikFinans - Render Deployment Guide

Bu dokümanda CostikFinans uygulamasının Render.com'da statik web sitesi olarak nasıl deploy edileceği açıklanmaktadır.

## Deployment Bilgileri

- **Site Adı**: CostikFinans
- **Domain**: costikfinans.site
- **Platform**: Render.com Static Site
- **Build Command**: `pnpm install --frozen-lockfile && pnpm run build`
- **Publish Directory**: `out`

## Render.com'da Deployment Adımları

### 1. Repository Bağlantısı
1. Render.com'a giriş yapın
2. "New" butonuna tıklayın ve "Static Site" seçin
3. GitHub repository'nizi bağlayın

### 2. Site Konfigürasyonu
- **Name**: `costikfinans`
- **Branch**: `main`
- **Root Directory**: `/` (boş bırakın)
- **Build Command**: `pnpm install --frozen-lockfile && pnpm run build`
- **Publish Directory**: `out`

### 3. Environment Variables
Gerekli environment variable'lar:
```
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### 4. Custom Domain
1. Site oluşturulduktan sonra Settings > Custom Domains'e gidin
2. "Add Custom Domain" butonuna tıklayın
3. Domain olarak `costikfinans.site` ekleyin
4. DNS ayarlarınızı Render'ın verdiği IP adresleriyle güncelleyin

### 5. DNS Ayarları
Domain sağlayıcınızda aşağıdaki kayıtları ekleyin:

**A Records:**
```
@ -> 216.24.57.1
www -> 216.24.57.1
```

**CNAME Record (alternatif):**
```
costikfinans.site -> yourapp.onrender.com
```

## Dosya Yapısı

Deployment için önemli dosyalar:

- `render.yaml` - Render konfigürasyon dosyası
- `next.config.mjs` - Next.js statik export konfigürasyonu
- `package.json` - Build scriptleri ve dependencies
- `public/manifest.json` - PWA konfigürasyonu

## Build Process

1. Dependencies yüklenir: `pnpm install --frozen-lockfile`
2. Next.js build çalıştırılır: `pnpm run build`
3. Statik dosyalar `out` klasörüne export edilir
4. Render bu dosyaları serve eder

## SSL Sertifikası

Render otomatik olarak Let's Encrypt SSL sertifikası sağlar. Custom domain ekledikten sonra HTTPS otomatik olarak aktif olur.

## Monitoring

Render dashboard'undan deployment logları ve site durumunu takip edebilirsiniz.

## Troubleshooting

### Build Hataları
- `pnpm-lock.yaml` dosyasının güncel olduğundan emin olun
- Node.js versiyonunun uyumlu olduğunu kontrol edin (22.16.0)

### Domain Sorunları
- DNS propagation 24-48 saat sürebilir
- DNS ayarlarının doğru olduğunu kontrol edin

### Cache Sorunları
- Browser cache'i temizleyin
- Render'da "Clear Cache & Deploy" kullanın

## Performance Optimizations

Render.yaml dosyasında aşağıdaki optimizasyonlar yapılmıştır:

1. **Static Asset Caching**: `_next/static/*` dosyalar 1 yıl cache edilir
2. **Security Headers**: XSS, clickjacking koruması
3. **Service Worker**: Offline support için cache edilmez
4. **PWA Support**: Manifest ve service worker dahil

## Support

Deployment ile ilgili sorunlar için:
- Render documentation: https://render.com/docs
- Next.js static export: https://nextjs.org/docs/app/building-your-application/deploying/static-exports
