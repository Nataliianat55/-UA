import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getGardeningAdvice(variety: string, location: string) {
  const prompt = `Виступай як професійний український агроном та садівник. 
Користувач має рослину сорту "${variety}" у місті/регіоні "${location}".
Надай інформацію про догляд. 
Відповідь має бути у форматі JSON з полями:
- sections: масив об'єктів { title: string, content: string }
- secretTip: рядок з секретною порадою.
- products: масив об'єктів { name: string, description: string, usage: string, safety: string } для всіх препаратів, згаданих у тексті порад.

Пиши простою мовою, зрозумілою для літніх людей. Використовуй українську мову.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING }
                },
                required: ["title", "content"]
              }
            },
            secretTip: { type: Type.STRING },
            products: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  usage: { type: Type.STRING },
                  safety: { type: Type.STRING }
                },
                required: ["name", "description", "usage", "safety"]
              }
            }
          },
          required: ["sections", "secretTip", "products"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error fetching gardening advice:", error);
    return null;
  }
}

export async function getDailyTasks(location: string, date: string) {
  const prompt = `Виступай як професійний український садівник. 
Сьогодні ${date}, локація: ${location}.
Надай список з 3-4 найважливіших справ у саду або на городі на сьогодні для цього регіону.
Відповідь має бути у форматі JSON з полями:
- tasks: масив об'єктів { title: string, description: string }
- warning: рядок з попередженням (наприклад, про заморозки), якщо є.

Пиши зрозумілою мовою, без зірочок та лапок.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["title", "description"]
              }
            },
            warning: { type: Type.STRING }
          },
          required: ["tasks"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error fetching daily tasks:", error);
    return null;
  }
}
