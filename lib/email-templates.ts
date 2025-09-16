export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface EmailData {
  userName?: string
  userEmail?: string
  amount?: number
  date?: string
  dueDate?: string
  billName?: string
  paymentName?: string
  category?: string
  description?: string
  accountName?: string
  balance?: number
  goalName?: string
  eventCount?: number
  totalExpense?: number
  totalIncome?: number
  month?: string
  [key: string]: any
}

// Ana e-posta template wrapper'ı
const createEmailWrapper = (content: string, title: string) => `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
        }
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .email-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .email-header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .email-body {
            padding: 30px 20px;
        }
        .notification-card {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        .notification-card.high-priority {
            border-left-color: #dc3545;
            background: #fff5f5;
        }
        .notification-card.medium-priority {
            border-left-color: #ffc107;
            background: #fffbf0;
        }
        .amount {
            font-size: 18px;
            font-weight: bold;
            color: #28a745;
        }
        .amount.expense {
            color: #dc3545;
        }
        .date {
            color: #6c757d;
            font-size: 14px;
        }
        .cta-button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 10px 0;
        }
        .cta-button:hover {
            background: #5a6fd8;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 12px;
        }
        .emoji {
            font-size: 24px;
            margin-right: 10px;
        }
        @media (max-width: 600px) {
            .email-container {
                margin: 10px;
            }
            .email-header, .email-body {
                padding: 20px 15px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1><span class="emoji">💰</span>Costik - Finansal Takip</h1>
        </div>
        <div class="email-body">
            ${content}
        </div>
        <div class="footer">
            <p>Bu e-posta Costik Finansal Takip uygulamasından gönderilmiştir.</p>
            <p>E-posta bildirimlerini durdurmak için uygulama ayarlarından değiştirebilirsiniz.</p>
        </div>
    </div>
</body>
</html>
`

