import React from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, CreditCard } from 'lucide-react';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl text-xs">
                <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
                <p className="text-emerald-600 font-mono font-bold">${payload[0].value.toFixed(2)}</p>
            </div>
        );
    }
    return null;
};

export default function DashboardCharts({ salesByHour, salesByMethod, kpis }) {
    const renderTooltipFormatter = (value, name) => [
        `$${value.toFixed(2)}`,
        name
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
            {/* Sales Trend Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2 uppercase text-xs tracking-widest">
                    <TrendingUp size={18} className="text-blue-500" /> Tendencia del Flujo
                </h3>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesByHour}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} interval={3} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={(value) => `$${value}`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Sales by Method Pie Chart */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2 uppercase text-xs tracking-widest">
                    <CreditCard size={18} className="text-emerald-500" /> Arqueo por Método
                </h3>
                <div className="flex-1 w-full min-h-0 relative">
                    {salesByMethod.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={salesByMethod}
                                    cx="50%"
                                    cy="42%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {salesByMethod.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={renderTooltipFormatter} />
                                <Legend
                                    layout="horizontal" verticalAlign="bottom" align="center" iconType="circle"
                                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm italic">
                            <CreditCard size={32} className="mb-2 opacity-20" />
                            Sin movimientos hoy
                        </div>
                    )}

                    {salesByMethod.length > 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-14">
                            <span className="text-2xl font-black text-slate-700 dark:text-white">
                                ${kpis.totalVentas.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest">NETO</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
