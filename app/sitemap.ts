import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'
export const revalidate = false

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://costikfinans.site'
  const now = new Date()
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/features`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/offline`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]
}
