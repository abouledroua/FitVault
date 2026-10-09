"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  Package, Plus, Search, Edit3, Trash2, AlertTriangle, 
  CheckCircle, Scale, X, Archive, ArchiveRestore, RefreshCw, Barcode
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

interface Product {
  id: number;
  barcode?: string;
  name: string;
  category: string;
  product_type: 'standard' | 'fractional';
  buy_price_unit: string;
  sell_price_unit: string;
  container_capacity?: string;
  serving_dose_size?: string;
  sell_price_whole?: string;
  sell_price_dose?: string;
  sell_price_per_100g?: string;
  stock_quantity: string;
  min_stock_alert: string;
  is_archived?: boolean | number;
}

export default function ProduitsPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirmDialog();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal State
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    barcode: '',
    category: '',
    product_type: 'standard' as 'standard' | 'fractional',
    buy_price_unit: '',
    sell_price_unit: '',
    container_capacity: '',
    serving_dose_size: '',
    sell_price_whole: '',
    sell_price_dose: '',
    sell_price_per_100g: '',
    stock_quantity: '',
    min_stock_alert: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error(err);
      showToast('Erreur de chargement des produits', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Distinct categories for assistant and filter
  const existingCategories = useMemo(() => {
    const list = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    const defaults = ['Nutrition', 'Suppléments', 'Boissons', 'Snacks', 'Accessoires', 'Vêtements'];
    return Array.from(new Set([...list, ...defaults]));
  }, [products]);

  // Open modal
  const openProductModal = (prod?: Product) => {
    if (prod) {
      setEditingProduct(prod);
      setProductForm({
        name: prod.name,
        barcode: prod.barcode || '',
        category: prod.category || '',
        product_type: prod.product_type,
        buy_price_unit: prod.buy_price_unit,
        sell_price_unit: prod.sell_price_unit,
        container_capacity: prod.container_capacity || '',
        serving_dose_size: prod.serving_dose_size || '',
        sell_price_whole: prod.sell_price_whole || '',
        sell_price_dose: prod.sell_price_dose || '',
        sell_price_per_100g: prod.sell_price_per_100g || '',
        stock_quantity: prod.stock_quantity,
        min_stock_alert: prod.min_stock_alert
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        barcode: '',
        category: '',
        product_type: 'standard',
        buy_price_unit: '',
        sell_price_unit: '',
        container_capacity: '',
        serving_dose_size: '',
        sell_price_whole: '',
        sell_price_dose: '',
        sell_price_per_100g: '',
        stock_quantity: '',
        min_stock_alert: ''
      });
    }
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      showToast('Nom du produit requis', 'error');
      return;
    }

    try {
      const url = '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const payload = editingProduct ? { id: editingProduct.id, ...productForm } : productForm;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(editingProduct ? 'Produit mis à jour avec succès' : 'Produit ajouté au catalogue', 'success');
        setProductModalOpen(false);
        fetchProducts();
      } else {
        const err = await res.json();
        showToast(err.error || 'Erreur lors de l\'enregistrement', 'error');
      }
    } catch (err) {
      showToast('Erreur inattendue', 'error');
    }
  };

  const handleDeleteProduct = async (prod: Product) => {
    const isConfirmed = await confirm({
      title: 'Supprimer le produit',
      message: `Voulez-vous supprimer définitivement "${prod.name}" du catalogue ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDestructive: true
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/products?id=${prod.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Produit supprimé', 'success');
        fetchProducts();
      } else {
        const errData = await res.json().catch(() => null);
        showToast(errData?.error || 'Erreur lors de la suppression', 'error');
      }
    } catch (err) {
      showToast('Erreur inattendue', 'error');
    }
  };

  const handleToggleArchiveProduct = async (prod: Product) => {
    const willArchive = !prod.is_archived;
    const isConfirmed = await confirm({
      title: willArchive ? 'Archiver le produit' : 'Réactiver le produit',
      message: willArchive
        ? `Voulez-vous archiver "${prod.name}" ? Il ne sera plus affiché dans l'interface de vente.`
        : `Voulez-vous réactiver "${prod.name}" et le rendre visible dans l'interface de vente ?`,
      confirmText: willArchive ? 'Archiver' : 'Réactiver',
      cancelText: 'Annuler',
      isDestructive: false
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: prod.id, is_archived: willArchive })
      });
      if (res.ok) {
        showToast(
          willArchive ? 'Produit archivé (masqué du point de vente)' : 'Produit réactivé en vente',
          'success'
        );
        fetchProducts();
      } else {
        const errData = await res.json().catch(() => null);
        showToast(errData?.error || "Erreur lors de l'archivage", 'error');
      }
    } catch (err) {
      showToast('Erreur inattendue', 'error');
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const q = inventorySearch.trim().toLowerCase();
      const matchesSearch = !q || 
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));
      
      const matchesStatus = 
        inventoryStatusFilter === 'all' ? true :
        inventoryStatusFilter === 'archived' ? Boolean(p.is_archived) :
        !p.is_archived;

      const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCat;
    });
  }, [products, inventorySearch, inventoryStatusFilter, categoryFilter]);

  // Key stats
  const activeCount = useMemo(() => products.filter(p => !p.is_archived).length, [products]);
  const archivedCount = useMemo(() => products.filter(p => p.is_archived).length, [products]);
  const lowStockCount = useMemo(() => 
    products.filter(p => parseFloat(p.stock_quantity) <= parseFloat(p.min_stock_alert)).length, 
  [products]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
              <Package className="w-6 h-6" />
            </span>
            Catalogue & Gestion des Produits
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Administrez vos articles, codes-barres, formats en vrac (doses/poids), niveaux de stock et archivage.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={fetchProducts}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => openProductModal()}
            className="flex-1 md:flex-initial bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Nouveau Produit
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Total Catalogue</span>
          <span className="text-2xl font-black text-slate-900">{products.length}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">références enregistrées</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase text-emerald-600 block mb-1">En Vente</span>
          <span className="text-2xl font-black text-emerald-600">{activeCount}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">visibles au point de vente</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase text-amber-600 block mb-1">Archivés</span>
          <span className="text-2xl font-black text-amber-600">{archivedCount}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">masqués des ventes</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold uppercase text-red-600 block mb-1">Alerte Stock</span>
          <span className="text-2xl font-black text-red-600">{lowStockCount}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">sous le seuil minimum</span>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setInventoryStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              inventoryStatusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Tous ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setInventoryStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              inventoryStatusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-emerald-700'
            }`}
          >
            En Vente ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setInventoryStatusFilter('archived')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              inventoryStatusFilter === 'archived'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-amber-700'
            }`}
          >
            Archivés ({archivedCount})
          </button>
        </div>

        {/* Category & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {/* Category dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="all">Toutes les catégories</option>
            {existingCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher produit, code-barres..."
              value={inventorySearch}
              onChange={(e) => setInventorySearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            {inventorySearch && (
              <button
                type="button"
                onClick={() => setInventorySearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs flex flex-col sm:table">
            <thead className="hidden sm:table-header-group">
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase font-bold tracking-wider">
                <th className="py-3.5 px-5">Produit</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4">Format / Type</th>
                <th className="py-3.5 px-4">Catégorie</th>
                <th className="py-3.5 px-4">Prix Achat</th>
                <th className="py-3.5 px-4">Prix de Vente</th>
                <th className="py-3.5 px-4">Stock Restant</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="flex flex-col sm:table-row-group gap-3 sm:gap-0 divide-y-0 sm:divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Chargement des produits...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Aucun produit ne correspond à ces critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLowStock = parseFloat(p.stock_quantity) <= parseFloat(p.min_stock_alert);
                  const isArchived = Boolean(p.is_archived);
                  return (
                    <tr key={p.id} className={`flex flex-col sm:table-row bg-white sm:bg-transparent border border-slate-200 sm:border-0 rounded-xl sm:rounded-none p-3 sm:p-0 hover:bg-slate-50/80 transition-colors ${isArchived ? 'bg-slate-50/40 opacity-80' : ''}`}>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-5 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                        <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Produit</span>
                        <div className="text-right sm:text-left">
                          <div className="font-bold text-slate-900">{p.name}</div>
                          {p.barcode ? (
                            <span className="font-mono text-[10px] text-slate-400 flex items-center justify-end sm:justify-start gap-1 mt-0.5">
                              <Barcode className="w-3 h-3 text-slate-300" /> #{p.barcode}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-300 italic">Sans code-barres</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                        <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Statut</span>
                        <div className="text-right sm:text-left">
                          {isArchived ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                              <Archive className="w-3 h-3" /> Archivé
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                              <CheckCircle className="w-3 h-3" /> En Vente
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                        <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Format</span>
                        <div className="text-right sm:text-left">
                          {p.product_type === 'fractional' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-violet-50 text-violet-700 border border-violet-200 text-[10px]">
                              <Scale className="w-3 h-3" /> Vrac (Dose/Poids)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 text-[10px]">
                              Unité Simple
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                        <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Catégorie</span>
                        <span className="text-slate-600 font-semibold">{p.category || '—'}</span>
                      </td>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                        <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Prix Achat</span>
                        <span className="text-slate-500 font-mono">{p.buy_price_unit} DA</span>
                      </td>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                        <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Prix Vente</span>
                        <div className="font-bold text-slate-900 text-right sm:text-left">
                          {p.product_type === 'fractional' ? (
                            <span className="text-[11px] block max-w-[120px] sm:max-w-none text-right sm:text-left leading-tight">
                              Dose: {p.sell_price_dose} DA<br className="sm:hidden" />
                              <span className="hidden sm:inline"> | </span>100g: {p.sell_price_per_100g} DA
                            </span>
                          ) : (
                            <span>{p.sell_price_unit} DA</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                        <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Stock</span>
                        <div className="text-right sm:text-left">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                            isLowStock 
                              ? 'bg-red-50 text-red-600 border border-red-200' 
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          }`}>
                            {isLowStock && <AlertTriangle className="w-3 h-3" />}
                            {p.stock_quantity} {p.product_type === 'fractional' ? 'g' : 'pcs'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-5 flex justify-end sm:table-cell whitespace-nowrap text-right pt-3 sm:pt-0">
                        <button
                          onClick={() => openProductModal(p)}
                          title="Modifier le produit"
                          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg mr-1 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleArchiveProduct(p)}
                          title={isArchived ? "Réactiver en vente" : "Archiver (masquer du point de vente)"}
                          className={`p-1.5 rounded-lg mr-1 transition-colors ${
                            isArchived 
                              ? 'hover:bg-emerald-50 text-emerald-600' 
                              : 'hover:bg-amber-50 text-amber-600'
                          }`}
                        >
                          {isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p)}
                          title="Supprimer le produit"
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD / EDIT PRODUCT */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl p-4 sm:p-6 md:p-8 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sm:mb-5">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                {editingProduct ? 'Modifier le Produit' : 'Ajouter un Produit'}
              </h3>
              <button
                onClick={() => setProductModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                  Nom du Produit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Ex: Yaourt Protéiné, Whey Isolate, Eau..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                    Code-Barres
                  </label>
                  <input
                    type="text"
                    value={productForm.barcode}
                    onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                    placeholder="Scannez ou saisissez..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                    Catégorie
                  </label>
                  <input
                    type="text"
                    list="category-suggestions"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    placeholder="Ex: Nutrition, Boissons..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                  <datalist id="category-suggestions">
                    {existingCategories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                  Type de Vente
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setProductForm({ ...productForm, product_type: 'standard' })}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      productForm.product_type === 'standard'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Pièce Standard (Unité)
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductForm({ ...productForm, product_type: 'fractional' })}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      productForm.product_type === 'fractional'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    En Vrac (Dose / Poids)
                  </button>
                </div>
              </div>

              {/* Pricing section */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                    Prix Achat (Unité/Boîte)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.buy_price_unit}
                    onChange={(e) => setProductForm({ ...productForm, buy_price_unit: e.target.value })}
                    placeholder="0.00 DA"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                {productForm.product_type === 'standard' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                      Prix Vente Pièce <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={productForm.sell_price_unit}
                      onChange={(e) => setProductForm({ ...productForm, sell_price_unit: e.target.value })}
                      placeholder="0.00 DA"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Fractional fields if fractional */}
              {productForm.product_type === 'fractional' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="text-[11px] font-bold text-slate-700 uppercase">Tarification du Vrac (Grams / Doses)</div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Capacité Totale Boîte (g)</label>
                      <input
                        type="number"
                        value={productForm.container_capacity}
                        onChange={(e) => setProductForm({ ...productForm, container_capacity: e.target.value })}
                        placeholder="Ex: 2000 (g)"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Taille d'une Dose (g)</label>
                      <input
                        type="number"
                        value={productForm.serving_dose_size}
                        onChange={(e) => setProductForm({ ...productForm, serving_dose_size: e.target.value })}
                        placeholder="Ex: 30 (g)"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Prix Pot Entier</label>
                      <input
                        type="number"
                        value={productForm.sell_price_whole}
                        onChange={(e) => setProductForm({ ...productForm, sell_price_whole: e.target.value })}
                        placeholder="DA"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Prix Cuillère/Dose</label>
                      <input
                        type="number"
                        value={productForm.sell_price_dose}
                        onChange={(e) => setProductForm({ ...productForm, sell_price_dose: e.target.value })}
                        placeholder="DA"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-1">Prix par 100g</label>
                      <input
                        type="number"
                        value={productForm.sell_price_per_100g}
                        onChange={(e) => setProductForm({ ...productForm, sell_price_per_100g: e.target.value })}
                        placeholder="DA"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Stock Section */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                    Stock Initial ({productForm.product_type === 'fractional' ? 'g' : 'pcs'})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={productForm.stock_quantity}
                    onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
                    placeholder="Ex: 50"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                    Alerte Seuil Minimum
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={productForm.min_stock_alert}
                    onChange={(e) => setProductForm({ ...productForm, min_stock_alert: e.target.value })}
                    placeholder="Ex: 5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              </div>

              <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
