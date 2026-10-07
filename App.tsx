import React, { useState, useEffect } from 'react';
import { DataProvider, useData } from './contexts/DataContext';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CaptureView } from './components/CaptureView';
import { PipelineView } from './components/PipelineView';
import { PatientList } from './components/PatientList';
import { AIAssistantView } from './components/AIAssistantView';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { theme, toggleTheme } = useData();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'capture': return <CaptureView onComplete={() => setActiveTab('pipeline')} setActiveTab={setActiveTab} />;
      case 'pipeline': return <PipelineView />;
      case 'patients': return <PatientList />;
      case 'assistant': return <AIAssistantView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        theme={theme} 
        toggleTheme={toggleTheme} 
        isMobile={isMobile}
      />
      <main className={`flex-1 overflow-auto transition-all duration-300 ease-in-out ${isMobile ? 'pb-20' : ''}`}>
        {renderContent()}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
};

export default App;