import React from 'react';
import { CreditCard, Smartphone, Banknote, Wallet, Send, Bitcoin, Edit2, Trash2 } from 'lucide-react';

const iconList = { CreditCard, Smartphone, Banknote, Wallet, Send, Bitcoin };
// Diccionario de nombres en español para mostrar en la lista
const iconNombres = { CreditCard: 'TARJETA', Smartphone: 'TELÉFONO', Banknote: 'BILLETE', Wallet: 'BILLETERA', Send: 'ENVIAR', Bitcoin: 'BITCOIN' };

export default function ListaMetodos({ lista, titulo, colorBorde, colorIcono, handleToggleMetodo, setMetodoForm, setShowModalMetodo, handleBorrarMetodo }) {
  return (
    <div className={`bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 border-t-4 ${colorBorde} flex flex-col h-full`}>
      <h4 className="font-bold text-slate-600 dark:text-slate-300 uppercase text-xs tracking-wider mb-4 border-b pb-2">{titulo}</h4>
      <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] pr-1">
        {lista && lista.map(m => {
          const Icon = iconList[m.icono] || CreditCard;
          return (
            <div key={m.id} className={`flex items-center justify-between p-3 border rounded-xl transition-all ${m.activo ? 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-600' : 'bg-slate-100 dark:bg-slate-900 border-slate-100 opacity-60'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${m.activo ? colorIcono : 'bg-slate-200 text-slate-500'}`}><Icon size={18} /></div>
                <div><p className="font-bold text-sm text-slate-700 dark:text-white">{m.nombre}</p><p className="text-[9px] font-bold uppercase text-slate-400">{m.requiereRef ? '• PIDE REF' : '• DIRECTO'}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-5 rounded-full relative cursor-pointer transition-colors shadow-inner ${m.activo ? (m.tipo === 'BS' ? 'bg-blue-500' : 'bg-emerald-500') : 'bg-slate-300'}`} onClick={() => handleToggleMetodo(m.id)}>
                  <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow-md transition-transform ${m.activo ? 'translate-x-3' : ''}`}></div>
                </div>
                <button onClick={() => { setMetodoForm(m); setShowModalMetodo(true); }} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                <button onClick={() => handleBorrarMetodo(m.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
              </div>
            </div>
          );
        })}
        {(!lista || lista.length === 0) && <p className="text-center text-xs text-slate-400 py-4 italic">No hay métodos configurados</p>}
      </div>
    </div>
  );
}