import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  Download, 
  User, 
  Calendar, 
  Hash, 
  BookOpen, 
  Sparkles, 
  X, 
  Globe, 
  FileText, 
  CheckCircle2,
  QrCode,
  Info
} from 'lucide-react';
import html2canvas from 'html2canvas';

interface StudentOmrSheetProps {
  questionCount: number;
  answerType: 'ABCD' | 'KHKK';
  testTitle: string;
  onBackToTeacher?: () => void;
}

export function StudentOmrSheet({ questionCount, answerType, testTitle, onBackToTeacher }: StudentOmrSheetProps) {
  // Student Metadata state
  const [studentName, setStudentName] = useState<string>('');
  const [studentGrade, setStudentGrade] = useState<string>('');
  const [studentSeat, setStudentSeat] = useState<string>('');
  const [studentDate, setStudentDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // Student Answers state: Map of questionNumber -> selectedOption (A, B, C, D)
  const [studentAnswers, setStudentAnswers] = useState<{ [key: number]: string }>({});
  const [isGeneratingPng, setIsGeneratingPng] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const printableSheetRef = useRef<HTMLDivElement>(null);

  // Helper: Convert option to Khmer letter (A,B,C,D -> ក,ខ,គ,ឃ)
  const getKhmerLetter = (letter: string) => {
    if (answerType === 'ABCD') return letter;
    const map: { [key: string]: string } = { 'A': 'ក', 'B': 'ខ', 'C': 'គ', 'D': 'ឃ' };
    return map[letter] || letter;
  };

  // Handle toggle selection of a bubble
  const handleSelectBubble = (questionNumber: number, option: string) => {
    setStudentAnswers(prev => {
      const updated = { ...prev };
      if (updated[questionNumber] === option) {
        delete updated[questionNumber]; // Toggle off if clicked same
      } else {
        updated[questionNumber] = option; // Select option
      }
      return updated;
    });
  };

  // Download completed OMR sheet as PNG (Looks identical to printed, with details and colored bubbles)
  const handleDownloadCompletedPNG = async () => {
    if (!printableSheetRef.current) return;
    setIsGeneratingPng(true);
    try {
      // Small timeout to ensure styling registers
      await new Promise(resolve => setTimeout(resolve, 300));
      const element = printableSheetRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution for OMR scanning
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      const cleanTitle = testTitle.replace(/\s+/g, '_');
      const cleanName = studentName ? studentName.replace(/\s+/g, '_') : 'សិស្ស';
      const filename = `សន្លឹកចម្លើយ_OMR_${cleanName}_${cleanTitle}_${questionCount}_សំណួរ.png`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error generating completed student OMR PNG:', err);
      alert('មានបញ្ហាក្នុងការទាញយករូបភាព។ សូមព្យាយាមម្ដងទៀត!');
    } finally {
      setIsGeneratingPng(false);
    }
  };

  // Compile responses into a compact QR Code payload for the teacher
  const handleShowQrCode = () => {
    const data = {
      n: studentName || 'Unknown Student',
      g: studentGrade || 'Unknown Grade',
      s: studentSeat || 'Unknown Seat',
      d: studentDate,
      a: studentAnswers,
      t: testTitle,
      c: questionCount,
      at: answerType
    };
    const jsonStr = JSON.stringify(data);
    const encoded = encodeURIComponent(jsonStr);
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`;
    setQrCodeUrl(url);
    setShowQrModal(true);
  };

  const getCompletedCount = () => {
    return Object.keys(studentAnswers).length;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none pb-24">
      {/* Dynamic Background Blur effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation / Header for Student */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/25">
            <Globe className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-black text-white">សន្លឹកចម្លើយ OMR អនឡាញ (Online OMR Sheet)</h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">សិស្សអាចបំពេញ និងផាត់ចម្លើយបានផ្ទាល់នៅលើទូរស័ព្ទដៃ</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onBackToTeacher && (
            <button
              onClick={onBackToTeacher}
              className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              ត្រឡប់ទៅផ្ទាំងគ្រូ
            </button>
          )}
          <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            ACTIVE STUDENT
          </span>
        </div>
      </header>

      {/* Interactive Form & Canvas Sheet Area */}
      <div className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* Left Side: Student Form & Live Interactive Controls (7 columns) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Info Card */}
          <div className="bg-slate-800/85 border border-slate-700/60 rounded-3xl p-5 shadow-xl space-y-3">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400 shrink-0" />
              {testTitle}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              សូមលោកអ្នកបំពេញព័ត៌មានខាងក្រោម រួចជ្រើសរើសចម្លើយសម្រាប់សំនួរនីមួយៗដោយគ្រាន់តែចុចលើអក្សរ <span className="font-bold text-blue-400">({answerType === 'ABCD' ? 'A, B, C, D' : 'ក, ខ, គ, ឃ'})</span>។ បន្ទាប់មក ចុចប៊ូតុង <span className="font-bold text-emerald-400">"ទាញយកសន្លឹក OMR"</span> ដើម្បីផ្ញើឱ្យគ្រូបង្រៀន!
            </p>
          </div>

          {/* Metadata Inputs */}
          <div className="bg-slate-800/85 border border-slate-700/60 rounded-3xl p-6 shadow-xl space-y-5">
            <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-700/50 pb-3">
              <User className="w-4 h-4" />
              ព័ត៌មានផ្ទាល់ខ្លួនសិស្ស (Student Identity)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 block">ឈ្មោះសិស្ស (Student Name)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="ឧ. សុខ វីរៈ"
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 block">ថ្នាក់ទី (Grade / Class)</label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={studentGrade}
                    onChange={(e) => setStudentGrade(e.target.value)}
                    placeholder="ឧ. ១២អា១"
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 block">លេខតុ / លេខបន្ទប់ (Seat / Room)</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={studentSeat}
                    onChange={(e) => setStudentSeat(e.target.value)}
                    placeholder="ឧ. ០៥"
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 block">កាលបរិច្ឆេទ (Date)</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="date"
                    value={studentDate}
                    onChange={(e) => setStudentDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Guidelines Box */}
          <div className="bg-slate-800/40 border border-slate-700/30 p-4.5 rounded-2xl flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-400 leading-relaxed">
              <span className="font-bold text-slate-300 block mb-1">✍ របៀបឆ្លើយសន្លឹក OMR អនឡាញ៖</span>
              ចុចលើអក្សរចម្លើយដើម្បីផាត់។ ប្រសិនបើចង់ផ្លាស់ប្ដូរចម្លើយ គ្រាន់តែចុចលើអក្សរចម្លើយថ្មីជាការស្រេច។ ចុចម្ដងទៀតដើម្បីលុបចោលវិញ (Deselect)។
            </div>
          </div>

          {/* Interactive Bubble Sheet Grid */}
          <div className="bg-slate-800/85 border border-slate-700/60 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
              <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4" />
                ជ្រើសរើសចម្លើយ ({getCompletedCount()} / {questionCount})
              </h3>
              <span className="text-[11px] font-bold text-slate-400">
                ឆ្លើយរួច {((getCompletedCount() / questionCount) * 100).toFixed(0)}%
              </span>
            </div>

            {/* Bubble Rows */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5 max-h-[500px] overflow-y-auto p-1 pr-2">
              {Array.from({ length: questionCount }, (_, i) => {
                const qNum = i + 1;
                const activeAns = studentAnswers[qNum];
                
                return (
                  <div 
                    key={qNum}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                      activeAns 
                        ? 'bg-blue-600/10 border-blue-500/40' 
                        : 'bg-slate-900/30 border-slate-700/40'
                    }`}
                  >
                    <span className="text-xs font-extrabold text-slate-300">សំណួរ {qNum}</span>
                    
                    <div className="flex gap-2.5">
                      {['A', 'B', 'C', 'D'].map((opt) => {
                        const isSelected = activeAns === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => handleSelectBubble(qNum, opt)}
                            className={`w-8 h-8 rounded-full border-2 font-black text-xs flex items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white border-white text-slate-950 scale-110 shadow-lg shadow-white/10'
                                : 'bg-slate-950/60 border-slate-600 text-slate-400 hover:border-slate-400 hover:text-white'
                            }`}
                          >
                            {getKhmerLetter(opt)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Printable OMR Sheet Preview & Actions (5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Quick Stats & Action Portal */}
          <div className="bg-gradient-to-tr from-slate-800 to-slate-850 border border-slate-700/60 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">ជម្រើសបញ្ជូនចម្លើយ (Submit Actions)</h3>
            
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={handleDownloadCompletedPNG}
                disabled={isGeneratingPng}
                className="w-full py-4.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-700 disabled:to-slate-700 disabled:opacity-40 text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-500/10 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>{isGeneratingPng ? 'កំពុងបង្កើតរូបភាព...' : 'ទាញយកសន្លឹក OMR (ជា PNG)'}</span>
              </button>

              <button
                onClick={handleShowQrCode}
                className="w-full py-3 border border-slate-700 bg-slate-900/60 hover:bg-slate-900 text-slate-300 hover:text-white font-bold text-xs rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-blue-500" />
                <span>បង្ហាញ QR Code សម្រាប់គ្រូស្កែន</span>
              </button>
            </div>
          </div>

          {/* COMPLIANT PRINTABLE TEMPLATE CANVAS PREVIEW */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">សន្លឹក OMR ត្រៀមទាញយក (Compliant Grader Sheet)</h3>
            
            {/* Wrapper with hidden scale and scrolling on mobile, but beautiful card */}
            <div className="border border-slate-700/60 rounded-3xl bg-white text-slate-950 p-1.5 shadow-2xl overflow-hidden relative">
              
              {/* Overlay blocker to avoid student changing canvas values directly outside interactive row */}
              <div className="absolute inset-0 bg-transparent z-10 pointer-events-none" />

              {/* High precision printable container used by html2canvas */}
              <div 
                ref={printableSheetRef}
                className="bg-white p-8 relative mx-auto select-none overflow-hidden text-slate-950 font-sans"
                style={{ width: '100%', minWidth: '400px', maxWidth: '450px' }}
              >
                {/* OMR Alignment Target Borders */}
                <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-black"></div>
                <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-black"></div>
                <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-black"></div>
                <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-black"></div>

                {/* Print watermark/ID info */}
                <div className="text-center text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                  សន្លឹកចម្លើយ OMR ស្វ័យប្រវត្តិ • DIGITAL OMR GRADED SHEET
                </div>

                {/* Header Information */}
                <div className="flex justify-between items-start border-b-2 border-black pb-3 mb-4">
                  <div className="text-left space-y-1">
                    <h2 className="text-sm font-black tracking-tight text-slate-950 leading-tight">សន្លឹកចម្លើយស្កែន OMR (AI OMR SHEET)</h2>
                    <p className="text-[10px] text-slate-700 font-bold">វិញ្ញាសា៖ {testTitle}</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider">
                      ចំនួន៖ {questionCount} សំណួរ ({answerType === 'ABCD' ? 'A-B-C-D' : 'ក-ខ-គ-ឃ'})
                    </p>
                  </div>
                  
                  {/* Decorative QR Identifier for alignment/grade */}
                  <div className="flex flex-col items-center justify-center border border-slate-300 p-1 rounded bg-slate-50 shrink-0">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent('STUDENT-' + testTitle)}`} 
                      alt="ID" 
                      className="w-10 h-10"
                      referrerPolicy="no-referrer"
                    />
                    <span className="font-mono text-[6px] font-bold text-slate-800 mt-0.5">STUDENT</span>
                  </div>
                </div>

                {/* Student Metadata Printed Content */}
                <div className="grid grid-cols-2 gap-2 p-2.5 border border-slate-400 rounded-lg bg-slate-50/50 mb-4 text-[9px] font-bold text-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-slate-500 text-[8px]">ឈ្មោះសិស្ស (Student Name)៖</span>
                    <div className="border-b border-dashed border-slate-400 h-5 flex items-center text-slate-950 pl-1">
                      {studentName || '...........................................'}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-500 text-[8px]">ថ្នាក់ទី (Grade/Class)៖</span>
                    <div className="border-b border-dashed border-slate-400 h-5 flex items-center text-slate-950 pl-1">
                      {studentGrade || '...........................................'}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-500 text-[8px]">លេខតុ/បន្ទប់ (Seat/Room)៖</span>
                    <div className="border-b border-dashed border-slate-400 h-5 flex items-center text-slate-950 pl-1">
                      {studentSeat || '...........................................'}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-500 text-[8px]">កាលបរិច្ឆេទ (Date)៖</span>
                    <div className="border-b border-dashed border-slate-400 h-5 flex items-center text-slate-950 pl-1">
                      {studentDate || '...........................................'}
                    </div>
                  </div>
                </div>

                {/* Grid of Shaded/Colored Bubbles (Matches layout of print template) */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4 max-h-[300px] overflow-hidden">
                  {Array.from({ length: questionCount }, (_, i) => {
                    const qNum = i + 1;
                    const selected = studentAnswers[qNum];
                    return (
                      <div 
                        key={qNum} 
                        className="flex items-center justify-between border-b border-slate-100 pb-1 text-[9px]"
                      >
                        <span className="font-bold text-slate-800">សំណួរ {qNum} ៖</span>
                        
                        <div className="flex gap-2">
                          {['A', 'B', 'C', 'D'].map((opt) => {
                            const isSelected = selected === opt;
                            return (
                              <div key={opt} className="flex flex-col items-center">
                                {/* If selected, fill circle with solid dark color, else white border */}
                                <div className={`w-4 h-4 rounded-full border border-slate-950 flex items-center justify-center text-[7px] font-black select-none ${
                                  isSelected 
                                    ? 'bg-slate-950 text-white' 
                                    : 'bg-white text-slate-900'
                                }`}>
                                  {getKhmerLetter(opt)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer Watermark */}
                <div className="border-t border-slate-200 pt-3 text-[7px] text-slate-400 text-center flex justify-between items-center italic">
                  <span>ប្រព័ន្ធ OMR អនឡាញ - AI Khmer Grader (Gemini 3.5-Flash)</span>
                  <span className="font-mono text-[6px]">DIGITAL SHEET #{questionCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SUCCESS DOWNLOAD MODAL */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full text-center relative shadow-2xl"
            >
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-black text-white">ទាញយកសន្លឹកចម្លើយ OMR ជោគជ័យ!</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                សន្លឹកចម្លើយ OMR របស់អ្នកត្រូវបានទាញយកជាជោគជ័យទៅក្នុងឧបករណ៍របស់អ្នករួចរាល់ហើយ។ សូមផ្ញើរូបភាពសន្លឹកចម្លើយនេះទៅកាន់លោកគ្រូ/អ្នកគ្រូរបស់អ្នកដើម្បីស្កែនកែពិន្ទុ!
              </p>

              <div className="mt-6">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  យល់ព្រម
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR CODE MODAL FOR TEACHER TO SCAN */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full text-center relative shadow-2xl"
            >
              <button
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                  <QrCode className="w-6 h-6 animate-pulse" />
                </div>
                
                <div>
                  <h3 className="text-lg font-black text-white">QR Code ចម្លើយសិស្ស</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    បង្ហាញ QR Code នេះនៅលើអេក្រង់ទូរសព្ទរបស់អ្នក ដើម្បីឱ្យលោកគ្រូ/អ្នកគ្រូស្កែនយកចម្លើយរបស់អ្នកភ្លាមៗ!
                  </p>
                </div>

                {/* QR Code Frame */}
                <div className="flex flex-col items-center justify-center bg-slate-950/40 border border-slate-850 p-4 rounded-2xl">
                  {qrCodeUrl && (
                    <img
                      src={qrCodeUrl}
                      alt="Student Response QR"
                      className="w-48 h-48 rounded-xl shadow-inner bg-white p-3 border border-slate-100"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <span className="text-[10px] text-blue-400 font-bold mt-3 uppercase tracking-widest">
                    {studentName || 'Unknown Student'} • {getCompletedCount()} ANSWERS
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setShowQrModal(false)}
                    className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    បិទ
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
