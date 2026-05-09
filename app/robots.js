export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'],
    },
    sitemap: 'https://okletsgo.ca/sitemap.xml',
    host: 'https://okletsgo.ca',
  };
}
