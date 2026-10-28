/**
 * Sitemap Generation
 *
 * Generates sitemap.xml from registry routes and player pages.
 */

import { SEO_ROUTES, getIndexableRoutes } from './seo-routes'

export interface SitemapEntry {
  loc: string
  priority?: string
  changefreq?: string
  lastmod?: string
}

/**
 * Generate sitemap.xml with all indexable pages
 */
export function generateSitemap(
  playerSlugs: string[],
  playerDirectoryUrls: string[],
  landingPageUrls: string[],
  valuesDate: string
): string {
  const entries: SitemapEntry[] = []

  // Add indexable routes from registry
  for (const route of getIndexableRoutes()) {
    entries.push({
      loc: route.slug,
      priority: route.priority?.toString() || '0.7',
      changefreq: route.changefreq || 'monthly',
    })
  }

  // Add player directory URLs
  for (const url of playerDirectoryUrls) {
    entries.push({
      loc: url,
      priority: '0.8',
      changefreq: 'weekly',
    })
  }

  // Add landing page URLs
  for (const url of landingPageUrls) {
    entries.push({
      loc: url,
      priority: '0.7',
      changefreq: 'monthly',
    })
  }

  // Add individual player pages with lastmod
  for (const slug of playerSlugs) {
    entries.push({
      loc: `/players/${slug}/`,
      priority: '0.6',
      changefreq: 'weekly',
      lastmod: valuesDate,
    })
  }

  // Build XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`

  for (const entry of entries) {
    xml += `  <url>\n`
    xml += `    <loc>https://fantasydraftpros.com${entry.loc}</loc>\n`
    if (entry.lastmod) {
      xml += `    <lastmod>${entry.lastmod}</lastmod>\n`
    }
    if (entry.changefreq) {
      xml += `    <changefreq>${entry.changefreq}</changefreq>\n`
    }
    if (entry.priority) {
      xml += `    <priority>${entry.priority}</priority>\n`
    }
    xml += `  </url>\n`
  }

  xml += `</urlset>\n`
  return xml
}
