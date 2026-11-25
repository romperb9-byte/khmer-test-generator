import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  School as SchoolIcon,
  ShieldCheck,
  KeyRound,
  Plus,
  Trash2,
  Edit3,
  Lock,
  ArrowRight,
  Search,
  Database,
  HardDrive,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  LogOut,
  Eye,
  EyeOff
} from 'lucide-react';
import { School } from '../types';
import { fetchSchools, createSchool, updateSchool, deleteSchool } from '../services/dbService';
import { isSupabaseConfigured } from '../lib/supabase';
import { getStoredGeminiApiKey, setStoredGeminiApiKey } from '../services/geminiService';

interface HomePageProps {
  onEnterSchool: (school: School) => void;
}

const ADMIN_USER = (import.meta as any).env?.VITE_ADMIN_USERNAME || 'admin';
const ADMIN_PASS = (import.meta as any).env?.VITE_ADMIN_PASSWORD || 'admin123';

export const HomePage: React.FC<HomePageProps> = ({ onEnterSchool }) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Free API Key state
  const [apiKey, setApiKey] = useState(() => getStoredGeminiApiKey());
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);

  // School Access Code Modal
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [enteredCode, setEnteredCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  // Admin Modal & Auth
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);

  // Admin School Form
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [principalCode, setPrincipalCode] = useState('1234');
  const [schoolDesc, setSchoolDesc] = useState('');
  const [isSavingSchool, setIsSavingSchool] = useState(false);

  const loadSchools = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSchools();
      setSchools(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'មិនអាចទាញយកបញ្ជីសាលាបានទេ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchools();
  }, []);

  const handleSaveApiKey = () => {
    setStoredGeminiApiKey(apiKey);
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2500);
  };

  const handleOpenSchoolModal = (school: School) => {
    setSelectedSchool(school);
    setEnteredCode('');
    setCodeError(null);
  };

  const handleVerifySchoolCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) return;
    if (enteredCode.trim() === selectedSchool.access_code.trim()) {
      const schoolToEnter = selectedSchool;
      setSelectedSchool(null);
      setEnteredCode('');
      onEnterSchool(schoolToEnter);
    } else {
      setCodeError('លេខកូដសាលាមិនត្រឹមត្រូវទេ! សូមសួរ Admin ឬព្យាយាមម្ដងទៀត។');
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUsername.trim() === ADMIN_USER && adminPassword === ADMIN_PASS) {
      setIsAdminLoggedIn(true);
      setAdminAuthError(null);
    } else {
      setAdminAuthError('ឈ្មោះអ្នកប្រើ ឬលេខសម្ងាត់ Admin មិនត្រឹមត្រូវទេ!');
    }
  };

  const resetSchoolForm = () => {
    setEditingSchoolId(null);
    setSchoolName('');
    setSchoolCode('');
    setPrincipalCode('1234');
    setSchoolDesc('');
  };

  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim() || !schoolCode.trim()) {
      setError('សូមបញ្ចូលឈ្មោះសាលា និងលេខកូដចូលសាលា!');
      return;
    }
    setIsSavingSchool(true);
    setError(null);
    try {
      if (editingSchoolId) {
        await updateSchool(editingSchoolId, {
          name: schoolName.trim(),
          access_code: schoolCode.trim(),
          principal_code: principalCode.trim() || '1234',
          description: schoolDesc.trim(),
        });
      } else {
        await createSchool({
          name: schoolName.trim(),
          access_code: schoolCode.trim(),
          principal_code: principalCode.trim() || '1234',
          description: schoolDesc.trim(),
        });
      }
      resetSchoolForm();
      await loadSchools();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'មានបញ្ហាក្នុងការរក្សាទុកសាលា');
    } finally {
      setIsSavingSchool(false);
    }
  };

  const handleEditSchool = (s: School) => {
    setEditingSchoolId(s.id);
    setSchoolName(s.name);
    setSchoolCode(s.access_code);
    setPrincipalCode(s.principal_code || '1234');
    setSchoolDesc(s.description || '');
  };

  const handleDeleteSchool = async (id: string, name: string) => {
    if (!window.confirm(`តើអ្នកពិតជាចង់លុប "${name}" មែនទេ? ទិន្នន័យវិញ្ញាសា និងពិន្ទុទាំងអស់របស់សាលានេះនឹងត្រូវលុបផងដែរ។`)) {
      return;
    }
    try {
      await deleteSchool(id);
      await loadSchools();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'មិនអាចលុបសាលាបានទេ');
    }
  };

  const filteredSchools = schools.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/50 text-slate-900 font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="bg-[#1e293b] text-white h-20 px-6 md:px-10 flex items-center justify-between shadow-lg sticky top-0 z-40">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-blue-500 rounded-xl flex items-center justify-center font-bold text-2xl shadow-inner rotate-3">
            ត
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight leading-none">
              ប្រព័ន្ធប្រឡង និងបង្កើតវិញ្ញាសាតេស្ដ
            </h1>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
              {isSupabaseConfigured ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                  <Database className="w-3 h-3" /> Supabase Cloud Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                  <HardDrive className="w-3 h-3" /> Local Storage Mode
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAdminModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs md:text-sm font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Admin</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 space-y-8">
        {/* Hero + Free Gemini API Key Bar */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ទំព័រដើម (Home Page)</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              ជ្រើសរើសសាលារៀនរបស់អ្នក
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              ចុចលើកាតសាលារៀន ហើយបញ្ចូលលេខកូដសាលាដែល Admin បានផ្ដល់ឱ្យ ដើម្បីចូលទៅកាន់កម្មវិធីសម្រាប់ គ្រូបង្រៀន នាយក/លេខា និងសិស្សានុសិស្ស។
            </p>
          </div>

          {/* Free Gemini API Key Input */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 w-full lg:w-[400px] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                <span>Gemini API Key (Free)</span>
              </label>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-blue-600 hover:underline"
              >
                យក Key ឥតគិតថ្លៃ ↗
              </a>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="បញ្ចូល AIza... របស់អ្នក"
                  className="w-full pl-3 pr-9 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer"
              >
                {apiKeySaved ? 'បានរក្សាទុក!' : 'រក្សាទុក'}
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              API Key ត្រូវបានរក្សាទុកក្នុង Browser របស់អ្នកផ្ទាល់ សម្រាប់ឱ្យ AI បង្កើតវិញ្ញាសា។
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl flex items-center gap-3 text-sm font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-rose-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <SchoolIcon className="w-5 h-5 text-blue-600" />
            <span>បញ្ជីសាលារៀន ({filteredSchools.length})</span>
          </h3>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ស្វែងរកឈ្មោះសាលា..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* School Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-white rounded-3xl border border-slate-200 animate-pulse p-6" />
            ))}
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto">
              <SchoolIcon className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-slate-800">មិនទាន់មានសាលារៀននៅឡើយទេ</h4>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                សូមចុចប៊ូតុង <span className="font-bold text-blue-600">Admin</span> ខាងលើ ដើម្បីចូលបន្ថែមសាលារៀន និងបង្កើតលេខកូដចូលសាលា។
              </p>
            </div>
            <button
              onClick={() => setShowAdminModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>ចូល Admin ដើម្បីបន្ថែមសាលា</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSchools.map((school) => (
              <motion.div
                key={school.id}
                whileHover={{ y: -4 }}
                onClick={() => handleOpenSchoolModal(school)}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                      <SchoolIcon className="w-6 h-6" />
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
                      <Lock className="w-3 h-3" /> ត្រូវការកូដ
                    </span>
                  </div>
                  <div>
                    <h4 className="text-lg font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {school.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                      {school.description || 'ចុចដើម្បីបញ្ចូលលេខកូដ និងចូលប្រើប្រាស់ប្រព័ន្ធតេស្ដរបស់សាលា'}
                    </p>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                  <span>ចូលទៅកាន់សាលា</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* School Access Code Modal */}
      <AnimatePresence>
        {selectedSchool && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full p-7 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900">{selectedSchool.name}</h3>
                    <p className="text-xs text-slate-500">បញ្ចូលលេខកូដសាលាដើម្បីចូល</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSchool(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleVerifySchoolCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">លេខកូដសាលា (Access Code)</label>
                  <input
                    type="password"
                    autoFocus
                    value={enteredCode}
                    onChange={(e) => { setEnteredCode(e.target.value); setCodeError(null); }}
                    placeholder="បញ្ចូលលេខកូដដែល Admin បានកំណត់..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  {codeError && (
                    <p className="text-xs text-rose-600 font-semibold mt-2">{codeError}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSchool(null)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl cursor-pointer"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/20 cursor-pointer"
                  >
                    ចូលសាលា
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Modal */}
      <AnimatePresence>
        {showAdminModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900">គ្រប់គ្រងប្រព័ន្ធ (Admin Panel)</h3>
                    <p className="text-xs text-slate-500">បន្ថែម និងគ្រប់គ្រងកាតសាលារៀន និងលេខកូដ</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdminLoggedIn && (
                    <button
                      onClick={() => { setIsAdminLoggedIn(false); setAdminPassword(''); }}
                      className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" /> ចាកចេញ
                    </button>
                  )}
                  <button
                    onClick={() => setShowAdminModal(false)}
                    className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-7 overflow-y-auto flex-1">
                {!isAdminLoggedIn ? (
                  <form onSubmit={handleAdminLogin} className="max-w-sm mx-auto space-y-4 py-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">ឈ្មោះអ្នកប្រើ (Username)</label>
                      <input
                        type="text"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        placeholder="admin"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">លេខសម្ងាត់ (Password)</label>
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                    {adminAuthError && (
                      <p className="text-xs text-rose-600 font-semibold">{adminAuthError}</p>
                    )}
                    <button
                      type="submit"
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/20 cursor-pointer"
                    >
                      ចូល Admin
                    </button>
                    <p className="text-[11px] text-center text-slate-400">
                      លំនាំដើម៖ User: <code className="bg-slate-100 px-1.5 py-0.5 rounded">{ADMIN_USER}</code> / Pass: <code className="bg-slate-100 px-1.5 py-0.5 rounded">{ADMIN_PASS}</code>
                    </p>
                  </form>
                ) : (
                  <div className="space-y-8">
                    {/* Add / Edit School Form */}
                    <form onSubmit={handleSaveSchool} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                      <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-blue-600" />
                        <span>{editingSchoolId ? 'កែសម្រួលព័ត៌មានសាលា' : 'បន្ថែមសាលារៀនថ្មី'}</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-600 mb-1">ឈ្មោះសាលា *</label>
                          <input
                            type="text"
                            required
                            value={schoolName}
                            onChange={(e) => setSchoolName(e.target.value)}
                            placeholder="ឧ. វិទ្យាល័យព្រះស៊ីសុវត្ថិ"
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">លេខកូដចូលសាលា (Access Code) *</label>
                          <input
                            type="text"
                            required
                            value={schoolCode}
                            onChange={(e) => setSchoolCode(e.target.value)}
                            placeholder="ឧ. SCHOOL2026"
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">លេខកូដនាយក / លេខា</label>
                          <input
                            type="text"
                            value={principalCode}
                            onChange={(e) => setPrincipalCode(e.target.value)}
                            placeholder="1234"
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-slate-600 mb-1">ព័ត៌មានបន្ថែម (ទីតាំង / ការពិពណ៌នា)</label>
                          <input
                            type="text"
                            value={schoolDesc}
                            onChange={(e) => setSchoolDesc(e.target.value)}
                            placeholder="ឧ. រាជធានីភ្នំពេញ"
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        {editingSchoolId && (
                          <button
                            type="button"
                            onClick={resetSchoolForm}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer"
                          >
                            បោះបង់
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={isSavingSchool}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isSavingSchool ? 'កំពុងរក្សាទុក...' : editingSchoolId ? 'ធ្វើបច្ចុប្បន្នភាព' : 'បន្ថែមសាលា'}</span>
                        </button>
                      </div>
                    </form>

                    {/* Existing Schools List */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-sm text-slate-800">សាលារៀនដែលបានបង្កើត ({schools.length})</h4>
                      {schools.length === 0 ? (
                        <p className="text-xs text-slate-400">មិនទាន់មានសាលាទេ។</p>
                      ) : (
                        <div className="space-y-2.5">
                          {schools.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl">
                              <div>
                                <p className="font-bold text-sm text-slate-900">{s.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  កូដចូលសាលា៖ <span className="font-mono font-bold text-blue-600">{s.access_code}</span>
                                  {' • '}
                                  កូដនាយក/លេខា៖ <span className="font-mono font-bold text-emerald-600">{s.principal_code}</span>
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleEditSchool(s)}
                                  className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl cursor-pointer"
                                  title="កែសម្រួល"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSchool(s.id, s.name)}
                                  className="p-2 hover:bg-rose-50 text-rose-600 rounded-xl cursor-pointer"
                                  title="លុប"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
