/**
 * Reusable server component for injecting JSON-LD structured data.
 *
 * Usage:
 *   import { JsonLd } from '@/components/JsonLd';
 *
 *   export default function Homepage() {
 *     return (
 *       <>
 *         <JsonLd data={{
 *           '@context': 'https://schema.org',
 *           '@type': 'Organization',
 *           name: 'Mythie',
 *           url: 'https://mythie.app',
 *         }} />
 *         <main>...</main>
 *       </>
 *     );
 *   }
 *
 * For an array of schemas (e.g., Organization + WebSite + BreadcrumbList on the
 * homepage), pass an array. The component will emit one <script> per object.
 */

type JsonLdValue = Record<string, unknown> | Record<string, unknown>[];

export function JsonLd({ data }: { data: JsonLdValue }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          // dangerouslySetInnerHTML is the canonical pattern for inline JSON-LD.
          // Pre-validate the data shape; never pass user-supplied data unsanitized.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  );
}
