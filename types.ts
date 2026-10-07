import React from 'react';

export enum LifecycleStatus {
  OPPORTUNITY = 'OPPORTUNITY',
  PROSPECT = 'PROSPECT',
  NEW_PATIENT_BOOKED = 'NEW_PATIENT_BOOKED',
  FIRST_TIME_PATIENT = 'FIRST_TIME_PATIENT',
  INACTIVE_PATIENT = 'INACTIVE_PATIENT',
  LOST = 'LOST',
  ARCHIVED = 'ARCHIVED'
}

export interface AudioNote {
  id: string;
  audioUrl: string;
  transcription: string;
  createdAt: string;
}

export interface Patient {
  id: string;
  name: string;
  surname?: string;
  phone?: string;
  email?: string;
  lifecycle_status: LifecycleStatus;
  source?: string;
  notes?: string;
  created_at: string;
  last_interaction: string;
  attachmentUrl?: string;
  audioNotes?: AudioNote[];
}

export interface ExtractedOpportunity {
  name: string | null;
  phone: string | null;
  email: string | null;
  intent: 'SCHEDULE_APPOINTMENT' | 'NEW_LEAD_INQUIRY' | 'BILLING_QUESTION' | 'OTHER' | null;
  summary: string;
  confidence: number;
}

export type ThemeMode = 'light' | 'dark';

export interface NavItem {
  id: string;
  label: string;
  icon: React.FC<any>;
}