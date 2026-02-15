import React, { useState } from 'react';
import { Calendar, AlertTriangle, Tag, Barcode, Type, Image as ImageIcon, Upload, X, Search } from 'lucide-react';
import { compressImage } from '../../utils/imageUtils';
import Swal from 'sweetalert2';

export default function ProductBasicInfo({ form, onChange, categorias }) {
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleNameChange = (e) => {
    const valor = e.target.value;
    const nombreCapitalizado = valor.replace(/(?:^|\s|["'([{])+\S/g, match => match.toUpperCase());
    onChange('nombre', nombreCapitalizado);
  };

  const preventScroll = (e) => e.target.blur();

  const handleImageUpload = async (file) => {
    if (!file) return;
    setProcessing(true);
    try {
      const compressed = await compressImage(file);
      onChange('imagen', compressed);
    } catch (error) {
      console.error("Error procesando imagen:", error);
      Swal.fire('Error', 'No se pudo procesar la imagen.', 'error');
    } finally {
      setProcessing(false);
      setDragActive(false);
    }
  };

  const onDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        handleImageUpload(file);
        break;
      }
    }
  };

  const handleSearchImage = () => {
    if (!form.nombre || form.nombre.trim() === '') {
      Swal.fire('Atención', 'Primero ingresa el nombre del producto para buscar imágenes.', 'info');
      return;
    }

    const searchQuery = encodeURIComponent(form.nombre.trim());

    // Open both websites in new tabs
    window.open(`https://tuzonamarket.com/carabobo?s=${searchQuery}`, '_blank');
    window.open(`https://www.cocomercado.com/?s=${searchQuery}`, '_blank');

    Swal.fire({
      title: 'Búsqueda Iniciada',
      html: 'Se abrieron 2 pestañas con los resultados de búsqueda.<br/><br/><small class="text-slate-500">Puedes copiar la imagen (clic derecho → Copiar imagen) y pegarla aquí con Ctrl+V</small>',
      icon: 'success',
      timer: 4000,
      showConfirmButton: false
    });
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">

      {/* ZONA DE IMAGEN (POS 2.0) */}
      <div className="w-full md:w-1/3 flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-500 mb-1 block">Imagen del Producto</label>
        <div
          className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden transition-all bg-slate-50 dark:bg-slate-900 group ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-700'}`}
          onDragEnter={onDrag}
          onDragLeave={onDrag}
          onDragOver={onDrag}
          onDrop={onDrop}
        >
          {form.imagen ? (
            <>
              <img src={form.imagen} className="w-full h-full object-cover" alt="Preview" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                <label className="p-2 bg-white rounded-full cursor-pointer hover:scale-110 transition-transform shadow-lg text-slate-700">
                  <Upload size={18} />
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e.target.files[0])} />
                </label>
                <button
                  onClick={() => onChange('imagen', null)}
                  className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition-transform shadow-lg"
                >
                  <X size={18} />
                </button>
              </div>
            </>
          ) : (
            <>
              <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/*" onChange={(e) => handleImageUpload(e.target.files[0])} />
              <div className={`p-4 rounded-full mb-3 transition-colors ${dragActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                {processing ? <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /> : <ImageIcon size={32} />}
              </div>
              <p className="text-xs font-bold text-slate-500 text-center px-4">
                {processing ? 'Comprimiendo...' : 'Arrastra o haz clic'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Soporta Ctrl+V</p>
            </>
          )}
        </div>

        {/* Search Image Online Button */}
        <button
          type="button"
          onClick={handleSearchImage}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-lg shadow-blue-500/30"
        >
          <Search size={16} />
          Buscar Foto en Internet
        </button>

        {/* Fallback Preview */}
        {!form.imagen && form.nombre && (
          <div className="flex items-center gap-2 justify-center p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 opacity-60">
            <div className="w-6 h-6 rounded bg-orange-100 text-orange-500 flex items-center justify-center text-[10px] font-black">
              {form.nombre.substring(0, 2).toUpperCase()}
            </div>
            <span className="text-[10px] text-slate-400">Vista previa del Avatar</span>
          </div>
        )}
      </div>

      {/* CAMPOS DE TEXTO */}
      <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-5" onPaste={handlePaste}>

        <div className="col-span-2 group">
          <label className="text-xs font-bold text-slate-500 mb-1.5 block group-focus-within:text-blue-600 transition-colors">Nombre del Producto</label>
          <div className="relative">
            <Type size={18} className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
              value={form.nombre}
              onChange={handleNameChange}
              autoFocus
              placeholder="Ej: Harina Pan 1kg"
            />
          </div>
        </div>

        <div className="group">
          <label className="text-xs font-bold text-slate-500 mb-1.5 block group-focus-within:text-blue-600 transition-colors">Código / SKU</label>
          <div className="relative">
            <Barcode size={18} className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-sm text-slate-900 dark:text-white"
              value={form.codigo}
              onChange={e => onChange('codigo', e.target.value)}
              placeholder="AUTOGENERADO"
            />
          </div>
        </div>

        <div className="group">
          <label className="text-xs font-bold text-slate-500 mb-1.5 block group-focus-within:text-blue-600 transition-colors">Categoría</label>
          <div className="relative">
            <Tag size={18} className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <select
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none text-slate-900 dark:text-white cursor-pointer"
              value={form.categoria}
              onChange={e => onChange('categoria', e.target.value)}
            >
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="absolute right-3.5 top-4 pointer-events-none text-slate-400 text-[10px]">▼</div>
          </div>
        </div>

        {form.tipoUnidad !== 'peso' && (
          <div className="col-span-2 md:col-span-1 group">
            <label className="text-xs font-bold text-slate-500 mb-1.5 block group-focus-within:text-blue-600 transition-colors">
              Vencimiento (Opcional)
            </label>

            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center divide-x divide-slate-200 dark:divide-slate-700 overflow-hidden relative transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
              {/* Month Selector */}
              <div className="relative flex-1">
                <select
                  value={form.fechaVencimiento ? form.fechaVencimiento.split('-')[1] : ''}
                  onChange={(e) => {
                    const m = e.target.value;
                    const currentY = form.fechaVencimiento ? form.fechaVencimiento.split('-')[0] : new Date().getFullYear();
                    onChange('fechaVencimiento', `${currentY}-${m}`);
                  }}
                  className="w-full pl-3 pr-6 py-3 bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none appearance-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-center"
                >
                  <option value="" disabled>Mes</option>
                  {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                    <option key={m} value={m}>{new Date(2000, parseInt(m) - 1, 1).toLocaleString('es-ES', { month: 'short' }).toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Year Selector */}
              <div className="relative flex-1">
                <select
                  value={form.fechaVencimiento ? form.fechaVencimiento.split('-')[0] : ''}
                  onChange={(e) => {
                    const y = e.target.value;
                    const currentM = form.fechaVencimiento ? form.fechaVencimiento.split('-')[1] : new Date().getMonth() + 1;
                    const mStr = String(currentM).padStart(2, '0');
                    onChange('fechaVencimiento', `${y}-${mStr}`);
                  }}
                  className="w-full pl-3 pr-6 py-3 bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none appearance-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-center"
                >
                  <option value="" disabled>Año</option>
                  {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Clear Button */}
              {form.fechaVencimiento && (
                <button
                  onClick={() => onChange('fechaVencimiento', '')}
                  className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800"
                  title="Borrar fecha"
                >
                  <span className="text-xs font-bold">×</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="col-span-2 md:col-span-1 group">
          <label className="text-xs font-bold text-orange-500 mb-1.5 block flex items-center gap-1.5">
            <AlertTriangle size={14} /> Alerta Stock Bajo
          </label>
          <div className="relative">
            <input
              type="number"
              onWheel={preventScroll}
              className="w-full pl-4 pr-4 py-3 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/50 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-orange-700 dark:text-orange-400 font-bold placeholder:text-orange-300"
              value={form.stockMinimo}
              onChange={e => onChange('stockMinimo', e.target.value)}
              placeholder="Ej: 5"
            />
          </div>
        </div>
      </div>
    </div>
  );
}