// ✅ AUTH STORE (ZUSTAND) - Centralized Authentication State
// Replaces internal state of useAuth.js

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ghostMiddleware } from '../utils/ghost/ghostMiddleware';
import { safeLoad } from '../utils/storageUtils';

export const useAuthStore = create(
    ghostMiddleware(persist(
        (set, get) => ({
            // STATE
            usuario: null, // Active Session
            usuarios: typeof window !== 'undefined' ? safeLoad('listo_users_v1', []) : [], // User Database

            // SESSION ACTIONS
            login: (user) => set({ usuario: user }),
            logout: () => {
                sessionStorage.clear();
                set({ usuario: null });
            },

            // CRUD ACTIONS (Atomic)
            setUsuarios: (newUsers) => set({ usuarios: newUsers }),

            agregarUsuario: (newUser) => set(state => ({
                usuarios: [...state.usuarios, { ...newUser, fechaRegistro: newUser.fechaRegistro || new Date().toISOString() }]
            })),

            actualizarUsuario: (id, updates) => set(state => {
                const updatedUsers = state.usuarios.map(u =>
                    u.id === id ? { ...u, ...updates } : u
                );

                // If updating active user, sync session
                const activeUser = state.usuario;
                if (activeUser && activeUser.id === id) {
                    return { usuarios: updatedUsers, usuario: { ...activeUser, ...updates } };
                }
                return { usuarios: updatedUsers };
            }),

            eliminarUsuario: (id) => set(state => ({
                usuarios: state.usuarios.filter(u => u.id !== id)
            }))
        }),
        {
            name: 'listo_auth_storage_v3', // Cache Buster: Force logout on reload (Security Fix)
            // Persistence only for: usuarios (Database). Active session is volatile.
            partialize: (state) => ({
                usuarios: state.usuarios
                // usuario: state.usuario  <-- 🚫 BLOCKED: Session is now volatile (Security Requirement)
            }),
        }
    ), 'AuthStore')
);
