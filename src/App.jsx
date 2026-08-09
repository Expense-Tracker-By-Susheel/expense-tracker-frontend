import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { api, getAuthToken, setAuthData, clearAuthData, getCurrentUser } from './services/api';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function App() {
  // Navigation & User State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(getCurrentUser());
  const [toasts, setToasts] = useState([]);

  // Auth Form State
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    dob: '',
    password: ''
  });
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard State
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [manualPassword, setManualPassword] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Transactions State
  const [transactions, setTransactions] = useState([]);
  const [totalTxCount, setTotalTxCount] = useState(0);
  const [txSearch, setTxSearch] = useState('');
  const [txCategoryFilter, setTxCategoryFilter] = useState('ALL');
  const [txTypeFilter, setTxTypeFilter] = useState('ALL');
  const [txPage, setTxPage] = useState(1);
  const [txLoading, setTxLoading] = useState(false);

  // Categories & Tags & Community
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [unsureMerchants, setUnsureMerchants] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [selectedCategoryMap, setSelectedCategoryMap] = useState({});

  // Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newTxForm, setNewTxForm] = useState({
    description: '',
    amount: '',
    type: 'DEBIT',
    category: '',
    tag: '',
    transaction_date: new Date().toISOString().split('T')[0]
  });
  const [newCatForm, setNewCatForm] = useState({
    name: '',
    color_hex: '#06b6d4',
    icon: 'fa-tag'
  });

  // Toast Helper
  const showToast = (message, title = 'Notification', type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, title, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Initial Data Fetch
  useEffect(() => {
    if (user) {
      loadDashboard();
      loadTransactions();
      loadCategoriesAndTags();
      loadCommunityUnsure();
    } else {
      // If not logged in, prompt or load public categories
      loadCategoriesAndTags();
    }
  }, [user]);

  // Refetch transactions when filters change
  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [txSearch, txCategoryFilter, txTypeFilter, txPage]);

  // Auth Handlers
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        const res = await api.login({
          email: authForm.email,
          password: authForm.password
        });
        setAuthData(res.token, res.user);
        setUser(res.user);
        showToast(`Welcome back, ${res.user.full_name}!`, 'Signed In', 'success');
        setActiveTab('dashboard');
      } else {
        const res = await api.register(authForm);
        setAuthData(res.token, res.user);
        setUser(res.user);
        showToast(`Account created for ${res.user.full_name}!`, 'Registration Complete', 'success');
        setActiveTab('dashboard');
      }
    } catch (err) {
      showToast(err.message, 'Authentication Failed', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthData();
    setUser(null);
    setAnalytics(null);
    setTransactions([]);
    showToast('You have been signed out', 'Signed Out', 'info');
    setActiveTab('auth');
  };

  // Dashboard Data Loader
  const loadDashboard = async (year = selectedYear, month = selectedMonth) => {
    if (!getAuthToken()) return;
    setAnalyticsLoading(true);
    try {
      const data = await api.getDashboardAnalytics(year, month);
      setAnalytics(data);
      if (data.active_period) {
        setSelectedYear(data.active_period.year);
        setSelectedMonth(data.active_period.month);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Transactions Loader
  const loadTransactions = async () => {
    if (!getAuthToken()) return;
    setTxLoading(true);
    try {
      const res = await api.getTransactions({
        search: txSearch,
        category: txCategoryFilter,
        type: txTypeFilter,
        page: txPage
      });
      setTransactions(res.results || []);
      setTotalTxCount(res.count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setTxLoading(false);
    }
  };

  // Categories and Tags Loader
  const loadCategoriesAndTags = async () => {
    try {
      const [catsRes, tagsRes] = await Promise.all([
        api.getCategories(),
        api.getTags()
      ]);
      setCategories(catsRes || []);
      setTags(tagsRes || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Community Unsure Loader
  const loadCommunityUnsure = async () => {
    try {
      const res = await api.getUnsureMerchants();
      setUnsureMerchants(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  // File Upload Handler
  const handleFileUpload = async (file) => {
    if (!user) {
      showToast('Please sign in or register before uploading statements', 'Auth Required', 'warning');
      setActiveTab('auth');
      return;
    }
    if (!file || !file.name.endsWith('.pdf')) {
      showToast('Please select a valid bank statement PDF file', 'Invalid File', 'warning');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    const formData = new FormData();
    formData.append('file', file);
    if (manualPassword) {
      formData.append('password', manualPassword);
    }

    const timer = setInterval(() => {
      setUploadProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 200);

    try {
      const res = await api.uploadStatement(formData);
      clearInterval(timer);
      setUploadProgress(100);

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        showToast(
          `Statement parsed: ${res.summary.new_inserted} added, ${res.summary.duplicates_skipped} duplicates skipped, ${res.summary.unsure_count} require review.`,
          'Upload Successful',
          'success'
        );
        loadDashboard();
        loadTransactions();
        loadCategoriesAndTags();
        loadCommunityUnsure();
        setActiveTab('dashboard');
      }, 500);
    } catch (err) {
      clearInterval(timer);
      setIsUploading(false);
      setUploadProgress(0);
      showToast(err.message, 'Processing Failed', 'error');
    }
  };

  // Save Manual Transaction
  const handleSaveManualTx = async (e) => {
    e.preventDefault();
    try {
      await api.createTransaction({
        ...newTxForm,
        amount: parseFloat(newTxForm.amount),
        category: newTxForm.category || null,
        tag: newTxForm.tag || null
      });
      setIsTxModalOpen(false);
      setNewTxForm({
        description: '',
        amount: '',
        type: 'DEBIT',
        category: '',
        tag: '',
        transaction_date: new Date().toISOString().split('T')[0]
      });
      showToast('Transaction saved successfully', 'Success', 'success');
      loadTransactions();
      loadDashboard();
      loadCategoriesAndTags();
    } catch (err) {
      showToast(err.message, 'Error', 'error');
    }
  };

  // Delete Transaction
  const handleDeleteTx = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await api.deleteTransaction(id);
      showToast('Transaction deleted', 'Deleted', 'info');
      loadTransactions();
      loadDashboard();
      loadCategoriesAndTags();
    } catch (err) {
      showToast(err.message, 'Error', 'error');
    }
  };

  // Save New Category
  const handleSaveNewCat = async (e) => {
    e.preventDefault();
    try {
      await api.createCategory(newCatForm);
      setIsCatModalOpen(false);
      setNewCatForm({ name: '', color_hex: '#06b6d4', icon: 'fa-tag' });
      showToast(`Category "${newCatForm.name}" created`, 'Success', 'success');
      loadCategoriesAndTags();
    } catch (err) {
      showToast(err.message, 'Error', 'error');
    }
  };

  // Delete Category
  const handleDeleteCat = async (id) => {
    if (!window.confirm('Delete category? Linked transactions will become Uncategorized.')) return;
    try {
      await api.deleteCategory(id);
      showToast('Category removed', 'Deleted', 'info');
      loadCategoriesAndTags();
      loadTransactions();
      loadDashboard();
    } catch (err) {
      showToast(err.message, 'Error', 'error');
    }
  };

  // Add Tag
  const handleAddTagSubmit = async (e) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;
    try {
      await api.createTag({ name: newTagInput.trim() });
      setNewTagInput('');
      showToast('Tag created', 'Success', 'success');
      loadCategoriesAndTags();
    } catch (err) {
      showToast(err.message, 'Error', 'error');
    }
  };

  // Delete Tag
  const handleDeleteTag = async (id) => {
    try {
      await api.deleteTag(id);
      showToast('Tag removed', 'Deleted', 'info');
      loadCategoriesAndTags();
    } catch (err) {
      showToast(err.message, 'Error', 'error');
    }
  };

  // Community Classify Unsure Merchant
  const handleCommunityClassify = async (pattern, txId) => {
    const selectedCatId = selectedCategoryMap[txId];
    if (!selectedCatId) {
      showToast('Please select a category from the dropdown first', 'Selection Needed', 'warning');
      return;
    }

    try {
      const res = await api.classifyMerchant(pattern, selectedCatId);
      showToast(`Pattern "${pattern}" categorized! Updated ${res.updated_count} transactions.`, 'Rule Learned', 'success');
      loadCommunityUnsure();
      loadTransactions();
      loadDashboard();
      loadCategoriesAndTags();
    } catch (err) {
      showToast(err.message, 'Error', 'error');
    }
  };

  // Quick Demo Autofill Credentials
  const autofillDemoUser = () => {
    setAuthForm({
      full_name: 'Alex Rivera',
      email: 'alex.rivera@aether.io',
      phone_number: '9951533951',
      dob: '1998-07-26',
      password: 'password123'
    });
    showToast('Demo credentials populated for quick sign in / test!', 'Demo Helper', 'info');
  };

  // Chart Data Configurations
  const categoryChartData = {
    labels: (analytics?.category_breakdown || []).map((c) => c.name),
    datasets: [
      {
        data: (analytics?.category_breakdown || []).map((c) => c.amount),
        backgroundColor: (analytics?.category_breakdown || []).map((c) => c.color || '#6366f1'),
        borderColor: '#0f131f',
        borderWidth: 4,
        hoverOffset: 8
      }
    ]
  };

  const momChartData = {
    labels: (analytics?.month_over_month || []).map((m) => m.month_label),
    datasets: [
      {
        label: 'Expenses',
        data: (analytics?.month_over_month || []).map((m) => m.expense),
        backgroundColor: 'rgba(99, 102, 241, 0.85)',
        borderRadius: 8
      },
      {
        label: 'Income',
        data: (analytics?.month_over_month || []).map((m) => m.income),
        backgroundColor: 'rgba(16, 185, 129, 0.75)',
        borderRadius: 8
      }
    ]
  };

  return (
    <div className="flex flex-col min-h-screen justify-between relative">
      {/* Ambient Liquid Orbs */}
      <div className="fixed top-10 left-10 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none animate-float-1 -z-10"></div>
      <div className="fixed bottom-10 right-10 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none animate-float-2 -z-10"></div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-3xl pointer-events-none -z-10"></div>

      {/* Toast Notifications */}
      <div id="toast-container" className="fixed top-5 right-5 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`clay-card p-4 rounded-2xl border ${t.type === 'success'
              ? 'border-emerald-500/40 bg-slate-900/95 text-emerald-300'
              : t.type === 'error'
                ? 'border-rose-500/40 bg-slate-900/95 text-rose-300'
                : 'border-amber-500/40 bg-slate-900/95 text-amber-300'
              } shadow-2xl flex items-center gap-3 min-w-[300px] backdrop-blur-xl pointer-events-auto transition-all`}
          >
            <i
              className={`fa-solid ${t.type === 'success' ? 'fa-circle-check' : t.type === 'error' ? 'fa-circle-xmark' : 'fa-triangle-exclamation'
                } text-xl`}
            ></i>
            <div className="flex-grow">
              <p className="text-xs font-bold text-white">{t.title}</p>
              <p className="text-[11px] text-slate-300">{t.message}</p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-slate-400 hover:text-white"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        ))}
      </div>

      {/* Top Header Navbar */}
      <header className="clay-card p-4 mb-6 flex flex-wrap items-center justify-between gap-4 sticky top-4 z-40">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-cyan-400 to-pink-500 p-[2px] shadow-lg shadow-indigo-500/30">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <i className="fa-solid fa-cubes-stacked text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 text-2xl"></i>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Aether<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Flow</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Liquid Glass Expense Intelligence</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-950/40 p-1.5 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${activeTab === 'dashboard'
              ? 'bg-indigo-600/30 text-white border border-indigo-500/30 shadow-inner'
              : 'text-slate-400 hover:text-white'
              }`}
          >
            <i className="fa-solid fa-chart-pie"></i> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${activeTab === 'upload'
              ? 'bg-indigo-600/30 text-white border border-indigo-500/30 shadow-inner'
              : 'text-slate-400 hover:text-white'
              }`}
          >
            <i className="fa-solid fa-cloud-arrow-up"></i> Statement Upload
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${activeTab === 'transactions'
              ? 'bg-indigo-600/30 text-white border border-indigo-500/30 shadow-inner'
              : 'text-slate-400 hover:text-white'
              }`}
          >
            <i className="fa-solid fa-receipt"></i> Transactions
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${activeTab === 'categories'
              ? 'bg-indigo-600/30 text-white border border-indigo-500/30 shadow-inner'
              : 'text-slate-400 hover:text-white'
              }`}
          >
            <i className="fa-solid fa-tags"></i> Categories & Tags
          </button>
        </nav>

        {/* Right User Status */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className="clay-badge px-3 py-2 text-xs flex items-center gap-2 text-indigo-300 font-bold"
              >
                <i className="fa-solid fa-circle-user text-sm text-cyan-400"></i>
                <span className="max-w-[120px] truncate">{user.full_name || user.email}</span>
              </button>
              <button
                onClick={handleLogout}
                className="clay-btn-secondary px-3 py-2 text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5"
                title="Sign Out"
              >
                <i className="fa-solid fa-right-from-bracket"></i>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveTab('auth')}
              className="clay-btn px-4 py-2 text-xs sm:text-sm flex items-center gap-2"
            >
              <i className="fa-solid fa-user-lock"></i>
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Nav Bar */}
      <div className="md:hidden flex overflow-x-auto gap-2 mb-6 pb-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-indigo-600/40 text-white border border-indigo-500/30' : 'bg-slate-900/60 text-slate-400 border border-white/5'
            }`}
        >
          <i className="fa-solid fa-chart-pie mr-1"></i> Dashboard
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${activeTab === 'upload' ? 'bg-indigo-600/40 text-white border border-indigo-500/30' : 'bg-slate-900/60 text-slate-400 border border-white/5'
            }`}
        >
          <i className="fa-solid fa-cloud-arrow-up mr-1"></i> Upload
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${activeTab === 'transactions' ? 'bg-indigo-600/40 text-white border border-indigo-500/30' : 'bg-slate-900/60 text-slate-400 border border-white/5'
            }`}
        >
          <i className="fa-solid fa-receipt mr-1"></i> Transactions
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap ${activeTab === 'categories' ? 'bg-indigo-600/40 text-white border border-indigo-500/30' : 'bg-slate-900/60 text-slate-400 border border-white/5'
            }`}
        >
          <i className="fa-solid fa-tags mr-1"></i> Categories
        </button>
      </div>

      {/* Main Content Areas */}
      <main className="flex-grow max-w-7xl w-full mx-auto space-y-6">
        {/* ================= VIEW 1: AUTHENTICATION ================= */}
        {activeTab === 'auth' && (
          <section className="max-w-xl mx-auto py-6">
            <div className="clay-card p-6 sm:p-10 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-pink-500/20 rounded-full blur-2xl"></div>

              {/* Demo Helper Pill */}
              <div className="flex justify-end mb-4">
                <button
                  type="button"
                  onClick={autofillDemoUser}
                  className="clay-btn-secondary px-3 py-1 text-xs text-cyan-300 flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-wand-magic-sparkles text-cyan-400"></i> Autofill Demo Credentials
                </button>
              </div>

              {/* Form Switcher */}
              <div className="flex p-1 bg-slate-950/60 rounded-2xl border border-white/10 mb-8">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${authMode === 'login' ? 'bg-indigo-600/50 text-white shadow-inner' : 'text-slate-400 hover:text-white'
                    }`}
                >
                  <i className="fa-solid fa-key mr-2"></i>Login
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${authMode === 'register' ? 'bg-indigo-600/50 text-white shadow-inner' : 'text-slate-400 hover:text-white'
                    }`}
                >
                  <i className="fa-solid fa-user-plus mr-2"></i>Register
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {authMode === 'login'
                      ? 'Access your zero-retention liquid analytics portal'
                      : 'Join AetherFlow to automate statement parsing & expense tracking'}
                  </p>
                </div>

                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                    <div className="relative">
                      <i className="fa-solid fa-user absolute left-4 top-3.5 text-slate-500"></i>
                      <input
                        type="text"
                        required
                        placeholder="Alex Rivera"
                        value={authForm.full_name}
                        onChange={(e) => setAuthForm({ ...authForm, full_name: e.target.value })}
                        className="w-full clay-input py-2.5 pl-11 pr-4 text-sm"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <div className="relative">
                    <i className="fa-solid fa-envelope absolute left-4 top-3.5 text-slate-500"></i>
                    <input
                      type="email"
                      required
                      placeholder="alex.rivera@aether.io"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                      className="w-full clay-input py-2.5 pl-11 pr-4 text-sm"
                    />
                  </div>
                </div>

                {authMode === 'register' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                      <div className="relative">
                        <i className="fa-solid fa-phone absolute left-4 top-3.5 text-slate-500"></i>
                        <input
                          type="tel"
                          required
                          placeholder="9951533951"
                          value={authForm.phone_number}
                          onChange={(e) => setAuthForm({ ...authForm, phone_number: e.target.value })}
                          className="w-full clay-input py-2.5 pl-11 pr-4 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Date of Birth (DOB)</label>
                      <div className="relative">
                        <i className="fa-solid fa-calendar-day absolute left-4 top-3.5 text-slate-500"></i>
                        <input
                          type="date"
                          required
                          value={authForm.dob}
                          onChange={(e) => setAuthForm({ ...authForm, dob: e.target.value })}
                          className="w-full clay-input py-2.5 pl-11 pr-4 text-sm text-slate-300"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                  <div className="relative">
                    <i className="fa-solid fa-lock absolute left-4 top-3.5 text-slate-500"></i>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      className="w-full clay-input py-2.5 pl-11 pr-4 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full clay-btn py-3.5 text-sm tracking-wide font-bold mt-4 flex items-center justify-center gap-2"
                >
                  {authLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>{authMode === 'login' ? 'Sign In to Tracker' : 'Register New Account'}</span>
                      <i className="fa-solid fa-arrow-right"></i>
                    </>
                  )}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* ================= VIEW 2: DASHBOARD ================= */}
        {activeTab === 'dashboard' && (
          <section className="space-y-6">
            {!user || analytics?.is_empty ? (
              <div className="clay-card p-12 text-center max-w-2xl mx-auto my-12">
                <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center shadow-xl shadow-cyan-500/10">
                  <i className="fa-solid fa-file-invoice-dollar text-4xl text-cyan-400"></i>
                </div>
                <h2 className="text-2xl font-extrabold text-white mb-2">No Statements Analyzed Yet</h2>
                <p className="text-slate-400 text-sm max-w-md mx-auto mb-8">
                  Upload your first password-protected or standard bank statement PDF to extract transactions and view backend analytics.
                </p>
                <button
                  onClick={() => setActiveTab(user ? 'upload' : 'auth')}
                  className="clay-btn px-8 py-3.5 text-sm inline-flex items-center gap-3"
                >
                  <i className="fa-solid fa-cloud-arrow-up text-lg"></i>
                  <span>{user ? 'Upload First Statement' : 'Sign In & Upload'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Dashboard Period Selector Bar */}
                <div className="clay-card p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-calendar-check text-cyan-400 text-lg"></i>
                    <span className="text-sm font-bold text-white">
                      Active Analytics Period: <span className="text-cyan-400">{analytics?.active_period?.label}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(Number(e.target.value));
                        loadDashboard(selectedYear, Number(e.target.value));
                      }}
                      className="clay-input py-1.5 px-3 text-xs text-slate-300"
                    >
                      {[
                        'January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'
                      ].map((m, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        setSelectedYear(Number(e.target.value));
                        loadDashboard(Number(e.target.value), selectedMonth);
                      }}
                      className="clay-input py-1.5 px-3 text-xs text-slate-300"
                    >
                      {[2024, 2025, 2026, 2027].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4 Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Income Card */}
                  <div className="clay-card p-5 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Income</span>
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <i className="fa-solid fa-arrow-down-left text-lg"></i>
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      ₹ {(analytics?.monthly_summary?.total_income || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                      <i className="fa-solid fa-circle-check"></i>
                      <span>Backend verified inflow</span>
                    </div>
                  </div>

                  {/* Total Expenses Card */}
                  <div className="clay-card p-5 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Expenses</span>
                      <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                        <i className="fa-solid fa-arrow-up-right text-lg"></i>
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      ₹ {(analytics?.monthly_summary?.total_expense || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-rose-400 font-semibold">
                      <i className="fa-solid fa-receipt"></i>
                      <span>All debit transactions</span>
                    </div>
                  </div>

                  {/* Net Savings Card */}
                  <div className="clay-card p-5 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Net Savings</span>
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <i className="fa-solid fa-piggy-bank text-lg"></i>
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      ₹ {(analytics?.monthly_summary?.net_savings || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-cyan-400 font-semibold">
                      <i className="fa-solid fa-shield-halved"></i>
                      <span>{analytics?.monthly_summary?.savings_rate_pct || 0}% savings rate</span>
                    </div>
                  </div>

                  {/* Unsure Items Alert Card */}
                  <div className="clay-card p-5 relative overflow-hidden group border-amber-500/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Needs Attention</span>
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <i className="fa-solid fa-circle-exclamation text-lg"></i>
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      {analytics?.monthly_summary?.unsure_count || 0} Items
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Unsure Categories</span>
                      <button onClick={() => setActiveTab('categories')} className="text-amber-400 hover:underline font-semibold">
                        Review now &rarr;
                      </button>
                    </div>
                  </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Category Breakdown Donut */}
                  <div className="clay-card p-6 lg:col-span-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-white text-base flex items-center gap-2">
                          <i className="fa-solid fa-chart-pie text-cyan-400"></i> Category Breakdown
                        </h3>
                        <span className="text-xs text-slate-400">Backend Computed</span>
                      </div>
                      <div className="relative flex items-center justify-center my-4 h-60">
                        {(analytics?.category_breakdown || []).length > 0 ? (
                          <Doughnut
                            data={categoryChartData}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: { legend: { display: false } },
                              cutout: '70%'
                            }}
                          />
                        ) : (
                          <p className="text-xs text-slate-500">No expenses recorded for this month</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5 text-xs text-slate-300 max-h-36 overflow-y-auto">
                      {(analytics?.category_breakdown || []).map((cat, idx) => (
                        <div key={idx} className="flex items-center gap-2 truncate">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                          <span className="truncate font-medium">
                            {cat.name}: ₹{cat.amount.toFixed(0)} ({cat.percentage}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Month-over-Month Bar Chart */}
                  <div className="clay-card p-6 lg:col-span-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-white text-base flex items-center gap-2">
                          <i className="fa-solid fa-chart-column text-indigo-400"></i> Month-over-Month Spending
                        </h3>
                        <p className="text-xs text-slate-400">Aggregated historical trend</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full bg-indigo-500"></span>
                        <span className="text-xs text-slate-300 mr-2">Expenses</span>
                        <span className="inline-block w-3 h-3 rounded-full bg-emerald-400"></span>
                        <span className="text-xs text-slate-300">Income</span>
                      </div>
                    </div>
                    <div className="h-64 relative">
                      {(analytics?.month_over_month || []).length > 0 ? (
                        <Bar
                          data={momChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                              x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                              y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 } } }
                            }
                          }}
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-slate-500">
                          No historical months to compare yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Top High-Paid Transactions */}
                <div className="clay-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-white text-base flex items-center gap-2">
                        <i className="fa-solid fa-fire text-rose-400"></i> Top High-Paid Transactions
                      </h3>
                      <p className="text-xs text-slate-400">Highest individual expenses recorded this period</p>
                    </div>
                    <button onClick={() => setActiveTab('transactions')} className="text-xs text-cyan-400 font-semibold hover:underline">
                      View All Transactions &rarr;
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(analytics?.top_transactions || []).length > 0 ? (
                      analytics.top_transactions.map((tx) => (
                        <div key={tx.id} className="clay-btn-secondary p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                              <i className="fa-solid fa-arrow-up-right"></i>
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-white truncate">{tx.description}</p>
                              <p className="text-[10px] text-slate-400">
                                {tx.date} • <span style={{ color: tx.category_color }}>{tx.category}</span>
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-extrabold text-rose-400 shrink-0"> ₹{tx.amount.toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 col-span-3">No expenses recorded for this month</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ================= VIEW 3: STATEMENT UPLOAD ================= */}
        {activeTab === 'upload' && (
          <section className="space-y-6 max-w-4xl mx-auto py-4">
            <div className="clay-card p-6 sm:p-10">
              <div className="text-center max-w-xl mx-auto mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-2xl shadow-lg">
                  <i className="fa-solid fa-file-pdf"></i>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Upload Bank Statement</h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Drag & drop your official PDF bank statement. Password decryption is handled dynamically from your profile with zero server-side disk storage.
                </p>
              </div>

              {/* Optional Custom Password Field */}
              <div className="max-w-md mx-auto mb-6">
                <label className="block text-xs font-semibold text-slate-300 mb-1 text-center">
                  Override Decryption Password (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Leave empty to use automatic (Phone + DOB) formula"
                  value={manualPassword}
                  onChange={(e) => setManualPassword(e.target.value)}
                  className="w-full clay-input py-2 px-3 text-xs text-center"
                />
              </div>

              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files.length > 0) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`border-2 border-dashed ${isDragOver ? 'drag-over' : 'border-white/15 hover:border-cyan-400/60'
                  } bg-slate-950/40 rounded-3xl p-8 sm:p-12 text-center transition cursor-pointer relative overflow-hidden group`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />

                {!isUploading ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:scale-110 group-hover:text-cyan-400 transition">
                      <i className="fa-solid fa-cloud-arrow-up text-3xl"></i>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-white">Drag and drop your PDF bank statement here</p>
                      <p className="text-xs text-slate-400 mt-1">Supports SBI, HDFC, ICICI, Chase, BoA, Revolut & standard formats</p>
                    </div>
                    <div>
                      <button type="button" className="clay-btn px-6 py-2.5 text-xs inline-flex items-center gap-2">
                        <i className="fa-solid fa-folder-open"></i> Browse PDF Files
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                    <div className="w-12 h-12 mx-auto border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                    <div>
                      <p className="text-base font-bold text-white">Parsing PDF & Classifying Categories in RAM...</p>
                      <p className="text-xs text-cyan-400 font-mono mt-1">Extracting records {uploadProgress}%</p>
                    </div>
                    <div className="w-full max-w-md mx-auto bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
                      <div
                        className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Zero-Retention Security Badges */}
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-shield-halved text-emerald-400"></i>
                  <span>Zero Server-Side Retention: PDF streams unlinked immediately</span>
                </div>
                <div className="flex gap-3">
                  <span className="clay-badge px-3 py-1 text-[11px]">
                    <i className="fa-regular fa-file-pdf text-rose-400 mr-1"></i> In-Memory Decryption
                  </span>
                  <span className="clay-badge px-3 py-1 text-[11px]">
                    <i className="fa-solid fa-bolt text-amber-400 mr-1"></i> Deduplicated Ingestion
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= VIEW 4: TRANSACTIONS MANAGEMENT ================= */}
        {activeTab === 'transactions' && (
          <section className="space-y-6">
            <div className="clay-card p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <i className="fa-solid fa-list-check text-indigo-400"></i> Transactions Directory
                  </h2>
                  <p className="text-xs text-slate-400">Search, filter, and categorize all recorded financial lines</p>
                </div>
                <button
                  onClick={() => setIsTxModalOpen(true)}
                  className="clay-btn px-4 py-2.5 text-xs inline-flex items-center gap-2 self-start md:self-auto"
                >
                  <i className="fa-solid fa-plus"></i> Add Manual Transaction
                </button>
              </div>

              {/* Search & Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                <div className="relative lg:col-span-2">
                  <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-500 text-xs"></i>
                  <input
                    type="text"
                    value={txSearch}
                    onChange={(e) => {
                      setTxSearch(e.target.value);
                      setTxPage(1);
                    }}
                    placeholder="Search by merchant, description, or tag..."
                    className="w-full clay-input py-2 pl-9 pr-3 text-xs"
                  />
                </div>

                <div>
                  <select
                    value={txCategoryFilter}
                    onChange={(e) => {
                      setTxCategoryFilter(e.target.value);
                      setTxPage(1);
                    }}
                    className="w-full clay-input py-2 px-3 text-xs text-slate-300"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="Unsure">⚠️ Unsure / Flagged</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={txTypeFilter}
                    onChange={(e) => {
                      setTxTypeFilter(e.target.value);
                      setTxPage(1);
                    }}
                    className="w-full clay-input py-2 px-3 text-xs text-slate-300"
                  >
                    <option value="ALL">All Types</option>
                    <option value="DEBIT">Expenses Only (-)</option>
                    <option value="CREDIT">Income Only (+)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Transactions Table Card */}
            <div className="clay-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-white/10">
                    <tr>
                      <th className="py-4 px-5">Date</th>
                      <th className="py-4 px-5">Sender / Description</th>
                      <th className="py-4 px-5">Category</th>
                      <th className="py-4 px-5">Tag</th>
                      <th className="py-4 px-5 text-right">Amount</th>
                      <th className="py-4 px-5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {transactions.length > 0 ? (
                      transactions.map((t) => {
                        const isIncome = t.type === 'CREDIT';
                        const isUnsure = t.status === 'UNSURE' || !t.category;
                        return (
                          <tr key={t.id} className="hover:bg-white/[0.02] transition border-b border-white/5">
                            <td className="py-3.5 px-5 whitespace-nowrap text-slate-400">{t.transaction_date}</td>
                            <td className="py-3.5 px-5">
                              <p className="font-bold text-white">{t.description}</p>
                              {t.raw_narration && (
                                <p className="text-[10px] text-slate-400 font-mono truncate max-w-sm">
                                  {t.raw_narration}
                                </p>
                              )}
                            </td>
                            <td className="py-3.5 px-5">
                              {isUnsure ? (
                                <span className="clay-badge px-2.5 py-1 text-[11px] font-bold text-amber-300 border-amber-500/40 bg-amber-500/10 inline-flex items-center gap-1">
                                  <i className="fa-solid fa-triangle-exclamation"></i> Unsure
                                </span>
                              ) : (
                                <span
                                  className="clay-badge px-2.5 py-1 text-[11px] font-medium"
                                  style={{ color: t.category_color || '#6366f1' }}
                                >
                                  {t.category_name}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-5">
                              <span className="text-xs text-indigo-400 font-medium">{t.tag_name || '#General'}</span>
                            </td>
                            <td
                              className={`py-3.5 px-5 text-right whitespace-nowrap font-bold ${isIncome ? 'text-emerald-400' : 'text-slate-200'
                                }`}
                            >
                              {isIncome ? '+' : '-'} ₹{parseFloat(t.amount).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-5 text-center">
                              <button
                                onClick={() => handleDeleteTx(t.id)}
                                className="text-slate-500 hover:text-rose-400 transition px-2 py-1"
                                title="Delete Transaction"
                              >
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-500">
                          {txLoading ? 'Loading transactions...' : 'No matching transactions found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
                <span>Showing {transactions.length} of {totalTxCount} transactions</span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={txPage <= 1}
                    onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                    className="clay-btn-secondary px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
                  >
                    &larr; Previous
                  </button>
                  <span className="px-2 font-bold text-white">Page {txPage}</span>
                  <button
                    disabled={transactions.length < 20}
                    onClick={() => setTxPage((p) => p + 1)}
                    className="clay-btn-secondary px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================= VIEW 5: CATEGORIES & TAGS (PUBLIC / COMMUNITY) ================= */}
        {activeTab === 'categories' && (
          <section className="space-y-6">
            {/* ❓ UNSURE TRANSACTIONS PUBLIC BANNER */}
            <div className="clay-card p-6 border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900/60 to-slate-900/60">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <i className="fa-solid fa-circle-question text-lg"></i>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Community Merchant Classification Feed
                    </h3>
                    <p className="text-xs text-slate-400">
                      Help categorize unidentified transactions. Suggestions create global rules that auto-classify all future statement uploads!
                    </p>
                  </div>
                </div>
                <span className="clay-badge px-3 py-1 text-xs text-amber-300 font-bold border-amber-500/40">
                  {unsureMerchants.length} Items Pending
                </span>
              </div>

              {unsureMerchants.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {unsureMerchants.map((item) => (
                    <div key={item.id} className="clay-card p-4 space-y-3 bg-slate-900/80 border-amber-500/20">
                      <div className="flex items-center justify-between">
                        <div className="truncate">
                          <p className="text-xs font-bold text-white truncate">{item.description}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">{item.raw_narration || item.description}</p>
                        </div>
                        <span className="text-sm font-extrabold text-rose-400 shrink-0"> ₹{parseFloat(item.amount).toFixed(2)}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <select
                          value={selectedCategoryMap[item.id] || ''}
                          onChange={(e) =>
                            setSelectedCategoryMap({
                              ...selectedCategoryMap,
                              [item.id]: e.target.value
                            })
                          }
                          className="clay-input py-1.5 px-2 text-xs flex-grow text-slate-300"
                        >
                          <option value="">-- Select Category --</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleCommunityClassify(item.description, item.id)}
                          className="clay-btn px-3 py-1.5 text-xs font-bold whitespace-nowrap"
                        >
                          Assign & Save Rule
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-emerald-400 font-medium">
                  <i className="fa-solid fa-circle-check mr-2"></i> All merchant statements are fully categorized!
                </div>
              )}
            </div>

            {/* Categories & Tags Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Spending Categories */}
              <div className="clay-card p-6 lg:col-span-2 space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <i className="fa-solid fa-shapes text-cyan-400"></i> Spending Categories
                    </h3>
                    <p className="text-xs text-slate-400">Manage categories used for deterministic classification</p>
                  </div>
                  {user && (
                    <button
                      onClick={() => setIsCatModalOpen(true)}
                      className="clay-btn px-3 py-2 text-xs flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-plus"></i> New Category
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categories.map((c) => (
                    <div key={c.id} className="clay-btn-secondary p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                          style={{
                            backgroundColor: `${c.color_hex}25`,
                            border: `1px solid ${c.color_hex}50`,
                            color: c.color_hex
                          }}
                        >
                          <i className={`fa-solid ${c.icon || 'fa-tag'}`}></i>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{c.name}</p>
                          <p className="text-[10px] text-slate-400">{c.count || 0} linked transactions</p>
                        </div>
                      </div>
                      {user && !c.is_default && (
                        <button
                          onClick={() => handleDeleteCat(c.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Delete Category"
                        >
                          <i className="fa-solid fa-trash text-xs"></i>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags Cloud */}
              <div className="clay-card p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <i className="fa-solid fa-hashtag text-pink-400"></i> Tags & Labels
                    </h3>
                    <p className="text-xs text-slate-400">Cross-cutting labels for expenses</p>
                  </div>
                </div>

                {user && (
                  <form onSubmit={handleAddTagSubmit} className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="New Tag (e.g. #Vacation)"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      className="clay-input flex-grow py-2 px-3 text-xs"
                    />
                    <button type="submit" className="clay-btn px-3 py-2 text-xs font-bold">
                      Add
                    </button>
                  </form>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {tags.map((tg) => (
                    <span
                      key={tg.id}
                      className="clay-badge px-3 py-1.5 text-xs text-indigo-300 flex items-center gap-2 group hover:border-indigo-400/50"
                    >
                      <span>{tg.name}</span>
                      {user && (
                        <i
                          onClick={() => handleDeleteTag(tg.id)}
                          className="fa-solid fa-xmark text-[10px] text-slate-500 group-hover:text-rose-400 cursor-pointer"
                        ></i>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ================= MODAL: ADD MANUAL TRANSACTION ================= */}
      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="clay-card max-w-md w-full p-6 space-y-5 relative animate-float-1">
            <button onClick={() => setIsTxModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-receipt text-indigo-400"></i> Add Manual Transaction
            </h3>

            <form onSubmit={handleSaveManualTx} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Sender / Merchant Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Starlink Internet"
                  value={newTxForm.description}
                  onChange={(e) => setNewTxForm({ ...newTxForm, description: e.target.value })}
                  className="w-full clay-input py-2 px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="120.00"
                    value={newTxForm.amount}
                    onChange={(e) => setNewTxForm({ ...newTxForm, amount: e.target.value })}
                    className="w-full clay-input py-2 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Type</label>
                  <select
                    value={newTxForm.type}
                    onChange={(e) => setNewTxForm({ ...newTxForm, type: e.target.value })}
                    className="w-full clay-input py-2 px-3 text-xs text-slate-300"
                  >
                    <option value="DEBIT">Expense (-)</option>
                    <option value="CREDIT">Income (+)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={newTxForm.category}
                    onChange={(e) => setNewTxForm({ ...newTxForm, category: e.target.value })}
                    className="w-full clay-input py-2 px-3 text-xs text-slate-300"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tag</label>
                  <select
                    value={newTxForm.tag}
                    onChange={(e) => setNewTxForm({ ...newTxForm, tag: e.target.value })}
                    className="w-full clay-input py-2 px-3 text-xs text-slate-300"
                  >
                    <option value="">Select Tag</option>
                    {tags.map((tg) => (
                      <option key={tg.id} value={tg.id}>
                        {tg.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Transaction Date</label>
                <input
                  type="date"
                  required
                  value={newTxForm.transaction_date}
                  onChange={(e) => setNewTxForm({ ...newTxForm, transaction_date: e.target.value })}
                  className="w-full clay-input py-2 px-3 text-xs text-slate-300"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTxModalOpen(false)}
                  className="flex-1 clay-btn-secondary py-2.5 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 clay-btn py-2.5 text-xs font-bold">
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD CATEGORY ================= */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="clay-card max-w-sm w-full p-6 space-y-4 relative">
            <button onClick={() => setIsCatModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>

            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-folder-plus text-cyan-400"></i> Create New Category
            </h3>

            <form onSubmit={handleSaveNewCat} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Subscriptions"
                  value={newCatForm.name}
                  onChange={(e) => setNewCatForm({ ...newCatForm, name: e.target.value })}
                  className="w-full clay-input py-2 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Color Theme</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={newCatForm.color_hex}
                    onChange={(e) => setNewCatForm({ ...newCatForm, color_hex: e.target.value })}
                    className="h-9 w-12 rounded bg-transparent cursor-pointer border border-white/20"
                  />
                  <span className="text-xs text-slate-400 self-center">Pick visual highlight color</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="flex-1 clay-btn-secondary py-2 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 clay-btn py-2 text-xs font-bold">
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-slate-500 py-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        <span>&copy; 2026 AetherFlow Financial. Monolithic Backend + React SPA Architecture.</span>
        <div className="flex gap-4 text-slate-400">
          <span className="text-cyan-400">Zero Retention Ephemeral Ingestion Active</span>
        </div>
      </footer>
    </div>
  );
}
