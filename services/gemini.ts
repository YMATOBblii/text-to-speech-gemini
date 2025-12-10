import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName, StyleDefinition } from "../types";

export const PRESET_STYLES: StyleDefinition[] = [
  { 
    id: 'calm',
    name: 'Спокойный', 
    prompt: 'Говори медленным и спокойным тоном, как ведущий медитации. Делай мягкие паузы между фразами. Не добавляй ничего от себя.' 
  },
  { 
    id: 'friendly',
    name: 'Дружелюбный', 
    prompt: 'Говори тёплым и дружелюбным голосом, как ведущий подкаста. Темп средний. Не добавляй ничего от себя.' 
  },
  { 
    id: 'joyful',
    name: 'Радостный', 
    prompt: 'Говори радостным и энергичным голосом, как блогер, который делится хорошей новостью. Не добавляй ничего от себя.' 
  },
  { 
    id: 'dramatic',
    name: 'Драматичный', 
    prompt: 'Говори драматичным, напряжённым голосом, как диктор трейлера к фильму. Делай паузы и наращивай напряжение.' 
  },
  { 
    id: 'asmr',
    name: 'Медленный ASMR', 
    prompt: 'Говори очень медленно и мягко, почти шёпотом, как в ASMR. Делай длинные паузы между фразами. Не добавляй ничего от себя.' 
  },
  { 
    id: 'angry',
    name: 'Злой', 
    prompt: ' [angry] Говори резким, раздражённым голосом, как будто тебе надоело повторять одно и то же. Не добавляй ничего от себя.' 
  },
  { 
    id: 'sad',
    name: 'Грустный', 
    prompt: ' [sad] Говори тихим, немного грустным голосом, будто вспоминаешь что-то печальное. Не добавляй ничего от себя.' 
  },
  { 
    id: 'tired',
    name: 'Уставший', 
    prompt: ' Говори усталым, немного безразличным голосом, почти монотонно. Не добавляй ничего от себя.' 
  },
  { 
    id: 'sarcastic',
    name: 'Саркастичный', 
    prompt: ' [sarcastic] Говори с лёгкой насмешкой, саркастическим тоном, как будто шутишь, но с иронией. Не добавляй ничего от себя.' 
  },
  { 
    id: 'news',
    name: 'Деловой диктор новостей', 
    prompt: ' Говори чётким, официальным голосом диктора новостей. Темп средний, произношение максимально разборчивое. Не добавляй ничего от себя.' 
  },
  { 
    id: 'childish',
    name: 'Детский / игривый', 
    prompt: ' [excited] Говори радостным, игривым голосом, как ребёнок, который рассказывает что-то интересное. Не добавляй ничего от себя.' 
  }
];

export const generateSpeech = async (
  text: string,
  voice: VoiceName,
  stylePrompt: string
): Promise<string> => {
  if (!import.meta.env.VITE_API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ import.meta.env.VITE_API_KEY });
  
  // NOTE: Using systemInstruction with responseModalities: ['AUDIO'] causes 500 errors.
  // We place instructions in the content but separate them clearly.
  const fullPrompt = `
${stylePrompt}

Do not read the instructions above.
Read the following text aloud:

${text}
`.trim();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: fullPrompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
        // NOTE: The current Gemini 2.5 Flash TTS model / SDK does not support an explicit 
        // 'speakingRate' or 'speed' parameter in the configuration. 
        // Speed control is currently achieved only through text prompt instructions.
      },
    });

    if (!response.candidates || response.candidates.length === 0) {
      // Check for safety blocks
      if (response.promptFeedback?.blockReason) {
         throw new Error(`Generation blocked by safety settings: ${response.promptFeedback.blockReason}`);
      }
      throw new Error("No candidates returned from Gemini. The request might have been filtered.");
    }

    const audioData = response.candidates[0].content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
      console.error("Gemini Response structure unexpected:", JSON.stringify(response, null, 2));
      throw new Error("No audio data received from Gemini (candidates existed but lacked inlineData).");
    }

    return audioData;
  } catch (error: any) {
    console.error("Error generating speech:", error);
    // Preserve the original error message if possible
    throw new Error(error.message || "Unknown error generating speech.");
  }
};
