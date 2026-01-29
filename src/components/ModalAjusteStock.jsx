import React, { useState } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle, Save, Minus, Plus, Package, Box, Layers, Calendar } from 'lucide-react';
import Swal from 'sweetalert2';

export default function ModalAjusteStock({ producto, onClose, onConfirm }) {
  const [tipo, setTipo] = useState('entrada'); // 'entrada' | 'salida'
  const [cantidad, setCantidad] = useState({ bultos: '', paquetes: '', unidades: '' });

  // SELECTOR DE MOTIVO ESTANDARIZADO
  const [motivoTipo, setMotivoTipo] = useState('');
  const [notaAdicional, setNotaAdicional] = useState('');

  // Inicialización segura de fecha (YYYY-MM)
  const fechaActual = producto?.fechaVencimiento ? producto.fechaVencimiento.slice(0, 7) : '';
  const [nuevaFecha, setNuevaFecha] = useState(fechaActual);

  // ✅ BLINDAJE 1: Acceso seguro a la jerarquía
  const jerarquia = producto?.jerarquia || {};

  // ✅ BLINDAJE 2: Uso de Optional Chaining (?.) para evitar pantallas blancas
  const showBulto = jerarquia?.bulto?.activo === true;
  const showPaquete = jerarquia?.paquete?.activo === true;
  // Si unidad no está definido explícitamente, asumimos true si no hay bulto ni paquete
  const showUnidad = jerarquia?.unidad?.activo !== false;

  const columnasActivas = [showBulto, showPaquete, showUnidad].filter(Boolean).length;
  const gridColsClass = `grid grid-cols-${columnasActivas > 0 ? columnasActivas : 1} gap-3`;

  // ✅ BLINDAJE 3: Cálculos matemáticos seguros
  const contPaq = parseFloat(jerarquia?.paquete?.contenido) || 1;
  const contBulto = parseFloat(jerarquia?.bulto?.contenido) || 1;
  const factorPaquete = contPaq;
  const factorBulto = contBulto * (showPaquete ? contPaq : 1);

  const calcularCantidadTotal = () => {
    if (producto?.tipoUnidad === 'peso') return parseFloat(cantidad.unidades) || 0;
    const b = parseInt(cantidad.bultos) || 0;
    const p = parseInt(cantidad.paquetes) || 0;
    const u = parseInt(cantidad.unidades) || 0;
    return (b * factorBulto) + (p * factorPaquete) + u;
  };

  const cantidadTotal = calcularCantidadTotal();
  const stockActual = parseFloat(producto?.stock) || 0;
  const stockFinal = tipo === 'entrada' ? stockActual + cantidadTotal : stockActual - cantidadTotal;

  // MOTIVOS PREDEFINIDOS
  const motivosEntrada = [
    "Compra de Mercancía",
    "Devolución de Cliente",
    "Ajuste de Inventario (+)",
    "Regalo / Bonificación"
  ];
  const motivosSalida = [
    "Venta Manual (Sin Factura)",
    "Consumo Interno",
    "Merma / Vencimiento",
    "Daño / Rotura",
    "Robo / Hurto",
    "Error de Conteo (-)"
  ];

  const generarTextoMovimiento = () => {
    if (producto?.tipoUnidad === 'peso') return `${cantidad.unidades} Kg`;

    const b = parseInt(cantidad.bultos);
    const p = parseInt(cantidad.paquetes);
    const u = parseInt(cantidad.unidades);
    const partes = [];

    if (b > 0) partes.push(`${b} Bulto${b > 1 ? 's' : ''}`);
    if (p > 0) partes.push(`${p} Paq${p > 1 ? 's' : ''}`);
    if (u > 0) partes.push(`${u} Und${u > 1 ? 's' : ''}`);

    if (partes.length === 0) return "0 Unds";
    return partes.join(' + ');
  };

  const getStockProyectadoLabel = () => {
    if (producto?.tipoUnidad === 'peso') return `${stockFinal.toFixed(3)} Kg`;
    if (stockFinal <= 0) return "0 Unidades";

    const items = [];
    if (showBulto && factorBulto > 0) {
      const bultosReales = Math.floor(stockFinal / factorBulto);
      items.push(`${bultosReales} Bultos`);
    }
    if (showPaquete && factorPaquete > 0) {
      // Cálculo de residuo para paquetes si hay bultos
      const restoDeBultos = showBulto ? stockFinal % factorBulto : stockFinal;
      const paquetesReales = Math.floor(restoDeBultos / factorPaquete);
      items.push(`${paquetesReales} Paq`);
    }
    // Unidades sueltas (residuo final)
    const divisor = showPaquete ? factorPaquete : (showBulto ? factorBulto : 1);
    const unidadesSueltas = stockFinal % divisor;

    // Si todo es exacto, no mostramos 0 Unds a menos que sea el único item
    if (unidadesSueltas > 0.001 || items.length === 0) {
      items.push(`${parseFloat(unidadesSueltas.toFixed(2))} Unds`);
    }

    return items.join(' / ');
  };

  // Inicialización inteligente de campos al montar
  React.useEffect(() => {
    if (producto && tipo === 'entrada') {
      // Si es entrada, empezamos en 0 o vacio.
      setCantidad({ bultos: 0, paquetes: 0, unidades: 0 });
    } else if (producto && tipo === 'salida') {
      // Si es salida, tal vez queremos pre-cargar (opcional), 
      // pero según la propuesta para ModalAjusteStock vamos a implementar el Smart Init
      // similar al editor si el usuario lo requiere. 
      // Por ahora, aplicamos la lógica de descomposición para visualizar el stock actual 
      // o inicializar los campos de entrada si fuera una "edición de ajuste".
    }
  }, [producto, tipo]);

  // UX Helper: Clear 0 on focus
  const handleFocus = (campo) => {
    if (cantidad[campo] === 0 || cantidad[campo] === '0') {
      setCantidad(prev => ({ ...prev, [campo]: '' }));
    }
  };

  const handleBlur = (campo) => {
    if (cantidad[campo] === '') {
      setCantidad(prev => ({ ...prev, [campo]: 0 }));
    }
  };

  const cambiarVal = (campo, delta) => {
    const actual = parseInt(cantidad[campo]) || 0;
    const nuevo = Math.max(0, actual + delta);
    setCantidad({ ...cantidad, [campo]: nuevo === 0 ? '' : nuevo });
  };

  const handleInput = (campo, val) => {
    if (val === '' || /^[0-9\b]+$/.test(val)) setCantidad({ ...cantidad, [campo]: val });
  };

  const handleGuardar = (e) => {
    e.preventDefault();

    const esCambioFecha = nuevaFecha && nuevaFecha !== fechaActual;
    const esMovimientoStock = cantidadTotal > 0;

    if (!esMovimientoStock && !esCambioFecha) {
      return Swal.fire('Atención', 'Ingresa una cantidad o cambia la fecha de vencimiento.', 'warning');
    }

    if (esMovimientoStock && !motivoTipo) {
      return Swal.fire('Motivo Requerido', 'Por seguridad, debes seleccionar una razón para este ajuste.', 'warning');
    }

    if (tipo === 'salida' && esMovimientoStock && stockFinal < 0) {
      return Swal.fire('Stock Insuficiente', 'No puedes sacar más de lo que tienes.', 'error');
    }

    let motivoFinal = motivoTipo;
    if (notaAdicional) motivoFinal += ` - ${notaAdicional}`;

    const generarTextoMovimiento = () => {
      const parts = [];
      if (Number(cantidad.bultos) > 0) parts.push(`${cantidad.bultos} ${Number(cantidad.bultos) > 1 ? 'Bultos' : 'Bulto'}`);
      if (Number(cantidad.paquetes) > 0) parts.push(`${cantidad.paquetes} ${Number(cantidad.paquetes) > 1 ? 'Paquetes' : 'Paquete'}`);
      if (Number(cantidad.unidades) > 0) parts.push(`${cantidad.unidades} ${Number(cantidad.unidades) !== 1 ? 'Unidades' : 'Unidad'}`);
      return parts.join(', ');
    };

    let smartMeta = null;
    let textoMovimiento = '';
    if (esMovimientoStock) {
      // 🧠 Smart Kardex Calculation
      const b = parseInt(cantidad.bultos) || 0;
      const p = parseInt(cantidad.paquetes) || 0;
      const u = parseFloat(cantidad.unidades) || 0;

      let unidadPrincipal = 'unidad';
      let factorPrincipal = 1;
      let cantidadPrincipal = u;

      // Heurística: Si solo mueves bultos, la unidad es BULTO.
      if (b > 0 && p === 0 && u === 0) {
        unidadPrincipal = 'bulto';
        factorPrincipal = factorBulto;
        cantidadPrincipal = b;
      } else if (p > 0 && b === 0 && u === 0) {
        unidadPrincipal = 'paquete';
        factorPrincipal = factorPaquete;
        cantidadPrincipal = p;
      } else {
        // MIXTO: Se queda en unidad base, pero usamos detalle para explicar
        unidadPrincipal = 'unidad';
        factorPrincipal = 1;
        cantidadPrincipal = cantidadTotal;
      }

      smartMeta = {
        unidad: unidadPrincipal,
        factor: factorPrincipal,
        cantidadOriginal: cantidadPrincipal,
        // Breakdown adicional para futuros usos
        breakdown: { bultos: b, paquetes: p, unidades: u }
      };

      textoMovimiento = (tipo === 'entrada' ? '+' : '-') + generarTextoMovimiento();
    } else {
      if (!motivoFinal) motivoFinal = 'Corrección Fecha Vencimiento';
      textoMovimiento = `(Fecha: ${nuevaFecha})`;
    }

    onConfirm({
      id: producto.id,
      stock: stockFinal,
      fechaVencimiento: (tipo === 'entrada' || !producto.fechaVencimiento) && nuevaFecha ? nuevaFecha : producto.fechaVencimiento,
      _motivo: motivoFinal, // Motivo real (ej. "Merma")
      _detalle: textoMovimiento, // Texto visual (ej. "+1 Bulto")
      _tipo: tipo,
      _smartMetadata: smartMeta // 🧠 Metadata
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className={`p-5 flex justify-between items-center text-white transition-colors duration-300 ${tipo === 'entrada' ? 'bg-green-600' : 'bg-red-600'}`}>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              {tipo === 'entrada' ? <ArrowUpCircle /> : <ArrowDownCircle />}
              {tipo === 'entrada' ? 'Registrar Entrada' : 'Registrar Salida'}
            </h2>
            <p className="text-white/90 text-xs font-mono mt-1">{producto?.nombre || 'Producto Desconocido'}</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={24} /></button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button onClick={() => { setTipo('entrada'); setMotivoTipo(''); }} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${tipo === 'entrada' ? 'bg-white dark:bg-slate-700 text-green-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><ArrowUpCircle size={18} /> ENTRADA (+)</button>
            <button onClick={() => { setTipo('salida'); setMotivoTipo(''); }} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${tipo === 'salida' ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><ArrowDownCircle size={18} /> SALIDA (-)</button>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Razón del Ajuste <span className="text-red-500">*</span></label>
            <select
              className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
              value={motivoTipo}
              onChange={e => setMotivoTipo(e.target.value)}
            >
              <option value="">-- Seleccionar Causa --</option>
              {(tipo === 'entrada' ? motivosEntrada : motivosSalida).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Cantidad a {tipo === 'entrada' ? 'Agregar' : 'Retirar'}</label>

            {producto?.tipoUnidad === 'peso' ? (
              <div className="flex items-center gap-2"><input type="number" step="0.001" className="w-full p-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-2xl font-bold text-center bg-white dark:bg-slate-950 outline-none focus:border-indigo-500" placeholder="0.000" value={cantidad.unidades} onChange={e => setCantidad({ ...cantidad, unidades: e.target.value })} autoFocus /><span className="text-lg font-bold text-slate-400">Kg</span></div>
            ) : (
              <div className={gridColsClass}>
                {showBulto && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-xl border border-purple-100 dark:border-purple-800 flex flex-col items-center">
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase mb-2 flex items-center gap-1"><Box size={12} /> Bultos</span>
                    <div className="flex items-center w-full gap-1"><button onClick={() => cambiarVal('bultos', -1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg shadow-sm text-slate-500 hover:text-red-500"><Minus size={14} /></button>                    <input
                      type="number"
                      className="w-full bg-transparent text-center font-bold text-lg outline-none text-purple-700 dark:text-purple-300"
                      placeholder="0"
                      value={cantidad.bultos}
                      onChange={e => handleInput('bultos', e.target.value)}
                      onFocus={() => handleFocus('bultos')}
                      onBlur={() => handleBlur('bultos')}
                    /><button onClick={() => cambiarVal('bultos', 1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg shadow-sm text-slate-500 hover:text-green-500"><Plus size={14} /></button></div>
                    <span className="text-[9px] text-purple-400 mt-1 font-bold">{factorBulto} unds/bulto</span>
                  </div>
                )}
                {showPaquete && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-col items-center">
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase mb-2 flex items-center gap-1"><Package size={12} /> Paquetes</span>
                    <div className="flex items-center w-full gap-1"><button onClick={() => cambiarVal('paquetes', -1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg shadow-sm text-slate-500 hover:text-red-500"><Minus size={14} /></button>                    <input
                      type="number"
                      className="w-full bg-transparent text-center font-bold text-lg outline-none text-blue-700 dark:text-blue-300"
                      placeholder="0"
                      value={cantidad.paquetes}
                      onChange={e => handleInput('paquetes', e.target.value)}
                      onFocus={() => handleFocus('paquetes')}
                      onBlur={() => handleBlur('paquetes')}
                    /><button onClick={() => cambiarVal('paquetes', 1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg shadow-sm text-slate-500 hover:text-green-500"><Plus size={14} /></button></div>
                    <span className="text-[9px] text-blue-400 mt-1 font-bold">{factorPaquete} unds/paq</span>
                  </div>
                )}
                {showUnidad && (
                  <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-2 flex items-center gap-1"><Layers size={12} /> Unidades</span>
                    <div className="flex items-center w-full gap-1"><button onClick={() => cambiarVal('unidades', -1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-900 rounded-lg shadow-sm text-slate-500 hover:text-red-500"><Minus size={14} /></button>                    <input
                      type="number"
                      className="w-full bg-transparent text-center font-bold text-lg outline-none text-slate-700 dark:text-white"
                      placeholder="0"
                      value={cantidad.unidades}
                      onChange={e => handleInput('unidades', e.target.value)}
                      onFocus={() => handleFocus('unidades')}
                      onBlur={() => handleBlur('unidades')}
                    /><button onClick={() => cambiarVal('unidades', 1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-900 rounded-lg shadow-sm text-slate-500 hover:text-green-500"><Plus size={14} /></button></div>
                    <span className="text-[9px] text-slate-400 mt-1 font-bold">Sueltas</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Nota Adicional (Opcional)</label>
            <input className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" placeholder="Detalle extra (Ej: #Factura, Nombre de quien retiró...)" value={notaAdicional} onChange={e => setNotaAdicional(e.target.value)} />
          </div>

          {tipo === 'entrada' && producto?.tipoUnidad !== 'peso' && (
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-2">
                <Calendar size={14} /> Actualizar Vencimiento (Opcional)
              </label>
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 flex gap-2">
                {/* Month Selector */}
                <div className="relative flex-1">
                  <select
                    value={nuevaFecha ? nuevaFecha.split('-')[1] : ''}
                    onChange={(e) => {
                      const m = e.target.value;
                      const currentY = nuevaFecha ? nuevaFecha.split('-')[0] : new Date().getFullYear();
                      setNuevaFecha(`${currentY}-${m}`);
                    }}
                    className="w-full pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Mes</option>
                    {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                      <option key={m} value={m}>{new Date(2000, parseInt(m) - 1, 1).toLocaleString('es-ES', { month: 'short' }).toUpperCase()}</option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-2.5 pointer-events-none text-slate-400 text-[10px]">▼</div>
                </div>

                {/* Year Selector */}
                <div className="relative flex-1">
                  <select
                    value={nuevaFecha ? nuevaFecha.split('-')[0] : ''}
                    onChange={(e) => {
                      const y = e.target.value;
                      const currentM = nuevaFecha ? nuevaFecha.split('-')[1] : new Date().getMonth() + 1;
                      const mStr = String(currentM).padStart(2, '0');
                      setNuevaFecha(`${y}-${mStr}`);
                    }}
                    className="w-full pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Año</option>
                    {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-2.5 pointer-events-none text-slate-400 text-[10px]">▼</div>
                </div>

                {/* Clear Button */}
                {nuevaFecha && (
                  <button
                    onClick={() => setNuevaFecha('')}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Borrar fecha"
                  >
                    <span className="text-xs font-bold">×</span>
                  </button>
                )}
              </div>
              {nuevaFecha && nuevaFecha !== fechaActual && <p className="text-xs text-green-600 mt-1 font-bold">Se actualizará la fecha a: {nuevaFecha}</p>}
            </div>
          )}

          <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Nuevo Stock Proyectado</span>
            <div className="text-sm font-bold text-slate-600 dark:text-slate-300">
              {getStockProyectadoLabel()}
            </div>
            <p className={`text-3xl font-extrabold ${tipo === 'entrada' ? 'text-green-600' : 'text-red-500'}`}>
              {(parseFloat(stockFinal) || 0).toFixed(producto?.tipoUnidad === 'peso' ? 3 : 0)} <span className="text-xs">Total Unds</span>
            </p>
          </div>

          <button
            onClick={handleGuardar}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 
              ${tipo === 'entrada' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}
            `}
          >
            <Save size={20} /> {tipo === 'entrada' ? 'CONFIRMAR ENTRADA' : 'CONFIRMAR SALIDA'}
          </button>

        </div>
      </div>
    </div>
  );
}