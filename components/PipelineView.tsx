import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { LifecycleStatus, Patient } from '../types';
import { MoreHorizontal, Calendar, Paperclip, X, MessageSquare, FileText, Globe, Pencil, Trash2, PlusCircle, CalendarClock, Archive, Search, Mic, ArrowLeft, ArrowRight, Loader2, Share2 } from 'lucide-react';
// Fix: LiveSession is not an exported member of @google/genai.
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { VoiceVisualizer } from './VoiceVisualizer';
import { VoiceAssistant } from './VoiceAssistant';


// Audio helper functions from guidelines
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

type MediaBlob = { data: string; mimeType: string; };

const COLUMN_CONFIG = [
  { id: LifecycleStatus.OPPORTUNITY, label: 'Oportunidades', color: 'bg-amber-500' },
  { id: LifecycleStatus.PROSPECT, label: 'Prospectos Enviados', color: 'bg-blue-500' },
  { id: LifecycleStatus.NEW_PATIENT_BOOKED, label: 'Citas Agendadas', color: 'bg-emerald-500' },
  { id: LifecycleStatus.FIRST_TIME_PATIENT, label: 'Plan de Tratamiento', color: 'bg-indigo-500' },
];

const getSourceIcon = (source?: string) => {
  if (!source) return Paperclip;
  const sourceLower = source.toLowerCase();
  if (['whatsapp', 'instagram', 'facebook', 'messenger'].some(s => sourceLower.includes(s))) {
    return MessageSquare;
  }
  if (['pdf', 'csv', 'hoja', 'documento'].some(s => sourceLower.includes(s))) {
    return FileText;
  }
  if (['web', 'sitio web', 'formulario'].some(s => sourceLower.includes(s))) {
    return Globe;
  }
  return Paperclip;
};


