# 💰 CostikFinans - Kişisel Finans Yöneticisi

![CostikFinans Logo](public/placeholder-logo.png)

**CostikFinans**, kişisel finanslarınızı kolayca yönetmenize yardımcı olan modern bir web uygulamasıdır. PWA (Progressive Web App) teknolojisi ile çevrimdışı çalışma desteği sunar.

🌐 **Canlı Site**: [costikfinans.site](https://costikfinans.site)

## ✨ Özellikler

### 💸 Finansal Yönetim
- **Gelir/Gider Takibi** - Tüm finansal işlemlerinizi kaydedin
- **Kategori Bazlı Analiz** - Harcamalarınızı kategorilere ayırın
- **Bütçe Planlama** - Aylık/yıllık bütçe hedefleri belirleyin
- **Kart Yönetimi** - Kredi kartı bakiyelerini takip edin

### 📱 Mobil Deneyim
- **PWA Desteği** - Ana ekrana ekleyerek uygulama gibi kullanın
- **Çevrimdışı Çalışma** - İnternet olmadan da kullanılabilir
- **Push Bildirimleri** - Önemli finansal hatırlatmalar
- **Responsive Tasarım** - Tüm cihazlarda mükemmel görünüm

### 🔧 Teknik Özellikler
- **Next.js 15** - Modern React framework
- **TypeScript** - Tip güvenliği
- **Tailwind CSS** - Utility-first CSS framework
- **PWA** - Progressive Web App teknolojisi
- **Firebase** - Backend ve authentication
- **Framer Motion** - Smooth animasyonlar

## 🚀 Hızlı Başlangıç

### Önkoşullar
- Node.js 18.0 veya üzeri
- pnpm package manager

### Kurulum
```bash
# Repository'yi klonlayın
git clone https://github.com/cocghaha1999/Finans.git
cd Finans

# Bağımlılıkları yükleyin
pnpm install

# Development server'ı başlatın
pnpm dev
```

Uygulama `http://localhost:3000` adresinde çalışmaya başlayacaktır.

### Production Build
```bash
# Static export için build
pnpm build

# Build edilen dosyalar 'out' klasöründe yer alır
```

## 📦 Deployment

### Render Static Site
Bu proje Render'da statik site olarak deploy edilmek üzere yapılandırılmıştır:

1. **Render hesabınızda**:
   - New → Static Site
   - GitHub repository'sini bağlayın
   - Build Command: `pnpm install --frozen-lockfile && pnpm run build`
   - Publish Directory: `out`

2. **Custom Domain**:
   - Render dashboard'da Settings → Custom Domains
   - `costikfinans.site` domain'ini ekleyin

### Diğer Platformlar
- **Vercel**: `vercel --prod`
- **Netlify**: `netlify deploy --prod --dir=out`
- **GitHub Pages**: Static export dosyalarını gh-pages branch'ine push edin

## 🛠️ Geliştirme

### Proje Yapısı
```
├── app/                    # Next.js App Router
│   ├── budgets/           # Bütçe yönetimi
│   ├── kartlarim/         # Kart sayfası
│   ├── notifications/     # Bildirimler
│   ├── odemeler/          # Ödemeler
│   └── yatirimlar/        # Yatırımlar
├── components/            # React bileşenleri
│   ├── ui/               # UI primitives
│   └── ...               # App bileşenleri
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
├── public/               # Static assets
└── styles/               # CSS dosyaları
```

### Teknoloji Stack
- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **State Management**: React Context, Local Storage
- **Database**: Firebase Firestore
- **PWA**: next-pwa, Workbox
- **Animations**: Framer Motion
- **Charts**: Recharts

## 🧪 Test Etme

```bash
# Linting
pnpm lint

# Type checking
pnpm type-check

# PWA audit
pnpm lighthouse
```

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun: `git checkout -b feature/yeni-ozellik`
3. Değişikliklerinizi commit edin: `git commit -m 'Yeni özellik eklendi'`
4. Branch'inizi push edin: `git push origin feature/yeni-ozellik`
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 📞 İletişim

- **Website**: [costikfinans.site](https://costikfinans.site)
- **GitHub**: [github.com/cocghaha1999/Finans](https://github.com/cocghaha1999/Finans)
- **Issues**: [GitHub Issues](https://github.com/cocghaha1999/Finans/issues)

## 🙏 Teşekkürler

- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Radix UI](https://www.radix-ui.com/) - UI primitives
- [Firebase](https://firebase.google.com/) - Backend services

---

💰 **CostikFinans** ile finansal hayatınızı kontrol altına alın!
