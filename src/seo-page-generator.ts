/**
 * SEO Page Generator
 *
 * Generates SEO-optimized HTML pages from registry routes and real app data.
 * Ensures consistent metadata, structured data, and internal linking across all pages.
 *
 * Used by vite.config.ts at build time to generate:
 * - Landing pages
 * - Ranking pages
 * - Hub pages
 * - Guide pages
 * - Authority pages
 */

import { SEO_ROUTES, SeoRoute } from './seo-routes'

/**
 * Core metadata for page generation
 */
export interface PageMetadata {
  url: string
  title: string
  description: string
  h1: string
  bodyClass?: string
  canonical?: string
  noindex?: boolean
  ogImage?: string
  breadcrumbs?: Array<{ name: string; url: string }>
}

/**
 * Generate SEO meta tags for a page
 */
export function generateMetaTags(meta: PageMetadata): string {
  const canonical = meta.canonical || `https://fantasydraftpros.com${meta.url}`
  const robots = meta.noindex ? 'noindex, follow' : 'index, follow'

  return `
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(meta.title)}</title>
    <meta name="description" content="${escapeHtml(meta.description)}" />
    <meta name="robots" content="${robots}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:title" content="${escapeHtml(meta.title)}" />
    <meta property="og:description" content="${escapeHtml(meta.description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:type" content="website" />
    ${meta.ogImage ? `<meta property="og:image" content="${meta.ogImage}" />` : ''}
    <meta property="og:site_name" content="Fantasy Draft Pros" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
    <meta name="twitter:description" content="${escapeHtml(meta.description)}" />
    ${meta.ogImage ? `<meta name="twitter:image" content="${meta.ogImage}" />` : ''}
  `.trim()
}

/**
 * Generate BreadcrumbList structured data
 */
export function generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>): string {
  const items = breadcrumbs.map((crumb, idx) => ({
    '@type': 'ListItem',
    position: idx + 1,
    name: crumb.name,
    item: crumb.url,
  }))

  return JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items,
    },
    null,
    2
  )
}

/**
 * Generate Organization structured data
 */
export function generateOrganizationSchema(): string {
  return JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Fantasy Draft Pros',
      url: 'https://fantasydraftpros.com',
      description: 'Dynasty trade calculator and player valuation tool',
      logo: 'https://fantasydraftpros.com/logo-shield.png',
      sameAs: [],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Support',
      },
    },
    null,
    2
  )
}

/**
 * Generate Article schema for guides
 */
export function generateArticleSchema(
  title: string,
  description: string,
  url: string,
  datePublished?: string
): string {
  return JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: title,
      description: description,
      url: url,
      datePublished: datePublished || new Date().toISOString().split('T')[0],
      author: {
        '@type': 'Organization',
        name: 'Fantasy Draft Pros',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Fantasy Draft Pros',
        logo: {
          '@type': 'ImageObject',
          url: 'https://fantasydraftpros.com/logo-shield.png',
        },
      },
    },
    null,
    2
  )
}

/**
 * Generate a simple SEO landing page
 */
export function generateLandingPageHtml(
  route: SeoRoute,
  content: string,
  appScripts: string,
  appPreloads: string,
  darkModeScript: string
): string {
  const meta: PageMetadata = {
    url: route.slug,
    title: route.title,
    description: route.description,
    h1: route.h1 || route.title,
  }

  const breadcrumbs = [
    { name: 'Fantasy Draft Pros', url: 'https://fantasydraftpros.com' },
    { name: meta.h1, url: `https://fantasydraftpros.com${route.slug}` },
  ]

  return `<!doctype html>
<html lang="en">
<head>
  ${generateMetaTags(meta)}
  <link rel="icon" type="image/png" href="/logo-shield.png" />
  <meta name="theme-color" content="#7c4dff" />
  <script>${darkModeScript}</script>
  ${appPreloads}
</head>
<body>
  <div id="root">
    <div style="background:#13111e;color:#e0dce8;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:0 auto;line-height:1.7">
      <nav style="font-size:13px;margin-bottom:24px">
        <a href="/" style="color:#7c4dff;text-decoration:none">Fantasy Draft Pros</a>
        <span style="color:#6b6580"> / </span>
        <span style="color:#9b96b8">${escapeHtml(meta.h1)}</span>
      </nav>
      <h1 style="color:#7c4dff;font-size:32px;margin:0 0 12px 0">${escapeHtml(meta.h1)}</h1>
      <p style="font-size:13px;color:#9b96b8;margin-bottom:24px" id="updated-date"></p>
      ${content}
    </div>
  </div>
  <script type="application/ld+json">
    ${generateBreadcrumbSchema(breadcrumbs)}
  </script>
  <script type="application/ld+json">
    ${generateOrganizationSchema()}
  </script>
  ${appScripts}
</body>
</html>`
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

/**
 * Find a route from registry by slug
 */
export function findRouteBySlug(slug: string): SeoRoute | undefined {
  return SEO_ROUTES.find(r => r.slug === slug)
}

/**
 * Generate SEO footer HTML with organized links
 */
export function generateSeoFooter(): string {
  const groups = ['Primary', 'Rankings', 'Players', 'Resources', 'Guides', 'About']
  const groupedRoutes = new Map<string, SeoRoute[]>()

  for (const group of groups) {
    const routes = SEO_ROUTES.filter(r => r.navGroup === group)
    if (routes.length > 0) {
      groupedRoutes.set(group, routes)
    }
  }

  let footer = '<footer style="background:#1a1825;border-top:1px solid #3a3649;margin-top:60px;padding:40px 20px">'
  footer += '<div style="max-width:1200px;margin:0 auto">'

  for (const [group, routes] of groupedRoutes) {
    footer += `<section style="margin-bottom:40px">`
    footer += `<h3 style="color:#7c4dff;font-size:14px;margin:0 0 12px 0;text-transform:uppercase">${group}</h3>`
    footer += `<ul style="list-style:none;padding:0;margin:0">`
    for (const route of routes) {
      footer += `<li style="margin-bottom:8px"><a href="${route.slug}" style="color:#9b96b8;text-decoration:none;font-size:13px">${escapeHtml(route.title)}</a></li>`
    }
    footer += `</ul>`
    footer += `</section>`
  }

  footer += '</div></footer>'
  return footer
}
