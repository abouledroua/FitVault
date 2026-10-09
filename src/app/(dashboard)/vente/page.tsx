"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ShoppingCart, History, Search, Plus, Minus, Trash2, CheckCircle, 
  User, Users, Scale, Package, AlertCircle, X, ChevronRight, 
  Receipt, Calendar, Filter, CreditCard, Banknote, RefreshCw, Eye, ArrowUpRight, Camera
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '@/contexts/ToastContext';

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

interface Member {
  id: number;
  barcode?: string;
  first_name: string;
  last_name: string;
  phone: string;
  total_debt: string;
  photo_url?: string;
}

interface CartItem {
  productId: number;
  name: string;
  format: 'piece_standard' | 'whole_pack' | 'spoon_dose' | 'by_weight';
  formatLabel: string;
  unitPrice: number;
  quantity: number;
}

interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product_name: string;
  barcode?: string;
  category?: string;
  sale_format: string;
  quantity_sold: string;
  stock_deducted: string;
  unit_price_charged: string;
  total_line_price: string;
}

interface SaleRecord {
  id: number;
  user_id: number;
  seller_username?: string;
  customer_type: 'member' | 'passage';
  member_id: number | null;
  member_first_name?: string;
  member_last_name?: string;
  member_phone?: string;
  member_photo_url?: string;
  guest_name?: string;
  total_amount: string;
  payment_method: 'cash' | 'card' | 'debt';
  sale_date: string;
  items: SaleItem[];
}

interface SalesSummary {
  totalAmount: string;
  salesCount: number;
  cashTotal: string;
  cardTotal: string;
  debtTotal: string;
}

