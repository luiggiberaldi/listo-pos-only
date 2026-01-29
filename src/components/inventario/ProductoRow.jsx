import React, { useState } from 'react';
import { ArrowRightLeft, Copy, Pencil, Trash2, Tag } from 'lucide-react';
import StockDisplay from './StockDisplay';
import { ActionGuard } from '../security/ActionGuard';
import { PERMISSIONS } from '../../config/permissions';

export default function ProductoRow({ p, actions, configuracion, showCosts = false, isSelected, onToggleSelect }) {
  if (!p) return null;

  const tasa = parseFloat(configuracion?.tasa) || 1;
  const jerarquia = p.jerarquia || { bulto: {}, paquete: {}, unidad: {} };

  const undPorPaq = parseFloat(jerarquia.paquete?.contenido) || 1;
  const paqPorBulto = parseFloat(jerarquia.bulto?.contenido) || 1;
  const undPorBulto = paqPorBulto * (jerarquia.paquete?.activo ? undPorPaq : 1);

  const vistas = [];
  if (jerarquia.bulto?.activo && jerarquia.bulto.seVende !== false) vistas.push({ id: 'bulto', label: 'Bulto', factor: undPorBulto, precio: jerarquia.bulto.precio });
  if (jerarquia.paquete?.activo && jerarquia.paquete.seVende !== false) vistas.push({ id: 'paquete', label: 'Paq', factor: undPorPaq, precio: jerarquia.paquete.precio });

  if ((jerarquia.unidad?.activo && jerarquia.unidad.seVende !== false) || vistas.length === 0) {
    vistas.push({
      id: 'unidad',
      label: 'Und',
      factor: 1,
      precio: (jerarquia.unidad?.activo ? jerarquia.unidad.precio : p.precio) || 0
    });
  }

  const [vistaActual, setVistaActual] = useState(vistas[0]?.id || 'unidad');
  const esPeso = p.tipoUnidad === 'peso';

  const getFinanzas = () => {
    const costoBase = parseFloat(p.costo) || 0;
    if (esPeso) {
      const precio = parseFloat(p.precio) || 0;
      const g = precio - costoBase;
      const m = precio > 0 ? ((g / precio) * 100) : 0;
      return { costo: costoBase, precio: precio, ganancia: g, margen: m };
    }
    const vista = vistas.find(v => v.id === vistaActual) || vistas[0] || { factor: 1, precio: p.precio || 0 };
    const costoCalc = costoBase * (vista.factor || 1);
    const precioVenta = parseFloat(vista.precio) || 0;
    const g = precioVenta - costoCalc;
    const m = precioVenta > 0 ? ((g / precioVenta) * 100) : 0;
    return { costo: costoCalc, precio: precioVenta, ganancia: g, margen: m };
  };

  const f = getFinanzas();

  let margenColor = 'text-emerald-600 bg-emerald-50 border-emerald-100';
  if (f.margen < 15) margenColor = 'text-red-600 bg-red-50 border-red-100';
  else if (f.margen < 30) margenColor = 'text-orange-600 bg-orange-50 border-orange-100';

  return (
    <tr className={`group transition-all hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}>

      {/* CHECKBOX */}
      <td className="px-4 py-5 align-top text-center w-10">
        <input
          type="checkbox"
          checked={isSelected || false}
          onChange={onToggleSelect}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-3"
        />
      </td>

      {/* PRODUCTO E INFO */}
      <td className="px-4 py-5 align-top">
        <div className="flex items-start gap-4">
          {/* AVATAR (POS 2.0) */}
          <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0 relative overflow-hidden group/img">
            {p.imagen ? (
              <img src={p.imagen} className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" alt="" loading="lazy" />
            ) : (
              <div className="w-full h-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-300 dark:text-slate-500">
                {p.nombre ? p.nombre.substring(0, 2).toUpperCase() : 'NA'}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-bold text-slate-800 dark:text-white text-sm leading-tight group-hover:text-blue-600 transition-colors">
              {p.nombre}
            </span>
            <span className="text-[10px] text-slate-400 font-mono tracking-wider bg-slate-100 dark:bg-slate-800 w-fit px-1.5 py-0.5 rounded uppercase">
              {p.codigo || 'S/C'}
            </span>
          </div>
        </div>
      </td>

      {/* CATEGORÍA / ESTADO */}
      <td className="px-6 py-5 align-top">
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-white border border-slate-200 text-slate-600 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
          {p.categoria}
        </span>
      </td>

      {/* PRECIOS (MONOSPACE) */}
      <td className="px-6 py-5 align-top">
        <div className="flex flex-col gap-1.5">
          {!esPeso && vistas.length > 1 && (
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 w-fit border border-slate-200 dark:border-slate-700">
              {vistas.map(v => (
                <button key={v.id} onClick={() => setVistaActual(v.id)} className={`px-2 py-0.5 text-[9px] uppercase font-bold rounded-md transition-all ${vistaActual === v.id ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{v.label}</button>
              ))}
            </div>
          )}
          <div className="font-mono font-bold text-slate-800 dark:text-white text-base tracking-tight">
            ${f.precio.toFixed(2)}
          </div>
          <div className="text-[10px] font-bold text-emerald-600/80">
            Bs {(f.precio * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </td>

      {/* COSTOS Y MARGEN (CONDICIONAL) */}
      {showCosts && (
        <>
          <td className="px-6 py-5 align-top">
            <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
              ${f.costo.toFixed(2)}
            </div>
          </td>
          <td className="px-6 py-5 align-top">
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold ${margenColor}`}>
              <span>{f.margen.toFixed(0)}%</span>
            </div>
          </td>
        </>
      )}

      {/* STOCK */}
      <td className="px-6 py-5 align-top">
        <StockDisplay p={p} />
      </td>

      {/* ACCIONES (GHOST) */}
      <td className="px-6 py-5 text-right align-middle">
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
          <ActionGuard permission={PERMISSIONS.INVENTORY_MANAGE} onClick={() => actions.onDuplicate(p)} actionName="Duplicar Producto">
            <button className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Duplicar"><Copy size={16} /></button>
          </ActionGuard>
          {/* 🆕 */}
          <button
            onClick={() => {
              // EXCEPCIÓN: Productos de Peso no tienen jerarquía
              if (esPeso) {
                actions.onPrint(p);
                return;
              }

              // Construir contexto de impresión jerárquica
              const vista = vistas.find(v => v.id === vistaActual) || {};
              const printContext = {
                unitId: vistaActual,
                label: vista.label === 'Und' ? null : vista.label, // Solo marcar si NO es unidad
                factor: vista.factor || 1,
                overridePrice: f.precio // El precio ya calculado en la fila
              };
              actions.onPrint(p, printContext);
            }}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Imprimir Etiqueta"
          >
            <Tag size={16} />
          </button>

          <ActionGuard permission={PERMISSIONS.INVENTORY_ADJUST} onClick={() => actions.onAdjust(p)} actionName="Ajustar Stock">
            <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Ajustar Stock"><ArrowRightLeft size={16} /></button>
          </ActionGuard>
          <ActionGuard permission={PERMISSIONS.INVENTORY_MANAGE} onClick={() => actions.onEdit(p)} actionName="Editar Producto">
            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar"><Pencil size={16} /></button>
          </ActionGuard>
          <ActionGuard permission={PERMISSIONS.INVENTORY_MANAGE} onClick={() => actions.onDelete(p)} actionName="Eliminar Producto">
            <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar"><Trash2 size={16} /></button>
          </ActionGuard>
        </div>
      </td>
    </tr>
  );
}