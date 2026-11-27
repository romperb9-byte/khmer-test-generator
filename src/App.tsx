import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { saveAs } from 'file-saver';
import { 
  FileText, 
  Settings, 
  Plus, 
  Trash2, 
  Loader2, 
  X, 
  AlertCircle,
  Download,
  Star,
  Sun,
  Cloud,
  Palette,
  CloudRain,
  Rocket,
  Zap,
  Globe,
  Atom,
  Cpu,
  Telescope,
  FileSpreadsheet,
  FileCode,
  Camera,
  ArrowRight,
  Sparkles,
  Home,
  FolderOpen,
  GraduationCap,
  UserCheck,
  Save,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
  Edit3
} from 'lucide-react';
import { Difficulty, QuestionType, TestGeneratorOptions, GeneratedTest, Question, School, SavedTest } from './types.ts';
import { generateTest, getStoredGeminiApiKey, setStoredGeminiApiKey } from './services/geminiService.ts';
import { exportToWord } from './services/wordExport.ts';
import { exportToCSV } from './services/csvExport.ts';
import { generateGoogleFormScript } from './services/googleFormExport.ts';
import { fetchSubjects, addSubject, saveTest, DEFAULT_SUBJECTS } from './services/dbService.ts';
import { GoogleFormModal } from './components/GoogleFormModal.tsx';
import { OmrScanner } from './components/OmrScanner.tsx';
import { StudentOmrSheet } from './components/StudentOmrSheet.tsx';
import { HomePage } from './components/HomePage.tsx';
import { SchoolHub } from './components/SchoolHub.tsx';
import { PrincipalPortal } from './components/PrincipalPortal.tsx';
import { StudentTestPortal } from './components/StudentTestPortal.tsx';
import { preprocessMathForDisplay } from './utils/mathUtils.ts';

const GRADES = Array.from({ length: 12 }, (_, i) => `ថ្នាក់ទី ${i + 1}`);
const EXAM_MONTHS = ['ធ្នូ', 'មករា', 'កុម្ភៈ', 'មីនា', 'ឆមាស១', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'ឆមាស២'];

