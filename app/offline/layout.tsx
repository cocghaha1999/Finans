import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Çevrimdışı - CostikFinans',
  description: 'İnternet bağlantısı olmadan da kullanabilirsiniz',
}

export default function OfflineLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
