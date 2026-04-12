import { GoogleGenAI } from "@google/genai";
import { STATIC_PLANT_ADVICE, getSeasonTasks } from "../src/lib/staticData";

// Функція для отримання ключа з localStorage або з environment (як запасний варіант)
const getApiKey = () => {
  const storedKey = localStorage.getItem('custom_gemini_api_key');
  if (storedKey && storedKey.trim() !== '') {
    return storedKey;
  }
  return process.env.GEMINI_API_KEY;
};

const formatGeminiError = (error: any): string => {
  const errStr = typeof error === 'string' ? error : JSON.stringify(error, Object.getOwnPropertyNames(error));
  
  if (errStr.includes("API_KEY_INVALID") || errStr.includes("API key not valid")) {
    return "API ключ недійсний. Будь ласка, перевірте його в Налаштуваннях (або згенеруйте новий).";
  }
  if (errStr.includes("PERMISSION_DENIED") || errStr.includes("unregistered callers")) {
    return "Доступ заборонено. Будь ласка, додайте власний API ключ у Налаштуваннях.";
  }
  
  return error?.message || "Невідома помилка ШІ. Перевірте API ключ у налаштуваннях.";
};

const MODEL_NAME = "gemini-3-flash-preview";

export async function getGardeningAdvice(plantName: string, variety: string, location: string) {
  const apiKey = getApiKey();
  
  const fallbackToStatic = () => {
    const query = `${plantName} ${variety}`.toLowerCase();
    const matchKey = Object.keys(STATIC_PLANT_ADVICE).find(k => query.includes(k));
    if (matchKey) {
      return { data: STATIC_PLANT_ADVICE[matchKey], error: null, source: 'static' };
    }
    return { 
      data: null, 
      error: "Цієї рослини поки немає в нашому базовому довіднику. Додайте дійсний API ключ у налаштуваннях, щоб отримати поради від ШІ.", 
      source: 'static' 
    };
  };

  if (!apiKey || apiKey === "undefined") {
    return fallbackToStatic();
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `Виступай як професійний український агроном та садівник. 
Користувач має рослину "${plantName}" сорту "${variety}" у місті/регіоні "${location}".
Надай інформацію про догляд саме за цією рослиною. Будь уважним: якщо сорт "${variety}" зустрічається у різних видів рослин, надавай поради саме для "${plantName}".
Відповідь має бути у форматі JSON з полями:
- sections: масив об'єктів { title: string, content: string }
- secretTip: рядок з секретною порадою.
- products: масив об'єктів { name: string, description: string, usage: string, safety: string } для всіх препаратів, згаданих у тексті порад.

Пиши простою мовою, зрозумілою для літніх людей. Використовуй українську мову.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "";
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonToParse = jsonMatch ? jsonMatch[0] : text;
      return { data: JSON.parse(jsonToParse), error: null, source: 'ai' };
    } catch (e) {
      console.error("Advice JSON Parse Error:", e, text);
      return { data: null, error: "Помилка обробки даних від ШІ", source: 'ai' };
    }
  } catch (error: any) {
    console.error("Detailed Gemini Error (Advice):", error);
    const staticResult = fallbackToStatic();
    if (staticResult.data) {
      return staticResult; // Fallback successful
    }
    return { data: null, error: formatGeminiError(error), source: 'ai' };
  }
}

export async function getDailyTasks(location: string, date: string) {
  const apiKey = getApiKey();
  
  const fallbackToStatic = () => {
    return { data: getSeasonTasks(date), error: null, source: 'static' };
  };

  if (!apiKey || apiKey === "undefined") {
    return fallbackToStatic();
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Виступай як професійний український садівник. 
Сьогодні ${date}, локація: ${location}.
Надай список з 3-4 найважливіших справ у саду або на городі на сьогодні для цього регіону.
Відповідь має бути у форматі JSON з полями:
- tasks: масив об'єктів { title: string, description: string }
- warning: рядок з попередженням (наприклад, про заморозки), якщо є.

Пиши зрозумілою мовою, без зірочок та лапок.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "";
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonToParse = jsonMatch ? jsonMatch[0] : text;
      return { data: JSON.parse(jsonToParse), error: null, source: 'ai' };
    } catch (e) {
      console.error("Tasks JSON Parse Error:", e, text);
      return { data: null, error: "Помилка обробки завдань", source: 'ai' };
    }
  } catch (error: any) {
    console.error("Detailed Gemini Error (Tasks):", error);
    return fallbackToStatic(); // Always fallback to static tasks on error
  }
}
