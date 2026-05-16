import { MetadataRoute } from 'next';

// Routes that should never be indexed or ingested by any crawler — applies
// uniformly to search engines and AI training/retrieval bots.
const NEVER_CRAWL = [
  '/api/',
  '/dashboard/',
  '/admin/',
  '/_next/',
  '/f/',        // Public forms — user content, not ours
  '/book/',     // Per-form booking pages — same reason
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/invite/',
  '/unsubscribe',
];

// AI crawlers we explicitly allow. These scrape for LLM training and live
// retrieval (ChatGPT browsing, Claude search, Perplexity answers). Allowing
// them is the right call for an open-source product that wants to be cited
// in AI answers. To revoke any one: remove it from this list.
const ALLOWED_AI_BOTS = [
  'GPTBot',              // OpenAI training crawler
  'ChatGPT-User',        // OpenAI live browsing (ChatGPT, Bing chat)
  'OAI-SearchBot',       // OpenAI search index
  'ClaudeBot',           // Anthropic training + retrieval
  'Claude-Web',          // Older Anthropic crawler (still in some configs)
  'anthropic-ai',        // Legacy alias
  'PerplexityBot',       // Perplexity answers
  'Perplexity-User',     // Perplexity live retrieval
  'Google-Extended',     // Google's separate AI-training opt
  'Applebot-Extended',   // Apple Intelligence training
  'CCBot',               // Common Crawl — feeds many open models
  'cohere-ai',           // Cohere
  'YouBot',              // You.com
  'Amazonbot',           // Amazon (Alexa/Q answers)
  'Bytespider',          // ByteDance / Doubao / TikTok search
  'Meta-ExternalAgent',  // Meta AI training crawler
  'DuckAssistBot',       // DuckDuckGo assist
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://withforma.io';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: NEVER_CRAWL,
      },
      // Per-bot rules — some AI crawlers only honour rules under their exact
      // UA name. Listing them explicitly removes ambiguity.
      ...ALLOWED_AI_BOTS.map((bot) => ({
        userAgent: bot,
        allow: '/',
        disallow: NEVER_CRAWL,
      })),
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
