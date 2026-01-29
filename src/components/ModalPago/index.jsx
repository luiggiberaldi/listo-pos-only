import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import Swal from 'sweetalert2';

// 🪝 HOOKS REFRACTORIZADOS
import { usePaymentState } from './hooks/usePaymentState';
import { usePaymentCalculations } from './hooks/usePaymentCalculations';
import { useClientWallet } from './hooks/useClientWallet';

// 🧱 COMPONENTES DE UI MODULARIZADOS
import PaymentHeader from './components/PaymentHeader';
import PaymentLeftColumn from './components/PaymentLeftColumn';
import WalletSection from './components/WalletSection';
import PaymentFooter from './components/PaymentFooter';
import PaymentForm from './PaymentForm';
import NumericPad from './NumericPad';

export default function ModalPago({ totalUSD, totalBS, totalImpuesto, tasa, onPagar, onClose, initialClient = null, isTouch = false }) {
    const { clientes, agregarCliente, metodosPago, configuracion } = useStore();
    const metodosActivos = metodosPago.filter(m => m.activo);

    // 1️⃣ STATE MANAGEMENT
    const {
        modo, setModo,
        clienteSeleccionado, setClienteSeleccionado,
        pagos, setPagos,
        referencias, setReferencias,
        pagoSaldoFavor, setPagoSaldoFavor, // 🆕 From PaymentState
        activeInputId, setActiveInputId,
        activeInputType, setActiveInputType,
        inputRefs,
        val
    } = usePaymentState(initialClient, metodosActivos, isTouch);

    // 🆕 STATE PARA VUELTO (Aún local por ser UI-specific)
    const [distVueltoUSD, setDistVueltoUSD] = useState(0);
    const [distVueltoBS, setDistVueltoBS] = useState(0);
    const [isChangeCredited, setIsChangeCredited] = useState(false);
    const [clientSearchTrigger, setClientSearchTrigger] = useState(0); // 🚀 Trigger for Shortcut

    // 2️⃣ CALCULATIONS CORE (Moved UP to feed Wallet Projection)
    const {
        montoIGTF,
        totalPagadoUSD,
        totalPagadoBS,
        totalPagadoGlobalUSD,
        totalConIGTF,
        faltaPorPagar,
        cambioUSD,
        tasaSegura,
        round2,
        round4
    } = usePaymentCalculations({
        totalUSD,
        pagos,
        tasa,
        configuracion,
        metodosActivos,
        val,
        pagoSaldoFavor
    });

    // 3️⃣ WALLET LOGIC (Now Pure Projection, receiving calculated Change)
    const { proyeccion } = useClientWallet(
        clienteSeleccionado, clientes, modo, cambioUSD, isChangeCredited, distVueltoUSD, distVueltoBS, tasa
    );

    // 🛡️ FINANCIAL GUARD (FÉNIX VUELTO) - 4 Decimals Precision
    const sumaDistribucionVueltoUSD = round2((parseFloat(distVueltoUSD) || 0) + ((parseFloat(distVueltoBS) || 0) / tasaSegura));
    const remanenteVueltoUSD = round4(cambioUSD - sumaDistribucionVueltoUSD);
    // Solo permitimos continuar si el cuadre es exacto (margen de 0.001)
    // O si el cajero ha activado explícitamente la distribución (Mix/Monedero).
    const isVueltoValido = cambioUSD < 0.001 || (remanenteVueltoUSD >= -0.001 && (remanenteVueltoUSD <= 0.001 || isChangeCredited));

    const metodosDivisa = metodosActivos.filter(m => m.tipo === 'DIVISA');
    const metodosBs = metodosActivos.filter(m => m.tipo === 'BS').sort((a, b) => {
        const isCashA = a.nombre.toLowerCase().includes('efectivo');
        const isCashB = b.nombre.toLowerCase().includes('efectivo');
        if (isCashA && !isCashB) return -1;
        if (!isCashA && isCashB) return 1;
        return 0;
    });

    const deudaCliente = modo === 'credito' ? faltaPorPagar : 0;

    // 🆕 EFECTOS LOCALES
    useEffect(() => {
        if (cambioUSD === 0 && isChangeCredited) setIsChangeCredited(false);
    }, [cambioUSD]);

    // 🛡️ GUARD: Auto-Clean Wallet Payment if Client is Deselected
    useEffect(() => {
        if (!clienteSeleccionado && parseFloat(pagoSaldoFavor || 0) > 0) {
            setPagoSaldoFavor('');
        }
    }, [clienteSeleccionado, pagoSaldoFavor]);

    // ⚖️ MANUAL CHANGE PROTOCOL: Ensure fields don't auto-fill on change
    useEffect(() => {
        if (cambioUSD <= 0) {
            setDistVueltoUSD(0);
            setDistVueltoBS(0);
        }
    }, [cambioUSD]);

    // 🎹 GLOBAL SHORTCUTS: 'C' to open Client Search
    useEffect(() => {
        const handleKeyPress = (e) => {
            // Only trigger if no input is focused, OR if we are in a payment input
            const activeElem = document.activeElement;
            const isInput = activeElem.tagName === 'INPUT';

            if (e.key.toLowerCase() === 'c' && !isInput) {
                e.preventDefault();
                onResolveErrorAction(); // Trigger shortcut
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isTouch]);

    const onResolveErrorAction = () => {
        // 🚀 FÉNIX SHORTCUT: Reactive Resolution
        setClientSearchTrigger(prev => prev + 1); // ⚡ Force open
        if (isTouch) {
            setActiveInputId('SELECT_CLIENT');
            setActiveInputType('client');
        } else {
            const selector = document.querySelector('[data-client-selector]');
            if (selector) selector.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const handleFinishSelection = () => {
        // 🚀 JUMP AFTER SELECTION: To Change or To Payments
        if (cambioUSD > 0.01) {
            setActiveInputId('CHANGE_USD');
            setActiveInputType('change');
            setTimeout(() => {
                const changeInput = document.querySelector('[data-currency="USD"]');
                if (changeInput) changeInput.focus();
            }, 10);
        } else {
            setActiveInputId(metodosActivos[0]?.id || null);
            setActiveInputType('amount');
            setTimeout(() => {
                const firstPaymentInput = document.querySelector('input[inputmode="decimal"]');
                if (firstPaymentInput) firstPaymentInput.focus();
            }, 10);
        }
    };

    // 📌 HANDLERS
    const handleVueltoDistChange = (moneda, valor) => {
        if (moneda === 'usd') setDistVueltoUSD(valor === '' ? '' : valor);
        if (moneda === 'bs') setDistVueltoBS(valor === '' ? '' : valor);
    };

    const handleCreditChange = () => {
        if (!clienteSeleccionado) return Swal.fire('Cliente Requerido', 'Para abonar el vuelto a cuenta, debe seleccionar un cliente primero.', 'warning');
        setIsChangeCredited(true);
    };

    const handleCancelarCreditChange = () => {
        setIsChangeCredited(false);
    };

    const llenarSaldo = (id, monto) => {
        const metodo = metodosActivos.find(m => m.id === id);
        const aplicaIGTF = configuracion?.igtfActivo && (metodo.aplicaIGTF !== undefined ? metodo.aplicaIGTF : metodo.tipo === 'DIVISA');
        const factor = aplicaIGTF ? (1 + (configuracion.igtfTasa || 3) / 100) : 1;
        const actual = parseFloat(pagos[id] || 0);

        let valorFinal = 0;
        if (monto === 'USD') valorFinal = round2(actual + (faltaPorPagar * factor));
        if (monto === 'BS') valorFinal = round2(actual + (faltaPorPagar * tasaSegura));

        setPagos(prev => ({ ...prev, [id]: valorFinal }));
        setTimeout(() => {
            const index = metodosActivos.findIndex(m => m.id === id);
            if (inputRefs.current[index]) inputRefs.current[index].focus({ preventScroll: true });
        }, 50);
    };

    const sumarBillete = (id, monto) => {
        const actual = parseFloat(pagos[id] || 0);
        const nuevo = round2(actual + monto);
        setPagos(prev => ({ ...prev, [id]: nuevo }));
    };

    const procesarPago = (imprimir = false) => {
        try {
            if (modo === 'contado' && faltaPorPagar > 0.01) return Swal.fire({ icon: 'error', title: 'Falta dinero', text: `Restan $${faltaPorPagar.toFixed(2)} por cobrar.`, timer: 1500, showConfirmButton: false });
            if (modo === 'credito' && !clienteSeleccionado) return Swal.fire('Atención', 'Para vender a crédito, debe seleccionar un cliente.', 'warning');

            // 🛡️ GUARD: Block Mixed Payment without Client (Final Defense)
            if (parseFloat(pagoSaldoFavor || 0) > 0 && !clienteSeleccionado) {
                return Swal.fire('Error', "PAGO MIXTO INVÁLIDO: Para usar saldo a favor debe tener un cliente activo.", 'error');
            }

            for (const m of metodosActivos) {
                if (val(m.id) > 0 && m.requiereRef && (!referencias[m.id] || referencias[m.id].length < 4)) {
                    return Swal.fire('Referencia Faltante', `Ingrese los últimos 4 dígitos para ${m.nombre}`, 'warning');
                }
            }

            let distribucionFinal = { usd: parseFloat(distVueltoUSD) || 0, bs: parseFloat(distVueltoBS) || 0 };
            let montoVueltoDigital = 0;
            const sumaDistribucion = (parseFloat(distVueltoUSD) || 0) + ((parseFloat(distVueltoBS) || 0) / tasaSegura);

            if (modo === 'contado' && cambioUSD > 0.01) {
                if (isChangeCredited) {
                    // 🛡️ GUARD: Excess Protection (FÉNIX G2)
                    if (remanenteVueltoUSD < -0.01) {
                        return Swal.fire('Exceso de Vuelto', `Estás entregando $${Math.abs(remanenteVueltoUSD).toFixed(2)} de más. Ajusta la distribución.`, 'error');
                    }
                    montoVueltoDigital = Math.max(0, remanenteVueltoUSD);
                } else {
                    if (Math.abs(remanenteVueltoUSD) > 0.02) {
                        return Swal.fire('Vuelto Descuadrado', 'La distribución del vuelto no coincide con el cambio total.', 'error');
                    }
                }
            }

            const pagosFinales = metodosActivos.filter(m => val(m.id) > 0).map(m => ({ metodo: m.nombre, metodoId: m.id, monto: val(m.id), tipo: m.tipo, referencia: referencias[m.id] || '' }));
            const clienteObj = clientes.find(c => c.id === clienteSeleccionado);
            const nombreClienteFinal = clienteObj ? clienteObj.nombre : (clienteSeleccionado ? 'Cliente' : null);

            onPagar({
                metodos: pagosFinales,
                cambio: modo === 'credito' ? 0 : cambioUSD,
                distribucionVuelto: distribucionFinal,
                montoVueltoDigital: montoVueltoDigital,
                esCredito: modo === 'credito',
                clienteId: clienteSeleccionado || null,
                clienteNombre: nombreClienteFinal,
                cliente: clienteObj || null,
                deudaPendiente: deudaCliente,
                igtfTotal: montoIGTF,
                vueltoCredito: isChangeCredited,
                montoSaldoFavor: parseFloat(pagoSaldoFavor) || 0
            }, imprimir);

        } catch (error) {
            console.error("🔥 Error al procesar pago:", error);
            Swal.fire({ icon: 'error', title: 'Error de Transacción', text: error.message || 'Error desconocido.', footer: '<span style="color:red">Soporte: Revise la consola (F12)</span>' });
        }
    };

    const handleInputKeyDown = (e, index) => {
        if (e.key === 'Enter' || e.key === 'ArrowDown') {
            e.preventDefault();
            const nextInput = inputRefs.current[index + 1];
            if (nextInput) nextInput.focus({ preventScroll: true });
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevInput = inputRefs.current[index - 1];
            if (prevInput) prevInput.focus({ preventScroll: true });
        }
        // 🚀 CROSS-COLUMN JUMP: Left Arrow to Change Calculator
        if (e.key === 'ArrowLeft' && cambioUSD > 0.01) {
            e.preventDefault();
            setActiveInputId('CHANGE_USD');
            setActiveInputType('change');
            setTimeout(() => {
                const changeInput = document.querySelector('[data-currency="USD"]');
                if (changeInput) changeInput.focus();
            }, 10);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in zoom-in duration-200">
            <div className={`bg-surface-light dark:bg-surface-dark w-full ${isTouch ? 'max-w-7xl' : 'max-w-5xl'} rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]`}>

                <PaymentHeader isTouch={isTouch} modo={modo} setModo={setModo} onClose={onClose} />

                <div className="flex flex-1 overflow-hidden relative">
                    <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

                        <PaymentLeftColumn
                            isTouch={isTouch}
                            totalUSD={totalUSD} totalImpuesto={totalImpuesto} totalBS={totalBS} montoIGTF={montoIGTF} tasaSegura={tasaSegura} configuracion={configuracion}
                            clienteSeleccionado={clienteSeleccionado} setClienteSeleccionado={setClienteSeleccionado} clientes={clientes} agregarCliente={agregarCliente}
                            modo={modo} proyeccion={proyeccion}
                            totalPagadoGlobalUSD={totalPagadoGlobalUSD} faltaPorPagar={faltaPorPagar} cambioUSD={cambioUSD}
                            distVueltoUSD={distVueltoUSD} distVueltoBS={distVueltoBS} handleVueltoDistChange={handleVueltoDistChange}
                            isChangeCredited={isChangeCredited} handleCreditChange={handleCreditChange} setIsChangeCredited={setIsChangeCredited}
                            deudaCliente={deudaCliente}
                            onFocusInput={(id) => { setActiveInputId(id); setActiveInputType('change'); }} // 🟢 HANDLE CHANGE INPUTS
                            isVueltoValido={isVueltoValido} // 🛡️ Reactive Prop
                            clientSearchTrigger={clientSearchTrigger} // 🚀
                            onFinishSelection={handleFinishSelection} // 🚀
                        />

                        {/* COLUMNA DERECHA (FORMULARIO) */}
                        <div className="flex-1 flex flex-col bg-white overflow-hidden">
                            <div className={`flex-1 overflow-y-auto ${isTouch ? 'p-8' : 'p-6'}`}>
                                <WalletSection
                                    isTouch={isTouch} cliente={clientes.find(cli => cli.id === clienteSeleccionado)}
                                    totalPagadoUSD={totalPagadoUSD} totalPagadoBS={totalPagadoBS} tasaSegura={tasaSegura} totalConIGTF={totalConIGTF}
                                    pagoSaldoFavor={pagoSaldoFavor} setPagoSaldoFavor={setPagoSaldoFavor}
                                />

                                <PaymentForm
                                    metodosDivisa={metodosDivisa} metodosBs={metodosBs}
                                    pagos={pagos} handleInputChange={(id, val) => { if (val === '' || /^\d*\.?\d*$/.test(val)) setPagos(p => ({ ...p, [id]: val })); }}
                                    llenarSaldo={llenarSaldo} referencias={referencias} handleRefChange={(id, val) => setReferencias(p => ({ ...p, [id]: val }))}
                                    inputRefs={inputRefs} handleInputKeyDown={handleInputKeyDown}
                                    modo={modo} tasa={tasaSegura} sumarBillete={sumarBillete} isTouch={isTouch}
                                    onFocusInput={(id) => { setActiveInputId(id); setActiveInputType('amount'); }}
                                    onFocusRef={(id) => { setActiveInputId(id); setActiveInputType('ref'); }}
                                    activeInputId={activeInputId}
                                />
                            </div>

                            <PaymentFooter
                                isTouch={isTouch} modo={modo} faltaPorPagar={faltaPorPagar} clienteSeleccionado={clienteSeleccionado}
                                totalPagadoGlobalUSD={totalPagadoGlobalUSD} onProcesar={procesarPago} setActiveInputId={setActiveInputId}
                                isVueltoValido={isVueltoValido} // 🛡️
                                remanenteVueltoUSD={remanenteVueltoUSD}
                                onResolveError={onResolveErrorAction} // 🚀 Keyboard/Click shortcut
                            />
                        </div>
                    </div>

                    {isTouch && (
                        <div className="w-80 shrink-0 border-l border-slate-200 bg-white">
                            <NumericPad
                                activeValue={activeInputId ? (
                                    activeInputType === 'amount' ? pagos[activeInputId] :
                                        activeInputType === 'ref' ? referencias[activeInputId] :
                                            activeInputType === 'change' ? (activeInputId === 'CHANGE_USD' ? distVueltoUSD : distVueltoBS) : ''
                                ) || '' : ''}
                                pendingAmount={faltaPorPagar}
                                onValueChange={(val) => {
                                    if (activeInputId) {
                                        if (activeInputType === 'amount') setPagos(p => ({ ...p, [activeInputId]: val }));
                                        else if (activeInputType === 'ref') setReferencias(p => ({ ...p, [activeInputId]: val }));
                                        else if (activeInputType === 'change') {
                                            // 🟢 LOGIC FOR CHANGE INPUTS
                                            if (activeInputId === 'CHANGE_USD') handleVueltoDistChange('usd', val);
                                            if (activeInputId === 'CHANGE_BS') handleVueltoDistChange('bs', val);
                                        }
                                    }
                                }}
                                onFillBalance={() => {
                                    if (activeInputId && activeInputType === 'amount') {
                                        const metodo = metodosActivos.find(m => m.id === activeInputId);
                                        if (metodo) {
                                            const montoBs = metodo.tipo === 'BS' ? (faltaPorPagar * tasaSegura) : faltaPorPagar;
                                            setPagos(p => ({ ...p, [activeInputId]: montoBs.toFixed(2) }));
                                        }
                                    }
                                }}
                                onClear={() => {
                                    if (activeInputId) {
                                        activeInputType === 'amount' ? setPagos(p => ({ ...p, [activeInputId]: '' })) : setReferencias(p => ({ ...p, [activeInputId]: '' }));
                                    }
                                }}
                                onNext={() => {
                                    const currentIndex = metodosActivos.findIndex(m => m.id === activeInputId);
                                    if (currentIndex !== -1 && currentIndex < metodosActivos.length - 1) setActiveInputId(metodosActivos[currentIndex + 1].id);
                                    else setActiveInputId(null);
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}