const PatientCard: React.FC<{
  patient: Patient;
  onViewAttachment: (url: string) => void;
  onArchive: (patient: Patient) => void;
  isLoadingAttachment: boolean;
  activeAttachmentUrl: string | null;
  onSchedule: (patient: Patient) => void;
}> = ({ patient, onViewAttachment, onArchive, isLoadingAttachment, activeAttachmentUrl, onSchedule }) => {
  // FIX: `updatePatientStatus` does not exist in the context. Use `updatePatient` instead.
  const { updatePatient } = useData();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isCurrentlyLoading = isLoadingAttachment && activeAttachmentUrl === patient.attachmentUrl;


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  const moveNext = () => {
    if (patient.lifecycle_status === LifecycleStatus.OPPORTUNITY) {
      if (!patient.phone || !patient.email) {
        alert("Para calificar como Prospecto, se requieren al menos dos formas de contacto (teléfono y email).");
        let updatedPhone = patient.phone;
        let updatedEmail = patient.email;

        if (!patient.phone) {
          const phoneInput = prompt("Ingrese el número de teléfono del paciente:");
          if (phoneInput) updatedPhone = phoneInput;
        }
        if (!patient.email) {
          const emailInput = prompt("Ingrese el correo electrónico del paciente:");
          if (emailInput) updatedEmail = emailInput;
        }

        if (updatedPhone && updatedEmail) {
          updatePatient(patient.id, { phone: updatedPhone, email: updatedEmail });
          // FIX: Use `updatePatient` to change the lifecycle status.
          updatePatient(patient.id, { lifecycle_status: LifecycleStatus.PROSPECT });
        }
      } else {
        // FIX: Use `updatePatient` to change the lifecycle status.
        updatePatient(patient.id, { lifecycle_status: LifecycleStatus.PROSPECT });
      }
    }
    // FIX: Use `updatePatient` to change the lifecycle status.
    else if (patient.lifecycle_status === LifecycleStatus.PROSPECT) {
      updatePatient(patient.id, { lifecycle_status: LifecycleStatus.NEW_PATIENT_BOOKED });
    }
    // FIX: Use `updatePatient` to change the lifecycle status.
    else if (patient.lifecycle_status === LifecycleStatus.NEW_PATIENT_BOOKED) updatePatient(patient.id, { lifecycle_status: LifecycleStatus.FIRST_TIME_PATIENT });
  };
  
  const movePrev = () => {
    // FIX: Use `updatePatient` to change the lifecycle status.
    if (patient.lifecycle_status === LifecycleStatus.FIRST_TIME_PATIENT) updatePatient(patient.id, { lifecycle_status: LifecycleStatus.NEW_PATIENT_BOOKED });
    // FIX: Use `updatePatient` to change the lifecycle status.
    else if (patient.lifecycle_status === LifecycleStatus.NEW_PATIENT_BOOKED) updatePatient(patient.id, { lifecycle_status: LifecycleStatus.PROSPECT });
    // FIX: Use `updatePatient` to change the lifecycle status.
    else if (patient.lifecycle_status === LifecycleStatus.PROSPECT) updatePatient(patient.id, { lifecycle_status: LifecycleStatus.OPPORTUNITY });
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newNotes = prompt("Editar nota para el paciente:", patient.notes || "");
    if (newNotes !== null) {
      updatePatient(patient.id, { notes: newNotes });
    }
    setIsMenuOpen(false);
  };
  
  const handleScheduleOrReschedule = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onSchedule(patient);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);

    const shareText = `
Detalles del Paciente:
Nombre: ${patient.name} ${patient.surname || ''}
Teléfono: ${patient.phone || 'No disponible'}
Email: ${patient.email || 'No disponible'}
Notas: ${patient.notes || 'Sin notas'}
    `.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Detalles del Paciente: ${patient.name}`,
          text: shareText,
        });
      } catch (error) {
        console.error('Error al compartir:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Detalles del paciente copiados al portapapeles.');
      } catch (err) {
        console.error('Error al copiar al portapapeles:', err);
        alert('No se pudieron copiar los detalles. Por favor, hágalo manualmente.');
      }
    }
  };

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArchive(patient);
    setIsMenuOpen(false);
  };

  const SourceIcon = getSourceIcon(patient.source);

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-3 cursor-pointer group relative transition-all duration-200 hover:shadow-lg hover:scale-[1.02]">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-slate-900 dark:text-white">{patient.name} {patient.surname}</h4>
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(prev => !prev); }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 -m-1 rounded-full"
            aria-label="Opciones de paciente"
          >
            <MoreHorizontal size={16} />
          </button>
          {isMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-700 rounded-lg shadow-xl border border-slate-200 dark:border-slate-600 z-10 py-1 animate-in fade-in zoom-in-95">
              <button onClick={handleEdit} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600">
                <Pencil size={14} /> Editar Nota
              </button>
              <button onClick={handleShare} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600">
                <Share2 size={14} /> Compartir
              </button>
              <button onClick={(e) => { e.stopPropagation(); alert('Funcionalidad no implementada'); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600">
                <PlusCircle size={14} /> Agregar Info
              </button>
              <button onClick={handleScheduleOrReschedule} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600">
                <CalendarClock size={14} /> {patient.lifecycle_status === LifecycleStatus.NEW_PATIENT_BOOKED ? 'Reprogramar Cita' : 'Agendar Cita'}
              </button>
              <div className="my-1 h-px bg-slate-200 dark:bg-slate-600"></div>
              <button onClick={handleArchiveClick} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                <Archive size={14} /> Archivar
              </button>
            </div>
          )}
        </div>
      </div>
      {patient.notes && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 whitespace-pre-wrap">{patient.notes}</p>
      )}

      {patient.lifecycle_status === LifecycleStatus.NEW_PATIENT_BOOKED && !patient.notes?.toUpperCase().includes('CITA AGENDADA') && (
        <button
          onClick={(e) => { e.stopPropagation(); onSchedule(patient); }}
          className="mb-3 w-full text-sm bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
        >
            <CalendarClock size={16} />
            <span>Agendar Cita</span>
        </button>
      )}

      {patient.attachmentUrl && (
        <button
          onClick={(e) => { e.stopPropagation(); onViewAttachment(patient.attachmentUrl!); }}
          disabled={isLoadingAttachment}
          className="mb-3 w-full text-sm bg-medical-100 dark:bg-medical-900/40 text-medical-700 dark:text-medical-300 font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-2 hover:bg-medical-200 dark:hover:bg-medical-900/60 transition-colors disabled:opacity-70 disabled:cursor-wait"
        >
          {isCurrentlyLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Cargando...</span>
            </>
          ) : (
            <>
              <Paperclip size={14} /> Ver Adjunto
            </>
          )}
        </button>
      )}
      
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(patient.last_interaction).toLocaleDateString('es-ES', {month:'short', day:'numeric'})}</span>
        {patient.source && (
          <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full flex items-center gap-1.5">
            <SourceIcon size={12} />
            <span>{patient.source}</span>
          </span>
        )}
      </div>
      
      <div className="mt-3 w-full">
        <div className="flex w-full">
          <button 
            onClick={(e) => { e.stopPropagation(); movePrev(); }}
            disabled={patient.lifecycle_status === LifecycleStatus.OPPORTUNITY}
            className="flex-1 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-l-lg flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-100 dark:disabled:hover:bg-slate-700/50"
          >
            <ArrowLeft size={12} /> Retroceder
          </button>
          <div className="w-px bg-white dark:bg-slate-900"></div> {/* Separator */}
          <button 
            onClick={(e) => { e.stopPropagation(); moveNext(); }}
            disabled={patient.lifecycle_status === LifecycleStatus.FIRST_TIME_PATIENT}
            className="flex-1 py-1.5 text-xs font-medium text-medical-600 dark:text-medical-400 bg-medical-50 dark:bg-medical-900/30 hover:bg-medical-100 dark:hover:bg-medical-900/50 rounded-r-lg flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-medical-50 dark:disabled:hover:bg-medical-900/30"
          >
            Avanzar <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export const PipelineView: React.FC = () => {
  const { patients, updatePatient } = useData();
  const [viewingAttachment, setViewingAttachment] = useState<string | null>(null);
  const [isAttachmentLoading, setIsAttachmentLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [patientToArchive, setPatientToArchive] = useState<Patient | null>(null);
  const [schedulingPatient, setSchedulingPatient] = useState<Patient | null>(null);
  const [appointmentDateTime, setAppointmentDateTime] = useState('');
  
  // Voice Search State
  const [isVoiceSearching, setIsVoiceSearching] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [voiceSearchError, setVoiceSearchError] = useState<string | null>(null);
  // Fix: LiveSession is not exported, use `any` for the session promise.
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const stableTranscriptRef = useRef('');


  const isImageUrl = (url: string) => /\.(jpeg|jpg|gif|png|svg|webp)$/i.test(url);
  
  const handleConfirmArchive = () => {
    if (patientToArchive) {
      updatePatient(patientToArchive.id, { lifecycle_status: LifecycleStatus.ARCHIVED });
      setPatientToArchive(null);
    }
  };

  const handleOpenScheduler = (patient: Patient) => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 1); // Tomorrow
    defaultDate.setHours(10, 0, 0, 0); // at 10:00 AM
    // Format for datetime-local input: YYYY-MM-DDTHH:mm
    const formattedDefaultDate = defaultDate.toISOString().slice(0, 16);
    
    setAppointmentDateTime(formattedDefaultDate);
    setSchedulingPatient(patient);
  };
  
  const handleConfirmSchedule = () => {
    if (schedulingPatient && appointmentDateTime) {
      const date = new Date(appointmentDateTime);
      const formattedDate = date.toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' });
      
      const isRescheduling = schedulingPatient.lifecycle_status === LifecycleStatus.NEW_PATIENT_BOOKED;
      const notePrefix = isRescheduling ? `[REPROGRAMADA: ${formattedDate}]` : `[CITA AGENDADA: ${formattedDate}]`;
      
      const cleanNotes = schedulingPatient.notes?.replace(/\[(CITA AGENDADA|REPROGRAMADA):.*?\]/g, '').trim();
      const newNote = `${notePrefix}\n${cleanNotes || ''}`.trim();

      updatePatient(schedulingPatient.id, {
        notes: newNote,
        lifecycle_status: LifecycleStatus.NEW_PATIENT_BOOKED
      });

      // Calendar Integration: Generate and download .ics file
      const patientName = `${schedulingPatient.name} ${schedulingPatient.surname || ''}`.trim();
      const eventTitle = `Cita Dental: ${patientName}`;
      const eventDescription = `Cita programada para ${patientName}.\n\nNotas adicionales:\n${cleanNotes || 'Sin notas.'}`;
      
      const startTime = date;
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Assume 1 hour duration

      const toICSDate = (d: Date) => d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
      
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//MiConsulApp//CRM//ES',
        'BEGIN:VEVENT',
        `UID:${crypto.randomUUID()}@miconsul.app`,
        `DTSTAMP:${toICSDate(new Date())}`,
        `DTSTART:${toICSDate(startTime)}`,
        `DTEND:${toICSDate(endTime)}`,
        `SUMMARY:${eventTitle}`,
        `DESCRIPTION:${eventDescription.replace(/\n/g, '\\n')}`,
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const safeFileName = patientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.download = `cita_${safeFileName}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSchedulingPatient(null);
      setAppointmentDateTime('');
    }
  };

  const handleViewAttachment = (url: string) => {
    if (!isImageUrl(url)) {
      window.open(url, '_blank');
    } else {
      setIsAttachmentLoading(true);
      setViewingAttachment(url);
    }
  };

  const handleVoiceMessage = useCallback((message: LiveServerMessage) => {
    if (message.serverContent?.inputTranscription) {
      // Fix: The 'isFinal' property is deprecated. Use 'turnComplete' on serverContent to detect the end of user input.
      const text = message.serverContent.inputTranscription.text;
      if (message.serverContent?.turnComplete) {
        stableTranscriptRef.current += text + ' ';
        setLiveTranscript(stableTranscriptRef.current);
        setSearchTerm(stableTranscriptRef.current.trim());
      } else {
        const currentSearch = stableTranscriptRef.current + text;
        setLiveTranscript(currentSearch);
        setSearchTerm(currentSearch.trim());
      }
    }
  }, []);

  const stopVoiceSearch = useCallback((shouldCloseSession = true) => {
    if (shouldCloseSession && sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close()).catch(console.error);
    }
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    scriptProcessorRef.current?.disconnect();
    if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close().catch(console.error);
    
    sessionPromiseRef.current = null;
    mediaStreamRef.current = null;
    scriptProcessorRef.current = null;
    audioContextRef.current = null;
    
    setIsVoiceSearching(false);
    setIsConnecting(false);
  }, []);
  
  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopVoiceSearch(true);
    };
  }, [stopVoiceSearch]);

  const startVoiceSearch = async () => {
    if (isVoiceSearching || isConnecting) return;
    if (!process.env.API_KEY) {
      setVoiceSearchError("API Key no configurada.");
      setIsVoiceSearching(true);
      return;
    }
    
    setIsVoiceSearching(true);
    setIsConnecting(true);
    setVoiceSearchError(null);
    setLiveTranscript('');
    setSearchTerm('');
    stableTranscriptRef.current = '';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            scriptProcessorRef.current = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current.onaudioprocess = (event) => {
              const inputData = event.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                  int16[i] = inputData[i] * 32768;
              }
              const pcmBlob: MediaBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromiseRef.current?.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(audioContextRef.current!.destination);
          },
          onmessage: handleVoiceMessage,
          onerror: (e) => {
            console.error("Voice search error:", e);
            setVoiceSearchError("Hubo un error en la conexión.");
            stopVoiceSearch(false);
          },
          onclose: (e) => {
            stopVoiceSearch(false);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO], // Required but not used for audio output
          inputAudioTranscription: {},
          systemInstruction: "Eres un servicio de transcripción de voz a texto. Solo transcribe lo que el usuario dice.",
        },
      });

    } catch (err) {
      console.error("Failed to start voice search:", err);
      setVoiceSearchError("No se pudo acceder al micrófono.");
      setIsConnecting(false);
      setIsVoiceSearching(true); // Keep modal open to show error
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
       <header className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex-shrink-0">Flujo de Oportunidades</h1>
        <div className="flex items-center gap-2 w-full md:w-auto md:max-w-xs">
            <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Buscar por nombre o nota..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-medical-500 outline-none text-sm"
                />
            </div>
            <button
                onClick={startVoiceSearch}
                className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                aria-label="Buscar por voz"
            >
                <Mic size={18} />
            </button>
        </div>
      </header>
      
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 h-full min-w-[1340px]">
          {COLUMN_CONFIG.map(col => {
            const filteredPatientsInColumn = patients
              .filter(p => p.lifecycle_status === col.id)
              .filter(p => {
                if (!searchTerm.trim()) return true;
                const term = searchTerm.toLowerCase();
                const fullName = `${p.name} ${p.surname || ''}`.toLowerCase();
                const notes = p.notes?.toLowerCase() || '';
                return fullName.includes(term) || notes.includes(term);
              });

            return (
              <div key={col.id} className="flex-1 flex flex-col min-w-[320px] bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-3 h-3 rounded-full ${col.color}`} />
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200">{col.label}</h3>
                  <span className="ml-auto bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded-full">
                    {filteredPatientsInColumn.length}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2">
                  {filteredPatientsInColumn
                    .map(patient => (
                      <PatientCard
                        key={patient.id}
                        patient={patient}
                        onArchive={setPatientToArchive}
                        onViewAttachment={handleViewAttachment}
                        isLoadingAttachment={isAttachmentLoading}
                        activeAttachmentUrl={viewingAttachment}
                        onSchedule={handleOpenScheduler}
                      />
                    ))
                  }
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {viewingAttachment && isImageUrl(viewingAttachment) && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-in fade-in"
          onClick={() => setViewingAttachment(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-slate-800 rounded-lg shadow-2xl flex items-center justify-center" onClick={e => e.stopPropagation()}>
            {isAttachmentLoading && (
              <div className="p-20">
                <Loader2 size={48} className="text-medical-500 animate-spin" />
              </div>
            )}
            <img 
              src={viewingAttachment} 
              alt="Adjunto" 
              className={`object-contain max-w-full max-h-[90vh] rounded-lg ${isAttachmentLoading ? 'hidden' : 'block'}`}
              onLoad={() => setIsAttachmentLoading(false)}
              onError={() => setIsAttachmentLoading(false)}
            />
            <button 
              onClick={() => setViewingAttachment(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-slate-600 hover:bg-slate-800 text-white rounded-full flex items-center justify-center transition-transform hover:scale-110"
              aria-label="Cerrar vista previa"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
      
      {/* Appointment Scheduling Modal */}
      {schedulingPatient && (
        <div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in"
            onClick={() => setSchedulingPatient(null)}
        >
            <div 
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CalendarClock className="text-medical-500" />
                    Agendar Cita para {schedulingPatient.name}
                </h3>
                <div className="mt-4">
                    <label htmlFor="appointmentTime" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Fecha y Hora de la Cita
                    </label>
                    <input
                      id="appointmentTime"
                      type="datetime-local"
                      value={appointmentDateTime}
                      onChange={(e) => setAppointmentDateTime(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-medical-500 outline-none"
                    />
                </div>
                <div className="flex justify-end gap-4 mt-6">
                    <button 
                        onClick={() => setSchedulingPatient(null)} 
                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleConfirmSchedule} 
                        disabled={!appointmentDateTime}
                        className="px-4 py-2 text-sm font-medium text-white bg-medical-500 hover:bg-medical-600 rounded-lg disabled:opacity-50"
                    >
                        Guardar Cita
                    </button>
                </div>
            </div>
        </div>
      )}

      {patientToArchive && (
        <div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in"
            onClick={() => setPatientToArchive(null)}
        >
            <div 
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Archive className="text-amber-500" />
                    Confirmar Archivo
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                    ¿Estás seguro de que quieres archivar a <strong>{patientToArchive.name}</strong>? El paciente será removido del flujo principal pero permanecerá en tu lista de pacientes.
                </p>
                <div className="flex justify-end gap-4 mt-6">
                    <button 
                        onClick={() => setPatientToArchive(null)} 
                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleConfirmArchive} 
                        className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg"
                    >
                        Sí, Archivar
                    </button>
                </div>
            </div>
        </div>
      )}

      {isVoiceSearching && (
        <div 
            className="fixed inset-0 bg-black/70 z-50 flex flex-col items-center justify-center p-4 animate-in fade-in"
        >
            <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl p-8 flex flex-col items-center justify-center relative text-center">
                <button onClick={() => stopVoiceSearch(true)} className="absolute top-4 right-4 p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700">
                    <X size={24} />
                </button>
                {voiceSearchError ? (
                    <div className="text-red-500 dark:text-red-400">
                        <h3 className="text-lg font-bold">Error</h3>
                        <p>{voiceSearchError}</p>
                    </div>
                ) : isConnecting ? (
                    <>
                        <Loader2 className="w-24 h-24 text-medical-500 animate-spin mb-4" />
                        <p className="text-slate-600 dark:text-slate-300">Conectando...</p>
                    </>
                ) : (
                    <>
                        <VoiceVisualizer isListening={true} />
                        <p className="mt-6 text-2xl font-medium text-slate-700 dark:text-slate-200 min-h-[3rem] max-w-full break-words">
                            {liveTranscript || "Diga el nombre de un paciente..."}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">
                            La búsqueda se actualizará automáticamente.
                        </p>
                    </>
                )}
            </div>
        </div>
      )}
      <VoiceAssistant />
    </div>
  );
};