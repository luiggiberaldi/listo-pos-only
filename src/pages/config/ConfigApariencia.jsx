import React, { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import {
  Monitor, Save, Maximize, ZoomIn, ZoomOut,
  MousePointerClick, Volume2, VolumeX, CheckCircle2,
  Activity, Zap, LayoutTemplate
} from 'lucide-react';
import Swal from 'sweetalert2';

const isElectron = !!window.electronAPI;

export default function ConfigApariencia({
  form = {},
  setForm = () => { },
  handleGuardar = () => { }
}) {
  const { devMode, setDevMode } = useStore();
  const navigate = useNavigate();
  const [resolution, setResolution] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(form.zoomLevel || 100);
  const [secretClicks, setSecretClicks] = useState(0);

  useEffect(() => {
    if (form.zoomLevel && form.zoomLevel !== zoom) {
      setZoom(form.zoomLevel);
    }
  }, [form.zoomLevel]);

  useEffect(() => {
    const updateRes = () => {
      setResolution({ width: window.screen.width, height: window.screen.height });
      const isLikelyTouch = window.matchMedia("(pointer: coarse)").matches;

      if (isLikelyTouch && form.modoTouch === undefined) {
        setForm(prev => ({ ...prev, modoTouch: true }));
      }
    };

    window.addEventListener('resize', updateRes);
    updateRes();
    return () => window.removeEventListener('resize', updateRes);
  }, [form.modoTouch, setForm]);

  const handleZoom = (delta) => {
    const newZoom = Math.max(80, Math.min(150, zoom + delta));
    setZoom(newZoom);
    setForm(prev => ({ ...prev, zoomLevel: newZoom }));
    document.body.style.zoom = `${newZoom}%`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.log(e));
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const handleSecretTrigger = () => {
    setSecretClicks(prev => prev + 1);
    if (secretClicks + 1 === 5) {
      setDevMode(true);
      Swal.fire({
        icon: 'success',
        title: 'MODO DESARROLLADOR',
        text: 'Laboratorio de Simulación Activado 🧪',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  return (
    <div className="animate-in fade-in duration-700 max-w-6xl mx-auto pb-20">

      {/* 1. HERO SECTION MINIMALISTA */}
      <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100 mb-8 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        {/* Background Decorative Blob */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>

        <div className="flex items-center gap-6">
          <div
            onClick={handleSecretTrigger}
            className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 cursor-pointer active:scale-95 transition-transform"
          >
            <LayoutTemplate size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Apariencia Visual</h1>
            <p className="text-slate-500 font-medium">Personaliza la ergonomía y accesibilidad de tu terminal.</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resolución Activa</span>
          <div className="flex items-center gap-2 text-slate-900 font-mono font-bold text-lg bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
            <Monitor size={16} className="text-slate-400" /> {resolution.width} x {resolution.height}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* === COLUMNA IZQUIERDA: CONTROLES PRINCIPALES (7/12) === */}
        <div className="lg:col-span-7 space-y-8">

          {/* CARD 1: ESCALA DE INTERFAZ */}
          <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100 relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Monitor size={120} />
            </div>

            <div className="flex justify-between items-center mb-8 relative z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Escala de Interfaz</h3>
                <p className="text-slate-500 text-sm mt-1">Ajusta el tamaño de textos y botones.</p>
              </div>
              <span className="bg-slate-900 text-white text-sm font-bold px-3 py-1.5 rounded-lg shadow-lg shadow-slate-900/20">{zoom}%</span>
            </div>

            <div className="flex items-center gap-6 relative z-10">
              <button type="button" onClick={() => handleZoom(-10)} className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-600 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-colors active:scale-95">
                <ZoomOut size={22} />
              </button>

              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-900 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(5, (zoom - 80) * (100 / 70))}%` }}
                ></div>
              </div>

              <button type="button" onClick={() => handleZoom(10)} className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-600 rounded-2xl border border-slate-200 hover:bg-slate-100 transition-colors active:scale-95">
                <ZoomIn size={22} />
              </button>
            </div>
          </div>

          {/* CARD 2: ERGONOMÍA & ACCESIBILIDAD */}
          <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <MousePointerClick size={20} className="text-slate-400" /> Ergonomía & Accesibilidad
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* TOUCH MODE (HIDDEN FOR NOW) */}
              {/* <button
                onClick={() => setForm({ ...form, modoTouch: !form.modoTouch })}
                className={`p-6 rounded-2xl border-2 transition-all text-left flex flex-col justify-between h-32 ${form.modoTouch ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
              >
                <div className="flex justify-between items-start w-full">
                  <div className={`p-2 rounded-lg ${form.modoTouch ? 'bg-blue-500 text-white' : 'bg-white text-slate-400'}`}>
                    <MousePointerClick size={20} />
                  </div>
                  {form.modoTouch && <CheckCircle2 size={20} className="text-blue-500" />}
                </div>
                <div>
                  <span className={`block font-bold ${form.modoTouch ? 'text-blue-700' : 'text-slate-600'}`}>Modo Táctil</span>
                  <span className="text-xs text-slate-400">Botones grandes</span>
                </div>
              </button> */}

              {/* SOUND MODE */}
              <button
                onClick={() => {
                  const newValue = !form.sonidoBeep;
                  console.log('🔊 TOGGLE SONIDO - Valor anterior:', form.sonidoBeep);
                  console.log('🔊 TOGGLE SONIDO - Valor nuevo:', newValue);
                  setForm({ ...form, sonidoBeep: newValue });
                  console.log('🔊 TOGGLE SONIDO - Estado actualizado');
                }}
                className={`p-6 rounded-2xl border-2 transition-all text-left flex flex-col justify-between h-32 ${form.sonidoBeep ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
              >
                <div className="flex justify-between items-start w-full">
                  <div className={`p-2 rounded-lg ${form.sonidoBeep ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400'}`}>
                    {form.sonidoBeep ? <Volume2 size={20} /> : <VolumeX size={20} />}
                  </div>
                  {form.sonidoBeep && <CheckCircle2 size={20} className="text-emerald-500" />}
                </div>
                <div>
                  <span className={`block font-bold ${form.sonidoBeep ? 'text-emerald-700' : 'text-slate-600'}`}>Sonido</span>
                  <span className="text-xs text-slate-400">Feedback auditivo</span>
                </div>
              </button>

              {/* FULLSCREEN MODE */}
              <button
                onClick={toggleFullscreen}
                className="md:col-span-2 p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-slate-500 font-bold flex items-center justify-center gap-2"
              >
                <Maximize size={18} /> Activar Pantalla Completa
              </button>
            </div>
          </div>

        </div>

        {/* === COLUMNA DERECHA: INFO Y EXTRAS (5/12) === */}
        <div className="lg:col-span-5 space-y-8">

          {/* INFO PANEL */}
          <div className="bg-slate-900 rounded-[2rem] p-8 shadow-2xl shadow-slate-900/20 text-white relative overflow-hidden">
            <div className="absolute -bottom-10 -right-10 opacity-10">
              <Zap size={200} />
            </div>

            <h3 className="text-xl font-bold mb-4">Información del Sistema</h3>

            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center py-3 border-b border-white/10">
                <span className="text-slate-400 text-sm">Entorno</span>
                <span className="font-mono text-sm font-bold flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isElectron ? 'bg-blue-500' : 'bg-orange-500'}`}></span>
                  {isElectron ? 'Electron (App)' : 'Navegador Web'}
                </span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-slate-500 text-xs leading-relaxed">
                Este sistema está optimizado para funcionar en resoluciones superiores a 1024x768px.
                Para una mejor experiencia en puntos de venta táctiles, active el "Modo Táctil".
              </p>
            </div>
          </div>

          {/* DANGER ZONE (Dev Mode Only) */}
          {devMode && (
            <div className="animate-in slide-in-from-bottom duration-500">
              <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] relative overflow-hidden">
                <h4 className="text-lg font-black flex items-center gap-2 text-amber-600 mb-2">
                  <Activity size={20} /> ZONA DE PRUEBAS
                </h4>
                <p className="text-amber-700/70 text-sm mb-4">
                  Acceso a herramientas de simulación y estrés.
                </p>
                <button
                  onClick={() => navigate('/simulation')}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-amber-500/20"
                >
                  ABRIR LABORATORIO
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* FLOAT ACTION BAR */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={handleGuardar}
          className="pl-6 pr-8 py-4 bg-slate-900 text-white rounded-full font-black text-sm uppercase tracking-widest shadow-2xl shadow-slate-900/40 hover:-translate-y-1 hover:shadow-slate-900/50 transition-all flex items-center gap-3 active:scale-95 border-2 border-white/10"
        >
          <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm">
            <Save size={18} className="text-white" />
          </div>
          Guardar Cambios
        </button>
      </div>

    </div>
  );
}