import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, ShoppingCart, Plus, Minus } from 'lucide-react';

// Product emoji map — match by lowercase keyword in product name
const getProductEmoji = (nombre) => {
    const n = (nombre || '').toLowerCase();
    if (n.includes('coca') || n.includes('pepsi') || n.includes('refresco') || n.includes('gaseosa')) return '🥤';
    if (n.includes('agua')) return '💧';
    if (n.includes('cerveza') || n.includes('polar') || n.includes('zulia')) return '🍺';
    if (n.includes('jugo') || n.includes('juice')) return '🧃';
    if (n.includes('café') || n.includes('cafe') || n.includes('coffee')) return '☕';
    if (n.includes('pan') || n.includes('galleta') || n.includes('arepa')) return '🍞';
    if (n.includes('arroz') || n.includes('rice')) return '🍚';
    if (n.includes('pasta') || n.includes('espagueti')) return '🍝';
    if (n.includes('pollo') || n.includes('chicken')) return '🍗';
    if (n.includes('carne') || n.includes('res')) return '🥩';
    if (n.includes('queso') || n.includes('cheese')) return '🧀';
    if (n.includes('leche') || n.includes('milk')) return '🥛';
    if (n.includes('huevo') || n.includes('egg')) return '🥚';
    if (n.includes('aceite') || n.includes('oil')) return '🫒';
    if (n.includes('azúcar') || n.includes('azucar') || n.includes('sugar')) return '🍬';
    if (n.includes('tomate') || n.includes('salsa')) return '🍅';
    if (n.includes('jabón') || n.includes('jabon') || n.includes('detergente') || n.includes('limpieza')) return '🧹';
    if (n.includes('papel') || n.includes('servilleta') || n.includes('rollo')) return '🧻';
    if (n.includes('cigarro') || n.includes('tabaco') || n.includes('cigarrillo')) return '🚬';
    if (n.includes('chip') || n.includes('snack') || n.includes('doritos') || n.includes('cheetos')) return '🍿';
    if (n.includes('chocolate') || n.includes('choco')) return '🍫';
    if (n.includes('helado') || n.includes('ice')) return '🍦';
    if (n.includes('harina') || n.includes('flour')) return '🌾';
    if (n.includes('mantequilla') || n.includes('butter') || n.includes('margarina')) return '🧈';
    if (n.includes('atún') || n.includes('atun') || n.includes('pescado') || n.includes('sardina')) return '🐟';
    if (n.includes('frijol') || n.includes('caraotas') || n.includes('lenteja')) return '🫘';
    if (n.includes('sal') || n.includes('condimento') || n.includes('especia')) return '🧂';
    return '📦';
};

export { getProductEmoji };

/**
 * Cart items list with quantity controls, product images/emoji,
 * and empty state.
 */
export default function ConsumptionCart({
    cart,
    onAddToCart,
    onRemoveOne,
}) {
    if (cart.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-3">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center">
                    <ShoppingCart size={28} className="text-slate-300" />
                </div>
                <div className="text-center">
                    <p className="text-xs font-bold text-slate-500">Carrito vacío</p>
                    <p className="text-[10px] text-slate-400 mt-1">Selecciona productos de la izquierda</p>
                </div>
            </div>
        );
    }

    return cart.map((item, idx) => (
        <motion.div
            key={item.product.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.03 }}
            className="bg-white p-2 rounded-xl border border-slate-100 flex items-center gap-3 shadow-sm group"
        >
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 bg-slate-50">
                {item.product.imagen ? (
                    <img src={item.product.imagen} className="w-full h-full object-cover" alt="" />
                ) : (
                    <span className="text-lg">{getProductEmoji(item.product.nombre)}</span>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-slate-700 truncate">{item.product.nombre}</h4>
                <p className="text-[10px] text-slate-400">${item.product.precio?.toFixed(2)} c/u</p>
            </div>
            <div className="flex items-center bg-slate-50 rounded-lg border border-slate-100">
                <button onClick={() => onRemoveOne(item.product.id)} className="w-7 h-7 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 rounded text-slate-400 transition-colors">
                    {item.cantidad === 1 ? <Trash2 size={11} /> : <Minus size={11} />}
                </button>
                <span className="text-xs font-bold w-5 text-center text-slate-600">{item.cantidad}</span>
                <button onClick={() => onAddToCart(item.product)} className="w-7 h-7 flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-500 rounded text-slate-400 transition-colors">
                    <Plus size={11} />
                </button>
            </div>
        </motion.div>
    ));
}
