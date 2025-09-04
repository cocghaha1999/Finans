import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bütçeler - CostikFinans',
  description: 'Aylık harcama limitlerini takip edin ve bütçenizi yönetin',
}

export default function BudgetsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
