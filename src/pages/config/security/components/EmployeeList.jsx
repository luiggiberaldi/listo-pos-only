import React from 'react';
import { Users, UserX } from 'lucide-react';
import EmployeeCard from './EmployeeCard';

export default function EmployeeList({ users, onReset, onDelete, onEditName, onUpdatePermissions, readOnly }) {
    // Filter out the owner to prevent redundancy with the Hero section
    const displayedUsers = users.filter(u => u.roleId !== 'ROL_DUENO');
    const employees = users.filter(u => u.roleId === 'ROL_EMPLEADO');

    return (
        <div className="space-y-6 w-full">
            <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-content-secondary text-xs uppercase tracking-widest flex items-center gap-2">
                    <Users size={16} className="text-primary" /> Nómina Activa
                </h3>
                <span className="bg-surface-light dark:bg-surface-dark text-content-main dark:text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-border-subtle dark:border-slate-700 shadow-sm">
                    {displayedUsers.length} Miembros
                </span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6">
                {displayedUsers.map(u => (
                    <div key={u.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <EmployeeCard
                            user={u}
                            onReset={onReset}
                            onDelete={onDelete}
                            onEdit={onEditName}
                            onUpdatePermissions={onUpdatePermissions} // ✅ NEW
                            readOnly={readOnly}
                        />
                    </div>
                ))}
            </div>

            {employees.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-border-subtle dark:border-slate-800 rounded-[2rem] bg-app-light/50 dark:bg-slate-900/50 backdrop-blur-sm group hover:border-primary/30 transition-colors">
                    <div className="w-20 h-20 bg-surface-light dark:bg-surface-dark rounded-full flex items-center justify-center mb-6 shadow-sm border border-border-subtle dark:border-slate-800 group-hover:scale-110 transition-transform duration-500">
                        <UserX size={32} className="text-content-secondary" />
                    </div>
                    <h4 className="font-bold text-lg text-content-main dark:text-white mb-2">Equipo Solitario</h4>
                    <p className="text-sm text-content-secondary font-medium max-w-xs mx-auto leading-relaxed">
                        Aún no has registrado empleados. Usa el formulario de "Nuevo Ingreso" para comenzar.
                    </p>
                </div>
            )}
        </div>
    );
}