import React, { useState, useRef } from 'react';
import { geminiService } from '../services/geminiService';
import { ExtractedOpportunity, Patient, LifecycleStatus } from '../types';
import { useData } from '../contexts/DataContext';
import { MessageSquareText, Image as ImageIcon, Video, Loader2, CheckCircle, AlertCircle, ArrowRight, Sparkles, Stethoscope, ArrowLeft } from 'lucide-react';

// Refactored CaptureMethodCard for clarity and better UX
const CaptureMethodCard: React.FC<{
  icon: React.FC<any>,
  title: string,
  description: string,
  onClick: () => void,
  pro?: boolean
}> = ({ icon: Icon, title, description, onClick, pro = false }) => (
  <button
    onClick={onClick}
    className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 text-left w-full flex items-center gap-6 hover:border-medical-500 dark:hover:border-medical-400 hover:shadow-lg transition-all duration-200 group"
  >
    <div className="p-4 bg-medical-50 dark:bg-medical-900/30 rounded-2xl text-medical-500 dark:text-medical-400">
      <Icon size={32} />
    </div>
    <div className="flex-1">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-3">
        {title}
        {pro && <span className="text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-1 rounded-full">PRO</span>}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
    </div>
    <ArrowRight size={20} className="text-slate-400 group-hover:text-medical-500 transition-colors flex-shrink-0" />
  </button>
);


