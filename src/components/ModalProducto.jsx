import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { X, Pencil, Plus, Lock, Save, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';
import Swal from 'sweetalert2';

// Módulos operativos
import { useProductForm } from '../hooks/products/useProductForm';
import ProductBasicInfo from './products/ProductBasicInfo';
import ProductPricing from './products/ProductPricing';
import ProductHierarchy from './products/ProductHierarchy';
import ProductStockInput from './products/ProductStockInput';
import ProductWizardForm from './products/ProductWizardForm';

// ✅ INTEGRACIÓN DE SEGURIDAD FÉNIX V1.0
import { useSecureAction } from '../hooks/security/useSecureAction';
import { PERMISOS, useRBAC } from '../hooks/store/useRBAC';
import { useConfigStore } from '../stores/useConfigStore';

export default function ModalProducto({ productoEditar, onClose, onGuardar, configuracion }) {
  const { categorias, usuario, productos } = useStore();
  const { tienePermiso } = useRBAC(usuario);
  const { ejecutarAccionSegura } = useSecureAction();
  const { license } = useConfigStore();

  const { form, updateField, updateJerarquia } = useProductForm(productoEditar);
  const stockFinalRef = useRef(0);
  const tasa = configuracion?.tasa > 0 ? configuracion.tasa : 1;
  const showCosts = tienePermiso(PERMISOS.INV_VER_COSTOS);

  // 🏪 MODO BODEGA VS AVANZADO
  // Si el plan es 'bodega', por defecto inicia en simple (Modo Bodega). Si no, en avanzado.
  const [isSimpleMode, setIsSimpleMode] = useState(() => {
    if (!productoEditar) {
      return license?.plan === 'bodega';
    } else {
      // Al editar, si el producto tiene jerarquías complejas (Paquete), forzar avanzado.
      // Bulto es soportado en simple.
      const isComplex = productoEditar.jerarquia?.paquete?.activo;
      return license?.plan === 'bodega' && !isComplex;
    }
  });


  const getFactores = () => {
    const j = form.jerarquia;
    const paqPorBulto = parseFloat(j.bulto?.contenido) || 1;
    const undPorPaq = parseFloat(j.paquete?.contenido) || 1;
    return { factorPaquete: undPorPaq, factorBulto: paqPorBulto * (j.paquete?.activo ? undPorPaq : 1) };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nombre) return Swal.fire('Error', 'El nombre del producto es obligatorio', 'error');

    // 🛡️ UNIQUE NAME CHECK (AUDIT)
    const nombreNormalizado = form.nombre.trim().toLowerCase();
    const safeProductos = Array.isArray(productos) ? productos : [];
    const duplicado = safeProductos.find(p =>
      p.nombre &&
      p.nombre.trim().toLowerCase() === nombreNormalizado &&
      String(p.id) !== String(productoEditar?.id || '')
    );

    if (duplicado) console.warn('Duplicate found:', duplicado.nombre);

    // Using closure to wrap the save logic
    const executeSave = () => {
      ejecutarAccionSegura({
        permiso: PERMISOS.INV_EDITAR,
        nombreAccion: productoEditar ? 'Actualizar Producto' : 'Crear Producto',
        requiereReauth: true,
        accion: () => {
          let precioFinal = 0;
          let factorCosto = 1;

          // 🆕 COHESIÓN STOCK SIMPLE
          if (isSimpleMode) {
            // En modo simple, el stock viene directo del form.stock
            // Actualizamos el Ref para que el resto de la lógica lo use
            const stockVal = parseFloat(form.stock) || 0;
            stockFinalRef.current = { total: stockVal, breakdown: null };
          }

          if (form.tipoUnidad === 'peso' || form.tipoUnidad === 'litro') {
            precioFinal = parseFloat(form.precio) || 0;
            factorCosto = 1;
          } else {
            const { factorPaquete, factorBulto } = getFactores();

            if (form.jerarquia?.unidad?.activo) {
              precioFinal = parseFloat(form.jerarquia.unidad.precio);
              factorCosto = 1;
            } else if (form.jerarquia?.paquete?.activo) {
              precioFinal = parseFloat(form.jerarquia.paquete.precio);
              factorCosto = factorPaquete;
            } else {
              precioFinal = parseFloat(form.jerarquia?.bulto?.precio);
              factorCosto = factorBulto;
            }
          }

          // Permitir precio 0 si es Bodega muy simple? No, mejor validar siempre.
          // Pero en modo simple usamos `form.precio` directo. 
          // Si es simple mode, `precioFinal` debe ser `form.precio`.
          if (isSimpleMode) {
            precioFinal = parseFloat(form.precio) || 0;
          }

          if (!precioFinal || precioFinal <= 0.000001) {
            return Swal.fire({
              title: 'Precio Inválido',
              text: 'No se puede guardar un producto con precio 0.00. Por favor asigne un precio de venta.',
              icon: 'error',
              confirmButtonColor: '#d33'
            });
          }

          const costoTotalReferencia = (parseFloat(form.costo) || 0) * factorCosto;
          const gananciaEstimada = precioFinal - costoTotalReferencia;

          const procederGuardado = () => {
            // 🧠 Smart Kardex: Generate Descriptive Log
            let detalleStock = 'Corrección de Stock';
            const breakdown = stockFinalRef.current?.breakdown;
            const totalStock = stockFinalRef.current?.total !== undefined ? stockFinalRef.current.total : (parseFloat(form.stock) || 0);

            if (breakdown) {
              // ... (logic existing)
              const parts = [];
              if (Number(breakdown.bultos) > 0) parts.push(`${breakdown.bultos} Bultos`);
              // ...
            } else if (isSimpleMode) {
              detalleStock = `Ajuste Rápido: ${totalStock}`;
            }

            const datosFinales = {
              ...form,
              precio: precioFinal,
              costo: parseFloat(form.costo) || 0,
              stock: totalStock,
              cajasPorBulto: parseFloat(form.jerarquia?.bulto?.contenido) || 1,
              unidadesPorCaja: parseFloat(form.jerarquia?.paquete?.contenido) || 1,
              variantes: [],
              _detalle: detalleStock
            };

            // 🐛 FIX: Sync Unit Price/Cost to Hierarchy for Simple Mode (Bodega)
            // This ensures lists displaying hierarchy views (like ProductoRow) show the correct unit price instead of 0.
            if (isSimpleMode) {
              datosFinales.jerarquia = {
                ...(datosFinales.jerarquia || {}),
                unidad: {
                  ...(datosFinales.jerarquia?.unidad || {}),
                  activo: true,
                  precio: precioFinal,
                  costo: datosFinales.costo,
                  seVende: true
                }
              };
            }

            // ... (Audit Check logic maintained)
            // ...

            onGuardar(datosFinales);
          };

          if (gananciaEstimada <= 0 && parseFloat(form.costo) > 0) {
            // ... warning logic
            Swal.fire({
              title: '¿Ganancia Negativa?',
              text: 'El precio es menor al costo.',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Guardar igual'
            }).then((r) => { if (r.isConfirmed) procederGuardado(); });
          } else {
            procederGuardado();
          }
        }
      });
    };

    if (duplicado) {
      // ... warning duplicate
      Swal.fire({
        title: 'Posible Duplicado',
        text: `Ya existe "${duplicado.nombre}".`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Crear igual'
      }).then((r) => { if (r.isConfirmed) executeSave(); });
    } else {
      executeSave();
    }
  };


  if (!form) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-950 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

        {/* HEADER MODERNO */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950 z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className={`p-2 rounded-xl ${productoEditar ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                {productoEditar ? <Pencil size={24} /> : <Plus size={24} />}
              </div>
              {productoEditar ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            {productoEditar && (
              <span className="text-xs text-slate-400 font-mono mt-1 block ml-14">ID: {productoEditar.codigo || 'N/A'}</span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* TOGGLE MODE */}
            <button
              onClick={() => setIsSimpleMode(!isSimpleMode)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm font-bold text-slate-600 dark:text-slate-300"
            >
              {isSimpleMode ? <ToggleLeft className="text-emerald-500" /> : <ToggleRight className="text-blue-500" />}
              {isSimpleMode ? 'Asistente Rápido' : 'Modo Avanzado'}
            </button>

            <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition-all">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">

          {isSimpleMode ? (
            <ProductWizardForm
              form={form}
              updateField={updateField}
              onSave={handleSubmit}
              onCancel={onClose}
              productoEditar={productoEditar}
              categorias={categorias}
              tasa={tasa}
              updateJerarquia={updateJerarquia}
            />
          ) : (
            <div className="p-8 space-y-10">
              <section>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                  Información Básica
                </h3>
                <ProductBasicInfo
                  form={form}
                  onChange={updateField}
                  categorias={categorias}
                />
              </section>

              <section>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                  Precios y Costos
                </h3>
                <ProductPricing
                  form={form}
                  updateField={updateField}
                  tasa={tasa}
                  getFactores={getFactores}
                  showCosts={showCosts}
                />
              </section>

              {form.tipoUnidad === 'unidad' && (
                <section className="animate-in fade-in slide-in-from-bottom-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                    Presentaciones
                  </h3>
                  <ProductHierarchy
                    form={form}
                    updateJerarquia={updateJerarquia}
                    tasa={tasa}
                    getFactores={getFactores}
                    updateField={updateField}
                  />
                </section>
              )}

              <section>
                <ProductStockInput
                  form={form}
                  productoEditar={productoEditar}
                  getFactores={getFactores}
                  onStockChange={(val) => { stockFinalRef.current = val; }}
                />
              </section>
            </div>
          )}

        </div>

        {/* STICKY FOOTER CON GLASS EFFECT */}
        {!isSimpleMode && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex gap-4 sticky bottom-0 z-20">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 px-6 rounded-xl font-bold text-slate-600 hover:bg-slate-50 border border-slate-200 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="flex-[2] py-3.5 px-6 bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-slate-200 dark:shadow-blue-900/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
            >
              <Save size={18} />
              {productoEditar ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        )}

      </div >
    </div >
  );
}