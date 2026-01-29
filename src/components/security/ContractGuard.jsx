
// 🛡️ LEGAL LAYER - CONTRATO UNIFICADO (ORQUESTADOR)
// Archivo: src/components/security/ContractGuard.jsx

import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { dbMaster } from '../../services/firebase';
import { doc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { useLicenseGuard } from '../../hooks/security/useLicenseGuard';
import { useConfigContext } from '../../context/ConfigContext';

// MODULES
import { FULL_CONTRACT } from './guard_modules/LegalConstants';
import { useLegalSync } from './guard_modules/useLegalSync';
import ContractViewer from './guard_modules/ContractViewer';
import KYCForm from './guard_modules/KYCForm';

export default function ContractGuard({ children }) {
    const [signed, setSigned] = useState(false);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(1); // 1: Reading, 2: KYC

    // Lectura State
    const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);

    // KYC State
    const [accepting, setAccepting] = useState(false);
    const [kycData, setKycData] = useState({
        nombreNegocio: '',
        nombreRepresentante: '',
        rif: '',
        telefono: '',
        email: ''
    });
    const [kycError, setKycError] = useState('');

    const { machineId } = useLicenseGuard();
    const { configuracion, guardarConfiguracion } = useConfigContext();

    // 1. Initial Load Check
    useEffect(() => {
        const localSign = localStorage.getItem('listo_contract_signed');
        if (localSign === 'true') {
            setSigned(true);
        }
        setLoading(false);
    }, []);

    // 2. Custom Hook for Background Sync
    useLegalSync(signed, machineId);

    // --- HANDLERS ---

    const handleScrollEnd = () => setHasScrolledToEnd(true);

    const handleContinueToKYC = () => setStep(2);

    const handleKYCChange = (e) => {
        setKycData({ ...kycData, [e.target.name]: e.target.value });
        setKycError('');
    };

    const validateRIF = (rif) => /^[VEJGPC]-?\d{5,9}-?\d?$/i.test(rif);

    const handleFinalAccept = async () => {
        // Validation
        if (!kycData.nombreNegocio || !kycData.nombreRepresentante || !kycData.rif || !kycData.telefono) {
            setKycError("Por favor complete todos los campos obligatorios.");
            return;
        }

        // 1. Validar RIF (Debe tener guion y números)
        if (!/^[VEJGPC]-\d{4,9}$/i.test(kycData.rif)) {
            setKycError("El RIF está incompleto o tiene formato inválido.");
            return;
        }

        // 2. Validar Teléfono (Longitud estricta 12: 04XX-XXXXXXX)
        if (kycData.telefono.length !== 12) {
            setKycError("El teléfono debe tener formato válido: 04XX-1234567");
            return;
        }

        if (!machineId) {
            alert("Error de Seguridad: No se pudo identificar el hardware.");
            return;
        }

        setAccepting(true);

        try {
            // Get IP (Best Effort)
            // Get IP (Best Effort - Redundant Strategy)
            let publicIp = 'OFFLINE_IP';
            try {
                // Intento 1: ipify (Rápido)
                const res = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
                publicIp = res.data.ip;
            } catch (e) {
                console.warn("IP Fetch Primary Failed, trying backup...");
                try {
                    // Intento 2: ipapi (Fallback)
                    const resBackup = await axios.get('https://ipapi.co/json/', { timeout: 5000 });
                    publicIp = resBackup.data.ip;
                } catch (e2) {
                    console.warn("All IP Fetch attempts failed. Using OFFLINE_IP placeholder.");
                }
            }

            // Payload
            const forensicPayload = {
                timestamp: new Date(),
                event_type: 'CONTRACT_ACCEPTED',
                machine_id: machineId,
                ip_address: publicIp,
                contract_version: 'v1.1-2026',
                contract_text_snapshot: FULL_CONTRACT.replace(/[^\x00-\x7F]/g, "-"), // Sanitized
                user_agent: navigator.userAgent,
                kyc_data: {
                    nombreNegocio: kycData.nombreNegocio.toUpperCase(),
                    nombreRepresentante: kycData.nombreRepresentante.toUpperCase(),
                    rif: kycData.rif.toUpperCase(),
                    telefono: kycData.telefono,
                    email: kycData.email
                }
            };

            // Cloud Save
            let cloudSuccess = false;
            if (dbMaster && navigator.onLine) {
                try {
                    const terminalRef = doc(dbMaster, 'terminales', machineId);

                    // Update Profile
                    await setDoc(terminalRef, {
                        contrato_firmado: true,
                        fecha_firma: serverTimestamp(),
                        version_contrato: 'v1.1-2026',
                        ultima_ip_firma: publicIp,
                        nombreNegocio: kycData.nombreNegocio.toUpperCase(),
                        propietario: kycData.nombreRepresentante.toUpperCase(),
                        rif: kycData.rif.toUpperCase(),
                        telefono: kycData.telefono,
                        email_contacto: kycData.email
                    }, { merge: true });

                    // Audit Trail
                    await addDoc(collection(terminalRef, 'legal_audit_trail'), {
                        ...forensicPayload,
                        timestamp: serverTimestamp()
                    });

                    cloudSuccess = true;
                } catch (e) { console.error("Cloud entry failed", e); }
            }

            // Offline Fallback
            if (!cloudSuccess) {
                localStorage.setItem('pending_legal_sync', JSON.stringify(forensicPayload));
            }

            // 🔄 SYSTEM SYNC: Actualizar Configuración Local con datos KYC
            if (guardarConfiguracion) {
                console.log("🔄 [SYSTEM] Sincronizando datos de KYC a Configuración...");
                guardarConfiguracion({
                    ...configuracion,
                    nombre: kycData.nombreNegocio.toUpperCase(),
                    rif: kycData.rif.toUpperCase(),
                    telefono: kycData.telefono
                });
            }

            // Local Success
            localStorage.setItem('listo_contract_signed', 'true');
            setSigned(true);

        } catch (error) {
            console.error("Critical Signing Error", error);
            alert("Error del sistema. Intente nuevamente.");
        } finally {
            setAccepting(false);
        }
    };

    // --- RENDER ---

    if (loading) return null;
    if (signed) return <>{children}</>;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 text-slate-200 flex flex-col font-sans">
            {/* Context Header */}
            <div className="bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <ShieldCheck size={28} className="text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-widest uppercase">LISTO POS - Acuerdo Legal</h1>
                        <p className="text-xs text-slate-500 uppercase tracking-widest">
                            {step === 1 ? "Paso 1: Lectura de Términos" : "Paso 2: Identificación del Licenciatario"}
                        </p>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-2 text-xs text-amber-500/80 uppercase tracking-widest">
                    <AlertTriangle size={14} />
                    <span>Trámite Obligatorio</span>
                </div>
            </div>

            {/* Step Switcher */}
            {step === 1 ? (
                <ContractViewer
                    onScrollEnd={handleScrollEnd}
                    hasScrolledToEnd={hasScrolledToEnd}
                    onContinue={handleContinueToKYC}
                />
            ) : (
                <KYCForm
                    kycData={kycData}
                    onChange={handleKYCChange}
                    error={kycError}
                    onBack={() => setStep(1)}
                    onConfirm={handleFinalAccept}
                    submitting={accepting}
                />
            )}
        </div>
    );
}
