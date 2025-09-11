import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { appName, packageName, version } = await request.json()

    // Bu örnekte basit bir APK oluşturma simülasyonu yapıyoruz
    // Gerçek ortamda TWA (Trusted Web Activity) veya PWA builder kullanabilirsiniz
    
    // TWA Config oluştur
    const twaConfig = {
      packageId: packageName || 'com.costikfinans.app',
      host: process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com',
      name: appName || 'CostikFinans',
      launcherName: appName || 'CostikFinans',
      display: 'standalone',
      orientation: 'portrait',
      themeColor: '#3b82f6',
      backgroundColor: '#ffffff',
      startUrl: '/',
      iconUrl: '/icons/icon-512x512.png',
      maskableIconUrl: '/icons/icon-512x512-maskable.png',
      monochromeIconUrl: '/icons/icon-512x512-monochrome.png',
      splashScreenColor: '#ffffff',
      version: version || '1.0.0',
      versionCode: 1,
      enableNotifications: true,
      enableLocationDelegation: false,
      enablePaymentDelegation: false,
      enablePhotoPickerDelegation: false,
      generatorApp: 'CostikFinans PWA Builder'
    }

    // PWA Builder API kullanarak APK oluştur
    const pwaBuilderResponse = await fetch('https://pwabuilder-apk-web.azurewebsites.net/generateApk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: twaConfig.host,
        name: twaConfig.name,
        packageId: twaConfig.packageId,
        version: twaConfig.version,
        versionCode: twaConfig.versionCode,
        themeColor: twaConfig.themeColor,
        backgroundColor: twaConfig.backgroundColor,
        enableNotifications: twaConfig.enableNotifications
      })
    })

    if (!pwaBuilderResponse.ok) {
      // Fallback: Önceden oluşturulmuş APK döndür
      const fallbackApkPath = '/downloads/CostikFinans.apk'
      
      try {
        const fallbackResponse = await fetch(new URL(fallbackApkPath, request.url))
        if (fallbackResponse.ok) {
          const apkBuffer = await fallbackResponse.arrayBuffer()
          
          return new NextResponse(apkBuffer, {
            headers: {
              'Content-Type': 'application/vnd.android.package-archive',
              'Content-Disposition': `attachment; filename="CostikFinans-v${version || '1.0.0'}.apk"`,
              'Cache-Control': 'no-cache'
            }
          })
        }
      } catch (fallbackError) {
        console.error('Fallback APK error:', fallbackError)
      }

      // Son çare: Boş APK template döndür
      return createEmptyApkResponse(twaConfig)
    }

    const apkBuffer = await pwaBuilderResponse.arrayBuffer()

    return new NextResponse(apkBuffer, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': `attachment; filename="${appName || 'CostikFinans'}-v${version || '1.0.0'}.apk"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('APK generation error:', error)
    
    return NextResponse.json(
      { 
        error: 'APK oluşturulamadı',
        message: 'Lütfen daha sonra tekrar deneyin veya PWA yüklemesini kullanın.',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}

function createEmptyApkResponse(config: any) {
  // Minimal APK yapısı (bu gerçek bir APK değil, sadece demo amaçlı)
  const apkContent = Buffer.from(`
    APK Placeholder for ${config.name}
    Package: ${config.packageId}
    Version: ${config.version}
    
    This is a placeholder APK file.
    For production use, integrate with:
    - PWABuilder API
    - Capacitor
    - Apache Cordova
    - or similar tools
  `)

  return new NextResponse(apkContent, {
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': `attachment; filename="${config.name}-v${config.version}.apk"`,
      'Cache-Control': 'no-cache'
    }
  })
}

export async function GET() {
  return NextResponse.json({
    message: 'APK Generator API',
    endpoints: {
      'POST /api/apk/generate': 'APK dosyası oluştur',
    },
    status: 'active'
  })
}
