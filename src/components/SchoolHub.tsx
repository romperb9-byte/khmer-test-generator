import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  GraduationCap,
  UserCheck,
  Lock,
  ArrowRight,
  X,
  School as SchoolIcon,
  Eye,
  EyeOff
} from 'lucide-react';
import { School } from '../types';

interface SchoolHubProps {
  school: School;
  onEnterTeacher: () => void;
  onEnterStudent: () => void;
  onEnterPrincipal: () => void;
}

export const SchoolHub: React.FC<SchoolHubProps> = ({
  school,
  onEnterTeacher,
  onEnterStudent,
  onEnterPrincipal
}) => {
  const [promptTarget, setPromptTarget] = useState<'teacher' | 'student' | null>(null);
  const [enteredCode, setEnteredCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPrompt = (target: 'teacher' | 'student') => {
    setPromptTarget(target);
    setEnteredCode('');
    setError(null);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptTarget) return;

    const expected =
      promptTarget === 'teacher'
        ? (school.teacher_code || '1111').trim()
        : (school.student_code || '2222').trim();

    if (enteredCode.trim() === expected) {
      const target = promptTarget;
      setPromptTarget(null);
      setEnteredCode('');
      if (target === 'teacher') {
        onEnterTeacher();
      } else {
        onEnterStudent();
      }
    } else {
      setError('លេខកូដមិនត្រឹមត្រូវទេ! សូមសួរនាយកសាលា ដើម្បីទទួលបានលេខកូដត្រឹមត្រូវ។');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50/40 to-emerald-50/40 flex flex-col items-center justify-center p-6 md:p-10">
      <div className="max-w-4xl w-full space-y-8">
        {/* School Title Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-xs font-bold text-slate-600">
            <SchoolIcon className="w-4 h-4 text-blue-600" />
            <span>{school.name}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            ជ្រើសរើសមុខងារប្រើប្រាស់
          </h2>
          {school.description && (
            <p className="text-sm text-slate-500">{school.description}</p>
          )}
        </div>

        {/* 2 BIG CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Create Test (Teacher) */}
          <motion.button
            type="button"
            whileHover={{ y: -5, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => openPrompt('teacher')}
            className="text-left bg-white rounded-[2rem] border-2 border-blue-100 hover:border-blue-500 p-8 md:p-10 shadow-lg shadow-blue-500/5 hover:shadow-xl hover:shadow-blue-500/15 transition-all cursor-pointer flex flex-col justify-between min-h-[260px] group"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <FileText className="w-8 h-8" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                  <Lock className="w-3.5 h-3.5" /> លេខកូដគ្រូ
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                  បង្កើតតេស្ដ
                </h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  សម្រាប់លោកគ្រូ អ្នកគ្រូ បង្កើតវិញ្ញាសាថ្មីដោយ AI និងរក្សាទុកក្នុងប្រព័ន្ធ (ប្រើលេខកូដដែលនាយកកំណត់ឱ្យ)
                </p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-sm font-extrabold text-blue-600">
              <span>ចូលបង្កើតតេស្ដ</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </motion.button>

          {/* Card 2: Student Test */}
          <motion.button
            type="button"
            whileHover={{ y: -5, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => openPrompt('student')}
            className="text-left bg-white rounded-[2rem] border-2 border-emerald-100 hover:border-emerald-500 p-8 md:p-10 shadow-lg shadow-emerald-500/5 hover:shadow-xl hover:shadow-emerald-500/15 transition-all cursor-pointer flex flex-col justify-between min-h-[260px] group"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                  <Lock className="w-3.5 h-3.5" /> លេខកូដសិស្ស
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors">
                  តេស្ដសិស្ស
                </h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  សម្រាប់សិស្សានុសិស្ស ចូលជ្រើសរើសថ្នាក់ មុខវិជ្ជា និងធ្វើតេស្ដអនឡាញ (ប្រើលេខកូដដែលនាយកកំណត់ឱ្យ)
                </p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-sm font-extrabold text-emerald-600">
              <span>ចូលធ្វើតេស្ដសិស្ស</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </motion.button>
        </div>

        {/* Principal / Secretary Entry Bar */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onEnterPrincipal}
            className="inline-flex items-center gap-3 px-6 py-3.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-2xl shadow-sm text-sm font-bold text-slate-700 hover:text-indigo-700 transition-all cursor-pointer"
          >
            <UserCheck className="w-5 h-5 text-indigo-600" />
            <span>ផ្ទាំងនាយកសាលា / លេខា (ឃ្លាំងវិញ្ញាសា, ស្កែន OMR, កំណត់កូដ និងទាញយកពិន្ទុ)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Access Code Prompt Modal */}
      <AnimatePresence>
        {promptTarget && (
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
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    promptTarget === 'teacher' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900">
                      {promptTarget === 'teacher' ? 'បញ្ចូលលេខកូដបង្កើតតេស្ដ' : 'បញ្ចូលលេខកូដតេស្ដសិស្ស'}
                    </h3>
                    <p className="text-xs text-slate-500">លេខកូដដែលនាយកសាលាបានកំណត់ឱ្យ</p>
                  </div>
                </div>
                <button
                  onClick={() => setPromptTarget(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <div className="relative">
                    <input
                      type={showCode ? 'text' : 'password'}
                      autoFocus
                      value={enteredCode}
                      onChange={(e) => { setEnteredCode(e.target.value); setError(null); }}
                      placeholder="បញ្ចូលលេខកូដ..."
                      className="w-full pl-4 pr-10 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCode(!showCode)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {error && <p className="text-xs text-rose-600 font-semibold mt-2">{error}</p>}
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setPromptTarget(null)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl cursor-pointer"
                  >
                    បោះបង់
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 py-3 text-white text-sm font-bold rounded-xl shadow-md cursor-pointer ${
                      promptTarget === 'teacher'
                        ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                    }`}
                  >
                    ចូលប្រើប្រាស់
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
