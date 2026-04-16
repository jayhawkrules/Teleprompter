// ─── AI Script Generation ─────────────────────────────────────────────────────
app.post('/api/generate-script', scriptRateLimit, async (req, res) => {
  if (!GEMINI_API_KEY) {
    console.error('[Gemini] No API key found.');
    return res.status(500).json({ error: 'AI service not configured.' });
  }

  const { topic } = req.body;
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  // Rotating angles so each generation feels fresh
  const angles = [
    'a hot take or unpopular opinion',
    'a surprising industry stat or fun fact most people don\'t know',
    'something that\'s been buzzing in the news this week',
    'a behind-the-scenes reality that audiences never see',
    'a prediction about where things are heading',
    'a comparison between how things used to be vs now',
    'something that genuinely surprised you recently',
    'a question you\'ve been curious about and want your audience\'s thoughts on',
  ];
  const angle = angles[Math.floor(Math.random() * angles.length)];

  const topicContext = topic
    ? `The topic is: "${topic}".`
    : `Pick a genuinely interesting, specific angle on the film, TV, or entertainment industry — streaming, documentaries, music films, reality TV, Hollywood business, or content creation. Be specific, not generic.`;

  const prompt = `
You are writing a short TikTok script for a film and TV industry professional talking directly to their followers.

${topicContext}

Angle to use: ${angle}

Rules:
- Tone: completely conversational, like you're catching up with a friend. Off the cuff, not scripted-sounding.
- Use natural openers like "OK so I was just reading...", "Honestly this caught me off guard...", "Can we talk about...", "I've been thinking about this a lot lately..."
- Include a genuine question for the audience at the end — something you actually want their opinion on.
- NO bullet points, NO headers, NO lists. Just flowing spoken sentences.
- Length: 45–65 seconds when spoken aloud (roughly 120–160 words).
- Sound like a real person updating their followers, NOT a news anchor or press release.
- Include one specific detail, stat, name, or example to make it feel real and current.

Also write a TikTok caption:
- Punchy opening line (no emoji at start)
- Conversational, not corporate
- 5–8 relevant hashtags at the end

Return ONLY valid JSON: { "script": "...", "caption": "..." }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: { script: { type: Type.STRING }, caption: { type: Type.STRING } },
          required: ['script', 'caption'],
        },
      },
    });

    const rawText = typeof response.text === 'function' ? response.text() : response.text;
    const result  = JSON.parse(rawText || '{}');
    console.log('[Gemini] Script generated successfully');
    res.json({
      script:  result.script  || 'Failed to generate script.',
      caption: result.caption || 'Failed to generate caption.',
    });
  } catch (error: any) {
    console.error('[Gemini] Error:', error?.message ?? String(error));
    res.status(500).json({ error: 'Failed to generate script: ' + (error.message || String(error)) });
  }
});
