
import { GoogleGenAI } from "@google/genai";
import { Course } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSmartScheduleAdvice = async (courses: Course[], query: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an academic scheduling expert. Here is the current course list for a lecturer: ${JSON.stringify(courses)}. 
      The lecturer is asking: "${query}". 
      Please provide a concise, professional advice in Indonesian. If they are asking for free slots or suggestions, consider typical university hours (08:00-17:00).`,
      config: {
        temperature: 0.7,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Maaf, sistem AI sedang tidak tersedia saat ini. Silakan coba lagi nanti.";
  }
};
