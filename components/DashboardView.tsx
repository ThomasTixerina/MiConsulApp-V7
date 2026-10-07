import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { LifecycleStatus } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, CalendarCheck, TrendingUp, Activity, Sparkles, Search, Mic } from 'lucide-react';

const KPICard: React.FC<{ title: string; value: string | number; icon: React.FC<any>; trend?: string }> = ({ title, value, icon: Icon, trend }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{value}</h3>
      </div>
      <div className="p-3 bg-medical-50 dark:bg-medical-900/30 rounded-xl text-medical-500 dark:text-medical-400">
        <Icon size={24} />
      </div>
    </div>
    {trend && <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><TrendingUp size={16} /> {trend}</p>}
  </div>
);

const STATUS_TRANSLATIONS: Record<string, string> = {
  [LifecycleStatus.OPPORTUNITY]: 'Oportunidad',
  [LifecycleStatus.PROSPECT]: 'Prospecto',
  [LifecycleStatus.NEW_PATIENT_BOOKED]: 'Cita Agendada',
  [LifecycleStatus.FIRST_TIME_PATIENT]: 'Paciente de 1ª Vez',
  [LifecycleStatus.INACTIVE_PATIENT]: 'Inactivo',
  [LifecycleStatus.LOST]: 'Perdido'
};

const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#6366F1']; // amber-500, blue-500, emerald-500, indigo-500

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, name, percent, fill }) => {
  if (percent === 0) return null;

  const sin = Math.sin(-midAngle * RADIAN);
  const cos = Math.cos(-midAngle * RADIAN);
  const sx = cx + (outerRadius + 5) * cos;
  const sy = cy + (outerRadius + 5) * sin;
  const mx = cx + (outerRadius + 20) * cos;
  const my = cy + (outerRadius + 20) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={sx} cy={sy} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 6} y={ey} textAnchor={textAnchor} fill="currentColor" className="text-sm font-medium text-slate-600 dark:text-slate-300">
        {name}
      </text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 6} y={ey} dy={18} textAnchor={textAnchor} fill={fill} className="text-base font-bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    </g>
  );
};

export const DashboardView: React.FC = () => {
  const { patients } = useData();
  const [activitySearchTerm, setActivitySearchTerm] = useState('');

  const opportunities = patients.filter(p => p.lifecycle_status === LifecycleStatus.OPPORTUNITY).length;
  const prospects = patients.filter(p => p.lifecycle_status === LifecycleStatus.PROSPECT).length;
  const booked = patients.filter(p => p.lifecycle_status === LifecycleStatus.NEW_PATIENT_BOOKED).length;
  const firstTime = patients.filter(p => p.lifecycle_status === LifecycleStatus.FIRST_TIME_PATIENT).length;

  const data = [
    { name: 'Oportunidades', value: opportunities },
    { name: 'Prospectos', value: prospects },
    { name: 'Agendados', value: booked },
    { name: '1ª Vez', value: firstTime },
  ];
  
  const filteredActivityPatients = patients.filter(patient => {
    if (!activitySearchTerm.trim()) {
      return true;
    }
    const term = activitySearchTerm.toLowerCase();
    const statusText = STATUS_TRANSLATIONS[patient.lifecycle_status]?.toLowerCase() || '';
    const fullName = `${patient.name} ${patient.surname || ''}`.toLowerCase();
    
    return fullName.includes(term) || statusText.includes(term);
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Buenos días, Dr. Smith</h1>
        <p className="text-slate-500 dark:text-slate-400">Aquí tiene el resumen de su consulta para hoy.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Nuevas Oportunidades" value={opportunities} icon={Sparkles} trend="+12% vs semana pasada" />
        <KPICard title="Prospectos Activos" value={prospects} icon={Users} />
        <KPICard title="Citas Agendadas" value={booked} icon={CalendarCheck} trend="+5% vs semana pasada" />
        <KPICard title="Pacientes de 1ª Vez" value={firstTime} icon={Activity} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <h2 className="text-lg font-semibold mb-6 text-slate-900 dark:text-white">Flujo de Pacientes</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                  labelLine={false}
                  label={renderCustomizedLabel}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: 'none', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(4px)',
                  }}
                  formatter={(value, name) => [`${value} Pacientes`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col">
          <div className="flex justify-between items-center mb-4 gap-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex-shrink-0">Actividad Reciente</h2>
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Nombre o estado..."
                  value={activitySearchTerm}
                  onChange={(e) => setActivitySearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-1.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-medical-500 outline-none text-sm"
                />
              </div>
              <button 
                  onClick={() => alert('Búsqueda por voz próximamente.')}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label="Buscar por voz"
              >
                  <Mic size={18} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto -mr-3 pr-3">
            {filteredActivityPatients.length > 0 ? (
              <div className="space-y-4">
                {filteredActivityPatients.map(patient => (
                  <div key={patient.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-xl transition-colors">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      patient.lifecycle_status === 'NEW_PATIENT_BOOKED' ? 'bg-emerald-500' : 
                      patient.lifecycle_status === 'OPPORTUNITY' ? 'bg-amber-500' : 'bg-medical-500'
                    }`} />
                    <div className="flex-1 overflow-hidden">
                      <h4 className="text-sm font-medium text-slate-900 dark:text-white truncate">{patient.name} {patient.surname}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{patient.notes || 'Estado actualizado'}</p>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(patient.last_interaction).toLocaleDateString('es-ES', {month: 'short', day: 'numeric'})}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400">
                  <p className="font-medium">No se encontraron pacientes</p>
                  <p className="text-sm">Intenta con otro término de búsqueda.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};