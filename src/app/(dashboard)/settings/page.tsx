"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  Dumbbell, 
  Tag, 
  Laptop, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  AlertCircle,
  AlertTriangle,
  Clock,
  Layers,
  ShieldCheck,
  RefreshCw,
  Users,
  UserCheck,
  User,
  Key,
  Lock,
  Shield,
  Power,
  PowerOff,
  Building2,
  Phone,
  Upload,
  Download,
  Database,
  HardDrive,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
  FolderUp,
  Globe,
  ShieldAlert
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { formatAmount, formatCurrency } from '@/lib/formatters';

interface Sport {
  id: number;
  name: string;
  description: string | null;
  default_single_session_price: string;
  is_active: boolean;
  linked_offers_count: number;
}

interface Offer {
  id: number;
  title: string;
  description: string | null;
  price: string;
  duration_type: 'session' | 'standard_month' | 'custom_days' | 'custom_months';
  duration_value: number;
  sessions_count: number | null;
  is_active: boolean;
  sport_ids: number[];
  sport_names: string;
}

interface UserAccount {
  id: number;
  fullName: string;
  username: string;
  role: 'admin' | 'staff';
  isActive: boolean;
  photoUrl?: string | null;
  createdAt: string;
  devicesCount: number;
}

export default function SettingsPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirmDialog();

  const [activeTab, setActiveTab] = useState<'sports' | 'offers' | 'users' | 'devices' | 'general' | 'database'>('sports');

  // General Gym Settings state
  const [gymForm, setGymForm] = useState({
    gym_name: '',
    facebook: '',
    phone: '',
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [badgeImageUrl, setBadgeImageUrl] = useState<string | null>(null);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [selectedBadgeFile, setSelectedBadgeFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [badgePreview, setBadgePreview] = useState<string | null>(null);
  const [badgeTemplate, setBadgeTemplate] = useState<'standard' | 'chokri'>('standard');
  const [loadingGeneral, setLoadingGeneral] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const badgeFileInputRef = useRef<HTMLInputElement>(null);

  // Database Backup & Restore state
  const [exportingDb, setExportingDb] = useState(false);
  const [restoringDb, setRestoringDb] = useState(false);
  const [selectedRestoreFile, setSelectedRestoreFile] = useState<File | null>(null);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  // Sports state
  const [sports, setSports] = useState<Sport[]>([]);
  const [loadingSports, setLoadingSports] = useState(false);
  const [sportModalOpen, setSportModalOpen] = useState(false);
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const [sportForm, setSportForm] = useState({
    name: '',
    description: '',
    default_single_session_price: '50',
    is_active: true
  });

  // Offers state
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [offerForm, setOfferForm] = useState({
    title: '',
    description: '',
    price: '300',
    duration_type: 'standard_month' as 'session' | 'standard_month' | 'custom_days' | 'custom_months',
    duration_value: 1,
    sessions_count: '',
    sport_ids: [] as number[],
    is_active: true
  });

  // Users state
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [selectedUserPhoto, setSelectedUserPhoto] = useState<File | null>(null);
  const [userPhotoPreview, setUserPhotoPreview] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({
    full_name: '',
    username: '',
    password: '',
    role: 'staff' as 'admin' | 'staff',
    is_active: true
  });

  // Devices state
  const [devices, setDevices] = useState<any[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  useEffect(() => {
    fetchSports();
    fetchOffers();
    fetchUsers();
    fetchDevices();
    fetchGeneralSettings();
  }, []);

  const fetchSports = async () => {
    setLoadingSports(true);
    try {
      const res = await fetch('/api/sports', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSports(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSports(false);
    }
  };

  const fetchOffers = async () => {
    setLoadingOffers(true);
    try {
      const res = await fetch('/api/offers', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setOffers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOffers(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/users', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchDevices = async () => {
    setLoadingDevices(true);
    try {
      const res = await fetch('/api/devices', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDevices(false);
    }
  };

  const fetchGeneralSettings = async () => {
    setLoadingGeneral(true);
    try {
      const res = await fetch('/api/settings/general', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setGymForm({
          gym_name: data.gym_name || '',
          facebook: data.facebook || '',
          phone: data.phone || '',
        });
        setLogoUrl(data.logo_url || null);
        setBadgeImageUrl(data.badge_image_url || null);
        setLogoPreview(data.logo_url || null);
        setBadgePreview(data.badge_image_url || null);
        setBadgeTemplate(data.badge_template === 'chokri' ? 'chokri' : 'standard');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGeneral(false);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBadgeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedBadgeFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBadgePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGeneral(true);
    try {
      const formData = new FormData();
      formData.append('gym_name', gymForm.gym_name);
      formData.append('facebook', gymForm.facebook);
      formData.append('phone', gymForm.phone);
      formData.append('badge_template', badgeTemplate);

      if (selectedLogoFile) {
        formData.append('logo', selectedLogoFile);
      } else if (!logoPreview && logoUrl) {
        formData.append('remove_logo', 'true');
      }

      if (selectedBadgeFile) {
        formData.append('badge_image', selectedBadgeFile);
      } else if (!badgePreview && badgeImageUrl) {
        formData.append('remove_badge_image', 'true');
      }

      const res = await fetch('/api/settings/general', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setLogoUrl(data.logo_url);
        setBadgeImageUrl(data.badge_image_url);
        setSelectedLogoFile(null);
        setSelectedBadgeFile(null);
        showToast('Paramètres de la salle enregistrés avec succès', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Erreur lors de l\'enregistrement', 'error');
      }
    } catch (err) {
      showToast('Erreur inattendue', 'error');
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleExportDatabase = async () => {
    setExportingDb(true);
    try {
      const res = await fetch('/api/settings/database/backup');
      if (!res.ok) {
        throw new Error('Erreur lors du téléchargement de la sauvegarde');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `fitvault_backup_${dateStr}.sql`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Sauvegarde de la base de données téléchargée avec succès', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de l\'exportation', 'error');
    } finally {
      setExportingDb(false);
    }
  };

  const handleRestoreDatabase = async () => {
    if (!selectedRestoreFile) {
      showToast('Veuillez sélectionner un fichier SQL à restaurer', 'warning');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Attention: Restauration de la Base de Données',
      message: `Êtes-vous absolument sûr de vouloir restaurer la base de données à partir de "${selectedRestoreFile.name}" ? Cette action écrasera toutes les données actuelles de la salle (membres, abonnements, ventes, historique). Cette action est irréversible !`,
      confirmText: 'Restaurer Maintenant',
      cancelText: 'Annuler',
      isDestructive: true,
    });

    if (!isConfirmed) return;

    setRestoringDb(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedRestoreFile);

      const res = await fetch('/api/settings/database/restore', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Base de données restaurée avec succès !', 'success');
        setSelectedRestoreFile(null);
        if (restoreFileInputRef.current) {
          restoreFileInputRef.current.value = '';
        }
        fetchSports();
        fetchOffers();
        fetchUsers();
        fetchGeneralSettings();
      } else {
        showToast(data.error || 'Erreur lors de la restauration', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Erreur inattendue lors de la restauration', 'error');
    } finally {
      setRestoringDb(false);
    }
  };

  // Sport actions
  const openSportModal = (sport?: Sport) => {
    if (sport) {
      setEditingSport(sport);
      setSportForm({
        name: sport.name,
        description: sport.description || '',
        default_single_session_price: sport.default_single_session_price || '50',
        is_active: Boolean(sport.is_active)
      });
    } else {
      setEditingSport(null);
      setSportForm({
        name: '',
        description: '',
        default_single_session_price: '50',
        is_active: true
      });
    }
    setSportModalOpen(true);
  };

  const handleToggleSportStatus = async (sport: Sport) => {
    const newStatus = !sport.is_active;
    try {
      const res = await fetch('/api/sports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sport.id, is_active: newStatus })
      });
      if (res.ok) {
        showToast(`Discipline "${sport.name}" ${newStatus ? 'activée' : 'désactivée'} avec succès`, 'success');
        fetchSports();
      } else {
        const err = await res.json();
        showToast(err.error || 'Erreur lors du changement de statut', 'error');
      }
    } catch (err) {
      showToast('Erreur inattendue', 'error');
    }
  };

  const handleSaveSport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sportForm.name.trim()) {
      showToast('Le nom du sport est obligatoire', 'error');
      return;
    }

    try {
      const url = '/api/sports';
      const method = editingSport ? 'PUT' : 'POST';
      const body = editingSport 
        ? { id: editingSport.id, ...sportForm } 
        : sportForm;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        showToast(editingSport ? 'Discipline modifiée avec succès' : 'Discipline ajoutée avec succès', 'success');
        setSportModalOpen(false);
        fetchSports();
      } else {
        const err = await res.json();
        showToast(err.error || 'Erreur lors de la sauvegarde', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Erreur inattendue', 'error');
    }
  };

  const handleDeleteSport = async (sport: Sport) => {
    if (sport.linked_offers_count > 0) {
      showToast(
        `Suppression impossible : "${sport.name}" est utilisée dans ${sport.linked_offers_count} formule(s) d'abonnement (offer_sports). Vous pouvez la désactiver à la place.`,
        'error'
      );
      return;
    }

    const isConfirmed = await confirm({
      title: 'Supprimer la discipline',
      message: `Voulez-vous vraiment supprimer "${sport.name}" ? Si cette discipline ne peut pas être supprimée, vous pouvez la désactiver à tout moment.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDestructive: true
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/sports?id=${sport.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Discipline supprimée', 'success');
        fetchSports();
      } else {
        const err = await res.json();
        showToast(err.error || 'Erreur lors de la suppression', 'error');
      }
    } catch (err) {
      showToast('Erreur inattendue', 'error');
    }
  };

  // Offer actions
  const openOfferModal = (offer?: Offer) => {
    if (offer) {
      setEditingOffer(offer);
      setOfferForm({
        title: offer.title,
        description: offer.description || '',
        price: offer.price,
        duration_type: offer.duration_type,
        duration_value: offer.duration_value,
        sessions_count: offer.sessions_count ? String(offer.sessions_count) : '',
        sport_ids: offer.sport_ids || [],
        is_active: Boolean(offer.is_active)
      });
    } else {
      setEditingOffer(null);
      setOfferForm({
        title: '',
        description: '',
        price: '300',
        duration_type: 'standard_month',
        duration_value: 1,
        sessions_count: '',
        sport_ids: sports.filter(s => s.is_active).length > 0 ? [sports.filter(s => s.is_active)[0].id] : [],
        is_active: true
      });
    }
    setOfferModalOpen(true);
  };

  const handleToggleOfferStatus = async (offer: Offer) => {
    const newStatus = !offer.is_active;
    try {
      const res = await fetch('/api/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: offer.id, is_active: newStatus })
      });
      if (res.ok) {
        showToast(`Formule "${offer.title}" ${newStatus ? 'activée' : 'désactivée'} avec succès`, 'success');
        fetchOffers();
      } else {
        const err = await res.json();
        showToast(err.error || 'Erreur lors du changement de statut', 'error');
      }
    } catch (err) {
      showToast('Erreur inattendue', 'error');
    }
  };

  const handleToggleSportInOffer = (sportId: number) => {
    setOfferForm(prev => {
      const exists = prev.sport_ids.includes(sportId);
      if (exists) {
        return { ...prev, sport_ids: prev.sport_ids.filter(id => id !== sportId) };
      } else {
        return { ...prev, sport_ids: [...prev.sport_ids, sportId] };
      }
    });
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerForm.title.trim() || !offerForm.price) {
      showToast('Titre et tarif obligatoires', 'error');
      return;
    }

    if (offerForm.sport_ids.length === 0) {
      showToast('Sélectionnez au moins une discipline sportive', 'error');
      return;
    }

    try {
      const url = '/api/offers';
      const method = editingOffer ? 'PUT' : 'POST';
      const body = editingOffer
        ? { id: editingOffer.id, ...offerForm }
        : offerForm;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        showToast(editingOffer ? 'Offre modifiée avec succès' : 'Offre créée avec succès', 'success');
        setOfferModalOpen(false);
        fetchOffers();
      } else {
        const err = await res.json();
        showToast(err.error || 'Erreur lors de la sauvegarde', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Erreur inattendue', 'error');
    }
  };

  const handleDeleteOffer = async (offer: Offer) => {
    if (offer.sport_ids && offer.sport_ids.length > 0) {
      showToast(
        `Suppression impossible : la formule "${offer.title}" est associée à des disciplines (offer_sports). Vous pouvez la désactiver à la place.`,
        'error'
      );
      return;
    }

    const isConfirmed = await confirm({
      title: 'Supprimer l\'offre',
      message: `Voulez-vous supprimer la formule "${offer.title}" ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDestructive: true
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/offers?id=${offer.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Offre supprimée', 'success');
        fetchOffers();
      } else {
        const err = await res.json();
        showToast(err.error || 'Erreur lors de la suppression', 'error');
      }
    } catch (err) {
      showToast('Erreur inattendue', 'error');
    }
  };

  // User actions
  const openUserModal = (user?: UserAccount) => {
    setSelectedUserPhoto(null);
    if (user) {
      setEditingUser(user);
      setUserPhotoPreview(user.photoUrl || null);
      setUserForm({
        full_name: user.fullName,
        username: user.username,
        password: '',
        role: user.role,
        is_active: user.isActive
      });
    } else {
      setEditingUser(null);
      setUserPhotoPreview(null);
      setUserForm({
        full_name: '',
        username: '',
        password: '',
        role: 'staff',
        is_active: true
      });
    }
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.full_name.trim() || !userForm.username.trim()) {
      showToast('Nom complet et nom d\'utilisateur obligatoires', 'error');
      return;
    }

    if (!editingUser && !userForm.password.trim()) {
      showToast('Le mot de passe est obligatoire pour un nouvel utilisateur', 'error');
      return;
    }

    try {
      const url = '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const formData = new FormData();
      if (editingUser) {
        formData.append('id', String(editingUser.id));
      }
      formData.append('full_name', userForm.full_name);
      formData.append('username', userForm.username);
      if (userForm.password) {
        formData.append('password', userForm.password);
      }
      formData.append('role', userForm.role);
      formData.append('is_active', String(userForm.is_active));

      if (selectedUserPhoto) {
        formData.append('photo', selectedUserPhoto);
      } else if (!userPhotoPreview && editingUser?.photoUrl) {
        formData.append('remove_photo', 'true');
      }

      const res = await fetch(url, {
        method,
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        showToast(editingUser ? 'Utilisateur mis à jour avec succès' : 'Utilisateur créé avec succès', 'success');
        setUserModalOpen(false);
        fetchUsers();
        // Notify other components like the left sidebar to refresh the user profile
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('session-updated'));
        }
      } else {
        showToast(data.error || 'Erreur lors de la sauvegarde', 'error');
      }
    } catch (err) {
      showToast('Erreur inattendue', 'error');
    }
  };

  const handleDeleteUser = async (user: UserAccount) => {
    const isConfirmed = await confirm({
      title: 'Supprimer l\'utilisateur',
      message: `Voulez-vous supprimer définitivement le compte de ${user.fullName} (@${user.username}) ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDestructive: true
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/users?id=${user.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        showToast('Utilisateur supprimé avec succès', 'success');
        fetchUsers();
      } else {
        showToast(data.error || 'Erreur lors de la suppression', 'error');
      }
    } catch (err) {
      showToast('Erreur inattendue', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Paramètres & Configuration de la Salle
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Gérez l'identité de la salle, les disciplines, les formules d'abonnement, les utilisateurs et la sauvegarde de la base de données.
            </p>
          </div>
        </div>
      </div>

      {/* Redesigned Section Selector Under the Title */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Option 1: Identité & Salle */}
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`group flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
              activeTab === 'general'
                ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-xs ring-1 ring-blue-200/50'
                : 'bg-slate-50/50 border-transparent hover:bg-slate-100/80 hover:border-slate-200 text-slate-600'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                activeTab === 'general'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'bg-white text-slate-500 border border-slate-200 group-hover:text-blue-600 group-hover:border-blue-200'
              }`}
            >
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-sm truncate">Identité</span>
                <span
                  className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                    activeTab === 'general'
                      ? 'bg-blue-200/70 text-blue-800'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  Salle
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                Nom, contact & logos
              </p>
            </div>
          </button>

          {/* Option 2: Disciplines */}
          <button
            type="button"
            onClick={() => setActiveTab('sports')}
            className={`group flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
              activeTab === 'sports'
                ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-xs ring-1 ring-blue-200/50'
                : 'bg-slate-50/50 border-transparent hover:bg-slate-100/80 hover:border-slate-200 text-slate-600'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                activeTab === 'sports'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'bg-white text-slate-500 border border-slate-200 group-hover:text-blue-600 group-hover:border-blue-200'
              }`}
            >
              <Dumbbell className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-sm truncate">Disciplines</span>
                <span
                  className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                    activeTab === 'sports'
                      ? 'bg-blue-200/70 text-blue-800'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {sports.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                Activités & cours
              </p>
            </div>
          </button>

          {/* Option 3: Formules */}
          <button
            type="button"
            onClick={() => setActiveTab('offers')}
            className={`group flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
              activeTab === 'offers'
                ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-xs ring-1 ring-blue-200/50'
                : 'bg-slate-50/50 border-transparent hover:bg-slate-100/80 hover:border-slate-200 text-slate-600'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                activeTab === 'offers'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'bg-white text-slate-500 border border-slate-200 group-hover:text-blue-600 group-hover:border-blue-200'
              }`}
            >
              <Tag className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-sm truncate">Formules</span>
                <span
                  className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                    activeTab === 'offers'
                      ? 'bg-blue-200/70 text-blue-800'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {offers.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                Tarifs & abonnements
              </p>
            </div>
          </button>

          {/* Option 4: Utilisateurs */}
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`group flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
              activeTab === 'users'
                ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-xs ring-1 ring-blue-200/50'
                : 'bg-slate-50/50 border-transparent hover:bg-slate-100/80 hover:border-slate-200 text-slate-600'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'bg-white text-slate-500 border border-slate-200 group-hover:text-blue-600 group-hover:border-blue-200'
              }`}
            >
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-sm truncate">Utilisateurs</span>
                <span
                  className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                    activeTab === 'users'
                      ? 'bg-blue-200/70 text-blue-800'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {users.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                Rôles, staff & accès
              </p>
            </div>
          </button>

          {/* Option 5: Postes & Appareils */}
          <button
            type="button"
            onClick={() => setActiveTab('devices')}
            className={`group flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
              activeTab === 'devices'
                ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-xs ring-1 ring-blue-200/50'
                : 'bg-slate-50/50 border-transparent hover:bg-slate-100/80 hover:border-slate-200 text-slate-600'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                activeTab === 'devices'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'bg-white text-slate-500 border border-slate-200 group-hover:text-blue-600 group-hover:border-blue-200'
              }`}
            >
              <Laptop className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-sm truncate">Postes</span>
                <span
                  className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                    activeTab === 'devices'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {devices.length > 0 ? `${devices.length}` : '1'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                Sécurité & UUIDs
              </p>
            </div>
          </button>

          {/* Option 6: Base de Données */}
          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`group flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
              activeTab === 'database'
                ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-xs ring-1 ring-blue-200/50'
                : 'bg-slate-50/50 border-transparent hover:bg-slate-100/80 hover:border-slate-200 text-slate-600'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                activeTab === 'database'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'bg-white text-slate-500 border border-slate-200 group-hover:text-blue-600 group-hover:border-blue-200'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-sm truncate">Données</span>
                <span
                  className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                    activeTab === 'database'
                      ? 'bg-blue-200/70 text-blue-800'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  SQL
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                Export & Sauvegarde
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* TAB: IDENTITE & SALLE */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Identité & Coordonnées de la Salle
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configurez le nom officiel de votre établissement, vos coordonnées et vos logos & visuels pour les badges et impressions.
              </p>
            </div>
            <button
              type="submit"
              form="gym-settings-form"
              disabled={savingGeneral}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all text-xs sm:text-sm disabled:opacity-50 cursor-pointer"
            >
              {savingGeneral ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Enregistrement...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Enregistrer les Paramètres
                </>
              )}
            </button>
          </div>

          <form id="gym-settings-form" onSubmit={handleSaveGeneral} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Colonne Gauche: Informations textuelles */}
            <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  Informations Générales
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ces coordonnées s'affichent sur les reçus, cartes d'adhérents et l'application.
                </p>
              </div>

              {/* Champ 1: Nom de la salle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Nom de la salle <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={gymForm.gym_name}
                    onChange={(e) => setGymForm({ ...gymForm, gym_name: e.target.value })}
                    placeholder="Ex: FitVault Gym, Club Fitness Pro..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium text-sm"
                    required
                  />
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Champ 2: Téléphone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Téléphone de contact
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={gymForm.phone}
                    onChange={(e) => setGymForm({ ...gymForm, phone: e.target.value })}
                    placeholder="Ex: 0550 12 34 56 / 0770 98 76 54"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium text-sm"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Champ 3: Facebook */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Page / Profil Facebook
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={gymForm.facebook}
                    onChange={(e) => setGymForm({ ...gymForm, facebook: e.target.value })}
                    placeholder="Ex: facebook.com/fitvaultgym ou FitVault Gym Officiel"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium text-sm"
                  />
                  <div className="w-4 h-4 text-blue-600 absolute left-3.5 top-3.5 pointer-events-none flex items-center justify-center">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne Droite: Visuels & Logos (Logo de la salle + Image pour Badge) */}
            <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-slate-500" />
                  Visuels & Médias Locaux
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Images stockées localement sur le serveur.
                </p>
              </div>

              {/* Image 1: Logo de la salle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    1. Logo de la Salle
                  </label>
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogoPreview(null);
                        setSelectedLogoFile(null);
                        if (logoFileInputRef.current) logoFileInputRef.current.value = '';
                      }}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                    >
                      Supprimer
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative group">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo de la salle"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 text-center p-2">
                        <ImageIcon className="w-8 h-8 text-slate-300 mb-1" />
                        <span className="text-[10px] font-bold">Aucun logo</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all border border-slate-200/80 shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {logoPreview ? 'Changer le logo' : 'Choisir un logo'}
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Format recommandé : PNG ou JPG avec fond transparent.
                    </p>
                  </div>
                </div>
              </div>

              {/* Image 2: Image pour Badge */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    2. Image pour Badges & Cartes
                  </label>
                  {badgePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setBadgePreview(null);
                        setSelectedBadgeFile(null);
                        if (badgeFileInputRef.current) badgeFileInputRef.current.value = '';
                      }}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                    >
                      Supprimer
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative group">
                    {badgePreview ? (
                      <img
                        src={badgePreview}
                        alt="Badge de la salle"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 text-center p-2">
                        <Tag className="w-8 h-8 text-slate-300 mb-1" />
                        <span className="text-[10px] font-bold">Aucun badge</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      ref={badgeFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBadgeFileChange}
                      className="hidden"
                      id="badge-upload"
                    />
                    <label
                      htmlFor="badge-upload"
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all border border-slate-200/80 shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {badgePreview ? 'Changer l\'image du badge' : 'Choisir image badge'}
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Utilisée pour l'impression des cartes et badges d'accès adhérents.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne Pleine Largeur: Modèle de Badge / Format d'Impression */}
            <div className="lg:col-span-12 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-slate-500" />
                  Format & Modèle de Badge Adhérent (Impression)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sélectionnez le modèle graphique utilisé pour la génération et l'impression des badges membres.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Choix 1: Modèle Standard */}
                <div
                  onClick={() => setBadgeTemplate('standard')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                    badgeTemplate === 'standard'
                      ? 'border-blue-600 bg-blue-50/40 shadow-sm ring-1 ring-blue-500/20'
                      : 'border-slate-200 bg-slate-50/30 hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                        badgeTemplate === 'standard' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        1
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Modèle Standard</h4>
                        <p className="text-[11px] text-slate-500">Design moderne FitVault Club</p>
                      </div>
                    </div>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                      badgeTemplate === 'standard'
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}>
                      {badgeTemplate === 'standard' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Design contemporain épuré avec branding FitVault, photo de l'adhérent, puce d'état de l'abonnement et grand code-barres horizontal.
                  </p>

                  {/* Mini Preview Box */}
                  <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-inner flex flex-col justify-between h-24">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                      <span className="font-black text-[10px] text-slate-800 tracking-wider">FIT<span className="text-blue-600">VAULT</span></span>
                      <span className="text-[8px] font-bold text-blue-600 uppercase">CARTE MEMBRE</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-[7px] text-slate-400">Photo</div>
                      <div className="text-[9px]">
                        <p className="font-bold text-slate-800">Nom & Prénom</p>
                        <p className="text-[8px] text-emerald-600 font-semibold">• Abonnement Actif</p>
                      </div>
                    </div>
                    <div className="h-4 bg-slate-100 rounded flex items-center justify-center font-mono text-[8px] text-slate-400">
                      |||||| |||| ||||||| 1001
                    </div>
                  </div>
                </div>

                {/* Choix 2: Modèle Chokri */}
                <div
                  onClick={() => setBadgeTemplate('chokri')}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                    badgeTemplate === 'chokri'
                      ? 'border-blue-600 bg-blue-50/40 shadow-sm ring-1 ring-blue-500/20'
                      : 'border-slate-200 bg-slate-50/30 hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                        badgeTemplate === 'chokri' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        2
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Modèle Chokri</h4>
                        <p className="text-[11px] text-slate-500">Format Carte d'Adhérent bicolore</p>
                      </div>
                    </div>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                      badgeTemplate === 'chokri'
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}>
                      {badgeTemplate === 'chokri' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Titre officiel <strong>CARTE D'ADHERENT</strong>, bandes bicolores rouge & verte, photo encadrée, <strong>Nom</strong>, <strong>DN</strong> (Date de Naissance), <strong>ADR</strong> (Adresse) et code-barres.
                  </p>

                  {/* Mini Preview Box */}
                  <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-inner flex flex-col justify-between h-24 overflow-hidden relative">
                    <div className="flex items-center justify-between pb-1">
                      <div className="w-3.5 h-3.5 rounded-sm bg-slate-200"></div>
                      <span className="font-black text-[9px] text-black tracking-wide">CARTE D'ADHERENT</span>
                      <div className="w-3.5 h-3.5 rounded-sm bg-slate-200"></div>
                    </div>
                    <div className="w-full space-y-[1px]">
                      <div className="h-1 bg-red-600 w-full"></div>
                      <div className="h-1 bg-green-600 w-full"></div>
                    </div>
                    <div className="flex items-center justify-between gap-1 pt-1">
                      <div className="w-6 h-6 rounded border border-black bg-slate-100 flex items-center justify-center text-[6px]">Photo</div>
                      <div className="text-[7px] font-bold text-black flex-1 pl-1">
                        <p>Nom : ...</p>
                        <p>DN : ...</p>
                        <p>ADR : ...</p>
                      </div>
                      <div className="h-6 w-14 bg-slate-100 border border-slate-200 rounded flex items-center justify-center font-mono text-[6px]">
                        |||||||||||
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 1: SPORTS */}
      {activeTab === 'sports' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-blue-600" />
              Liste des Disciplines Sportives
            </h2>
            <button
              onClick={() => openSportModal()}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm transition-all text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4" /> Nouvelle Discipline
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sports.length === 0 ? (
              <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500">
                <Dumbbell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-700">Aucune discipline sportive enregistrée</p>
                <p className="text-xs text-slate-400 mt-1">Cliquez sur "Nouvelle Discipline" pour ajouter (ex: Musculation, Cardio, Zumba...)</p>
              </div>
            ) : (
              sports.map((sport) => (
                <div
                  key={sport.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-slate-900">{sport.name}</h3>
                      <button
                        type="button"
                        onClick={() => handleToggleSportStatus(sport)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer ${
                          sport.is_active 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                        }`}
                        title={sport.is_active ? 'Cliquer pour désactiver' : 'Cliquer pour activer'}
                      >
                        <span className={`w-2 h-2 rounded-full ${sport.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {sport.is_active ? 'Actif' : 'Inactif'}
                      </button>
                    </div>
                    {sport.description && (
                      <p className="text-slate-500 text-sm mb-4 line-clamp-2">{sport.description}</p>
                    )}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs text-slate-600 space-y-1 mb-4">
                      <div className="flex justify-between">
                        <span>Séance sans abonnement (Dette):</span>
                        <span className="font-bold text-slate-900">{formatCurrency(sport.default_single_session_price, 2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Formules reliées:</span>
                        <span className="font-bold text-blue-600">{sport.linked_offers_count} formule(s)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleToggleSportStatus(sport)}
                      className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold ${
                        sport.is_active
                          ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                      title={sport.is_active ? 'Désactiver la discipline' : 'Activer la discipline'}
                    >
                      {sport.is_active ? (
                        <>
                          <PowerOff className="w-3.5 h-3.5 text-amber-600" />
                          <span>Désactiver</span>
                        </>
                      ) : (
                        <>
                          <Power className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Activer</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => openSportModal(sport)}
                      className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSport(sport)}
                      className={`p-2 rounded-lg transition-colors ${
                        sport.linked_offers_count > 0
                          ? 'text-slate-300 hover:bg-slate-50 cursor-not-allowed'
                          : 'hover:bg-red-50 text-red-500'
                      }`}
                      title={
                        sport.linked_offers_count > 0
                          ? `Suppression bloquée : liée à ${sport.linked_offers_count} formule(s) (offer_sports)`
                          : 'Supprimer'
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: OFFERS */}
      {activeTab === 'offers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-600" />
              Formules & Tarifs d'Abonnement
            </h2>
            <button
              onClick={() => openOfferModal()}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm transition-all text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4" /> Nouvelle Formule
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {offers.length === 0 ? (
              <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500">
                <Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-700">Aucune offre d'abonnement enregistrée</p>
                <p className="text-xs text-slate-400 mt-1">Créez des formules mensuelles, multi-activités ou par carnet de séances.</p>
              </div>
            ) : (
              offers.map((offer) => (
                <div
                  key={offer.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{offer.title}</h3>
                        <div className="mt-1">
                          <button
                            type="button"
                            onClick={() => handleToggleOfferStatus(offer)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all shadow-xs cursor-pointer ${
                              offer.is_active 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                            }`}
                            title={offer.is_active ? 'Cliquer pour désactiver' : 'Cliquer pour activer'}
                          >
                            <span className={`w-2 h-2 rounded-full ${offer.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            {offer.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </div>
                      </div>
                      <span className="text-xl font-extrabold text-blue-600">
                        {formatAmount(offer.price, 2)} <span className="text-xs font-semibold text-slate-500">DA</span>
                      </span>
                    </div>

                    {offer.description && (
                      <p className="text-slate-500 text-sm mb-3">{offer.description}</p>
                    )}

                    <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 text-xs space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span>Durée: </span>
                        <strong className="text-slate-900">
                          {offer.duration_type === 'session' && '1 Séance'}
                          {offer.duration_type === 'standard_month' && `${offer.duration_value} Mois`}
                          {offer.duration_type === 'custom_days' && `${offer.duration_value} Jours`}
                          {offer.duration_type === 'custom_months' && `${offer.duration_value} Mois (Personnalisé)`}
                        </strong>
                      </div>

                      {offer.sessions_count && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Nombre de séances: </span>
                          <strong className="text-slate-900">{offer.sessions_count} séances max</strong>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-200/60">
                        <span className="text-slate-500 block mb-1">Disciplines incluses:</span>
                        <div className="flex flex-wrap gap-1">
                          {offer.sport_names.split(', ').map((s, idx) => (
                            <span key={idx} className="bg-blue-100/70 text-blue-700 font-semibold px-2 py-0.5 rounded-md text-[11px]">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleToggleOfferStatus(offer)}
                      className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold ${
                        offer.is_active
                          ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                      title={offer.is_active ? 'Désactiver la formule' : 'Activer la formule'}
                    >
                      {offer.is_active ? (
                        <>
                          <PowerOff className="w-3.5 h-3.5 text-amber-600" />
                          <span>Désactiver</span>
                        </>
                      ) : (
                        <>
                          <Power className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Activer</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => openOfferModal(offer)}
                      className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteOffer(offer)}
                      className={`p-2 rounded-lg transition-colors ${
                        offer.sport_ids && offer.sport_ids.length > 0
                          ? 'text-slate-300 hover:bg-slate-50 cursor-not-allowed'
                          : 'hover:bg-red-50 text-red-500'
                      }`}
                      title={
                        offer.sport_ids && offer.sport_ids.length > 0
                          ? 'Suppression bloquée : liée à des disciplines sportives (offer_sports)'
                          : 'Supprimer'
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: USERS (GESTION DES UTILISATEURS) */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Gestion des Utilisateurs & Comptes d'Accès
            </h2>
            <button
              onClick={() => openUserModal()}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm transition-all text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4" /> Nouvel Utilisateur
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {loadingUsers ? (
              <div className="p-12 text-center text-slate-400 text-xs">Chargement des utilisateurs...</div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">Aucun utilisateur enregistré.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs flex flex-col sm:table">
                  <thead className="hidden sm:table-header-group">
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase font-bold tracking-wider">
                      <th className="py-3.5 px-4">Utilisateur</th>
                      <th className="py-3.5 px-4">Identifiant</th>
                      <th className="py-3.5 px-4">Rôle</th>
                      <th className="py-3.5 px-4">Statut</th>
                      <th className="py-3.5 px-4">Appareils Assignés</th>
                      <th className="py-3.5 px-4">Date de Création</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="flex flex-col sm:table-row-group gap-3 sm:gap-0 divide-y-0 sm:divide-y divide-slate-100 font-medium">
                    {users.map((u) => (
                      <tr key={u.id} className="flex flex-col sm:table-row bg-white sm:bg-transparent border border-slate-200 sm:border-0 rounded-xl sm:rounded-none p-3 sm:p-0 hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 sm:py-3.5 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                          <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Utilisateur</span>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-900">{u.fullName}</span>
                            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold text-xs uppercase overflow-hidden shrink-0 shadow-xs">
                              {u.photoUrl ? (
                                <img src={u.photoUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                u.fullName.charAt(0)
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-2 sm:py-3.5 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                          <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Identifiant</span>
                          <span className="font-mono font-semibold text-slate-700">@{u.username}</span>
                        </td>

                        <td className="py-2 sm:py-3.5 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                          <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Rôle</span>
                          <div>
                            {u.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
                                <Shield className="w-3 h-3" /> Administrateur
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                <User className="w-3 h-3" /> Personnel / Staff
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-2 sm:py-3.5 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                          <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Statut</span>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            u.isActive 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {u.isActive ? 'Actif' : 'Désactivé'}
                          </span>
                        </td>

                        <td className="py-2 sm:py-3.5 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                          <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Appareils Assignés</span>
                          <span className="text-slate-600">{u.devicesCount} poste(s)</span>
                        </td>

                        <td className="py-2 sm:py-3.5 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                          <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Création</span>
                          <span className="text-slate-500">{u.createdAt}</span>
                        </td>

                        <td className="py-2 sm:py-3.5 px-1 sm:px-4 flex justify-end sm:table-cell pt-3 sm:pt-0 text-right">
                          <button
                            onClick={() => openUserModal(u)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg mr-1 transition-colors"
                            title="Modifier"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DEVICES */}
      {activeTab === 'devices' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Laptop className="w-5 h-5 text-blue-600" />
              Sécurité des Postes Connectés
            </h2>
            <button
              onClick={fetchDevices}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Actualiser
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <p className="text-sm text-slate-600 mb-6">
              Chaque ordinateur ou tablette connectée à FitVault possède un identifiant unique (UUID entre 5 et 8 caractères) et un nom assigné lors de la première connexion.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm flex flex-col sm:table">
                <thead className="hidden sm:table-header-group">
                  <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase font-semibold">
                    <th className="py-3 px-4">Nom de l'Appareil</th>
                    <th className="py-3 px-4">UUID Identifiant</th>
                    <th className="py-3 px-4">Statut</th>
                  </tr>
                </thead>
                <tbody className="flex flex-col sm:table-row-group gap-3 sm:gap-0 divide-y-0 sm:divide-y divide-slate-100">
                  {devices.map((d, idx) => (
                    <tr key={idx} className="flex flex-col sm:table-row bg-white sm:bg-transparent border border-slate-200 sm:border-0 rounded-xl sm:rounded-none p-3 sm:p-0 hover:bg-slate-50">
                      <td className="py-2 sm:py-3.5 px-1 sm:px-4 font-bold text-slate-900 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                        <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Appareil</span>
                        <div className="flex items-center gap-2.5">
                          <Laptop className="w-4 h-4 text-blue-600" />
                          {d.name || 'Poste Actuel'}
                        </div>
                      </td>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-4 font-mono text-xs text-slate-500 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                        <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">UUID</span>
                        <span>{d.uuid}</span>
                      </td>
                      <td className="py-2 sm:py-3.5 px-1 sm:px-4 flex justify-between items-center sm:table-cell">
                        <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Statut</span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                          <ShieldCheck className="w-3.5 h-3.5" /> Autorisé & Connecté
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: BASE DE DONNEES & SAUVEGARDE */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Sauvegarde & Restauration de la Base de Données
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Exportez une copie de sécurité intégrale de votre système ou restaurez vos données à partir d'un fichier SQL sélectionné.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Action 1: Sauvegarde / Export */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
                    <Download className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      1. Sauvegarder la Base de Données
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Générer et télécharger un fichier de sauvegarde (.sql)
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100/80 text-xs text-emerald-900 space-y-2 mb-4">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Contenu complet de la sauvegarde :
                  </div>
                  <ul className="list-disc list-inside text-emerald-700/90 space-y-1 pl-1">
                    <li>Tous les membres et leurs dossiers complets</li>
                    <li>Historique des abonnements, formules et inscriptions</li>
                    <li>Historique complet des pointages et présences</li>
                    <li>Gestion des dettes, paiements et transactions de caisse</li>
                    <li>Articles, ventes et approvisionnements du shop</li>
                    <li>Comptes utilisateurs, postes et configuration de la salle</li>
                  </ul>
                </div>

                <p className="text-xs text-slate-500">
                  Il est vivement conseillé d'effectuer une sauvegarde régulière sur un support externe (clé USB ou disque dur) afin de sécuriser vos données en cas de panne matérielle.
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleExportDatabase}
                  disabled={exportingDb}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all text-sm disabled:opacity-50 cursor-pointer"
                >
                  {exportingDb ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Génération du fichier en cours...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Télécharger la Sauvegarde (.sql)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action 2: Restauration / Import */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-xs">
                    <FolderUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      2. Restaurer la Base de Données
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Restaurer les données à partir d'un fichier .sql choisi
                    </p>
                  </div>
                </div>

                {/* Avertissement de sécurité */}
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 text-xs text-amber-900 space-y-1.5 mb-4">
                  <div className="flex items-center gap-2 font-bold text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Attention : Action Irréversible
                  </div>
                  <p className="text-amber-800/90 leading-relaxed">
                    La restauration d'une sauvegarde <strong>remplacera l'intégralité</strong> des données actuelles par les données du fichier sélectionné.
                  </p>
                </div>

                {/* Sélecteur de fichier */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Sélectionner le fichier SQL (.sql)
                  </label>
                  <input
                    ref={restoreFileInputRef}
                    type="file"
                    accept=".sql"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedRestoreFile(file);
                      }
                    }}
                    className="hidden"
                    id="sql-file-restore"
                  />
                  <div
                    onClick={() => restoreFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                      selectedRestoreFile
                        ? 'border-blue-400 bg-blue-50/50 text-blue-900'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 text-slate-500'
                    }`}
                  >
                    <FileText className={`w-8 h-8 ${selectedRestoreFile ? 'text-blue-600' : 'text-slate-400'}`} />
                    {selectedRestoreFile ? (
                      <div className="text-xs">
                        <p className="font-bold text-blue-900 truncate max-w-[280px]">
                          {selectedRestoreFile.name}
                        </p>
                        <p className="text-[11px] text-blue-600 mt-0.5">
                          {(selectedRestoreFile.size / 1024).toFixed(1)} Ko - Cliquez pour changer
                        </p>
                      </div>
                    ) : (
                      <div className="text-xs">
                        <p className="font-semibold text-slate-700">
                          Cliquez pour choisir un fichier .sql
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Fichiers d'export FitVault uniquement
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleRestoreDatabase}
                  disabled={restoringDb || !selectedRestoreFile}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {restoringDb ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Restauration en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Restaurer la Base de Données
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Lien vers Journal d'Audit */}
          <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  Journal d'Audit Système (Logs BDD)
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600/80 text-white">
                    Admin
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consultez la table de log détaillant chaque action en base (créations, modifications, suppressions, paiements) avec horodatage, utilisateur et UUID du poste.
                </p>
              </div>
            </div>

            <a
              href="/logs"
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Ouvrir le Journal d'Audit</span>
            </a>
          </div>
        </div>
      )}

      {/* MODAL: SPORT FORM */}
      {sportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl p-4 sm:p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <Dumbbell className="w-6 h-6 text-blue-600" />
                {editingSport ? 'Modifier la discipline' : 'Nouvelle discipline sportive'}
              </h2>
              <button
                onClick={() => setSportModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                  Nom de la discipline <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={sportForm.name}
                  onChange={(e) => setSportForm({ ...sportForm, name: e.target.value })}
                  placeholder="Ex: Musculation, Cardio, Crossfit, Zumba..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                  Tarif séance unique sans abonnement (DA) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={sportForm.default_single_session_price}
                  onChange={(e) => setSportForm({ ...sportForm, default_single_session_price: e.target.value })}
                  placeholder="50"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Ce montant sera automatiquement inscrit en dette si un membre s'entraîne sans abonnement valide.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                  Description / Remarques (Optionnel)
                </label>
                <textarea
                  value={sportForm.description}
                  onChange={(e) => setSportForm({ ...sportForm, description: e.target.value })}
                  placeholder="Détails sur les cours, équipement ou horaires..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all h-20 resize-none"
                />
              </div>

              <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/70 transition-all">
                <input
                  type="checkbox"
                  checked={sportForm.is_active}
                  onChange={(e) => setSportForm({ ...sportForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800">Discipline Active</span>
                  <p className="text-[11px] text-slate-500">Activez ou désactivez cette discipline à tout moment. Si désactivée, elle ne sera pas proposée pour les nouvelles séances.</p>
                </div>
              </label>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSportModalOpen(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs sm:text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-all text-xs sm:text-sm"
                >
                  {editingSport ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: OFFER FORM */}
      {offerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-xl shadow-2xl p-4 sm:p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-6 h-6 text-blue-600" />
                {editingOffer ? 'Modifier la formule' : 'Créer une formule d\'abonnement'}
              </h2>
              <button
                onClick={() => setOfferModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOffer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                  Titre de l'Offre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={offerForm.title}
                  onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                  placeholder="Ex: Abonnement Musculation 1 Mois, Pack Cardio + Zumba 3 Mois..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                    Prix (DA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={offerForm.price}
                    onChange={(e) => setOfferForm({ ...offerForm, price: e.target.value })}
                    placeholder="300"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                    Type de Durée <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={offerForm.duration_type}
                    onChange={(e) => setOfferForm({ ...offerForm, duration_type: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium"
                  >
                    <option value="standard_month">Mois standard (1, 2, 3...)</option>
                    <option value="session">Séance unique</option>
                    <option value="custom_days">Nombre de jours personnalisé</option>
                    <option value="custom_months">Nombre de mois personnalisé</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {offerForm.duration_type !== 'session' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                      Valeur de durée ({offerForm.duration_type === 'custom_days' ? 'Jours' : 'Mois'})
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={offerForm.duration_value}
                      onChange={(e) => setOfferForm({ ...offerForm, duration_value: parseInt(e.target.value, 10) || 1 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                    Limite de séances (Optionnel)
                  </label>
                  <input
                    type="number"
                    placeholder="Illimité"
                    value={offerForm.sessions_count}
                    onChange={(e) => setOfferForm({ ...offerForm, sessions_count: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Multi-sport checklist */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase">
                  Disciplines Sportives Incluses dans cette Formule <span className="text-red-500">*</span>
                </label>
                {sports.length === 0 ? (
                  <p className="text-xs text-red-500">Veuillez d'abord créer au moins une discipline sportive dans l'onglet Disciplines.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    {sports.map((s) => {
                      const checked = offerForm.sport_ids.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                            checked
                              ? 'bg-blue-50 border-blue-300 text-blue-700'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleSportInOffer(s.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{s.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                  Description / Avantages (Optionnel)
                </label>
                <textarea
                  value={offerForm.description}
                  onChange={(e) => setOfferForm({ ...offerForm, description: e.target.value })}
                  placeholder="Accès libre du lundi au samedi, coach inclus..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all h-20 resize-none"
                />
              </div>

              <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/70 transition-all">
                <input
                  type="checkbox"
                  checked={offerForm.is_active}
                  onChange={(e) => setOfferForm({ ...offerForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800">Formule Active</span>
                  <p className="text-[11px] text-slate-500">Activez ou désactivez cette formule à tout moment. Si désactivée, elle sera masquée lors des nouvelles souscriptions d'abonnements.</p>
                </div>
              </label>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOfferModalOpen(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs sm:text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-all text-xs sm:text-sm"
                >
                  {editingOffer ? 'Mettre à jour' : 'Enregistrer la formule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: USER FORM (AJOUTER / MODIFIER UN UTILISATEUR) */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl p-4 sm:p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel Utilisateur'}
              </h2>
              <button
                onClick={() => setUserModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              {/* Photo Upload Widget */}
              <div className="flex flex-col items-center justify-center gap-2 pb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider text-center">
                  Photo de Profil
                </label>
                <div className="relative group cursor-pointer">
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden group-hover:border-blue-500 group-hover:bg-blue-50/40 transition-all shadow-sm">
                    {userPhotoPreview ? (
                      <img src={userPhotoPreview} alt="Aperçu" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-600 transition-colors p-2 text-center">
                        <User className="w-8 h-8 mb-1" />
                        <span className="text-[10px] font-bold">Choisir Photo</span>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const file = e.target.files[0];
                        setSelectedUserPhoto(file);
                        setUserPhotoPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    title="Choisir une photo"
                  />
                </div>
                {userPhotoPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUserPhoto(null);
                      setUserPhotoPreview(null);
                    }}
                    className="text-[11px] text-red-500 hover:text-red-700 font-semibold"
                  >
                    Supprimer la photo
                  </button>
                )}
                <span className="text-[10px] text-slate-400 font-medium">Format JPG ou PNG (Carré recommandé)</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                  Nom Complet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  placeholder="Ex: Mohammed Alami, Coach Sarah..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                  Identifiant de Connexion (Username) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  placeholder="Ex: mohammed, sarah_coach..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                  Mot de Passe {editingUser ? '(Laisser vide pour ne pas modifier)' : <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder={editingUser ? '•••••••• (inchangé)' : '••••••••'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    required={!editingUser}
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                    Rôle d'Accès <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  >
                    <option value="staff">Personnel / Staff</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                    Statut du Compte
                  </label>
                  <select
                    value={userForm.is_active ? 'true' : 'false'}
                    onChange={(e) => setUserForm({ ...userForm, is_active: e.target.value === 'true' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                  >
                    <option value="true">Actif (Autorisé)</option>
                    <option value="false">Désactivé (Bloqué)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                >
                  {editingUser ? 'Mettre à jour' : 'Créer l\'utilisateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
