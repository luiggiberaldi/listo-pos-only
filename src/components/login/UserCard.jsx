import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, MessageSquare, X } from 'lucide-react';
import { CardBody, CardContainer, CardItem } from '../ui/3d-card';
import LoginAvatar from './LoginAvatar';

// 📝 TITLE CASE UTILITY
const toTitleCase = (str) => {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

// 🎨 ROLE-BASED GRADIENT MAPPER
const getRoleGradient = (rol) => {
    const normalizedRole = rol?.toLowerCase() || '';

    // 👑 Admin/Owner: Indigo → Purple
    if (['admin', 'dueño', 'dueno', 'superadmin'].includes(normalizedRole)) {
        return {
            gradient: 'from-[#6366F1] to-[#A855F7]',
            shadow: 'shadow-indigo-500/30'
        };
    }

    // 💼 Manager/Supervisor: Rose → Pink
    if (['encargado', 'supervisor', 'gerente', 'manager'].includes(normalizedRole)) {
        return {
            gradient: 'from-[#F43F5E] to-[#EC4899]',
            shadow: 'shadow-rose-500/30'
        };
    }

    // 💵 Cashier/Operator: Emerald → Teal
    if (['cajero', 'operador', 'vendedor', 'cashier'].includes(normalizedRole)) {
        return {
            gradient: 'from-[#10B981] to-[#14B8A6]',
            shadow: 'shadow-emerald-500/30'
        };
    }

    // ⚙️ Custom/Other: Slate → Blue
    return {
        gradient: 'from-[#475569] to-[#2563EB]',
        shadow: 'shadow-slate-500/30'
    };
};

const UserCard = ({ user, index, onClick, messageCount }) => {
    const roleColors = getRoleGradient(user.rol);
    const isOwner = ['admin', 'dueño', 'dueno', 'superadmin'].includes(user.rol?.toLowerCase());

    return (
        <motion.div
            variants={{ hidden: { opacity: 0, scale: 0.8 }, show: { opacity: 1, scale: 1 } }}
            whileTap={{ scale: 0.95 }}
            className="relative outline-none focus:outline-none focus:ring-0"
        >
            <div onClick={onClick} className="cursor-pointer">
                <CardContainer className="inter-var py-0">
                    <CardBody className="relative group/card w-auto h-auto rounded-xl p-0 border-transparent bg-transparent">

                        {/* 🟢 NOTIFICATION BUBBLE */}
                        {messageCount > 0 && (
                            <div className="absolute -top-3 -right-3 z-50 animate-bounce">
                                <div className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.6)] border border-red-400 flex items-center gap-1">
                                    <MessageSquare size={12} className="fill-current text-white" />
                                    <span>{messageCount}</span>
                                </div>
                            </div>
                        )}

                        <CardItem translateZ="100" rotateX={10} rotateZ={-5} className="w-full flex justify-center">
                            <div className="relative">
                                <style>{`
                                    @keyframes rotBGimg {
                                        from { transform: rotate(0deg); }
                                        to { transform: rotate(360deg); }
                                    }
                                `}</style>

                                {/* Fake thickness layers */}
                                <div className="absolute inset-0 bg-black/40 rounded-3xl translate-y-4 translate-x-4 blur-xl" />
                                <div className="absolute inset-0 bg-primary/20 rounded-3xl translate-y-2 translate-x-1" />

                                {/* 👑 ADMIN CROWN */}
                                {isOwner && (
                                    <div className="absolute -top-3 -left-3 z-50 animate-bounce duration-1000">
                                        <div className="bg-gradient-to-br from-yellow-300 to-amber-500 p-1.5 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.6)] border border-yellow-100/50">
                                            <Crown size={20} className="text-yellow-900 fill-yellow-100" strokeWidth={2.5} />
                                        </div>
                                    </div>
                                )}

                                {isOwner ? (
                                    <div className="relative z-10 p-[4px] rounded-2xl overflow-hidden flex justify-center items-center shadow-[0_0_20px_rgba(0,183,255,0.4)]">
                                        {/* RGB ANIMATED BACKGROUND */}
                                        <div style={{
                                            position: 'absolute',
                                            width: '200%',
                                            height: '200%',
                                            backgroundImage: 'linear-gradient(180deg, rgb(0, 183, 255), rgb(255, 48, 255))',
                                            animation: 'rotBGimg 3s linear infinite',
                                        }} />
                                        <div className="relative z-20 bg-slate-900 rounded-2xl">
                                            <LoginAvatar user={user} className="relative z-10 transition-all duration-300 shadow-none ring-0" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`relative z-10 p-[4px] rounded-2xl overflow-hidden flex justify-center items-center bg-gradient-to-br ${roleColors.gradient} shadow-lg ${roleColors.shadow} transition-all duration-300`}>
                                        <div className="relative z-20 bg-slate-900 rounded-2xl">
                                            <LoginAvatar user={user} className="relative z-10 transition-all duration-300 shadow-none ring-0" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardItem>

                        {/* 3. TEXT (Floating below) */}
                        <CardItem translateZ="60" className="text-center w-full mt-8 group-hover/card:text-primary transition-colors space-y-1">
                            <h3 className="text-lg font-bold text-content-inverse drop-shadow-md">{toTitleCase(user.nombre) || 'Usuario'}</h3>
                            {user.rol && <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-content-secondary group-hover/card:text-primary/70">{user.rol}</span>}
                        </CardItem>



                    </CardBody>
                </CardContainer>
            </div>

        </motion.div>
    );
};

export default UserCard;
