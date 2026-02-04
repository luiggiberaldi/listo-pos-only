import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const GhostFlipbook = ({ images = [], fps = 2 }) => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (images.length <= 1) return;
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % images.length);
        }, 1000 / fps);
        return () => clearInterval(interval);
    }, [images, fps]);

    if (!images || images.length === 0) return null;

    return (
        <div className="relative w-full aspect-video bg-slate-950 rounded-lg overflow-hidden border border-violet-500/30">
            <AnimatePresence mode="wait">
                <motion.img
                    key={images[index]}
                    src={images[index]}
                    initial={{ opacity: 0, scale: 1.1, x: -10 }}
                    animate={{
                        opacity: 1,
                        scale: 1,
                        x: 0,
                        transition: { duration: 3, ease: "linear" }
                    }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full object-cover"
                />
            </AnimatePresence>
            <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-[8px] text-violet-300 font-mono uppercase tracking-tighter">
                Visual Cortex Active
            </div>
        </div>
    );
};
