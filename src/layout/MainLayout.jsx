// ✅ SYSTEM IMPLEMENTATION - V. 1.8 (ZUSTAND MIGRATION)
// Archivo: src/layout/MainLayout.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, ShoppingCart, Package, Settings, LogOut, PieChart,
  Users, UserCircle, BarChart3,
  Wifi, WifiOff, ChevronLeft, ChevronRight,
  History, Brain
} from 'lucide-react';
// import { useStore } from '../context/StoreContext'; // 🗑️ DEPRECATED
import { useAuthStore } from '../stores/useAuthStore';
import { useConfigStore } from '../stores/useConfigStore';
import { useUIStore } from '../stores/useUIStore';
import Swal from 'sweetalert2';

import { PERMISOS, useRBAC } from '../hooks/store/useRBAC';
import { verifySecurityCode } from '../utils/securityUtils';
import SecurityAdvisory from '../components/security/SecurityAdvisory';
import SecurityReportPanel from '../components/security/SecurityReportPanel';
import SecurityCriticalGate from '../components/security/SecurityCriticalGate';
import { useListoGoSync } from '../hooks/sync/useListoGoSync';
import { useRemoteTasa } from '../hooks/sync/useRemoteTasa';

const SidebarItem = ({ to, icon: Icon, label, collapsed }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const playSound = useUIStore(s => s.playSound);

  return (
    <Link
      to={to}
      onClick={() => playSound && playSound('CLICK')}
      title={collapsed ? label : ''}
      className={`
              flex items-center py-3 rounded-lg transition-all duration-200 mb-1 flex-shrink-0
              ${collapsed ? 'justify-center px-2' : 'px-4 gap-3'} 
              ${isActive
          ? 'bg-primary text-white shadow-md shadow-primary/30'
          : 'text-content-secondary hover:bg-app-light dark:hover:bg-surface-dark hover:text-primary'}
            `}
    >
      <Icon size={20} className="min-w-[20px]" />
      <span className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
        {label}
      </span>
    </Link>
  );
};

