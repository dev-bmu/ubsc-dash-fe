import type { MetadataRoute } from 'next'

// Sistem internal PT BMU — larang SEMUA crawler (Google, Bing, AI: GPTBot,
// ClaudeBot, CCBot, dll.) merayapi & mengindeks. Disallow: / memblokir total.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/'
    }
  }
}
