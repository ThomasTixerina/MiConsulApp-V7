import React from 'react';
import { NavItem, ThemeMode } from '../types';
import { LayoutDashboard, KanbanSquare, Users, Sparkles, Sun, Moon, Stethoscope } from 'lucide-react';
import { Logo } from './Logo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  isMobile: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard },
  { id: 'capture', label: 'Captura (IA)', icon: Sparkles },
  { id: 'pipeline', label: 'Flujo (Pipeline)', icon: KanbanSquare },
  { id: 'patients', label: 'Pacientes', icon: Users },
  { id: 'assistant', label: 'Asistente IA', icon: Stethoscope },
];

const NavButton: React.FC<{
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}> = ({ item, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-colors duration-200 ${
        isActive
          ? 'bg-medical-50 dark:bg-medical-900/30 text-medical-600 dark:text-medical-400 font-medium'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
      }`}
      aria-label={item.label}
    >
      <item.icon size={20} />
      <span>{item.label}</span>
    </button>
  );
};


export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, theme, toggleTheme, isMobile }) => {
  const containerClasses = isMobile
    ? "fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-4 py-2 flex justify-between items-center z-50"
    : `bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col p-4 h-screen sticky top-0 w-64`;

  if (isMobile) {
    return (
      <aside className={containerClasses}>
        <nav className="flex flex-row w-full justify-around">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1 flex-col text-xs py-1 px-3 rounded-lg transition-colors duration-200 ${
                activeTab === item.id
                  ? 'bg-medical-50 dark:bg-medical-900/30 text-medical-600 dark:text-medical-400 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside className={containerClasses}>
      <div className="mb-8 flex items-center gap-2 px-2">
        <Logo />
      </div>

      <nav className="flex flex-col gap-2 flex-1">
        {NAV_ITEMS.map(item => (
          <NavButton
            key={item.id}
            item={item}
            isActive={activeTab === item.id}
            onClick={() => setActiveTab(item.id)}
          />
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          <span>{theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}</span>
        </button>
      </div>
    </aside>
  );
};