export const CaptureView: React.FC<{ onComplete: () => void; setActiveTab: (tab: string) => void }> = ({ onComplete, setActiveTab }) => {
  const { addPatient } = useData();
  const [selectedMethod, setSelectedMethod] = useState<'text' | 'image' | 'video' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedOpportunity | null>(null);
  const [inputText, setInputText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null); // State for uploaded file name
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setExtractedData(null);

    try {
      let result: ExtractedOpportunity;
      if (selectedMethod === 'text') {
        if (!inputText.trim()) throw new Error("Por favor ingresa algún texto.");
        result = await geminiService.analyzeText(inputText);
      } else {
        const file = fileInputRef.current?.files?.[0];
        if (!file) throw new Error(`Por favor selecciona un archivo de ${selectedMethod === 'image' ? 'imagen' : 'video'}.`);
        
        if (file.size > 20 * 1024 * 1024) throw new Error("Archivo demasiado grande para esta demo (max 20MB).");

        const base64 = await fileToBase64(file);
        const mimeType = file.type;

        if (selectedMethod === 'image') {
          result = await geminiService.analyzeImage(base64, mimeType);
        } else {
          result = await geminiService.analyzeVideo(base64, mimeType);
        }
      }
      setExtractedData(result);
    } catch (e: any) {
      setError(e.message || "Falló el análisis. Por favor verifica tu API key.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!extractedData) return;
    const newPatient: Patient = {
      id: crypto.randomUUID(),
      name: extractedData.name || 'Prospecto Desconocido',
      phone: extractedData.phone || undefined,
      email: extractedData.email || undefined,
      lifecycle_status: extractedData.intent === 'SCHEDULE_APPOINTMENT' ? LifecycleStatus.PROSPECT : LifecycleStatus.OPPORTUNITY,
      source: `Captura IA (${selectedMethod === 'text' ? 'Texto' : selectedMethod === 'image' ? 'Imagen' : 'Video'})`,
      notes: extractedData.summary,
      created_at: new Date().toISOString(),
      last_interaction: new Date().toISOString(),
    };
    addPatient(newPatient);
    onComplete();
  };
  
  const resetState = () => {
    setSelectedMethod(null);
    setExtractedData(null);
    setError(null);
    setInputText('');
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
           const base64 = reader.result.split(',')[1];
           resolve(base64);
        } else {
          reject(new Error("Error al leer el archivo"));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const renderSelectedMethodUI = () => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 p-6 animate-in fade-in">
        <button onClick={resetState} className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-medical-600 dark:hover:text-medical-400 mb-4">
            <ArrowLeft size={16} /> Volver a métodos
        </button>
      {selectedMethod === 'text' ? (
        <div className="relative w-full">
          <MessageSquareText className="absolute top-4 left-4 text-slate-400 dark:text-slate-500 pointer-events-none" size={20} />
          <textarea
            className="w-full h-48 pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-medical-500 dark:focus:border-medical-500 outline-none resize-none dark:text-white transition-colors"
            placeholder="Pega el contenido de WhatsApp, Email o tus notas aquí para que la IA extraiga los datos del paciente..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 text-center">
          <input 
            type="file" 
            ref={fileInputRef}
            accept={selectedMethod === 'image' ? 'image/*' : 'video/*'}
            className="hidden" 
            onChange={(e) => {
                setError(null);
                setFileName(e.target.files?.[0]?.name ?? null);
            }}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 bg-medical-100 dark:bg-medical-900/50 text-medical-600 dark:text-medical-400 rounded-full flex items-center justify-center mb-4"
          >
            {selectedMethod === 'image' ? <ImageIcon size={32} /> : <Video size={32} />}
          </button>
          {fileName ? (
            <>
              <p className="text-slate-900 dark:text-white font-medium break-all">{fileName}</p>
              <button onClick={() => fileInputRef.current?.click()} className="text-sm text-medical-600 dark:text-medical-400 hover:underline mt-2">
                Cambiar archivo
              </button>
            </>
          ) : (
            <>
              <p className="text-slate-900 dark:text-white font-medium">
                Haz clic para subir {selectedMethod === 'image' ? 'una captura' : 'un video'}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {selectedMethod === 'video' ? 'MP4, WebM (Máx 20MB)' : 'PNG, JPG, WEBP'}
              </p>
            </>
          )}
        </div>
      )}
      {selectedMethod === 'video' && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-xl text-sm flex items-start gap-3">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Nota sobre el Análisis de Video (Gemini Pro)</p>
            <p className="mt-1">
              Este proceso puede tardar más tiempo y tener un costo de API superior en comparación con el análisis de texto o imágenes.
            </p>
          </div>
        </div>
      )}
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="mt-6 w-full bg-medical-500 hover:bg-medical-600 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <><Loader2 className="animate-spin" /> Analizando con Gemini...</>
        ) : (
          <><Sparkles size={18} /> Analizar {selectedMethod === 'video' ? '(Gemini Pro)' : '(Gemini Flash)'}</>
        )}
      </button>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-3">
          <Sparkles className="text-medical-500" /> Captura de Oportunidades con IA
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl mx-auto">
          Seleccione el origen de la oportunidad. Gemini extraerá los detalles del paciente automáticamente.
        </p>
      </header>

      {!selectedMethod ? (
        <div className="space-y-4 animate-in fade-in">
          <CaptureMethodCard
            icon={MessageSquareText}
            title="Analizar Texto"
            description="Pega conversaciones de WhatsApp, email o tus notas para extraer datos."
            onClick={() => setSelectedMethod('text')}
          />
          <CaptureMethodCard
            icon={ImageIcon}
            title="Analizar Captura de Pantalla"
            description="Sube una imagen de Instagram, Facebook Messenger u otra fuente."
            onClick={() => setSelectedMethod('image')}
          />
          <CaptureMethodCard
            icon={Video}
            title="Analizar Grabación de Video"
            description="Analiza grabaciones de pantalla de interacciones con pacientes."
            onClick={() => setSelectedMethod('video')}
            pro
          />
          <CaptureMethodCard
            icon={Stethoscope}
            title="Usar Asistente de Voz"
            description="Habla con el Asistente IA para añadir pacientes y notas de voz."
            onClick={() => setActiveTab('assistant')}
          />
        </div>
      ) : (
        renderSelectedMethodUI()
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3 animate-in fade-in">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      {extractedData && (
        <div className="mt-8 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <CheckCircle size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100 mb-2">Análisis Completo</h3>
              <div className="space-y-2 mb-4 text-emerald-800 dark:text-emerald-200">
                <p><strong>Nombre:</strong> {extractedData.name || 'No encontrado'}</p>
                <p><strong>Teléfono:</strong> {extractedData.phone || 'No encontrado'}</p>
                <p><strong>Intención:</strong> {extractedData.intent || 'Desconocida'}</p>
                <p><strong>Resumen:</strong> {extractedData.summary}</p>
              </div>
              <button
                onClick={handleSave}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg flex items-center gap-2 transition-colors"
              >
                Añadir al Flujo <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};