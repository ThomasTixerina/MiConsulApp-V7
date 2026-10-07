import React, { useState, useRef, useEffect, useCallback } from 'react';
// Fix: LiveSession is not an exported member of @google/genai.
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { Mic, Bot, User, Loader2, Stethoscope, Square } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { Patient, LifecycleStatus, AudioNote } from '../types';
import { VoiceVisualizer } from './VoiceVisualizer';
import { geminiService } from '../services/geminiService';


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

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

type MediaBlob = { data: string; mimeType: string; };

const createPatientFunctionDeclaration: FunctionDeclaration = {
    name: 'createPatient',
    parameters: {
        type: Type.OBJECT,
        description: 'Crea un nuevo paciente o prospecto en el sistema CRM.',
        properties: {
            name: { type: Type.STRING, description: 'El nombre de pila del paciente.' },
            surname: { type: Type.STRING, description: 'Los apellidos del paciente.', nullable: true },
            phone: { type: Type.STRING, description: 'El número de teléfono del paciente.', nullable: true },
            email: { type: Type.STRING, description: 'La dirección de correo electrónico del paciente.', nullable: true },
            notes: { type: Type.STRING, description: 'Un resumen de la solicitud o el motivo de la consulta del paciente.', nullable: true },
            source: { type: Type.STRING, description: 'De dónde proviene el paciente (por ejemplo, WhatsApp, referido).', nullable: true },
            lifecycle_status: { type: Type.STRING, enum: Object.values(LifecycleStatus), description: 'El estado inicial del paciente, por defecto OPORTUNIDAD.', nullable: true },
        },
        required: ['name'],
    },
};

const updatePatientDetailsFunctionDeclaration: FunctionDeclaration = {
    name: 'updatePatientDetails',
    parameters: {
        type: Type.OBJECT,
        description: 'Actualiza los detalles de un paciente existente en el CRM.',
        properties: {
            patientName: { 
                type: Type.STRING, 
                description: 'El nombre completo del paciente a actualizar. Es crucial para encontrar al paciente correcto.' 
            },
            phone: { type: Type.STRING, description: 'El nuevo número de teléfono del paciente.', nullable: true },
            email: { type: Type.STRING, description: 'La nueva dirección de correo electrónico del paciente.', nullable: true },
            notes: { type: Type.STRING, description: 'Nuevas notas o actualización de las existentes para el paciente.', nullable: true },
            lifecycle_status: { type: Type.STRING, enum: Object.values(LifecycleStatus), description: 'El nuevo estado del ciclo de vida del paciente.', nullable: true },
        },
        required: ['patientName'],
    },
};

const startAudioNoteRecordingDeclaration: FunctionDeclaration = {
    name: 'startAudioNoteRecording',
    parameters: {
        type: Type.OBJECT,
        description: 'Inicia el proceso de grabación de una nota de voz para un paciente específico.',
        properties: {
            patientName: { 
                type: Type.STRING, 
                description: 'El nombre completo del paciente para quien se grabará la nota.' 
            },
        },
        required: ['patientName'],
    },
};


interface TranscriptionEntry {
    speaker: 'user' | 'assistant';
    text: string;
}

