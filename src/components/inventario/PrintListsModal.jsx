import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Printer, Plus, FileText, Check, Search, List } from 'lucide-react';
import Swal from 'sweetalert2';

export const PrintListsModal = ({ isOpen, onClose, selectedIds = new Set(), allProducts = [], onPrint, onClearSelection }) => {
    const [lists, setLists] = useState([]);
    const [newListName, setNewListName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Cargar listas guardadas
    useEffect(() => {
        const savedLists = localStorage.getItem('listo_print_lists');
        if (savedLists) {
            setLists(JSON.parse(savedLists));
        }
    }, []);

    // Guardar listas
    const saveListsToStorage = (newLists) => {
        setLists(newLists);
        localStorage.setItem('listo_print_lists', JSON.stringify(newLists));
    };

    if (!isOpen) return null;

    // Productos seleccionados actualmente
    const currentSelectionCount = selectedIds.size;
    const currentSelectionProducts = allProducts.filter(p => selectedIds.has(p.id));

    const handleCreateList = () => {
        if (!newListName.trim()) return Swal.fire('Error', 'Escribe un nombre para la lista', 'warning');
        if (selectedIds.size === 0) return Swal.fire('Error', 'Selecciona al menos un producto para crear una lista', 'warning');

        const newList = {
            id: Date.now().toString(),
            name: newListName.trim(),
            productIds: Array.from(selectedIds),
            date: new Date().toISOString()
        };

        const updatedLists = [newList, ...lists];
        saveListsToStorage(updatedLists);
        setNewListName('');
        Swal.fire({
            title: '¡Lista Guardada!',
            text: `"${newList.name}" con ${newList.productIds.length} productos.`,
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });
    };

    const handleDeleteList = (id) => {
        Swal.fire({
            title: '¿Borrar lista?',
            text: "No podrás deshacer esto.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, borrar'
        }).then((result) => {
            if (result.isConfirmed) {
                const updated = lists.filter(l => l.id !== id);
                saveListsToStorage(updated);
            }
        });
    };

    const handleLoadAndPrint = (list) => {
        // Encontrar productos que aún existen en el inventario
        const productsToPrint = allProducts.filter(p => list.productIds.includes(p.id));

        if (productsToPrint.length === 0) {
            return Swal.fire('Error', 'Ninguno de los productos de esta lista existe ya en el inventario.', 'error');
        }

        if (productsToPrint.length < list.productIds.length) {
            Swal.fire({
                title: 'Advertencia',
                text: `Solo se encontraron ${productsToPrint.length} de los ${list.productIds.length} productos originales. El resto pudo haber sido eliminado.`,
                icon: 'warning'
            });
        }

        onClose();
        onPrint(productsToPrint, `Lista: ${list.name}`);
    };

    const handleQuickPrint = () => {
        if (selectedIds.size === 0) return;
        onClose();
        onPrint(currentSelectionProducts, "Selección Manual");
    };

    const filteredLists = lists.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-white/10 flex flex-col max-h-[80vh] overflow-hidden">

                {/* HEADER */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                            <List className="text-indigo-600" /> Gestor de Listas de Impresión
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                            Organiza tus impresiones por pasillos, categorías o grupos frecuentes.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                {/* CREAR NUEVA LISTA (Si hay selección) */}
                {currentSelectionCount > 0 && (
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 border-b border-indigo-100 dark:border-indigo-900/30">
                        <div className="flex items-center gap-2 mb-2 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                            <Check size={16} />
                            <span>{currentSelectionCount} productos seleccionados actualmente</span>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Nombre para esta lista (ej: Pasillo 1, Nevera...)"
                                className="flex-1 px-4 py-2 rounded-xl text-sm border border-indigo-200 dark:border-indigo-800 focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-900"
                                value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                                autoFocus
                            />
                            <button
                                onClick={handleCreateList}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <Save size={16} /> Guardar Lista
                            </button>
                            <div className="w-px h-8 bg-indigo-200 dark:bg-indigo-800 mx-2"></div>
                            <button
                                onClick={handleQuickPrint}
                                className="bg-white hover:bg-slate-50 text-indigo-600 border border-indigo-200 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
                            >
                                <Printer size={16} /> Imprimir Ahora
                            </button>
                        </div>
                    </div>
                )}

                {/* BUSCADOR */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar lista guardada..."
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* LISTA DE LISTAS */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50 dark:bg-black/20">
                    {filteredLists.length === 0 ? (
                        <div className="text-center py-12 opacity-50">
                            <FileText size={48} className="mx-auto mb-4 text-slate-300" />
                            <p className="text-slate-500 font-medium">No hay listas guardadas</p>
                            <p className="text-xs text-slate-400 mt-1">Selecciona productos en el inventario para crear una.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {filteredLists.map(list => (
                                <div key={list.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex justify-between items-center group">
                                    <div>
                                        <h3 className="font-bold text-slate-700 dark:text-slate-200">{list.name}</h3>
                                        <p className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-2">
                                            <span>{list.productIds.length} productos</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                            <span>{new Date(list.date).toLocaleDateString()}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleLoadAndPrint(list)}
                                            className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                        >
                                            <Printer size={16} /> Imprimir
                                        </button>
                                        <button
                                            onClick={() => handleDeleteList(list.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Eliminar lista"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
