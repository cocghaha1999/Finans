import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { userEmail, smtpSettings } = await request.json()

    if (!userEmail || !smtpSettings) {
      return NextResponse.json({ 
        success: false, 
        error: 'E-posta adresi ve SMTP ayarları gerekli' 
      }, { status: 400 })
    }

    // Nodemailer transporter oluştur
    const transporter = nodemailer.createTransport({
      host: smtpSettings.host || 'smtp.gmail.com',
      port: smtpSettings.port || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: smtpSettings.user,
        pass: smtpSettings.password,
      },
    })

    // E-posta içeriği
    const mailOptions = {
      from: {
        name: 'Costik - Test',
        address: smtpSettings.user
      },
      to: userEmail,
      subject: '[TEST] Costik E-posta Bildirim Testi',
      text: `
Merhaba!

Bu, Costik finansal takip uygulamasından gönderilen bir test e-postasıdır.

Eğer bu e-postayı alıyorsanız, e-posta bildirim sisteminiz düzgün çalışıyor demektir.

Test Bilgileri:
- Test Zamanı: ${new Date().toLocaleString('tr-TR')}
- Hedef E-posta: ${userEmail}
- SMTP Sunucu: ${smtpSettings.host}

İyi günler dileriz!
Costik Ekibi
      `,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Costik E-posta Test</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 20px; border: 1px solid #e9ecef; }
            .footer { background: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; }
            .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 6px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💰 Costik - E-posta Test</h1>
            </div>
            <div class="content">
              <div class="success">
                <strong>✅ Başarılı!</strong> E-posta bildirim sisteminiz düzgün çalışıyor.
              </div>
              
              <h2>🎯 Test Detayları</h2>
              <ul>
                <li><strong>Test Zamanı:</strong> ${new Date().toLocaleString('tr-TR')}</li>
                <li><strong>Hedef E-posta:</strong> ${userEmail}</li>
                <li><strong>SMTP Sunucu:</strong> ${smtpSettings.host}:${smtpSettings.port}</li>
              </ul>

              <h2>📧 Bildirim Türleri</h2>
              <p>Artık aşağıdaki durumlarda e-posta bildirimi alabilirsiniz:</p>
              <ul>
                <li>💳 Fatura vadesi yaklaştığında</li>
                <li>💰 Ödeme hatırlatıcıları</li>
                <li>⚠️ Bütçe aşım uyarıları</li>
                <li>📊 Aylık finansal raporlar</li>
                <li>🎯 Hedef tamamlandığında</li>
                <li>💸 İşlem bildirimleri</li>
              </ul>

              <p>E-posta bildirimlerinizi istediğiniz zaman uygulama ayarlarından yönetebilirsiniz.</p>
            </div>
            <div class="footer">
              <p>Bu e-posta Costik Finansal Takip uygulamasından gönderilmiştir.</p>
              <p>İyi günler dileriz! 🌟</p>
            </div>
          </div>
        </body>
        </html>
      `
    }

    // E-postayı gönder
    const result = await transporter.sendMail(mailOptions)

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: 'Test e-postası başarıyla gönderildi'
    })

  } catch (error) {
    console.error('Test e-posta hatası:', error)
    
    let errorMessage = 'Bilinmeyen hata'
    if (error instanceof Error) {
      errorMessage = error.message
      
      // Yaygın SMTP hatalarını daha anlaşılır hale getir
      if (error.message.includes('Invalid login')) {
        errorMessage = 'E-posta kullanıcı adı veya şifre hatalı. Gmail kullanıyorsanız "Uygulama Şifresi" kullandığınızdan emin olun.'
      } else if (error.message.includes('Connection timeout')) {
        errorMessage = 'SMTP sunucusuna bağlanılamadı. İnternet bağlantınızı ve SMTP ayarlarınızı kontrol edin.'
      } else if (error.message.includes('self signed certificate')) {
        errorMessage = 'SSL sertifika hatası. SMTP ayarlarını kontrol edin.'
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Detay bulunamadı'
    }, { status: 500 })
  }
}