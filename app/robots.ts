import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'
export const revalidate = false

export default function robots(): MetadataRoute.Robots {
  const host = 'https://costikfinans.site'
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${host}/sitemap.xml`,
    host,
  }
}
