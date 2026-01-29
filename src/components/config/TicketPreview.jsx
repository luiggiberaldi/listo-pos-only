// ✅ SYSTEM IMPLEMENTATION - V. 3.2 (LIVE PREVIEW SYNC)
// Archivo: src/components/config/TicketPreview.jsx
// Autorizado por Auditor en Fase 3 (Real-time Config)
// Rastro: Sincronización total de form state con renderizado de Ticket

import React, { useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import Ticket from '../Ticket'; 

export default function TicketPreview({ form }) {
  const { configuracion } = useStore();
  
  // 🔄 FUSIÓN EN TIEMPO REAL
  // Combina la config base guardada con los cambios "en vivo" del formulario
  const liveConfig = useMemo(() => {
      return {
          ...configuracion, // Base
          ...form           // Sobrescritura en vivo (incluye moneda, márgenes, textos)
      };
  }, [configuracion, form]);

  // 📝 DATOS DE PRUEBA (DUMMY DATA)
  // Datos estáticos para visualizar todos los escenarios posibles
  const previewData = {
      id: '000152',
      idVenta: '000152',
      fecha: new Date().toISOString(),
      
      // Totales calculados para la demo
      total: 12.50,        // $12.50
      subtotal: 10.78,     // Base imponible
      totalImpuesto: 1.72, // IVA 16%
      
      // Referencia en BS (se recalcula dinámicamente en el Ticket, pero lo pasamos por si acaso)
      totalBS: 12.50 * (liveConfig.tasa || 36.00),
      
      metodoPago: 'EFECTIVO',
      cliente: { 
          nombre: 'Cliente Demo', 
          rif: 'V-12345678', 
          cedula: 'V-12345678',
          direccion: 'Valencia, Carabobo'
      }, 
      usuario: { nombre: 'Cajero Prueba' },
      vendedor: 'Cajero Prueba',
      tasa: liveConfig.tasa || 36.00,
      
      // Items variados para probar alineación y wrap de texto
      items: [
          { 
              nombre: 'HARINA PAN (1KG)', 
              cantidad: 2, 
              precio: 1.50, 
              tipoUnidad: 'unidad',
              importe: 3.00
          },
          { 
              nombre: 'QUESO BLANCO DURO', 
              cantidad: 0.500, 
              precio: 8.00, 
              tipoUnidad: 'peso', // Probar decimales
              importe: 4.00
          },
          { 
              nombre: 'REFRESCO COCA-COLA 2L SABOR ORIGINAL', 
              cantidad: 1, 
              precio: 2.50, 
              tipoUnidad: 'unidad',
              importe: 2.50
          },
          {
              nombre: 'BOLSA PLÁSTICA',
              cantidad: 1,
              precio: 3.00, // Precio alto para probar conversión
              tipoUnidad: 'unidad',
              importe: 3.00
          }
      ]
  };

  // Cálculo del ancho visual basado en la configuración (aprox. conversion mm -> px)
  // 80mm ~ 300px, 58mm ~ 220px
  const widthMap = { '80mm': 'w-[320px]', '58mm': 'w-[240px]' };
  const paperWidthClass = widthMap[liveConfig.ticketAncho] || 'w-[320px]';
  const scaleClass = liveConfig.ticketAncho === '58mm' ? 'scale-100' : 'scale-95';

  return (
    <div className="h-full w-full overflow-y-auto p-8 flex justify-center bg-slate-200/50 dark:bg-black/20 custom-scrollbar">
        <div className={`relative transition-all duration-300 ${scaleClass} origin-top mt-4`}>
            
            {/* Efecto de Sombra Realista (Elevación) */}
            <div className={`absolute inset-0 bg-black/10 blur-xl translate-y-4 rounded-sm ${paperWidthClass}`} />
            
            {/* TICKET RENDERIZADO */}
            <div className={`relative bg-white text-black shadow-2xl ${paperWidthClass} min-h-[300px] p-0 transform-gpu`}>
                
                {/* COMPONENTE TICKET REAL */}
                <Ticket 
                    data={previewData} 
                    configOverride={liveConfig} // 🔑 AQUÍ PASA LA CONFIGURACIÓN EN VIVO
                />
                
                {/* Decoración de corte de papel (ZigZag CSS puro) */}
                <div 
                    className="absolute -bottom-2 left-0 right-0 h-4 bg-white z-20" 
                    style={{ 
                        maskImage: 'linear-gradient(45deg, transparent 33.333%, #000 33.333%, #000 66.667%, transparent 66.667%), linear-gradient(-45deg, transparent 33.333%, #000 33.333%, #000 66.667%, transparent 66.667%)',
                        maskSize: '10px 20px',
                        WebkitMaskImage: 'linear-gradient(45deg, transparent 33.333%, #000 33.333%, #000 66.667%, transparent 66.667%), linear-gradient(-45deg, transparent 33.333%, #000 33.333%, #000 66.667%, transparent 66.667%)',
                        WebkitMaskSize: '10px 20px'
                    }}
                />
            </div>
        </div>
    </div>
  );
}