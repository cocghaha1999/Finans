import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Yatırımlarım",
  description: "Yatırım portföyünü takip edin ve performansınızı analiz edin",
}

export default function InvestmentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
