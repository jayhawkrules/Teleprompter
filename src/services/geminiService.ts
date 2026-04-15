import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export interface GeneratedContent {
  script: string;
  caption: string;
}

export async function generateIndustryScript(customTopic?: string): Promise<GeneratedContent> {
  const topicContext = customTopic 
    ? `Specifically focus on this topic: "${customTopic}". Research the latest news, trends, and industry sentiment regarding this.`
    : `Search the current television industry trends, specifically focusing on music documentaries, concert films, and reality TV.`;

  const prompt = `
    ${topicContext}
    
    Find out what is currently trending and what is in the "ethos" that excites both industry professionals and fans. 
    Include a mix of fun insights and hard truths about where the industry is heading.
    
    Based on this research:
    1. Write a 30-60 second teleprompter script for a vertical video (TikTok/Reels style). 
       The tone must be extremely conversational, relatable, and authentic—like you're just talking out loud to a friend or your followers. 
       Avoid a "news anchor," "punchy broadcast," or "corporate" voice. 
       Use natural phrasing, casual transitions (e.g., "So, I was just thinking...", "Honestly, it's kind of wild that..."), and keep it grounded. 
       It should feel like a real person sharing a genuine thought or a "hot take" in a relaxed way, not a scripted news update.
    2. Write a catchy TikTok caption for this video, including relevant hashtags.
    
    Return the result as a JSON object with "script" and "caption" fields.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            script: { type: Type.STRING },
            caption: { type: Type.STRING },
          },
          required: ["script", "caption"],
        },
      },
    });

    const result = JSON.parse(response.text || "{}");
    return {
      script: result.script || "Failed to generate script.",
      caption: result.caption || "Failed to generate caption.",
    };
  } catch (error) {
    console.error("Error generating script:", error);
    throw error;
  }
}
