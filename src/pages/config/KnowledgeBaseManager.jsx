import { useState, useEffect } from 'react';
import { ghostKnowledge } from '../../services/ghostKnowledge';
import { ghostService } from '../../services/ghostAI';
import { initializeFactoryKnowledge } from '../../services/ghostFactoryKnowledge';
import { Book, Plus, Edit2, Trash2, Search, Save, X, TrendingUp, RefreshCw, Zap } from 'lucide-react';
import Swal from 'sweetalert2';

const CATEGORIES = ['Ventas', 'Inventario', 'Clientes', 'Políticas', 'Procedimientos', 'Reportes', 'Otros'];

export default function KnowledgeBaseManager() {
    const [systemId, setSystemId] = useState(null);
    const [articles, setArticles] = useState([]);
    const [groupedArticles, setGroupedArticles] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingArticle, setEditingArticle] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category: 'Ventas',
        keywords: ''
    });

    useEffect(() => {
        loadArticles();
    }, []);

    const [retryCount, setRetryCount] = useState(0);

    const loadArticles = async () => {
        setLoading(true);

        try {
            const sysId = ghostService.systemId;

            // Retry logic with max 5 attempts
            if (!sysId || sysId === "ID_PENDING") {
                if (retryCount < 5) {
                    console.warn(`System ID pending. Retrying... (${retryCount + 1}/5)`);
                    setRetryCount(prev => prev + 1);
                    setTimeout(loadArticles, 1000);
                    return;
                } else {
                    console.error("System ID fetch timeout. Using fallback.");
                    setSystemId("OFFLINE_DEBUG");
                    setArticles([]);
                    setGroupedArticles({});
                    setLoading(false);
                    return;
                }
            }

            setSystemId(sysId);

            const { data, error } = await ghostKnowledge.getArticles(sysId);

            // Initialize factory knowledge if KB is empty
            if (!error && data && data.length === 0) {
                console.log('📚 KB vacía, inicializando conocimiento de fábrica...');
                const { success, articlesCreated } = await initializeFactoryKnowledge(sysId);
                if (success && articlesCreated > 0) {
                    // Reload articles after initialization
                    const { data: newData } = await ghostKnowledge.getArticles(sysId);
                    if (newData) {
                        setArticles(newData);
                        const grouped = newData.reduce((acc, article) => {
                            if (!acc[article.category]) acc[article.category] = [];
                            acc[article.category].push(article);
                            return acc;
                        }, {});
                        setGroupedArticles(grouped);
                    }
                }
            } else if (!error && data) {
                setArticles(data);
                // Group by category
                const grouped = data.reduce((acc, article) => {
                    if (!acc[article.category]) acc[article.category] = [];
                    acc[article.category].push(article);
                    return acc;
                }, {});
                setGroupedArticles(grouped);
            }
        } catch (error) {
            console.error("Error loading knowledge base:", error);
            setArticles([]);
            setGroupedArticles({});
        } finally {
            setLoading(false);
        }
    };

    const handleInitializeFactory = async () => {
        const result = await Swal.fire({
            title: 'Inicializar Base de Conocimiento',
            text: 'Esto agregará 15 artículos predeterminados con información esencial de Listo POS',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Inicializar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            const { success, articlesCreated } = await initializeFactoryKnowledge(systemId);
            if (success) {
                Swal.fire('Éxito', `Se crearon ${articlesCreated} artículos`, 'success');
                loadArticles();
            } else {
                Swal.fire('Error', 'No se pudo inicializar la base de conocimiento', 'error');
            }
        }
    };

    const handleRegenerateEmbeddings = async () => {
        const result = await Swal.fire({
            title: '🧠 Generar Cerebro Semántico',
            text: 'Esto leerá todos tus artículos y creará "vectores de pensamiento" para entender el significado detrás de las palabras. Puede tardar unos segundos.',
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Generar Vectores',
            confirmButtonColor: '#8b5cf6', // purple
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            Swal.fire({
                title: 'Procesando...',
                html: 'Mejorando inteligencia de Ghost...',
                timerProgressBar: true,
                didOpen: () => { Swal.showLoading(); }
            });

            const { success, count, error } = await ghostKnowledge.regenerateAllEmbeddings(systemId);

            if (success) {
                Swal.fire('¡Cerebro Actualizado!', `Se vectorizaron ${count} artículos. Ahora Ghost entiende mejor el contexto.`, 'success');
            } else {
                Swal.fire('Error', `Fallo en vectorización: ${error}`, 'error');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const keywords = formData.keywords.split(',').map(k => k.trim()).filter(k => k);
        const payload = {
            title: formData.title,
            content: formData.content,
            category: formData.category,
            keywords,
            systemId,
            createdBy: 'Owner'
        };

        if (editingArticle) {
            const { error } = await ghostKnowledge.updateArticle(editingArticle.id, payload);
            if (!error) {
                Swal.fire('Actualizado', 'Artículo actualizado exitosamente', 'success');
                resetForm();
                loadArticles();
            } else {
                Swal.fire('Error', 'No se pudo actualizar el artículo', 'error');
            }
        } else {
            const { error } = await ghostKnowledge.createArticle(payload);
            if (!error) {
                Swal.fire('Creado', 'Artículo creado exitosamente', 'success');
                resetForm();
                loadArticles();
            } else {
                Swal.fire('Error', 'No se pudo crear el artículo', 'error');
            }
        }
    };

    const handleEdit = (article) => {
        setEditingArticle(article);
        setFormData({
            title: article.title,
            content: article.content,
            category: article.category,
            keywords: article.keywords?.join(', ') || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: '¿Eliminar artículo?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            const { error } = await ghostKnowledge.deleteArticle(id);
            if (!error) {
                Swal.fire('Eliminado', 'Artículo eliminado exitosamente', 'success');
                loadArticles();
            }
        }
    };

    const resetForm = () => {
        setFormData({ title: '', content: '', category: 'Ventas', keywords: '' });
        setEditingArticle(null);
        setShowForm(false);
    };

    const filteredArticles = searchQuery
        ? articles.filter(a =>
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : articles;

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="text-slate-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    Cargando base de conocimiento...
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <Book className="text-purple-500" />
                        Base de Conocimiento de Ghost
                    </h1>
                    <p className="text-slate-500 mt-2">
                        Gestiona la documentación y conocimiento del negocio
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleRegenerateEmbeddings}
                        className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg"
                        title="Generar Embeddings Vectoriales (IA)"
                    >
                        <Zap size={20} />
                        Optimizar IA
                    </button>
                    <button
                        onClick={handleInitializeFactory}
                        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg"
                    >
                        <RefreshCw size={20} />
                        Inicializar KB
                    </button>
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg"
                    >
                        <Plus size={20} />
                        Nuevo Artículo
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar en la base de conocimiento..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Total Artículos</p>
                            <p className="text-3xl font-bold mt-1">{articles.length}</p>
                        </div>
                        <Book size={32} className="opacity-80" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Categorías</p>
                            <p className="text-3xl font-bold mt-1">{Object.keys(groupedArticles).length}</p>
                        </div>
                        <Book size={32} className="opacity-80" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Más Usado</p>
                            <p className="text-lg font-bold mt-1">
                                {articles.length > 0
                                    ? articles.sort((a, b) => b.usage_count - a.usage_count)[0]?.title.substring(0, 20) + '...'
                                    : 'N/A'
                                }
                            </p>
                        </div>
                        <TrendingUp size={32} className="opacity-80" />
                    </div>
                </div>
            </div>

            {/* Articles by Category */}
            {!showForm && (
                <div className="space-y-6">
                    {Object.entries(groupedArticles).map(([category, categoryArticles]) => (
                        <div key={category} className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-xl font-bold text-slate-800 mb-4">
                                📂 {category} ({categoryArticles.length})
                            </h2>
                            <div className="space-y-3">
                                {categoryArticles.map((article) => (
                                    <div
                                        key={article.id}
                                        className="flex items-start justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-800">{article.title}</h3>
                                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{article.content}</p>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                                                <span>Usado {article.usage_count || 0} veces</span>
                                                {article.keywords && article.keywords.length > 0 && (
                                                    <span>Keywords: {article.keywords.join(', ')}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            <button
                                                onClick={() => handleEdit(article)}
                                                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(article.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-slate-800">
                            {editingArticle ? 'Editar Artículo' : 'Nuevo Artículo'}
                        </h2>
                        <button onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-lg">
                            <X size={24} />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Título</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Categoría</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Contenido</label>
                            <textarea
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent h-40"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Palabras Clave (separadas por comas)
                            </label>
                            <input
                                type="text"
                                value={formData.keywords}
                                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="ej: devolución, cambio, reembolso"
                            />
                        </div>
                        <div className="flex gap-4">
                            <button
                                type="submit"
                                className="flex-1 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                                <Save size={20} />
                                {editingArticle ? 'Actualizar' : 'Crear'}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
