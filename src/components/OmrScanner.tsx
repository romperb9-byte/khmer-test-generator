import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Printer, 
  RefreshCw, 
  Download, 
  History, 
  Plus, 
  Trash2, 
  Edit2, 
  Eye, 
  Check, 
  FileSpreadsheet, 
  Sparkles, 
  BookOpen, 
  User, 
  Hash, 
  Calendar, 
  ArrowLeft,
  ChevronRight,
  Info,
  X,
  FlipHorizontal,
  Settings2,
  Globe,
  FileText
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { gradeOmrSheet, OmrAnswerKeyItem, OmrGradingResult, OmrGradedAnswer } from '../services/geminiService';
import { GeneratedTest, QuestionType } from '../types';

interface OmrScannerProps {
  currentTest: GeneratedTest | null;
  onBack: () => void;
}

interface SavedStudentResult {
  id: string;
  studentName: string;
  studentId: string;
  grade: string;
  score: number;
  totalQuestions: number;
  gradedAnswers: OmrGradedAnswer[];
  teacherFeedback: string;
  scannedImage: string;
  dateGraded: string;
}

export function OmrScanner({ currentTest, onBack }: OmrScannerProps) {
  // State for Answer Key
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [answerKey, setAnswerKey] = useState<OmrAnswerKeyItem[]>([]);
  const [answerType, setAnswerType] = useState<'ABCD' | 'KHKK'>('ABCD'); // ABCD or កខគឃ
  const [sheetCount, setSheetCount] = useState<number>(1);
  
  // Tab control: 'scan' | 'key' | 'printable' | 'history'
  const [activeTab, setActiveTab] = useState<'scan' | 'key' | 'printable' | 'history'>('scan');
  
  // Camera & Image capture
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  // Grading process
  const [isGrading, setIsGrading] = useState<boolean>(false);
  const [gradingResult, setGradingResult] = useState<OmrGradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditingMetadata, setIsEditingMetadata] = useState<boolean>(false);
  const [editedName, setEditedName] = useState<string>('');
  const [editedId, setEditedId] = useState<string>('');
  const [editedGrade, setEditedGrade] = useState<string>('');

  // History
  const [savedResults, setSavedResults] = useState<SavedStudentResult[]>(() => {
    const saved = localStorage.getItem('khmer_omr_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [shareSuccessMessage, setShareSuccessMessage] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Check URL hash for shared OMR configuration
  useEffect(() => {
    const checkSharedKey = () => {
      try {
        const hash = window.location.hash;
        if (hash.startsWith('#share-omr=') || hash.startsWith('#teacher-import=')) {
          const prefix = hash.startsWith('#share-omr=') ? '#share-omr=' : '#teacher-import=';
          const base64Data = hash.substring(prefix.length);
          const binaryStr = atob(base64Data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const decodedString = new TextDecoder().decode(bytes);
          const parsed = JSON.parse(decodedString);
          
          if (parsed && typeof parsed.questionCount === 'number' && Array.isArray(parsed.answerKey)) {
            setQuestionCount(parsed.questionCount);
            setAnswerKey(parsed.answerKey);
            if (parsed.answerType) {
              setAnswerType(parsed.answerType);
            }
            let msg = 'បានទាញយកសោចម្លើយ OMR ជោគជ័យតាមរយៈតំណភ្ជាប់ចែករំលែក!';
            if (parsed.testTitle) {
              msg = `បានទាញយកសោចម្លើយ OMR សម្រាប់ «${parsed.testTitle}» ជោគជ័យតាមរយៈតំណភ្ជាប់ចែករំលែក!`;
            }
            setShareSuccessMessage(msg);
            
            // Clean hash to avoid repeating
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        }
      } catch (e) {
        console.error('Error decoding shared OMR key:', e);
      }
    };
    
    checkSharedKey();
  }, []);

  const handleGenerateShareLink = () => {
    try {
      const dataToEncode = {
        questionCount,
        answerType,
        answerKey,
        testTitle: currentTest?.title || 'OMR Quiz'
      };
      const jsonStr = JSON.stringify(dataToEncode);
      const utf8Bytes = new TextEncoder().encode(jsonStr);
      let binaryStr = '';
      for (let i = 0; i < utf8Bytes.length; i++) {
        binaryStr += String.fromCharCode(utf8Bytes[i]);
      }
      const base64Data = btoa(binaryStr);
      const url = `${window.location.origin}${window.location.pathname}#share-omr=${base64Data}`;
      setShareUrl(url);
      setShowShareModal(true);
      setCopiedLink(false);
    } catch (e) {
      console.error('Error generating share link:', e);
      setError('មានបញ្ហាក្នុងការបង្កើតតំណភ្ជាប់ចែករំលែក។');
    }
  };
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Answer Key from Current Test or Default
  useEffect(() => {
    if (currentTest && currentTest.questions && currentTest.questions.length > 0) {
      // Filter multiple choice & true-false questions
      const mcQuestions = currentTest.questions.filter(
        q => q.type === QuestionType.MULTIPLE_CHOICE || q.type === QuestionType.TRUE_FALSE
      );

      if (mcQuestions.length > 0) {
        const keyItems: OmrAnswerKeyItem[] = mcQuestions.map((q, idx) => {
          let ansStr = '';
          if (typeof q.answer === 'string') {
            ansStr = q.answer.trim().toUpperCase();
          }
          // Normalize to A, B, C, D
          if (ansStr === 'ក' || ansStr === 'A') ansStr = 'A';
          else if (ansStr === 'ខ' || ansStr === 'B') ansStr = 'B';
          else if (ansStr === 'គ' || ansStr === 'C') ansStr = 'C';
          else if (ansStr === 'ឃ' || ansStr === 'D') ansStr = 'D';
          else ansStr = 'A'; // Fallback

          return {
            questionNumber: idx + 1,
            correctAnswer: ansStr
          };
        });
        setAnswerKey(keyItems);
        setQuestionCount(keyItems.length);
        return;
      }
    }

    // Default template (10 questions)
    generateDefaultKey(10);
  }, [currentTest]);

  const generateDefaultKey = (count: number) => {
    const defaultOptions = ['A', 'B', 'C', 'D'];
    const keyItems: OmrAnswerKeyItem[] = Array.from({ length: count }, (_, i) => ({
      questionNumber: i + 1,
      correctAnswer: defaultOptions[i % 4]
    }));
    setAnswerKey(keyItems);
    setQuestionCount(count);
  };

  const handleKeyOptionChange = (questionNumber: number, answer: string) => {
    setAnswerKey(prev => prev.map(item => 
      item.questionNumber === questionNumber ? { ...item, correctAnswer: answer } : item
    ));
  };

  const handleQuestionCountChange = (count: number) => {
    if (count < 1) return;
    setQuestionCount(count);
    setAnswerKey(prev => {
      if (count > prev.length) {
        const defaultOptions = ['A', 'B', 'C', 'D'];
        const extra = Array.from({ length: count - prev.length }, (_, i) => ({
          questionNumber: prev.length + i + 1,
          correctAnswer: defaultOptions[(prev.length + i) % 4]
        }));
        return [...prev, ...extra];
      } else {
        return prev.slice(0, count);
      }
    });
  };

  // Camera handling
  const getCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameraDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Error listing cameras:', err);
    }
  };

  const startCamera = async (deviceId: string) => {
    stopCamera();
    setIsCameraLoading(true);
    setError(null);
    try {
      const constraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error starting camera:', err);
      setError('មិនអាចបើកកាមេរ៉ាបានទេ។ សូមប្រាកដថាអ្នកបានអនុញ្ញាតសិទ្ធិប្រើប្រាស់កាមេរ៉ា!');
    } finally {
      setIsCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'scan' && !capturedImage) {
      getCameras();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab, capturedImage]);

  useEffect(() => {
    if (selectedCameraId && activeTab === 'scan' && !capturedImage) {
      startCamera(selectedCameraId);
    }
  }, [selectedCameraId, activeTab, capturedImage]);

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setCapturedImage(reader.result as string);
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  // Grade scanned image
  const handleGradeOmr = async () => {
    if (!capturedImage) return;

    setIsGrading(true);
    setError(null);
    setGradingResult(null);

    try {
      // Map Answer Key to service input format
      const finalKey = answerKey.map(item => ({
        questionNumber: item.questionNumber,
        correctAnswer: item.correctAnswer
      }));

      const result = await gradeOmrSheet(capturedImage, finalKey);
      setGradingResult(result);
      
      // Initialize edit fields
      setEditedName(result.studentName);
      setEditedId(result.studentId);
      setEditedGrade(result.grade);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'មានបញ្ហាបច្ចេកទេសក្នុងការកែសន្លឹក OMR។ សូមព្យាយាមម្ដងទៀត!');
    } finally {
      setIsGrading(false);
    }
  };

  const handleSaveResult = () => {
    if (!gradingResult || !capturedImage) return;

    const newResult: SavedStudentResult = {
      id: Date.now().toString(),
      studentName: editedName || gradingResult.studentName,
      studentId: editedId || gradingResult.studentId,
      grade: editedGrade || gradingResult.grade,
      score: gradingResult.score,
      totalQuestions: gradingResult.totalQuestions,
      gradedAnswers: gradingResult.detectedAnswers,
      teacherFeedback: gradingResult.teacherFeedback,
      scannedImage: capturedImage,
      dateGraded: new Date().toLocaleString('kh-KH', { dateStyle: 'medium', timeStyle: 'short' })
    };

    const updatedHistory = [newResult, ...savedResults];
    setSavedResults(updatedHistory);
    localStorage.setItem('khmer_omr_history', JSON.stringify(updatedHistory));
    
    // Clear current scanning screen and go to history tab
    setCapturedImage(null);
    setGradingResult(null);
    setActiveTab('history');
  };

  const handleDeleteSavedResult = (id: string) => {
    const updated = savedResults.filter(item => item.id !== id);
    setSavedResults(updated);
    localStorage.setItem('khmer_omr_history', JSON.stringify(updated));
  };

  const handleClearHistory = () => {
    if (window.confirm('តើអ្នកពិតជាចង់លុបប្រវត្តិនៃការស្កែនទាំងអស់មែនទេ?')) {
      setSavedResults([]);
      localStorage.removeItem('khmer_omr_history');
    }
  };

  const exportHistoryToCSV = () => {
    if (savedResults.length === 0) return;

    // Build CSV Content
    let csvContent = '\ufeff'; // UTF-8 BOM
    csvContent += 'ល.រ,ឈ្មោះសិស្ស,អត្តសញ្ញាណប័ណ្ណ,ថ្នាក់ទី,ពិន្ទុ,ចំនួនសំណួរ,ភាគរយ,កាលបរិច្ឆេទកែ\n';

    savedResults.forEach((res, idx) => {
      const pct = ((res.score / res.totalQuestions) * 100).toFixed(1) + '%';
      const row = [
        idx + 1,
        `"${res.studentName.replace(/"/g, '""')}"`,
        `"${res.studentId.replace(/"/g, '""')}"`,
        `"${res.grade.replace(/"/g, '""')}"`,
        res.score,
        res.totalQuestions,
        pct,
        `"${res.dateGraded}"`
      ].join(',');
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `តារាងលទ្ធផល_OMR_${new Date().toLocaleDateString('kh-KH')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sample OMR grader function to try out without a physical image
  const handleTrySample = () => {
    setCapturedImage('SAMPLE_IMAGE');
    setIsGrading(true);
    
    // Simulate grading after 1.5s
    setTimeout(() => {
      const mockResult: OmrGradingResult = {
        studentName: "សុខ វីរៈ",
        studentId: "023",
        grade: "ថ្នាក់ទី ១២អា១",
        score: Math.floor(questionCount * 0.8),
        totalQuestions: questionCount,
        detectedAnswers: answerKey.map((item, idx) => {
          const isCorrect = idx % 5 !== 0; // 80% correct
          const studentAns = isCorrect 
            ? item.correctAnswer 
            : (item.correctAnswer === 'A' ? 'B' : 'A');
          return {
            questionNumber: item.questionNumber,
            detectedMark: studentAns,
            isCorrect: isCorrect,
            correctAnswer: item.correctAnswer
          };
        }),
        teacherFeedback: "សូមចូលរួមអបអរសាទរ! សិស្ស សុខ វីរៈ ទទួលបានលទ្ធផលល្អប្រសើរខ្លាំងណាស់ក្នុងការប្រឡងនេះ។ ប្អូនយល់ដឹងច្បាស់ពីមេរៀន និងបង្ហាញភាពវៃឆ្លាតក្នុងការឆ្លើយ។ សូមបន្តការខិតខំប្រឹងប្រែងនេះ ដើម្បីឆ្ពោះទៅរកភាពជោគជ័យបន្ថែមទៀត!"
      };
      setGradingResult(mockResult);
      setEditedName(mockResult.studentName);
      setEditedId(mockResult.studentId);
      setEditedGrade(mockResult.grade);
      setIsGrading(false);
    }, 1500);
  };

  // Word document download function
  const handleDownloadWord = () => {
    const title = currentTest?.title || 'វិញ្ញាសា OMR';
    
    let html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>\${title}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Battambang:wght@400;700&family=Moul&display=swap');
          
          body {
            font-family: "Battambang", "Khmer OS Battambang", "Segoe UI", Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #1e293b;
            margin: 0.8in;
          }
          h1, h2 {
            font-family: "Moul", "Khmer OS Muol Light", "Segoe UI Semibold", Arial, sans-serif;
            color: #0f172a;
            margin: 0 0 5px 0;
          }
          .alignment-corners {
            width: 100%;
            border-collapse: collapse;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            border-bottom: 2.5pt double #0f172a;
            margin-bottom: 15px;
            padding-bottom: 10px;
          }
          .student-info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            border: 1.5px solid #cbd5e1;
            background-color: #f8fafc;
          }
          .student-info-table td {
            padding: 8px 12px;
            border: 1px solid #cbd5e1;
            font-size: 9.5pt;
            color: #334155;
          }
          .instructions-box {
            background-color: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 15px;
            margin-bottom: 20px;
            font-size: 9pt;
            color: #475569;
          }
          .grid-table {
            width: 100%;
            border-collapse: collapse;
          }
          .grid-column-cell {
            vertical-align: top;
            width: 33%;
          }
          .question-row {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
          }
          .question-number {
            font-weight: bold;
            font-size: 9.5pt;
            color: #1e293b;
            width: 65px;
            vertical-align: middle;
          }
          .bubble-container {
            width: 25px;
            text-align: center;
            vertical-align: middle;
          }
          .bubble-circle {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 1.5px solid #0f172a;
            text-align: center;
            line-height: 20px;
            font-size: 8pt;
            font-weight: bold;
            color: #0f172a;
            background-color: #ffffff;
            margin: auto;
          }
          .page-break {
            page-break-before: always;
          }
        </style>
      </head>
      <body>
    `;

    for (let s = 0; s < sheetCount; s++) {
      const sId = getSheetId(s);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=\${sId}`;
      
      if (s > 0) {
        html += `<div class="page-break"></div>`;
      }

      html += `
        <!-- Alignment corners top -->
        <table class="alignment-corners" style="margin-bottom: 10px;">
          <tr>
            <td style="width: 50%; text-align: left;">
              <div style="width: 18px; height: 18px; border-top: 3px solid #000000; border-left: 3px solid #000000;"></div>
            </td>
            <td style="text-align: center; font-size: 8pt; color: #64748b; font-weight: bold;">
              សន្លឹកទី \${s + 1} នៃ \${sheetCount} &bull; OMR SHEET TEMPLATE
            </td>
            <td style="width: 50%; text-align: right;">
              <div style="width: 18px; height: 18px; border-top: 3px solid #000000; border-right: 3px solid #000000; float: right; margin-left: auto;"></div>
            </td>
          </tr>
        </table>

        <!-- Main Header -->
        <table class="header-table">
          <tr>
            <td style="text-align: left; vertical-align: top; padding-bottom: 10px;">
              <h2 style="font-size: 13.5pt; font-weight: bold; margin: 0 0 5px 0;">សន្លឹកចម្លើយស្កែន OMR ស្វ័យប្រវត្តិ (AI OMR SHEET)</h2>
              <div style="font-size: 9.5pt; color: #475569; margin-bottom: 3px;"><strong>វិញ្ញាសា៖</strong> \${title}</div>
              <div style="font-size: 9pt; color: #475569;">
                <strong>ប្រភេទសំណួរ៖</strong> ជម្រើសពហុ (\${questionCount} សំណួរ)
              </div>
            </td>
            <td style="text-align: right; width: 110px; vertical-align: top; padding-bottom: 10px;">
              <table style="border: 1px solid #cbd5e1; background-color: #f8fafc; padding: 4px; border-radius: 4px; width: 100px; float: right;">
                <tr>
                  <td style="text-align: center; padding: 2px;">
                    <img src="\${qrUrl}" width="65" height="65" style="display: block; margin: auto;" alt="QR" />
                    <div style="font-family: monospace; font-size: 7.5pt; font-weight: bold; color: #0f172a; margin-top: 3px;">ID: \${sId}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Student Metadata -->
        <table class="student-info-table">
          <tr>
            <td style="width: 50%;">
              <strong>ឈ្មោះសិស្ស (Student Name)៖</strong>
              <div style="border-bottom: 1px dashed #94a3b8; height: 18px; margin-top: 5px;"></div>
            </td>
            <td style="width: 50%;">
              <strong>ថ្នាក់ទី (Grade/Class)៖</strong>
              <div style="border-bottom: 1px dashed #94a3b8; height: 18px; margin-top: 5px;"></div>
            </td>
          </tr>
          <tr>
            <td>
              <strong>លេខតុ/បន្ទប់ (Seat/Room)៖</strong>
              <div style="border-bottom: 1px dashed #94a3b8; height: 18px; margin-top: 5px;"></div>
            </td>
            <td>
              <strong>កាលបរិច្ឆេទ (Date)៖</strong>
              <div style="border-bottom: 1px dashed #94a3b8; height: 18px; margin-top: 5px;"></div>
            </td>
          </tr>
        </table>

        <!-- Instructions -->
        <div class="instructions-box">
          <strong>✍ ការណែនាំក្នុងការផាត់ចម្លើយ (Instructions for filling bubbles)៖</strong>
          <table style="width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 8.5pt; color: #475569;">
            <tr>
              <td style="width: 33%;">● ផាត់ខ្មៅឱ្យពេញរង្វង់ [ ត្រូវ ]</td>
              <td style="width: 33%;">✗ កុំឆូតសញ្ញាខ្វែង ឬធិក [ ខុស ]</td>
              <td style="width: 33%;">o កុំផាត់ចេញក្រៅរង្វង់ [ ខុស ]</td>
            </tr>
          </table>
        </div>

        <!-- OMR Grid Rows -->
        <table class="grid-table">
          <tr>
      `;

      // Split questions into columns
      const colsCount = questionCount > 24 ? 3 : (questionCount > 10 ? 2 : 1);
      const itemsPerCol = Math.ceil(questionCount / colsCount);
      const columns = [];
      for (let c = 0; c < colsCount; c++) {
        columns.push(answerKey.slice(c * itemsPerCol, (c + 1) * itemsPerCol));
      }

      columns.forEach((col, colIdx) => {
        const colWidth = Math.floor(100 / colsCount);
        html += `
          <td class="grid-column-cell" style="width: \${colWidth}%; padding-right: \${colIdx < colsCount - 1 ? '15px' : '0px'}; padding-left: \${colIdx > 0 ? '15px' : '0px'};">
        `;

        col.forEach((item) => {
          html += `
            <table class="question-row">
              <tr>
                <td class="question-number">សំណួរ \${item.questionNumber} ៖</td>
          `;

          ['A', 'B', 'C', 'D'].forEach((opt) => {
            html += `
              <td class="bubble-container">
                <div class="bubble-circle">\${getKhmerLetter(opt)}</div>
              </td>
            `;
          });

          html += `
              </tr>
            </table>
          `;
        });

        html += `
          </td>
        `;
      });

      html += `
          </tr>
        </table>

        <!-- Bottom Alignment Corners -->
        <table class="alignment-corners" style="margin-top: 30px;">
          <tr>
            <td style="width: 50%; text-align: left; vertical-align: bottom;">
              <div style="width: 18px; height: 18px; border-bottom: 3px solid #000000; border-left: 3px solid #000000;"></div>
            </td>
            <td style="text-align: center; font-size: 8pt; color: #94a3b8; font-style: italic; vertical-align: middle;">
              ប្រព័ន្ធវិនិច្ឆ័យសន្លឹក OMR - AI Khmer Grader &bull; ID: \${sId}
            </td>
            <td style="width: 50%; text-align: right; vertical-align: bottom;">
              <div style="width: 18px; height: 18px; border-bottom: 3px solid #000000; border-right: 3px solid #000000; float: right; margin-left: auto;"></div>
            </td>
          </tr>
        </table>
      `;
    }

    html += `
      </body>
      </html>
    `;

    // Trigger word download
    const blob = new Blob(['\\ufeff' + html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `សន្លឹកចម្លើយ_OMR_\${title.replace(/\\s+/g, '_')}_\${questionCount}_សំណួរ.doc`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [isDownloadingPng, setIsDownloadingPng] = useState<boolean>(false);

  // Download OMR sheet as PNG using html2canvas
  const handleDownloadPNG = async () => {
    if (!printContainerRef.current) return;
    setIsDownloadingPng(true);
    try {
      const element = printContainerRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // clean high-res output
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      const filename = `សន្លឹកចម្លើយ_OMR_${currentTest ? currentTest.title.replace(/\s+/g, '_') : 'គំរូ'}_${questionCount}_សំណួរ.png`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting OMR to PNG:', err);
      alert('មានបញ្ហាក្នុងការទាញយករូបភាព OMR។ សូមព្យាយាមម្ដងទៀត!');
    } finally {
      setIsDownloadingPng(false);
    }
  };

  // Convert A,B,C,D to Khmer letters ក,ខ,គ,ឃ
  const getKhmerLetter = (letter: string) => {
    if (answerType === 'ABCD') return letter;
    const map: { [key: string]: string } = { 'A': 'ក', 'B': 'ខ', 'C': 'គ', 'D': 'ឃ' };
    return map[letter] || letter;
  };

  const getSheetId = (index: number) => {
    let titleHash = 'OMR';
    if (currentTest && currentTest.title) {
      let hash = 0;
      for (let i = 0; i < currentTest.title.length; i++) {
        hash = (hash << 5) - hash + currentTest.title.charCodeAt(i);
        hash |= 0;
      }
      titleHash = Math.abs(hash).toString(16).substring(0, 4).toUpperCase();
    } else {
      titleHash = 'TEMP';
    }
    const padIndex = String(index + 1).padStart(3, '0');
    return `OMR-${titleHash}-${padIndex}`;
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden h-full">
      {/* Top action header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
            title="ត្រឡប់ក្រោយ"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              ប្រព័ន្ធស្កែន និងកែសន្លឹកចម្លើយ OMR ដោយ AI
            </h2>
            <p className="text-xs text-slate-500">
              {currentTest 
                ? `ភ្ជាប់ជាមួយវិញ្ញាសា៖ ${currentTest.title}` 
                : 'ស្កែន និងកែសន្លឹកចម្លើយ OMR ស្វ័យប្រវត្តិតាមរយៈកាមេរ៉ា ឬរូបភាព'
              }
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => { setActiveTab('scan'); setGradingResult(null); }}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'scan' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5 inline mr-1" />
            ស្កែនសន្លឹកចម្លើយ
          </button>
          <button
            onClick={() => setActiveTab('key')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'key' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5 inline mr-1" />
            កែសម្រួលគន្លឹះចម្លើយ ({answerKey.length})
          </button>
          <button
            onClick={() => setActiveTab('printable')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'printable' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Printer className="w-3.5 h-3.5 inline mr-1" />
            គំរូសន្លឹក OMR បោះពុម្ព
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5 inline mr-1" />
            ប្រវត្តិកែ ({savedResults.length})
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto h-full">
          {shareSuccessMessage && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center justify-between text-xs font-bold shadow-sm print:hidden">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-sm">
                  <Check className="w-4 h-4" />
                </div>
                <span>{shareSuccessMessage}</span>
              </div>
              <button 
                onClick={() => setShareSuccessMessage(null)}
                className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-600 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {currentTest && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm print:hidden">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md shrink-0">
                  <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    គន្លឹះចម្លើយ និងចំនួនសំណួរ OMR ត្រូវបានភ្ជាប់ជោគជ័យ
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    បានទាញយក និងកំណត់ដោយស្វ័យប្រវត្តិចេញពីវិញ្ញាសា៖ <span className="font-bold text-blue-600">{currentTest.title}</span> (មានចំនួន <span className="font-bold text-indigo-600">{questionCount} សំណួរ</span> ជម្រើសពហុ)។
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => {
                    const mcQuestions = currentTest.questions.filter(
                      q => q.type === QuestionType.MULTIPLE_CHOICE || q.type === QuestionType.TRUE_FALSE
                    );
                    if (mcQuestions.length > 0) {
                      handleQuestionCountChange(mcQuestions.length);
                      const keyItems: OmrAnswerKeyItem[] = mcQuestions.map((q, idx) => {
                        let ansStr = '';
                        if (typeof q.answer === 'string') ansStr = q.answer.trim().toUpperCase();
                        if (ansStr === 'ក' || ansStr === 'A') ansStr = 'A';
                        else if (ansStr === 'ខ' || ansStr === 'B') ansStr = 'B';
                        else if (ansStr === 'គ' || ansStr === 'C') ansStr = 'C';
                        else if (ansStr === 'ឃ' || ansStr === 'D') ansStr = 'D';
                        else ansStr = 'A';
                        return { questionNumber: idx + 1, correctAnswer: ansStr };
                      });
                      setAnswerKey(keyItems);
                    }
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  ធ្វើបច្ចុប្បន្នភាពចម្លើយឡើងវិញ
                </button>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            
            {/* SCANNING TAB */}
            {activeTab === 'scan' && (
              <motion.div 
                key="scan-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full"
              >
                {/* Left Side: Camera or Upload Container */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col min-h-[480px]">
                  <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      ទិដ្ឋភាពកាមេរ៉ាផ្ទាល់ (Live Scan Camera)
                    </span>
                    
                    {/* Camera selector if cameras available */}
                    {!capturedImage && cameraDevices.length > 1 && (
                      <select
                        value={selectedCameraId}
                        onChange={(e) => setSelectedCameraId(e.target.value)}
                        className="bg-slate-800 text-white text-xs px-2.5 py-1 rounded-lg border border-slate-700 outline-none cursor-pointer"
                      >
                        {cameraDevices.map((device, i) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            កាមេរ៉ា {i + 1} ({device.label ? device.label.slice(0, 15) : 'Device'})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Body camera arena */}
                  <div className="flex-1 bg-slate-950 relative flex items-center justify-center overflow-hidden min-h-[350px]">
                    {!capturedImage ? (
                      <>
                        {/* Video feedback */}
                        <video 
                          ref={videoRef}
                          autoPlay 
                          playsInline 
                          muted 
                          className="w-full h-full object-cover max-h-[500px]"
                        />

                        {/* Alignment Helper Overlay */}
                        <div className="absolute inset-0 border-[40px] border-slate-950/70 flex items-center justify-center pointer-events-none">
                          <div className="w-[85%] h-[85%] border-2 border-dashed border-blue-400/80 rounded-lg relative flex items-center justify-center">
                            {/* Corner marks */}
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
                            
                            <div className="text-[10px] text-blue-300 font-bold tracking-widest text-center px-4 py-2 bg-slate-900/90 rounded-md shadow-lg max-w-[280px]">
                              សូមដាក់សន្លឹក OMR ឱ្យស្មើនឹងតម្រង់នេះ
                            </div>
                          </div>
                        </div>

                        {/* Shutter overlay */}
                        {isCameraLoading && (
                          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-white">
                            <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                            <span className="text-xs">កំពុងបើកដំណើរការកាមេរ៉ា...</span>
                          </div>
                        )}
                      </>
                    ) : (
                      /* Display Captured Image */
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 relative bg-slate-900 max-h-[500px]">
                        {capturedImage === 'SAMPLE_IMAGE' ? (
                          <div className="w-full max-w-[320px] aspect-[3/4] bg-white rounded-xl shadow-2xl p-6 border border-slate-200 flex flex-col select-none relative overflow-hidden">
                            {/* Decorative background scan light effect */}
                            {isGrading && (
                              <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-500 shadow-[0_0_15px_#3b82f6] animate-[bounce_2s_infinite]"></div>
                            )}

                            {/* Blank test header */}
                            <div className="border-b border-slate-300 pb-3 mb-4 text-center">
                              <h4 className="text-xs font-bold text-slate-800">សន្លឹកចម្លើយគំរូ OMR</h4>
                              <p className="text-[9px] text-slate-500">សម្រាប់ការសាកល្បងប្រព័ន្ធ AI</p>
                              <div className="grid grid-cols-2 gap-1 mt-2 text-[8px] text-left text-slate-600 font-medium bg-slate-100 p-1.5 rounded border border-slate-200">
                                <div>ឈ្មោះ៖ សុខ វីរៈ</div>
                                <div>លេខតុ៖ 023</div>
                                <div className="col-span-2">ថ្នាក់ទី៖ ថ្នាក់ទី ១២អា១</div>
                              </div>
                            </div>
                            
                            {/* Bubbles preview list */}
                            <div className="flex-1 flex flex-col justify-between text-slate-700">
                              {answerKey.slice(0, 10).map((item, i) => {
                                const selectedLetter = i % 5 !== 0 ? item.correctAnswer : (item.correctAnswer === 'A' ? 'B' : 'A');
                                return (
                                  <div key={i} className="flex items-center justify-between text-[10px] border-b border-slate-100 py-0.5">
                                    <span className="font-bold text-slate-500">សំណួរ {item.questionNumber}</span>
                                    <div className="flex gap-2">
                                      {['A', 'B', 'C', 'D'].map(opt => {
                                        const isFilled = opt === selectedLetter;
                                        return (
                                          <div 
                                            key={opt}
                                            className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] ${
                                              isFilled 
                                                ? 'bg-slate-800 border-slate-800 text-white font-bold' 
                                                : 'border-slate-300 text-slate-400'
                                            }`}
                                          >
                                            {getKhmerLetter(opt)}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                              {answerKey.length > 10 && (
                                <div className="text-[9px] text-center text-slate-400 italic">... បង្ហាញត្រឹម ១០ សំណួរដំបូង ...</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <img 
                            src={capturedImage} 
                            alt="Captured OMR sheet" 
                            className="max-h-[420px] object-contain rounded-xl border border-slate-800 shadow-2xl"
                          />
                        )}
                        
                        <button
                          onClick={() => { setCapturedImage(null); setGradingResult(null); setError(null); }}
                          className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-colors active:scale-90"
                          title="ថតឡើងវិញ"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions buttons under camera */}
                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2 items-center justify-between shrink-0">
                    <div className="flex gap-2">
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all active:scale-95 shadow-sm"
                      >
                        <Upload className="w-4 h-4 text-slate-500" />
                        ផ្ទុកឡើងរូបភាព
                      </button>
                      
                      {!capturedImage && (
                        <button
                          onClick={handleTrySample}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100/70 text-blue-700 font-bold text-xs transition-all active:scale-95"
                        >
                          <Sparkles className="w-4 h-4 text-blue-500" />
                          សាកល្បងជាមួយរូបភាពគំរូ
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      {!capturedImage ? (
                        <button
                          onClick={capturePhoto}
                          disabled={isCameraLoading}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Camera className="w-4 h-4" />
                          ថតរូបសន្លឹកចម្លើយ
                        </button>
                      ) : (
                        <button
                          onClick={handleGradeOmr}
                          disabled={isGrading}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isGrading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              កំពុងកែសម្រួលជាមួយ AI...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              ចាប់ផ្ដើមកែសម្រួលដោយ AI
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Results Panel */}
                <div className="lg:col-span-5 flex flex-col h-full min-h-[480px]">
                  <AnimatePresence mode="wait">
                    
                    {/* 1. Loading grading view */}
                    {isGrading && (
                      <motion.div
                        key="grading-loader"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex-1 bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm h-full"
                      >
                        <div className="w-20 h-20 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-inner relative">
                          <RefreshCw className="w-10 h-10 animate-spin text-emerald-500" />
                          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/10 border-t-emerald-500 animate-ping"></div>
                        </div>
                        <h3 className="text-base font-bold text-slate-800">កំពុងវិភាគសន្លឹកចម្លើយ...</h3>
                        <p className="text-xs text-slate-500 max-w-sm mt-2">
                          ម៉ូដែល AI 3.5-Flash កំពុងបំលែង និងអានសញ្ញាដែលផាត់ រកឃើញអត្តសញ្ញាណសិស្ស និងផ្ទៀងផ្ទាត់ជាមួយគន្លឹះចម្លើយ។
                        </p>
                        
                        {/* Fake step progress items */}
                        <div className="mt-8 space-y-2 w-full max-w-xs text-left text-xs border-t border-slate-100 pt-6">
                          <div className="flex items-center gap-2.5 text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>កំពុងបញ្ជូនរូបភាពទៅកាន់ Gemini API</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>ស្កែនអក្សរឈ្មោះ និងអត្តសញ្ញាណ</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>កែនិងគណនាពិន្ទុ</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* 2. Error message */}
                    {error && !isGrading && (
                      <motion.div
                        key="error-box"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex-1 bg-white border border-rose-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm h-full"
                      >
                        <AlertCircle className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
                        <h3 className="text-base font-bold text-slate-800">មានកំហុសក្នុងការកែសម្រួល</h3>
                        <p className="text-xs text-rose-600 max-w-md mt-2">{error}</p>
                        <button
                          onClick={handleGradeOmr}
                          className="mt-6 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
                        >
                          ព្យាយាមម្ដងទៀត
                        </button>
                      </motion.div>
                    )}

                    {/* 3. Empty state - waiting for scan */}
                    {!gradingResult && !isGrading && !error && (
                      <motion.div
                        key="empty-scan-state"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex-1 bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm h-full"
                      >
                        <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mb-6 rotate-3">
                          <Camera className="w-8 h-8 text-blue-500" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800">រង់ចាំការស្កែន ឬការថតរូប</h3>
                        <p className="text-xs text-slate-500 max-w-sm mt-2">
                          សូមថតរូបភាពសន្លឹកចម្លើយ OMR របស់សិស្សឱ្យបានច្បាស់ រួចចុចប៊ូតុង "ចាប់ផ្ដើមកែសម្រួលដោយ AI" ដើម្បីទទួលបានលទ្ធផលភ្លាមៗ។
                        </p>
                        
                        {/* Small educational tip card */}
                        <div className="mt-8 bg-slate-50 p-4 rounded-xl border border-slate-100 text-left text-[11px] text-slate-600 max-w-xs space-y-2">
                          <p className="font-bold text-slate-700 flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            ការណែនាំសម្រាប់ការថតរូបភាព៖
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-slate-500 pl-1">
                            <li>ថតក្នុងទីកន្លែងដែលមានពន្លឺគ្រប់គ្រាន់</li>
                            <li>ដាក់កាមេរ៉ាឱ្យស្របនឹងក្រដាស</li>
                            <li>កុំឱ្យមានស្រមោលបាំងខ្លាំងលើចំណុចផាត់</li>
                          </ul>
                        </div>
                      </motion.div>
                    )}

                    {/* 4. Display grading result */}
                    {gradingResult && !isGrading && !error && (
                      <motion.div
                        key="grading-success"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden h-full"
                      >
                        {/* Header card info */}
                        <div className="bg-emerald-50 border-b border-emerald-100 p-5 shrink-0">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                កែសម្រួលជោគជ័យ
                              </span>
                              
                              {/* Editable Metadata fields */}
                              {!isEditingMetadata ? (
                                <div className="pt-2">
                                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                                    <User className="w-4 h-4 text-slate-400" />
                                    {editedName || gradingResult.studentName}
                                  </h3>
                                  <div className="flex gap-4 mt-1 text-xs text-slate-500">
                                    <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> លេខតុ៖ {editedId || gradingResult.studentId || 'មិនស្គាល់'}</span>
                                    <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> ថ្នាក់ទី៖ {editedGrade || gradingResult.grade || 'មិនស្គាល់'}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2 pt-2 bg-white/70 p-3 rounded-lg border border-emerald-200 mt-2">
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase">ឈ្មោះសិស្ស</label>
                                    <input 
                                      type="text" 
                                      value={editedName} 
                                      onChange={(e) => setEditedName(e.target.value)} 
                                      className="w-full text-xs p-1.5 border border-slate-200 rounded mt-0.5 outline-none bg-white"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-400 uppercase">លេខតុ</label>
                                      <input 
                                        type="text" 
                                        value={editedId} 
                                        onChange={(e) => setEditedId(e.target.value)} 
                                        className="w-full text-xs p-1.5 border border-slate-200 rounded mt-0.5 outline-none bg-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-400 uppercase">ថ្នាក់ទី</label>
                                      <input 
                                        type="text" 
                                        value={editedGrade} 
                                        onChange={(e) => setEditedGrade(e.target.value)} 
                                        className="w-full text-xs p-1.5 border border-slate-200 rounded mt-0.5 outline-none bg-white"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Radial/circular score visual */}
                            <div className="flex flex-col items-center">
                              <div className="w-16 h-16 rounded-full border-4 border-emerald-500 flex flex-col items-center justify-center bg-white shadow-inner">
                                <span className="text-lg font-black text-emerald-600">{gradingResult.score}</span>
                                <div className="w-full h-[1px] bg-slate-100 max-w-[35px]" />
                                <span className="text-[10px] text-slate-400 font-bold">{gradingResult.totalQuestions}</span>
                              </div>
                              <span className="text-[9px] font-black text-emerald-700 mt-1">
                                {((gradingResult.score / gradingResult.totalQuestions) * 100).toFixed(0)}% ត្រូវ
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 flex gap-2">
                            <button
                              onClick={() => setIsEditingMetadata(!isEditingMetadata)}
                              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm transition-all active:scale-95"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              {isEditingMetadata ? 'រក្សាទុកការកែ' : 'កែសម្រួលអត្តសញ្ញាណ'}
                            </button>
                          </div>
                        </div>

                        {/* Breakdown scroll section */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                          
                          {/* Teacher feedback from AI */}
                          {gradingResult.teacherFeedback && (
                            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 relative">
                              <Sparkles className="absolute top-3 right-3 w-4 h-4 text-blue-500" />
                              <h4 className="text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                                ការវាយតម្លៃរបស់លោកគ្រូ/អ្នកគ្រូ (AI Evaluation)
                              </h4>
                              <p className="text-xs text-slate-700 leading-relaxed italic">
                                "{gradingResult.teacherFeedback}"
                              </p>
                            </div>
                          )}

                          {/* List of graded responses */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">របាយការណ៍លម្អិតសំណួរ (Item Breakdown)</h4>
                            
                            <div className="grid grid-cols-1 gap-2">
                              {gradingResult.detectedAnswers.map((ans) => {
                                return (
                                  <div 
                                    key={ans.questionNumber}
                                    className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                                      ans.isCorrect 
                                        ? 'bg-emerald-50/40 border-emerald-100 text-slate-800' 
                                        : 'bg-rose-50/40 border-rose-100 text-slate-800'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      {ans.isCorrect ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                      ) : (
                                        <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                                      )}
                                      <div className="font-bold">
                                        សំណួរ {ans.questionNumber}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs">
                                      <div className="flex flex-col items-center">
                                        <span className="text-[9px] text-slate-400 uppercase font-medium">ចម្លើយសិស្ស</span>
                                        <span className={`font-black px-2 py-0.5 rounded ${ans.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                          {ans.detectedMark ? getKhmerLetter(ans.detectedMark) : 'ទទេ/មិនច្បាស់'}
                                        </span>
                                      </div>
                                      
                                      {!ans.isCorrect && (
                                        <div className="flex flex-col items-center">
                                          <span className="text-[9px] text-slate-400 uppercase font-medium">ចម្លើយត្រូវ</span>
                                          <span className="font-black px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                                            {getKhmerLetter(ans.correctAnswer)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Footer store result */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0">
                          <button
                            onClick={() => { setCapturedImage(null); setGradingResult(null); }}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all active:scale-95"
                          >
                            លុបចោល
                          </button>
                          <button
                            onClick={handleSaveResult}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all active:scale-95 shadow-sm"
                          >
                            រក្សាទុកចូលប្រវត្តិពិន្ទុ
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* ANSWER KEY CONFIG TAB */}
            {activeTab === 'key' && (
              <motion.div 
                key="key-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6"
              >
                <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">កែសម្រួលគន្លឹះចម្លើយ និងប្រវែងសន្លឹក OMR</h3>
                    <p className="text-xs text-slate-500">អ្នកអាចកំណត់ចំនួនសំណួរ និងចម្លើយត្រូវសម្រាប់ផ្ទៀងផ្ទាត់ជាមួយ AI OMR Scanner</p>
                  </div>
                  
                  {/* Select Answer Type Alphabet */}
                  <div className="flex flex-wrap gap-2.5 items-center self-start">
                    <button
                      onClick={handleGenerateShareLink}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/10 transition-all active:scale-95 cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      ចែករំលែកសោចម្លើយ Online
                    </button>
                    
                    <div className="flex gap-2 items-center bg-slate-100 p-1 rounded-lg">
                      <button
                        onClick={() => setAnswerType('ABCD')}
                        className={`px-3 py-1 text-[11px] font-bold rounded ${answerType === 'ABCD' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                      >
                        A, B, C, D
                      </button>
                      <button
                        onClick={() => setAnswerType('KHKK')}
                        className={`px-3 py-1 text-[11px] font-bold rounded ${answerType === 'KHKK' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                      >
                        ក, ខ, គ, ឃ
                      </button>
                    </div>
                  </div>
                </div>

                {/* Question length config presets */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700">ចំនួនសំណួរ៖</span>
                    <input 
                      type="number" 
                      min="1" 
                      max="100"
                      value={questionCount}
                      onChange={(e) => handleQuestionCountChange(parseInt(e.target.value) || 5)}
                      className="w-16 p-2 text-xs text-center border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {[5, 10, 20, 30, 40, 50].map((num) => (
                      <button
                        key={num}
                        onClick={() => handleQuestionCountChange(num)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          questionCount === num 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {num} សំណួរ
                      </button>
                    ))}
                  </div>

                  {currentTest && (
                    <button
                      onClick={() => {
                        if (currentTest) {
                          const mcQuestions = currentTest.questions.filter(
                            q => q.type === QuestionType.MULTIPLE_CHOICE || q.type === QuestionType.TRUE_FALSE
                          );
                          if (mcQuestions.length > 0) {
                            handleQuestionCountChange(mcQuestions.length);
                            // Re-import
                            const keyItems: OmrAnswerKeyItem[] = mcQuestions.map((q, idx) => {
                              let ansStr = '';
                              if (typeof q.answer === 'string') ansStr = q.answer.trim().toUpperCase();
                              if (ansStr === 'ក' || ansStr === 'A') ansStr = 'A';
                              else if (ansStr === 'ខ' || ansStr === 'B') ansStr = 'B';
                              else if (ansStr === 'គ' || ansStr === 'C') ansStr = 'C';
                              else if (ansStr === 'ឃ' || ansStr === 'D') ansStr = 'D';
                              else ansStr = 'A';
                              return { questionNumber: idx + 1, correctAnswer: ansStr };
                            });
                            setAnswerKey(keyItems);
                          }
                        }
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100/50 px-3 py-2 rounded-lg transition-colors border border-blue-100"
                    >
                      ទាញយកសារជាថ្មីពីវិញ្ញាសា
                    </button>
                  )}
                </div>

                {/* Scrollable Answers Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[350px] overflow-y-auto p-1">
                  {answerKey.map((item) => (
                    <div 
                      key={item.questionNumber}
                      className="border border-slate-200 p-3.5 rounded-xl flex flex-col gap-2 bg-slate-50/50 hover:border-slate-300 transition-all hover:bg-white"
                    >
                      <span className="text-[11px] text-slate-500 font-bold uppercase">សំណួរ {item.questionNumber}</span>
                      
                      <div className="flex gap-1">
                        {['A', 'B', 'C', 'D'].map((opt) => {
                          const isSelected = item.correctAnswer === opt;
                          return (
                            <button
                              key={opt}
                              onClick={() => handleKeyOptionChange(item.questionNumber, opt)}
                              className={`flex-1 aspect-square rounded-lg border font-bold text-xs flex items-center justify-center transition-all ${
                                isSelected 
                                  ? 'bg-slate-800 border-slate-800 text-white shadow-sm' 
                                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              {getKhmerLetter(opt)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Confirmation Footer */}
                <div className="flex justify-end pt-4 border-t border-slate-200">
                  <button
                    onClick={() => setActiveTab('scan')}
                    className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all active:scale-95"
                  >
                    រួចរាល់ & ត្រឡប់ទៅការស្កែន
                  </button>
                </div>
              </motion.div>
            )}

            {/* PRINTABLE ANSWER SHEET MODEL */}
            {activeTab === 'printable' && (
              <motion.div 
                key="printable-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                {/* Print layout buttons */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">ទាញយកសន្លឹក OMR ជាឯកសារ Word (Download OMR Sheet as Word)</h3>
                    <p className="text-xs text-slate-500">
                      សន្លឹកចម្លើយ OMR នេះត្រូវបានរចនាយ៉ាងស្អាត ស្របតាមកម្រិតចំនួនសំណួរ ({questionCount} សំណួរ)។ អ្នកអាចទាញយកវាជាឯកសារ Word (.doc) សម្រាប់បោះពុម្ពចែកជូនសិស្សផ្ទាល់!
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto shrink-0">
                    <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shadow-inner">
                      <label className="text-[11px] font-bold text-slate-600 whitespace-nowrap">
                        ចំនួនសន្លឹកចម្លើយ៖
                      </label>
                      <input 
                        type="number" 
                        min="1" 
                        max="1000"
                        value={sheetCount}
                        onChange={(e) => setSheetCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 p-1.5 text-center font-bold text-sm border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      onClick={handleGenerateShareLink}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all active:scale-95 shadow-sm cursor-pointer"
                    >
                      <Globe className="w-4 h-4 text-blue-600" />
                      ចែករំលែកសោចម្លើយ Online
                    </button>
                    <button
                      onClick={handleDownloadWord}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all active:scale-95 shadow-md shadow-blue-500/10 cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      ទាញយក {sheetCount} សន្លឹក OMR ជា Word
                    </button>
                  </div>
                </div>

                {/* On-screen multi-sheet template preview (hidden during printing) */}
                <div className="space-y-8 print:hidden max-w-[210mm] mx-auto w-full">
                  {Array.from({ length: sheetCount }, (_, idx) => {
                    const sId = getSheetId(idx);
                    return (
                      <div 
                        key={idx}
                        className="bg-white rounded-2xl border border-slate-200 p-12 shadow-md text-slate-800 relative font-sans"
                      >
                        {/* Decorative guide boundary corners for printer */}
                        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-black"></div>
                        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-black"></div>
                        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-black"></div>
                        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-black"></div>

                        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] text-blue-600 font-bold bg-blue-50 border border-blue-100 px-3 py-1 rounded-full uppercase tracking-wider select-none">
                          សន្លឹកទី {idx + 1} (Sheet {idx + 1} of {sheetCount})
                        </div>

                        {/* Header Info with ID & QR Code split */}
                        <div className="flex justify-between items-center border-b-2 border-slate-900 pb-5 mb-8 pt-4">
                          <div className="text-left space-y-2 flex-1">
                            <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">សន្លឹកចម្លើយស្កែន OMR ស្វ័យប្រវត្តិ (AI OMR SHEET)</h2>
                            <p className="text-xs text-slate-600">សាលារៀន/វិទ្យាល័យ៖ .............................................................................................</p>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                              ប្រភេទសំណួរ៖ ជម្រើសពហុ ({questionCount} សំណួរ)
                            </p>
                          </div>
                          <div className="flex flex-col items-center justify-center border border-slate-300 p-2 rounded-lg bg-slate-50 ml-4 shrink-0 select-none">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${sId}`} 
                              alt="QR Code" 
                              className="w-14 h-14"
                              referrerPolicy="no-referrer"
                            />
                            <span className="font-mono text-[9px] font-bold text-slate-800 mt-1">{sId}</span>
                          </div>
                        </div>

                        {/* Student Metadata box to write */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-2 border-slate-300 rounded-xl bg-slate-50/50 mb-8 text-xs">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-700 block">ឈ្មោះសិស្ស (Student Name)៖</span>
                            <div className="h-7 border-b border-dashed border-slate-400"></div>
                          </div>
                          <div className="space-y-1">
                            <span className="font-bold text-slate-700 block">ថ្នាក់ទី (Grade/Class)៖</span>
                            <div className="h-7 border-b border-dashed border-slate-400"></div>
                          </div>
                          <div className="space-y-1">
                            <span className="font-bold text-slate-700 block">លេខតុ/បន្ទប់ (Seat/Room)៖</span>
                            <div className="h-7 border-b border-dashed border-slate-400"></div>
                          </div>
                          <div className="space-y-1">
                            <span className="font-bold text-slate-700 block">កាលបរិច្ឆេទ (Date)៖</span>
                            <div className="h-7 border-b border-dashed border-slate-400"></div>
                          </div>
                        </div>

                        {/* Instructions on how to fill */}
                        <div className="bg-slate-100/80 p-4 rounded-xl border border-slate-200 text-[11px] text-slate-700 mb-8 space-y-1.5 leading-relaxed">
                          <p className="font-bold text-slate-800">✍ ការណែនាំក្នុងការផាត់ចម្លើយ (Instructions for filling bubbles)៖</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-slate-500 text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full bg-slate-800"></div>
                              <span>ផាត់ខ្មៅឱ្យពេញរង្វង់ [ ត្រូវ ]</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center font-bold text-red-500 text-[9px]">✗</div>
                              <span>កុំឆូតសញ្ញាខ្វែង ឬធិក [ ខុស ]</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center text-[7px] text-red-500">●</div>
                              <span>កុំផាត់ចេញក្រៅរង្វង់ [ ខុស ]</span>
                            </div>
                          </div>
                        </div>

                        {/* Responsive grid of bubbles */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-3.5 mb-12">
                          {Array.from({ length: questionCount }, (_, i) => {
                            const qNum = i + 1;
                            return (
                              <div 
                                key={qNum} 
                                className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs"
                              >
                                <span className="font-black text-slate-800 w-20">សំណួរ {qNum} ៖</span>
                                
                                <div className="flex gap-4">
                                  {['A', 'B', 'C', 'D'].map((opt) => (
                                    <div key={opt} className="flex flex-col items-center gap-1">
                                      <div className="w-6 h-6 rounded-full border-2 border-slate-800 flex items-center justify-center font-bold text-slate-800 bg-white select-none">
                                        {getKhmerLetter(opt)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Footer metadata alignment blocks */}
                        <div className="flex justify-between items-end border-t border-slate-200 pt-8 text-[10px] text-slate-400 italic">
                          <span>ប្រព័ន្ធវិនិច្ឆ័យសន្លឹក OMR - AI Khmer Grader (Gemini 3.5-Flash)</span>
                          <span className="font-mono uppercase tracking-widest text-[9px]">ID: {sId}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Print-Only Multi-Sheet Layout (Hidden on screen, displayed in full during printing) */}
                <div className="hidden print:block font-sans">
                  {Array.from({ length: sheetCount }, (_, idx) => {
                    const sId = getSheetId(idx);
                    return (
                      <div 
                        key={idx}
                        className="bg-white p-12 text-slate-800 relative max-w-[210mm] mx-auto print:p-4 print:border-0"
                        style={idx < sheetCount - 1 ? { pageBreakAfter: 'always', breakAfter: 'page' } : {}}
                      >
                        {/* Decorative guide boundary corners for printer */}
                        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-black"></div>
                        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-black"></div>
                        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-black"></div>
                        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-black"></div>

                        {/* Header Info */}
                        <div className="flex justify-between items-center border-b-2 border-slate-900 pb-5 mb-8">
                          <div className="text-left space-y-2 flex-1">
                            <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase">សន្លឹកចម្លើយស្កែន OMR ស្វ័យប្រវត្តិ (AI OMR SHEET)</h2>
                            <p className="text-xs text-slate-600">សាលារៀន/វិទ្យាល័យ៖ .............................................................................................</p>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                              ប្រភេទសំណួរ៖ ជម្រើសពហុ ({questionCount} សំណួរ)
                            </p>
                          </div>
                          <div className="flex flex-col items-center justify-center border border-slate-300 p-2 rounded-lg bg-slate-50 ml-4 shrink-0">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${sId}`} 
                              alt="QR Code" 
                              className="w-14 h-14"
                              referrerPolicy="no-referrer"
                            />
                            <span className="font-mono text-[9px] font-bold text-slate-800 mt-1">{sId}</span>
                          </div>
                        </div>

                        {/* Student Metadata box to write */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-2 border-slate-300 rounded-xl bg-slate-50/50 mb-8 text-xs">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-700 block">ឈ្មោះសិស្ស (Student Name)៖</span>
                            <div className="h-7 border-b border-dashed border-slate-400"></div>
                          </div>
                          <div className="space-y-1">
                            <span className="font-bold text-slate-700 block">ថ្នាក់ទី (Grade/Class)៖</span>
                            <div className="h-7 border-b border-dashed border-slate-400"></div>
                          </div>
                          <div className="space-y-1">
                            <span className="font-bold text-slate-700 block">លេខតុ/បន្ទប់ (Seat/Room)៖</span>
                            <div className="h-7 border-b border-dashed border-slate-400"></div>
                          </div>
                          <div className="space-y-1">
                            <span className="font-bold text-slate-700 block">កាលបរិច្ឆេទ (Date)៖</span>
                            <div className="h-7 border-b border-dashed border-slate-400"></div>
                          </div>
                        </div>

                        {/* Instructions on how to fill */}
                        <div className="bg-slate-100/80 p-4 rounded-xl border border-slate-200 text-[11px] text-slate-700 mb-8 space-y-1.5 leading-relaxed">
                          <p className="font-bold text-slate-800">✍ ការណែនាំក្នុងការផាត់ចម្លើយ (Instructions for filling bubbles)៖</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-slate-500 text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full bg-slate-800"></div>
                              <span>ផាត់ខ្មៅឱ្យពេញរង្វង់ [ ត្រូវ ]</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center font-bold text-red-500 text-[9px]">✗</div>
                              <span>កុំឆូតសញ្ញាខ្វែង ឬធិក [ ខុស ]</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center text-[7px] text-red-500">●</div>
                              <span>កុំផាត់ចេញក្រៅរង្វង់ [ ខុស ]</span>
                            </div>
                          </div>
                        </div>

                        {/* Responsive grid of bubbles */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-3.5 mb-12">
                          {Array.from({ length: questionCount }, (_, i) => {
                            const qNum = i + 1;
                            return (
                              <div 
                                key={qNum} 
                                className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs"
                              >
                                <span className="font-black text-slate-800 w-20">សំណួរ {qNum} ៖</span>
                                
                                <div className="flex gap-4">
                                  {['A', 'B', 'C', 'D'].map((opt) => (
                                    <div key={opt} className="flex flex-col items-center gap-1">
                                      <div className="w-6 h-6 rounded-full border-2 border-slate-800 flex items-center justify-center font-bold text-slate-800 bg-white select-none">
                                        {getKhmerLetter(opt)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Footer metadata alignment blocks */}
                        <div className="flex justify-between items-end border-t border-slate-200 pt-8 text-[10px] text-slate-400 italic">
                          <span>ប្រព័ន្ធវិនិច្ឆ័យសន្លឹក OMR - AI Khmer Grader (Gemini 3.5-Flash)</span>
                          <span className="font-mono uppercase tracking-widest text-[9px]">ID: {sId}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* GRADING HISTORY TAB */}
            {activeTab === 'history' && (
              <motion.div 
                key="history-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-5xl mx-auto space-y-6"
              >
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">តារាងពិន្ទុ និងប្រវត្តិស្កែន (Gradebook & Scans History)</h3>
                    <p className="text-xs text-slate-500">តារាងសរុបលទ្ធផលរបស់សិស្សទាំងអស់ដែលបានកែសម្រួលរួចក្នុងវគ្គនេះ</p>
                  </div>
                  
                  {savedResults.length > 0 && (
                    <div className="flex gap-2 self-start sm:self-auto">
                      <button
                        onClick={handleClearHistory}
                        className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-100 px-4 py-2.5 rounded-xl transition-all active:scale-95"
                      >
                        <Trash2 className="w-4 h-4" />
                        សម្អាតប្រវត្តិ
                      </button>
                      <button
                        onClick={exportHistoryToCSV}
                        className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 border border-emerald-100 px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        នាំចេញជា CSV
                      </button>
                    </div>
                  )}
                </div>

                {savedResults.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-6">
                      <History className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">គ្មានប្រវត្តិស្កែននៅឡើយទេ</h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-2">
                      ចាប់ផ្ដើមស្កែនសន្លឹកចម្លើយ OMR ដំបូងរបស់អ្នក រួចចុច "រក្សាទុកចូលប្រវត្តិ" ដើម្បីបង្កើតតារាងពិន្ទុសិស្ស។
                    </p>
                    <button
                      onClick={() => setActiveTab('scan')}
                      className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-blue-500/15"
                    >
                      ស្កែនសន្លឹកចម្លើយឥឡូវនេះ
                    </button>
                  </div>
                ) : (
                  /* Graded Results Table */
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                            <th className="p-4 w-12 text-center">ល.រ</th>
                            <th className="p-4">ឈ្មោះសិស្ស</th>
                            <th className="p-4">លេខតុ</th>
                            <th className="p-4">ថ្នាក់ទី</th>
                            <th className="p-4 text-center">ពិន្ទុ</th>
                            <th className="p-4 text-center">លទ្ធផល %</th>
                            <th className="p-4">កាលបរិច្ឆេទស្កែន</th>
                            <th className="p-4 text-center w-24">ជម្រើស</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {savedResults.map((res, idx) => {
                            const pct = (res.score / res.totalQuestions) * 100;
                            let badgeBg = 'bg-rose-50 text-rose-700 border-rose-100';
                            if (pct >= 80) badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                            else if (pct >= 50) badgeBg = 'bg-amber-50 text-amber-700 border-amber-100';

                            return (
                              <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 text-center text-slate-400 font-mono">{idx + 1}</td>
                                <td className="p-4 font-bold text-slate-800">{res.studentName}</td>
                                <td className="p-4 text-slate-600 font-mono">{res.studentId || '-'}</td>
                                <td className="p-4 text-slate-600">{res.grade || '-'}</td>
                                <td className="p-4 text-center font-bold text-slate-700">
                                  <span className="text-slate-800">{res.score}</span> / <span className="text-slate-400">{res.totalQuestions}</span>
                                </td>
                                <td className="p-4 text-center">
                                  <span className={`px-2.5 py-1 rounded-lg border font-bold text-[10px] ${badgeBg}`}>
                                    {pct.toFixed(0)}%
                                  </span>
                                </td>
                                <td className="p-4 text-slate-400 text-[11px]">{res.dateGraded}</td>
                                <td className="p-4 text-center">
                                  <button
                                    onClick={() => {
                                      // Load to scanner tab as active grading result
                                      setCapturedImage(res.scannedImage);
                                      setGradingResult({
                                        studentName: res.studentName,
                                        studentId: res.studentId,
                                        grade: res.grade,
                                        score: res.score,
                                        totalQuestions: res.totalQuestions,
                                        detectedAnswers: res.gradedAnswers,
                                        teacherFeedback: res.teacherFeedback
                                      });
                                      setEditedName(res.studentName);
                                      setEditedId(res.studentId);
                                      setEditedGrade(res.grade);
                                      setActiveTab('scan');
                                    }}
                                    className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors inline-flex"
                                    title="មើលព័ត៌មានលម្អិត"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSavedResult(res.id)}
                                    className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors inline-flex ml-1"
                                    title="លុបចោល"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            
          </AnimatePresence>
        </div>
      </div>

      {/* Share Key Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 relative text-slate-800"
            >
              <button
                onClick={() => setShowShareModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Globe className="w-6 h-6 animate-pulse" />
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-slate-900">ចែករំលែកសោចម្លើយ Online</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    ស្កែន QR កូដ ឬចម្លងតំណភ្ជាប់ខាងក្រោមដើម្បីបើកនៅលើទូរសព្ទដៃ ឬឧបករណ៍ផ្សេងទៀត ដើម្បីស្កែនកែសន្លឹកចម្លើយបានភ្លាមៗ!
                  </p>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center justify-center bg-slate-50 p-4 border border-slate-200 rounded-2xl">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`}
                    alt="Share QR Code"
                    className="w-40 h-40 rounded-xl shadow-inner bg-white p-2"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-[10px] text-slate-400 font-bold mt-2">ស្កែនដើម្បីបើកលើទូរស័ព្ទ (Scan to open on phone)</span>
                </div>

                {/* Share Link */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 bg-transparent text-xs font-mono text-slate-600 border-none outline-none overflow-x-auto"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(shareUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        copiedLink 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      {copiedLink ? 'បានចម្លង!' : 'ចម្លងតំណ'}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
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
