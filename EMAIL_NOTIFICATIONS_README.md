# E-posta Bildirim Sistemi Kurulum Rehberi

## 🚀 Özellikler

✅ **Tam E-posta Desteği**: Tüm bildirim türleri için profesyonel HTML e-posta template'leri
✅ **Firebase Functions Entegrasyonu**: Sunucu tarafında güvenli e-posta gönderimi
✅ **Admin Panel Kontrolü**: E-posta ayarlarını admin panelinden yönetme
✅ **Kullanıcı Tercihleri**: Bireysel bildirim ayarları
✅ **Zamanlanmış Bildirimler**: Otomatik ödeme hatırlatıcıları ve aylık raporlar
✅ **Test Sistemi**: Admin panelinden test e-postaları gönderme

## 📧 Desteklenen Bildirim Türleri

1. **Fatura Vadesi Yaklaşıyor** - HTML formatında güzel tasarım
2. **Bütçe Aşımı** - Renkli uyarı tasarımı  
3. **Ödeme Hatırlatıcısı** - Yüksek öncelikli bildirimler
4. **Düşük Bakiye Uyarısı** - Hesap bakiye uyarıları
5. **Aylık Finansal Rapor** - Detaylı aylık özetler
6. **Hedef Tamamlandı** - Başarı bildirimleri
7. **İşlem Bildirimi** - Anlık işlem uyarıları
8. **Takvim Hatırlatıcıları** - Günlük ve etkinlik bildirimleri

## ⚙️ Kurulum

### 1. Firebase Functions Hazırlığı
```bash
cd functions
npm install nodemailer @types/nodemailer
```

### 2. E-posta Servisi Konfigürasyonu

**Gmail Kullanımı (Önerilen):**
1. Gmail hesabınızda 2FA'yı etkinleştirin
2. "Uygulama Şifresi" oluşturun
3. Functions klasöründe `.env` dosyası oluşturun:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Firebase Functions Deploy
```bash
cd functions
npm run build
firebase deploy --only functions
```

### 4. Admin Panel Ayarları

1. **Admin Panel** → **Ayarlar** → **Bildirimler** sekmesine gidin
2. E-posta konfigürasyonunu doldurun:
   - SMTP Sunucu: `smtp.gmail.com`
   - SMTP Port: `587`
   - E-posta Kullanıcısı: Gmail adresiniz
   - E-posta Şifresi: Uygulama şifreniz

3. **Test E-posta** gönderme özelliğini kullanarak ayarları test edin

## 🎯 Kullanım

### Programatik E-posta Gönderimi
```typescript
import { useNotifications } from '@/lib/notifications'

const { createNotificationWithEmail } = useNotifications()

// E-posta ile bildirim gönder
await createNotificationWithEmail(
  'payment_reminder',
  {
    paymentName: 'Elektrik Faturası',
    amount: 150,
    dueDate: '2024-01-15'
  },
  'high', // priority
  undefined, // scheduledFor
  'user@example.com',
  'Kullanıcı Adı'
)
```

### Firebase Functions Direkt Çağırma
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions'

const functions = getFunctions()
const sendEmailNotification = httpsCallable(functions, 'sendEmailNotification')

await sendEmailNotification({
  userId: 'user-id',
  userEmail: 'user@example.com',
  userName: 'Kullanıcı Adı',
  notificationType: 'bill_due',
  data: {
    billName: 'İnternet Faturası',
    amount: 89.90,
    dueDate: '2024-01-20',
    daysLeft: 3
  },
  priority: 'medium'
})
```

## 🔧 Gelişmiş Özellikler

### Zamanlanmış Bildirimler
Sistem otomatik olarak şu durumları kontrol eder:
- **Günlük 09:00**: Vadesi yaklaşan ödemeler (1-3 gün kala)
- **Ayın Son Günü**: Aylık finansal rapor gönderimi

### Toplu E-posta Gönderimi (Admin)
```typescript
const sendBulkEmail = httpsCallable(functions, 'sendBulkEmailNotifications')

await sendBulkEmail({
  recipients: [
    { userId: 'user1', userEmail: 'user1@example.com', userName: 'User 1' },
    { userId: 'user2', userEmail: 'user2@example.com', userName: 'User 2' }
  ],
  notificationType: 'monthly_report',
  data: { month: 'Ocak 2024', totalExpense: 5000, totalIncome: 8000 },
  priority: 'low'
})
```

### Kullanıcı Tercih Yönetimi
- **Ayarlar** sayfasından bireysel bildirim tercihleri
- Sayfa bazında bildirim kontrolü
- E-posta vs browser bildirim seçeneği

## 🎨 E-posta Template Özelleştirme

Template'ler `lib/email-templates.ts` dosyasında bulunur. Her template:
- **Responsive tasarım** (mobil uyumlu)
- **HTML + Text** versiyonları
- **Marka renkleri** ve profesyonel görünüm
- **CTA buttonları** ile direkt yönlendirme

### Yeni Template Ekleme
```typescript
export const emailTemplates = {
  // ... mevcut template'ler
  
  new_notification_type: (data: EmailData): EmailTemplate => {
    const content = `
      <div class="notification-card">
        <h2><span class="emoji">🔔</span>Yeni Bildirim</h2>
        <p>Özel içerik: ${data.customField}</p>
      </div>
    `
    
    return {
      subject: `🔔 ${data.title}`,
      html: createEmailWrapper(content, 'Yeni Bildirim'),
      text: `Yeni bildirim: ${data.title}`
    }
  }
}
```

## 🔒 Güvenlik

- ✅ **Firebase Auth** entegrasyonu
- ✅ **Admin yetkisi** kontrolü toplu e-posta için
- ✅ **Kullanıcı tercihleri** koruması
- ✅ **Rate limiting** Firebase Functions ile
- ✅ **E-posta log** sistemi

## 📊 Monitoring & Logs

Firebase Console'da:
1. **Functions** → **Logs** → E-posta gönderim logları
2. **Firestore** → **email_logs** collection → Detaylı gönderim kayıtları

## 🆘 Sorun Giderme

### E-posta Gönderilmiyor
1. **.env** dosyası ayarlarını kontrol edin
2. **Gmail uygulama şifresi** doğru mu?
3. **Firebase Functions** deploy edildi mi?
4. **Network/firewall** engellemesi var mı?

### Template Görünmüyor
1. **EMAIL_USER** ve **NEXT_PUBLIC_APP_URL** ayarları
2. **HTML rendering** tarayıcıda test edin
3. **Email client** uyumluluğu (Gmail, Outlook vs.)

## 🎉 Tamamlandı!

E-posta bildirim sistemi artık tamamen aktif! Kullanıcılarınız:
- ✅ Önemli finansal olaylar için e-posta alabilir
- ✅ Kişisel tercihlerini yönetebilir  
- ✅ Profesyonel tasarımlı e-postalar alır
- ✅ Zamanında hatırlatma ve raporlar alır