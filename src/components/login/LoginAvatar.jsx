import React from 'react';

const AVATAR_COLORS = [
    'from-blue-500 to-cyan-500',
    'from-[#6366F1] to-[#A855F7]',
    'from-orange-500 to-amber-500',
    'from-purple-500 to-pink-500',
    'from-indigo-500 to-violet-500',
    'from-rose-500 to-red-500'
];

export default function LoginAvatar({ user, size = 'normal', className = '' }) {
    const isLarge = size === 'large';

    // Generar índice basado en el ID (Soporta UUIDs)
    const getHashIndex = (id) => {
        if (!id) return 0;
        const str = String(id);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash);
    };

    const colorIndex = getHashIndex(user.id) % AVATAR_COLORS.length;
    const gradient = AVATAR_COLORS[colorIndex];

    return (
        <div className={`
            ${isLarge ? 'w-24 h-24 text-3xl' : 'w-32 h-32 md:w-40 md:h-40 text-5xl'} 
            rounded-2xl bg-gradient-to-br ${gradient} 
            flex items-center justify-center font-black text-white 
            overflow-hidden relative transform transition-transform ${className}
        `}>
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
            {user.foto ? (
                <img src={user.foto} alt={user.nombre} className="w-full h-full object-cover" />
            ) : (
                <span className="drop-shadow-lg">{user.nombre?.charAt(0).toUpperCase() || 'U'}</span>
            )}
        </div>
    );
}
