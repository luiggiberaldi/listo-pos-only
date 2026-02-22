import React from 'react';
import { motion } from 'framer-motion';
import { Search, SearchX } from 'lucide-react';
import { getProductEmoji } from './ConsumptionCart';

/**
 * Product search bar + grid of product cards for adding to cart.
 */
export default function ProductGrid({
    searchTerm,
    setSearchTerm,
    filteredProducts,
    cart,
    onAddToCart,
}) {
    return (
        <div className="h-full flex flex-col">
            {/* Search Bar */}
            <div className="relative mb-6 shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Buscar producto por nombre o código..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    autoFocus
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 text-slate-700 font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-400 shadow-inner"
                />
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredProducts.map((product, idx) => {
                        const inCart = cart.find(i => i.product.id === product.id);
                        const emoji = getProductEmoji(product.nombre);
                        return (
                            <motion.button
                                key={product.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.02 }}
                                onClick={() => onAddToCart(product)}
                                className={`relative group p-4 rounded-2xl border text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col gap-2 ${inCart
                                    ? "bg-emerald-50 border-emerald-200 shadow-md ring-1 ring-emerald-500/20"
                                    : "bg-white border-slate-100 hover:border-emerald-200"
                                    }`}
                            >
                                <div className="flex justify-between items-start w-full">
                                    <div className={`w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center transition-transform group-hover:scale-110 ${inCart ? 'bg-emerald-100' : 'bg-slate-50 group-hover:bg-emerald-50'}`}>
                                        {product.imagen ? (
                                            <img src={product.imagen} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <span className="text-lg">{emoji}</span>
                                        )}
                                    </div>
                                    {inCart && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm"
                                        >
                                            x{inCart.cantidad}
                                        </motion.span>
                                    )}
                                </div>
                                <div className="w-full">
                                    <h4 className={`text-sm font-bold line-clamp-2 leading-tight ${inCart ? 'text-emerald-900' : 'text-slate-700'}`}>{product.nombre}</h4>
                                    <div className="mt-2 flex justify-between items-end">
                                        <span className={`text-[10px] font-bold uppercase tracking-wide ${product.stock <= 3 ? 'text-amber-500' : 'text-slate-400'}`}>
                                            {product.stock} UNDS
                                        </span>
                                        <span className="text-emerald-600 font-black text-sm">${product.precio?.toFixed(2)}</span>
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>
                {filteredProducts.length === 0 && (
                    <div className="h-48 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">
                            <SearchX size={28} className="text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-500">No se encontraron productos</p>
                        <p className="text-[10px] text-slate-400 mt-1">Intenta con otro término de búsqueda</p>
                    </div>
                )}
            </div>
        </div>
    );
}
