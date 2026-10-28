/**
 * Video Schema Injection (Phase 19.2)
 *
 * Injects video metadata and VideoObject schema into guide pages
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import { generateVideoMetadata, generateVideoSchema } from './seo-video-schema'

export interface VideoInjectionResult {
  pagesProcessed: number
  videoSchemasAdded: number
  videoBlocksAdded: number
}

export function injectVideoSchema(distDir: string): VideoInjectionResult {
  let pagesProcessed = 0
  let videoSchemasAdded = 0
  let videoBlocksAdded = 0

  const videos = generateVideoMetadata()

  // Map guide pages to related videos
  const videoMap: Record<string, VideoMetadata> = {
    'trade-calculator': videos[0],
    'rankings': videos[1],
    'superflex': videos[2],
    'te-premium': videos[3],
    'rebuild': videos[4],
  }

  function walkAndInject(dir: string, depth: number = 0): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = resolve(dir, entry.name)
        const normalizedPath = fullPath.replace(/\\/g, '/')

        if (entry.isDirectory() && depth < 3) {
          walkAndInject(fullPath, depth + 1)
        } else if (entry.isFile() && entry.name === 'index.html') {
          pagesProcessed++
          let content = readFileSync(fullPath, 'utf-8')

          // Skip if already has Phase 19.2
          if (content.includes('Phase 19.2')) continue

          // Find matching guide page
          let matchedVideo: VideoMetadata | null = null
          for (const [pattern, video] of Object.entries(videoMap)) {
            if (normalizedPath.includes(pattern)) {
              matchedVideo = video
              break
            }
          }

          if (matchedVideo) {
            // Add VideoObject schema to head
            const videoSchema = generateVideoSchema(matchedVideo)
            const schemaTag = `  <script type="application/ld+json">\n${videoSchema}\n</script>\n  <!-- Phase 19.2: Video Schema Injection -->\n  `

            if (content.includes('</head>')) {
              content = content.replace('</head>', `  ${schemaTag}</head>`)
              videoSchemasAdded++
            }

            // Add video promotion block to body
            const videoBlock = `<div style="margin-top:40px;padding:20px;background:linear-gradient(135deg,#7c4dff,#6a3de8);border-radius:8px;text-align:center;color:#fff">
    <h3 style="margin-top:0;font-size:16px">Video Tutorial</h3>
    <p style="margin:12px 0;font-size:14px">${matchedVideo.description}</p>
    <div style="margin-top:16px;display:flex;justify-content:center;gap:12px;flex-wrap:wrap">
      <a href="${matchedVideo.url}" style="display:inline-block;background:#fff;color:#7c4dff;padding:10px 20px;border-radius:4px;text-decoration:none;font-weight:700;font-size:13px">Watch Tutorial →</a>
      <span style="display:inline-block;background:rgba(255,255,255,0.2);color:#fff;padding:10px 16px;border-radius:4px;font-size:12px">Duration: ${matchedVideo.duration.replace('PT', '').replace('M', 'min ').replace('S', 'sec')}</span>
    </div>
    <!-- Phase 19.2: Video Promotion Block -->
  </div>`

            if (content.includes('</body>')) {
              content = content.replace('</body>', `\n  ${videoBlock}\n  </body>`)
              videoBlocksAdded++
            }

            writeFileSync(fullPath, content)
          }
        }
      }
    } catch (e) {
      // Skip errors
    }
  }

  walkAndInject(distDir)
  return { pagesProcessed, videoSchemasAdded, videoBlocksAdded }
}
