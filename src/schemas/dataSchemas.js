import { z } from 'zod';

// 🛡️ DATA HEALTH LAYER 2: VALIDATION (Anti-Crash)
// Schemas to ensure loaded data matches expected structure

export const appConfigSchema = z.object({
    // Critical Fields
    nombre: z.string().default("LISTO POS"),
    tasa: z.number().default(0),
    tipoTasa: z.enum(['USD', 'EUR']).default('USD'),
    monedaBase: z.enum(['USD', 'EUR', 'VES']).default('USD'),

    // Security
    pinAdmin: z.string().min(4).default("123456"),
    pinEmpleado: z.string().min(4).default("000000"),

    // Features (Booleans)
    permitirSinStock: z.boolean().default(false),
    modoOscuro: z.boolean().default(false),

    // Ticket Config (Safe Defaults)
    ticketAncho: z.string().default('80mm'),
    ticketMarginX: z.number().default(2),

    // Allow extra fields to strictly avoid data loss during schema evolution
}).passthrough();

export const securityLogSchema = z.array(z.object({
    id: z.string(),
    tipo: z.string(),
    timestamp: z.string().datetime().optional(), // Allow loose date for legacy
    usuarioId: z.string().optional()
})).default([]);

export const auditTemplateSchema = z.array(z.object({
    id: z.number(),
    nombre: z.string(),
    productosIds: z.array(z.number())
})).default([]);

export const auditSessionSchema = z.array(z.object({
    id: z.number(),
    estado: z.string(),
    fechaInicio: z.string(),
    items: z.array(z.any()) // Validation inside items is complex, keeping loose for now
})).default([]);
