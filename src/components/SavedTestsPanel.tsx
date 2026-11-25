import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  BookOpen,
  RefreshCw,
  Search,
  Lock
} from 'lucide-react';
import { SavedTest, School } from '../types';
import { fetchTests, deleteTest } from '../services/dbService';

interface SavedTestsPanelProps {
  school: School;
  onLoadTest: (test: SavedTest) => void;
}

export const SavedTestsPanel: React.FC<SavedTestsPanelProps> = ({ school, onLoadTest }) => {
  const [tests, setTests] = useState<SavedTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGrade, setFilterGrade] = useState('ទាំងអស់');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchTests(school.id);
      setTests(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [school.id]);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`តើអ្នកចង់លុបវិញ្ញាសា "${title}" មែនទេ?`)) return;
    await deleteTest(id);
    setTests(prev => prev.filter(t => t.id !== id));
  };

  const grades = ['ទាំងអស់', ...Array.from(new Set(tests.map(t => t.grade)))];

  const filtered = tests.filter(t => {
    const matchGrade = filterGrade === 'ទាំងអស់' || t.grade === filterGrade;
    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      (t.teacher_name || '').toLowerCase().includes(search.toLowerCase());
    return matchGrade && matchSearch;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
              <FolderOpen className="w-6 h-6 text-blue-600" />
              <span>ឃ្លាំងរក្សាទុកទម្រង់វិញ្ញាសា</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              វិញ្ញាសាទាំងអស់ដែលគ្រូបង្រៀនបានបង្កើត និងរក្សាទុកសម្រាប់ {school.name}
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>ផ្ទុកឡើងវិញ</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ស្វែងរកតាមចំណងជើង មុខវិជ្ជា ឬឈ្មោះគ្រូ..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500"
          >
            {grades.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 text-sm">កំពុងទាញយកទិន្នន័យ...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500 text-sm">
            មិនទាន់មានវិញ្ញាសាដែលបានរក្សាទុកទេ។ សូមបង្កើតវិញ្ញាសាថ្មី រួចចុច "រក្សាទុកក្នុងកម្មវិធី"។
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(t => (
              <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 text-base leading-snug">{t.title}</h3>
                    {t.is_published ? (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" /> បើកឱ្យសិស្សប្រឡង
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                        <Lock className="w-3 h-3" /> រង់ចាំនាយក/លេខាបើក
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-semibold">{t.grade}</span>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-semibold flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> {t.subject}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {t.duration} នាទី • {t.questions.length} សំណួរ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    បង្កើតដោយ៖ {t.teacher_name || 'គ្រូបង្រៀន'}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => onLoadTest(t)}
                    className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>បើកមើល / Export</span>
                  </button>
                  <button
                    onClick={() => handleDelete(t.id, t.title)}
                    className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl cursor-pointer"
                    title="លុបវិញ្ញាសា"
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
  );
};
