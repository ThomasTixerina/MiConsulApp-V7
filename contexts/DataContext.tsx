import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Patient, LifecycleStatus, ThemeMode } from '../types';

interface DataContextType {
  patients: Patient[];
  addPatient: (patient: Patient) => void;
  updatePatient: (id: string, updatedData: Partial<Omit<Patient, 'id'>>) => void;
  deletePatient: (id: string) => void;
  // FIX: Add missing properties to the context type.
  theme: ThemeMode;
  toggleTheme: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const MOCK_PATIENTS: Patient[] = [
  { id: '1', name: 'Ana García', lifecycle_status: LifecycleStatus.OPPORTUNITY, source: 'WhatsApp', created_at: new Date().toISOString(), last_interaction: new Date().toISOString(), notes: 'Interesada en Invisalign.', attachmentUrl: 'https://i.imgur.com/3qA8Z4L.png', audioNotes: [
      { id: 'note1', audioUrl: 'https://www.soundjay.com/buttons/beep-07a.mp3', transcription: 'La paciente mencionó que tiene sensibilidad en los molares superiores y le gustaría discutir opciones de tratamiento.', createdAt: new Date(Date.now() - 86400000).toISOString() }
  ] },
  { id: '2', name: 'Carlos Ruiz', phone: '555-0199', lifecycle_status: LifecycleStatus.PROSPECT, source: 'Instagram', created_at: new Date(Date.now() - 86400000).toISOString(), last_interaction: new Date().toISOString(), notes: 'PDF de precios enviado.' },
  { id: '3', name: 'Elena Torres', lifecycle_status: LifecycleStatus.NEW_PATIENT_BOOKED, source: 'Web', created_at: new Date(Date.now() - 172800000).toISOString(), last_interaction: new Date().toISOString(), notes: 'Cita agendada para limpieza el próximo martes.' },
  { id: '4', name: 'Jorge Luna', lifecycle_status: LifecycleStatus.FIRST_TIME_PATIENT, source: 'Referido', created_at: new Date(Date.now() - 259200000).toISOString(), last_interaction: new Date().toISOString(), notes: 'Diagnóstico completo. Plan de tratamiento para carillas propuesto.' },
  { id: '5', name: 'Sofia Vargas', lifecycle_status: LifecycleStatus.OPPORTUNITY, source: 'Facebook', created_at: new Date(Date.now() - 345600000).toISOString(), last_interaction: new Date().toISOString(), notes: 'Pregunta sobre ortodoncia invisible.' },
  { id: '6', name: 'Luis Hernandez', lifecycle_status: LifecycleStatus.PROSPECT, source: 'Email', created_at: new Date(Date.now() - 432000000).toISOString(), last_interaction: new Date().toISOString(), notes: 'Solicitó cotización para implantes.' },
  { id: '7', name: 'Mariana Castro', lifecycle_status: LifecycleStatus.NEW_PATIENT_BOOKED, source: 'Llamada', created_at: new Date(Date.now() - 518400000).toISOString(), last_interaction: new Date().toISOString(), notes: 'Primera cita de valoración agendada.' },
  { id: '8', name: 'David Ramirez', lifecycle_status: LifecycleStatus.FIRST_TIME_PATIENT, source: 'Referido', created_at: new Date(Date.now() - 604800000).toISOString(), last_interaction: new Date().toISOString(), notes: 'Paciente referido por Ana García.' },
  { id: '9', name: 'Valeria Flores', lifecycle_status: LifecycleStatus.OPPORTUNITY, source: 'WhatsApp', created_at: new Date(Date.now() - 691200000).toISOString(), last_interaction: new Date().toISOString(), notes: 'Consulta por dolor de muela.' },
  { id: '10', name: 'Javier Morales', lifecycle_status: LifecycleStatus.PROSPECT, source: 'Instagram', created_at: new Date(Date.now() - 777600000).toISOString(), last_interaction: new Date().toISOString(), notes: 'Interesado en diseño de sonrisa.' },
  { id: '11', name: 'Camila Ortiz', lifecycle_status: LifecycleStatus.NEW_PATIENT_BOOKED, source: 'Web', created_at: new Date(Date.now() - 864000000).toISOString(), last_interaction: new Date().toISOString(), notes: 'Agendó cita para profilaxis.' },
  { id: '12', name: 'Ricardo Mendoza', lifecycle_status: LifecycleStatus.INACTIVE_PATIENT, source: 'Antiguo', created_at: new Date(Date.now() - 950400000).toISOString(), last_interaction: new Date(Date.now() - 950400000).toISOString(), notes: 'Última visita hace 1 año.' },
  { id: '13', name: 'Gabriela Silva', lifecycle_status: LifecycleStatus.OPPORTUNITY, source: 'Facebook', created_at: new Date(Date.now() - 1036800000).toISOString(), last_interaction: new Date().toISOString(), notes: 'Quiere saber si aceptamos su seguro.' },
  { id: '14', name: 'Mateo Rojas', lifecycle_status: LifecycleStatus.PROSPECT, source: 'Email', created_at: new Date(Date.now() - 1123200000).toISOString(), last_interaction: new Date().toISOString(), notes: 'Enviada información sobre carillas.' },
  { id: '15', name: 'Isabella Jimenez', lifecycle_status: LifecycleStatus.LOST, source: 'Web', created_at: new Date(Date.now() - 1209600000).toISOString(), last_interaction: new Date(Date.now() - 604800000).toISOString(), notes: 'No respondió a seguimiento.' },
  { id: '16', name: 'Daniel Soto', lifecycle_status: LifecycleStatus.FIRST_TIME_PATIENT, source: 'Llamada', created_at: new Date(Date.now() - 1296000000).toISOString(), last_interaction: new Date().toISOString(), notes: 'Tratamiento de conducto realizado.' },
  { id: '17', name: 'Paulina Navarro', lifecycle_status: LifecycleStatus.OPPORTUNITY, source: 'WhatsApp', created_at: new Date(Date.now() - 1382400000).toISOString(), last_interaction: new Date().toISOString(), notes: 'Pregunta por horario de atención.' },
  { id: '18', name: 'Sebastian Medina', lifecycle_status: LifecycleStatus.PROSPECT, source: 'Instagram', created_at: new Date(Date.now() - 1468800000).toISOString(), last_interaction: new Date().toISOString(), notes: 'Vio promoción de blanqueamiento.' },
  { id: '19', name: 'Andrea Guzman', lifecycle_status: LifecycleStatus.NEW_PATIENT_BOOKED, source: 'Referido', created_at: new Date(Date.now() - 1555200000).toISOString(), last_interaction: new Date().toISOString(), notes: 'Cita para el viernes a las 4pm.' },
  { id: '20', name: 'Fernando Rios', lifecycle_status: LifecycleStatus.FIRST_TIME_PATIENT, source: 'Web', created_at: new Date(Date.now() - 1641600000).toISOString(), last_interaction: new Date().toISOString(), notes: 'Se realizó limpieza y evaluación.' },
  { id: '21', name: 'Lucia Paredes', lifecycle_status: LifecycleStatus.OPPORTUNITY, source: 'Facebook', created_at: new Date(Date.now() - 1728000000).toISOString(), last_interaction: new Date().toISOString(), notes: 'Interesada en ortodoncia para su hijo.' },
  { id: '22', name: 'Alejandro Cruz', lifecycle_status: LifecycleStatus.PROSPECT, source: 'Email', created_at: new Date(Date.now() - 1814400000).toISOString(), last_interaction: new Date().toISOString(), notes: 'Solicita información de pago.' },
  { id: '23', name: 'Renata Leon', lifecycle_status: LifecycleStatus.NEW_PATIENT_BOOKED, source: 'Llamada', created_at: new Date(Date.now() - 1900800000).toISOString(), last_interaction: new Date().toISOString(), notes: 'Confirmó cita para mañana.' },
  { id: '24', name: 'Miguel Angel Reyes', lifecycle_status: LifecycleStatus.INACTIVE_PATIENT, source: 'Antiguo', created_at: new Date(Date.now() - 1987200000).toISOString(), last_interaction: new Date(Date.now() - 950400000).toISOString(), notes: 'Paciente antiguo, no ha vuelto.' },
  { id: '25', name: 'Ximena Ponce', lifecycle_status: LifecycleStatus.FIRST_TIME_PATIENT, source: 'Referido', created_at: new Date(Date.now() - 2073600000).toISOString(), last_interaction: new Date().toISOString(), notes: 'Vino por recomendación de un familiar.' },
];

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('miconsul_patients');
    // Simple migration for demo purposes
    if (saved && saved.includes('ACTIVE_PATIENT')) {
      return MOCK_PATIENTS;
    }
    return saved ? JSON.parse(saved) : MOCK_PATIENTS;
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('theme') as ThemeMode;
      if (stored) return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('miconsul_patients', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const addPatient = (patient: Patient) => {
    setPatients(prev => [patient, ...prev]);
  };

  const deletePatient = (id: string) => {
    setPatients(prev => prev.filter(p => p.id !== id));
  };

  const updatePatient = (id: string, updatedData: Partial<Omit<Patient, 'id'>>) => {
    setPatients(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, ...updatedData, last_interaction: new Date().toISOString() }
          : p
      )
    );
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <DataContext.Provider value={{ patients, addPatient, updatePatient, deletePatient, theme, toggleTheme }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within a DataProvider");
  return context;
};
