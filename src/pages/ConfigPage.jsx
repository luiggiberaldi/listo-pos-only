// ✅ SYSTEM IMPLEMENTATION - V. 2.7 (CLEAN CONFIG)
// Archivo: src/pages/ConfigPage.jsx
// Autorizado por Auditor en Fase 4 (Purge Complete)

import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
// Importación corregida a ruta relativa segura
import { useStore } from '../context/StoreContext';
import {
  Building2, Coins, Box, Receipt, Palette, ShieldCheck, Zap,
  Database, ChevronRight, Settings2, Lock, BrainCircuit, RefreshCw, Cable
} from 'lucide-react';
import Swal from 'sweetalert2';

import ConfigNegocio from './config/ConfigNegocio';
import ConfigFinanzas from './config/ConfigFinanzas';
import ConfigInventario from './config/ConfigInventario';
import ConfigTicket from './config/ConfigTicket';
import ConfigApariencia from './config/ConfigApariencia';

import ConfigSalud from './config/ConfigSalud';
import ConfigSeguridad from './config/ConfigSeguridad';
import ConfigActualizaciones from './config/ConfigActualizaciones';
import ConfigConexionLAN from './config/ConfigConexionLAN';


import { useSecureAction } from '../hooks/security/useSecureAction';
// 🔴 LIMPIEZA: Solo importamos el hook V2.5
import { PERMISOS, useRBAC } from '../hooks/store/useRBAC';

