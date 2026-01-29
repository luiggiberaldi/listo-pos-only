import React, { useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { X, Pencil, Plus, Lock, Save, AlertTriangle } from 'lucide-react';
import Swal from 'sweetalert2';

// Módulos operativos
import { useProductForm } from '../hooks/products/useProductForm';
import ProductBasicInfo from './products/ProductBasicInfo';
import ProductPricing from './products/ProductPricing';
import ProductHierarchy from './products/ProductHierarchy';
import ProductStockInput from './products/ProductStockInput';

// ✅ INTEGRACIÓN DE SEGURIDAD FÉNIX V1.0
import { useSecureAction } from '../hooks/security/useSecureAction';
import { PERMISOS, useRBAC } from '../hooks/store/useRBAC';

export default function ModalProducto({ productoEditar, onClose, onGuardar, configuracion }) {
  const { categorias, usuario, productos } = useStore();
  const { tienePermiso } = useRBAC(usuario);
  const { ejecutarAccionSegura } = useSecureAction();

  const { form, updateField, updateJerarquia } = useProductForm(productoEditar);
  const stockFinalRef = useRef(0);
  const tasa = configuracion?.tasa > 0 ? configuracion.tasa : 1;
  const showCosts = tienePermiso(PERMISOS.INV_VER_COSTOS);

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

    // Safety check: ensure productos is an array
    const safeProductos = Array.isArray(productos) ? productos : [];

    const duplicado = safeProductos.find(p =>
      p.nombre &&
      p.nombre.trim().toLowerCase() === nombreNormalizado &&
      String(p.id) !== String(productoEditar?.id || '') // Safe Type Check
    );

    if (duplicado) {
      console.warn('Duplicate found:', duplicado.nombre, 'ID:', duplicado.id, 'Self ID:', productoEditar?.id);
    }

    // Using closure to wrap the save logic
    const executeSave = () => {
      ejecutarAccionSegura({
        permiso: PERMISOS.INV_EDITAR,
        nombreAccion: productoEditar ? 'Actualizar Producto' : 'Crear Producto',
        requiereReauth: true,
        accion: () => {
          let precioFinal = 0;
          let factorCosto = 1;

          if (form.tipoUnidad === 'peso') {
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

            if (breakdown) {
              const parts = [];
              if (Number(breakdown.bultos) > 0) parts.push(`${breakdown.bultos} Bultos`);
              if (Number(breakdown.paquetes) > 0) parts.push(`${breakdown.paquetes} Paquetes`);
              if (Number(breakdown.unidades) > 0) parts.push(`${breakdown.unidades} Unds`);

              if (parts.length > 0) {
                detalleStock = `Corrección: ${parts.join(', ')}`;
              }
            }

            const datosFinales = {
              ...form,
              precio: precioFinal,
              costo: parseFloat(form.costo) || 0,
              stock: stockFinalRef.current?.total || 0, // Extract Total
              cajasPorBulto: parseFloat(form.jerarquia?.bulto?.contenido) || 1,
              unidadesPorCaja: parseFloat(form.jerarquia?.paquete?.contenido) || 1,
              variantes: [],
              _detalle: detalleStock // Pass descriptive detail
            };

            // 🛡️ AUDIT CHECK: DETECT CHANGES BEFORE SAVING
            if (productoEditar) {
              const changes = [];

              // Helper for comparison with tolerance
              const isDiff = (a, b, isNum = false) => {
                if (isNum) return Math.abs((Number(a) || 0) - (Number(b) || 0)) > 0.001;
                return String(a || '').trim() !== String(b || '').trim();
              };

              // Helper to format stock into Bultos/Paquetes/Unidades
              const formatStock = (qty, jerarquia) => {
                const total = Number(qty) || 0;
                if (Math.abs(total) < 0.001) return '0.00';

                // Si es "peso" (no tiene bulto/paquete activo o es float), mostrar directo
                if (form.tipoUnidad === 'peso') return total.toFixed(2);

                const b_cont = parseFloat(jerarquia?.bulto?.contenido || 0);
                const p_cont = parseFloat(jerarquia?.paquete?.contenido || 0);
                const b_active = jerarquia?.bulto?.activo;
                const p_active = jerarquia?.paquete?.activo;

                const parts = [];
                let remaining = total;

                if (b_active && b_cont > 0) {
                  const bultos = Math.floor(remaining / b_cont);
                  if (bultos > 0) {
                    parts.push(`${bultos} Bul`);
                    remaining %= b_cont;
                  }
                }

                if (p_active && p_cont > 0) {
                  const paquetes = Math.floor(remaining / p_cont);
                  if (paquetes > 0) {
                    parts.push(`${paquetes} Paq`);
                    remaining %= p_cont;
                  }
                }

                if (remaining > 0.001 || parts.length === 0) {
                  parts.push(`${remaining.toFixed(2)} Und`);
                }

                return parts.join(', ');
              };

              // Helper to calculate Cost based on Highest Active Hierarchy
              const getHierarchyBasedCost = (baseCost, jerarquia) => {
                const c = Number(baseCost) || 0;
                if (!jerarquia) return { value: c, label: 'Costo' };

                const b_active = jerarquia.bulto?.activo;
                const p_active = jerarquia.paquete?.activo;

                // Calculate factors safely
                const paqPorBulto = parseFloat(jerarquia.bulto?.contenido) || 1;
                const undPorPaq = parseFloat(jerarquia.paquete?.contenido) || 1;
                const factorPaquete = undPorPaq;
                const factorBulto = paqPorBulto * (p_active ? undPorPaq : 1);

                if (b_active) return { value: c * factorBulto, label: 'Costo (Bulto)' };
                if (p_active) return { value: c * factorPaquete, label: 'Costo (Paquete)' };

                return { value: c, label: 'Costo' };
              };

              // Helper to format currency
              const formatCurrency = (val) => {
                const amount = Number(val) || 0;
                const bsAmount = amount * tasa;
                return `$ ${amount.toFixed(2)} / Bs ${bsAmount.toFixed(2)}`;
              };

              if (isDiff(productoEditar.nombre, datosFinales.nombre))
                changes.push({ label: 'Nombre', old: productoEditar.nombre, new: datosFinales.nombre });

              if (isDiff(productoEditar.precio, datosFinales.precio, true))
                changes.push({
                  label: 'Precio',
                  old: formatCurrency(productoEditar.precio),
                  new: formatCurrency(datosFinales.precio)
                });

              if (isDiff(productoEditar.stock, datosFinales.stock, true)) {
                // Use old hierarchy for old stock, new hierarchy for new stock
                const oldStr = formatStock(productoEditar.stock, productoEditar.jerarquia);
                const newStr = formatStock(datosFinales.stock, form.jerarquia);

                changes.push({
                  label: 'Stock',
                  old: oldStr,
                  new: newStr
                });
              }

              if (isDiff(productoEditar.costo, datosFinales.costo, true)) {
                const oldH = getHierarchyBasedCost(productoEditar.costo, productoEditar.jerarquia);
                const newH = getHierarchyBasedCost(datosFinales.costo, form.jerarquia);

                // Note: If hierarchy level changed (e.g. Unit -> Bulto), label uses the NEW one for clarity
                changes.push({
                  label: newH.label,
                  old: formatCurrency(oldH.value),
                  new: formatCurrency(newH.value)
                });
              }

              if (isDiff(productoEditar.categoria, datosFinales.categoria))
                changes.push({ label: 'Categoría', old: productoEditar.categoria, new: datosFinales.categoria });

              // If critical changes detected, show confirmation
              if (changes.length > 0) {
                const changesHtml = `
                        <div class="text-left w-full bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                            <table class="w-full text-sm">
                                <thead className="border-b border-slate-300 dark:border-slate-600">
                                    <tr class="text-slate-500 font-bold">
                                        <th class="py-1">Campo</th>
                                        <th class="py-1 text-right text-red-500">Anterior</th>
                                        <th class="py-1 text-right text-emerald-600">Nuevo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${changes.map(c => `
                                        <tr class="border-b border-slate-200/50 dark:border-slate-700/50">
                                            <td class="py-2 font-medium text-slate-700 dark:text-slate-300">${c.label}</td>
                                            <td class="py-2 text-right text-slate-500 line-through decoration-red-400 decoration-2">${c.old}</td>
                                            <td class="py-2 text-right font-bold text-slate-900 dark:text-white">${c.new}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;

                return Swal.fire({
                  title: 'Confirmar Cambios',
                  html: `<span class="text-sm text-slate-500">Se detectaron modificaciones. Verifica antes de guardar.</span><br/><br/>${changesHtml}`,
                  icon: 'info',
                  showCancelButton: true,
                  confirmButtonText: 'Sí, aplicar cambios',
                  cancelButtonText: 'Revisar',
                  confirmButtonColor: '#0f172a'
                }).then((r) => {
                  if (r.isConfirmed) {
                    onGuardar(datosFinales);
                  }
                });
              }
            }

            // Save directly if new product or no detected changes (or changes assumed minor/intentional)
            onGuardar(datosFinales);
          };

          if (gananciaEstimada <= 0) {
            Swal.fire({
              title: '¿Ganancia Negativa o Nula?',
              html: `
                    <div class="text-left text-sm text-slate-600">
                        Estás configurando este producto con un margen de ganancia de <b class="text-red-600">$${gananciaEstimada.toFixed(2)}</b>.
                        <br/><br/>
                        Esto significa que estás vendiendo <b>${gananciaEstimada < 0 ? 'perdiendo dinero' : 'sin ganar nada'}</b>.
                        <br/>
                        ¿Deseas continuar de todas formas?
                    </div>
                `,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#d33',
              cancelButtonColor: '#3085d6',
              confirmButtonText: 'Sí, guardar igual',
              cancelButtonText: 'Corregir precio'
            }).then((result) => {
              if (result.isConfirmed) {
                procederGuardado();
              }
            });
          } else {
            procederGuardado();
          }
        }
      });
    };

    if (duplicado) {
      Swal.fire({
        title: 'Posible Duplicado',
        html: `Ya existe un producto llamado <b>"${duplicado.nombre}"</b>.<br/><br/>¿Deseas crearlo de todas formas?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f59e0b',
        confirmButtonText: 'Sí, crear duplicado',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) executeSave();
      });
    } else {
      executeSave();
    }
  };


  if (!form) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-950 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

        {/* HEADER MODERNO */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-white dark:bg-slate-950 z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className={`p-2 rounded-xl ${productoEditar ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                {productoEditar ? <Pencil size={24} /> : <Plus size={24} />}
              </div>
              {productoEditar ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            {/* Texto RBAC Eliminado aquí */}
            {productoEditar && (
              <div className="mt-2">
                <span className="text-xs text-slate-400 font-mono">ID: {productoEditar.codigo || 'N/A'}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition-all">
            <X size={24} />
          </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">

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

        {/* STICKY FOOTER CON GLASS EFFECT */}
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

      </div >
    </div >
  );
}