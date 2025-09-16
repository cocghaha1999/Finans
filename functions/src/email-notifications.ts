import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as nodemailer from 'nodemailer'

// Firebase Admin'i başlat
if (!admin.apps.length) {
  admin.initializeApp()
}

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

interface EmailData {
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
  daysLeft?: number
  isToday?: boolean
  isReminder?: boolean
  [key: string]: any
}

interface EmailNotificationData {
  userId: string
  userEmail: string
  userName?: string
  notificationType: string
  data: EmailData
  priority?: 'low' | 'medium' | 'high'
}

// SMTP ayarları (Gmail örneği - gerçek projedde environment variables kullanın)
const emailConfig = {
  service: 'gmail',
  auth: {
    user: functions.config()?.email?.user || process.env.EMAIL_USER || 'test@gmail.com',
    pass: functions.config()?.email?.password || process.env.EMAIL_PASSWORD || 'test-password'
  }
}

// Basit e-posta template fonksiyonu
const getEmailTemplate = (type: string, data: EmailData): EmailTemplate => {
  const createEmailWrapper = (content: string, title: string) => `
    <!DOCTYPE html>
    <html>
    <head><title>${title}</title></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #667eea;">💰 Costik - Finansal Takip</h1>
        ${content}
        <hr style="margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          Bu e-posta Costik Finansal Takip uygulamasından gönderilmiştir.
        </p>
      </div>
    </body>
    </html>
  `

  switch (type) {
    case 'payment_reminder':
      const timeText = data.isToday ? 'bugün' : 'yakında'
      const content = `
        <h2>💰 Ödeme Hatırlatıcısı</h2>
        <p>Merhaba ${data.userName || 'Değerli Kullanıcı'},</p>
        <p><strong>${data.paymentName}</strong> ödemesi ${timeText} vadesi geliyor!</p>
        <p><strong>Tutar:</strong> ${data.amount} TL</p>
        ${data.dueDate ? `<p><strong>Vade Tarihi:</strong> ${data.dueDate}</p>` : ''}
      `
      return {
        subject: `💰 Ödeme Hatırlatıcısı: ${data.paymentName}`,
        html: createEmailWrapper(content, 'Ödeme Hatırlatıcısı'),
        text: `${data.paymentName} ödemesi ${timeText} vadesi geliyor! Tutar: ${data.amount} TL`
      }

    case 'bill_due':
      const billContent = `
        <h2>💳 Fatura Vadesi Yaklaşıyor</h2>
        <p>Merhaba ${data.userName || 'Değerli Kullanıcı'},</p>
        <p><strong>${data.billName}</strong> faturanızın vadesi ${data.daysLeft} gün sonra geliyor.</p>
        <p><strong>Tutar:</strong> ${data.amount} TL</p>
        ${data.dueDate ? `<p><strong>Vade Tarihi:</strong> ${data.dueDate}</p>` : ''}
      `
      return {
        subject: `💳 Fatura Vadesi: ${data.billName}`,
        html: createEmailWrapper(billContent, 'Fatura Vadesi'),
        text: `${data.billName} faturanızın vadesi ${data.daysLeft} gün sonra geliyor. Tutar: ${data.amount} TL`
      }

    default:
      return {
        subject: '[TEST] Costik Bildirimi',
        html: createEmailWrapper('<p>Bu bir test e-postasıdır.</p>', 'Test Bildirim'),
        text: 'Bu bir test e-postasıdır.'
      }
  }
}

// Nodemailer transporter oluştur
const createTransporter = () => {
  return nodemailer.createTransport({
    service: emailConfig.service,
    auth: emailConfig.auth,
    secure: true
  })
}

// E-posta gönder fonksiyonu
export const sendEmailNotification = functions.https.onCall(async (data: EmailNotificationData, context) => {
  try {
    // Kimlik doğrulama kontrolü
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kullanıcı doğrulanmamış')
    }

    const { userId, userEmail, userName, notificationType, data: notificationData, priority } = data

    // E-posta template'ini oluştur
    const emailTemplate = getEmailTemplate(notificationType, {
      userName,
      userEmail,
      ...notificationData
    })

    // Transporter oluştur
    const transporter = createTransporter()

    // E-posta gönder
    const mailOptions = {
      from: {
        name: 'Costik - Finansal Takip',
        address: emailConfig.auth.user
      },
      to: userEmail,
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
      priority: (priority === 'high' ? 'high' : 'normal') as 'high' | 'normal' | 'low'
    }

    const result = await transporter.sendMail(mailOptions)
    
    // Log kaydet
    try {
      await admin.firestore().collection('email_logs').add({
        userId,
        userEmail,
        notificationType,
        subject: emailTemplate.subject,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        messageId: result.messageId || 'unknown',
        priority: priority || 'medium',
        success: true
      })
    } catch (logError) {
      console.error('Log kaydetme hatası:', logError)
    }

    console.log(`E-posta başarıyla gönderildi: ${userEmail}, Type: ${notificationType}`)
    
    return { 
      success: true, 
      messageId: result.messageId || 'unknown',
      message: 'E-posta başarıyla gönderildi'
    }

  } catch (error) {
    console.error('E-posta gönderme hatası:', error)
    
    // Hata log kaydet
    try {
      if (data.userId) {
        await admin.firestore().collection('email_logs').add({
          userId: data.userId,
          userEmail: data.userEmail,
          notificationType: data.notificationType,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          success: false,
          error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        })
      }
    } catch (logError) {
      console.error('Error log kaydetme hatası:', logError)
    }

    throw new functions.https.HttpsError('internal', 'E-posta gönderilirken hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'))
  }
})

// Test e-postası gönder (development için)
export const sendTestEmail = functions.https.onCall(async (data: {
  userEmail: string
  notificationType: string
}, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Kullanıcı doğrulanmamış')
    }

    const testData = {
      userName: 'Test Kullanıcı',
      userEmail: data.userEmail,
      paymentName: 'Test Ödeme',
      amount: 1500,
      dueDate: new Date().toLocaleDateString('tr-TR'),
      daysLeft: 1,
      isToday: true
    }

    const emailTemplate = getEmailTemplate(data.notificationType, testData)
    const transporter = createTransporter()

    const mailOptions = {
      from: {
        name: 'Costik - Test',
        address: emailConfig.auth.user
      },
      to: data.userEmail,
      subject: '[TEST] ' + emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
      priority: 'normal' as const
    }

    const result = await transporter.sendMail(mailOptions)
    
    return { 
      success: true, 
      messageId: result.messageId || 'unknown',
      message: 'Test e-postası gönderildi'
    }

  } catch (error) {
    console.error('Test e-posta gönderme hatası:', error)
    throw new functions.https.HttpsError('internal', 'Test e-postası gönderilirken hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'))
  }
})