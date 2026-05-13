import type { MetadataRoute } from 'next';

// Replace with the target app's data source. Examples:
//   import { getAllPostSlugs } from '@/lib/posts';
//   import { getAllProductSlugs } from '@/lib/products';
async function getAllPostSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  // Stub — replace with real fetch from CMS / DB / filesystem.
  return [];
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static routes — keep this list in sync with the actual app routes.
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,         lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE_URL}/about`,    lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/features`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/pricing`,  lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/blog`,     lastModified: now, changeFrequency: 'daily',   priority: 0.7 },
  ];

  // Dynamic routes — pull from CMS / DB at build time.
  const slugs = await getAllPostSlugs();
  const dynamicRoutes: MetadataRoute.Sitemap = slugs.map((s) => ({
    url: `${SITE_URL}/blog/${s.slug}`,
    lastModified: s.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...dynamicRoutes];
}
