import { useState, useEffect } from 'react';
import { ghostAnalytics } from '../../services/ghostAnalytics';
import { ghostService } from '../../services/ghostAI';
import { LineChart, BarChart3, MessageSquare, TrendingUp, Clock, Tag } from 'lucide-react';

export default function GhostAnalytics() {
    const [systemId, setSystemId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [topQuestions, setTopQuestions] = useState([]);
    const [usageByHour, setUsageByHour] = useState([]);
    const [topicDistribution, setTopicDistribution] = useState([]);
    const [dailyStats, setDailyStats] = useState([]);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        setLoading(true);

        // Get system ID from ghostService
        const sysId = ghostService.systemId;
        if (!sysId || sysId === "ID_PENDING") {
            console.warn("System ID not ready yet");
            setTimeout(loadAnalytics, 1000);
            return;
        }

        setSystemId(sysId);

        // Load all analytics data
        const [summaryRes, questionsRes, hourlyRes, topicsRes, dailyRes] = await Promise.all([
            ghostAnalytics.getSummaryStats(sysId),
            ghostAnalytics.getTopQuestions(sysId, 10),
            ghostAnalytics.getUsageByHour(sysId),
            ghostAnalytics.getTopicDistribution(sysId, 30),
            ghostAnalytics.getDailyStats(sysId, 7)
        ]);

        setSummary(summaryRes.data);
        setTopQuestions(questionsRes.data);
        setUsageByHour(hourlyRes.data);
        setTopicDistribution(topicsRes.data);
        setDailyStats(dailyRes.data);

        setLoading(false);
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="text-slate-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    Cargando estadísticas de Ghost...
                </div>
            </div>
        );
    }

    const maxHourlyCount = Math.max(...usageByHour.map(h => h.message_count), 1);
    const maxTopicCount = Math.max(...topicDistribution.map(t => t.count), 1);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    <BarChart3 className="text-purple-500" />
                    Análisis de Ghost AI
                </h1>
                <p className="text-slate-500 mt-2">
                    Estadísticas de uso y patrones de conversación
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <MessageSquare className="w-8 h-8 opacity-80" />
                        <span className="text-2xl font-bold">{summary?.totalMessages || 0}</span>
                    </div>
                    <div className="text-sm opacity-90">Mensajes Totales</div>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <TrendingUp className="w-8 h-8 opacity-80" />
                        <span className="text-2xl font-bold">{summary?.userMessages || 0}</span>
                    </div>
                    <div className="text-sm opacity-90">Preguntas de Usuarios</div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <MessageSquare className="w-8 h-8 opacity-80" />
                        <span className="text-2xl font-bold">{summary?.assistantMessages || 0}</span>
                    </div>
                    <div className="text-sm opacity-90">Respuestas de Ghost</div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl text-white shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <Clock className="w-8 h-8 opacity-80" />
                        <span className="text-2xl font-bold">{dailyStats.length}</span>
                    </div>
                    <div className="text-sm opacity-90">Días Activos (última semana)</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Questions */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <MessageSquare className="text-purple-500" size={24} />
                        Preguntas Más Frecuentes
                    </h2>
                    {topQuestions.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">No hay preguntas repetidas aún</p>
                    ) : (
                        <div className="space-y-3">
                            {topQuestions.map((q, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                                    <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-slate-700 truncate">{q.content}</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Preguntada {q.question_count} veces
                                        </p>
                                    </div>
                                    <span className="flex-shrink-0 bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                                        {q.question_count}x
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Topic Distribution */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Tag className="text-blue-500" size={24} />
                        Distribución por Temas
                    </h2>
                    {topicDistribution.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">No hay datos suficientes</p>
                    ) : (
                        <div className="space-y-4">
                            {topicDistribution.map((topic, idx) => {
                                const percentage = (topic.count / maxTopicCount) * 100;
                                const colors = {
                                    'Ventas': 'bg-green-500',
                                    'Inventario': 'bg-blue-500',
                                    'Clientes': 'bg-purple-500',
                                    'Precios': 'bg-orange-500',
                                    'Reportes': 'bg-pink-500',
                                    'Otros': 'bg-slate-400'
                                };
                                return (
                                    <div key={idx}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-slate-700">{topic.topic}</span>
                                            <span className="text-sm font-bold text-slate-600">{topic.count}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                            <div
                                                className={`h-full ${colors[topic.topic] || 'bg-slate-400'} transition-all duration-500`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Usage by Hour */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Clock className="text-green-500" size={24} />
                        Uso por Hora del Día
                    </h2>
                    {usageByHour.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">No hay datos suficientes</p>
                    ) : (
                        <div className="space-y-2">
                            {usageByHour.map((hour) => {
                                const percentage = (hour.message_count / maxHourlyCount) * 100;
                                const hourStr = `${hour.hour_of_day}:00`;
                                return (
                                    <div key={hour.hour_of_day} className="flex items-center gap-3">
                                        <span className="text-xs font-mono text-slate-500 w-12">{hourStr}</span>
                                        <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500 flex items-center justify-end pr-2"
                                                style={{ width: `${percentage}%` }}
                                            >
                                                {percentage > 20 && (
                                                    <span className="text-xs font-bold text-white">{hour.message_count}</span>
                                                )}
                                            </div>
                                        </div>
                                        {percentage <= 20 && (
                                            <span className="text-xs font-bold text-slate-600 w-8">{hour.message_count}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Daily Stats */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <LineChart className="text-orange-500" size={24} />
                        Actividad de los Últimos 7 Días
                    </h2>
                    {dailyStats.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">No hay actividad reciente</p>
                    ) : (
                        <div className="space-y-3">
                            {dailyStats.map((day, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">
                                            {new Date(day.date).toLocaleDateString('es-VE', {
                                                weekday: 'short',
                                                day: 'numeric',
                                                month: 'short'
                                            })}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {day.active_hours} horas activas
                                        </p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-blue-500">{day.user_messages}</p>
                                            <p className="text-xs text-slate-400">Preguntas</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-green-500">{day.assistant_messages}</p>
                                            <p className="text-xs text-slate-400">Respuestas</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Refresh Button */}
            <div className="mt-8 text-center">
                <button
                    onClick={loadAnalytics}
                    className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors shadow-lg"
                >
                    Actualizar Estadísticas
                </button>
            </div>
        </div>
    );
}
