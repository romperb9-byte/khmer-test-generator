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
  AlertCircle,
  Camera,
  KeyRound,
  FolderOpen,
  Users,
  Upload,
  FileSpreadsheet,
  Edit3,
  X
} from 'lucide-react';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { School, SavedTest, StudentSubmission, SubjectItem, GeneratedTest, StudentRecord } from '../types';
import {
  fetchTests,
  updateTestSettings,
  deleteTest,
  fetchSubmissions,
  deleteSubmission,
  fetchSubjects,
  addSubject,
  deleteSubject,
  updateSchool,
  fetchStudents,
  upsertStudents,
  updateStudent,
  deleteStudent
} from '../services/dbService';
import { OmrScanner } from './OmrScanner';

interface PrincipalPortalProps {
  school: School;
  currentTest?: GeneratedTest | null;
  onSubjectsChanged?: () => void;
  onSchoolUpdated?: (updated: School) => void;
  onLoadTestToGenerator?: (test: SavedTest) => void;
}

export const PrincipalPortal: React.FC<PrincipalPortalProps> = ({
  school,
  currentTest = null,
  onSubjectsChanged,
  onSchoolUpdated,
  onLoadTestToGenerator
}) => {
  const [unlocked, setUnlocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'tests' | 'omr' | 'scores' | 'students' | 'subjects' | 'codes'>('tests');
  const [tests, setTests] = useState<SavedTest[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Student roster filter & upload state
  const [studentGradeFilter, setStudentGradeFilter] = useState('ទាំងអស់');
  const [studentSearch, setStudentSearch] = useState('');
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [excelMessage, setExcelMessage] = useState<string | null>(null);
  const [excelError, setExcelError] = useState<string | null>(null);
  const excelInputRef = React.useRef<HTMLInputElement>(null);

  // View Student Answers Modal & Edit Student Modal
  const [viewingSubmission, setViewingSubmission] = useState<StudentSubmission | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [editStudentId, setEditStudentId] = useState('');
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentGender, setEditStudentGender] = useState('');
  const [editStudentGrade, setEditStudentGrade] = useState('');
  const [editStudentSchool, setEditStudentSchool] = useState('');
  const [limitTestId, setLimitTestId] = useState('');

  // Access Codes state
  const [teacherCode, setTeacherCode] = useState(school.teacher_code || '1111');
  const [studentCode, setStudentCode] = useState(school.student_code || '2222');
  const [codesSavedMsg, setCodesSavedMsg] = useState<string | null>(null);
  const [codesError, setCodesError] = useState<string | null>(null);

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
      const [tData, sData, subData, stData] = await Promise.all([
        fetchTests(school.id),
        fetchSubmissions(school.id),
        fetchSubjects(school.id),
        fetchStudents(school.id).catch(() => [] as StudentRecord[])
      ]);
      setTests(tData);
      setSubmissions(sData);
      setSubjects(subData);
      setStudents(stData);
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

  const handleSaveCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodesError(null);
    setCodesSavedMsg(null);
    if (!teacherCode.trim() || !studentCode.trim()) {
      setCodesError('សូមបញ្ចូលលេខកូដគ្រូ និងលេខកូដសិស្ស!');
      return;
    }
    try {
      const updated = await updateSchool(school.id, {
        teacher_code: teacherCode.trim(),
        student_code: studentCode.trim(),
      });
      onSchoolUpdated?.(updated);
      setCodesSavedMsg('បានរក្សាទុកលេខកូដថ្មីដោយជោគជ័យ!');
      setTimeout(() => setCodesSavedMsg(null), 3000);
    } catch (err) {
      setCodesError(err instanceof Error ? err.message : 'មិនអាចរក្សាទុកលេខកូដបានទេ (សូមពិនិត្យថាបានបន្ថែម column teacher_code/student_code ក្នុង Supabase)');
    }
  };

  const handleDownloadStudentTemplate = () => {
    const sampleRows = [
      {
        'អត្តលេខ': '001',
        'ឈ្មោះ': 'សុខ វិបុល',
        'ភេទ': 'ប្រុស',
        'ថ្នាក់': 'ថ្នាក់ទី ១២',
        'សាលា': school.name,
      },
      {
        'អត្តលេខ': '002',
        'ឈ្មោះ': 'ចន្ទ្រា សុភា',
        'ភេទ': 'ស្រី',
        'ថ្នាក់': 'ថ្នាក់ទី ១២',
        'សាលា': school.name,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 16 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'បញ្ជីឈ្មោះសិស្ស');
    XLSX.writeFile(wb, `គំរូបញ្ជីឈ្មោះសិស្ស_${school.name}.xlsx`);
  };

  const handleUploadStudentExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingExcel(true);
    setExcelError(null);
    setExcelMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '' });

      const parsed = rawRows
        .map(row => {
          const sid = String(row['អត្តលេខ'] || row['អត្ថលេខ'] || row['student_id'] || row['ID'] || '').trim();
          const sname = String(row['ឈ្មោះ'] || row['ឈ្មោះសិស្ស'] || row['student_name'] || row['Name'] || '').trim();
          const gender = String(row['ភេទ'] || row['gender'] || row['Gender'] || '').trim();
          const gradeVal = String(row['ថ្នាក់'] || row['grade'] || row['Grade'] || '').trim();
          const schoolVal = String(row['សាលា'] || row['school_name'] || row['School'] || school.name).trim();
          return {
            student_id: sid,
            student_name: sname,
            gender,
            grade: gradeVal,
            school_name: schoolVal || school.name,
          };
        })
        .filter(r => r.student_id && r.student_name);

      if (parsed.length === 0) {
        throw new Error('រកមិនឃើញទិន្នន័យសិស្សក្នុងឯកសារ Excel ទេ! សូមប្រើលំនាំគំរូដែលមាន column: អត្តលេខ, ឈ្មោះ, ភេទ, ថ្នាក់, សាលា');
      }

      await upsertStudents(school.id, parsed);
      const updatedList = await fetchStudents(school.id);
      setStudents(updatedList);
      setExcelMessage(`បាននាំចូលបញ្ជីឈ្មោះសិស្សចំនួន ${parsed.length} នាក់ដោយជោគជ័យ!`);
    } catch (err) {
      setExcelError(err instanceof Error ? err.message : 'មានបញ្ហាក្នុងការអានឯកសារ Excel');
    } finally {
      setUploadingExcel(false);
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!window.confirm(`លុបឈ្មោះសិស្ស "${name}"?`)) return;
    await deleteStudent(id);
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  const openEditStudent = (st: StudentRecord) => {
    setEditingStudent(st);
    setEditStudentId(st.student_id);
    setEditStudentName(st.student_name);
    setEditStudentGender(st.gender || '');
    setEditStudentGrade(st.grade || '');
    setEditStudentSchool(st.school_name || school.name);
  };

  const handleSaveEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editStudentId.trim() || !editStudentName.trim()) return;
    const updated = await updateStudent(editingStudent.id, {
      student_id: editStudentId.trim(),
      student_name: editStudentName.trim(),
      gender: editStudentGender.trim(),
      grade: editStudentGrade.trim(),
      school_name: editStudentSchool.trim() || school.name,
    });
    setStudents(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    setEditingStudent(null);
  };

  const handleDeleteSubmission = async (id: string, studentName: string) => {
    if (!window.confirm(`តើអ្នកចង់លុបលទ្ធផលប្រឡងរបស់ "${studentName}" មែនទេ?`)) return;
    await deleteSubmission(id);
    setSubmissions(prev => prev.filter(s => s.id !== id));
  };

  const handleChangeMaxAttempts = async (testId: string, maxAttempts: number) => {
    const updated = await updateTestSettings(testId, { max_attempts: maxAttempts });
    setTests(prev => prev.map(t => (t.id === testId ? updated : t)));
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
      'ប្រចាំខែ',
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
      escapeCsv(s.exam_month || '-'),
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
                  type={showPasscode ? 'text' : 'password'}
                  autoFocus
                  value={passcode}
                  onChange={(e) => { setPasscode(e.target.value); setAuthError(null); }}
                  placeholder="បញ្ចូលលេខកូដ..."
                  className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeTab === 'tests' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span>ឃ្លាំងវិញ្ញាសា ({tests.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('omr')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeTab === 'omr' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>ស្កែន OMR</span>
            </button>
            <button
              onClick={() => setActiveTab('scores')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeTab === 'scores' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>ពិន្ទុសិស្ស ({submissions.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeTab === 'students' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>បញ្ជីឈ្មោះសិស្ស ({students.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeTab === 'subjects' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>មុខវិជ្ជា ({subjects.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('codes')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeTab === 'codes' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>កំណត់លេខកូដ</span>
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
                        <th className="p-4 text-center">ចំនួនដងប្រឡង</th>
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
                            <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-bold mr-1.5">{t.subject}</span>
                            {t.exam_month && (
                              <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-bold">{t.exam_month}</span>
                            )}
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
                          <td className="p-4 text-center">
                            <select
                              value={t.max_attempts ?? 0}
                              onChange={(e) => handleChangeMaxAttempts(t.id, Number(e.target.value))}
                              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                            >
                              <option value={0}>មិនកំណត់</option>
                              <option value={1}>១ ដង</option>
                              <option value={2}>២ ដង</option>
                              <option value={3}>៣ ដង</option>
                              <option value={5}>៥ ដង</option>
                            </select>
                          </td>
                          <td className="p-4 text-right space-x-1">
                            {onLoadTestToGenerator && (
                              <button
                                onClick={() => onLoadTestToGenerator(t)}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold cursor-pointer"
                                title="បើកមើល / Export Word, CSV, OMR"
                              >
                                បើកមើល
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteTest(t.id, t.title)}
                              className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl cursor-pointer inline-flex align-middle"
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

        {/* TAB OMR SCANNER */}
        {activeTab === 'omr' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <OmrScanner currentTest={currentTest} onBack={() => setActiveTab('tests')} />
          </div>
        )}

        {/* TAB ACCESS CODES */}
        {activeTab === 'codes' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 max-w-xl">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <span>កំណត់លេខកូដចូលសម្រាប់គ្រូ និងសិស្ស</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                នាយកសាលាជាអ្នកកំណត់លេខកូដទាំង ២ នេះ ដើម្បីឱ្យគ្រូចូលបង្កើតតេស្ដ និងសិស្សចូលធ្វើតេស្ដ។
              </p>
            </div>

            <form onSubmit={handleSaveCodes} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  លេខកូដចូល "បង្កើតតេស្ដ" (សម្រាប់គ្រូបង្រៀន)
                </label>
                <input
                  type="text"
                  value={teacherCode}
                  onChange={(e) => setTeacherCode(e.target.value)}
                  placeholder="ឧ. 1111"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  លេខកូដចូល "តេស្ដសិស្ស" (សម្រាប់សិស្ស)
                </label>
                <input
                  type="text"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder="ឧ. 2222"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {codesError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold">
                  {codesError}
                </div>
              )}
              {codesSavedMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold">
                  {codesSavedMsg}
                </div>
              )}

              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
              >
                រក្សាទុកលេខកូដ
              </button>
            </form>
          </div>
        )}

        {/* TAB STUDENTS ROSTER */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span>បញ្ជីឈ្មោះសិស្ស ({students.length} នាក់)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ទាញយកលំនាំគំរូ Excel (អត្តលេខ, ឈ្មោះ, ភេទ, ថ្នាក់, សាលា) រួច Upload ចូលប្រព័ន្ធ
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadStudentTemplate}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>ទាញយកលំនាំគំរូ Excel</span>
                </button>

                <button
                  type="button"
                  disabled={uploadingExcel}
                  onClick={() => excelInputRef.current?.click()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{uploadingExcel ? 'កំពុង Upload...' : 'Upload Excel'}</span>
                </button>
                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  hidden
                  onChange={handleUploadStudentExcel}
                />
              </div>
            </div>

            {excelMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{excelMessage}</span>
              </div>
            )}
            {excelError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{excelError}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="ស្វែងរកតាមអត្តលេខ ឬឈ្មោះសិស្ស..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
              <select
                value={studentGradeFilter}
                onChange={(e) => setStudentGradeFilter(e.target.value)}
                className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
              >
                {['ទាំងអស់', ...Array.from(new Set(students.map(s => s.grade).filter(Boolean)))].map(g => (
                  <option key={g} value={g}>ថ្នាក់៖ {g}</option>
                ))}
              </select>
            </div>

            {(() => {
              const filteredRoster = students.filter(st => {
                const gOk = studentGradeFilter === 'ទាំងអស់' || st.grade === studentGradeFilter;
                const q = studentSearch.toLowerCase();
                const qOk =
                  !q ||
                  st.student_id.toLowerCase().includes(q) ||
                  st.student_name.toLowerCase().includes(q);
                return gOk && qOk;
              });

              if (filteredRoster.length === 0) {
                return (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
                    មិនទាន់មានបញ្ជីឈ្មោះសិស្សទេ។ សូមចុច "ទាញយកលំនាំគំរូ Excel" រួចបំពេញទិន្នន័យ ហើយ "Upload Excel"។
                  </div>
                );
              }

              return (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                          <th className="p-4">អត្តលេខ</th>
                          <th className="p-4">ឈ្មោះ</th>
                          <th className="p-4">ភេទ</th>
                          <th className="p-4">ថ្នាក់</th>
                          <th className="p-4">សាលា</th>
                          <th className="p-4 text-right">កែប្រែ / លុប</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredRoster.map(st => (
                          <tr key={st.id} className="hover:bg-slate-50/60">
                            <td className="p-4 font-mono font-bold text-xs text-slate-700">{st.student_id}</td>
                            <td className="p-4 font-bold text-slate-900">{st.student_name}</td>
                            <td className="p-4 text-xs text-slate-600">{st.gender || '-'}</td>
                            <td className="p-4 text-xs font-semibold text-blue-700">{st.grade}</td>
                            <td className="p-4 text-xs text-slate-500">{st.school_name || school.name}</td>
                            <td className="p-4 text-right space-x-1">
                              <button
                                onClick={() => openEditStudent(st)}
                                className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl cursor-pointer inline-flex align-middle"
                                title="កែប្រែព័ត៌មានសិស្ស"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(st.id, st.student_name)}
                                className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl cursor-pointer inline-flex align-middle"
                                title="លុប"
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
              );
            })()}
          </div>
        )}

        {/* TAB 2: STUDENT SCORES & EXPORT */}
        {activeTab === 'scores' && (
          <div className="space-y-4">
            {/* Max Attempts Setting Bar */}
            {tests.length > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-bold text-slate-700">
                  កំណត់ចំនួនដងនៃការធ្វើតេស្ដសម្រាប់សិស្ស៖
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={limitTestId || tests[0]?.id || ''}
                    onChange={(e) => setLimitTestId(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-slate-50 max-w-xs"
                  >
                    {tests.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.grade} - {t.subject})
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const targetTest = tests.find(t => t.id === (limitTestId || tests[0]?.id));
                    if (!targetTest) return null;
                    return (
                      <select
                        value={targetTest.max_attempts ?? 0}
                        onChange={(e) => handleChangeMaxAttempts(targetTest.id, Number(e.target.value))}
                        className="px-3 py-2 border border-indigo-200 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700"
                      >
                        <option value={0}>មិនកំណត់ចំនួនដង</option>
                        <option value={1}>អនុញ្ញាត ១ ដង</option>
                        <option value={2}>អនុញ្ញាត ២ ដង</option>
                        <option value={3}>អនុញ្ញាត ៣ ដង</option>
                        <option value={5}>អនុញ្ញាត ៥ ដង</option>
                      </select>
                    );
                  })()}
                </div>
              </div>
            )}

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
                        <th className="p-4 text-right">មើលចម្លើយ / លុប</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredScores.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50/60">
                          <td className="p-4 font-mono font-bold text-xs text-slate-700">{s.student_id}</td>
                          <td className="p-4 font-bold text-slate-900">{s.student_name}</td>
                          <td className="p-4 text-xs font-semibold text-blue-700">{s.grade}</td>
                          <td className="p-4">
                            <p className="text-xs font-bold text-indigo-700">
                              {s.subject} {s.exam_month ? `• ${s.exam_month}` : ''}
                            </p>
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
                          <td className="p-4 text-right space-x-1 whitespace-nowrap">
                            <button
                              onClick={() => setViewingSubmission(s)}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                              title="មើលចម្លើយសិស្ស"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>មើលចម្លើយ</span>
                            </button>
                            <button
                              onClick={() => handleDeleteSubmission(s.id, s.student_name)}
                              className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl cursor-pointer inline-flex align-middle"
                              title="លុបលទ្ធផលសិស្ស"
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

      {/* Modal: View Student Answers */}
      {viewingSubmission && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  ចម្លើយរបស់សិស្ស៖ {viewingSubmission.student_name} ({viewingSubmission.student_id})
                </h3>
                <p className="text-xs text-slate-500">
                  {viewingSubmission.grade} • {viewingSubmission.subject} • {viewingSubmission.test_title} • ពិន្ទុ៖{' '}
                  <span className="font-bold text-indigo-700">{viewingSubmission.score} / {viewingSubmission.total_points}</span>
                </p>
              </div>
              <button
                onClick={() => setViewingSubmission(null)}
                className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {(() => {
                const matchedTest = tests.find(t => t.id === viewingSubmission.test_id);
                if (!matchedTest) {
                  return (
                    <pre className="text-xs bg-slate-50 p-4 rounded-xl overflow-x-auto">
                      {JSON.stringify(viewingSubmission.answers, null, 2)}
                    </pre>
                  );
                }
                return matchedTest.questions.map((q, idx) => {
                  const rawAns = viewingSubmission.answers?.[q.id];
                  const formattedStudentAns =
                    typeof rawAns === 'object' && rawAns !== null
                      ? Object.entries(rawAns).map(([k, v]) => `${Number(k) + 1}-${v}`).join(', ')
                      : String(rawAns || 'មិនបានឆ្លើយ');
                  const formattedCorrect =
                    typeof q.answer === 'object' ? JSON.stringify(q.answer) : String(q.answer || '');
                  return (
                    <div key={q.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <p className="font-bold text-sm text-slate-900">
                        {idx + 1}. {q.question}
                      </p>
                      <div className="flex flex-wrap gap-4 text-xs">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 font-semibold">
                          ចម្លើយសិស្ស៖ {formattedStudentAns}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-semibold">
                          ចម្លើយត្រឹមត្រូវ៖ {formattedCorrect}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Student Info */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">កែប្រែព័ត៌មានសិស្ស</h3>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditStudent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">អត្តលេខ *</label>
                <input
                  type="text"
                  required
                  value={editStudentId}
                  onChange={(e) => setEditStudentId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ឈ្មោះសិស្ស *</label>
                <input
                  type="text"
                  required
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ភេទ</label>
                  <input
                    type="text"
                    value={editStudentGender}
                    onChange={(e) => setEditStudentGender(e.target.value)}
                    placeholder="ប្រុស / ស្រី"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ថ្នាក់</label>
                  <input
                    type="text"
                    value={editStudentGrade}
                    onChange={(e) => setEditStudentGrade(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">សាលា</label>
                <input
                  type="text"
                  value={editStudentSchool}
                  onChange={(e) => setEditStudentSchool(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  រក្សាទុក
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
