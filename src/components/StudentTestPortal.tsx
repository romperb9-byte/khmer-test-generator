import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  GraduationCap,
  Clock,
  CheckCircle2,
  Send,
  ArrowLeft,
  BookOpen,
  User,
  Hash,
  Award,
  AlertCircle
} from 'lucide-react';
import { School, SavedTest, Question, QuestionType, StudentSubmission, StudentRecord } from '../types';
import { fetchTests, fetchSubjects, submitStudentTest, fetchStudents } from '../services/dbService';
import { preprocessMathForDisplay } from '../utils/mathUtils';

const GRADES = Array.from({ length: 12 }, (_, i) => `ថ្នាក់ទី ${i + 1}`);

interface StudentTestPortalProps {
  school: School;
}

function normalizeAnswerStr(val: string): string {
  return val.trim().toLowerCase().replace(/\s+/g, ' ');
}

function resolveMcqLetter(q: Question): string {
  const ans = typeof q.answer === 'string' ? q.answer.trim() : '';
  if (!q.options || q.options.length === 0) return ans.toUpperCase();

  const upper = ans.toUpperCase();
  if (['A', 'B', 'C', 'D'].includes(upper)) return upper;

  const cleanAns = normalizeAnswerStr(ans);
  const idx = q.options.findIndex(opt => {
    const cleanOpt = normalizeAnswerStr(opt);
    return cleanOpt === cleanAns || cleanOpt.includes(cleanAns) || cleanAns.includes(cleanOpt);
  });
  return idx !== -1 ? String.fromCharCode(65 + idx) : upper;
}

function isQuestionCorrect(
  q: Question,
  studentVal: string | Record<number, string> | undefined
): boolean {
  if (!studentVal) return false;

  if (q.type === QuestionType.MULTIPLE_CHOICE) {
    const expectedLetter = resolveMcqLetter(q);
    return typeof studentVal === 'string' && studentVal.toUpperCase() === expectedLetter;
  }

  if (q.type === QuestionType.TRUE_FALSE) {
    const raw = typeof q.answer === 'string' ? normalizeAnswerStr(q.answer) : '';
    const expected = raw === 'true' || raw === 'ត្រឹមត្រូវ' || raw === 'a' || raw === 'yes' ? 'A' : 'B';
    return typeof studentVal === 'string' && studentVal.toUpperCase() === expected;
  }

  if (q.type === QuestionType.FILL_BLANKS) {
    if (q.options && q.options.length > 0) {
      const expectedLetter = resolveMcqLetter(q);
      return typeof studentVal === 'string' && studentVal.toUpperCase() === expectedLetter;
    }
    const expected = typeof q.answer === 'string' ? normalizeAnswerStr(q.answer) : '';
    return typeof studentVal === 'string' && normalizeAnswerStr(studentVal) === expected;
  }

  if (q.type === QuestionType.MATCHING && q.matchingPairs) {
    if (typeof studentVal !== 'object') return false;
    // Every left pair index i should match the letter of its right item in the combined list
    return q.matchingPairs.every((_, idx) => {
      const expectedLetter = String.fromCharCode(65 + idx);
      return (studentVal[idx] || '').toUpperCase() === expectedLetter;
    });
  }

  if (q.type === QuestionType.SHORT_ANSWER) {
    if (typeof studentVal !== 'string') return false;
    const expected = typeof q.answer === 'string' ? normalizeAnswerStr(q.answer) : '';
    const given = normalizeAnswerStr(studentVal);
    if (!given) return false;
    return given === expected || expected.includes(given) || given.includes(expected);
  }

  // Long answer: award credit if non-empty meaningful response
  if (q.type === QuestionType.LONG_ANSWER) {
    return typeof studentVal === 'string' && studentVal.trim().length >= 5;
  }

  return false;
}

