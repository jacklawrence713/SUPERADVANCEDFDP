/**
 * International/Multi-Language Foundation (Phase 19.3)
 *
 * Prepares foundation for international expansion with:
 * - hreflang tag structure
 * - Language alternative pages
 * - Geo-targeting strategy
 * - Multi-language schema support
 */

export interface LanguageTarget {
  code: string
  region: string
  name: string
  locale: string
  hrefLang: string
  priority: number
}

/**
 * Define language targets for future expansion
 */
export function getLanguageTargets(): LanguageTarget[] {
  return [
    {
      code: 'en',
      region: 'US',
      name: 'English (US)',
      locale: 'en_US',
      hrefLang: 'en-US',
      priority: 1,
    },
    {
      code: 'en',
      region: 'GB',
      name: 'English (UK)',
      locale: 'en_GB',
      hrefLang: 'en-GB',
      priority: 2,
    },
    {
      code: 'en',
      region: 'CA',
      name: 'English (Canada)',
      locale: 'en_CA',
      hrefLang: 'en-CA',
      priority: 2,
    },
    {
      code: 'es',
      region: 'ES',
      name: 'Spanish (Spain)',
      locale: 'es_ES',
      hrefLang: 'es-ES',
      priority: 3,
    },
    {
      code: 'es',
      region: 'MX',
      name: 'Spanish (Mexico)',
      locale: 'es_MX',
      hrefLang: 'es-MX',
      priority: 3,
    },
    {
      code: 'fr',
      region: 'FR',
      name: 'French (France)',
      locale: 'fr_FR',
      hrefLang: 'fr-FR',
      priority: 3,
    },
  ]
}

/**
 * Generate hreflang tags for current page
 */
export function generateHrefLangTags(currentUrl: string, currentLang: string = 'en-US'): string {
  const languages = getLanguageTargets()
  const tags = languages
    .map((lang) => {
      const url = currentUrl.replace('https://', `https://${lang.hrefLang.toLowerCase()}.`)
      return `  <link rel="alternate" hreflang="${lang.hrefLang}" href="${url}" />`
    })
    .join('\n')

  return tags
}

/**
 * Generate language selector meta tags
 */
export function generateLanguageMeta(currentLang: string = 'en'): string {
  return `  <meta property="og:locale" content="${currentLang}_US" />
  <meta property="og:locale:alternate" content="es_ES" />
  <meta property="og:locale:alternate" content="es_MX" />
  <meta property="og:locale:alternate" content="fr_FR" />`
}

/**
 * Generate multi-language JSON-LD schema
 */
export function generateMultiLanguageSchema(title: string, url: string): string {
  const languages = getLanguageTargets()
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'url': url,
    'name': title,
    'inLanguage': languages.map((l) => l.hrefLang),
    'availableLanguage': languages.map((l) => ({
      '@type': 'Language',
      'name': l.name,
      'alternateName': l.code,
    })),
  })
}

/**
 * Generate language redirect page HTML
 */
export function generateLanguageRedirectHtml(baseUrl: string, targetLanguage: string): string {
  return `<!doctype html>
<html lang="${targetLanguage.split('-')[0]}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redirecting to ${targetLanguage} version...</title>
  <link rel="canonical" href="${baseUrl}" />
  <meta http-equiv="refresh" content="0;url=${baseUrl}" />
  <script>
    // Geo-based language redirect
    const userLang = navigator.language || navigator.userLanguage
    const langMap = {
      'es': 'https://es-ES.fantasydraftpros.com',
      'fr': 'https://fr-FR.fantasydraftpros.com',
    }
    const lang = userLang.split('-')[0]
    if (langMap[lang]) {
      window.location.replace(langMap[lang] + window.location.pathname)
    }
  </script>
</head>
<body>
  <p>Redirecting to ${targetLanguage}...</p>
</body>
</html>`
}

/**
 * Generate language cookie consent for multi-language support
 */
export function generateLanguageCookieScript(): string {
  return `
<script>
  // Language preference cookie
  function setLanguagePreference(lang) {
    document.cookie = "language_preference=" + lang + ";path=/;max-age=" + (365 * 24 * 60 * 60)
    location.reload()
  }

  function getLanguagePreference() {
    const match = document.cookie.match(/language_preference=([^;]+)/)
    return match ? match[1] : null
  }

  // Auto-redirect based on preference or browser language
  const pref = getLanguagePreference()
  if (!pref) {
    const userLang = navigator.language.split('-')[0]
    const langMap = {
      'es': 'es-ES',
      'fr': 'fr-FR',
      'en': 'en-US'
    }
    const targetLang = langMap[userLang] || 'en-US'
    if (targetLang !== 'en-US') {
      // Optional: redirect to language-specific domain
      // window.location.href = 'https://' + targetLang.toLowerCase() + '.fantasydraftpros.com'
    }
  }
</script>
`
}