export default function MainLayout() {
  // ⚡ ZUSTAND ATOMIC STORES
  const { usuario, logout } = useAuthStore();
  const { configuracion, setDevMode } = useConfigStore(); // Note: setDevMode might need checks if it exists in store
  const { playSound, isSidebarOpen, toggleSidebar } = useUIStore();

  // Adapter: UI Store 'isSidebarOpen' maps to 'isCollapsed' logic inversely
  // Or we change the layout logic. Let's keep variable name 'isCollapsed' derived from store.
  const isCollapsed = !isSidebarOpen;

  const { tienePermiso } = useRBAC(usuario);
  const navigate = useNavigate();

  // 🔄 BACKGROUND SERVICES
  useListoGoSync();
  useRemoteTasa();

  const canSell = tienePermiso(PERMISOS.POS_ACCESO);
  const canCloseBox = tienePermiso(PERMISOS.CAJA_CERRAR);
  const canManageClients = tienePermiso(PERMISOS.CLI_VER);
  const canViewInventory = tienePermiso(PERMISOS.INV_VER);
  const canViewReports = tienePermiso(PERMISOS.REP_VER_DASHBOARD);
  const canViewHistory = tienePermiso(PERMISOS.REP_VER_VENTAS);  // ✅ NUEVO
  const canConfigure = tienePermiso(PERMISOS.CONF_ACCESO);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // const [isCollapsed, setIsCollapsed] = useState(false); // ⚡ REPLACED BY ZUSTAND UISTORE

  // 🕒 SYSTEM CLOCK
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // const logoSidebar = configuracion?.modoOscuro ? '/logodark.png' : '/logo.png'; // Removed in favor of Logo component
  const logoSize = configuracion?.logoSizeSidebar || 120;

  const [logoClicks, setLogoClicks] = useState(0);
  const clickTimeoutRef = useRef(null);

  const handleLogoClick = () => {
    if (playSound) playSound('CLICK');
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    const newCount = logoClicks + 1;
    setLogoClicks(newCount);

    if (newCount >= 7) {
      Swal.fire({
        title: 'ACCESO RESTRINGIDO',
        text: 'Introduce el PIN Maestro',
        input: 'password',
        showCancelButton: true,
        confirmButtonText: 'Desbloquear',
        confirmButtonColor: '#000000',
        preConfirm: async (inputValue) => {
          const isValid = await verifySecurityCode(inputValue, 'VITE_GOD_MODE_HASH');
          if (!isValid) Swal.showValidationMessage('Acceso Denegado');
          return isValid;
        }
      }).then((result) => {
        if (result.isConfirmed) {
          setDevMode(true);
          Swal.fire('GOD MODE ACTIVADO');
        }
      });
      setLogoClicks(0);
    } else {
      clickTimeoutRef.current = setTimeout(() => { setLogoClicks(0); }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 flex bg-app-light dark:bg-app-dark overflow-hidden transition-colors duration-300">

      <aside
        className={`
          bg-surface-light dark:bg-surface-dark border-r border-border-subtle 
          flex flex-col h-full shadow-xl z-20 relative transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        <button
          onClick={() => { toggleSidebar(); if (playSound) playSound('CLICK'); }}
          className="absolute -right-3 top-9 bg-surface-light dark:bg-surface-dark border border-border-subtle text-content-secondary hover:text-primary rounded-full p-1 shadow-md transition-colors z-50"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="p-4 border-b border-border-subtle flex flex-col items-center flex-shrink-0">

          {/* 1. LOGO COMPACTO */}
          <div
            className={`flex items-center justify-center transition-all duration-300 relative cursor-pointer ${isCollapsed ? 'mb-4' : 'mb-2 px-2'}`}
            style={{ height: '80px' }}
            onClick={handleLogoClick}
          >
            {isCollapsed ? (
              // 🟢 LOGO COLLAPSED: SOLO ICONO (ISOTIPO)
              <div className="relative w-12 h-12 flex items-center justify-center animate-in zoom-in duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                    <line x1="12" y1="2" x2="12" y2="12"></line>
                  </svg>
                </div>
              </div>
            ) : (
              // 🔵 LOGO EXPANDED: IMAGEN ORIGINAL
              <img
                src={configuracion?.modoOscuro ? 'logodark.png' : 'logo.png'}
                alt="LISTO POS"
                className="transition-all duration-300 object-contain animate-in fade-in slide-in-from-left-4 duration-500"
                style={{ height: '88px', width: 'auto' }}
              />
            )}
          </div>

          {/* 2. USER CARD + STATUS INTEGRADO (Minimalista) */}
          <div className={`flex items-center gap-3 transition-all w-full mt-2 ${isCollapsed ? 'justify-center flex-col' : 'px-2'}`}>

            {/* Avatar con Indicador de Estado */}
            <div className="relative">
              <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full ring-1 ring-slate-200 dark:ring-slate-700">
                <UserCircle size={isCollapsed ? 20 : 24} className="text-slate-600 dark:text-slate-400" />
              </div>
            </div>

            {!isCollapsed && (
              <div className="overflow-hidden flex flex-col justify-center">
                <p className="text-xs font-bold text-content-main truncate max-w-[120px] leading-tight">{usuario?.nombre || 'Usuario'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider">{usuario?.rol || 'Invitado'}</span>

                  {/* Status Badge */}
                  <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${isOnline
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
                    <span className="text-[9px] font-bold leading-none pb-[1px]">
                      {isOnline ? 'En Línea' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto overflow-x-hidden min-h-0 custom-scrollbar">
          {isCollapsed ? <div className="h-px bg-border-subtle mx-2 my-4"></div> : <p className="text-[10px] font-bold text-content-secondary uppercase tracking-wider mb-2 px-2 mt-2">Operaciones</p>}
          <SidebarItem to="/" icon={Home} label="Inicio" collapsed={isCollapsed} />
          {canSell && <SidebarItem to="/vender" icon={ShoppingCart} label="Caja (Ventas)" collapsed={isCollapsed} />}
          {canCloseBox && <SidebarItem to="/cierre" icon={PieChart} label="Cierre de Caja" collapsed={isCollapsed} />}
          {canViewHistory && <SidebarItem to="/historial-ventas" icon={History} label="Historial Global" collapsed={isCollapsed} />}

          {canManageClients && <SidebarItem to="/clientes" icon={Users} label="Gestión de Clientes" collapsed={isCollapsed} />}

          {isCollapsed ? <div className="h-px bg-border-subtle mx-2 my-4"></div> : <div className="my-2 border-t border-border-subtle pt-2"><p className="text-[10px] font-bold text-content-secondary uppercase tracking-wider mb-2 px-2">Control</p></div>}
          {canViewReports && <SidebarItem to="/reportes" icon={BarChart3} label="Estadísticas" collapsed={isCollapsed} />}
          {canViewInventory && <SidebarItem to="/inventario" icon={Package} label="Inventario Maestro" collapsed={isCollapsed} />}
        </nav>

        <div className="p-3 border-t border-border-subtle flex-shrink-0 bg-surface-light dark:bg-surface-dark z-10 flex flex-col gap-1">

          {/* 🕒 SYSTEM CLOCK (Option 2) */}
          <div className={`flex flex-col items-center justify-center mb-2 select-none group cursor-default transition-all duration-300 ${isCollapsed ? 'opacity-100 scale-90' : 'opacity-100'}`}>
            <p className="text-sm font-black text-content-main dark:text-content-inverse leading-none group-hover:text-primary transition-colors">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/AM|PM/, '').trim()}
            </p>
            <p className="text-[8px] font-bold text-content-secondary uppercase tracking-wider">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).match(/AM|PM/)?.[0] || ''}
            </p>
          </div>

          {usuario && canConfigure && <SidebarItem to="/ia" icon={Brain} label="IA" collapsed={isCollapsed} />}
          {usuario && canConfigure && <SidebarItem to="/configuracion" icon={Settings} label="Configuración" collapsed={isCollapsed} />}
          <button
            onClick={() => { if (playSound) playSound('CLICK'); logout(); }}
            className={`w-full flex items-center py-3 text-status-danger hover:bg-status-dangerBg/20 rounded-lg transition-colors ${isCollapsed ? 'justify-center px-2' : 'px-4 gap-3'}`}
            title={isCollapsed ? "Cerrar Sesión" : ""}
          >
            <LogOut size={20} className="min-w-[20px]" />
            {!isCollapsed && <span className="font-medium whitespace-nowrap">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-app-light dark:bg-app-dark">
        {!isOnline && <div className="bg-amber-500 text-white text-xs font-bold text-center py-1 w-full z-50 shadow-md flex-shrink-0">⚠️ SIN CONEXIÓN A INTERNET</div>}
        <SecurityAdvisory />
        <SecurityReportPanel />
        <SecurityCriticalGate />

        <div className="flex-1 overflow-auto p-0 relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}