export const StudentTestPortal: React.FC<StudentTestPortalProps> = ({ school }) => {
  const [step, setStep] = useState<'setup' | 'exam' | 'result'>('setup');
  const [grade, setGrade] = useState(GRADES[11]);
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [subject, setSubject] = useState('');

  const [subjects, setSubjects] = useState<string[]>([]);
  const [publishedTests, setPublishedTests] = useState<SavedTest[]>([]);
  const [roster, setRoster] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Exam State
  const [activeTest, setActiveTest] = useState<SavedTest | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | Record<number, string>>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<StudentSubmission | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [subjs, tests, studentList] = await Promise.all([
          fetchSubjects(school.id),
          fetchTests(school.id),
          fetchStudents(school.id).catch(() => [] as StudentRecord[])
        ]);
        const subjNames = subjs.map(s => s.name);
        setSubjects(subjNames);
        if (subjNames.length > 0 && !subject) {
          setSubject(subjNames[0]);
        }
        setPublishedTests(tests.filter(t => t.is_published));
        setRoster(studentList);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [school.id]);

  // Timer countdown
  useEffect(() => {
    if (step !== 'exam' || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, secondsLeft]);

  const matchingTests = publishedTests.filter(
    t => t.grade === grade && (!subject || t.subject === subject)
  );

  const handleStartTest = (test: SavedTest) => {
    if (!studentId.trim() || !studentName.trim()) {
      setError('សូមបញ្ចូល អត្តលេខ និងឈ្មោះសិស្ស ជាមុនសិន!');
      return;
    }
    setError(null);
    setActiveTest(test);
    setAnswers({});
    setSecondsLeft((test.duration || 60) * 60);
    setStep('exam');
  };

  const handleSubmitExam = async () => {
    if (!activeTest) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const totalQ = activeTest.questions.length || 1;
      let correctCount = 0;
      activeTest.questions.forEach(q => {
        if (isQuestionCorrect(q, answers[q.id])) {
          correctCount += 1;
        }
      });
      const scoreOutOf10 = Math.round(((correctCount / totalQ) * 10) * 100) / 100;

      const saved = await submitStudentTest({
        school_id: school.id,
        test_id: activeTest.id,
        test_title: activeTest.title,
        grade,
        subject: activeTest.subject,
        student_id: studentId.trim(),
        student_name: studentName.trim(),
        answers,
        score: scoreOutOf10,
        total_points: 10,
        correct_count: correctCount,
        total_questions: totalQ,
      });
      setSubmissionResult(saved);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'មានបញ្ហាក្នុងការបញ្ជូនចម្លើយ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (step === 'result' && activeTest && submissionResult) {
    const showScore = activeTest.show_score_immediately;
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
            {showScore ? <Award className="w-9 h-9" /> : <CheckCircle2 className="w-9 h-9" />}
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-slate-900">បានបញ្ជូនចម្លើយដោយជោគជ័យ!</h2>
            <p className="text-sm text-slate-500">
              សិស្ស៖ <span className="font-bold text-slate-800">{submissionResult.student_name}</span> (អត្តលេខ៖ {submissionResult.student_id}) • {submissionResult.grade}
            </p>
            <p className="text-xs text-slate-400">{activeTest.title} — {activeTest.subject}</p>
          </div>

          {showScore ? (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 space-y-2">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">ពិន្ទុរបស់អ្នក</p>
              <div className="text-5xl font-black text-blue-700">
                {submissionResult.score} <span className="text-xl font-bold text-blue-400">/ 10</span>
              </div>
              <p className="text-sm font-semibold text-slate-600">
                ឆ្លើយត្រូវ {submissionResult.correct_count} ក្នុងចំណោម {submissionResult.total_questions} សំណួរ
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800 font-medium">
              ចម្លើយរបស់អ្នកត្រូវបានរក្សាទុកក្នុងប្រព័ន្ធរួចរាល់ហើយ។ ពិន្ទុនឹងត្រូវបានប្រកាសដោយនាយក ឬលេខា។
            </div>
          )}

          <button
            onClick={() => {
              setStep('setup');
              setActiveTest(null);
              setSubmissionResult(null);
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ត្រឡប់ទៅជ្រើសរើសវិញ្ញាសាផ្សេង</span>
          </button>
        </div>
      </div>
    );
  }

  if (step === 'exam' && activeTest) {
    return (
      <div className="flex-1 overflow-y-auto bg-slate-50 pb-20">
        {/* Sticky Exam Header */}
        <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-extrabold text-slate-900 text-base md:text-lg">{activeTest.title}</h2>
              <p className="text-xs text-slate-500">
                {studentName} (អត្តលេខ៖ {studentId}) • {grade} • {activeTest.subject}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-3.5 py-2 rounded-xl font-mono text-sm font-extrabold flex items-center gap-2 ${
                secondsLeft < 300 ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                <Clock className="w-4 h-4" />
                <span>{formatTimer(secondsLeft)}</span>
              </div>
              <button
                onClick={handleSubmitExam}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs md:text-sm font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'កំពុងបញ្ជូន...' : 'បញ្ជូនចម្លើយ (Submit)'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 md:px-6 pt-8 space-y-6">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm font-bold">
              {error}
            </div>
          )}

          {activeTest.questions.map((q, idx) => {
            const cleanQ = preprocessMathForDisplay(q.question);
            const currentVal = answers[q.id];

            return (
              <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
                <div className="flex gap-3">
                  <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 font-extrabold text-sm flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 space-y-3">
                    <div className="text-base md:text-lg font-bold text-slate-900 markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {cleanQ}
                      </ReactMarkdown>
                    </div>
                    {q.svg && (
                      <div className="flex justify-center my-4" dangerouslySetInnerHTML={{ __html: q.svg }} />
                    )}
                  </div>
                </div>

                {/* Multiple Choice */}
                {q.type === QuestionType.MULTIPLE_CHOICE && q.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-11">
                    {q.options.map((opt, i) => {
                      const letter = String.fromCharCode(65 + i);
                      const selected = currentVal === letter;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, [q.id]: letter }))}
                          className={`text-left p-3.5 rounded-xl border-2 transition-all flex items-start gap-3 cursor-pointer ${
                            selected
                              ? 'border-blue-600 bg-blue-50/70 text-blue-900'
                              : 'border-slate-200 hover:border-blue-300 bg-white text-slate-700'
                          }`}
                        >
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                            selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {letter}
                          </span>
                          <div className="text-sm font-medium markdown-body pt-0.5">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {preprocessMathForDisplay(opt)}
                            </ReactMarkdown>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* True / False */}
                {q.type === QuestionType.TRUE_FALSE && (
                  <div className="flex flex-wrap gap-3 pl-11">
                    {[
                      { letter: 'A', label: 'ត្រឹមត្រូវ (True)' },
                      { letter: 'B', label: 'មិនត្រឹមត្រូវ (False)' }
                    ].map(opt => {
                      const selected = currentVal === opt.letter;
                      return (
                        <button
                          key={opt.letter}
                          type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.letter }))}
                          className={`px-5 py-3 rounded-xl border-2 text-sm font-bold flex items-center gap-2.5 cursor-pointer transition-all ${
                            selected ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 hover:border-blue-300 text-slate-700'
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                            selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {opt.letter}
                          </span>
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Fill in Blanks */}
                {q.type === QuestionType.FILL_BLANKS && (
                  <div className="pl-11">
                    {q.options && q.options.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {q.options.map((opt, i) => {
                          const letter = String.fromCharCode(65 + i);
                          const selected = currentVal === letter;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setAnswers(prev => ({ ...prev, [q.id]: letter }))}
                              className={`text-left p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer ${
                                selected ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 hover:border-blue-300'
                              }`}
                            >
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                                selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {letter}
                              </span>
                              <span className="text-sm font-medium">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={typeof currentVal === 'string' ? currentVal : ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder="វាយចម្លើយបំពេញចន្លោះនៅទីនេះ..."
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                      />
                    )}
                  </div>
                )}

                {/* Matching */}
                {q.type === QuestionType.MATCHING && q.matchingPairs && (
                  <div className="pl-11 space-y-3">
                    {(() => {
                      const rightList = [
                        ...q.matchingPairs,
                        ...(q.distractors || []).map(d => ({ left: '', right: d }))
                      ];
                      const currentMap = (typeof currentVal === 'object' && currentVal !== null ? currentVal : {}) as Record<number, string>;
                      return q.matchingPairs.map((pair, pIdx) => (
                        <div key={pIdx} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex-1 text-sm font-bold text-slate-800">
                            {pIdx + 1}. {pair.left}
                          </div>
                          <select
                            value={currentMap[pIdx] || ''}
                            onChange={(e) =>
                              setAnswers(prev => ({
                                ...prev,
                                [q.id]: { ...currentMap, [pIdx]: e.target.value }
                              }))
                            }
                            className="sm:w-64 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                          >
                            <option value="">-- ជ្រើសរើសចម្លើយផ្គូរផ្គង --</option>
                            {rightList.map((r, rIdx) => {
                              const letter = String.fromCharCode(65 + rIdx);
                              return (
                                <option key={rIdx} value={letter}>
                                  {letter}. {r.right}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      ));
                    })()}
                  </div>
                )}

                {/* Short & Long Answer */}
                {(q.type === QuestionType.SHORT_ANSWER || q.type === QuestionType.LONG_ANSWER) && (
                  <div className="pl-11">
                    {q.type === QuestionType.SHORT_ANSWER ? (
                      <input
                        type="text"
                        value={typeof currentVal === 'string' ? currentVal : ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder="សរសេរចម្លើយខ្លីនៅទីនេះ..."
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                      />
                    ) : (
                      <textarea
                        rows={4}
                        value={typeof currentVal === 'string' ? currentVal : ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder="សរសេរចម្លើយក្បោះក្បាយនៅទីនេះ..."
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex justify-center pt-4">
            <button
              onClick={handleSubmitExam}
              disabled={isSubmitting}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-2.5 cursor-pointer"
            >
              <Send className="w-5 h-5" />
              <span>{isSubmitting ? 'កំពុងបញ្ជូនចម្លើយ...' : 'បញ្ជូនចម្លើយ (Submit)'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 1: SETUP & TEST SELECTION
  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-emerald-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">ប្រឡងតេស្ដសម្រាប់សិស្ស — {school.name}</h2>
              <p className="text-xs text-slate-500">បំពេញព័ត៌មានសិស្ស ជ្រើសរើសថ្នាក់ និងមុខវិជ្ជា ដើម្បីចាប់ផ្ដើមប្រឡង</p>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">ជ្រើសរើសថ្នាក់</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500"
              >
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">ជ្រើសរើសមុខវិជ្ជា</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500"
              >
                <option value="">គ្រប់មុខវិជ្ជា</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" /> អត្តលេខសិស្ស *
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => {
                  const val = e.target.value;
                  setStudentId(val);
                  const found = roster.find(r => r.student_id.trim().toLowerCase() === val.trim().toLowerCase());
                  if (found) {
                    setStudentName(found.student_name);
                    if (found.grade && GRADES.includes(found.grade)) {
                      setGrade(found.grade);
                    }
                  }
                }}
                placeholder="ឧ. 00125"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" /> ឈ្មោះសិស្ស *
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="ឧ. សុខ វិបុល"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Available Published Tests */}
        <div className="space-y-3">
          <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">
            វិញ្ញាសាដែលកំពុងបើកឱ្យប្រឡង ({matchingTests.length})
          </h3>

          {loading ? (
            <div className="bg-white rounded-2xl p-8 text-center text-sm text-slate-400">កំពុងស្វែងរកវិញ្ញាសា...</div>
          ) : matchingTests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
              មិនទាន់មានវិញ្ញាសាបើកឱ្យប្រឡងសម្រាប់ {grade} {subject ? `មុខវិជ្ជា ${subject}` : ''} នៅឡើយទេ។
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchingTests.map(t => (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-slate-900 text-base">{t.title}</h4>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold">{t.grade}</span>
                      <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-bold flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> {t.subject}
                      </span>
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {t.duration} នាទី • {t.questions.length} សំណួរ
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartTest(t)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
                  >
                    ចាប់ផ្ដើមធ្វើតេស្ដ
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