export default function ConfigPage() {
  const {
    configuracion, guardarConfiguracion, exportarDatos, importarDatos,
    obtenerTasaBCV, devMode, productos, ventas, clientes, usuario
  } = useStore();

  const { ejecutarAccionSegura } = useSecureAction();
  const { tienePermiso } = useRBAC(usuario);
  const location = useLocation(); // 👈 Hook para recibir params

  const [form, setForm] = useState(configuracion);

  // Si viene con estado 'tab', usarlo. Si no, default a 'negocio'.
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'negocio');

  const [loadingTasa, setLoadingTasa] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { setForm(configuracion); }, [configuracion]);

  useEffect(() => {
    if (form.modoOscuro) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [form.modoOscuro]);

  const menuGroups = [
    {
      id: 'comercio',
      label: 'Comercio',
      items: [
        { id: 'negocio', label: 'Mi Negocio', icon: Building2, perm: PERMISOS.CONF_NEGOCIO_VER },
        { id: 'ticket', label: 'Diseño Ticket', icon: Receipt, perm: PERMISOS.CONF_NEGOCIO_VER },
        { id: 'apariencia', label: 'Apariencia UI', icon: Palette, perm: PERMISOS.CONF_NEGOCIO_VER },
      ]
    },
    {
      id: 'gestion',
      label: 'Gestión Operativa',
      items: [
        { id: 'inventario', label: 'Inventario', icon: Box, perm: PERMISOS.INV_EDITAR },
        { id: 'finanzas', label: 'Finanzas/Tasa', icon: Coins, perm: PERMISOS.CONF_FINANZAS_VER },
      ]
    },
    {
      id: 'sistema',
      label: 'Seguridad y Sistema',
      items: [
        { id: 'seguridad', label: 'Mi Perfil/Equipo', icon: ShieldCheck, perm: PERMISOS.CONF_USUARIOS_VER },
        { id: 'multicaja', label: 'Multi-Caja', icon: Cable, perm: PERMISOS.CONF_SISTEMA_VER },
        { id: 'salud', label: 'Salud de Datos', icon: Database, perm: PERMISOS.CONF_SISTEMA_VER },
        { id: 'actualizaciones', label: 'Actualizaciones', icon: RefreshCw, perm: PERMISOS.CONF_SISTEMA_VER },
      ]
    }
  ];



  const isReadOnly = (tab) => {
    const map = {
      'negocio': PERMISOS.CONF_NEGOCIO_EDITAR,
      'ticket': PERMISOS.CONF_NEGOCIO_EDITAR,
      'apariencia': PERMISOS.CONF_NEGOCIO_EDITAR,
      'finanzas': PERMISOS.CONF_FINANZAS_EDITAR,
      'inventario': PERMISOS.INV_EDITAR,
      'seguridad': PERMISOS.CONF_USUARIOS_EDITAR,
      'salud': PERMISOS.CONF_SISTEMA_EDITAR,
      'ghost': PERMISOS.CONF_SISTEMA_EDITAR
    };
    return map[tab] ? !tienePermiso(map[tab]) : false;
  };

  const readOnly = isReadOnly(activeTab);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleThemeToggle = () => {
    const nuevoModo = !form.modoOscuro;
    const nuevoForm = { ...form, modoOscuro: nuevoModo };
    setForm(nuevoForm);
    guardarConfiguracion(nuevoForm);
  };

  const handleGuardar = (e) => {
    if (e) e.preventDefault();
    if (readOnly) return;
    console.log('💾 GUARDANDO CONFIGURACIÓN:', form);
    console.log('💾 sonidoBeep en config:', form.sonidoBeep);
    guardarConfiguracion({ ...form });
    console.log('✅ Configuración guardada en BD');
    Swal.fire({ icon: 'success', title: 'Configuración Actualizada', timer: 1000, showConfirmButton: false });
  };

  const handleSyncTasa = async () => {
    if (readOnly) return;
    setLoadingTasa(true);
    await obtenerTasaBCV(true, form.modoRedondeo);
    setLoadingTasa(false);
  };

  const handleArchivo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    ejecutarAccionSegura({
      permiso: PERMISOS.CONF_SISTEMA_EDITAR,
      nombreAccion: 'Restaurar Base de Datos',
      accion: () => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (importarDatos(event.target.result)) Swal.fire('Éxito', 'Base de datos restaurada', 'success').then(() => window.location.reload());
          else Swal.fire('Error', 'Archivo inválido', 'error');
        };
        reader.readAsText(file);
      }
    });
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50 dark:bg-slate-950">
      <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 text-slate-800 dark:text-white">
            <div className="p-2 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-500/20"><Settings2 size={20} /></div>
            <h1 className="text-lg font-black tracking-tight">Preferencias</h1>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
          {menuGroups.map(group => (
            <div key={group.id} className="space-y-2">
              <h3 className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{group.label}</h3>
              <div className="space-y-1">
                {group.items.map(item => {
                  if (item.perm && !tienePermiso(item.perm)) return null;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`
                          w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all group
                          ${activeTab === item.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-r-4 border-blue-600'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200'}
                        `}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={18} className={`${activeTab === item.id ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-500'}`} />
                        <span>{item.label}</span>
                      </div>
                      {activeTab === item.id && <ChevronRight size={14} className="animate-in slide-in-from-left-2" />}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 custom-scrollbar p-8">
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8 flex items-center gap-4">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
              {activeTab === 'negocio' && <Building2 className="text-blue-500" size={32} />}
              {activeTab === 'finanzas' && <Coins className="text-emerald-500" size={32} />}
              {activeTab === 'inventario' && <Box className="text-orange-500" size={32} />}
              {activeTab === 'salud' && <Database className="text-indigo-500" size={32} />}
              {activeTab === 'ticket' && <Receipt className="text-cyan-500" size={32} />}
              {activeTab === 'apariencia' && <Palette className="text-pink-500" size={32} />}
              {activeTab === 'seguridad' && <ShieldCheck className="text-emerald-600" size={32} />}
              {activeTab === 'actualizaciones' && <RefreshCw className="text-indigo-600" size={32} />}
              {activeTab === 'multicaja' && <Cable className="text-cyan-500" size={32} />}

            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white capitalize">
                {activeTab.replace('negocio', 'Información del Negocio')}
              </h2>
              {readOnly && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-500 text-[10px] font-bold uppercase tracking-wide mt-1">
                  <Lock size={10} /> Solo Lectura
                </span>
              )}
            </div>
          </div>

          <div className="animate-in fade-in duration-700">
            {activeTab === 'negocio' && <ConfigNegocio form={form} handleChange={handleChange} handleGuardar={handleGuardar} readOnly={readOnly} />}
            {activeTab === 'finanzas' && <ConfigFinanzas form={form} handleChange={handleChange} handleGuardar={handleGuardar} handleSyncTasa={handleSyncTasa} loadingTasa={loadingTasa} setForm={setForm} readOnly={readOnly} />}
            {activeTab === 'inventario' && <ConfigInventario form={form} setForm={setForm} handleGuardar={handleGuardar} readOnly={readOnly} />}
            {activeTab === 'salud' && <ConfigSalud readOnly={readOnly} />}
            {activeTab === 'ticket' && <ConfigTicket form={form} setForm={setForm} handleChange={handleChange} handleGuardar={handleGuardar} readOnly={readOnly} />}
            {activeTab === 'apariencia' && <ConfigApariencia form={form} setForm={setForm} handleGuardar={handleGuardar} handleThemeToggle={handleThemeToggle} readOnly={readOnly} />}
            {activeTab === 'seguridad' && <ConfigSeguridad exportarDatos={exportarDatos} handleArchivo={handleArchivo} fileInputRef={fileInputRef} readOnly={readOnly} />}
            {activeTab === 'actualizaciones' && <ConfigActualizaciones />}
            {activeTab === 'multicaja' && <ConfigConexionLAN />}


          </div>
        </div>
      </main>
    </div>
  );
}