// E-posta template'leri
export const emailTemplates = {
  bill_due: (data: EmailData): EmailTemplate => {
    const priority = data.daysLeft <= 1 ? 'high-priority' : 'medium-priority'
    const emoji = data.daysLeft <= 1 ? '🚨' : '💳'
    
    const content = `
      <div class="notification-card ${priority}">
        <h2><span class="emoji">${emoji}</span>Fatura Vadesi Yaklaşıyor</h2>
        <p>Merhaba ${data.userName || 'Değerli Kullanıcı'},</p>
        <p><strong>${data.billName}</strong> faturanızın vadesi ${data.daysLeft} gün sonra geliyor.</p>
        <div style="margin: 20px 0;">
          <p><strong>Vade Tarihi:</strong> <span class="date">${data.dueDate}</span></p>
          <p><strong>Tutar:</strong> <span class="amount expense">${data.amount} TL</span></p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/odemeler" class="cta-button">
          Ödemeleri Görüntüle
        </a>
      </div>
    `
    
    return {
      subject: `💳 Fatura Vadesi: ${data.billName} - ${data.daysLeft} gün kaldı`,
      html: createEmailWrapper(content, 'Fatura Vadesi'),
      text: `Fatura Vadesi Yaklaşıyor: ${data.billName} faturanızın vadesi ${data.daysLeft} gün sonra (${data.dueDate}). Tutar: ${data.amount} TL`
    }
  },

  budget_exceeded: (data: EmailData): EmailTemplate => {
    const content = `
      <div class="notification-card high-priority">
        <h2><span class="emoji">⚠️</span>Bütçe Aşımı</h2>
        <p>Merhaba ${data.userName || 'Değerli Kullanıcı'},</p>
        <p><strong>${data.category}</strong> kategorisinde bütçenizi aştınız!</p>
        <div style="margin: 20px 0;">
          <p><strong>Bütçe:</strong> <span class="amount">${data.budget} TL</span></p>
          <p><strong>Harcama:</strong> <span class="amount expense">${data.spent} TL</span></p>
          <p><strong>Aşım Oranı:</strong> <span style="color: #dc3545; font-weight: bold;">%${data.percentage}</span></p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/budgets" class="cta-button">
          Bütçeleri İncele
        </a>
      </div>
    `
    
    return {
      subject: `⚠️ Bütçe Aşımı: ${data.category} - %${data.percentage}`,
      html: createEmailWrapper(content, 'Bütçe Aşımı'),
      text: `Bütçe Aşımı: ${data.category} kategorisinde bütçenizi %${data.percentage} aştınız. Harcama: ${data.spent}/${data.budget} TL`
    }
  },

  payment_reminder: (data: EmailData): EmailTemplate => {
    const isToday = data.isToday
    const emoji = isToday ? '🚨' : '💰'
    const priority = isToday ? 'high-priority' : 'medium-priority'
    const timeText = isToday ? 'bugün' : 'yarın'
    
    const content = `
      <div class="notification-card ${priority}">
        <h2><span class="emoji">${emoji}</span>${isToday ? 'Ödeme Tarihi Geldi!' : 'Ödeme Hatırlatıcısı'}</h2>
        <p>Merhaba ${data.userName || 'Değerli Kullanıcı'},</p>
        <p><strong>${data.paymentName}</strong> ödemesi ${timeText} vadesi geliyor!</p>
        <div style="margin: 20px 0;">
          <p><strong>Ödeme:</strong> ${data.paymentName}</p>
          <p><strong>Tutar:</strong> <span class="amount expense">${data.amount?.toLocaleString('tr-TR')} TL</span></p>
          <p><strong>Vade Tarihi:</strong> <span class="date">${data.dueDate}</span></p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/odemeler" class="cta-button">
          Ödemeleri Yap
        </a>
      </div>
    `
    
    return {
      subject: `${emoji} ${isToday ? 'ÖDEMENİZ BUGÜN VADESİ GELİYOR' : 'Ödeme Hatırlatıcısı'}: ${data.paymentName}`,
      html: createEmailWrapper(content, 'Ödeme Hatırlatıcısı'),
      text: `${data.paymentName} ödemesi ${timeText} vadesi geliyor! Tutar: ${data.amount?.toLocaleString('tr-TR')} TL`
    }
  },

  low_balance: (data: EmailData): EmailTemplate => {
    const content = `
      <div class="notification-card high-priority">
        <h2><span class="emoji">💳</span>Düşük Bakiye Uyarısı</h2>
        <p>Merhaba ${data.userName || 'Değerli Kullanıcı'},</p>
        <p><strong>${data.accountName}</strong> hesabınızda bakiye düşük seviyelerde!</p>
        <div style="margin: 20px 0;">
          <p><strong>Kalan Bakiye:</strong> <span class="amount expense">${data.balance} TL</span></p>
          <p style="color: #6c757d;">Hesabınıza para yatırmayı düşünebilirsiniz.</p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/kartlarim" class="cta-button">
          Hesapları Görüntüle
        </a>
      </div>
    `
    
    return {
      subject: `💳 Düşük Bakiye Uyarısı: ${data.accountName}`,
      html: createEmailWrapper(content, 'Düşük Bakiye'),
      text: `Düşük Bakiye Uyarısı: ${data.accountName} hesabınızda sadece ${data.balance} TL kaldı.`
    }
  },

  monthly_report: (data: EmailData): EmailTemplate => {
    const content = `
      <div class="notification-card">
        <h2><span class="emoji">📊</span>Aylık Finansal Rapor</h2>
        <p>Merhaba ${data.userName || 'Değerli Kullanıcı'},</p>
        <p><strong>${data.month}</strong> ayına ait finansal raporunuz hazır!</p>
        <div style="margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin: 10px 0;">
            <span><strong>Toplam Gelir:</strong></span>
            <span class="amount">${data.totalIncome?.toLocaleString('tr-TR')} TL</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin: 10px 0;">
            <span><strong>Toplam Harcama:</strong></span>
            <span class="amount expense">${data.totalExpense?.toLocaleString('tr-TR')} TL</span>
          </div>
          <hr>
          <div style="display: flex; justify-content: space-between; margin: 10px 0; font-weight: bold;">
            <span>Net:</span>
            <span class="${(data.totalIncome || 0) - (data.totalExpense || 0) >= 0 ? 'amount' : 'amount expense'}">
              ${((data.totalIncome || 0) - (data.totalExpense || 0)).toLocaleString('tr-TR')} TL
            </span>
          </div>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/" class="cta-button">
          Detayları Görüntüle
        </a>
      </div>
    `
    
    return {
      subject: `📊 ${data.month} Aylık Finansal Rapor`,
      html: createEmailWrapper(content, 'Aylık Rapor'),
      text: `${data.month} aylık raporunuz hazır! Toplam harcama: ${data.totalExpense} TL, Gelir: ${data.totalIncome} TL`
    }
  },

  goal_reached: (data: EmailData): EmailTemplate => {
    const content = `
      <div class="notification-card" style="background: #f0fff4; border-left-color: #28a745;">
        <h2><span class="emoji">🎯</span>Hedef Tamamlandı!</h2>
        <p>Merhaba ${data.userName || 'Değerli Kullanıcı'},</p>
        <p>Tebrikler! <strong>"${data.goalName}"</strong> hedefinizi başarıyla tamamladınız! 🎉</p>
        <div style="margin: 20px 0;">
          <p style="font-size: 16px; color: #28a745; font-weight: bold;">
            Bu başarınızla finansal hedeflerinize bir adım daha yaklaştınız!
          </p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/yatirimlar" class="cta-button">
          Yeni Hedef Belirle
        </a>
      </div>
    `
    
    return {
      subject: `🎯 Tebrikler! "${data.goalName}" hedefinizi tamamladınız!`,
      html: createEmailWrapper(content, 'Hedef Tamamlandı'),
      text: `Tebrikler! "${data.goalName}" hedefinizi başarıyla tamamladınız! 🎉`
    }
  },

  transaction_alert: (data: EmailData): EmailTemplate => {
    const isIncome = data.type === 'income'
    const emoji = isIncome ? '💚' : '💸'
    const typeText = isIncome ? 'gelir' : 'gider'
    
    const content = `
      <div class="notification-card">
        <h2><span class="emoji">${emoji}</span>İşlem Bildirimi</h2>
        <p>Merhaba ${data.userName || 'Değerli Kullanıcı'},</p>
        <p>Yeni bir ${typeText} işlemi eklendi:</p>
        <div style="margin: 20px 0;">
          <p><strong>Açıklama:</strong> ${data.description}</p>
          <p><strong>Tutar:</strong> <span class="amount ${isIncome ? '' : 'expense'}">${data.amount?.toLocaleString('tr-TR')} TL</span></p>
          <p><strong>Tarih:</strong> <span class="date">${data.date}</span></p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/" class="cta-button">
          İşlemleri Görüntüle
        </a>
      </div>
    `
    
    return {
      subject: `${emoji} Yeni ${typeText} işlemi: ${data.amount?.toLocaleString('tr-TR')} TL`,
      html: createEmailWrapper(content, 'İşlem Bildirimi'),
      text: `${data.amount?.toLocaleString('tr-TR')} TL tutarında ${typeText} eklendi: ${data.description}`
    }
  },

  calendar_daily: (data: EmailData): EmailTemplate => {
    const content = `
      <div class="notification-card">
        <h2><span class="emoji">📅</span>Günlük Takvim Hatırlatıcısı</h2>
        <p>Merhaba ${data.userName || 'Değerli Kullanıcı'},</p>
        <p>Bugün ${data.eventCount || 0} etkinliğiniz var.</p>
        ${data.hasImportantEvents ? `
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <p style="margin: 0; color: #856404; font-weight: bold;">⚠️ Önemli ödemelerinizi kontrol etmeyi unutmayın!</p>
          </div>
        ` : ''}
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/" class="cta-button">
          Takvimi Görüntüle
        </a>
      </div>
    `
    
    return {
      subject: `📅 Günlük hatırlatıcı: ${data.eventCount || 0} etkinlik`,
      html: createEmailWrapper(content, 'Günlük Hatırlatıcı'),
      text: `Bugün ${data.eventCount || 0} etkinliğiniz var. ${data.hasImportantEvents ? 'Önemli ödemelerinizi kontrol edin!' : ''}`
    }
  },

  calendar_event: (data: EmailData): EmailTemplate => {
    const eventEmoji = data.eventType === 'payment' ? '💰' : data.eventType === 'income' ? '💚' : '📝'
    
    const content = `
      <div class="notification-card">
        <h2><span class="emoji">${eventEmoji}</span>Takvim Etkinliği</h2>
        <p>Merhaba ${data.userName || 'Değerli Kullanıcı'},</p>
        <p><strong>${data.title || 'Etkinlik'}</strong></p>
        <div style="margin: 20px 0;">
          ${data.amount ? `<p><strong>Tutar:</strong> <span class="amount ${data.eventType === 'payment' ? 'expense' : ''}">${data.amount} TL</span></p>` : ''}
          ${data.description ? `<p><strong>Açıklama:</strong> ${data.description}</p>` : ''}
          <p><strong>Tarih:</strong> <span class="date">${data.date}</span></p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/" class="cta-button">
          Takvimi Görüntüle
        </a>
      </div>
    `
    
    return {
      subject: `${eventEmoji} Takvim: ${data.title || 'Etkinlik'}`,
      html: createEmailWrapper(content, 'Takvim Etkinliği'),
      text: `${data.title || 'Etkinlik'} - ${data.amount ? `Tutar: ${data.amount} TL` : ''} ${data.description || ''}`
    }
  },

  calendar_summary: (data: EmailData): EmailTemplate => {
    const content = `
      <div class="notification-card">
        <h2><span class="emoji">📊</span>Takvim Özeti</h2>
        <p>Merhaba ${data.userName || 'Değerli Kullanıcı'},</p>
        <p><strong>${data.period || 'Bu hafta'}</strong> özeti:</p>
        <div style="margin: 20px 0;">
          <p><strong>Toplam Etkinlik:</strong> ${data.totalEvents || 0}</p>
          ${data.totalAmount ? `<p><strong>Toplam Tutar:</strong> <span class="amount">${data.totalAmount}</span></p>` : ''}
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/" class="cta-button">
          Detayları Görüntüle
        </a>
      </div>
    `
    
    return {
      subject: `📊 ${data.period || 'Haftalık'} takvim özeti`,
      html: createEmailWrapper(content, 'Takvim Özeti'),
      text: `${data.period || 'Bu hafta'} ${data.totalEvents || 0} etkinlik, ${data.totalAmount ? `toplam: ${data.totalAmount}` : ''}`
    }
  }
}

// Template seçici fonksiyonu
export const getEmailTemplate = (type: string, data: EmailData): EmailTemplate => {
  const template = emailTemplates[type as keyof typeof emailTemplates]
  if (!template) {
    // Varsayılan template
    return {
      subject: 'Costik Bildirimi',
      html: createEmailWrapper('<p>Yeni bir bildiriminiz var.</p>', 'Bildirim'),
      text: 'Yeni bir bildiriminiz var.'
    }
  }
  return template(data)
}