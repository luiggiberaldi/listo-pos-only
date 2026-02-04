import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useTicketStore = create(
    persist(
        (set) => ({
            ticketsEspera: [],
            guardarEnEspera: (ticket) => set((state) => ({ ticketsEspera: [...state.ticketsEspera, ticket] })),
            eliminarTicketEspera: (id) => set((state) => ({ ticketsEspera: state.ticketsEspera.filter(t => t.id !== id) })),
            recuperarDeEspera: (ticket) => set((state) => ({
                ticketsEspera: state.ticketsEspera.filter(t => t.id !== ticket.id)
            }))
        }),
        {
            name: 'listo-tickets-storage'
        }
    )
);
