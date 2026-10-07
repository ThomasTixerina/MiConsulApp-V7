import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { Stethoscope, Send, User, Bot, Loader2, Globe, Search } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isThinking?: boolean;
  sources?: { uri: string; title: string }[];
}

export const ThinkingAssistant: React.FC = () => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', text: 'Hola. Soy su asistente clínico avanzado. Hágame preguntas complejas sobre atención al paciente, eficiencia operativa o planificación de tratamientos. Utilizaré Google Search para proporcionar la información más reciente y precisa.' }
  ]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      // Add a temporary "thinking" message
      setMessages(prev => [...prev, { id: 'thinking', role: 'assistant', text: 'Consultando información web actualizada...', isThinking: true }]);
      
      const { text, sources } = await geminiService.askComplexQuery(userMsg.text);
      
      // Replace thinking message with real response
      setMessages(prev => [
        ...prev.filter(m => m.id !== 'thinking'),
        { id: crypto.randomUUID(), role: 'assistant', text, sources }
      ]);
    } catch (error) {
       setMessages(prev => [
        ...prev.filter(m => m.id !== 'thinking'),
        { id: crypto.randomUUID(), role: 'assistant', text: 'Lo siento, encontré un error al realizar la búsqueda. Por favor verifique su configuración de API.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-screen p-6">
      <header className="mb-6 flex-none">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Stethoscope className="text-medical-500" /> Asistente IA
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Impulsado por Gemini 2.5 Flash con Google Search para respuestas actualizadas.
        </p>
      </header>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-none ${
                msg.role === 'user' ? 'bg-slate-200 dark:bg-slate-700' : 'bg-medical-100 dark:bg-medical-900/50 text-medical-600 dark:text-medical-400'
              }`}>
                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className={`max-w-[80%] rounded-2xl p-4 ${
                msg.role === 'user' 
                  ? 'bg-medical-500 text-white' 
                  : msg.isThinking 
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
              }`}>
                {msg.isThinking ? (
                   <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                     <Search size={18} className="animate-pulse" />
                     <span className="font-medium">Buscando en la web...</span>
                   </div>
                ) : (
                  <>
                    <div className="prose dark:prose-invert text-sm max-w-none whitespace-pre-wrap">
                      {msg.text}
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Fuentes:</h4>
                        <ul className="space-y-1">
                          {msg.sources.map((source, index) => (
                            <li key={index} className="flex items-start">
                              <Globe size={12} className="mr-2 mt-1 text-slate-400 flex-shrink-0" />
                              <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-medical-600 dark:text-medical-400 hover:underline break-all">
                                {source.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex-none">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej., '¿Cuáles son los últimos avances en materiales para implantes dentales?'"
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 flex items-center justify-center disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};