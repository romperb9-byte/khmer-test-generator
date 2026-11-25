import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Lock,
  FileText,
  BarChart3,
  BookOpen,
  Download,
  Trash2,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { School, SavedTest, StudentSubmission, SubjectItem } from '../types';
import {
  fetchTests,
  updateTestSettings,
  deleteTest,
  fetchSubmissions,
  fetchSubjects,
  addSubject,
  deleteSubject
} from '../services/dbService';

interface PrincipalPortalProps {
  school: School;
  onSubjectsChanged?: () => void;
}

export const PrincipalPortal: React.FC<PrincipalPortalProps> = ({ school, onSubjectsChanged }) => {
  const [unlocked, setUnlocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'tests' | 'scores' | 'subjects'>('tests');
  const [tests, setTests] = useState<SavedTest[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [testGradeFilter, setTestGradeFilter] = useState('ទាំងអស់');
  const [testSubjectFilter, setTestSubjectFilter] = useState('ទាំងអស់');
  const [scoreGradeFilter, setScoreGradeFilter] = useState('ទាំងអស់');
  const [scoreSubjectFilter, setScoreSubjectFilter] = useState('ទាំងអស់');
  const [scoreSearch, setScoreSearch] = useState('');

  // New Subject
  const [newSubjectName, setNewSubjectName] = useState('');
  const [subjectError, setSubjectError] = useState<string | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [tData, sData, subData] = await Promise.all([
        fetchTests(school.id),
        fetchSubmissions(school.id),
        fetchSubjects(school.id)
      ]);
      setTests(tData);
      setSubmissions(sData);
      setSubjects(subData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (unlocked) {
      loadAllData();
    }
  }, [unlocked, school.id]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === (school.principal_code || '1234').trim()) {
      setUnlocked(true);
      setAuthError(null);
    } else {
      setAuthError('លេខកូដនាយក / លេខា មិនត្រឹមត្រូវទេ!');
    }
  };

  const handleTogglePublished = async (test: SavedTest) => {
    const updated = await updateTestSettings(test.id, { is_published: !test.is_published });
    setTests(prev => prev.map(t => (t.id === test.id ? updated : t)));
  };

  const handleToggleShowScore = async (test: SavedTest) => {
    const updated = await updateTestSettings(test.id, { show_score_immediately: !test.show_score_immediately });
    setTests(prev => prev.map(t => (t.id === test.id ? updated : t)));
  };

  const handleDeleteTest = async (id: string, title: string) => {
    if (!window.confirm(`តើអ្នកចង់លុបវិញ្ញាសា "${title}" មែនទេ?`)) return;
    await deleteTest(id);
    setTests(prev => prev.filter(t => t.id !== id));
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubjectError(null);
    if (!newSubjectName.trim()) return;
    try {
      const added = await addSubject(school.id, newSubjectName.trim());
      setSubjects(prev => [...prev, added]);
      setNewSubjectName('');
      onSubjectsChanged?.();
    } catch (err) {
      setSubjectError(err instanceof Error ? err.message : 'មិនអាចបន្ថែមមុខវិជ្ជាបានទេ');
    }
  };

  const handleDeleteSubject = async (id: string, name: string) => {
    if (!window.confirm(`លុបមុខវិជ្ជា "${name}"?`)) return;
    await deleteSubject(id);
    setSubjects(prev => prev.filter(s => s.id !== id));
    onSubjectsChanged?.();
  };

  const filteredTests = tests.filter(t => {
    const gOk = testGradeFilter === 'ទាំងអស់' || t.grade === testGradeFilter;
    const sOk = testSubjectFilter === 'ទាំងអស់' || t.subject === testSubjectFilter;
    return gOk && sOk;
  });

  const filteredScores = submissions.filter(s => {
    const gOk = scoreGradeFilter === 'ទាំងអស់' || s.grade === scoreGradeFilter;
    const sOk = scoreSubjectFilter === 'ទាំងអស់' || s.subject === scoreSubjectFilter;
    const q = scoreSearch.toLowerCase();
    const qOk =
      !q ||
      s.student_name.toLowerCase().includes(q) ||
      s.student_id.toLowerCase().includes(q) ||
      s.test_title.toLowerCase().includes(q);
    return gOk && sOk && qOk;
  });

  const handleExportScoresCSV = () => {
    const headers = [
      'អត្តលេខ',
      'ឈ្មោះសិស្ស',
      'ថ្នាក់',
      'មុខវិជ្ជា',
      'វិញ្ញាសា',
      'ពិន្ទុ (លើ ១០)',
      'ចម្លើយត្រូវ',
      'សំណួរសរុប',
      'កាលបរិច្ឆេទបញ្ជូន'
    ];
    const escapeCsv = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;
    const rows = filteredScores.map(s => [
      escapeCsv(s.student_id),
      escapeCsv(s.student_name),
      escapeCsv(s.grade),
      escapeCsv(s.subject),
      escapeCsv(s.test_title),
      escapeCsv(s.score),
      escapeCsv(s.correct_count),
      escapeCsv(s.total_questions),
      escapeCsv(s.submitted_at ? new Date(s.submitted_at).toLocaleString('km-KH') : '')
    ].join(','));

    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `ពិន្ទុសិស្ស_${school.name}_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (!unlocked) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg max-w-md w-full p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
              <UserCheck className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">ផ្នែកនាយក / លេខា</h2>
            <p className="text-xs text-slate-500">
              បញ្ចូលលេខកូដនាយក/លេខា ដើម្បីគ្រប់គ្រងវិញ្ញាសា កំណត់ការបង្ហាញពិន្ទុ និងទាញយកពិន្ទុសិស្សគ្រប់ថ្នាក់
            </p>
          </div>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">លេខកូដនាយក / លេខា</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  autoFocus
                  value={passcode}
                  onChange={(e) => { setPasscode(e.target.value); setAuthError(null); }}
                  placeholder="បញ្ចូលលេខកូដ..."
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              {authError && <p className="text-xs text-rose-600 font-semibold mt-2">{authError}</p>}
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-500/20 cursor-pointer"
            >
              ចូលគ្រប់គ្រង
            </button>
          </form>
        </div>
      </div>
    );
  }

  const allGrades = ['ទាំងអស់', ...Array.from(new Set([...tests.map(t => t.grade), ...submissions.map(s => s.grade)]))];
  const allSubjectNames = ['ទាំងអស់', ...Array.from(new Set([...subjects.map(s => s.name), ...tests.map(t => t.subject)]))];

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header & Sub-tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">ការិយាល័យនាយក / លេខា — {school.name}</h2>
              <p className="text-xs text-slate-500">គ្រប់គ្រងវិញ្ញាសាគ្រប់មុខវិជ្ជា និងទាញយកពិន្ទុសិស្សគ្រប់ថ្នាក់</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('tests')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeTab === 'tests' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>វិញ្ញាសា ({tests.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('scores')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeTab === 'scores' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>ពិន្ទុសិស្ស ({submissions.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeTab === 'subjects' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>មុខវិជ្ជា ({subjects.length})</span>
            </button>
            <button
              onClick={loadAllData}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl cursor-pointer"
              title="ផ្ទុកទិន្នន័យឡើងវិញ"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* TAB 1: MANAGE TESTS */}
        {activeTab === 'tests' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <select
                value={testGradeFilter}
                onChange={(e) => setTestGradeFilter(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
              >
                {allGrades.map(g => <option key={g} value={g}>ថ្នាក់៖ {g}</option>)}
              </select>
              <select
                value={testSubjectFilter}
                onChange={(e) => setTestSubjectFilter(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
              >
                {allSubjectNames.map(s => <option key={s} value={s}>មុខវិជ្ជា៖ {s}</option>)}
              </select>
            </div>

            {filteredTests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
                មិនទាន់មានវិញ្ញាសាត្រូវបានរក្សាទុកដោយគ្រូទេ។
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                        <th className="p-4">វិញ្ញាសា</th>
                        <th className="p-4">ថ្នាក់ / មុខវិជ្ជា</th>
                        <th className="p-4">គ្រូបង្រៀន</th>
                        <th className="p-4 text-center">បើកឱ្យសិស្សប្រឡង</th>
                        <th className="p-4 text-center">ឃើញពិន្ទុភ្លាមៗ</th>
                        <th className="p-4 text-right">សកម្មភាព</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredTests.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50/60">
                          <td className="p-4">
                            <p className="font-bold text-slate-900">{t.title}</p>
                            <p className="text-xs text-slate-400">{t.questions.length} សំណួរ • {t.duration} នាទី</p>
                          </td>
                          <td className="p-4">
                            <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-bold mr-1.5">{t.grade}</span>
                            <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-bold">{t.subject}</span>
                          </td>
                          <td className="p-4 text-xs text-slate-600 font-medium">{t.teacher_name || 'គ្រូបង្រៀន'}</td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleTogglePublished(t)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                                t.is_published
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              {t.is_published ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              <span>{t.is_published ? 'កំពុងបើក' : 'បិទ'}</span>
                            </button>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleToggleShowScore(t)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                                t.show_score_immediately
                                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              }`}
                            >
                              {t.show_score_immediately ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                              <span>{t.show_score_immediately ? 'បង្ហាញភ្លាមៗ' : 'លាក់ពិន្ទុ'}</span>
                            </button>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleDeleteTest(t.id, t.title)}
                              className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl cursor-pointer"
                              title="លុបវិញ្ញាសា"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STUDENT SCORES & EXPORT */}
        {activeTab === 'scores' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={scoreSearch}
                    onChange={(e) => setScoreSearch(e.target.value)}
                    placeholder="ស្វែងរកឈ្មោះ ឬអត្តលេខសិស្ស..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <select
                  value={scoreGradeFilter}
                  onChange={(e) => setScoreGradeFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50"
                >
                  {allGrades.map(g => <option key={g} value={g}>ថ្នាក់៖ {g}</option>)}
                </select>
                <select
                  value={scoreSubjectFilter}
                  onChange={(e) => setScoreSubjectFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50"
                >
                  {allSubjectNames.map(s => <option key={s} value={s}>មុខវិជ្ជា៖ {s}</option>)}
                </select>
              </div>

              <button
                onClick={handleExportScoresCSV}
                disabled={filteredScores.length === 0}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>ទាញយកពិន្ទុទាំងអស់ (Excel / CSV)</span>
              </button>
            </div>

            {filteredScores.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
                មិនទាន់មានទិន្នន័យសិស្សប្រឡងនៅឡើយទេ។
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                        <th className="p-4">អត្តលេខ</th>
                        <th className="p-4">ឈ្មោះសិស្ស</th>
                        <th className="p-4">ថ្នាក់</th>
                        <th className="p-4">មុខវិជ្ជា / វិញ្ញាសា</th>
                        <th className="p-4 text-center">ចម្លើយត្រូវ</th>
                        <th className="p-4 text-center">ពិន្ទុ (លើ ១០)</th>
                        <th className="p-4 text-right">ពេលវេលាបញ្ជូន</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredScores.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50/60">
                          <td className="p-4 font-mono font-bold text-xs text-slate-700">{s.student_id}</td>
                          <td className="p-4 font-bold text-slate-900">{s.student_name}</td>
                          <td className="p-4 text-xs font-semibold text-blue-700">{s.grade}</td>
                          <td className="p-4">
                            <p className="text-xs font-bold text-indigo-700">{s.subject}</p>
                            <p className="text-[11px] text-slate-500">{s.test_title}</p>
                          </td>
                          <td className="p-4 text-center text-xs font-semibold text-slate-600">
                            {s.correct_count} / {s.total_questions}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold ${
                              s.score >= 5 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {s.score} / {s.total_points}
                            </span>
                          </td>
                          <td className="p-4 text-right text-xs text-slate-400">
                            {s.submitted_at ? new Date(s.submitted_at).toLocaleString('km-KH') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MANAGE SUBJECTS */}
        {activeTab === 'subjects' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 max-w-2xl">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">គ្រប់គ្រងមុខវិជ្ជាប្រឡង</h3>
              <p className="text-xs text-slate-500 mt-1">មុខវិជ្ជាទាំងនេះនឹងបង្ហាញសម្រាប់គ្រូបង្រៀនបង្កើតវិញ្ញាសា និងសិស្សជ្រើសរើសប្រឡង</p>
            </div>

            <form onSubmit={handleAddSubject} className="flex gap-2">
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="បញ្ចូលឈ្មោះមុខវិជ្ជាថ្មី (ឧ. ព័ត៌មានវិទ្យា, សេដ្ឋកិច្ច)..."
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>បន្ថែមមុខវិជ្ជា</span>
              </button>
            </form>
            {subjectError && (
              <div className="flex items-center gap-2 text-xs text-rose-600 font-semibold">
                <AlertCircle className="w-4 h-4" /> {subjectError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {subjects.map(subj => (
                <div key={subj.id} className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-sm font-bold text-slate-800">{subj.name}</span>
                  <button
                    onClick={() => handleDeleteSubject(subj.id, subj.name)}
                    className="p-1.5 hover:bg-rose-100 text-rose-500 rounded-lg cursor-pointer"
                    title="លុបមុខវិជ្ជា"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
