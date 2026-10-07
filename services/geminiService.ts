import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ExtractedOpportunity } from "../types";

class GeminiService {
  private ai: GoogleGenAI;
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.API_KEY;
    if (this.apiKey) {
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    } else {
      console.error("API_KEY is missing from environment variables.");
      // Fallback or error handling should be implemented in the UI
      this.ai = new GoogleGenAI({ apiKey: 'DUMMY_KEY' }); 
    }
  }

  private checkApiKey() {
    if (!this.apiKey) throw new Error("API Key no configurada. Por favor establece process.env.API_KEY.");
  }

  // 1. Image Understanding (Flash)
  async analyzeImage(base64Image: string, mimeType: string): Promise<ExtractedOpportunity> {
    this.checkApiKey();
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: "Analiza esta captura de pantalla de una interacción con un paciente. Extrae el nombre del paciente, número de teléfono, email si está disponible, y su intención principal (usa exactamente uno de estos valores: SCHEDULE_APPOINTMENT, NEW_LEAD_INQUIRY, BILLING_QUESTION, OTHER). También proporciona un breve resumen de 1 oración en español sobre su necesidad." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: this.getOpportunitySchema(),
      }
    });
    return JSON.parse(response.text || '{}');
  }

  // 2. Text Understanding (Flash)
  async analyzeText(text: string): Promise<ExtractedOpportunity> {
    this.checkApiKey();
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analiza este texto de una interacción con un paciente: "${text}". Extrae el nombre, teléfono, email, intención (usa exactamente uno de estos valores: SCHEDULE_APPOINTMENT, NEW_LEAD_INQUIRY, BILLING_QUESTION, OTHER), y un resumen en español.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: this.getOpportunitySchema(),
      }
    });
    return JSON.parse(response.text || '{}');
  }

  // 3. Video Understanding (Pro)
  async analyzeVideo(base64Video: string, mimeType: string): Promise<ExtractedOpportunity> {
    this.checkApiKey();
    // Note: For very large videos, real-world apps would use File API upload. 
    // For this demo, we assume reasonably sized clips that fit in base64/memory.
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-pro-api',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Video } },
          { text: "Mira esta grabación de pantalla de una interacción con un paciente. Extrae los detalles de contacto del paciente (nombre, teléfono, email) mostrados en pantalla, determina su intención (SCHEDULE_APPOINTMENT, NEW_LEAD_INQUIRY, BILLING_QUESTION, OTHER), y resume la interacción en español." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: this.getOpportunitySchema(),
      }
    });
    return JSON.parse(response.text || '{}');
  }

  // 4. Grounded Search for complex queries
  async askComplexQuery(query: string, patientContext?: string): Promise<{ text: string; sources: { uri: string; title: string }[] }> {
    this.checkApiKey();
    const contextStr = patientContext ? `Contexto sobre el paciente:\n${patientContext}\n\n` : '';
    
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${contextStr}Como un asistente clínico dental altamente experimentado, por favor responde a esta consulta en español, utilizando información web actualizada para asegurar la precisión:\n${query}`,
      config: {
        tools: [{googleSearch: {}}],
      }
    });
    
    const text = response.text || "No pude generar una respuesta.";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const sources = groundingChunks
      .filter((chunk: any) => chunk.web && chunk.web.uri)
      .map((chunk: any) => ({ uri: chunk.web.uri, title: chunk.web.title || chunk.web.uri }))
      .filter((source: any, index: number, self: any[]) => 
         index === self.findIndex((s) => s.uri === source.uri)
      );

    return { text, sources };
  }
  
  /**
   * Decodes raw PCM audio data from Gemini TTS into a playable AudioBuffer.
   * The browser's native `decodeAudioData` fails because it expects a file header (e.g., WAV),
   * which is not present in the raw PCM stream.
   */
  private async _decodePcmToAudioBuffer(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
    const sampleRate = 24000; // Gemini TTS standard sample rate
    const numChannels = 1;     // Gemini TTS is mono
    
    // The raw data is 16-bit PCM, so we need to create a view of the buffer as Int16Array.
    // Each sample is 2 bytes, so we divide the total byte length by 2.
    const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
    
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        // Normalize the 16-bit signed integer to a float between -1.0 and 1.0
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  // 5. Text-to-Speech (Flash TTS)
  async speakText(text: string): Promise<AudioBuffer | null> {
    this.checkApiKey();
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: { parts: [{ text }] },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          }
        }
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) return null;

      // Decode base64 to raw bytes
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
      }

      // Decode raw PCM data into an AudioBuffer using our custom decoder
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      return await this._decodePcmToAudioBuffer(bytes, audioContext);

    } catch (e) {
      console.error("TTS Error:", e);
      return null;
    }
  }

  private getOpportunitySchema() {
    return {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, nullable: true },
        phone: { type: Type.STRING, nullable: true },
        email: { type: Type.STRING, nullable: true },
        intent: { type: Type.STRING, enum: ['SCHEDULE_APPOINTMENT', 'NEW_LEAD_INQUIRY', 'BILLING_QUESTION', 'OTHER'], nullable: true },
        summary: { type: Type.STRING, description: "Resumen en español" },
        confidence: { type: Type.NUMBER, description: "Confidence score between 0 and 1" }
      },
      required: ['summary', 'confidence']
    };
  }
}

export const geminiService = new GeminiService();