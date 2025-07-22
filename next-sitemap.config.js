/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://sei-portfolio-ai.vercel.app',
  generateRobotsText: true,
  exclude: [
    '/api/*',
    '/admin/*',
    '/debug/*',
    '/test/*',
    '/_next/*',
    '*.json',
    '*.xml'
  ],
  generateIndexSitemap: false,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/debug/',
          '/test/',
          '/_next/',
          '/private/',
        ],
      },
    ],
    additionalSitemaps: [
      'https://sei-portfolio-ai.vercel.app/server-sitemap-index.xml',
    ],
  },
  transform: async (config, path) => {
    // Custom function to transform each path
    const priority = path === '/' ? 1.0 : 
                    path.startsWith('/chat') ? 0.9 : 
                    path.startsWith('/dashboard') ? 0.8 : 0.7;
    
    return {
      loc: path,
      changefreq: path === '/' ? 'daily' : 'weekly',
      priority,
      lastmod: new Date().toISOString(),
    };
  },
};