export const AIAssistantView: React.FC = () => {
    const { addPatient, patients, updatePatient } = useData();
    const [isListening, setIsListening] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);
    const [isRecordingNoteFor, setIsRecordingNoteFor] = useState<Patient | null>(null);
    
    // Fix: LiveSession is not exported, use `any` for the session promise.
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const audioChunksRef = useRef<Int16Array[]>([]);
    const isRecordingNoteForRef = useRef(isRecordingNoteFor);
    const noteTextRef = useRef("");
    const utteranceFinalized = useRef(true);


    useEffect(() => {
        isRecordingNoteForRef.current = isRecordingNoteFor;
    }, [isRecordingNoteFor]);

    useEffect(() => {
      transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcriptions]);

    // Cleanup on component unmount
    useEffect(() => {
        return () => {
            stopSession(true);
        };
    }, []);

    const functions = {
        createPatient: (args: any) => {
            const { name, surname, phone, email, notes, source, lifecycle_status } = args;
            const newPatient: Patient = {
                id: crypto.randomUUID(),
                name: name,
                surname: surname || undefined,
                phone: phone || undefined,
                email: email || undefined,
                lifecycle_status: lifecycle_status || LifecycleStatus.OPPORTUNITY,
                source: source || 'Asistente de Voz',
                notes: notes || undefined,
                created_at: new Date().toISOString(),
                last_interaction: new Date().toISOString(),
            };
            addPatient(newPatient);
            return `Paciente ${name} creado exitosamente.`;
        },
        updatePatientDetails: (args: any) => {
            const { patientName, ...updateFields } = args;
            
            const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const searchName = normalize(patientName);
    
            const foundPatient = patients.find(p => normalize(p.name) === searchName);
    
            if (!foundPatient) {
                return `No se encontró al paciente llamado ${patientName}.`;
            }
    
            const validUpdates = Object.entries(updateFields).reduce((acc, [key, value]) => {
                if (value !== null && value !== undefined) {
                    // @ts-ignore
                    acc[key] = value;
                }
                return acc;
            }, {});
            
            if (Object.keys(validUpdates).length === 0) {
                return `Por favor, especifica qué información de ${patientName} quieres actualizar.`;
            }
            
            updatePatient(foundPatient.id, validUpdates);
            
            return `Los datos de ${patientName} han sido actualizados.`;
        },
        startAudioNoteRecording: (args: { patientName: string }) => {
            const { patientName } = args;
            const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const searchName = normalize(patientName);
            const foundPatient = patients.find(p => normalize(p.name) === searchName);

            if (foundPatient) {
                setIsRecordingNoteFor(foundPatient);
                audioChunksRef.current = []; // Reset audio buffer
                return `Entendido. Listo para grabar una nota para ${patientName}. Hable ahora.`;
            } else {
                return `No pude encontrar un paciente llamado ${patientName}. Por favor, intente de nuevo.`;
            }
        },
    };

    const handleMessage = useCallback(async (message: LiveServerMessage) => {
        // --- Audio Note Recording Logic ---
        if (isRecordingNoteForRef.current && message.serverContent?.inputTranscription) {
            noteTextRef.current += message.serverContent.inputTranscription.text;
        }

        if (isRecordingNoteForRef.current && message.serverContent?.turnComplete) {
            const patient = isRecordingNoteForRef.current;
            const finalTranscription = noteTextRef.current.trim();
            noteTextRef.current = "";

            // Exit recording mode
            setIsRecordingNoteFor(null);

            if (finalTranscription) {
                // Process and save the buffered audio
                const totalLength = audioChunksRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
                const combined = new Int16Array(totalLength);
                let offset = 0;
                audioChunksRef.current.forEach(chunk => {
                    combined.set(chunk, offset);
                    offset += chunk.length;
                });

                const audioBlob = new Blob([combined.buffer], { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);

                const newNote: AudioNote = {
                    id: crypto.randomUUID(),
                    audioUrl,
                    transcription: finalTranscription,
                    createdAt: new Date().toISOString(),
                };

                const updatedAudioNotes = [...(patient.audioNotes || []), newNote];
                updatePatient(patient.id, { audioNotes: updatedAudioNotes });
                
                const confirmationText = `Nota de audio guardada para ${patient.name}.`;
                geminiService.speakText(confirmationText);
                setTranscriptions(prev => [...prev, { speaker: 'assistant', text: confirmationText }]);

            } else {
                // User didn't say anything, cancel the recording
                const cancelText = `Grabación de nota para ${patient.name} cancelada.`;
                geminiService.speakText(cancelText);
                setTranscriptions(prev => [...prev, { speaker: 'assistant', text: cancelText }]);
            }
             // Always clear buffer after processing
            audioChunksRef.current = [];
            return; // Stop further processing after handling the note.
        }

        // --- Standard Command Logic ---
        if (message.serverContent?.inputTranscription) {
            const text = message.serverContent.inputTranscription.text;
            setTranscriptions(prev => {
                const last = prev[prev.length - 1];
                if (last?.speaker === 'user' && !utteranceFinalized.current) {
                    const updatedLast = { ...last, text: last.text + text };
                    return [...prev.slice(0, -1), updatedLast];
                }
                utteranceFinalized.current = false;
                return [...prev, { speaker: 'user', text }];
            });
        }
        
        if (message.serverContent?.turnComplete) {
            utteranceFinalized.current = true;
        }

        if (message.serverContent?.outputTranscription) {
            const text = message.serverContent.outputTranscription.text;
             setTranscriptions(prev => {
                const last = prev[prev.length - 1];
                if (last?.speaker === 'assistant') {
                    last.text += text;
                    return [...prev];
                }
                return [...prev, { speaker: 'assistant', text }];
            });
        }

        if (message.toolCall?.functionCalls) {
            for (const fc of message.toolCall.functionCalls) {
                // @ts-ignore
                const fn = functions[fc.name];
                let result = `Función ${fc.name} no encontrada.`;
                if (fn) {
                    result = fn(fc.args);
                }
                sessionPromiseRef.current?.then(session => {
                    session.sendToolResponse({
                        functionResponses: { id: fc.id, name: fc.name, response: { result } },
                    });
                });
            }
        }
        
        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio && outputAudioContextRef.current) {
            let nextStartTime = Math.max(outputAudioContextRef.current.currentTime, 0);
            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
            const source = outputAudioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioContextRef.current.destination);
            source.start(nextStartTime);
            nextStartTime += audioBuffer.duration;
        }

    }, [patients, updatePatient]);

    const startSession = async () => {
        if (isListening || isConnecting) return;
        if (!process.env.API_KEY) {
            setError("API Key no está configurada. La función de voz no está disponible.");
            return;
        }
        setIsConnecting(true);
        setError(null);
        setTranscriptions([]);
        setIsRecordingNoteFor(null);
        audioChunksRef.current = [];
        noteTextRef.current = "";
        utteranceFinalized.current = true;


        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setIsListening(true);
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
                            // Buffer audio chunks if we are in recording mode
                            if (isRecordingNoteForRef.current) {
                                audioChunksRef.current.push(int16);
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
                    onmessage: handleMessage,
                    onerror: (e) => {
                        console.error("Live session error:", e);
                        setError("Hubo un error en la conexión. Por favor, intente de nuevo.");
                        stopSession(false);
                    },
                    onclose: (e) => {
                        stopSession(false);
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    tools: [{ functionDeclarations: [createPatientFunctionDeclaration, updatePatientDetailsFunctionDeclaration, startAudioNoteRecordingDeclaration] }],
                    systemInstruction: "Eres un asistente de voz para un CRM de una clínica dental. Eres conciso y directo. Puedes crear nuevos pacientes, actualizar su información, o iniciar la grabación de una nota de audio. Para notas, usa la función `startAudioNoteRecording`. El siguiente audio del usuario será la nota.",
                },
            });

        } catch (err) {
            console.error("Failed to start voice session:", err);
            setError("No se pudo acceder al micrófono. Por favor, verifique los permisos.");
            setIsConnecting(false);
        }
    };
    
    const stopSession = (shouldCloseSession = true) => {
        if (shouldCloseSession && sessionPromiseRef.current) {
          sessionPromiseRef.current.then(session => session.close()).catch(console.error);
        }

        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        scriptProcessorRef.current?.disconnect();
        if(audioContextRef.current?.state !== 'closed') audioContextRef.current?.close().catch(console.error);
        if(outputAudioContextRef.current?.state !== 'closed') outputAudioContextRef.current?.close().catch(console.error);

        sessionPromiseRef.current = null;
        mediaStreamRef.current = null;
        scriptProcessorRef.current = null;
        audioContextRef.current = null;
        outputAudioContextRef.current = null;
        
        setIsRecordingNoteFor(null);
        setIsListening(false);
        setIsConnecting(false);
    };

    const toggleListening = () => {
        if (isListening) {
            stopSession();
        } else {
            startSession();
        }
    }

    const getCenterContent = () => {
        if (error) {
            return (
                <div className="text-center text-red-500 dark:text-red-400">
                    <p className="font-bold mb-2">Error de Conexión</p>
                    <p className="text-sm mb-4">{error}</p>
                    <button onClick={startSession} className="bg-medical-500 text-white px-4 py-2 rounded-lg">Reintentar</button>
                </div>
            );
        }

        if (isConnecting) {
             return (
                <>
                    <Loader2 className="w-16 h-16 text-medical-500 animate-spin mb-4" />
                    <p className="text-slate-600 dark:text-slate-300">Iniciando conexión segura...</p>
                </>
           );
        }

        if (isRecordingNoteFor) {
            return (
                <>
                    <VoiceVisualizer isListening={true} />
                    <p className="mt-6 text-xl font-medium text-slate-700 dark:text-slate-200">Grabando nota para {isRecordingNoteFor.name}...</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Hable ahora. Deje de hablar para guardar.</p>
                </>
            );
        }

        if (isListening) {
            return (
                 <>
                    <VoiceVisualizer isListening={true} />
                    <p className="mt-6 text-xl font-medium text-slate-700 dark:text-slate-200">Escuchando...</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Hable ahora para dar un comando.</p>
                </>
            );
        }
        
        // Idle state
        return (
            <>
                <div className="w-48 h-48 flex items-center justify-center">
                    <div className="w-1/2 h-1/2 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                        <Mic className="w-1/2 h-1/2 text-slate-500 dark:text-slate-400" />
                    </div>
                </div>
                <p className="mt-6 text-xl font-medium text-slate-700 dark:text-slate-200">Asistente en espera</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Presione el botón para comenzar.</p>
            </>
        );
    }
    
    return (
        <div className="p-6 h-full flex flex-col max-h-screen">
            <header className="mb-6 flex-none">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Stethoscope className="text-medical-500" /> Asistente IA
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                Utilice su voz para gestionar pacientes, incluyendo la grabación de notas de audio.
                </p>
            </header>

            <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative">
                    {getCenterContent()}
                </div>
                
                <div className="p-4 bg-slate-100 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700/50">
                     <button 
                        onClick={toggleListening}
                        disabled={isConnecting || !!isRecordingNoteFor}
                        className={`w-full py-4 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300 ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-medical-500 hover:bg-medical-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isConnecting ? <><Loader2 className="animate-spin" /> Conectando...</> : isListening ? <><Square /> Detener</> : <><Mic/> Iniciar Asistente</>}
                    </button>
                </div>

                <div className="flex-none h-48 overflow-y-auto p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-semibold mb-2 text-slate-600 dark:text-slate-300">Transcripción en vivo</h3>
                    <div className="space-y-3">
                        {transcriptions.length > 0 ? transcriptions.map((t, i) => (
                            <div key={i} className={`flex items-start gap-2 text-sm ${t.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {t.speaker === 'assistant' && <Bot size={16} className="text-medical-500 flex-shrink-0 mt-0.5" />}
                                <p className={`px-3 py-1.5 rounded-2xl max-w-md ${t.speaker === 'user' ? 'bg-medical-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}>
                                    {t.text}
                                </p>
                                {t.speaker === 'user' && <User size={16} className="text-slate-500 flex-shrink-0 mt-0.5" />}
                            </div>
                        )) : <p className="text-sm text-slate-400 text-center py-4">La transcripción aparecerá aquí.</p>}
                        <div ref={transcriptEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
};