import React, { useState } from 'react';
import { Activity } from 'lucide-react';

// Hooks
import { useMotorQuantum } from '../hooks/testing/useMotorQuantum';
import { useChaosValidator } from '../hooks/testing/useChaosValidator';
import { useRBACValidator } from '../hooks/testing/useRBACValidator';
import { useFinanceValidator } from '../hooks/testing/useFinanceValidator';
import { useSimulationInjectors } from '../hooks/testing/useSimulationInjectors';

// UI Components
import { SimTabs } from '../components/simulation/SimTabs';
import { QuantumPanel } from '../components/simulation/QuantumPanel';
import { ChaosPanel } from '../components/simulation/ChaosPanel';
import { SecurityPanel } from '../components/simulation/SecurityPanel';
import { FinancePanel } from '../components/simulation/FinancePanel';
import { ConsolePanel } from '../components/simulation/ConsolePanel';

const SimulationPage = () => {
  // Validators
  const vMain = useMotorQuantum();
  const vChaos = useChaosValidator();
  const vRBAC = useRBACValidator();
  const vFinance = useFinanceValidator();

  // Tools
  const injectors = useSimulationInjectors();
  const { handleCrearHarina } = injectors;

  // State
  const [activeTab, setActiveTab] = useState('finance');

  // Logs Logic
  const getCurrentLogs = () => {
    if (activeTab === 'sim') return vMain.logs;
    if (activeTab === 'chaos') return vChaos.logs;
    if (activeTab === 'rbac') return vRBAC.logs;
    if (activeTab === 'finance') return vFinance.logs;
    return [];
  };

  const isAnyRunning = vMain.isRunning || vChaos.isRunning || vRBAC.isRunning || vFinance.isRunning;

  return (
    <div className="p-4 max-w-7xl mx-auto bg-slate-50 dark:bg-slate-950 min-h-screen font-sans animate-in fade-in duration-500">

      {/* HEADER */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center justify-center gap-3">
          <Activity className="text-blue-600" /> AUDITORÍA QUANTUM V10
        </h1>
        <p className="text-slate-500 text-xs uppercase tracking-widest">Plataforma de Validación Integral [Definitive]</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* LEFT PANEL: CONTROLS */}
        <div className="w-full lg:w-3/5">
          <SimTabs activeTab={activeTab} setActiveTab={setActiveTab} />

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 min-h-[500px] flex flex-col">

            {activeTab === 'sim' && (
              <QuantumPanel
                vMain={vMain}
                vChaos={vChaos}
                handleCrearHarina={handleCrearHarina}
              />
            )}

            {activeTab === 'chaos' && (
              <ChaosPanel
                vMain={vMain}
                vChaos={vChaos}
                injectors={injectors}
              />
            )}

            {activeTab === 'rbac' && (
              <SecurityPanel vRBAC={vRBAC} />
            )}

            {activeTab === 'finance' && (
              <FinancePanel vFinance={vFinance} />
            )}

          </div>
        </div>

        {/* RIGHT PANEL: CONSOLE */}
        <ConsolePanel
          activeTab={activeTab}
          logs={getCurrentLogs()}
          isRunning={isAnyRunning}
        />

      </div>
    </div>
  );
};

export default SimulationPage;