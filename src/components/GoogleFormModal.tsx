import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, ExternalLink, Globe, FileCode, Layout, Sparkles, BookOpen, Clock, HelpCircle, ArrowRight, Play, Settings } from 'lucide-react';

interface GoogleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  gsCode: string;
  htmlCode: string;
  googleFormCode: string;
}

export const GoogleFormModal = ({ isOpen, onClose, gsCode, htmlCode, googleFormCode }: GoogleFormModalProps) => {
  const [activeMode, setActiveMode] = useState<'form' | 'webapp'>('form');
  const [activeTab, setActiveTab] = useState<'gs' | 'html'>('gs');
  const [copiedGs, setCopiedGs] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedForm, setCopiedForm] = useState(false);

  const handleCopyGs = () => {
    navigator.clipboard.writeText(gsCode);
    setCopiedGs(true);
    setTimeout(() => setCopiedGs(false), 2000);
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(htmlCode);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const handleCopyForm = () => {
    navigator.clipboard.writeText(googleFormCode);
    setCopiedForm(true);
    setTimeout(() => setCopiedForm(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            id="google-form-modal-container"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 font-sans">បង្កើតវិញ្ញាសាអនឡាញ (Google Form Quiz & Web App)</h3>
                  <p className="text-xs text-slate-400 font-medium">រៀបចំ និងនាំចេញទៅជាកិច្ចការផ្ទះ ឬតេស្តអនឡាញដ៏លឿន និងងាយស្រួល</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors" id="close-modal-btn">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Selector Tabs: Google Form vs Interactive Web App */}
            <div className="px-6 sm:px-8 pt-4 bg-slate-50/50 border-b border-slate-100 flex gap-4 shrink-0 overflow-y-hidden overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveMode('form')}
                className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                  activeMode === 'form'
                    ? 'border-emerald-500 text-emerald-700 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                id="tab-google-form"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span>១. Google Form Quiz (ងាយស្រួលបំផុត និងពេញនិយម) 🚀</span>
              </button>
              <button
                onClick={() => setActiveMode('webapp')}
                className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                  activeMode === 'webapp'
                    ? 'border-purple-500 text-purple-700 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                id="tab-interactive-webapp"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                <span>២. Interactive Web App (ជម្រើសកម្រិតខ្ពស់) ⚙️</span>
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 max-h-[60vh] custom-scrollbar">
              {activeMode === 'form' ? (
                /* Google Form Quiz Section */
                <div className="space-y-6 animate-fade-in" id="google-form-panel">
                  {/* Premium Notice banner */}
                  <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white shrink-0 flex items-center justify-center font-bold text-sm shadow-sm font-mono">i</div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-emerald-900">ហេតុអ្វីគួរជ្រើសរើស Google Form Quiz?</h4>
                      <p className="text-xs text-emerald-800 leading-relaxed font-semibold">
                        Google Form មានគុណសម្បត្តិធំបំផុតគឺ <b>រត់លឿនខ្លាំងលើទូរស័ព្ទដៃរបស់សិស្ស ទោះបីជាសេវាខ្សោយក៏ដោយ</b>។ សំណួរនីមួយៗរួមទាំង ចម្លើយត្រឹមត្រូវ ពិន្ទុ និងការពន្យល់លម្អិត នឹងត្រូវបញ្ចូលទៅក្នុង Google Drive របស់លោកគ្រូដោយស្វ័យប្រវត្តិតែម្ដង <b>(ពិសេសសំណួរផ្គូផ្គងនឹងបង្ហាញជាតារាងស្អាតគាប់ចិត្ត)</b>។
                      </p>
                    </div>
                  </div>

                  {/* 3 Step visual workflow */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-sans">
                      <div className="w-2 h-4 bg-emerald-500 rounded-full" />
                      របៀបបង្កើត Google Form Quiz (ងាយស្រួលបំផុត ៣ ជំហាន)
                    </h4>
                    
                    <div className="grid gap-4 sm:grid-cols-3">
                      {/* Step 1 */}
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between hover:border-emerald-200 transition-colors shadow-sm relative group">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs shadow-sm font-mono">1</span>
                            <h5 className="font-bold text-xs text-slate-800">ចម្លងកូដស្វ័យប្រវត្តិ</h5>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                            ចុចប៊ូតុងចម្លងពណ៌បៃតងនៅខាងក្រោម ដើម្បីទទួលបានកូដបង្កើត Google Form Quiz ស្វ័យប្រវត្តិ។
                          </p>
                        </div>
                        <button 
                          onClick={handleCopyForm}
                          className="mt-4 w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
                        >
                          {copiedForm ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedForm ? 'បានចម្លងរួចរាល់' : 'ចម្លងកូដ Form'}</span>
                        </button>
                      </div>

                      {/* Step 2 */}
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between hover:border-emerald-200 transition-colors shadow-sm relative group">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs shadow-sm font-mono">2</span>
                            <h5 className="font-bold text-xs text-slate-800">បើក Google Apps Script</h5>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                            ចុចប៊ូតុងបើក Google Apps Script ផ្ទាល់ រួចបង្កើតគម្រោងថ្មី <b>(New Project)</b>។
                          </p>
                        </div>
                        <a 
                          href="https://script.google.com/home/projects/create" 
                          target="_blank" 
                          rel="noreferrer"
                          className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
                        >
                          <span>បើក Apps Script ផ្ទាល់</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      {/* Step 3 */}
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between hover:border-emerald-200 transition-colors shadow-sm relative group">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs shadow-sm font-mono">3</span>
                            <h5 className="font-bold text-xs text-slate-800">ផាសកូដ និងចុច Run (▶️)</h5>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                            លុបកូដចាស់ៗចោល ផាសកូដថ្មីចូល រួចចុច Save 💾 ហើយចុច Runs ▶️ ដើម្បីទទួលបានលីង Google Form ខាងក្រោម!
                          </p>
                        </div>
                        <div className="mt-4 py-2 text-center text-[10px] text-slate-400 font-bold bg-slate-100 rounded-xl leading-relaxed">
                          លីងនឹងបង្ហាញក្នុង Execution Log! 🚀
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form script code showcase */}
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-2">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-2 h-4 bg-emerald-500 rounded-full" />
                          កូដបង្កើត Google Form Quiz (Google Form Script Code.gs)
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium">ចម្លង និងផាសកូដខាងក្រោមនេះ ទៅក្នុង Apps Script របស់អ្នក</p>
                      </div>
                      <button 
                        onClick={handleCopyForm}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                          copiedForm ? 'bg-emerald-500 text-white scale-98' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        } shadow-md shadow-emerald-600/10 active:scale-95`}
                        id="copy-form-btn"
                      >
                        {copiedForm ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedForm ? 'បានចម្លងកូដជោគជ័យ!' : 'ចម្លងកូដ Google Form Script'}</span>
                      </button>
                    </div>

                    <div className="relative group">
                      <pre className="bg-[#18181b] p-6 rounded-2xl text-[12px] text-zinc-300 font-mono overflow-y-auto max-h-60 custom-scrollbar border border-zinc-800 shadow-inner">
                        {googleFormCode}
                      </pre>
                      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#18181b] to-transparent pointer-events-none rounded-b-2xl" />
                    </div>
                  </div>
                </div>
              ) : (
                /* Interactive Web App Section (Secondary Choice) */
                <div className="space-y-6 animate-fade-in" id="webapp-panel">
                  <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-lg bg-purple-500 text-white shrink-0 flex items-center justify-center font-bold text-sm shadow-sm font-mono">i</div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-purple-900">តើអ្វីទៅជា Interactive Web App?</h4>
                      <p className="text-xs text-purple-800 leading-relaxed font-semibold">
                        ជម្រើសកម្រិតខ្ពស់សម្រាប់បង្កើតទំព័រវេបសាយផ្ទាល់ខ្លួន ដោយមាន <b>ម៉ោងកំណត់រាប់ថយក្រោយ (A4 Exam Countdown Layout)</b> និងប្រមូលទិន្នន័យសិស្សទុកក្នុង Google Sheet។ (តម្រូវឱ្យបង្កើតទាំងឯកសារ Code.gs និង Index.html ក្នុង Apps Script)។
                      </p>
                    </div>
                  </div>

                  {/* Step By Step Guide of Web App */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-2 h-4 bg-purple-500 rounded-full" />
                      របៀបដំឡើង និងដំណើរការ Web App
                    </h4>
                    <div className="grid gap-3">
                      {[
                        { step: 1, text: "ក្នុងផ្ទាំង Apps Script៖ លុបកូដចាស់ៗចោល រួចចម្លងកូដពីផ្ទាំង '1. Code.gs' ខាងក្រោមផាសចូល រួចចុច រក្សាទុក (💾)" },
                        { step: 2, text: "បង្កើតឯកសារ HTML ថ្មី៖ នៅខាងឆ្វេងចុចសញ្ញា '+' រួចរើសយក 'HTML' រួចដាក់ឈ្មោះវាថា 'Index'" },
                        { step: 3, text: "លុបកូដលំនាំដើមទាំងអស់ក្នុង Index.html ចោល រួចចម្លងកូដពី '2. Index.html' ខាងក្រោមផាសជំនួស រួចចុច Save 💾" },
                        { step: 4, text: "ចុចប៊ូតុង 'Deploy' (ខាងលើស្តាំ) រួចជ្រើសរើស 'New deployment' រួចជ្រើសរើសប្រភេទ 'Web app'" },
                        { step: 5, text: "កំណត់ 'Execute as' ៖ 'Me' និង 'Who has access' ៖ 'Anyone' រួចចុច 'Deploy' រង់ចាំទទួលតំណភ្ជាប់ Web App URL!" }
                      ].map((s) => (
                        <div key={s.step} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white transition-colors">
                          <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center shrink-0 font-bold text-purple-600 shadow-sm text-sm">{s.step}</div>
                          <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed pt-1">{s.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tab Separators for Web App Codes */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-2">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-2 h-4 bg-purple-500 rounded-full" />
                        កូដប្រភពសម្រាប់ Web App
                      </h4>
                      
                      <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0">
                        <button
                          onClick={() => setActiveTab('gs')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            activeTab === 'gs'
                              ? 'bg-purple-600 text-white shadow-md'
                              : 'text-slate-500 hover:text-slate-850 hover:bg-slate-200'
                          }`}
                        >
                          <FileCode className="w-3.5 h-3.5" />
                          <span>1. Code.gs (Logic)</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('html')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            activeTab === 'html'
                              ? 'bg-purple-600 text-white shadow-md'
                              : 'text-slate-500 hover:text-slate-850 hover:bg-slate-200'
                          }`}
                        >
                          <Layout className="w-3.5 h-3.5" />
                          <span>2. Index.html (UI)</span>
                        </button>
                      </div>
                    </div>

                    {/* Show code logic */}
                    {activeTab === 'gs' ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                          <span>កូដឯកសារ Code.gs សម្រាប់បញ្ជូនទិន្នន័យ</span>
                          <button 
                            onClick={handleCopyGs}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              copiedGs ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
                            }`}
                          >
                            {copiedGs ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedGs ? 'បានចម្លង!' : 'ចម្លងកូដ Code.gs'}</span>
                          </button>
                        </div>
                        <div className="relative group">
                          <pre className="bg-[#18181b] p-6 rounded-2xl text-[11px] text-zinc-300 font-mono overflow-x-auto max-h-52 custom-scrollbar border border-zinc-850">
                            {gsCode}
                          </pre>
                          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#18181b] to-transparent pointer-events-none rounded-b-2xl" />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                          <span>កូដឯកសារ Index.html សម្រាប់ចំណុចប្រទាក់សិស្ស (UI Layout)</span>
                          <button 
                            onClick={handleCopyHtml}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              copiedHtml ? 'bg-emerald-500 text-white shadow-emerald-500/10' : 'bg-slate-800 text-white hover:bg-slate-700'
                            }`}
                          >
                            {copiedHtml ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedHtml ? 'បានចម្លង!' : 'ចម្លងកូដ Index.html'}</span>
                          </button>
                        </div>
                        <div className="relative group">
                          <pre className="bg-[#18181b] p-6 rounded-2xl text-[11px] text-zinc-300 font-mono overflow-x-auto max-h-52 custom-scrollbar border border-zinc-850">
                            {htmlCode}
                          </pre>
                          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#18181b] to-transparent pointer-events-none rounded-b-2xl" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Sticky Container */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0 flex flex-col gap-4">
              {activeMode === 'form' ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <a 
                    href="https://script.google.com/home/projects/create" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/10 transition-all active:scale-95 text-sm"
                    id="sheets-launch-btn"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>បើក Google Apps Script ដើម្បីផាស់កូដ និងរត់ (▶️ Run) 🚀</span>
                  </a>
                  <button
                    onClick={handleCopyForm}
                    className="py-3.5 px-6 font-extrabold border border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-white rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 text-sm shrink-0"
                  >
                    {copiedForm ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedForm ? 'ចម្លងកូដរួច!' : 'ចម្លងកូដ Script យកទៅប្រើប្រាស់'}</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <a 
                    href="https://script.google.com/home/projects/create" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-extrabold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>បើក Google Apps Script ផ្ទាល់ ⚙️</span>
                  </a>
                  <button
                    onClick={handleCopyGs}
                    className="py-3.5 px-6 font-extrabold border border-slate-200 text-slate-700 hover:bg-slate-50 bg-white rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 text-sm shrink-0"
                  >
                    {copiedGs ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>ចម្លងកូដ Code.gs</span>
                  </button>
                </div>
              )}
              <div className="flex gap-2 items-start justify-center">
                <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-center text-[10px] sm:text-xs text-slate-400 max-w-2xl leading-relaxed">
                  គន្លឹះ៖ ពេលដំណើរការដំបូង Google នឹងសួរការអនុញ្ញាត (Permission) សូមចុច "Review Permissions" ជ្រើសរើស Gmail របស់អ្នក រួចចុច "Advanced" រួចជ្រើសរើស "Go to ... (Unsafe)" រួចចុច "Allow" ដើម្បីបញ្ចប់ការតំឡើង។
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
