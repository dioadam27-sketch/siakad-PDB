
import { GoogleGenAI } from "@google/genai";
import { Course } from "./types.ts";

export const getSmartScheduleAdvice = async (courses: Course[], query: string) => {
  if (!process.env.API_KEY) return "API Key tidak dikonfigurasi.";

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an academic scheduling expert for PDB (Pusat Dasar Bersama). 
      Here is the current course list for a lecturer: ${JSON.stringify(courses)}. 
      The lecturer is asking: "${query}". 
      Please provide a concise, professional advice in Indonesian. 
      Focus on time efficiency, room availability, and typical university hours (08:00-17:00).`,
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
