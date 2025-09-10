export interface BankInfo {
  name: string;
  logo: string; // URL to the bank's logo
  minPaymentPercentage: {
    default: number;
    special?: { limit: number; percentage: number };
  };
  minimumAmount: number; // Minimum ödeme tutarı (TL)
  debtTiers?: {
    tier1: { max: number; percentage: number }; // 0-X TL arası
    tier2: { max: number; percentage: number }; // X-Y TL arası
    tier3: { percentage: number }; // Y TL üstü
  };
}

// BDDK taban oranları (kredi kartı limiti esas alınır)
// Kaynak: BDDK Kredi Kartları Yönetmeliği (genel çerçeve). Bankalar daha yüksek oran uygulayabilir ama tabanın altına inemez.
const LIMIT_T1_MAX = 15000;  // <= 15.000 TL
const LIMIT_T2_MAX = 20000;  // 15.001 - 20.000 TL
const RATE_T1 = 0.30;        // %30
const RATE_T2 = 0.35;        // %35
const RATE_T3 = 0.40;        // %40
const DEFAULT_MIN_AMOUNT = 100; // TL cinsinden alt sınır (bankalarca farklılaşabilir)

function getFloorRateByLimit(creditLimit: number | null | undefined): number {
  const lim = Number(creditLimit || 0);
  if (lim <= 0) return RATE_T1; // limiti bilinmiyorsa muhafazakâr: %30
  if (lim <= LIMIT_T1_MAX) return RATE_T1;
  if (lim <= LIMIT_T2_MAX) return RATE_T2;
  return RATE_T3;
}

// Bankaya göre asgari ödeme hesaplama fonksiyonu (limit tabanlı)
export function calculateMinimumPaymentByBank(bankName: string | undefined | null, creditLimit: number | null | undefined, currentDebt: number): number {
  if (!currentDebt || currentDebt <= 0) return 0;

  const floorRate = getFloorRateByLimit(creditLimit);
  const bank = TURKISH_BANKS.find(b => b.name === bankName);

  // Başlangıç olarak yasal taban oran
  let rate = floorRate;
  let minPayment = bank?.minimumAmount ?? DEFAULT_MIN_AMOUNT;

  // Bankanın ilan ettiği (varsa) varsayılan oran tabandan düşükse yok say, yüksekse uygula
  if (bank?.minPaymentPercentage?.default && bank.minPaymentPercentage.default > rate) {
    rate = bank.minPaymentPercentage.default;
  }

  // Özel limit indirimi gibi kurallar uygulanacaksa, yine tabanın altına düşmemesine dikkat et
  if (bank?.minPaymentPercentage?.special && creditLimit && creditLimit >= bank.minPaymentPercentage.special.limit) {
    const special = bank.minPaymentPercentage.special;
    // special.percentage >= floorRate olmalı; altı geçerli değil
    rate = Math.max(floorRate, Math.min(rate, special.percentage));
  }

  return Math.max(minPayment, Math.round(currentDebt * rate));
}

