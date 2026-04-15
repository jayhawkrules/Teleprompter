import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
       The script should be engaging, punchy, and sound like a knowledgeable industry insider sharing a quick update.
    2. Write a catchy TikTok caption for this video, including relevant hashtags.
    
    Return the result as a JSON object with "script" and "caption" fields.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
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
