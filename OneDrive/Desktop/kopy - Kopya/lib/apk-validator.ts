// APK Validator - Fake APK Detection & Security
export interface APKValidationResult {
  isValid: boolean
  size: number
  errors: string[]
  warnings: string[]
  securityScore: number
  metadata?: {
    name?: string
    version?: string
    packageName?: string
    buildDate?: string
  }
}

export class APKValidator {
  private static readonly MIN_SIZE = 1024 * 1024 // 1MB minimum
  private static readonly MAX_SIZE = 50 * 1024 * 1024 // 50MB maximum
  private static readonly EXPECTED_PACKAGE = 'com.costikfinans.app'
  private static readonly EXPECTED_SIZE_RANGE = {
    min: 2 * 1024 * 1024, // 2MB
    max: 10 * 1024 * 1024  // 10MB
  }

  static async validateAPKFile(file: File): Promise<APKValidationResult> {
    const result: APKValidationResult = {
      isValid: true,
      size: file.size,
      errors: [],
      warnings: [],
      securityScore: 100
    }

    // 1. Size validation
    if (file.size < this.MIN_SIZE) {
      result.errors.push(`APK çok küçük (${this.formatSize(file.size)}). Minimum ${this.formatSize(this.MIN_SIZE)} olmalı.`)
      result.securityScore -= 30
    }

    if (file.size > this.MAX_SIZE) {
      result.errors.push(`APK çok büyük (${this.formatSize(file.size)}). Maximum ${this.formatSize(this.MAX_SIZE)} olmalı.`)
      result.securityScore -= 20
    }

    // 2. Expected size range
    if (file.size < this.EXPECTED_SIZE_RANGE.min || file.size > this.EXPECTED_SIZE_RANGE.max) {
      result.warnings.push(`APK boyutu beklenenden farklı (${this.formatSize(file.size)}). Beklenen: ${this.formatSize(this.EXPECTED_SIZE_RANGE.min)}-${this.formatSize(this.EXPECTED_SIZE_RANGE.max)}`)
      result.securityScore -= 10
    }

    // 3. File name validation
    if (!file.name.toLowerCase().endsWith('.apk')) {
      result.errors.push('Dosya uzantısı .apk olmalı')
      result.securityScore -= 25
    }

    // 4. MIME type validation
    if (file.type && !['application/vnd.android.package-archive', 'application/octet-stream'].includes(file.type)) {
      result.warnings.push(`Beklenmeyen dosya tipi: ${file.type}`)
      result.securityScore -= 5
    }

    // 5. File name pattern validation
    const expectedNames = ['costikfinans.apk', 'CostikFinans.apk', 'app-release.apk', 'app-debug.apk']
    if (!expectedNames.some(name => file.name.toLowerCase().includes(name.toLowerCase()))) {
      result.warnings.push(`Dosya adı beklenmeyen format: ${file.name}`)
      result.securityScore -= 10
    }

    // Final validation
    result.isValid = result.errors.length === 0 && result.securityScore >= 50

    return result
  }

  static async validateAPKFromURL(url: string): Promise<APKValidationResult> {
    try {
      // HEAD request to get metadata
      const headResponse = await fetch(url, { 
        method: 'HEAD',
        cache: 'no-store'
      })

      if (!headResponse.ok) {
        return {
          isValid: false,
          size: 0,
          errors: [`APK dosyası bulunamadı (HTTP ${headResponse.status})`],
          warnings: [],
          securityScore: 0
        }
      }

      const contentLength = headResponse.headers.get('content-length')
      const contentType = headResponse.headers.get('content-type')
      const size = contentLength ? parseInt(contentLength) : 0

      const result: APKValidationResult = {
        isValid: true,
        size,
        errors: [],
        warnings: [],
        securityScore: 100
      }

      // Size validation
      if (size < this.MIN_SIZE) {
        result.errors.push(`APK çok küçük (${this.formatSize(size)}). Fake APK olabilir.`)
        result.securityScore -= 40
      }

      if (size > this.MAX_SIZE) {
        result.errors.push(`APK çok büyük (${this.formatSize(size)}). Güvenlik riski.`)
        result.securityScore -= 30
      }

      // Expected size validation
      if (size < this.EXPECTED_SIZE_RANGE.min || size > this.EXPECTED_SIZE_RANGE.max) {
        result.warnings.push(`APK boyutu beklenenden farklı (${this.formatSize(size)})`)
        result.securityScore -= 15
      }

      // Content-Type validation
      if (contentType && !contentType.includes('application/vnd.android.package-archive') && !contentType.includes('application/octet-stream')) {
        result.warnings.push(`Beklenmeyen içerik tipi: ${contentType}`)
        result.securityScore -= 10
      }

      // URL validation
      if (!url.includes('costikfinans') || !url.endsWith('.apk')) {
        result.warnings.push('APK URL\'i beklenmeyen format')
        result.securityScore -= 10
      }

      result.isValid = result.errors.length === 0 && result.securityScore >= 60

      return result

    } catch (error) {
      return {
        isValid: false,
        size: 0,
        errors: [`APK doğrulama hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`],
        warnings: [],
        securityScore: 0
      }
    }
  }

  static formatSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  static getSecurityStatus(score: number): { status: string; color: string; description: string } {
    if (score >= 90) {
      return {
        status: 'Mükemmel',
        color: 'text-green-600',
        description: 'APK dosyası güvenli ve doğrulanmış'
      }
    } else if (score >= 70) {
      return {
        status: 'İyi',
        color: 'text-blue-600',
        description: 'APK dosyası güvenli görünüyor'
      }
    } else if (score >= 50) {
      return {
        status: 'Orta',
        color: 'text-yellow-600',
        description: 'APK dosyasında küçük sorunlar var'
      }
    } else if (score >= 30) {
      return {
        status: 'Riskli',
        color: 'text-orange-600',
        description: 'APK dosyası riskli olabilir'
      }
    } else {
      return {
        status: 'Tehlikeli',
        color: 'text-red-600',
        description: 'APK dosyası güvenilir değil - fake olabilir'
      }
    }
  }
}
