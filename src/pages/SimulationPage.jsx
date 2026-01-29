import React, { useState, useEffect, useRef } from 'react';
import { useMotorQuantum } from '../hooks/testing/useMotorQuantum';
import { useChaosValidator } from '../hooks/testing/useChaosValidator';
import { useRBACValidator } from '../hooks/testing/useRBACValidator';
import RBACAuditCard from '../components/testing/RBACAuditCard'; // 🆕 IMPORT
import { useConfigContext } from '../context/ConfigContext';
import {
  Activity, Terminal, Check, Clipboard, Square, Microscope, Zap, Siren, ShieldCheck, PackagePlus, Users, PlusCircle, Skull, Lock,
  Scale, AlertTriangle, Database, Settings, DollarSign // 🆕 Added icons
} from 'lucide-react';
import { db } from '../db';
import Swal from 'sweetalert2';

const SimulationPage = () => {
  // Use the definitive hook:
  const vMain = useMotorQuantum();
  const vChaos = useChaosValidator(); // 🆕 INSTANCE
  const vRBAC = useRBACValidator(); // 🆕 INSTANCE
  const { configuracion, updateConfiguracion } = useConfigContext();

  // Map internal hook state names to UI expected names if needed, 
  // or update UI to match hook. Hook returns { ejecutarSimulacion, isRunning, logs, progress }

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('sim'); // 'sim', 'chaos', 'rbac'
  const logsEndRef = useRef(null);

  // Auto-scroll logic
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [vMain.logs, vChaos.logs, vRBAC.logs, activeTab]);

  const handleCopyLogs = () => {
    const currentLogs = activeTab === 'sim' ? vMain.logs
      : activeTab === 'chaos' ? vChaos.logs
        : vRBAC.logs;

    if (currentLogs.length === 0) return;
    const cleanLogs = currentLogs.join('\n');
    navigator.clipboard.writeText(cleanLogs)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  // --- 🪄 GENERADOR DE PRODUCTO DE PRUEBA ---
  const handleCrearHarina = async () => {
    try {
      // 1. 🧹 LIMPIEZA TOTAL DE BASE DE DATOS
      await Promise.all([
        db.productos.clear(),
        db.ventas.clear(),
        db.clientes.clear(),
        db.logs.clear(),
        db.tickets_espera.clear(),
        db.outbox.clear(),
        db.cortes.clear(),
        db.caja_sesion.clear(),
        // No borramos config aun para preservarla y editarla, o la borramos y creamos nueva
        db.config.clear()
      ]);

      // 2. 💲 CONFIGURAR TASA A 200
      const configInicial = {
        key: 'general',
        nombre: 'MI NEGOCIO',
        direccion: 'Dirección de Prueba',
        rif: 'J-00000000-0',
        telefono: '0412-0000000',
        tasa: 200, // 👈 TASA FIJA SOLICITADA
        iva: 16,
        monedaItems: 'usd',
        monedaTotales: 'both'
      };
      await db.config.put(configInicial);

      // 2.5 👤 CREAR CLIENTE TEST (LUIGI BERALDI)
      const clienteLuigi = {
        nombre: "Luigi Beraldi",
        documento: "26.353.469",
        telefono: "0412-1234567",
        direccion: "San Cristobal",
        deuda: 0,
        favor: 0,
        saldo: 0,
        fecha_registro: new Date().toISOString()
      };
      await db.clientes.add(clienteLuigi);

      // 3. 📦 CREAR PRODUCTO TEST
      const baseCostBulto = 20;
      const unitsPerBulto = 20;
      const costoUnitario = baseCostBulto / unitsPerBulto; // $1.00

      const productoTest = {
        nombre: "HARINA PAN (TEST)",
        codigo: "HPAN-TEST",
        categoria: "Alimentos",
        precio: 1.50,         // ✅ PVP Unidad: $1.5 SOLICITADO
        costo: costoUnitario, // Costo Unidad ($1.00)
        stock: 200,           // 10 Bultos * 20u = 200u
        tipoUnidad: 'unidad',
        favorito: true,
        fecha_registro: new Date().toISOString(),

        // 📦 JERARQUÍA
        jerarquia: {
          bulto: {
            activo: true,
            nombre: "Bulto",
            contenido: unitsPerBulto, // ✅ CORREGIDO: contenido
            precio: 25.00,           // PVP Bulto
            codigo: "HPAN-BULTO"
          },
          paquete: { activo: false, nombre: "Paquete", contenido: 1, precio: 0, codigo: "" }
        },

        // Impuestos (Con IVA solicitado)
        aplicaIva: true,
        exento: false
      };

      await db.productos.add(productoTest);

      // 4. 🔄 RECARGAR PARA APLICAR CAMBIOS DE CONTEXTO
      Swal.fire({
        icon: 'success',
        title: '¡ENTORNO DE PRUEBA LISTO!',
        html: 'Base de datos limpia.<br>Tasa: <b>200 Bs/$</b><br>Producto creado.',
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        window.location.reload(); // Necesario para que el Context recargue la config
      });

    } catch (error) {
      console.error("Error creando entorno test:", error);
      Swal.fire('Error', `No se pudo crear el entorno: ${error.message}`, 'error');
    }
  };

  // --- 🧪 HERRAMIENTAS DE CAOS (CHAOS TEST) ---
  const injectScaleProduct = async () => {
    await db.productos.put({
      id: 'SCALE-TEST-1',
      nombre: 'MANZANAS GALA (TEST)',
      codigo: '1010', // PLU
      precio: 5.00,
      stock: 100,
      tipoUnidad: 'peso',
      categoria: 'Frutas',
      jerarquia: null
    });
    Swal.fire('Inyectado', 'Producto "Manzanas" con PLU 1010 creado. (Código Scan: 201010015000)', 'success');
  };

  const injectCorruptProduct = async () => {
    await db.productos.put({
      id: 'CORRUPT-1',
      nombre: 'PRODUCTO GLITCH (CORRUPTO)',
      codigo: 'GLITCH',
      precio: 'NaN', // String NaN
      stock: null, // Null
      jerarquia: undefined
    });
    Swal.fire('Inyectado', 'Producto Corrupto creado. Busca "GLITCH" en POS para probar Crash-to-Reset.', 'warning');
  };

  const setNegativeStock = async () => {
    const p = await db.productos.orderBy('id').first();
    if (p) {
      await db.productos.update(p.id, { stock: -10 });
      Swal.fire('Stock Negativo', `Producto "${p.nombre}" set stock -10.`, 'info');
    } else {
      Swal.fire('Error', 'No hay productos para modificar.', 'error');
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto bg-slate-50 dark:bg-slate-950 min-h-screen font-sans animate-in fade-in duration-500">

      <div className="mb-6 text-center">
        <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center justify-center gap-3">
          <Activity className="text-blue-600" /> AUDITORÍA QUANTUM V10
        </h1>
        <p className="text-slate-500 text-xs uppercase tracking-widest">Plataforma de Validación Integral [Definitive]</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* PANEL IZQUIERDO: CONTROL */}
        <div className="w-full lg:w-3/5">
          {/* 📑 TABS NAVIGATION */}
          <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6 gap-2">
            <button
              onClick={() => setActiveTab('sim')}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-tighter flex items-center justify-center gap-2 transition-all ${activeTab === 'sim' ? 'bg-blue-600 text-white shadow-lg scale-[1.02]' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <Zap size={16} /> Simulación
            </button>
            <button
              onClick={() => setActiveTab('chaos')}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-tighter flex items-center justify-center gap-2 transition-all ${activeTab === 'chaos' ? 'bg-red-600 text-white shadow-lg scale-[1.02]' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <Skull size={16} /> Stress & Caos
            </button>
            <button
              onClick={() => setActiveTab('rbac')}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-tighter flex items-center justify-center gap-2 transition-all ${activeTab === 'rbac' ? 'bg-amber-600 text-white shadow-lg scale-[1.02]' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              <Lock size={16} /> Seguridad
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 min-h-[500px] flex flex-col">

            {/* --- TAB: SIMULACIÓN --- */}
            {activeTab === 'sim' && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600">
                    <Activity size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">Motor Quantum V10</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Simulación de Flujo Financiero Completo</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    disabled={vMain.isRunning || vChaos.isRunning}
                    onClick={() => vMain.ejecutarSimulacion(3)}
                    className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-3xl font-black shadow-xl transition-all flex flex-col items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50 group relative overflow-hidden"
                  >
                    <ShieldCheck size={32} className="group-hover:animate-pulse" />
                    <span className="text-lg tracking-tighter">AUDITORÍA FULL</span>
                    <div className="text-[9px] font-bold bg-black/20 text-white px-2 py-0.5 rounded border border-white/20 uppercase">3 Días Reales</div>
                  </button>

                  <button
                    disabled={vMain.isRunning || vChaos.isRunning}
                    onClick={() => vMain.simularEscenarioZ()}
                    className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-3xl font-black shadow-xl transition-all flex flex-col items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50 group relative overflow-hidden"
                  >
                    <Microscope size={32} className="group-hover:animate-bounce" />
                    <span className="text-lg tracking-tighter">ESCENARIO Z</span>
                    <div className="text-[9px] font-bold bg-white/20 text-white px-2 py-0.5 rounded border border-white/20 uppercase">Debug Profundo</div>
                  </button>

                  <button
                    disabled={vMain.isRunning || vChaos.isRunning}
                    onClick={() => vMain.simularEscenarioEgresos()}
                    className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6 rounded-3xl font-black shadow-xl transition-all flex flex-col items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50 group relative overflow-hidden"
                  >
                    <DollarSign size={32} className="group-hover:rotate-12 transition-transform" />
                    <span className="text-lg tracking-tighter">FINANZAS & EGRESOS</span>
                    <div className="text-[9px] font-bold bg-white/20 text-white px-2 py-0.5 rounded border border-white/20 uppercase">Validar Arqueo</div>
                  </button>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] uppercase font-black text-slate-400 mb-4 tracking-widest text-center">Inyectores de Población</p>
                  <div className="space-y-3">
                    <button
                      disabled={vMain.isRunning || vChaos.isRunning}
                      onClick={handleCrearHarina}
                      className="w-full bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 p-4 rounded-2xl font-black flex items-center justify-center gap-3 border border-orange-200 dark:border-orange-800 transition-all"
                    >
                      <PackagePlus size={20} /> CREAR ENTORNO "HARINA PAN" (RESET)
                    </button>

                    <div className="grid grid-cols-3 gap-3">
                      {[10, 100, 1000].map(n => (
                        <button
                          key={n}
                          disabled={vMain.isRunning || vChaos.isRunning}
                          onClick={() => vMain.generarProductosMasivos(n)}
                          className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 p-3 rounded-2xl font-black text-xs flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700 transition-all"
                        >
                          <PlusCircle size={16} className="mb-1" /> +{n} SKU
                        </button>
                      ))}
                    </div>

                    <button
                      disabled={vMain.isRunning || vChaos.isRunning}
                      onClick={() => vMain.generarClientesMasivos(50)}
                      className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 p-4 rounded-2xl font-black flex items-center justify-center gap-3 border border-indigo-200 dark:border-indigo-800 transition-all"
                    >
                      <Users size={20} /> GENERAR 50 CLIENTES REALES
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* --- TAB: STRESS & CAOS --- */}
            {activeTab === 'chaos' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl text-red-600">
                    <Skull size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">Stress Test Suite</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Buscando el Punto de Quiebre</p>
                  </div>
                </div>

                <button
                  disabled={vMain.isRunning || vChaos.isRunning}
                  onClick={vChaos.runChaosTest}
                  className="w-full bg-gradient-to-r from-red-600 to-rose-700 text-white p-6 rounded-3xl font-black shadow-xl flex flex-col items-center justify-center gap-2 hover:scale-[1.01] transition-all relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-white/10 animate-pulse group-hover:bg-white/20 transition-all"></div>
                  <Zap size={32} />
                  <span className="text-xl tracking-tighter">INICIAR CHAOS TEST V4.0</span>
                  <p className="text-[10px] font-bold opacity-80 uppercase">Suite de Validación Automática</p>
                </button>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] uppercase font-black text-red-400 mb-4 tracking-widest text-center">Laboratorio de Inyecciones Manuales</p>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={injectScaleProduct}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 p-4 rounded-2xl font-black text-xs flex flex-col items-center justify-center border border-emerald-200 dark:border-emerald-800 transition-all"
                    >
                      <Scale size={20} className="mb-2" /> INYECTAR SKU BALANZA
                    </button>

                    <button
                      onClick={injectCorruptProduct}
                      className="bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 p-4 rounded-2xl font-black text-xs flex flex-col items-center justify-center border border-red-200 dark:border-red-800 transition-all"
                    >
                      <Skull size={20} className="mb-2" /> INYECTAR PRODUCTO CORRUPTO
                    </button>

                    <button
                      onClick={setNegativeStock}
                      className="bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 p-4 rounded-2xl font-black text-xs flex flex-col items-center justify-center border border-orange-200 dark:border-orange-800 transition-all"
                    >
                      <Settings size={20} className="mb-2" /> FORZAR STOCK NEGATIVO
                    </button>

                    <label className={`cursor-pointer p-4 rounded-2xl font-black text-xs flex flex-col items-center justify-center border transition-all ${configuracion.permitirSinStock ? 'bg-blue-600 border-blue-700 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800/50 dark:border-slate-700'}`}>
                      <input type="checkbox" className="hidden" checked={configuracion.permitirSinStock || false} onChange={e => updateConfiguracion({ permitirSinStock: e.target.checked })} />
                      <Database size={20} className="mb-2" />
                      {configuracion.permitirSinStock ? 'VENDER SIN STOCK: ON' : 'VENDER SIN STOCK: OFF'}
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* --- TAB: SEGURIDAD --- */}
            {activeTab === 'rbac' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl text-amber-600">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">Security & RBAC</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Auditoría de Permisos y Acceso</p>
                  </div>
                </div>
                <RBACAuditCard validator={vRBAC} />
                <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Este motor valida que los roles de <strong>Vendedor</strong> y <strong>Administrador</strong> no puedan realizar acciones no autorizadas (como ver costos secretos o borrar logs del sistema) mediante inyección de comandos simulados.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PANEL DERECHO: CONSOLA */}
      <div className="w-full lg:w-2/5">
        <div className="bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col h-[600px]">
          <div className="bg-slate-900 px-4 py-3 flex justify-between items-center border-b border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono">
              <Terminal size={14} />
              <span className="uppercase tracking-widest font-bold">
                {activeTab === 'sim' ? 'QUANTUM_SIM' : activeTab === 'chaos' ? 'CHAOS_STRESS' : 'SECURITY_AUDIT'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {(vMain.isRunning || vChaos.isRunning || vRBAC.isRunning) && <span className="text-[10px] text-green-400 font-bold px-2 py-0.5 bg-green-900/30 rounded-full border border-green-800 animate-pulse">● RUNNING</span>}
              <button onClick={handleCopyLogs} className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-[10px] uppercase font-bold">
                {copied ? <Check size={14} className="text-green-500" /> : <Clipboard size={14} />}
                {copied ? 'COPIADO' : 'COPIAR LOG'}
              </button>
            </div>
          </div>
          <div className="p-4 overflow-y-auto flex-1 font-mono text-xs custom-scrollbar space-y-1 bg-slate-950">
            {(activeTab === 'sim' ? vMain.logs : activeTab === 'chaos' ? vChaos.logs : vRBAC.logs).map((log, i) => {
              let color = 'text-slate-400';
              if (log.includes('header') || log.includes('===') || log.includes('MOTOR')) color = 'text-emerald-400 font-bold border-b border-emerald-900/30 pb-1 mt-2 mb-1';
              else if (log.includes('FATAL') || log.includes('💀')) color = 'text-red-500 font-bold bg-red-900/10 p-1';
              else if (log.includes('ERROR') || log.includes('❌')) color = 'text-red-400 font-bold';
              else if (log.includes('EXITOSO') || log.includes('✅') || log.includes('ÉXITO')) color = 'text-emerald-400 font-bold';
              else if (log.includes('Identidad')) color = 'text-amber-400';
              else if (log.includes('TASA')) color = 'text-cyan-400 font-bold';

              return (
                <div key={i} className={`break-words whitespace-pre-wrap ${color} animate-in fade-in slide-in-from-bottom-1 duration-300`}>
                  {log}
                </div>
              )
            })}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

    </div>
  );
};

export default SimulationPage;