import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { url, size = 200, format = 'png' } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL gerekli' },
        { status: 400 }
      )
    }

    // QR kod oluşturmak için external service kullan
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&format=${format}&bgcolor=FFFFFF&color=000000&margin=10&ecc=M`
    
    const response = await fetch(qrUrl)
    
    if (!response.ok) {
      throw new Error('QR kod oluşturulamadı')
    }

    const imageBuffer = await response.arrayBuffer()

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': `image/${format}`,
        'Cache-Control': 'public, max-age=86400', // 24 saat cache
      }
    })

  } catch (error) {
    console.error('QR kod oluşturma hatası:', error)
    
    return NextResponse.json(
      { 
        error: 'QR kod oluşturulamadı',
        message: 'Lütfen daha sonra tekrar deneyin.',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'QR Code Generator API',
    endpoints: {
      'POST /api/qr-generate': 'QR kod oluştur',
    },
    parameters: {
      url: 'string (required) - QR koda encode edilecek URL',
      size: 'number (optional) - QR kod boyutu (default: 200)',
      format: 'string (optional) - Görüntü formatı (default: png)'
    },
    status: 'active'
  })
}
