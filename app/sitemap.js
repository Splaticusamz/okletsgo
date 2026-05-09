export default function sitemap() {
  const now = new Date();
  return [
    {
      url: 'https://okletsgo.ca',
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
  ];
}