export const TURKISH_BANKS: BankInfo[] = [
  // Özel Bankalar - 2025 Güncel Oranları
  { 
    name: "Akbank", 
    logo: "https://www.akbank.com/SiteAssets/img/akbank-logo.png", 
    minPaymentPercentage: { default: 0.25, special: { limit: 50000, percentage: 0.20 } },
    minimumAmount: 50,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.20 },
      tier2: { max: 15000, percentage: 0.25 },
      tier3: { percentage: 0.30 }
    }
  },
  { 
    name: "Garanti BBVA", 
    logo: "https://www.garantibbva.com.tr/assets/images/logo.svg", 
    minPaymentPercentage: { default: 0.25, special: { limit: 50000, percentage: 0.20 } },
    minimumAmount: 50,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.20 },
      tier2: { max: 15000, percentage: 0.25 },
      tier3: { percentage: 0.30 }
    }
  },
  { 
    name: "İş Bankası", 
    logo: "https://www.isbank.com.tr/content/dam/isbank/assets/isbank-logo.svg", 
    minPaymentPercentage: { default: 0.25, special: { limit: 40000, percentage: 0.20 } },
    minimumAmount: 50,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.20 },
      tier2: { max: 15000, percentage: 0.25 },
      tier3: { percentage: 0.30 }
    }
  },
  { 
    name: "Yapı Kredi", 
    logo: "https://www.yapikredi.com.tr/assets/img/logo-yapikredi.svg", 
    minPaymentPercentage: { default: 0.25, special: { limit: 50000, percentage: 0.20 } },
    minimumAmount: 50,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.20 },
      tier2: { max: 15000, percentage: 0.25 },
      tier3: { percentage: 0.30 }
    }
  },
  { 
    name: "QNB Finansbank", 
    logo: "https://www.qnbfinansbank.com/assets/qnbfinansbank/images/logo.svg", 
    minPaymentPercentage: { default: 0.25, special: { limit: 50000, percentage: 0.20 } },
    minimumAmount: 50,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.20 },
      tier2: { max: 15000, percentage: 0.25 },
      tier3: { percentage: 0.30 }
    }
  },
  { 
    name: "DenizBank", 
    logo: "https://www.denizbank.com/assets/images/logo.svg", 
    minPaymentPercentage: { default: 0.25, special: { limit: 40000, percentage: 0.20 } },
    minimumAmount: 50,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.20 },
      tier2: { max: 15000, percentage: 0.25 },
      tier3: { percentage: 0.30 }
    }
  },
  { 
    name: "TEB", 
    logo: "https://www.teb.com.tr/assets/img/teb-logo.svg", 
    minPaymentPercentage: { default: 0.25, special: { limit: 40000, percentage: 0.20 } },
    minimumAmount: 75,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.20 },
      tier2: { max: 15000, percentage: 0.25 },
      tier3: { percentage: 0.30 }
    }
  },
  { 
    name: "ING", 
    logo: "https://www.ing.com.tr/ING-logo.svg", 
    minPaymentPercentage: { default: 0.25, special: { limit: 40000, percentage: 0.20 } },
    minimumAmount: 50,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.20 },
      tier2: { max: 15000, percentage: 0.25 },
      tier3: { percentage: 0.30 }
    }
  },
  { 
    name: "HSBC", 
    logo: "https://www.hsbc.com.tr/dist/img/hsbc-logo.svg", 
    minPaymentPercentage: { default: 0.25, special: { limit: 50000, percentage: 0.20 } },
    minimumAmount: 100,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.20 },
      tier2: { max: 15000, percentage: 0.25 },
      tier3: { percentage: 0.30 }
    }
  },
  { 
    name: "Odeabank", 
    logo: "https://www.odeabank.com.tr/SiteAssets/img/odeabank-logo.svg", 
    minPaymentPercentage: { default: 0.25, special: { limit: 40000, percentage: 0.20 } },
    minimumAmount: 50,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.20 },
      tier2: { max: 15000, percentage: 0.25 },
      tier3: { percentage: 0.30 }
    }
  },
  { 
    name: "Alternatif Bank", 
    logo: "https://www.alternatifbank.com.tr/assets/images/logo.svg", 
    minPaymentPercentage: { default: 0.25, special: { limit: 40000, percentage: 0.20 } },
    minimumAmount: 50,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.20 },
      tier2: { max: 15000, percentage: 0.25 },
      tier3: { percentage: 0.30 }
    }
  },
  { 
    name: "Burgan Bank", 
    logo: "https://www.burgan.com.tr/assets/images/logo.svg", 
    minPaymentPercentage: { default: 0.25, special: { limit: 40000, percentage: 0.20 } },
    minimumAmount: 50,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.20 },
      tier2: { max: 15000, percentage: 0.25 },
      tier3: { percentage: 0.30 }
    }
  },
  { 
    name: "Fibabanka", 
    logo: "https://www.fibabanka.com.tr/assets/images/logo.svg", 
    minPaymentPercentage: { default: 0.25, special: { limit: 40000, percentage: 0.20 } },
    minimumAmount: 50,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.20 },
      tier2: { max: 15000, percentage: 0.25 },
      tier3: { percentage: 0.30 }
    }
  },
  { 
    name: "Şekerbank", 
    logo: "https://www.sekerbank.com.tr/assets/images/logo.svg", 
    minPaymentPercentage: { default: 0.25, special: { limit: 30000, percentage: 0.20 } },
    minimumAmount: 40,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.20 },
      tier2: { max: 15000, percentage: 0.25 },
      tier3: { percentage: 0.30 }
    }
  },
  { 
    name: "Anadolubank", 
    logo: "https://www.anadolubank.com.tr/assets/images/logo.svg", 
    minPaymentPercentage: { default: 0.25, special: { limit: 30000, percentage: 0.20 } },
    minimumAmount: 40,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.20 },
      tier2: { max: 15000, percentage: 0.25 },
      tier3: { percentage: 0.30 }
    }
  },
  { 
    name: "ICBC Turkey", 
    logo: "https://www.icbc.com.tr/ICBC-Logo.svg", 
    minPaymentPercentage: { default: 0.25, special: { limit: 40000, percentage: 0.20 } },
    minimumAmount: 50,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.20 },
      tier2: { max: 15000, percentage: 0.25 },
      tier3: { percentage: 0.30 }
    }
  },
  { 
    name: "Citibank", 
    logo: "https://www.citibank.com.tr/assets/images/citi-logo.svg", 
    minPaymentPercentage: { default: 0.25, special: { limit: 50000, percentage: 0.20 } },
    minimumAmount: 100,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.20 },
      tier2: { max: 15000, percentage: 0.25 },
      tier3: { percentage: 0.30 }
    }
  },
  
  // Kamu Bankaları - 2025 Güncel Oranları (Daha düşük oranlar)
  { 
    name: "Ziraat Bankası", 
    logo: "https://www.ziraatbank.com.tr/tr/PublishingImages/logo.svg", 
    minPaymentPercentage: { default: 0.20, special: { limit: 50000, percentage: 0.15 } },
    minimumAmount: 30,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.15 },
      tier2: { max: 15000, percentage: 0.20 },
      tier3: { percentage: 0.25 }
    }
  },
  { 
    name: "Halkbank", 
    logo: "https://www.halkbank.com.tr/images/logo.svg", 
    minPaymentPercentage: { default: 0.20, special: { limit: 50000, percentage: 0.15 } },
    minimumAmount: 30,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.15 },
      tier2: { max: 15000, percentage: 0.20 },
      tier3: { percentage: 0.25 }
    }
  },
  { 
    name: "VakıfBank", 
    logo: "https://www.vakifbank.com.tr/vakifbank-logo.svg", 
    minPaymentPercentage: { default: 0.20, special: { limit: 50000, percentage: 0.15 } },
    minimumAmount: 30,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.15 },
      tier2: { max: 15000, percentage: 0.20 },
      tier3: { percentage: 0.25 }
    }
  },
  
  // Katılım Bankaları - 2025 Güncel Oranları (Orta seviye oranlar)
  { 
    name: "Kuveyt Türk", 
    logo: "https://www.kuveytturk.com.tr/assets/img/logo-kt.svg", 
    minPaymentPercentage: { default: 0.20, special: { limit: 40000, percentage: 0.15 } },
    minimumAmount: 30,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.15 },
      tier2: { max: 15000, percentage: 0.20 },
      tier3: { percentage: 0.25 }
    }
  },
  { 
    name: "Albaraka Türk", 
    logo: "https://www.albaraka.com.tr/assets/images/logo.svg", 
    minPaymentPercentage: { default: 0.20, special: { limit: 30000, percentage: 0.15 } },
    minimumAmount: 25,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.15 },
      tier2: { max: 15000, percentage: 0.20 },
      tier3: { percentage: 0.25 }
    }
  },
  { 
    name: "Türkiye Finans", 
    logo: "https://www.turkiyefinans.com.tr/assets/images/logo.svg", 
    minPaymentPercentage: { default: 0.20, special: { limit: 40000, percentage: 0.15 } },
    minimumAmount: 30,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.15 },
      tier2: { max: 15000, percentage: 0.20 },
      tier3: { percentage: 0.25 }
    }
  },
  { 
    name: "Emlak Katılım", 
    logo: "https://www.emlakkatilim.com.tr/assets/images/logo.svg", 
    minPaymentPercentage: { default: 0.20, special: { limit: 30000, percentage: 0.15 } },
    minimumAmount: 25,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.15 },
      tier2: { max: 15000, percentage: 0.20 },
      tier3: { percentage: 0.25 }
    }
  },
  { 
    name: "Vakıf Katılım", 
    logo: "https://www.vakifkatilim.com.tr/assets/images/logo.svg", 
    minPaymentPercentage: { default: 0.20, special: { limit: 40000, percentage: 0.15 } },
    minimumAmount: 30,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.15 },
      tier2: { max: 15000, percentage: 0.20 },
      tier3: { percentage: 0.25 }
    }
  },
  { 
    name: "Ziraat Katılım", 
    logo: "https://www.ziraatkatilim.com.tr/assets/images/logo.svg", 
    minPaymentPercentage: { default: 0.20, special: { limit: 40000, percentage: 0.15 } },
    minimumAmount: 30,
    debtTiers: {
      tier1: { max: 5000, percentage: 0.15 },
      tier2: { max: 15000, percentage: 0.20 },
      tier3: { percentage: 0.25 }
    }
  },
];
