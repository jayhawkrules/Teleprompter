export interface GeneratedContent {
  script: string;
  caption: string;
}

// AI generation is handled server-side via /api/generate-script
// This keeps the Gemini API key secure (server env var only)
// and avoids VITE_ prefix env var issues in the browser build.
export async function generateIndustryScript(customTopic?: string): Promise<GeneratedContent> {
  const res = await fetch('/api/generate-script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: customTopic || '' }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Server error ${res.status}`);
  }

  const data = await res.json();
  return {
    script: data.script || 'Failed to generate script.',
    caption: data.caption || 'Failed to generate caption.',
  };
}
