import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Search, Volume2, Loader2, Plus, X, ChevronDown, Voicemail, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { Patient, LifecycleStatus } from '../types';

const STATUS_TRANSLATIONS: Record<string, string> = {
  [LifecycleStatus.OPPORTUNITY]: 'Oportunidad',
  [LifecycleStatus.PROSPECT]: 'Prospecto',
  [LifecycleStatus.NEW_PATIENT_BOOKED]: 'Cita Agendada',
  [LifecycleStatus.FIRST_TIME_PATIENT]: 'Paciente de 1ª Vez',
  [LifecycleStatus.INACTIVE_PATIENT]: 'Inactivo',
  [LifecycleStatus.LOST]: 'Perdido'
};

const INITIAL_FORM_STATE: Partial<Patient> = {
  name: '',
  surname: '',
  phone: '',
  email: '',
  source: '',
  notes: '',
  lifecycle_status: LifecycleStatus.OPPORTUNITY,
};

const AudioNotesModal: React.FC<{ patient: Patient; onClose: () => void; }> = ({ patient, onClose }) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = (audioUrl: string, noteId: string) => {
    if (audioRef.current && playingId === noteId) {
      audioRef.current.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play().catch(e => console.error("Error playing audio:", e));
      setPlayingId(noteId);
      audio.onended = () => {
        setPlayingId(null);
        audioRef.current = null;
      };
    }
  };

  useEffect(() => {
    // Cleanup audio on modal close
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Voicemail className="text-medical-500" />
            Notas de Audio para {patient.name}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {patient.audioNotes && patient.audioNotes.length > 0 ? (
            [...patient.audioNotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(note => (
              <div key={note.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <blockquote className="text-slate-700 dark:text-slate-200 italic mb-3">"{note.transcription}"</blockquote>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(note.createdAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  <button onClick={() => handlePlay(note.audioUrl, note.id)} className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg bg-medical-100 dark:bg-medical-900/50 text-medical-600 dark:text-medical-400 hover:bg-medical-200 dark:hover:bg-medical-900/70 transition-colors">
                    {playingId === note.id ? <Pause size={16} /> : <Play size={16} />}
                    <span>{playingId === note.id ? 'Pausar' : 'Reproducir'}</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <p>No se han grabado notas de audio para este paciente.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export const PatientList: React.FC = () => {
  const { patients, addPatient } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState<Partial<Patient>>(INITIAL_FORM_STATE);
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string }>({});
  const [viewingNotesFor, setViewingNotesFor] = useState<Patient | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PATIENTS_PER_PAGE = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate, statusFilter]);

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const dateFilterActive = !!startDate || !!endDate;
    if (dateFilterActive && p.lifecycle_status === LifecycleStatus.OPPORTUNITY) {
        return false;
    }

    const lastInteractionDateStr = p.last_interaction.substring(0, 10);
    const matchesDate =
      (!startDate || lastInteractionDateStr >= startDate) &&
      (!endDate || lastInteractionDateStr <= endDate);

    const matchesStatus = !statusFilter || p.lifecycle_status === statusFilter;

    return matchesSearch && matchesDate && matchesStatus;
  });

  const totalPages = Math.ceil(filteredPatients.length / PATIENTS_PER_PAGE);
  const indexOfLastPatient = currentPage * PATIENTS_PER_PAGE;
  const indexOfFirstPatient = indexOfLastPatient - PATIENTS_PER_PAGE;
  const currentPatients = filteredPatients.slice(indexOfFirstPatient, indexOfLastPatient);

  const handleSpeakSummary = async (patientId: string, text: string) => {
    if (playingAudio) return;
    setPlayingAudio(patientId);
    
    const audioBuffer = await geminiService.speakText(`Resumen del paciente ${text}`);
    
    if (audioBuffer) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = () => setPlayingAudio(null);
      source.start();
    } else {
      setPlayingAudio(null);
      alert("Error al generar audio.");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewPatient(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const errors: { name?: string; email?: string } = {};
    
    if (!newPatient.name || !newPatient.name.trim()) {
      errors.name = "El nombre es obligatorio.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (newPatient.email && !emailRegex.test(newPatient.email)) {
      errors.email = "El formato del email no es válido.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSavePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const patientToAdd: Patient = {
      id: crypto.randomUUID(),
      name: newPatient.name!,
      surname: newPatient.surname,
      phone: newPatient.phone,
      email: newPatient.email,
      source: newPatient.source,
      notes: newPatient.notes,
      lifecycle_status: newPatient.lifecycle_status || LifecycleStatus.OPPORTUNITY,
      created_at: new Date().toISOString(),
      last_interaction: new Date().toISOString(),
    };
    
    addPatient(patientToAdd);
    setIsModalOpen(false);
    setNewPatient(INITIAL_FORM_STATE);
  };

  const openModal = () => {
    setNewPatient(INITIAL_FORM_STATE);
    setFormErrors({});
    setIsModalOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Pacientes</h1>
        <button
          onClick={openModal}
          className="bg-medical-500 hover:bg-medical-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:shadow-md transition-all duration-300 flex items-center gap-2 justify-center"
          aria-label="Añadir nuevo paciente"
        >
          <Plus size={20} />
          <span>Nuevo Paciente</span>
        </button>
      </header>

      <div className="mb-6 flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label htmlFor="startDate" className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">Desde:</label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-medical-500 outline-none dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="endDate" className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">Hasta:</label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-medical-500 outline-none dark:text-white"
          />
        </div>
        <div className="relative flex-grow md:flex-grow-0">
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-sm focus:ring-2 focus:ring-medical-500 outline-none dark:text-white w-full appearance-none"
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_TRANSLATIONS).map(([key, value]) => (
              <option key={key} value={key as LifecycleStatus}>{value}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
        </div>
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar pacientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-medical-500 outline-none dark:text-white w-full"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1024px]">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Nombre</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Estado</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Origen</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Último Contacto</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Resumen</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300 text-center">Notas de Audio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentPatients.map(patient => (
                <tr key={patient.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    {patient.name} {patient.surname}
                    <div className="text-xs text-slate-500 font-normal">{patient.phone || patient.email || 'Sin contacto'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      patient.lifecycle_status === LifecycleStatus.NEW_PATIENT_BOOKED ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      patient.lifecycle_status === LifecycleStatus.FIRST_TIME_PATIENT ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {STATUS_TRANSLATIONS[patient.lifecycle_status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{patient.source || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {patient.lifecycle_status === LifecycleStatus.OPPORTUNITY
                      ? '-'
                      : new Date(patient.last_interaction).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <span className="truncate max-w-[200px]" title={patient.notes}>{patient.notes || '-'}</span>
                    {patient.notes && (
                      <button 
                        onClick={() => handleSpeakSummary(patient.id, `${patient.name}. ${patient.notes}`)}
                        disabled={playingAudio === patient.id}
                        className="p-1.5 text-slate-400 hover:text-medical-500 hover:bg-medical-50 dark:hover:bg-medical-900/30 rounded-full transition-colors"
                        title="Leer Resumen (Gemini TTS)"
                      >
                        {playingAudio === patient.id ? <Loader2 size={16} className="animate-spin"/> : <Volume2 size={16} />}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {patient.audioNotes && patient.audioNotes.length > 0 ? (
                      <button
                        onClick={() => setViewingNotesFor(patient)}
                        className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 font-medium py-1 px-3 rounded-full text-xs flex items-center gap-1.5 transition-colors"
                        title="Ver notas de audio"
                      >
                        <Voicemail size={14} />
                        <span>{patient.audioNotes.length}</span>
                      </button>
                    ) : (
                      <span className="text-sm text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPatients.length === 0 && (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                  No se encontraron pacientes que coincidan con los filtros.
              </div>
          )}
        </div>
        {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                    Mostrando <span className="font-medium">{indexOfFirstPatient + 1}</span> a <span className="font-medium">{Math.min(indexOfLastPatient, filteredPatients.length)}</span> de <span className="font-medium">{filteredPatients.length}</span> resultados
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        <ChevronLeft size={16} />
                        Anterior
                    </button>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
                            <button
                                key={pageNumber}
                                onClick={() => setCurrentPage(pageNumber)}
                                className={`w-9 h-9 text-sm font-medium rounded-lg flex items-center justify-center transition-colors ${
                                    currentPage === pageNumber
                                        ? 'bg-medical-500 text-white shadow-sm'
                                        : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}
                            >
                                {pageNumber}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        Siguiente
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        )}
      </div>

      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Crear Nuevo Paciente</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSavePatient}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nombre *</label>
                    <input type="text" id="name" name="name" value={newPatient.name} onChange={handleInputChange} className={`w-full bg-slate-50 dark:bg-slate-900 border ${formErrors.name ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg px-3 py-2 focus:ring-2 focus:ring-medical-500 outline-none`} />
                    {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label htmlFor="surname" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Apellidos</label>
                    <input type="text" id="surname" name="surname" value={newPatient.surname} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-medical-500 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Teléfono</label>
                    <input type="tel" id="phone" name="phone" value={newPatient.phone} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-medical-500 outline-none" />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Email</label>
                    <input type="email" id="email" name="email" value={newPatient.email} onChange={handleInputChange} className={`w-full bg-slate-50 dark:bg-slate-900 border ${formErrors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-lg px-3 py-2 focus:ring-2 focus:ring-medical-500 outline-none`} />
                    {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="source" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Origen</label>
                        <input type="text" id="source" name="source" value={newPatient.source} onChange={handleInputChange} placeholder="Ej. WhatsApp, referido" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-medical-500 outline-none" />
                    </div>
                    <div>
                        <label htmlFor="lifecycle_status" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Estado</label>
                        <select id="lifecycle_status" name="lifecycle_status" value={newPatient.lifecycle_status} onChange={handleInputChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-medical-500 outline-none">
                            {Object.entries(STATUS_TRANSLATIONS).map(([key, value]) => (
                                <option key={key} value={key}>{value}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Notas</label>
                  <textarea id="notes" name="notes" value={newPatient.notes} onChange={handleInputChange} rows={3} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-medical-500 outline-none resize-none"></textarea>
                </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-4 rounded-b-2xl">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-medical-500 hover:bg-medical-600 rounded-lg">Guardar Paciente</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {viewingNotesFor && (
        <AudioNotesModal patient={viewingNotesFor} onClose={() => setViewingNotesFor(null)} />
      )}
    </div>
  );
};