export default function App() {
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [subjects, setSubjects] = useState<string[]>(DEFAULT_SUBJECTS);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectInput, setNewSubjectInput] = useState('');

  const [grade, setGrade] = useState(GRADES[11]);
  const [examMonth, setExamMonth] = useState(EXAM_MONTHS[0]);
  const [subject, setSubject] = useState(DEFAULT_SUBJECTS[1]);
  const [apiKey, setApiKey] = useState(() => getStoredGeminiApiKey());
  const [showSidebarApiKey, setShowSidebarApiKey] = useState(false);
  const [teacherName, setTeacherName] = useState('គ្រូបង្រៀន');
  const [isSavingTest, setIsSavingTest] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isEditingTest, setIsEditingTest] = useState(false);

  const [material, setMaterial] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [questionCounts, setQuestionCounts] = useState<{ [key in QuestionType]?: number }>({
    [QuestionType.TRUE_FALSE]: 2,
    [QuestionType.MATCHING]: 2,
    [QuestionType.MULTIPLE_CHOICE]: 2,
    [QuestionType.FILL_BLANKS]: 2,
    [QuestionType.SHORT_ANSWER]: 2,
    [QuestionType.LONG_ANSWER]: 2,
  });
  const [optionCounts, setOptionCounts] = useState<{ [key in QuestionType]?: number }>({
    [QuestionType.TRUE_FALSE]: 2,
    [QuestionType.MATCHING]: 5,
    [QuestionType.MULTIPLE_CHOICE]: 4,
    [QuestionType.FILL_BLANKS]: 4,
  });
  const [allowImageUpload, setAllowImageUpload] = useState<{ [key in QuestionType]?: boolean }>({
    [QuestionType.SHORT_ANSWER]: false,
    [QuestionType.LONG_ANSWER]: false,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGoogleFormModal, setShowGoogleFormModal] = useState(false);
  const [googleFormExport, setGoogleFormExport] = useState<{ gsCode: string; htmlCode: string; googleFormCode: string } | null>(null);
  const [test, setTest] = useState<GeneratedTest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<'hub' | 'generator' | 'student' | 'principal'>('hub');
  const [isStudentExamFullscreen, setIsStudentExamFullscreen] = useState(false);
  const [studentOmrData, setStudentOmrData] = useState<{
    questionCount: number;
    answerType: 'ABCD' | 'KHKK';
    testTitle: string;
    rawHash: string;
  } | null>(null);

  useEffect(() => {
    const parseHash = () => {
      try {
        const hash = window.location.hash;
        if (hash.startsWith('#share-omr=')) {
          const base64Data = hash.substring('#share-omr='.length);
          const binaryStr = atob(base64Data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const decodedString = new TextDecoder().decode(bytes);
          const parsed = JSON.parse(decodedString);
          if (parsed && typeof parsed.questionCount === 'number') {
            setStudentOmrData({
              questionCount: parsed.questionCount,
              answerType: parsed.answerType || 'ABCD',
              testTitle: parsed.testTitle || 'វិញ្ញាសា OMR',
              rawHash: hash
            });
          }
        } else {
          setStudentOmrData(null);
        }
      } catch (e) {
        console.error('Error parsing student OMR hash:', e);
      }
    };

    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, []);
  const testRef = useRef<HTMLDivElement>(null);

  const loadSchoolSubjects = async (schoolId: string) => {
    try {
      const list = await fetchSubjects(schoolId);
      if (list.length > 0) {
        const names = list.map(s => s.name);
        setSubjects(names);
        if (!names.includes(subject)) {
          setSubject(names[0]);
        }
      } else {
        setSubjects(DEFAULT_SUBJECTS);
      }
    } catch {
      setSubjects(DEFAULT_SUBJECTS);
    }
  };

  useEffect(() => {
    if (currentSchool) {
      loadSchoolSubjects(currentSchool.id);
      setApiKey(getStoredGeminiApiKey());
    }
  }, [currentSchool?.id]);

  const handleAddCustomSubject = async () => {
    if (!currentSchool || !newSubjectInput.trim()) return;
    try {
      const created = await addSubject(currentSchool.id, newSubjectInput.trim());
      setSubjects(prev => [...prev, created.name]);
      setSubject(created.name);
      setNewSubjectInput('');
      setShowAddSubject(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'មិនអាចបន្ថែមមុខវិជ្ជាបានទេ');
    }
  };

  const handleSaveTestToApp = async () => {
    if (!test || !currentSchool) return;
    setIsSavingTest(true);
    setError(null);
    setSaveSuccessMsg(null);
    try {
      await saveTest({
        school_id: currentSchool.id,
        title: test.title,
        grade: test.grade,
        subject: test.subject,
        exam_month: examMonth,
        teacher_name: teacherName.trim() || 'គ្រូបង្រៀន',
        duration: test.duration || getDuration(),
        questions: test.questions,
        is_published: false,
        show_score_immediately: true,
      });
      setSaveSuccessMsg('បានរក្សាទុកវិញ្ញាសាក្នុងកម្មវិធីដោយជោគជ័យ! នាយក/លេខាអាចបើកឱ្យសិស្សប្រឡងបាន។');
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'មានបញ្ហាក្នុងការរក្សាទុកវិញ្ញាសា');
    } finally {
      setIsSavingTest(false);
    }
  };

  const handleLoadSavedTest = (saved: SavedTest) => {
    setGrade(saved.grade);
    setSubject(saved.subject);
    if (saved.exam_month) setExamMonth(saved.exam_month);
    setTest({
      title: saved.title,
      grade: saved.grade,
      subject: saved.subject,
      exam_month: saved.exam_month,
      questions: saved.questions,
      duration: saved.duration,
    });
    setActiveMode('generator');
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file as Blob);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleQuestionType = (type: QuestionType) => {
    setQuestionCounts(prev => {
      const newCounts = { ...prev };
      if (newCounts[type]) {
        delete newCounts[type];
      } else {
        newCounts[type] = 2;
      }
      return newCounts;
    });
  };

  const updateCount = (type: QuestionType, count: number) => {
    setQuestionCounts(prev => ({ ...prev, [type]: count }));
  };

  const handleGenerate = async () => {
    if (!material && images.length === 0) {
      setError('សូមបញ្ចូលអត្ថបទ ឬរូបភាពមេរៀនជាមុនសិន!');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    try {
      const options: TestGeneratorOptions = {
        grade,
        subject,
        material,
        images,
        questionCounts,
        optionCounts,
        allowImageUpload,
        difficultyDistribution: {
          [Difficulty.EASY]: 20,
          [Difficulty.MEDIUM]: 60,
          [Difficulty.HARD]: 20,
        },
        apiKey
      };
      const result = await generateTest(options);
      
      // Sort questions based on the requested order
      const typeOrder = [
        QuestionType.TRUE_FALSE,
        QuestionType.MATCHING,
        QuestionType.MULTIPLE_CHOICE,
        QuestionType.FILL_BLANKS,
        QuestionType.SHORT_ANSWER,
        QuestionType.LONG_ANSWER
      ];

      const sortedQuestions = [...result.questions].sort((a, b) => {
        const indexA = typeOrder.indexOf(a.type);
        const indexB = typeOrder.indexOf(b.type);
        return indexA - indexB;
      });

      setTest({ ...result, questions: sortedQuestions });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'មានបញ្ហាបច្ចេកទេស។ សូមព្យាយាមម្ដងទៀត!');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateGoogleForm = () => {
    if (!test) return;
    const exportData = generateGoogleFormScript(test);
    setGoogleFormExport(exportData);
    setShowGoogleFormModal(true);
  };

  const handleExportCSV = () => {
    if (!test) return;
    exportToCSV(test);
  };

  const getDuration = () => {
    const gradeNum = parseInt(grade.replace('ថ្នាក់ទី ', '')) || 0;
    return gradeNum <= 6 ? 40 : 60;
  };

  const isYoungGrade = () => {
    const gradeNum = parseInt(grade.replace('ថ្នាក់ទី ', '')) || 0;
    return gradeNum >= 1 && gradeNum <= 3;
  };

  const isIntermediateGrade = () => {
    const gradeNum = parseInt(grade.replace('ថ្នាក់ទី ', '')) || 0;
    return gradeNum >= 4 && gradeNum <= 6;
  };

  const handleExportWord = async () => {
    if (!test) return;
    try {
      await exportToWord({ ...test, duration: getDuration() });
    } catch (err) {
      setError('មានការលំបាកក្នុងការនាំចេញជា Word។ សូមព្យាយាមម្ដងទៀត!');
    }
  };

  if (studentOmrData) {
    return (
      <StudentOmrSheet
        questionCount={studentOmrData.questionCount}
        answerType={studentOmrData.answerType}
        testTitle={studentOmrData.testTitle}
        onBackToTeacher={() => {
          const base64Data = studentOmrData.rawHash.substring('#share-omr='.length);
          window.location.hash = `#teacher-import=${base64Data}`;
          setActiveMode('principal');
          setStudentOmrData(null);
        }}
      />
    );
  }

  if (!currentSchool) {
    return (
      <HomePage
        onEnterSchool={(school) => {
          setCurrentSchool(school);
          setActiveMode('hub');
          setTest(null);
        }}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans text-slate-900 selection:bg-blue-100">
      {/* Header - hidden when student is actively taking/viewing exam */}
      {!isStudentExamFullscreen && (
        <header className="fixed top-0 left-0 right-0 h-14 md:h-20 bg-[#1e293b] text-white flex items-center justify-between px-3 md:px-6 shadow-xl z-[100] print:hidden gap-2 md:gap-3">
          <div className="flex items-center gap-2.5 md:gap-3 shrink-0">
            <button
              onClick={() => { setCurrentSchool(null); setTest(null); setIsStudentExamFullscreen(false); }}
              className="p-2 md:p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
              title="ត្រឡប់ទៅទំព័រដើម (សាលារៀន)"
            >
              <Home className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xs md:text-base font-bold tracking-tight leading-none truncate max-w-[150px] md:max-w-[260px]">
                {currentSchool.name}
              </h1>
              <span className="text-[10px] text-blue-300 font-medium mt-0.5 md:mt-1 hidden sm:block">
                {activeMode === 'hub' && 'ផ្ទាំងមុខងារសាលា'}
                {activeMode === 'generator' && 'ផ្នែកគ្រូបង្រៀន • បង្កើតតេស្ដ'}
                {activeMode === 'student' && 'ផ្នែកសិស្ស • តេស្ដសិស្ស'}
                {activeMode === 'principal' && 'ផ្នែកនាយកសាលា / លេខា'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeMode !== 'hub' && (
              <button
                onClick={() => { setActiveMode('hub'); setIsStudentExamFullscreen(false); }}
                className="px-3 py-1.5 md:px-3.5 md:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 text-blue-400" />
                <span>មុខងារសាលា</span>
              </button>
            )}

            {activeMode === 'generator' && (
              <div className="flex items-center gap-1.5 bg-slate-800/50 p-1 md:p-1.5 rounded-2xl border border-white/5 shrink-0">
                <button 
                  onClick={handleExportWord}
                  disabled={!test}
                  className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl hover:bg-blue-500/10 text-blue-400 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                  title="Export Word"
                >
                  <FileCode className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase hidden xl:block">Word</span>
                </button>

                <button 
                  onClick={handleExportCSV}
                  disabled={!test}
                  className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl hover:bg-blue-500/10 text-blue-400 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                  title="Export CSV"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase hidden xl:block">CSV</span>
                </button>

                <button 
                  onClick={handleCreateGoogleForm}
                  disabled={!test}
                  className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl hover:bg-blue-500/10 text-blue-400 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                  title="បង្កើតវិញ្ញាសាជា Web App"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase hidden xl:block">Web App</span>
                </button>

                <button 
                  onClick={() => { setTest(null); setMaterial(''); setImages([]); }}
                  disabled={!test && !material && images.length === 0}
                  className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl hover:bg-rose-600 bg-blue-500/20 text-blue-400 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                  title="Clear All"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </header>
      )}

      <main className={`flex-1 flex overflow-hidden print:block print:overflow-visible ${isStudentExamFullscreen ? 'mt-0' : 'mt-14 md:mt-20'}`}>
        {activeMode === 'hub' ? (
          <SchoolHub
            school={currentSchool}
            onEnterTeacher={() => setActiveMode('generator')}
            onEnterStudent={() => setActiveMode('student')}
            onEnterPrincipal={() => setActiveMode('principal')}
          />
        ) : activeMode === 'student' ? (
          <StudentTestPortal school={currentSchool} onExamModeChange={setIsStudentExamFullscreen} />
        ) : activeMode === 'principal' ? (
          <PrincipalPortal
            school={currentSchool}
            currentTest={test}
            onSubjectsChanged={() => loadSchoolSubjects(currentSchool.id)}
            onSchoolUpdated={(updated) => setCurrentSchool(updated)}
            onLoadTestToGenerator={handleLoadSavedTest}
          />
        ) : (
          <>
            {/* Sidebar Settings */}
            <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 print:hidden">
          <div className="flex-1 p-6 space-y-8 overflow-y-auto">
            
            <div className="space-y-4">
              {/* Free Gemini API Key Field */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-blue-600" />
                    <span>Gemini API Key (Free)</span>
                  </label>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-bold text-blue-600 hover:underline"
                  >
                    យក Key ↗
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showSidebarApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setStoredGeminiApiKey(e.target.value);
                    }}
                    placeholder="បញ្ចូល AIza... (Free)"
                    className="w-full pl-2.5 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSidebarApiKey(!showSidebarApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showSidebarApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">ឈ្មោះគ្រូបង្រៀន</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="ឈ្មោះគ្រូ..."
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">កម្រិតថ្នាក់ & មុខវិជ្ជា</label>
                  <button
                    type="button"
                    onClick={() => setShowAddSubject(!showAddSubject)}
                    className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> បន្ថែមមុខវិជ្ជា
                  </button>
                </div>
                {showAddSubject && (
                  <div className="flex gap-1.5 mb-2">
                    <input
                      type="text"
                      value={newSubjectInput}
                      onChange={(e) => setNewSubjectInput(e.target.value)}
                      placeholder="ឈ្មោះមុខវិជ្ជាថ្មី..."
                      className="flex-1 px-2.5 py-1.5 text-xs border border-blue-300 rounded-lg focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSubject}
                      className="px-2.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      បន្ថែម
                    </button>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 bg-slate-50 outline-none transition-all appearance-none cursor-pointer"
                    >
                      {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <select 
                      value={examMonth}
                      onChange={(e) => setExamMonth(e.target.value)}
                      title="ប្រចាំខែ / ឆមាស"
                      className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 bg-slate-50 outline-none transition-all appearance-none cursor-pointer"
                    >
                      {EXAM_MONTHS.map(m => <option key={m} value={m}>ប្រចាំខែ {m}</option>)}
                    </select>
                  </div>
                  <select 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 bg-slate-50 outline-none transition-all appearance-none cursor-pointer"
                  >
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {isYoungGrade() && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }}
                    className="mt-3 p-2 bg-pink-50 border border-pink-100 rounded-lg flex items-center gap-2 text-pink-600"
                  >
                    <Palette className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">របៀបកុមារ (Kid Mode) សកម្ម</span>
                  </motion.div>
                )}
                {isIntermediateGrade() && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }}
                    className="mt-3 p-2 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center gap-2 text-indigo-600"
                  >
                    <Telescope className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">របៀបរុករក (Discovery Mode) សកម្ម</span>
                  </motion.div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">កម្រិតលំបាក (២០/៦០/២០)</label>
                <div className="h-3 w-full flex rounded-full overflow-hidden border border-slate-100 shadow-inner bg-slate-100">
                  <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: '20%' }}></div>
                  <div className="h-full bg-amber-400 transition-all duration-700" style={{ width: '60%' }}></div>
                  <div className="h-full bg-rose-500 transition-all duration-700" style={{ width: '20%' }}></div>
                </div>
                <div className="flex justify-between mt-2 text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                  <span>ងាយ (២០%)</span>
                  <span>មធ្យម (៦០%)</span>
                  <span>លំបាក (២០%)</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">ប្រភេទសំណួរ</label>
                  <span className="text-[9px] font-bold text-slate-400">សំណួរ | ជម្រើស/JPG</span>
                </div>
                <div className="space-y-2">
                  {[
                    QuestionType.TRUE_FALSE,
                    QuestionType.MATCHING,
                    QuestionType.MULTIPLE_CHOICE,
                    QuestionType.FILL_BLANKS,
                    QuestionType.SHORT_ANSWER,
                    QuestionType.LONG_ANSWER
                  ].map(type => {
                    const isWritten = type === QuestionType.SHORT_ANSWER || type === QuestionType.LONG_ANSWER;
                    return (
                      <div key={type} className={`flex items-center justify-between gap-2 p-2 rounded-lg border transition-all ${questionCounts[type] ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100 bg-slate-50/50'}`}>
                        <label className="flex items-center gap-2.5 cursor-pointer group flex-1 min-w-0">
                          <input 
                            type="checkbox" 
                            checked={!!questionCounts[type]}
                            onChange={() => toggleQuestionType(type)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 shrink-0"
                          />
                          <span className={`text-xs font-medium truncate ${questionCounts[type] ? 'text-blue-900' : 'text-slate-600'}`}>{type}</span>
                        </label>
                        {questionCounts[type] !== undefined && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <input 
                              type="number"
                              value={questionCounts[type]}
                              onChange={(e) => updateCount(type, parseInt(e.target.value) || 0)}
                              title="ចំនួនសំណួរ"
                              className="w-10 text-center text-xs font-bold bg-white border border-blue-200 rounded py-0.5"
                              min="1"
                              max="20"
                            />
                            {isWritten ? (
                              <label
                                className="flex items-center gap-1 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600 cursor-pointer"
                                title="អនុញ្ញាតឱ្យសិស្ស Upload រូបភាព JPG"
                              >
                                <input
                                  type="checkbox"
                                  checked={!!allowImageUpload[type]}
                                  onChange={(e) =>
                                    setAllowImageUpload(prev => ({ ...prev, [type]: e.target.checked }))
                                  }
                                  className="w-3 h-3 text-emerald-600 rounded"
                                />
                                <span>JPG</span>
                              </label>
                            ) : (
                              <input
                                type="number"
                                value={optionCounts[type] ?? (type === QuestionType.MATCHING ? 5 : type === QuestionType.TRUE_FALSE ? 2 : 4)}
                                onChange={(e) =>
                                  setOptionCounts(prev => ({
                                    ...prev,
                                    [type]: Math.max(0, Math.min(8, parseInt(e.target.value) || 0))
                                  }))
                                }
                                title={type === QuestionType.MATCHING ? 'ចំនួនគូផ្គូរផ្គង' : 'ចំនួនចម្លើយជ្រើសរើស'}
                                className="w-10 text-center text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 rounded py-0.5"
                                min={type === QuestionType.FILL_BLANKS ? '0' : '2'}
                                max="8"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-slate-100 bg-slate-50/30 space-y-3">
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              <span>{isGenerating ? 'កំពុងបង្កើត...' : 'បង្កើតវិញ្ញាសាឥឡូវនេះ'}</span>
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <section className="flex-1 flex flex-col bg-slate-100/30 p-8 gap-6 overflow-hidden print:p-0 print:bg-white print:overflow-visible">
          
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3 text-rose-600 shrink-0">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-bold">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-rose-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          <div className="h-1/3 min-h-[200px] bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden shrink-0 print:hidden transition-all focus-within:shadow-md focus-within:ring-1 focus-within:ring-blue-500/20">
            <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">បញ្ចូលអត្ថបទមេរៀន ឬបិទភ្ជាប់រូបភាព</span>
              <div className="flex gap-2">
                <button onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:bg-blue-50 text-slate-400 rounded-md">
                   <Plus className="w-5 h-5" />
                </button>
                <button onClick={() => {setMaterial(''); setImages([]);}} className="p-1.5 hover:bg-rose-50 text-slate-400 rounded-md">
                   <Trash2 className="w-5 h-5" />
                </button>
                <input type="file" hidden ref={fileInputRef} multiple accept="image/*" onChange={handleImageUpload} />
              </div>
            </div>
            <div className="flex-1 relative flex flex-col">
              <textarea 
                className="flex-1 p-5 text-base leading-relaxed bg-transparent focus:outline-none resize-none placeholder-slate-200"
                placeholder="សរសេរអត្ថបទមេរៀននៅទីនេះ..."
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                onPaste={(e: React.ClipboardEvent) => {
                  const items = e.clipboardData?.items;
                  if (!items) return;
                  for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                      const file = items[i].getAsFile();
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setImages(prev => [...prev, reader.result as string]);
                        reader.readAsDataURL(file as Blob);
                      }
                    }
                  }
                }}
              />
              {images.length > 0 && (
                <div className="absolute bottom-3 left-3 right-3 flex gap-2 overflow-x-auto p-2 bg-white/80 backdrop-blur rounded-xl border border-slate-100">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group shrink-0">
                      <img src={img} className="h-14 w-14 object-cover rounded-md border border-slate-200" />
                      <button onClick={() => removeImage(idx)} className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none print:bg-white print:overflow-visible">
            <div className="h-full overflow-y-auto p-12 print:p-0 print:overflow-visible">
              <AnimatePresence mode="wait">
                {!test && !isGenerating ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-center">
                    <FileText className="w-12 h-12 text-slate-100 mb-4" />
                    <h3 className="text-xl font-bold text-slate-800 mb-2">មិនទាន់មានវិញ្ញាសា</h3>
                    <p className="text-slate-400 max-w-xs text-sm">បញ្ចូលខ្លឹមសារមេរៀនដើម្បីចាប់ផ្ដើមបង្កើតវិញ្ញាសា</p>
                  </motion.div>
                ) : isGenerating ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-center" id="generating-indicator">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 mb-2">កំពុងបង្កើត...</h3>
                    <p className="text-slate-400 text-sm">AI កំពុងរៀបចំសំណួរតាមកម្រិតលំបាក ២០/៦០/២០</p>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    ref={testRef} 
                    className={`space-y-8 max-w-4xl mx-auto bg-white p-4 relative overflow-hidden ${isYoungGrade() ? 'young-grade-decor' : ''}`}
                  >
                    
                    {/* Save to App + OMR Integration Banner */}
                    {test && (
                      <div className="space-y-3 print:hidden">
                        {saveSuccessMsg && (
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>{saveSuccessMsg}</span>
                          </div>
                        )}
                        <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-emerald-500/10 border border-blue-500/20 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                          <div className="flex items-start gap-3.5">
                            <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md shrink-0">
                              <Camera className="w-5 h-5 animate-pulse text-emerald-300" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                                រក្សាទុកវិញ្ញាសា ឬស្កែន OMR ដោយស្វ័យប្រវត្តិ
                              </h4>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                វិញ្ញាសានេះមាន <span className="font-bold text-blue-600">{test.questions.length} សំណួរ</span>។ 
                                លោកគ្រូ/អ្នកគ្រូ អាចរក្សាទុកក្នុងកម្មវិធីដើម្បីឱ្យសិស្សប្រឡងតាម Web App ឬបោះពុម្ព/ស្កែន OMR។
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 w-full md:w-auto shrink-0">
                            <button
                              onClick={() => setIsEditingTest(!isEditingTest)}
                              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer ${
                                isEditingTest
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                                  : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300'
                              }`}
                            >
                              <Edit3 className="w-4 h-4" />
                              <span>{isEditingTest ? 'រក្សាទុកការកែប្រែ' : 'កែប្រែវិញ្ញាសា'}</span>
                            </button>
                            <button
                              onClick={handleSaveTestToApp}
                              disabled={isSavingTest}
                              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
                            >
                              <Save className="w-4 h-4" />
                              <span>{isSavingTest ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកក្នុងកម្មវិធី'}</span>
                            </button>
                            <button
                              onClick={() => setActiveMode('principal')}
                              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
                            >
                              <span>នាយក / ស្កែន OMR</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {isEditingTest && test ? (
                      <div className="space-y-6 pb-20">
                        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-extrabold text-amber-900 text-base flex items-center gap-2">
                              <Edit3 className="w-5 h-5" /> កែប្រែព័ត៌មានទូទៅ និងសំណួរ
                            </h3>
                            <button
                              onClick={() => setIsEditingTest(false)}
                              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                            >
                              រក្សាទុកការកែប្រែ
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-bold text-slate-700 mb-1">ចំណងជើងវិញ្ញាសា</label>
                              <input
                                type="text"
                                value={test.title}
                                onChange={(e) => setTest({ ...test, title: e.target.value })}
                                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1">រយៈពេល (នាទី)</label>
                              <input
                                type="number"
                                min={5}
                                max={300}
                                value={test.duration ?? getDuration()}
                                onChange={(e) => setTest({ ...test, duration: Number(e.target.value) || 60 })}
                                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                              />
                            </div>
                          </div>
                        </div>

                        {test.questions.map((q, qIdx) => {
                          const updateQuestion = (patch: Partial<Question>) => {
                            const updated = test.questions.map((item, i) =>
                              i === qIdx ? { ...item, ...patch } : item
                            );
                            setTest({ ...test, questions: updated });
                          };

                          return (
                            <div key={q.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                              <div className="flex items-center justify-between gap-2">
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-extrabold">
                                  សំណួរទី {qIdx + 1} • {q.type}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const filtered = test.questions.filter((_, i) => i !== qIdx);
                                    setTest({ ...test, questions: filtered });
                                  }}
                                  className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer"
                                  title="លុបសំណួរនេះ"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">ប្រធានសំណួរ</label>
                                <textarea
                                  rows={2}
                                  value={q.question}
                                  onChange={(e) => updateQuestion({ question: e.target.value })}
                                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                                />
                              </div>

                              {q.options && q.options.length > 0 && (
                                <div className="space-y-2">
                                  <label className="block text-xs font-bold text-slate-600">ជម្រើសចម្លើយ</label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {q.options.map((opt, oIdx) => (
                                      <div key={oIdx} className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                                          {String.fromCharCode(65 + oIdx)}
                                        </span>
                                        <input
                                          type="text"
                                          value={opt}
                                          onChange={(e) => {
                                            const nextOpts = [...q.options!];
                                            nextOpts[oIdx] = e.target.value;
                                            updateQuestion({ options: nextOpts });
                                          }}
                                          className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {q.matchingPairs && q.matchingPairs.length > 0 && (
                                <div className="space-y-2">
                                  <label className="block text-xs font-bold text-slate-600">គូផ្គូរផ្គង (ក ↔ ខ)</label>
                                  {q.matchingPairs.map((pair, pIdx) => (
                                    <div key={pIdx} className="grid grid-cols-2 gap-2">
                                      <input
                                        type="text"
                                        value={pair.left}
                                        onChange={(e) => {
                                          const nextPairs = [...q.matchingPairs!];
                                          nextPairs[pIdx] = { ...nextPairs[pIdx], left: e.target.value };
                                          updateQuestion({ matchingPairs: nextPairs });
                                        }}
                                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                      />
                                      <input
                                        type="text"
                                        value={pair.right}
                                        onChange={(e) => {
                                          const nextPairs = [...q.matchingPairs!];
                                          nextPairs[pIdx] = { ...nextPairs[pIdx], right: e.target.value };
                                          updateQuestion({ matchingPairs: nextPairs });
                                        }}
                                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">ចម្លើយត្រឹមត្រូវ</label>
                                  <input
                                    type="text"
                                    value={typeof q.answer === 'string' ? q.answer : JSON.stringify(q.answer)}
                                    onChange={(e) => updateQuestion({ answer: e.target.value })}
                                    className="w-full px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 mb-1">ការពន្យល់ (បើមាន)</label>
                                  <input
                                    type="text"
                                    value={q.explanation || ''}
                                    onChange={(e) => updateQuestion({ explanation: e.target.value })}
                                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                  />
                                </div>
                              </div>

                              {(q.type === QuestionType.SHORT_ANSWER || q.type === QuestionType.LONG_ANSWER) && (
                                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!!q.allowImageUpload}
                                    onChange={(e) => updateQuestion({ allowImageUpload: e.target.checked })}
                                    className="w-4 h-4 text-emerald-600 rounded"
                                  />
                                  <span>អនុញ្ញាតឱ្យសិស្ស Upload រូបភាពចម្លើយ (.jpg)</span>
                                </label>
                              )}
                            </div>
                          );
                        })}

                        <div className="flex flex-wrap gap-3 justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingTest(false)}
                            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                          >
                            រក្សាទុកការកែប្រែ
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setIsEditingTest(false);
                              await handleSaveTestToApp();
                            }}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                          >
                            រក្សាទុកការកែប្រែ & បញ្ជូនចូលឃ្លាំង
                          </button>
                        </div>
                      </div>
                    ) : (
                    <>
                    {/* Kid/Discovery Friendly Decorations */}
                    {isYoungGrade() && (
                      <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none opacity-10 flex justify-between px-10 print:hidden">
                        <Sun className="w-24 h-24 text-amber-500 animate-pulse" />
                        <Cloud className="w-32 h-32 text-blue-400 mt-10" />
                        <CloudRain className="w-20 h-20 text-blue-300 mt-5" />
                        <Star className="w-16 h-16 text-yellow-400 mt-20" />
                      </div>
                    )}
                    {isIntermediateGrade() && (
                      <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none opacity-10 flex justify-between px-10 print:hidden">
                        <Rocket className="w-24 h-24 text-indigo-500 -rotate-12" />
                        <Atom className="w-32 h-32 text-cyan-400 mt-10 animate-[spin_10s_linear_infinite]" />
                        <Globe className="w-20 h-20 text-blue-500 mt-5" />
                        <Zap className="w-16 h-16 text-yellow-500 mt-20" />
                      </div>
                    )}

                    {/* Header Traditional Format */}
                    <div className={`space-y-4 relative z-10 ${isYoungGrade() ? 'bg-blue-50/30 p-6 rounded-2xl' : isIntermediateGrade() ? 'bg-indigo-50/20 p-6 rounded-2xl border border-indigo-100/50' : ''}`}>
                        <div className="flex justify-between items-start">
                           <div className="space-y-1 text-sm font-bold">
                              <p>សាលា..................................................</p>
                              <p>ប្រឡងប្រចាំខែ {test?.exam_month || examMonth} ថ្នាក់ទី {test?.grade.replace('ថ្នាក់ទី ', '')} សម័យប្រឡង៖ .........................</p>
                              <p className="pt-2">ហត្ថលេខាអនុរក្ស៖</p>
                              <p>១. .................................</p>
                              <p>២. .................................</p>
                           </div>
                           <div className="space-y-1 text-right text-sm font-bold">
                              <p>លេខបន្ទប់៖ ........................</p>
                              <p>លេខតុ៖ .............................</p>
                           </div>
                        </div>

                        <div className="flex flex-col items-center pt-6 space-y-2 border-t border-slate-100 mt-6">
                           <div className="space-y-1 text-center text-sm">
                              <p>នាមត្រកូល និងនាមខ្លួន ៖ .....................................................................</p>
                              <p>ថ្ងៃខែឆ្នាំកំណើត ៖ .............................................................................</p>
                              <p>ហត្ថលេខាបេក្ខជន ៖ .........................................................................</p>
                           </div>
                        </div>

                        <div className="flex items-center justify-between py-10">
                           <div className="w-16 h-16 rounded-full border-2 border-black flex flex-col items-center justify-center">
                              <span className="text-sm">..........</span>
                              <div className="w-10 h-[1px] bg-black my-0.5" />
                              <span className="text-sm">10</span>
                           </div>
                           <h2 className="text-3xl font-bold uppercase tracking-tight">វិញ្ញាសា៖ {test?.title}</h2>
                           <div className="text-xl font-bold">រយៈពេល {getDuration()} នាទី</div>
                        </div>
                    </div>

                    <div className="space-y-10 pb-20">
                      {test?.questions.map((q, idx) => (
                        <QuestionCard key={q.id} question={q} index={idx} isYoung={isYoungGrade()} isIntermediate={isIntermediateGrade()} />
                      ))}
                    </div>
                    </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>
          </>
        )}
      </main>

      {!isStudentExamFullscreen && (
        <footer className="hidden md:flex h-10 bg-white border-t border-slate-200 px-8 items-center justify-between text-[11px] font-bold text-slate-400 print:hidden shrink-0">
        <div className="flex gap-4 items-center">
          <span className="text-blue-500">ប្រព័ន្ធបង្កើតវិញ្ញាសា V1.0</span>
          <span>|</span>
          <span>បច្ចេកវិទ្យា៖ Google Gemini AI</span>
        </div>
        <div className="flex gap-6 items-center uppercase tracking-widest text-[9px] font-bold">
          <div className="flex gap-2 items-center text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span>Cloud Sync: Active</span>
          </div>
          <span className="text-slate-800">Version 2.4.0 (Stable)</span>
        </div>
      </footer>
      )}

      <GoogleFormModal 
        isOpen={showGoogleFormModal} 
        onClose={() => setShowGoogleFormModal(false)}
        gsCode={googleFormExport?.gsCode || ''}
        htmlCode={googleFormExport?.htmlCode || ''}
        googleFormCode={googleFormExport?.googleFormCode || ''}
      />
    </div>
  );
}

function QuestionCard({ question, index, isYoung, isIntermediate }: { question: Question, index: number, isYoung?: boolean, isIntermediate?: boolean, key?: string }) {
  const colors = ['text-blue-600', 'text-rose-600', 'text-amber-600', 'text-emerald-600', 'text-purple-600'];
  const kidIcons = [Star, Sun, Cloud, Palette, CloudRain];
  const discoveryIcons = [Rocket, Atom, Globe, Zap, Cpu];
  
  const color = (isYoung || isIntermediate) ? colors[index % colors.length] : 'text-blue-600';
  const Icon = isYoung ? kidIcons[index % kidIcons.length] : isIntermediate ? discoveryIcons[index % discoveryIcons.length] : null;
  
  const cleanQuestion = preprocessMathForDisplay(question.question);

  const renderGeometricShape = () => {
    if (!isYoung) return null;
    
    // Check if question is about fractions or specific shapes
    const lowerQ = question.question.toLowerCase();
    const hasFraction = lowerQ.includes('\\frac') || lowerQ.includes('/') || lowerQ.includes('ភាគ');
    const hasCircle = lowerQ.includes('រង្វង់') || lowerQ.includes('circle');
    const hasSquare = lowerQ.includes('ការ៉េ') || lowerQ.includes('square');
    const hasTriangle = lowerQ.includes('ត្រីកោណ') || lowerQ.includes('triangle');

    if (hasCircle || (hasFraction && index % 3 === 0)) {
      return (
        <div className="flex justify-center my-6">
          <svg width="120" height="120" viewBox="0 0 100 100" className="drop-shadow-sm">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-200" />
            <path d="M 50 10 L 50 90 M 10 50 L 90 50" stroke="currentColor" strokeWidth="1" strokeDasharray="4" className="text-blue-300" />
            <circle cx="50" cy="50" r="45" fill="currentColor" fillOpacity="0.1" className="text-blue-500" />
          </svg>
        </div>
      );
    }
    if (hasSquare || (hasFraction && index % 3 === 1)) {
      return (
        <div className="flex justify-center my-6">
          <svg width="120" height="120" viewBox="0 0 100 100" className="drop-shadow-sm">
            <rect x="10" y="10" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-200" />
            <path d="M 10 50 L 90 50 M 50 10 L 50 90" stroke="currentColor" strokeWidth="1" strokeDasharray="4" className="text-rose-300" />
            <rect x="10" y="10" width="80" height="80" fill="currentColor" fillOpacity="0.1" className="text-rose-500" />
          </svg>
        </div>
      );
    }
    if (hasTriangle || (hasFraction && index % 3 === 2)) {
      return (
        <div className="flex justify-center my-6">
          <svg width="120" height="120" viewBox="0 0 100 100" className="drop-shadow-sm">
            <path d="M 50 10 L 90 90 L 10 90 Z" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-200" />
            <path d="M 50 10 L 50 90" stroke="currentColor" strokeWidth="1" strokeDasharray="4" className="text-amber-300" />
            <path d="M 50 10 L 90 90 L 10 90 Z" fill="currentColor" fillOpacity="0.1" className="text-amber-500" />
          </svg>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`space-y-6 group ${isYoung ? 'bg-slate-50/50 p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm relative' : isIntermediate ? 'bg-indigo-50/10 p-8 rounded-3xl border border-indigo-100/50 shadow-sm relative' : ''}`}>
      {(isYoung || isIntermediate) && Icon && (
        <div className={`absolute -top-4 -left-4 p-2 rounded-2xl bg-white shadow-md border border-slate-100 ${color} ${isIntermediate ? 'rotate-12' : ''}`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
      <div className="flex gap-4">
        <span className={`font-bold text-lg ${color} min-w-[2rem]`}>{index + 1}.</span>
        <div className="flex-1 space-y-8">
          <div className="flex items-start justify-between">
            <div className={`font-bold text-xl leading-relaxed ${isYoung ? 'text-blue-900' : isIntermediate ? 'text-indigo-950' : 'text-slate-900'} markdown-body w-full`}>
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {cleanQuestion}
              </ReactMarkdown>
              {question.svg && (
                <div className="flex justify-center my-6 max-w-full overflow-hidden" dangerouslySetInnerHTML={{ __html: question.svg }} />
              )}
              {!question.svg && renderGeometricShape()}
            </div>
          </div>

          {question.type === QuestionType.MULTIPLE_CHOICE && question.options && (
            <div className="space-y-4 pl-2">
              {question.options.map((opt, i) => {
                const cleanOpt = preprocessMathForDisplay(opt);
                const letter = String.fromCharCode(65 + i);
                return (
                  <div key={i} className="flex items-start gap-4 text-lg font-medium text-slate-700">
                    <div className={`w-7 h-7 rounded-full ${isYoung ? 'border-2 border-dashed' : isIntermediate ? 'border-2 border-indigo-200' : 'border-2'} border-slate-300 shrink-0 flex items-center justify-center bg-slate-50 text-[11px] font-extrabold text-slate-500`}>
                      {letter}
                    </div>
                    <div className={`markdown-body ${isYoung || isIntermediate ? 'text-slate-800' : ''} flex-1 pt-0.5`}>
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {cleanOpt}
                      </ReactMarkdown>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {question.type === QuestionType.TRUE_FALSE && (
            question.options && question.options.length > 2 ? (
              <div className="space-y-3 pl-2">
                {question.options.map((opt, i) => {
                  const cleanOpt = preprocessMathForDisplay(opt);
                  const letter = String.fromCharCode(65 + i);
                  return (
                    <div key={i} className="flex items-start gap-4 text-lg font-medium text-slate-700">
                      <div className={`w-7 h-7 rounded-full ${isYoung ? 'border-2 border-dashed' : isIntermediate ? 'border-2 border-indigo-200' : 'border-2'} border-slate-300 shrink-0 flex items-center justify-center bg-slate-50 text-[11px] font-extrabold text-slate-500`}>
                        {letter}
                      </div>
                      <div className={`markdown-body ${isYoung || isIntermediate ? 'text-slate-800' : ''} flex-1 pt-0.5`}>
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {cleanOpt}
                        </ReactMarkdown>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
             <div className="flex flex-col gap-4 pl-2 sm:flex-row sm:gap-10">
                <div className="flex items-center gap-3 text-lg font-medium text-slate-700">
                  <div className={`w-7 h-7 rounded-full ${isYoung ? 'border-2 border-dashed' : isIntermediate ? 'border-2 border-indigo-200' : 'border-2'} border-slate-300 shrink-0 flex items-center justify-center bg-slate-50 text-[11px] font-extrabold text-slate-500`}>
                    A
                  </div>
                  <span>ត្រឹមត្រូវ (True)</span>
                </div>
                <div className="flex items-center gap-3 text-lg font-medium text-slate-700">
                  <div className={`w-7 h-7 rounded-full ${isYoung ? 'border-2 border-dashed' : isIntermediate ? 'border-2 border-indigo-200' : 'border-2'} border-slate-300 shrink-0 flex items-center justify-center bg-slate-50 text-[11px] font-extrabold text-slate-500`}>
                    B
                  </div>
                  <span>មិនត្រឹមត្រូវ (False)</span>
                </div>
             </div>
            )
          )}

          {question.type === QuestionType.FILL_BLANKS && (
            <div className="space-y-4 pl-2">
              {question.options && question.options.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">ជម្រើសសម្រាប់បំពេញចន្លោះ (Fill-in-the-blank Options):</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {question.options.map((opt, i) => {
                      const cleanOpt = preprocessMathForDisplay(opt);
                      const letter = String.fromCharCode(65 + i);
                      return (
                        <div key={i} className="flex items-start gap-3 text-base font-medium text-slate-700">
                          <div className={`w-7 h-7 rounded-full ${isYoung ? 'border-2 border-dashed' : isIntermediate ? 'border-2 border-indigo-200' : 'border-2'} border-slate-300 shrink-0 flex items-center justify-center bg-slate-50 text-[11px] font-extrabold text-slate-500`}>
                            {letter}
                          </div>
                          <div className={`markdown-body ${isYoung || isIntermediate ? 'text-slate-800' : ''} flex-1 pt-0.5`}>
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {cleanOpt}
                            </ReactMarkdown>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="w-full border-b border-slate-300 border-dotted h-6" />
                  <div className="w-full border-b border-slate-300 border-dotted h-6" />
                </div>
              )}
            </div>
          )}

          {question.type === QuestionType.MATCHING && question.matchingPairs && (
            <div className="pl-2">
               <table className="w-full border-collapse border border-black max-w-2xl">
                  <thead>
                     <tr className="bg-slate-50">
                        <th className="border border-black p-2 font-bold w-1/3">ក</th>
                        <th className="border border-black p-2 font-bold w-1/3">ខ</th>
                        <th className="border border-black p-2 font-bold w-1/3">ផ្គូរផ្គង</th>
                     </tr>
                  </thead>
                  <tbody>
                     {(() => {
                        const rightList = [...question.matchingPairs, ...(question.distractors || []).map(d => ({ left: '', right: d }))];
                        const maxLength = Math.max(question.matchingPairs.length, rightList.length);
                        const rows = [];
                        for (let i = 0; i < maxLength; i++) {
                           rows.push(
                              <tr key={i}>
                                 <td className="border border-black p-3 text-base markdown-body">
                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                       {question.matchingPairs[i] ? `${i + 1}. ${preprocessMathForDisplay(question.matchingPairs[i].left)}` : ""}
                                    </ReactMarkdown>
                                 </td>
                                 <td className="border border-black p-3 text-base markdown-body">
                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                       {rightList[i] ? `${String.fromCharCode(65 + i)}. ${preprocessMathForDisplay(rightList[i].right)}` : ""}
                                    </ReactMarkdown>
                                 </td>
                                 <td className="border border-black p-3 text-base font-bold">
                                    {question.matchingPairs[i] ? `${i + 1}- ............` : ""}
                                 </td>
                              </tr>
                           );
                        }
                        return rows;
                     })()}
                  </tbody>
               </table>
            </div>
          )}

          {(question.type === QuestionType.SHORT_ANSWER || question.type === QuestionType.LONG_ANSWER) && (
            <div className="space-y-4 pt-2">
              <div className="w-full border-b border-slate-300 border-dotted h-6" />
              <div className="w-full border-b border-slate-300 border-dotted h-6" />
              {question.type === QuestionType.LONG_ANSWER && (
                <>
                  <div className="w-full border-b border-slate-300 border-dotted h-6" />
                  <div className="w-full border-b border-slate-300 border-dotted h-6" />
                </>
              )}
            </div>
          )}
          
          <div className="hidden group-hover:block print:hidden bg-blue-50 border border-blue-100 p-4 rounded-xl mt-4">
             <p className="text-[10px] font-black text-blue-600 uppercase mb-2">គន្លឹះចម្លើយ / Answer Key</p>
             <p className="text-sm font-bold text-slate-900 leading-relaxed">
               {(() => {
                 if (question.type === QuestionType.MULTIPLE_CHOICE && question.options) {
                   const cleanAns = typeof question.answer === 'string' ? question.answer.trim().toLowerCase() : '';
                   const idx = question.options.findIndex(opt => {
                     const cleanOpt = opt.trim().toLowerCase();
                     return cleanOpt === cleanAns || cleanOpt.includes(cleanAns) || cleanAns.includes(cleanOpt);
                   });
                   if (idx !== -1) {
                     return `ជម្រើស ${String.fromCharCode(65 + idx)} : ${question.options[idx]}`;
                   }
                   if (cleanAns === 'a' || cleanAns === 'b' || cleanAns === 'c' || cleanAns === 'd') {
                     const lIdx = cleanAns.charCodeAt(0) - 97;
                     if (question.options[lIdx]) {
                       return `ជម្រើស ${cleanAns.toUpperCase()} : ${question.options[lIdx]}`;
                     }
                   }
                 } else if (question.type === QuestionType.TRUE_FALSE) {
                   const cleanAns = typeof question.answer === 'string' ? question.answer.trim().toLowerCase() : '';
                   if (cleanAns === 'true' || cleanAns === 'ត្រឹមត្រូវ' || cleanAns === 'a' || cleanAns === 'yes') {
                     return 'ជម្រើស A : ត្រឹមត្រូវ (True)';
                   } else {
                     return 'ជម្រើស B : មិនត្រឹមត្រូវ (False)';
                   }
                 } else if (question.type === QuestionType.FILL_BLANKS && question.options) {
                   const cleanAns = typeof question.answer === 'string' ? question.answer.trim().toLowerCase() : '';
                   const idx = question.options.findIndex(opt => {
                     const cleanOpt = opt.trim().toLowerCase();
                     return cleanOpt === cleanAns || cleanOpt.includes(cleanAns) || cleanAns.includes(cleanOpt);
                   });
                   if (idx !== -1) {
                     return `ជម្រើស ${String.fromCharCode(65 + idx)} : ${question.options[idx]}`;
                   }
                 }
                 return typeof question.answer === 'string' ? question.answer : JSON.stringify(question.answer);
               })()}
             </p>
             {question.explanation && (
                <p className="text-[11px] text-blue-700 italic mt-2">{question.explanation}</p>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
