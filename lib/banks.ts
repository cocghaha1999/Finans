export interface BankInfo {
  name: string;
  logo: string; // URL to the bank's logo
  minPaymentPercentage: {
    default: number;
    special?: { limit: number; percentage: number };
  };
}

export const TURKISH_BANKS: BankInfo[] = [
  { name: "Akbank", logo: "https://www.akbank.com/SiteAssets/img/akbank-logo.png", minPaymentPercentage: { default: 0.30 } },
  { name: "Garanti BBVA", logo: "https://www.garantibbva.com.tr/assets/images/logo.svg", minPaymentPercentage: { default: 0.30 } },
  { name: "İş Bankası", logo: "https://www.isbank.com.tr/content/dam/isbank/assets/isbank-logo.svg", minPaymentPercentage: { default: 0.30 } },
  { name: "Yapı Kredi", logo: "https://www.yapikredi.com.tr/assets/img/logo-yapikredi.svg", minPaymentPercentage: { default: 0.30 } },
  { name: "Ziraat Bankası", logo: "https://www.ziraatbank.com.tr/tr/PublishingImages/logo.svg", minPaymentPercentage: { default: 0.20 } },
  { name: "Halkbank", logo: "https://www.halkbank.com.tr/images/logo.svg", minPaymentPercentage: { default: 0.20 } },
  { name: "VakıfBank", logo: "https://www.vakifbank.com.tr/vakifbank-logo.svg", minPaymentPercentage: { default: 0.20 } },
  { name: "QNB Finansbank", logo: "https://www.qnbfinansbank.com/assets/qnbfinansbank/images/logo.svg", minPaymentPercentage: { default: 0.30 } },
  { name: "DenizBank", logo: "https://www.denizbank.com/assets/images/logo.svg", minPaymentPercentage: { default: 0.30 } },
  { name: "TEB", logo: "https://www.teb.com.tr/assets/img/teb-logo.svg", minPaymentPercentage: { default: 0.30 } },
  { name: "ING", logo: "https://www.ing.com.tr/ING-logo.svg", minPaymentPercentage: { default: 0.30 } },
  { name: "HSBC", logo: "https://www.hsbc.com.tr/dist/img/hsbc-logo.svg", minPaymentPercentage: { default: 0.30 } },
  { name: "Odeabank", logo: "https://www.odeabank.com.tr/SiteAssets/img/odeabank-logo.svg", minPaymentPercentage: { default: 0.30 } },
  { name: "Alternatif Bank", logo: "https://www.alternatifbank.com.tr/assets/images/logo.svg", minPaymentPercentage: { default: 0.30 } },
  { name: "Burgan Bank", logo: "https://www.burgan.com.tr/assets/images/logo.svg", minPaymentPercentage: { default: 0.30 } },
  { name: "Fibabanka", logo: "https://www.fibabanka.com.tr/assets/images/logo.svg", minPaymentPercentage: { default: 0.30 } },
  { name: "Şekerbank", logo: "https://www.sekerbank.com.tr/assets/images/logo.svg", minPaymentPercentage: { default: 0.30 } },
  { name: "Anadolubank", logo: "https://www.anadolubank.com.tr/assets/images/logo.svg", minPaymentPercentage: { default: 0.30 } },
  { name: "ICBC Turkey", logo: "https://www.icbc.com.tr/ICBC-Logo.svg", minPaymentPercentage: { default: 0.30 } },
  { name: "Citibank", logo: "https://www.citibank.com.tr/assets/images/citi-logo.svg", minPaymentPercentage: { default: 0.30 } },
  { name: "Kuveyt Türk", logo: "https://www.kuveytturk.com.tr/assets/img/logo-kt.svg", minPaymentPercentage: { default: 0.20 } },
  { name: "Albaraka Türk", logo: "https://www.albaraka.com.tr/assets/images/logo.svg", minPaymentPercentage: { default: 0.20 } },
  { name: "Türkiye Finans", logo: "https://www.turkiyefinans.com.tr/assets/images/logo.svg", minPaymentPercentage: { default: 0.20 } },
  { name: "Emlak Katılım", logo: "https://www.emlakkatilim.com.tr/assets/images/logo.svg", minPaymentPercentage: { default: 0.20 } },
  { name: "Vakıf Katılım", logo: "https://www.vakifkatilim.com.tr/assets/images/logo.svg", minPaymentPercentage: { default: 0.20 } },
  { name: "Ziraat Katılım", logo: "https://www.ziraatkatilim.com.tr/assets/images/logo.svg", minPaymentPercentage: { default: 0.20 } },
];