export default function VentePage() {
  const { showToast } = useToast();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');

  // Products & Members for POS
  const [products, setProducts] = useState<Product[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [customerType, setCustomerType] = useState<'passage' | 'member'>('passage');
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [guestName, setGuestName] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const memberSearchContainerRef = useRef<HTMLDivElement>(null);

  // Close member dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        memberSearchContainerRef.current && 
        !memberSearchContainerRef.current.contains(e.target as Node)
      ) {
        setMemberDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedMember = useMemo(() => {
    return members.find(m => m.id === selectedMemberId) || null;
  }, [members, selectedMemberId]);

  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return members.slice(0, 10);
    const q = memberSearchQuery.toLowerCase().trim();
    return members.filter(m => 
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
      (m.phone && m.phone.includes(q)) ||
      (m.barcode && m.barcode.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [members, memberSearchQuery]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'debt'>('cash');
  const [processingSale, setProcessingSale] = useState(false);
  const [fractionalProduct, setFractionalProduct] = useState<Product | null>(null);

  // History State
  const [salesList, setSalesList] = useState<SaleRecord[]>([]);
  const [salesSummary, setSalesSummary] = useState<SalesSummary>({
    totalAmount: '0.00',
    salesCount: 0,
    cashTotal: '0.00',
    cardTotal: '0.00',
    debtTotal: '0.00'
  });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyPeriod, setHistoryPeriod] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historyCustomerFilter, setHistoryCustomerFilter] = useState<'all' | 'member' | 'passage'>('all');
  const [historyPaymentFilter, setHistoryPaymentFilter] = useState<'all' | 'cash' | 'card' | 'debt'>('all');
  const [historySearch, setHistorySearch] = useState('');

  // Selected Sale Details Modal
  const [selectedSaleDetails, setSelectedSaleDetails] = useState<SaleRecord | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchMembers();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchSalesHistory();
    }
  }, [activeTab, historyPeriod, historyStartDate, historyEndDate, historyCustomerFilter, historyPaymentFilter, historySearch]);

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
      showToast('Erreur lors du chargement des produits', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members');
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Sales History with active filters
  const fetchSalesHistory = async () => {
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams();

      // Compute dates based on period
      const today = new Date();
      const formatDate = (d: Date) => d.toISOString().split('T')[0];

      if (historyPeriod === 'today') {
        const str = formatDate(today);
        params.append('startDate', str);
        params.append('endDate', str);
      } else if (historyPeriod === 'yesterday') {
        const yest = new Date(today);
        yest.setDate(yest.getDate() - 1);
        const str = formatDate(yest);
        params.append('startDate', str);
        params.append('endDate', str);
      } else if (historyPeriod === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        params.append('startDate', formatDate(weekAgo));
        params.append('endDate', formatDate(today));
      } else if (historyPeriod === 'month') {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        params.append('startDate', formatDate(monthStart));
        params.append('endDate', formatDate(today));
      } else if (historyPeriod === 'custom') {
        if (historyStartDate) params.append('startDate', historyStartDate);
        if (historyEndDate) params.append('endDate', historyEndDate);
      }

      if (historyCustomerFilter !== 'all') {
        params.append('customerType', historyCustomerFilter);
      }
      if (historyPaymentFilter !== 'all') {
        params.append('paymentMethod', historyPaymentFilter);
      }
      if (historySearch.trim()) {
        params.append('search', historySearch.trim());
      }

      const res = await fetch(`/api/products/sales?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSalesList(data.sales || []);
        setSalesSummary(data.summary || {
          totalAmount: '0.00',
          salesCount: 0,
          cashTotal: '0.00',
          cardTotal: '0.00',
          debtTotal: '0.00'
        });
      }
    } catch (err) {
      console.error(err);
      showToast('Erreur lors du chargement de l\'historique', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Only active products are available for selling
  const activeProducts = useMemo(() => products.filter(p => !p.is_archived), [products]);

  // Categories list for POS
  const categories = ['all', ...Array.from(new Set(activeProducts.map(p => p.category)))];

  const filteredProducts = activeProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          (p.barcode && p.barcode.includes(searchFilter));
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // POS Add to Cart
  const handleProductClick = (prod: Product) => {
    if (prod.is_archived) {
      showToast('Ce produit est archivé et non disponible à la vente', 'error');
      return;
    }
    if (prod.product_type === 'fractional') {
      setFractionalProduct(prod);
      return;
    }

    addToCart(prod.id, prod.name, 'piece_standard', 'Unité', parseFloat(prod.sell_price_unit));
  };

  const addToCart = (
    productId: number, 
    name: string, 
    format: 'piece_standard' | 'whole_pack' | 'spoon_dose' | 'by_weight',
    formatLabel: string, 
    unitPrice: number
  ) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === productId && item.format === format);
      if (existing) {
        return prev.map(item => 
          item.productId === productId && item.format === format
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId, name, format, formatLabel, unitPrice, quantity: 1 }];
    });
  };

  const updateCartQty = (idx: number, delta: number) => {
    setCart(prev => {
      const next = [...prev];
      const item = next[idx];
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        next.splice(idx, 1);
      } else {
        next[idx] = { ...item, quantity: newQty };
      }
      return next;
    });
  };

  const removeFromCart = (idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  const cartTotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);

  // Barcode Scanning Handlers
  const scanBufferRef = useRef('');
  const lastScanTimeRef = useRef(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isCameraSupported, setIsCameraSupported] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      setIsCameraSupported(true);
    }
  }, []);

  const handleScanBarcodeSubmit = (e?: React.FormEvent, forceQuery?: string) => {
    if (e) e.preventDefault();
    const query = (forceQuery || searchFilter).trim();
    if (!query) return;

    const exactBarcode = activeProducts.find(
      p => p.barcode && p.barcode.trim().toLowerCase() === query.toLowerCase()
    );
    if (exactBarcode) {
      handleProductClick(exactBarcode);
      setSearchFilter('');
      showToast(`Article scanné : "${exactBarcode.name}" ajouté au panier !`, 'success');
      return;
    }

    if (filteredProducts.length === 1) {
      handleProductClick(filteredProducts[0]);
      setSearchFilter('');
      showToast(`Article ajouté : "${filteredProducts[0].name}"`, 'success');
      return;
    }

    if (filteredProducts.length === 0) {
      showToast(`Aucun article actif trouvé pour : "${query}"`, 'warning');
    }
  };

  // Hardware scanner listener
  useEffect(() => {
    if (activeTab !== 'pos') return;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (fractionalProduct) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastScanTimeRef.current;
      lastScanTimeRef.current = currentTime;

      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      if (e.key === 'Enter') {
        if (scanBufferRef.current.length >= 3) {
          const code = scanBufferRef.current.trim();
          scanBufferRef.current = '';
          const match = activeProducts.find(
            p => p.barcode && p.barcode.trim().toLowerCase() === code.toLowerCase()
          );
          if (match) {
            handleProductClick(match);
            showToast(`Article scanné : "${match.name}" ajouté !`, 'success');
          }
        }
        scanBufferRef.current = '';
        return;
      }

      if (e.key.length === 1) {
        if (timeDiff > 120 && isInput) {
          scanBufferRef.current = '';
          return;
        }

        if (timeDiff > 120) {
          scanBufferRef.current = e.key;
        } else {
          scanBufferRef.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [activeTab, fractionalProduct, activeProducts]);

  // Checkout POS
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast('Le panier est vide', 'error');
      return;
    }

    if (customerType === 'member' && !selectedMemberId) {
      showToast('Veuillez sélectionner un membre du club', 'error');
      return;
    }

    if (paymentMethod === 'debt' && customerType !== 'member') {
      showToast('Le paiement à crédit nécessite un membre enregistré', 'error');
      return;
    }

    setProcessingSale(true);
    try {
      const itemsPayload = cart.map(item => ({
        product_id: item.productId,
        sale_format: item.format,
        quantity_sold: item.quantity
      }));

      const res = await fetch('/api/products/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_type: customerType,
          member_id: customerType === 'member' ? selectedMemberId : null,
          guest_name: customerType === 'passage' ? (guestName || 'Client de Passage') : null,
          payment_method: paymentMethod,
          items: itemsPayload
        })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(
          paymentMethod === 'debt' 
            ? `Vente validée ! Montant (${data.grandTotal} DA) ajouté à la dette du membre.`
            : `Encaissement validé ! (${data.grandTotal} DA enregistrés en caisse)`,
          'success'
        );
        setCart([]);
        setGuestName('');
        fetchProducts(); // Refresh stock
      } else {
        showToast(data.error || 'Erreur lors de la vente', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Erreur inattendue lors de la vente', 'error');
    } finally {
      setProcessingSale(false);
    }
  };

  const formatFormatLabel = (fmt: string) => {
    switch (fmt) {
      case 'piece_standard': return 'Pièce / Unité';
      case 'spoon_dose': return 'Dose / Cuillère';
      case 'by_weight': return 'Portion 100g';
      case 'whole_pack': return 'Boîte / Pot entier';
      default: return fmt;
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <span className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <ShoppingCart className="w-6 h-6" />
          </span>
          Point de Vente & Ventes
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Enregistrez vos encaissements rapides et consultez le journal complet des ventes.
        </p>
      </div>

      {/* Redesigned Section Selector Under the Title (Matching Paramètres) */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Option 1: Point de Vente */}
          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className={`group flex items-center gap-3.5 p-3.5 rounded-xl border transition-all text-left ${
              activeTab === 'pos'
                ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-xs ring-1 ring-blue-200/50'
                : 'bg-slate-50/50 border-transparent hover:bg-slate-100/80 hover:border-slate-200 text-slate-600'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                activeTab === 'pos'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'bg-white text-slate-500 border border-slate-200 group-hover:text-blue-600 group-hover:border-blue-200'
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-sm truncate">Point de Vente</span>
                <span
                  className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                    activeTab === 'pos'
                      ? 'bg-blue-200/70 text-blue-800'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {activeProducts.length} articles
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                Caisse, scanner & encaissement direct
              </p>
            </div>
          </button>

          {/* Option 2: Historique des Ventes */}
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`group flex items-center gap-3.5 p-3.5 rounded-xl border transition-all text-left ${
              activeTab === 'history'
                ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-xs ring-1 ring-blue-200/50'
                : 'bg-slate-50/50 border-transparent hover:bg-slate-100/80 hover:border-slate-200 text-slate-600'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'bg-white text-slate-500 border border-slate-200 group-hover:text-blue-600 group-hover:border-blue-200'
              }`}
            >
              <History className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-sm truncate">Historique des Ventes</span>
                <span
                  className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                    activeTab === 'history'
                      ? 'bg-blue-200/70 text-blue-800'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {salesSummary.salesCount > 0 ? `${salesSummary.salesCount} ventes` : 'Journal'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                Journal des encaissements & filtres
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: POINT DE VENTE (POS) */}
      {/* ======================================================== */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLS: PRODUCT CATALOG FOR SELLING */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search & Barcode Scan Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <form onSubmit={handleScanBarcodeSubmit} className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Scanner un code-barres ou rechercher un article..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white transition-all"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {isCameraSupported && (
                  <button
                    type="button"
                    onClick={() => setCameraOpen(true)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2.5 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center transition-all shadow-xs"
                    title="Scanner avec la caméra"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ajouter</span>
                </button>
              </form>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat === 'all' ? 'Tous les articles' : cat}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                Chargement des articles...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400">
                <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                Aucun article disponible pour la vente dans cette sélection.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {filteredProducts.map((p) => {
                  const isFractional = p.product_type === 'fractional';
                  const isOutOfStock = parseFloat(p.stock_quantity) <= 0;

                  return (
                    <button
                      key={p.id}
                      onClick={() => handleProductClick(p)}
                      disabled={isOutOfStock}
                      className="bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md p-4 rounded-2xl flex flex-col justify-between text-left transition-all group relative disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {/* Product badges */}
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate max-w-[90px]">
                          {p.category || 'Général'}
                        </span>
                        {isFractional ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-violet-50 text-violet-700 border border-violet-100">
                            <Scale className="w-2.5 h-2.5" /> Vrac
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600">
                            Unité
                          </span>
                        )}
                      </div>

                      {/* Product Name */}
                      <h4 className="font-bold text-slate-900 text-xs line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors">
                        {p.name}
                      </h4>

                      {/* Price & Stock */}
                      <div className="pt-2 border-t border-slate-100 flex items-end justify-between w-full">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">
                            {isFractional ? 'À partir de' : 'Prix'}
                          </span>
                          <span className="text-sm font-black text-blue-600">
                            {isFractional ? (p.sell_price_dose || p.sell_price_whole || p.sell_price_unit) : p.sell_price_unit} 
                            <span className="text-[10px] font-bold text-slate-400 ml-0.5">DA</span>
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          isOutOfStock ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {p.stock_quantity} {isFractional ? 'g' : 'pcs'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT COL: ACTIVE CART & CHECKOUT */}
          <div className="space-y-4">
            <div id="pos-cart-panel" className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between min-h-[580px]">
              <div>
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-blue-600" />
                    Panier Actuel
                  </h3>
                  {cart.length > 0 && (
                    <button
                      onClick={() => setCart([])}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold"
                    >
                      Vider le panier
                    </button>
                  )}
                </div>

                {/* Customer Type Toggle */}
                <div className="space-y-2 py-3 border-b border-slate-100">
                  <span className="text-[11px] font-bold text-slate-700 uppercase block">Clientèle</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomerType('passage')}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        customerType === 'passage'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" /> Passage
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerType('member')}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        customerType === 'member'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" /> Membre du Club
                    </button>
                  </div>

                  {customerType === 'passage' ? (
                    <input
                      type="text"
                      placeholder="Nom du client (optionnel)"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  ) : (
                    <div ref={memberSearchContainerRef} className="mt-2 relative">
                      {selectedMember ? (
                        /* Selected Member Premium Card */
                        <div className="bg-white border-2 border-blue-100 rounded-2xl p-3 flex items-center justify-between shadow-sm transition-all hover:border-blue-300">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Member Photo or Fallback */}
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-white shadow-sm shrink-0 relative flex items-center justify-center">
                              {selectedMember.photo_url ? (
                                <img
                                  src={selectedMember.photo_url}
                                  alt={`${selectedMember.first_name} ${selectedMember.last_name}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span className="font-black text-blue-700 text-sm">
                                  {selectedMember.first_name?.[0]}{selectedMember.last_name?.[0]}
                                </span>
                              )}
                            </div>

                            {/* Member Details */}
                            <div className="min-w-0 flex flex-col justify-center">
                              <h4 className="font-bold text-slate-900 text-sm truncate leading-tight mb-0.5">
                                {selectedMember.first_name} {selectedMember.last_name}
                              </h4>
                              <p className="text-[11px] text-slate-500 font-medium truncate mb-1">
                                {selectedMember.phone || 'Sans téléphone'}
                                {selectedMember.barcode ? ` • #${selectedMember.barcode}` : ''}
                              </p>
                              
                              {/* Financial Debt Status */}
                              {parseFloat(selectedMember.total_debt) > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-700 font-bold text-[10px] border border-red-100 w-fit">
                                  <AlertCircle className="w-3 h-3" />
                                  Dette: {selectedMember.total_debt} DA
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-100 w-fit">
                                  <CheckCircle className="w-3 h-3" />
                                  Solde à jour
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Change / Deselect Member Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMemberId(null);
                              setMemberSearchQuery('');
                              setMemberDropdownOpen(true);
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all shrink-0 ml-2 shadow-xs border border-slate-100"
                            title="Changer de membre"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        /* Search Member Input with Live Dropdown & Photos */
                        <div className="relative">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              placeholder="Rechercher par nom, téléphone, code..."
                              value={memberSearchQuery}
                              onChange={(e) => {
                                setMemberSearchQuery(e.target.value);
                                setMemberDropdownOpen(true);
                              }}
                              onFocus={() => setMemberDropdownOpen(true)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8.5 pr-8 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-white transition-all"
                            />
                            {memberSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setMemberSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Autocomplete Dropdown List with Member Photos */}
                          {memberDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-64 overflow-y-auto p-2 animate-in fade-in zoom-in-95 space-y-1">
                              {filteredMembers.length === 0 ? (
                                <div className="p-4 text-center text-slate-400 text-xs">
                                  Aucun membre trouvé pour "{memberSearchQuery}"
                                </div>
                              ) : (
                                filteredMembers.map((m) => {
                                  const isSelected = m.id === selectedMemberId;
                                  const hasDebt = parseFloat(m.total_debt) > 0;
                                  return (
                                    <button
                                      key={m.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedMemberId(m.id);
                                        setMemberSearchQuery('');
                                        setMemberDropdownOpen(false);
                                      }}
                                      className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all ${
                                        isSelected
                                          ? 'bg-blue-50/80 border border-blue-200 text-blue-900 shadow-sm'
                                          : 'bg-transparent border border-transparent hover:bg-slate-50 hover:border-slate-200 text-slate-800'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        {/* Member Photo */}
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center shadow-xs">
                                          {m.photo_url ? (
                                            <img
                                              src={m.photo_url}
                                              alt=""
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                (e.target as HTMLElement).style.display = 'none';
                                              }}
                                            />
                                          ) : (
                                            <span className="font-bold text-slate-500 text-xs">
                                              {m.first_name?.[0]}{m.last_name?.[0]}
                                            </span>
                                          )}
                                        </div>

                                        <div className="min-w-0 flex flex-col justify-center">
                                          <div className={`font-bold text-sm truncate leading-tight ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                                            {m.first_name} {m.last_name}
                                          </div>
                                          <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                                            {m.phone || 'Sans tél'} {m.barcode ? `• #${m.barcode}` : ''}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Debt badge */}
                                      {hasDebt ? (
                                        <span className="shrink-0 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-100 font-bold text-[10px]">
                                          {m.total_debt} DA
                                        </span>
                                      ) : (
                                        <span className="shrink-0 px-2.5 py-1 rounded-lg text-emerald-700 font-bold text-[10px] bg-emerald-50 border border-emerald-100">
                                          À jour
                                        </span>
                                      )}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Cart Items List */}
                <div className="space-y-2 py-3 max-h-60 overflow-y-auto">
                  {cart.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                      <p className="text-xs">Le panier est actuellement vide.</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Cliquez sur un article pour l'ajouter.</p>
                    </div>
                  ) : (
                    cart.map((item, idx) => (
                      <div key={`${item.productId}-${item.format}-${idx}`} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                        <div className="flex-1 mr-2 min-w-0">
                          <h5 className="font-bold text-slate-900 text-xs truncate">{item.name}</h5>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span className="font-semibold text-blue-600">{item.formatLabel}</span>
                            <span>•</span>
                            <span>{item.unitPrice} DA / u</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => updateCartQty(idx, -1)}
                            className="p-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100"
                          >
                            <Minus className="w-3 h-3 text-slate-600" />
                          </button>
                          <span className="text-xs font-bold text-slate-900 w-5 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQty(idx, 1)}
                            className="p-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100"
                          >
                            <Plus className="w-3 h-3 text-slate-600" />
                          </button>
                          <button
                            onClick={() => removeFromCart(idx)}
                            className="p-1 text-red-400 hover:text-red-600 ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom Payment & Checkout */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                {/* Payment Method Selector */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 uppercase block">Mode de Règlement</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        paymentMethod === 'cash'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Espèces
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        paymentMethod === 'card'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Carte
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('debt')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        paymentMethod === 'debt'
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      En Dette
                    </button>
                  </div>
                </div>

                {/* Total & Button */}
                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-slate-500 font-semibold text-xs">Total à Encaisser:</span>
                  <span className="text-2xl font-black text-slate-900">
                    {cartTotal.toFixed(2)} <span className="text-sm font-bold text-blue-600">DA</span>
                  </span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={processingSale || cart.length === 0}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <CheckCircle className="w-5 h-5" />
                  {processingSale ? 'Validation...' : 'Valider & Encaisser'}
                </button>
              </div>
            </div>
          </div>

          {/* Floating Cart Quick Access for Mobile Screens */}
          {cart.length > 0 && (
            <div className="lg:hidden fixed bottom-4 left-4 right-4 z-30 animate-in slide-in-from-bottom-4">
              <button
                type="button"
                onClick={() => {
                  document.getElementById('pos-cart-panel')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between font-bold text-xs sm:text-sm transition-all border border-blue-500"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-white text-blue-600 flex items-center justify-center text-xs font-black shrink-0">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </div>
                  <span>Voir le Panier</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black">{cartTotal.toFixed(2)} DA</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: HISTORIQUE DES VENTES & FILTRES */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Chiffre d'Affaires</span>
              <span className="text-2xl font-black text-slate-900">{salesSummary.totalAmount} <span className="text-xs text-blue-600">DA</span></span>
              <span className="text-[11px] text-slate-400 block mt-0.5">{salesSummary.salesCount} vente(s) enregistrée(s)</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-emerald-600 block mb-1">Total Espèces</span>
              <span className="text-2xl font-black text-emerald-600">{salesSummary.cashTotal} <span className="text-xs text-slate-400">DA</span></span>
              <span className="text-[11px] text-slate-400 block mt-0.5">encaissé cash</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-blue-600 block mb-1">Total Carte</span>
              <span className="text-2xl font-black text-blue-600">{salesSummary.cardTotal} <span className="text-xs text-slate-400">DA</span></span>
              <span className="text-[11px] text-slate-400 block mt-0.5">paiements électroniques</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-red-600 block mb-1">En Dette / Crédit</span>
              <span className="text-2xl font-black text-red-600">{salesSummary.debtTotal} <span className="text-xs text-slate-400">DA</span></span>
              <span className="text-[11px] text-slate-400 block mt-0.5">à recouvrer auprès des membres</span>
            </div>
          </div>

          {/* ADVANCED FILTER TOOLBAR */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Quick Period Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setHistoryPeriod('today')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    historyPeriod === 'today'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Aujourd'hui
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryPeriod('yesterday')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    historyPeriod === 'yesterday'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Hier
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryPeriod('week')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    historyPeriod === 'week'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  7 derniers jours
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryPeriod('month')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    historyPeriod === 'month'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Ce mois
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryPeriod('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    historyPeriod === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Tout
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryPeriod('custom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    historyPeriod === 'custom'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Personnalisé
                </button>
              </div>

              {/* Search input */}
              <div className="relative w-full lg:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ticket #, nom client, tél..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                {historySearch && (
                  <button
                    type="button"
                    onClick={() => setHistorySearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Custom Dates & Filters Row */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
              {historyPeriod === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={historyStartDate}
                    onChange={(e) => setHistoryStartDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700"
                  />
                  <span className="text-slate-400 text-xs">à</span>
                  <input
                    type="date"
                    value={historyEndDate}
                    onChange={(e) => setHistoryEndDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700"
                  />
                </div>
              )}

              {/* Customer Type Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Client :</span>
                <select
                  value={historyCustomerFilter}
                  onChange={(e: any) => setHistoryCustomerFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option value="all">Tous les clients</option>
                  <option value="member">Membres du club</option>
                  <option value="passage">Clients de passage</option>
                </select>
              </div>

              {/* Payment Method Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Règlement :</span>
                <select
                  value={historyPaymentFilter}
                  onChange={(e: any) => setHistoryPaymentFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                  <option value="all">Tous les règlements</option>
                  <option value="cash">Espèces</option>
                  <option value="card">Carte bancaire</option>
                  <option value="debt">En dette (Crédit)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={fetchSalesHistory}
                className="ml-auto p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors"
                title="Actualiser la liste"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* SALES LIST TABLE */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs flex flex-col sm:table">
                <thead className="hidden sm:table-header-group">
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase font-bold tracking-wider">
                    <th className="py-3.5 px-5">Ticket #</th>
                    <th className="py-3.5 px-4">Date & Heure</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Articles Achetés</th>
                    <th className="py-3.5 px-4">Mode de Règlement</th>
                    <th className="py-3.5 px-4">Montant Total</th>
                    <th className="py-3.5 px-5 text-right">Détails</th>
                  </tr>
                </thead>
                <tbody className="flex flex-col sm:table-row-group gap-3 sm:gap-0 divide-y-0 sm:divide-y divide-slate-100 font-medium">
                  {loadingHistory ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                        Chargement de l'historique des ventes...
                      </td>
                    </tr>
                  ) : salesList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        Aucune vente trouvée pour cette période et ces critères.
                      </td>
                    </tr>
                  ) : (
                    salesList.map((sale) => {
                      const dateObj = new Date(sale.sale_date);
                      const formattedDate = dateObj.toLocaleDateString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: 'numeric'
                      });
                      const formattedTime = dateObj.toLocaleTimeString('fr-FR', {
                        hour: '2-digit', minute: '2-digit'
                      });

                      const itemCount = sale.items?.length || 0;
                      const itemsPreview = sale.items?.map(i => `${i.product_name} (x${parseFloat(i.quantity_sold)})`).join(', ') || 'Articles divers';

                      return (
                        <tr key={sale.id} className="flex flex-col sm:table-row bg-white sm:bg-transparent border border-slate-200 sm:border-0 rounded-xl sm:rounded-none p-3 sm:p-0 hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 sm:py-3.5 px-1 sm:px-5 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                            <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Ticket #</span>
                            <div className="text-right sm:text-left">
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                                #{sale.id}
                              </span>
                              {sale.seller_username && (
                                <span className="text-[10px] text-slate-400 block mt-0.5">par {sale.seller_username}</span>
                              )}
                            </div>
                          </td>

                          <td className="py-2 sm:py-3.5 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0 whitespace-nowrap">
                            <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Date & Heure</span>
                            <div className="text-right sm:text-left">
                              <span className="font-bold text-slate-900">{formattedDate}</span>
                              <span className="text-slate-400 text-[10px] block">{formattedTime}</span>
                            </div>
                          </td>

                          <td className="py-2 sm:py-3.5 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                            <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Client</span>
                            <div className="text-right sm:text-left flex justify-end sm:justify-start">
                              {sale.customer_type === 'member' ? (
                                <div className="flex items-center gap-3 flex-row-reverse sm:flex-row text-right sm:text-left">
                                  <div className="min-w-0 flex flex-col justify-center">
                                    <span className="font-bold text-slate-900 block truncate leading-tight">
                                      {sale.member_first_name} {sale.member_last_name}
                                    </span>
                                    <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-1 mt-0.5 justify-end sm:justify-start">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                                      Membre du Club
                                    </span>
                                  </div>
                                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-xs relative">
                                    {sale.member_photo_url ? (
                                      <img
                                        src={sale.member_photo_url}
                                        alt={`${sale.member_first_name} ${sale.member_last_name}`}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLElement).style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[11px] uppercase">
                                        {sale.member_first_name?.[0] || 'M'}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2.5 flex-row-reverse sm:flex-row text-right sm:text-left">
                                  <div className="min-w-0">
                                    <span className="font-bold text-slate-700 block truncate">
                                      {sale.guest_name || 'Client de Passage'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium block">
                                      Passage
                                    </span>
                                  </div>
                                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                                    <User className="w-4 h-4 text-slate-400" />
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-2 sm:py-3.5 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0 max-w-none sm:max-w-xs">
                            <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Articles Achetés</span>
                            <div className="text-right sm:text-left">
                              <div className="font-bold text-slate-800 text-[11px]">
                                {itemCount} article{itemCount > 1 ? 's' : ''}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-[150px] md:max-w-xs" title={itemsPreview}>
                                {itemsPreview}
                              </div>
                            </div>
                          </td>

                          <td className="py-2 sm:py-3.5 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                            <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Mode de Règlement</span>
                            <div className="text-right sm:text-left">
                              {sale.payment_method === 'cash' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                                  <Banknote className="w-3 h-3" /> Espèces
                                </span>
                              )}
                              {sale.payment_method === 'card' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">
                                  <CreditCard className="w-3 h-3" /> Carte
                                </span>
                              )}
                              {sale.payment_method === 'debt' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-red-50 text-red-700 border border-red-200 text-[10px]">
                                  <AlertCircle className="w-3 h-3" /> Dette (Crédit)
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-2 sm:py-3.5 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                            <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Montant Total</span>
                            <div className="font-black text-slate-900 text-sm whitespace-nowrap text-right sm:text-left">
                              {sale.total_amount} <span className="text-xs font-bold text-blue-600">DA</span>
                            </div>
                          </td>

                          <td className="py-2 sm:py-3.5 px-1 sm:px-5 flex justify-end sm:table-cell whitespace-nowrap text-right pt-3 sm:pt-0">
                            <button
                              onClick={() => setSelectedSaleDetails(sale)}
                              className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors font-bold text-xs inline-flex items-center gap-1"
                              title="Voir le ticket complet"
                            >
                              <Eye className="w-3.5 h-3.5" /> Détails
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
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: FRACTIONAL PRODUCT FORMAT SELECTION (POS) */}
      {/* ======================================================== */}
      {fractionalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl p-4 sm:p-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-100 mb-1.5">
                  <Scale className="w-3 h-3" /> Produit en Vrac
                </span>
                <h3 className="font-bold text-slate-900 text-base">{fractionalProduct.name}</h3>
                <p className="text-xs text-slate-500">Sélectionnez le format souhaité pour ce client :</p>
              </div>
              <button
                onClick={() => setFractionalProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {fractionalProduct.sell_price_dose && (
                <button
                  onClick={() => {
                    addToCart(
                      fractionalProduct.id, 
                      fractionalProduct.name, 
                      'spoon_dose', 
                      `Cuillère / Dose (${fractionalProduct.serving_dose_size || 30}g)`, 
                      parseFloat(fractionalProduct.sell_price_dose!)
                    );
                    setFractionalProduct(null);
                  }}
                  className="w-full p-4 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 flex justify-between items-center transition-all group text-left"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">À la Cuillère / Dose ({fractionalProduct.serving_dose_size || 30}g)</span>
                    <span className="text-xs text-slate-500">Préparé sur place dans un shaker</span>
                  </div>
                  <span className="text-lg font-black text-blue-600 group-hover:scale-105 transition-transform">
                    {fractionalProduct.sell_price_dose} DA
                  </span>
                </button>
              )}

              {fractionalProduct.sell_price_per_100g && (
                <button
                  onClick={() => {
                    addToCart(
                      fractionalProduct.id, 
                      fractionalProduct.name, 
                      'by_weight', 
                      'Portion 100g (Poids)', 
                      parseFloat(fractionalProduct.sell_price_per_100g!)
                    );
                    setFractionalProduct(null);
                  }}
                  className="w-full p-4 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 flex justify-between items-center transition-all group text-left"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">Au Poids (Portion 100g)</span>
                    <span className="text-xs text-slate-500">Sachet pesé</span>
                  </div>
                  <span className="text-lg font-black text-blue-600 group-hover:scale-105 transition-transform">
                    {fractionalProduct.sell_price_per_100g} DA
                  </span>
                </button>
              )}

              {fractionalProduct.sell_price_whole && (
                <button
                  onClick={() => {
                    addToCart(
                      fractionalProduct.id, 
                      fractionalProduct.name, 
                      'whole_pack', 
                      `Pot Entier (${fractionalProduct.container_capacity || 2000}g)`, 
                      parseFloat(fractionalProduct.sell_price_whole!)
                    );
                    setFractionalProduct(null);
                  }}
                  className="w-full p-4 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 flex justify-between items-center transition-all group text-left"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">Boîte / Sachet Entier ({fractionalProduct.container_capacity || 2000}g)</span>
                    <span className="text-xs text-slate-500">Produit complet scellé</span>
                  </div>
                  <span className="text-lg font-black text-blue-600 group-hover:scale-105 transition-transform">
                    {fractionalProduct.sell_price_whole} DA
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: DETAIL TICKET / HISTORIQUE DE VENTE */}
      {/* ======================================================== */}
      {selectedSaleDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl p-4 sm:p-6 md:p-8 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <span className="inline-flex items-center gap-1 font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg text-xs mb-1">
                  Ticket #{selectedSaleDetails.id}
                </span>
                <h3 className="font-bold text-slate-900 text-lg">Détails de l'Encaissement</h3>
                <span className="text-xs text-slate-400">
                  {new Date(selectedSaleDetails.sale_date).toLocaleString('fr-FR', {
                    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
              <button
                onClick={() => setSelectedSaleDetails(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sale metadata */}
            <div className="grid grid-cols-2 gap-3 py-4 border-b border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase mb-1">Client</span>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                    {selectedSaleDetails.customer_type === 'member' && selectedSaleDetails.member_photo_url ? (
                      <img
                        src={selectedSaleDetails.member_photo_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : selectedSaleDetails.customer_type === 'member' ? (
                      <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase">
                        {selectedSaleDetails.member_first_name?.[0] || 'M'}
                      </div>
                    ) : (
                      <User className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 block truncate">
                      {selectedSaleDetails.customer_type === 'member'
                        ? `${selectedSaleDetails.member_first_name} ${selectedSaleDetails.member_last_name}`
                        : (selectedSaleDetails.guest_name || 'Client de passage')}
                    </span>
                    {selectedSaleDetails.customer_type === 'member' ? (
                      <span className="text-[10px] text-blue-600 font-medium block">
                        {selectedSaleDetails.member_phone || 'Membre du club'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 block">Client de passage</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Règlement</span>
                <span className="font-bold text-slate-900 capitalize">
                  {selectedSaleDetails.payment_method === 'cash' ? 'Espèces' : selectedSaleDetails.payment_method === 'card' ? 'Carte bancaire' : 'En dette (Crédit)'}
                </span>
                {selectedSaleDetails.seller_username && (
                  <span className="text-[10px] text-slate-400 block">Encaissé par {selectedSaleDetails.seller_username}</span>
                )}
              </div>
            </div>

            {/* Items list */}
            <div className="py-4 space-y-3">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Lignes du Ticket</span>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                {selectedSaleDetails.items?.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50/50 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block">{item.product_name}</span>
                      <span className="text-[10px] text-slate-500">
                        {formatFormatLabel(item.sale_format)} • {item.unit_price_charged} DA × {parseFloat(item.quantity_sold)}
                      </span>
                    </div>
                    <span className="font-black text-slate-900">
                      {item.total_line_price} <span className="text-[10px] text-slate-400 font-bold">DA</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
              <span className="font-bold text-slate-700 text-sm">Total Réglé :</span>
              <span className="text-2xl font-black text-blue-600">
                {selectedSaleDetails.total_amount} <span className="text-sm">DA</span>
              </span>
            </div>

            <div className="mt-5 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSaleDetails(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {cameraOpen && (
        <BarcodeScannerModal
          onClose={() => setCameraOpen(false)}
          onScan={(decodedText) => {
            setSearchFilter(decodedText);
            setCameraOpen(false);
            // Small delay to allow react state to settle before submission
            setTimeout(() => {
              handleScanBarcodeSubmit(undefined, decodedText);
            }, 150);
          }}
        />
      )}
    </div>
  );
}

// Separate component to prevent SSR issues with html5-qrcode
function BarcodeScannerModal({ onClose, onScan }: { onClose: () => void, onScan: (decoded: string) => void }) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    
    // Give time for modal animation to render the div
    const timer = setTimeout(() => {
      html5QrCode = new Html5Qrcode("reader");
      html5QrCode.start(
        { facingMode: "environment" }, // Prefer back camera
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          if (html5QrCode && html5QrCode.isScanning) {
             html5QrCode.stop().then(() => {
               onScan(decodedText);
             }).catch(err => {
               console.error("Failed to stop scanning", err);
               onScan(decodedText); // Still trigger onScan
             });
          }
        },
        (err) => {
          // ignore scan failures
        }
      ).catch(err => {
         console.error("Failed to start scanner", err);
         setErrorMsg("Erreur caméra : " + (err?.message || err || "Accès refusé ou non supporté."));
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(e => console.error("Failed to stop scanner", e));
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black text-slate-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            Scanner le code-barres
          </h3>
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {errorMsg ? (
          <div className="p-6 text-center space-y-4" style={{ minHeight: '300px' }}>
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="w-8 h-8" />
            </div>
            <p className="font-bold text-slate-900">{errorMsg}</p>
            <p className="text-sm text-slate-500">
              Sur téléphone, le navigateur bloque la caméra sur les réseaux locaux HTTP par sécurité.
            </p>
            <div className="bg-slate-50 p-3 rounded-xl text-xs text-left text-slate-600 space-y-2">
              <p><strong>Solution Android (Chrome) :</strong></p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Allez sur <code>chrome://flags</code></li>
                <li>Cherchez <strong>Insecure origins treated as secure</strong></li>
                <li>Ajoutez votre adresse IP <code>http://192.168...</code></li>
                <li>Activez l'option et redémarrez Chrome.</li>
              </ol>
            </div>
          </div>
        ) : (
          <div id="reader" className="w-full overflow-hidden" style={{ minHeight: '300px' }}></div>
        )}
        
        <div className="p-4 bg-slate-50 text-xs text-slate-500 text-center font-medium">
          Placez le code-barres de l'article au centre de la zone de scan
        </div>
      </div>
    </div>
  );
}
