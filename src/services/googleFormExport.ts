import { GeneratedTest, QuestionType } from "../types";

const superscriptMap: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  // support mapping existing subscript digits to superscript digits
  '₀': '⁰', '₁': '¹', '₂': '²', '₃': '³', '₄': '⁴', '₅': '⁵', '₆': '⁶', '₇': '⁷', '₈': '⁸', '₉': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', 'n': 'ⁿ', 'x': 'ˣ', 'y': 'ʸ', 'i': 'ⁱ', 'a': 'ᵃ',
  'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ',
  'm': 'ᵐ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ', 'z': 'ᶻ',
  'A': 'ᴬ', 'B': 'ᴮ', 'D': 'ᴰ', 'E': 'ᴱ', 'G': 'ᴳ', 'H': 'ᴴ', 'I': 'ᴵ', 'J': 'ᴶ', 'K': 'ᴷ', 'L': 'ᴸ',
  'M': 'ᴹ', 'N': 'ᴺ', 'O': 'ᴼ', 'P': 'ᴾ', 'R': 'ᴿ', 'T': 'ᵀ', 'U': 'ᵁ', 'V': 'ⱽ', 'W': 'ᵂ'
};

const subscriptMap: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  // support mapping existing superscript digits to subscript digits
  '⁰': '₀', '¹': '₁', '²': '₂', '³': '₃', '⁴': '₄', '⁵': '₅', '⁶': '₆', '⁷': '₇', '⁸': '₈', '⁹': '₉',
  'ⁿ': 'ₙ', 'ˣ': 'ₓ', 'ʸ': 'ᵧ', 'ⁱ': 'ᵢ',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', 'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ', 'y': 'ᵧ',
  'h': 'ₕ', 'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ'
};

const convertExponents = (str: string): string => {
  let result = str;
  // First match \^{...} or ^{...}
  result = result.replace(/\^\{([^}]*)\}/g, (match, p1) => {
    return p1.split('').map((char: string) => superscriptMap[char] || char).join('');
  });
  // Next match ^(...) or ^(...)
  result = result.replace(/\^\(([^)]*)\)/g, (match, p1) => {
    return p1.split('').map((char: string) => superscriptMap[char] || char).join('');
  });
  // Then match ^x where x is a word character or number or parenthesis
  result = result.replace(/\^([0-9a-zA-Z+-])/g, (match, p1) => {
    return superscriptMap[p1] || p1;
  });
  return result;
};

const convertFractions = (str: string): string => {
  // Replace typical escaped control-character issues before doing regex
  let normalized = str
    .replace(/\x0c/g, 'f') // form feed \f -> f
    .replace(/\r/g, 'r')   // carriage return \r -> r
    .replace(/\t/g, 't');  // tab \t -> t

  // Match optional backslash + [f] + rac {num} {den}
  return normalized.replace(/\\?f?rac\{([^}]*)\}\{([^}]*)\}/g, (match, num, den) => {
    const cleanNum = convertExponents(num);
    const cleanDen = convertExponents(den);

    const toSuper = (s: string): string => {
      return s.split('').map(c => superscriptMap[c] || c).join('');
    };

    const toSub = (s: string): string => {
      return s.split('').map(c => subscriptMap[c] || c).join('');
    };

    const isSimple = (s: string): boolean => {
      const allowed = /^[a-zA-Z0-9\s\+\-\(\)⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿˣʸⁱᵃᵇᶜᵈᵉᶠᵍʰʲᵏˡᵐᵒᵖʳˢᵗᵘᵛʷᶻᴬᴮᴰᴱᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾᴿᵀᵁⱽᵂ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓᵧₕₖₗₘₙₚᵣₛₜ]+$/;
      return allowed.test(s);
    };

    if (isSimple(cleanNum) && isSimple(cleanDen)) {
      const superNum = toSuper(cleanNum);
      const subDen = toSub(cleanDen);
      return `${superNum}⁄${subDen}`;
    }
    return `(${cleanNum}/${cleanDen})`;
  });
};

/**
 * Converts LaTeX formulas (especially fractions) into readable plain text where appropriate.
 */
const beautifyMath = (text: string): string => {
  if (!text) return "";
  
  let processed = text;
  
  // 1. Handle fractions (processes problematic backslash-escapes and raw fractions)
  processed = convertFractions(processed);
  
  // 2. Handle exponents
  processed = convertExponents(processed);
  
  // 3. Handle square roots
  processed = processed.replace(/\\sqrt\{([^}]*)\}/g, '√($1)');
  processed = processed.replace(/\\sqrt\[([^\]]*)\]\{([^}]*)\}/g, (match, root, val) => {
    const superRoot = root.split('').map((c: string) => superscriptMap[c] || c).join('');
    return `${superRoot}√(${val})`;
  });

  // 4. Other basic character replacements
  processed = processed.replace(/\$/g, '');
  processed = processed.replace(/\\times/g, '×')
                       .replace(/\\div/g, '÷')
                       .replace(/\\pm/g, '±')
                       .replace(/\\cdot/g, '·')
                       .replace(/\\approx/g, '≈')
                       .replace(/\\neq/g, '≠')
                       .replace(/\\leq/g, '≤')
                       .replace(/\\geq/g, '≥')
                       .replace(/\\pi/g, 'π')
                       .replace(/\\alpha/g, 'α')
                       .replace(/\\beta/g, 'β')
                       .replace(/\\theta/g, 'θ')
                       .replace(/\\infty/g, '∞');
  return processed;
};

export interface AppsScriptExport {
  gsCode: string;
  htmlCode: string;
  googleFormCode: string;
}

/**
 * Generates Google Apps Script (Code.gs) and frontend (Index.html) for beautiful interactive student portals.
 */
export const generateGoogleFormScript = (test: GeneratedTest): AppsScriptExport => {
  const duration = test.duration || (parseInt(test.grade.replace('ថ្នាក់ទី ', '')) <= 6 ? 40 : 60);
  
  // Format questions array for JS injection
  const sanitizedQuestions = test.questions.map((q, idx) => {
    // Shuffled choices for MCQ to keep it robust
    let choices: string[] = [];
    if (q.type === QuestionType.MULTIPLE_CHOICE && q.options) {
      choices = [...q.options];
    }
    
    // For Matching: gather left items and shuffled list of right items
    let matchingLefts: string[] = [];
    let matchingRights: string[] = [];
    if (q.type === QuestionType.MATCHING && q.matchingPairs) {
      matchingLefts = q.matchingPairs.map(p => p.left);
      matchingRights = Array.from(new Set([
        ...q.matchingPairs.map(p => p.right),
        ...(q.distractors || [])
      ])).sort(() => Math.random() - 0.5);
    }

    return {
      id: q.id || `q_${idx}`,
      type: q.type,
      question: q.question,
      options: choices,
      matchingLefts,
      matchingRights,
      matchingPairs: q.matchingPairs || [],
      distractors: q.distractors || [],
      answer: q.answer,
      explanation: q.explanation || "",
      svg: q.svg || ""
    };
  });

  const gsCode = `/**
 * =========================================================================
 * ប្រព័ន្ធគ្រប់គ្រងការប្រឡងអនឡាញ (Online Student Web App Test Portal)
 * វិញ្ញាសា៖ ${test.title}
 * កម្រិតថ្នាក់៖ ${test.grade} | មុខវិជ្ជា៖ ${test.subject} | រយៈពេល៖ ${duration} នាទី
 * =========================================================================
 * 
 * Instructions (សេចក្ដីណែនាំ)៖
 * ១. បើក Google Apps Script (https://script.google.com/) រួចបង្កើត Project ថ្មីមួយ។
 * ២. ក្នុងឯកសារ "Code.gs" ៖ លុបកូដចាស់ចោលទាំងស្រុង រួចចម្លងកូដ "Code.gs" (ចានកូដទី១) យកទៅផាស (Paste) ជំនួសវិញ។
 * ៣. ចុចសញ្ញា "+" នៅខាងឆ្វេងក្បែរពាក្យ Files -> ជ្រើសរើស "HTML" រួចវាយឈ្មោះថា "Index" (វានឹងបង្កើត Index.html)។
 * ៤. ក្នុងឯកសារ "Index.html" ៖ លុបកូដចាស់ចោលទាំងស្រុង រួចចម្លងកូដពីផ្ទាំង "Index.html" (ចានកូដទី២) យកទៅផាស (Paste) ជំនួសវិញ។
 * ៥. ចុច Save 💾 រួចចុចប៊ូតុង "Deploy" (ខាងលើស្ដាំ) -> "New deployment"។
 * ៦. ជ្រើសរើសប្រភេទជា "Web app"  និងកំណត់ 'Who has access' ៖ "Anyone" និង 'Execute as' ៖ "Me" រួចចុច "Deploy" 🚀
 * ៧. បន្ទាប់មក ចម្លងតំណភ្ជាប់ (Web App URL) ផ្ញើជូនសិស្សានុសិស្សដើម្បីចូលធ្វើតេស្ត!
 */

function doGet(e) {
  var html = HtmlService.createHtmlOutputFromFile('Index');
  html.setTitle(${JSON.stringify(test.title)});
  html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  html.addMetaTag('viewport', 'width=device-width, initial-scale=1');
  return html;
}

/**
 * Saves student submission data to a Google Sheet automatically.
 */
function saveResult(studentName, studentId, month, score, totalQuestions, answersLog) {
  try {
    var ss;
    var activeSs = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSs) {
      ss = activeSs;
    } else {
      // Create a new sheet with responses if not run inside a sheet container
      ss = SpreadsheetApp.create(${JSON.stringify(test.title + " - លទ្ធផលប្រឡង")});
    }
    var sheet = ss.getSheets()[0];
    
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["កាលបរិច្ឆេទ", "ឈ្មោះសិស្ស", "អត្តលេខ/លេខបេក្ខជន", "ប្រចាំខែ", "ពិន្ទុទទួលបាន", "ពិន្ទុសរុប", "ភាគរយ", "ចំណាត់ថ្នាក់", "ចម្លើយលម្អិត"]);
      sheet.setRowHeight(1, 30);
      sheet.getRange("A1:I1").setFontWeight("bold").setBackgroundColor("#e2e8f0").setHorizontalAlignment("center");
    }
    
    var percent = (score / totalQuestions * 100).toFixed(2);
    var gradeChar = "F";
    if (percent >= 90) gradeChar = "A (ល្អប្រសើរ)";
    else if (percent >= 80) gradeChar = "B (ល្អណាស់)";
    else if (percent >= 65) gradeChar = "C (ល្អ)";
    else if (percent >= 50) gradeChar = "D (មធ្យម)";
    else gradeChar = "E/F (ខ្សោយ)";
    
    // Use Indochina/Phnom Penh Time
    var formattedDate = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");
    
    sheet.appendRow([
      formattedDate,
      studentName,
      studentId,
      month,
      score,
      totalQuestions,
      percent + "%",
      gradeChar,
      answersLog
    ]);
    
    return { success: true, url: ss.getUrl(), sheetName: ss.getName() };
  } catch(err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Checks if a specific student ID has already completed the test.
 */
function checkAttempt(studentId) {
  try {
    var ss;
    var activeSs = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSs) {
      ss = activeSs;
    } else {
      return { attempted: false };
    }
    var sheet = ss.getSheets()[0];
    if (!sheet || sheet.getLastRow() < 2) {
      return { attempted: false };
    }
    
    var lastRow = sheet.getLastRow();
    var values = sheet.getRange(2, 3, lastRow - 1, 1).getValues(); // Column C contains Student ID
    for (var i = 0; i < values.length; i++) {
      var idInRow = String(values[i][0]).trim().toLowerCase();
      var idToCheck = String(studentId).trim().toLowerCase();
      if (idInRow === idToCheck && idToCheck !== "") {
        return { attempted: true };
      }
    }
    return { attempted: false };
  } catch (err) {
    return { attempted: false, error: err.toString() };
  }
}
`;

  const htmlCode = `<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <title>${test.title}</title>
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Beautiful Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Moul&family=Kantumruy+Pro:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <!-- KaTeX for beautiful math LaTeX equations rendering -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body, {delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}]});"></script>
  
  <style>
    body {
      font-family: 'Kantumruy Pro', 'Inter', sans-serif;
    }
    .font-moul {
      font-family: 'Moul', 'Kantumruy Pro', sans-serif;
    }
    .latex-rendered {
      font-family: 'Inter', sans-serif;
    }
    /* Hide scrollbar for Chrome, Safari and Opera */
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    /* Hide scrollbar for IE, Edge and Firefox */
    .no-scrollbar {
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
    }
    /* Elegant Word document A4 page simulation for workspace layout */
    .word-sheet {
      background-color: #ffffff;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
      transition: all 0.3s ease;
    }
    
    @media print {
      html, body {
        height: auto !important;
        overflow: visible !important;
        background-color: #ffffff !important;
        color: #000000 !important;
      }
      
      #quiz-screen, main, #result-screen {
        display: block !important;
        overflow: visible !important;
        height: auto !important;
        min-height: auto !important;
        max-height: none !important;
        position: static !important;
      }
      
      .print-hidden, header, aside, #active-timer-box, .actions-bar, button, .print\:hidden {
        display: none !important;
      }
      
      .word-sheet {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
        position: static !important;
      }

      /* Make sure question cards look clean, align beautifully, and do not break half-way across pages */
      #questions-container > div, #results-list > div {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        box-shadow: none !important;
        border: 1px solid #cbd5e1 !important;
        margin-bottom: 1.5rem !important;
      }
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen flex flex-col antialiased">

  <!-- ================= HEADER TOP BAR ================= -->
  <header class="bg-[#1e293b] text-white py-4 px-6 shadow-md shrink-0 flex items-center justify-between print-hidden">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-xl shadow-inner text-white">ត</div>
      <div>
        <h1 class="text-md sm:text-lg font-bold leading-none">${test.title}</h1>
        <p class="text-[11px] text-slate-400 mt-1">${test.grade} • មុខវិជ្ជា៖ ${test.subject}</p>
      </div>
    </div>
    
    <div id="active-timer-box" class="hidden items-center gap-3 bg-red-500/10 border border-red-500/20 px-4 py-1.5 rounded-full select-none">
      <div class="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></div>
      <span class="text-xs text-red-400 font-bold uppercase tracking-wider font-mono">នៅសល់ពេល ៖ </span>
      <span id="countdown-timer" class="text-sm font-extrabold text-red-400 font-mono tracking-widest">--:--</span>
    </div>
  </header>

  <!-- ================= ACTIVE QUIZ SCREEN (SCREEN 2) ================= -->
  <div id="quiz-screen" class="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
    
    <!-- Navigation Panels (Left on desktop) -->
    <aside class="w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col shrink-0 print-hidden">
      <!-- Student Badge Dashboard -->
      <div class="p-6 border-b border-slate-100 space-y-4 bg-slate-50/50">
        <h5 class="text-xs font-black text-slate-600 uppercase tracking-widest mb-1 pb-1 border-b border-dashed border-slate-200">ព័ត៌មានបេក្ខជន (Candidate Info)</h5>
        <div>
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">ឈ្មោះពេញរបស់សិស្ស (Full Name)</label>
          <input type="text" id="reg-name" required class="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 bg-white outline-none transition-all font-semibold" placeholder="ឧ. កែវ សម្បត្តិ">
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">អត្តលេខសិស្ស / លេខរៀង (Student ID)</label>
          <input type="text" id="reg-id" required class="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 bg-white outline-none transition-all font-bold" placeholder="ឧ. ID-88990">
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">ប្រភេទនៃការគ្រប់គ្រង (Type)</label>
          <select id="reg-month" class="w-full px-3 py-2 text-sm border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-semibold appearance-none">
            <option value="ការប្រឡងប្រចាំខែ">ការប្រឡងប្រចាំខែ (Standard Monthly Exam)</option>
            <option value="ស្វ័យសិក្សា និង អនុវត្ត">ស្វ័យសិក្សា និង ការអនុវត្តផ្ទាល់ខ្លួន</option>
          </select>
        </div>
      </div>

      <!-- Quick Index Question Tracker -->
      <div class="flex-1 p-6 overflow-y-auto space-y-4">
        <h5 class="text-xs font-bold text-slate-400 uppercase tracking-widest">រុករកសំណួរ (Quiz Navigation)</h5>
        <div id="navigator-tiles" class="grid grid-cols-5 gap-2">
          <!-- Dynamically filled with tiles -->
        </div>
      </div>

      <!-- Bottom submit bar -->
      <div class="p-6 border-t border-slate-100 shrink-0">
        <button onclick="submitQuiz()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg text-sm transition-all active:scale-95 flex items-center justify-center gap-2">
          <span>បញ្ជូនវិញ្ញាសា (Submit)</span>
        </button>
      </div>
    </aside>

    <!-- Main Content Work Area (Right side) - Styled like an elegant Word Page container -->
    <main class="flex-grow overflow-y-auto p-4 sm:p-8 bg-slate-100/40 no-scrollbar">
      <div class="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-8 sm:p-14 space-y-8 word-sheet print:shadow-none print:border-none print:p-0">
        
        <!-- Institutional Header (Like formal Word Document headers in Cambodia) -->
        <div class="grid grid-cols-2 text-center items-start border-b-4 border-double border-slate-500 pb-6 mb-8 text-xs sm:text-sm">
          <!-- Left Column -->
          <div class="text-left space-y-2">
            <h2 class="font-moul text-xs sm:text-sm text-slate-900 leading-normal">សាលារៀនជំនាន់ថ្មី / វិទ្យាល័យ</h2>
            <p class="font-bold text-slate-700 text-xs sm:text-sm">ថ្នាក់ទី៖ <span class="font-medium inline-block min-w-[50px] border-b border-dashed border-slate-400 text-center">${test.grade}</span></p>
            <p class="font-bold text-slate-700 text-xs sm:text-sm">មុខវិជ្ជា៖ <span class="font-medium inline-block min-w-[100px] border-b border-dashed border-slate-400 text-center">${test.subject}</span></p>
          </div>
          <!-- Right Column -->
          <div class="text-right space-y-1.5">
            <h2 class="font-moul text-xs text-slate-950 leading-normal">ព្រះរាជាណាចក្រកម្ពុជា</h2>
            <h3 class="font-moul text-[10px] text-slate-800 leading-normal">ជាតិ សាសនា ព្រះមហាក្សត្រ</h3>
            <p class="text-[11px] font-bold text-slate-500 italic">ជាតិ • សាសនា • ព្រះមហាក្សត្រ</p>
          </div>
        </div>

        <!-- Document Core Title Section -->
        <div class="text-center space-y-3 pb-2">
          <h1 class="font-moul text-sm sm:text-base text-slate-900 leading-loose">${test.title}</h1>
          <p class="text-xs sm:text-sm text-slate-500 italic font-medium">គណៈកម្មការរៀបចំការប្រឡងប្រចាំខែកម្រិតវិទ្យាល័យ</p>
        </div>

        <!-- Student Signature Blanks Box mimicking Word Exam Paper details -->
        <div class="bg-slate-50 border border-slate-150 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-700 font-medium">
          <div class="space-y-3">
            <p class="font-bold">ឈ្មោះសិស្ស (Full Name) ៖ <span id="doc-student-name" class="font-bold text-blue-700 border-b-2 border-dashed border-slate-300 px-2 pb-0.5 inline-block min-w-[160px]">...........................</span></p>
            <p class="font-bold">អត្តលេខសិស្ស (Student ID) ៖ <span id="doc-student-id" class="font-bold font-mono text-blue-800 border-b-2 border-dashed border-slate-300 px-2 pb-0.5 inline-block min-w-[120px]">...................</span></p>
          </div>
          <div class="space-y-3">
            <p class="font-bold">ប្រភេទនៃការគ្រប់គ្រង ៖ <span id="doc-student-month" class="font-bold text-slate-800 border-b-2 border-dashed border-slate-300 px-2 pb-0.5 inline-block min-w-[150px]">...........................</span></p>
            <p class="font-bold text-red-650">រយៈពេលធ្វើតេស្តសរុប ៖ <span class="font-extrabold border-b border-dashed border-slate-300 px-1 inline-block text-center min-w-[40px] text-slate-800">${duration}</span> នាទី</p>
          </div>
        </div>

        <!-- Beautiful Decorative Line divider -->
        <div class="flex items-center justify-center my-6">
          <div class="h-0.5 bg-slate-200 flex-1"></div>
          <span class="text-slate-400 px-3 text-[10px] sm:text-xs tracking-widest font-bold uppercase">សន្លឹកកិច្ចការប្រឡង (EXAM PAPER)</span>
          <div class="h-0.5 bg-slate-200 flex-1"></div>
        </div>

        <!-- Questions Dynamic List Container (Looks clean and readable, like printed sheet) -->
        <div class="space-y-8" id="questions-container">
          <!-- Questions will render here dynamically -->
        </div>

      </div>
    </main>
  </div>

  <!-- ================= RESULT REPORT BOARD (SCREEN 3) ================= -->
  <div id="result-screen" class="hidden flex-1 p-4 py-12 overflow-y-auto max-w-4xl mx-auto w-full space-y-8">
    
    <!-- Printable Result Sheet simulating Word Document as well -->
    <div class="bg-white border border-slate-250 rounded-2xl shadow-xl p-8 sm:p-14 space-y-8 word-sheet print:shadow-none print:border-none print:p-0">
      
      <!-- Institutional Header -->
      <div class="grid grid-cols-2 text-center items-start border-b-4 border-double border-slate-500 pb-6 text-xs sm:text-sm">
        <!-- Left Column -->
        <div class="text-left space-y-1.5">
          <h2 class="font-moul text-xs sm:text-sm text-slate-900 leading-normal">សាលារៀនជំនាន់ថ្មី / វិទ្យាល័យ</h2>
          <p class="font-bold text-slate-500 text-[10px]">របាយការណ៍លទ្ធផលសិស្ស (Exam Result Sheet)</p>
        </div>
        <!-- Right Column -->
        <div class="text-right space-y-1">
          <h2 class="font-moul text-[10px] text-slate-900 leading-normal">ព្រះរាជាណាចក្រកម្ពុជា</h2>
          <p class="text-[10px] font-bold text-slate-500 italic">ជាតិ • សាសនា • ព្រះមហាក្សត្រ</p>
        </div>
      </div>

      <!-- Result Information Card -->
      <div class="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-50 border border-slate-150 rounded-2xl p-6">
        <div class="space-y-4 flex-1 text-center md:text-left">
          <span class="px-3 py-1 bg-emerald-50 text-emerald-600 font-bold rounded-full text-xs uppercase tracking-wide inline-block">លទ្ធផលទទួលបាន (Exam Completed)</span>
          <h2 id="result-student-title" class="text-xl font-bold text-slate-800 tracking-tight font-moul">សួស្ដី, --</h2>
          <p class="text-xs text-slate-500">អ្នកបានបញ្ចប់សំណួរ និងបញ្ជូនចម្លើយដោយជោគជ័យ។ ព័ត៌មានខាងក្រោមជាលទ្ធផលប្រឡងរបស់អ្នក៖</p>
          
          <div class="grid grid-cols-2 gap-4 max-w-xs pt-2">
            <div>
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">អត្តលេខរបស់សិស្ស</span>
              <span id="result-display-id" class="text-xs font-bold font-mono tracking-wide text-slate-700">--</span>
            </div>
            <div>
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ប្រភេទនៃការគ្រប់គ្រង</span>
              <span id="result-display-month" class="text-xs font-bold text-slate-700">--</span>
            </div>
          </div>
        </div>

        <!-- Score Ring Badge -->
        <div class="flex flex-col items-center justify-center shrink-0">
          <div id="result-radial-score" class="w-24 h-24 rounded-full border-4 border-slate-200 flex flex-col items-center justify-center bg-white shadow-md">
            <span id="score-text" class="text-3xl font-black text-slate-800 font-mono">--</span>
            <div class="w-8 h-[1px] bg-slate-200 my-0.5"></div>
            <span id="total-text" class="text-xs font-bold text-slate-400 font-mono">--</span>
          </div>
          <span id="score-grade" class="text-xs font-extrabold text-slate-500 mt-4 tracking-wider uppercase bg-slate-100 px-3 py-1 rounded-full">--</span>
        </div>
      </div>

      <!-- Review Correction Panel -->
      <div class="space-y-6 pt-4">
        <h3 class="text-base font-bold font-moul text-slate-805 flex items-center gap-2">
          <span>កែតម្រង់វិញ្ញាសា និងពន្យល់ (Correction Key) ៖</span>
        </h3>
        <div id="results-list" class="space-y-8">
          <!-- Dynamically filled with corrected review items -->
        </div>
      </div>

    </div>

    <!-- Actions Control Bar -->
    <div class="flex flex-wrap gap-4 items-center justify-between p-4 bg-slate-100 rounded-2xl print-hidden">
      <p class="text-xs text-slate-500 font-medium pl-2">ចង់រក្សាទុកពត៌មានលទ្ធផលនេះមែនទេ? អ្នកអាចជ្រើសរើស៖</p>
      <div class="flex gap-2">
        <button onclick="window.print()" class="px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-all shadow-md flex items-center gap-2">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H9a2 2 0 00-2 2v3a2 2 0 002 2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14"/></svg>
          <span>បោះពុម្ពលទ្ធផល (Print Report)</span>
        </button>
      </div>
    </div>

  </div>

  <!-- ================= DYNAMIC LOGIC CONTROLLER JS ================= -->
  <script>
    // Injected dynamic questions data
    const QUESTIONS_DATA = ${JSON.stringify(sanitizedQuestions).replace(/<\/script>/gi, "<\\/script>")};
    const TEST_TITLE = ${JSON.stringify(test.title).replace(/<\/script>/gi, "<\\/script>")};
    const TEST_DURATION = ${duration};

    // State Variables
    let currentStudent = { name: "", id: "", month: "" };
    let countdownTimerInterval = null;
    let timeRemainingSeconds = TEST_DURATION * 60;
    let studentAnswers = {};

    window.onload = function() {
      // Check if candidate already completed this test
      if (localStorage.getItem('completed_' + TEST_TITLE) === 'true') {
        alert("សុំទោស! ឧបករណ៍/កុំព្យូទ័រនេះ បានប្រឡងវិញ្ញាសានេះរួចរាល់ហើយ។ ប្រព័ន្ធតម្រូវឱ្យធ្វើតេស្តបានតែ ១ ដងគត់។");
        document.body.innerHTML = 
          '<div class="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">' +
            '<div class="bg-white p-8 rounded-3xl border shadow-xl max-w-md w-full">' +
              '<span class="px-3 py-1 bg-red-50 text-red-650 font-bold rounded-full text-xs inline-block">លទ្ធផលទទួលបាន</span>' +
              '<h2 class="text-xl font-bold text-slate-800 mt-4 font-sans">អ្នកបានធ្វើតេស្តរួចហើយ! (Completed)</h2>' +
              '<p class="text-slate-400 mt-2 text-sm">ប្រព័ន្ធមិនអនុញ្ញាតឱ្យប្រឡងម្ដងទៀតឡើយ。</p>' +
            '</div>' +
          '</div>';
        return;
      }

      // Initialize questionnaire right away
      renderQuizContent();

      // Show Timer Box
      document.getElementById('active-timer-box').className = 'flex items-center gap-3 bg-red-500/10 border border-red-500/20 px-4 py-1.5 rounded-full select-none';

      // Start Countdown Timer
      startTimer();
    };

    /**
     * Countdown clock
     */
    function startTimer() {
      const display = document.getElementById('countdown-timer');
      
      function updateClock() {
        if (timeRemainingSeconds <= 0) {
          clearInterval(countdownTimerInterval);
          alert("អស់ម៉ោងធ្វើតេស្តហើយ! សន្លឹកកិច្ចការនឹងត្រូវបញ្ជូនដោយស្វ័យប្រវត្តិ។");
          evaluateAndShowResult();
          return;
        }

        let minutes = Math.floor(timeRemainingSeconds / 60);
        let seconds = timeRemainingSeconds % 60;

        minutes = minutes < 10 ? '0' + minutes : minutes;
        seconds = seconds < 10 ? '0' + seconds : seconds;

        display.textContent = minutes + ':' + seconds;

        // Visual warning if time is running thin
        if (timeRemainingSeconds < 300) {
          display.parentElement.className = 'flex items-center gap-3 bg-red-500 animate-pulse text-white px-4 py-1.5 rounded-full select-none';
          display.className = 'text-sm font-extrabold font-mono tracking-widest text-white';
        }

        timeRemainingSeconds--;
      }

      updateClock();
      countdownTimerInterval = setInterval(updateClock, 1000);
    }

    /**
     * Dynamically renders questions and Navigation Tiles
     */
    function renderQuizContent() {
      const tilesContainer = document.getElementById('navigator-tiles');
      const questionsContainer = document.getElementById('questions-container');

      tilesContainer.innerHTML = '';
      questionsContainer.innerHTML = '';

      QUESTIONS_DATA.forEach((q, index) => {
        // Tile Number Navigator
        const tile = document.createElement('button');
        tile.id = 'tile-' + index;
        tile.className = 'h-10 border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/50 rounded-xl flex items-center justify-center font-bold text-xs text-slate-500 transition-all duration-200';
        tile.textContent = index + 1;
        tile.onclick = () => {
          const ele = document.getElementById('q-card-' + index);
          if (ele) ele.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
        tilesContainer.appendChild(tile);

        // Core Question Card Frame
        const card = document.createElement('div');
        card.id = 'q-card-' + index;
        card.className = 'bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6';

        // Question Title and Tag Header
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between gap-4 border-b border-slate-100 pb-4';
        header.innerHTML = '<div class="flex items-center gap-3">' +
          '<span class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-black text-xs text-blue-600 shadow-inner">' + (index + 1) + '</span>' +
          '<span class="px-3 py-1 bg-slate-100 text-slate-500 font-bold rounded-full text-[10px] uppercase tracking-wider">' + q.type + '</span>' +
          '</div>';
        card.appendChild(header);

        // Main Question Statement
        const bodyContent = document.createElement('div');
        bodyContent.className = 'space-y-6';
        
        const qStatement = document.createElement('div');
        qStatement.className = 'text-base sm:text-lg font-bold text-slate-800 leading-relaxed';
        qStatement.textContent = q.question;
        bodyContent.appendChild(qStatement);

        // SVG Render logic
        if (q.svg) {
          const svgDiv = document.createElement('div');
          svgDiv.className = 'flex justify-center my-6 max-w-full overflow-hidden p-4 rounded-2xl bg-slate-50 border border-slate-100';
          svgDiv.innerHTML = q.svg;
          bodyContent.appendChild(svgDiv);
        }

        // Handle Controls per Question Type
        const controlBox = document.createElement('div');
        controlBox.className = 'mt-6';

        if (q.type === 'ពហុជ្រើសរើស' && q.options) {
          // Multiple choice
          const optList = document.createElement('div');
          optList.className = 'grid grid-cols-1 sm:grid-cols-2 gap-3.5';
          q.options.forEach((opt, optIdx) => {
            const label = document.createElement('label');
            label.className = 'flex items-center gap-3 p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-blue-200 cursor-pointer transition-all active:scale-98 select-none' + ' option-label-' + index;
            
            const sanitizedOpt = opt.replace(/'/g, "\\'").replace(/"/g, "&quot;");
            
            label.innerHTML = '<input type="radio" name="q-ans-' + index + '" value="' + sanitizedOpt + '" onchange="recordAnswer(\'' + index + '\', \'' + optIdx + '\', this.value)" class="h-5 w-5 text-blue-600 focus:ring-blue-500 border-slate-300">' +
              '<span class="text-sm font-semibold text-slate-600">' + opt + '</span>';
            optList.appendChild(label);
          });
          controlBox.appendChild(optList);

        } else if (q.type === 'ខុសត្រូវ') {
          // True False
          const tfList = document.createElement('div');
          tfList.className = 'grid grid-cols-2 gap-4 max-w-md';
          ['ត្រឹមត្រូវ', 'មិនត្រឹមត្រូវ'].forEach((val) => {
            const label = document.createElement('label');
            label.className = 'flex items-center gap-3 p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-blue-200 cursor-pointer transition-all active:scale-98 select-none' + ' option-label-' + index;
            label.innerHTML = '<input type="radio" name="q-ans-' + index + '" value="' + val + '" onchange="recordAnswer(\'' + index + '\', null, this.value)" class="h-5 w-5 text-blue-600 focus:ring-blue-500 border-slate-300">' +
              '<span class="text-sm font-semibold text-slate-600">' + val + '</span>';
            tfList.appendChild(label);
          });
          controlBox.appendChild(tfList);

        } else if (q.type === 'បំពេញចន្លោះ') {
          // Fill in the blanks
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'w-full max-w-md px-5 py-3.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-slate-50 font-semibold outline-none transition-all';
          input.placeholder = 'វាយបញ្ជូលចម្លើយបំពេញចន្លោះរបស់អ្នក...';
          input.oninput = (e) => {
            recordAnswer(index, null, e.target.value);
          };
          controlBox.appendChild(input);

        } else if (q.type === 'ចម្លើយខ្លី' || q.type === 'ចម្លើយវែង') {
          // Essay Written Answer
          const textarea = document.createElement('textarea');
          textarea.className = 'w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-slate-50 outline-none transition-all text-sm font-medium leading-relaxed';
          textarea.rows = q.type === 'ចម្លើយខ្លី' ? 3 : 6;
          textarea.placeholder = 'វាយសរសេរចម្លើយលម្អិតរបស់អ្នកនៅទីនេះ...';
          textarea.oninput = (e) => {
            recordAnswer(index, null, e.target.value);
          };
          controlBox.appendChild(textarea);

        } else if (q.type === 'ផ្គូរផ្គង' && q.matchingPairs) {
          // Matching pairs view format
          const matchGrid = document.createElement('div');
          matchGrid.className = 'space-y-4 border border-slate-100 p-4 rounded-2xl bg-slate-50/50';
          
          q.matchingLefts.forEach((leftVal, leftIdx) => {
            const row = document.createElement('div');
            row.className = 'flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 py-2 border-b border-slate-100 last:border-b-0';
            
            let selectOptionsHtml = '<option value="">-- សូមជ្រើសរើសចម្លើយផ្គូផ្គង --</option>';
            q.matchingRights.forEach((col) => {
              const sanitizedCol = col.replace(/'/g, "\\'").replace(/"/g, "&quot;");
              selectOptionsHtml += '<option value="' + sanitizedCol + '">' + col + '</option>';
            });

            row.innerHTML = '<div class="flex items-center gap-3 flex-1 pr-4">' +
              '<span class="w-6 h-6 rounded bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-[11px] shrink-0 font-mono">' + (leftIdx + 1) + '</span>' +
              '<span class="text-xs sm:text-sm font-bold text-slate-700">' + leftVal + '</span>' +
              '</div>' +
              '<div class="flex items-center gap-2">' +
              '<span class="hidden sm:block text-slate-400 font-bold">&#8680;</span>' +
              '<select id="match-sel-' + index + '-' + leftIdx + '" onchange="recordMatchingAnswer(\'' + index + '\', \'' + leftIdx + '\', this.value)" class="w-full sm:w-60 px-4 py-2 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold outline-none">' +
              selectOptionsHtml +
              '</select>' +
              '</div>';
            matchGrid.appendChild(row);
          });
          controlBox.appendChild(matchGrid);
        }

        bodyContent.appendChild(controlBox);
        card.appendChild(bodyContent);
        questionsContainer.appendChild(card);
      });

      // Force typeset parsing for newly loaded formulas
      if (typeof renderMathInElement === 'function') {
        renderMathInElement(questionsContainer, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false}
          ]
        });
      }
    }

    /**
     * Answer tracking
     */
    function recordAnswer(questionIndex, optionIndex, value) {
      studentAnswers[questionIndex] = value;
      
      // Update Selection Labels style
      const labels = document.querySelectorAll('.option-label-' + questionIndex);
      labels.forEach((lbl, index) => {
        if (lbl.querySelector('input').checked) {
          lbl.className = 'flex items-center gap-3 p-4 border bg-blue-50/50 border-blue-400 rounded-2xl hover:bg-slate-50 hover:border-blue-200 cursor-pointer transition-all active:scale-98 select-none' + ' option-label-' + questionIndex;
        } else {
          lbl.className = 'flex items-center gap-3 p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-blue-200 cursor-pointer transition-all active:scale-98 select-none' + ' option-label-' + questionIndex;
        }
      });

      // Color Navigation map
      const tile = document.getElementById('tile-' + questionIndex);
      if (tile) {
        if (value.trim() !== "") {
          tile.className = 'h-10 border border-transparent bg-blue-500 hover:bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-md shadow-blue-500/20 transition-all duration-200';
        } else {
          tile.className = 'h-10 border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/50 rounded-xl flex items-center justify-center font-bold text-xs text-slate-500 transition-all duration-200';
        }
      }
    }

    /**
     * Tracking matching pairs
     */
    function recordMatchingAnswer(questionIdx, rowIdx, value) {
      if (!studentAnswers[questionIdx] || typeof studentAnswers[questionIdx] !== 'object') {
        studentAnswers[questionIdx] = {};
      }
      studentAnswers[questionIdx][rowIdx] = value;

      // Check if all left fields are matched
      const qObj = QUESTIONS_DATA[questionIdx];
      let answeredCount = 0;
      qObj.matchingLefts.forEach((_, idx) => {
        if (studentAnswers[questionIdx][idx] && studentAnswers[questionIdx][idx].trim() !== '') {
          answeredCount++;
        }
      });

      const tile = document.getElementById('tile-' + questionIdx);
      if (tile) {
        if (answeredCount === qObj.matchingLefts.length) {
          tile.className = 'h-10 border border-transparent bg-blue-500 hover:bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-md shadow-blue-500/20 transition-all duration-200';
        } else if (answeredCount > 0) {
          tile.className = 'h-10 border-2 border-dashed border-blue-500 bg-blue-50/50 rounded-xl flex items-center justify-center font-bold text-xs text-blue-600 transition-all duration-200';
        } else {
          tile.className = 'h-10 border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/50 rounded-xl flex items-center justify-center font-bold text-xs text-slate-500 transition-all duration-200';
        }
      }
    }

    /**
     * Submit triggered by teacher or student
     */
    function submitQuiz() {
      // Validate candidate inputs first
      const nameVal = (document.getElementById('reg-name').value || "").trim();
      const idVal = (document.getElementById('reg-id').value || "").trim();
      const selectMonth = document.getElementById('reg-month');
      const monthVal = selectMonth ? selectMonth.options[selectMonth.selectedIndex].text : "ការប្រឡងប្រចាំខែ";

      if (!nameVal) {
        alert("សូមបញ្ចូលឈ្មោះពេញរបស់អ្នកជាមុនសិន! (Please fill candidate name before submitting)");
        document.getElementById('reg-name').focus();
        return;
      }
      if (!idVal) {
        alert("សូមបញ្ចូលអត្តលេខ / លេខរៀងរបស់សិស្សជាមុនសិន! (Please fill Student ID before submitting)");
        document.getElementById('reg-id').focus();
        return;
      }

      currentStudent.name = nameVal;
      currentStudent.id = idVal;
      currentStudent.month = monthVal;

      // Find count of answered items
      let totalQuestions = QUESTIONS_DATA.length;
      let answeredCount = 0;
      
      QUESTIONS_DATA.forEach((q, index) => {
        if (q.type === 'ផ្គូរផ្គង') {
          if (studentAnswers[index] && Object.values(studentAnswers[index]).some(v => v && v.trim() !== '')) {
            answeredCount++;
          }
        } else {
          if (studentAnswers[index] && studentAnswers[index].trim() !== '') {
            answeredCount++;
          }
        }
      });

      const unansweredCount = totalQuestions - answeredCount;
      let msg = "តើអ្នកប្រាកដជាចង់បញ្ជូនសន្លឹកកិច្ចការរបស់អ្នកមែនទេ?";
      if (unansweredCount > 0) {
        msg = "អ្នកនៅសល់ " + unansweredCount + " សំណួរដែលមិនទាន់បានបញ្ចូលចម្លើយនៅឡើយទេ។ តើអ្នកពិតជាចង់បញ្ជូនសន្លឹកកិច្ចការទាំងនេះមែនទេ?";
      }

      if (!confirm(msg)) return;

      clearInterval(countdownTimerInterval);
      document.getElementById('active-timer-box').className = 'hidden';
      
      evaluateAndShowResult();
    }

    /**
     * Grading engine and Sheet persistence trigger
     */
    function evaluateAndShowResult() {
      let finalScore = 0;
      let totalGradedWeights = 0;
      let resultsMarkup = "";
      
      // Store simplified responses summary text log string
      let answersLogArray = [];

      QUESTIONS_DATA.forEach((q, index) => {
        let isCorrect = false;
        let studentAnsText = "";
        let correctAnsText = "";
        let questionPoints = 0;
        let earnedPoints = 0;

        if (q.type === 'ពហុជ្រើសរើស') {
          questionPoints = 1;
          totalGradedWeights += 1;
          const choice = studentAnswers[index] || "មិនបានឆ្លើយ";
          studentAnsText = choice;
          correctAnsText = q.answer;
          isCorrect = (choice === q.answer);
          if (isCorrect) {
            earnedPoints = 1;
            finalScore += 1;
          }
          answersLogArray.push("Q" + (index + 1) + ": " + (isCorrect ? "ត្រូវ" : "ខុស") + " (ចម្លើយសិស្ស: " + choice + ")");

        } else if (q.type === 'ខុសត្រូវ') {
          questionPoints = 1;
          totalGradedWeights += 1;
          const choice = studentAnswers[index] || "មិនបានឆ្លើយ";
          studentAnsText = choice;
          correctAnsText = q.answer;
          isCorrect = (choice === q.answer);
          if (isCorrect) {
            earnedPoints = 1;
            finalScore += 1;
          }
          answersLogArray.push("Q" + (index + 1) + ": " + (isCorrect ? "ត្រូវ" : "ខុស") + " (ចម្លើយសិស្ស: " + choice + ")");

        } else if (q.type === 'បំពេញចន្លោះ') {
          questionPoints = 1;
          totalGradedWeights += 1;
          const inputVal = (studentAnswers[index] || "").trim();
          studentAnsText = inputVal === "" ? "មិនបានឆ្លើយ" : inputVal;
          correctAnsText = q.answer;
          isCorrect = (inputVal.toLowerCase() === String(q.answer).trim().toLowerCase());
          if (isCorrect) {
            earnedPoints = 1;
            finalScore += 1;
          }
          answersLogArray.push("Q" + (index + 1) + ": " + (isCorrect ? "ត្រូវ" : "ខុស") + " (ចម្លើយសិស្ស: " + studentAnsText + ")");

        } else if (q.type === 'ផ្គូរផ្គង' && q.matchingPairs) {
          // Matching pairs are graded per segment
          questionPoints = q.matchingPairs.length;
          totalGradedWeights += q.matchingPairs.length;
          
          let correctPairsCount = 0;
          let studentSubLog = [];
          
          q.matchingPairs.forEach((pair, pIdx) => {
            const studentMatchVal = studentAnswers[index] ? (studentAnswers[index][pIdx] || "") : "";
            const rowCorrect = (studentMatchVal === pair.right);
            if (rowCorrect) correctPairsCount++;
            studentSubLog.push(pair.left + " -> " + (studentMatchVal === "" ? "[ទទេ]" : studentMatchVal));
          });
          
          earnedPoints = correctPairsCount;
          finalScore += correctPairsCount;
          isCorrect = (correctPairsCount === q.matchingPairs.length);
          
          studentAnsText = studentSubLog.join(" | ");
          correctAnsText = q.matchingPairs.map(p => p.left + " -> " + p.right).join(" | ");
          
          answersLogArray.push("Q" + (index + 1) + ": " + "ត្រូវ " + correctPairsCount + "/" + q.matchingPairs.length);

        } else if (q.type === 'ចម្លើយខ្លី' || q.type === 'ចម្លើយវែង') {
          // Essay types
          const textVal = (studentAnswers[index] || "").trim();
          studentAnsText = textVal === "" ? "មិនបានឆ្លើយ" : textVal;
          correctAnsText = "[ត្រួតពិនិត្យដោយគ្រូ]";
          earnedPoints = 0;
          questionPoints = 0; // Not counted in computer-graded weights
          answersLogArray.push("Q" + (index + 1) + ": [ចម្លើយខ្លី/វែង] ចម្លើយសិស្ស: " + studentAnsText);
        }

        // Layout Review Cards
        const borderCls = isCorrect ? 'border-emerald-200 shadow-emerald-500/5' : 'border-red-150 shadow-red-500/5';
        const signHtml = isCorrect ? '<span class="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">✓</span>' : '<span class="w-7 h-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs">✗</span>';
        const pointsText = (q.type === 'ចម្លើយខ្លី' || q.type === 'ចម្លើយវែង') ? '[ផ្ដោតលើការកែដោយគ្រូ]' : 'ពិន្ទុ៖ ' + earnedPoints + ' / ' + questionPoints;
        const pointsColor = isCorrect ? 'text-emerald-650' : 'text-red-500';
        
        let correctionLine = '';
        if (q.type !== 'ចម្លើយខ្លី' && q.type !== 'ចម្លើយវែង') {
          correctionLine = '<p><strong class="text-slate-500">ចម្លើយត្រឹមត្រូវ ៖</strong> <span class="text-emerald-700 font-bold">' + correctAnsText + '</span></p>';
        }

        let explanationHtml = '';
        if (q.explanation) {
          explanationHtml = '<div class="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl text-xs sm:text-sm text-slate-600 leading-relaxed">' +
            '<span class="font-extrabold text-blue-800 text-xs uppercase tracking-wide block mb-1">ការពន្យល់គន្លឹះ (Pedagogical Explanation) ៖</span>' +
            q.explanation +
            '</div>';
        }

        resultsMarkup += '<div class="bg-white border rounded-3xl p-6 sm:p-8 ' + borderCls + ' space-y-4">' +
          '<div class="flex items-center justify-between gap-4">' +
          signHtml +
          '<span class="text-xs font-bold ' + pointsColor + '">' + pointsText + '</span>' +
          '</div>' +
          '<p class="font-bold text-slate-800 leading-relaxed">' + (index + 1) + '. ' + q.question + '</p>' +
          '<div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-sm">' +
          '<p><strong class="text-slate-500">ចម្លើយរបស់អ្នក ៖</strong> <span class="' + (isCorrect ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold') + '">' + studentAnsText + '</span></p>' +
          correctionLine +
          '</div>' +
          explanationHtml +
          '</div>';
      });

      // Save completion state in localStorage to block multiple runs
      try {
        localStorage.setItem('completed_' + TEST_TITLE, 'true');
      } catch (e) {
        console.warn(e);
      }

      // Submit results to server Google Sheets via Google Apps Script API!
      const finalAnswersLogString = answersLogArray.join(" || ");
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.withSuccessHandler(function(response) {
          console.log("លទ្ធផលត្រូវបានរក្សាទុកក្នុង Google Sheets យ៉ាងជោគជ័យ។", response);
        }).saveResult(
          currentStudent.name,
          currentStudent.id,
          currentStudent.month,
          finalScore,
          totalGradedWeights,
          finalAnswersLogString
        );
      }

      // Populate displays
      document.getElementById('score-text').textContent = finalScore;
      document.getElementById('total-text').textContent = totalGradedWeights;
      
      const percentVal = totalGradedWeights > 0 ? (finalScore / totalGradedWeights * 100) : 100;
      let gradeLabel = "";
      let radialCls = "";
      let scoreColorCls = "";

      if (percentVal >= 90) {
        gradeLabel = "🏆 ល្អឥតខ្ចោះ (A)";
        radialCls = "w-24 h-24 rounded-full border-4 border-amber-400 flex flex-col items-center justify-center bg-white shadow-lg shadow-amber-500/10";
        scoreColorCls = "text-3xl font-black text-amber-500 font-mono";
      } else if (percentVal >= 80) {
        gradeLabel = "🎖️ ល្អណាស់ (B)";
        radialCls = "w-24 h-24 rounded-full border-4 border-emerald-500 flex flex-col items-center justify-center bg-white shadow-lg shadow-emerald-500/10";
        scoreColorCls = "text-3xl font-black text-emerald-600 font-mono";
      } else if (percentVal >= 50) {
        gradeLabel = "👍 Pass (C/D)";
        radialCls = "w-24 h-24 rounded-full border-4 border-blue-500 flex flex-col items-center justify-center bg-white shadow-lg shadow-blue-500/10";
        scoreColorCls = "text-3xl font-black text-blue-600 font-mono";
      } else {
        gradeLabel = "⚠️ ព្យាយាមបន្ថែមទៀត (E/F)";
        radialCls = "w-24 h-24 rounded-full border-4 border-rose-400 flex flex-col items-center justify-center bg-white shadow-lg shadow-rose-500/10";
        scoreColorCls = "text-3xl font-black text-rose-500 font-mono";
      }

      document.getElementById('result-radial-score').className = radialCls;
      document.getElementById('score-text').className = scoreColorCls;
      
      const gradeBadge = document.getElementById('score-grade');
      gradeBadge.textContent = gradeLabel;
      
      if (percentVal >= 50) {
        gradeBadge.className = 'text-xs font-extrabold text-emerald-600 mt-4 tracking-wider uppercase bg-emerald-100/50 px-3 py-1 rounded-full';
      } else {
        gradeBadge.className = 'text-xs font-extrabold text-rose-500 mt-4 tracking-wider uppercase bg-rose-100/50 px-3 py-1 rounded-full';
      }

      document.getElementById('result-student-title').textContent = "សួស្ដី, " + currentStudent.name;
      document.getElementById('result-display-id').textContent = currentStudent.id;
      document.getElementById('result-display-month').textContent = currentStudent.month;

      // Swap to Result view
      document.getElementById('quiz-screen').style.display = 'none';
      document.getElementById('result-screen').className = 'flex-1 p-4 py-12 overflow-y-auto max-w-4xl mx-auto w-full space-y-8 animate-fade-in';

      // Load corrected items list
      document.getElementById('results-list').innerHTML = resultsMarkup;

      // Re-typeset the results view Math equations
      if (typeof renderMathInElement === 'function') {
        renderMathInElement(document.getElementById('results-list'), {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false}
          ]
        });
      }
    }
  </script>
</body>
</html>`;

  // Generate automated Google Form Builder Apps Script (FormApp) for pure and elegant Google Form Quizzes
  let formScript = `// =========================================================================
// កូដបង្កើត Google Form Quiz ដោយស្វ័យប្រវត្តិ (Google Form Quiz Creator)
// វិញ្ញាសា៖ ${test.title}
// =========================================================================
//
// របៀបប្រើប្រាស់ងាយៗ (How to use)៖
// ១. ចូលទៅកាន់ Google Apps Script (https://script.google.com) រួចបង្កើតគម្រោងថ្មី (New Project)
// ២. លុបកូដចាស់ៗទាំងអស់ចោល រួចផាស (Paste) កូដនេះចូល រួចចុច Save 💾 (រូបថាស)
// ៣. ចុចប៊ូតុង "Run" ▶️ (រត់) នៅខាងលើ ដើម្បីដំណើរការកូដបង្កើត Google Form ផ្ទាល់តែម្ដង!
// ៤. ប្រព័ន្ធនឹងទាមទារការអនុញ្ញាត (Permissions)៖ ចុច "Review Permissions" -> ជ្រើសរើស Gmail -> Advanced -> Go to ... (Unsafe) -> Allow
// ៥. រង់ចាំតែប៉ុន្មានវិនាទី លីង Google Form Quiz នឹងលេចចេញមកក្នុង "Execution log" (ប្រវត្តិលកឡុក) នៅផ្នែកខាងក្រោម!
// =========================================================================

function createGoogleForm() {
  var form = FormApp.create(${JSON.stringify("វិញ្ញាសា៖ " + test.title)});
  form.setIsQuiz(true);
  form.setDescription(${JSON.stringify("សាលារៀនជំនាន់ថ្មី / វិទ្យាល័យ\nមុខវិជ្ជា៖ " + test.subject + " | ថ្នាក់ទី៖ " + test.grade + "\nរយៈពេលធ្វើតេស្ត៖ " + duration + " នាទី\n\nសេចក្ដីណែនាំ៖ សូមអានសំណួរនីមួយៗឱ្យបានច្បាស់លាស់ រួចជ្រើសរើសចម្លើយដែលត្រឹមត្រូវបំផុត។")});
  
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(true);
  form.setShowLinkToRespondAgain(false);
  
  var item;
  var feedback;

  // ផ្នែកទី១៖ ព័ត៌មានផ្ទាល់ខ្លួនរបស់សិស្ស (Student Personal Information)
  var sectionHeader = form.addSectionHeaderItem();
  sectionHeader.setTitle("✍️ ព័ត៌មានផ្ទាល់ខ្លួនរបស់សិស្ស (Student Profile)");
  sectionHeader.setHelpText("សូមបំពេញព័ត៌មានខាងក្រោមឱ្យបានត្រឹមត្រូវ មុននឹងចាប់ផ្ដើមធ្វើការឆ្លើយសំណួរផ្ដលកិច្ចការ។");

  var nameItem = form.addTextItem();
  nameItem.setTitle("គោត្តនាម និងនាមសិស្ស (Student Full Name) ✍️");
  nameItem.setRequired(true);

  var classItem = form.addTextItem();
  classItem.setTitle("ថ្នាក់រៀន (Class/Grade) 🏫");
  classItem.setRequired(true);
`;

  sanitizedQuestions.forEach((q, idx) => {
    const qNum = idx + 1;
    const cleanQ = beautifyMath(q.question);
    const escapedQ = cleanQ.replace(/"/g, '\\"').replace(/\n/g, '\\n');

    if (q.type === QuestionType.MULTIPLE_CHOICE && q.options) {
      const correctAns = beautifyMath(typeof q.answer === 'string' ? q.answer : '');
      formScript += `
  // សំណួរទី ${qNum} (ពហុជ្រើសរើស - ២០% / ២០ពិន្ទុ)
  item = form.addMultipleChoiceItem();
  item.setTitle("សំណួរទី ${qNum}៖ ${escapedQ}");
  item.setPoints(20);
  item.setChoices([
    ${q.options.map(opt => {
      const cleanOpt = beautifyMath(opt);
      const isCorrect = cleanOpt === correctAns;
      return `item.createChoice("${cleanOpt.replace(/"/g, '\\"')}", ${isCorrect})`;
    }).join(',\n    ')}
  ]);
  ${q.svg ? `
  // សំណួរនេះមានរូបភាពគំនូរតាង/ធរណីមាត្រ (SVG Diagram)
  item.setHelpText("💡 (សេចក្ដីណែនាំ៖ សំណួរនេះមានរូបភាពគំនូរតាងធរណីមាត្រ។ លោកគ្រូអាចបន្ថែមរូបភាពជាក់ស្ដែងតាមរយៈការចុចប៊ូតុង 'រូបភាព/Image' នៅក្បែរចំណងជើងសំណួរនេះ ឬទាញយករូបភាពពីប្រព័ន្ធដើម្បីផ្ទុកឡើង!)");
  ` : ''}
  ${q.explanation ? `
  feedback = FormApp.createFeedback().setText("ការពន្យល់៖ ${beautifyMath(q.explanation).replace(/"/g, '\\"').replace(/\n/g, '\\n')}").build();
  item.setFeedbackForCorrect(feedback);
  item.setFeedbackForIncorrect(feedback);
  ` : ''}
`;
    } else if (q.type === QuestionType.TRUE_FALSE) {
      const correctAns = beautifyMath(typeof q.answer === 'string' ? q.answer : 'ត្រឹមត្រូវ');
      const isTrue = correctAns.includes('ត្រឹមត្រូវ') || correctAns.toLowerCase().includes('true');
      const isFalse = !isTrue;
      
      formScript += `
  // សំណួរទី ${qNum} (ខុសត្រូវ - ៥% / ៥ពិន្ទុ)
  item = form.addMultipleChoiceItem();
  item.setTitle("សំណួរទី ${qNum}៖ ${escapedQ} (ត្រឹមត្រូវ ឬ មិនត្រឹមត្រូវ?)");
  item.setPoints(5);
  item.setChoices([
    item.createChoice("ត្រឹមត្រូវ", ${isTrue}),
    item.createChoice("មិនត្រឹមត្រូវ", ${isFalse})
  ]);
  ${q.svg ? `
  // សំណួរនេះមានរូបភាពគំនូរតាង/ធរណីមាត្រ (SVG Diagram)
  item.setHelpText("💡 (សេចក្ដីណែនាំ៖ សំណួរនេះមានរូបភាពគំនូរតាងធរណីមាត្រ។ លោកគ្រូអាចបន្ថែមរូបភាពជាក់ស្ដែងតាមរយៈការចុចប៊ូតុង 'រូបភាព/Image' នៅក្បែរចំណងជើងសំណួរនេះ!)");
  ` : ''}
  ${q.explanation ? `
  feedback = FormApp.createFeedback().setText("ការពន្យល់៖ ${beautifyMath(q.explanation).replace(/"/g, '\\"').replace(/\n/g, '\\n')}").build();
  item.setFeedbackForCorrect(feedback);
  item.setFeedbackForIncorrect(feedback);
  ` : ''}
`;
    } else if (q.type === QuestionType.FILL_BLANKS) {
      const ansText = beautifyMath(typeof q.answer === 'string' ? q.answer : String(q.answer));
      formScript += `
  // សំណួរទី ${qNum} (បំពេញចន្លោះ - ២០% / ២០ពិន្ទុ)
  item = form.addTextItem();
  item.setTitle("សំណួរទី ${qNum} (បំពេញចន្លោះ)៖ ${escapedQ}");
  item.setPoints(20);
  ${q.svg ? `
  // សំណួរនេះមានរូបភាពគំនូរតាង/ធរណីមាត្រ (SVG Diagram)
  item.setHelpText("💡 (សេចក្ដីណែនាំ៖ សំណួរនេះមានរូបភាពគំនូរតាងធរណីមាត្រ។ លោកគ្រូអាចបន្ថែមរូបភាពជាក់ស្ដែងតាមរយៈការចុចប៊ូតុង 'រូបភាព/Image' នៅក្បែរចំណងជើងសំណួរនេះ!)");
  ` : ''}
  feedback = FormApp.createFeedback().setText("ចម្លើយត្រឹមត្រូវគឺ៖ ${ansText.replace(/"/g, '\\"')}${q.explanation ? `\\nការពន្យល់៖ ${beautifyMath(q.explanation).replace(/"/g, '\\"').replace(/\n/g, '\\n')}` : ''}").build();
  item.setGeneralFeedback(feedback);
`;
    } else if (q.type === QuestionType.SHORT_ANSWER) {
      const ansText = beautifyMath(typeof q.answer === 'string' ? q.answer : String(q.answer));
      formScript += `
  // សំណួរទី ${qNum} (ចម្លើយខ្លី - ២០% / ២០ពិន្ទុ)
  item = form.addTextItem();
  item.setTitle("សំណួរទី ${qNum} (ចម្លើយខ្លី)៖ ${escapedQ}");
  item.setPoints(20);
  ${q.svg ? `
  // សំណួរនេះមានរូបភាពគំនូរតាង/ធរណីមាត្រ (SVG Diagram)
  item.setHelpText("💡 (សេចក្ដីណែនាំ៖ សំណួរនេះមានរូបភាពគំនូរតាងធរណីមាត្រ។ លោកគ្រូអាចបន្ថែមរូបភាពជាក់ស្ដែងតាមរយៈការចុចប៊ូតុង 'រូបភាព/Image' នៅក្បែរចំណងជើងសំណួរនេះ!)");
  ` : ''}
  feedback = FormApp.createFeedback().setText("គន្លឹះចម្លើយ៖ ${ansText.replace(/"/g, '\\"')}${q.explanation ? `\\nការពន្យល់៖ ${beautifyMath(q.explanation).replace(/"/g, '\\"').replace(/\n/g, '\\n')}` : ''}").build();
  item.setGeneralFeedback(feedback);
`;
    } else if (q.type === QuestionType.LONG_ANSWER) {
      const ansText = beautifyMath(typeof q.answer === 'string' ? q.answer : String(q.answer));
      formScript += `
  // សំណួរទី ${qNum} (ចម្លើយវែង - ២០% / ២០ពិន្ទុ)
  item = form.addParagraphTextItem();
  item.setTitle("សំណួរទី ${qNum} (ចម្លើយវែង)៖ ${escapedQ}");
  item.setPoints(20);
  ${q.svg ? `
  // សំណួរនេះមានរូបភាពគំនូរតាង/ធរណីមាត្រ (SVG Diagram)
  item.setHelpText("💡 (សេចក្ដីណែនាំ៖ សំណួរនេះមានរូបភាពគំនូរតាងធរណីមាត្រ។ លោកគ្រូអាចបន្ថែមរូបភាពជាក់ស្ដែងតាមរយៈការចុចប៊ូតុង 'រូបភាព/Image' នៅក្បែរចំណងជើងសំណួរនេះ!)");
  ` : ''}
  feedback = FormApp.createFeedback().setText("គន្លឹះចម្លើយ និងគោលការណ៍ពិន្ទុ៖ ${ansText.replace(/"/g, '\\"')}${q.explanation ? `\\nការពន្យល់៖ ${beautifyMath(q.explanation).replace(/"/g, '\\"').replace(/\n/g, '\\n')}` : ''}").build();
  item.setGeneralFeedback(feedback);
`;
    } else if (q.type === QuestionType.MATCHING && q.matchingPairs) {
      const rows = q.matchingPairs
        .map(p => beautifyMath(p.left || "").trim())
        .filter(r => r.length > 0)
        .map(r => r.replace(/"/g, '\\"'));

      const cols = Array.from(new Set([
        ...q.matchingPairs.map(p => beautifyMath(p.right || "").trim()),
        ...(q.distractors || []).map(d => beautifyMath(d || "").trim())
      ]))
      .filter(c => c.length > 0)
      .map(col => col.replace(/"/g, '\\"'));
      
      formScript += `
  // សំណួរទី ${qNum} (ផ្គូផ្គង - ១៥% / ១៥ពិន្ទុ)
  item = form.addGridItem();
  item.setTitle("សំណួរទី ${qNum}៖ ${escapedQ} (ទម្រង់តារាងផ្គូផ្គង - ពិន្ទុសរុប ១៥%)");
  item.setRows([${rows.map(r => `"${r}"`).join(', ')}]);
  item.setColumns([${cols.map(c => `"${c}"`).join(', ')}]);
  item.setRequired(true);
  ${q.svg ? `
  // សំណួរនេះមានរូបភាពគំនូរតាង/ធរណីមាត្រ (SVG Diagram)
  item.setHelpText("💡 (សេចក្ដីណែនាំ៖ សំណួរនេះមានរូបភាពគំនូរតាងធរណីមាត្រ។ លោកគ្រូអាចបន្ថែមរូបភាពជាក់ស្ដែងតាមរយៈការចុចប៊ូតុង 'រូបភាព/Image' នៅក្បែរចំណងជើងសំណួរនេះ!)");
  ` : ''}
`;
    }
  });

  formScript += `
  Logger.log("\\n=========================================================================");
  Logger.log("🎉 บង្កើត Google Form Quiz ទទួលបានជោគជ័យ! (Form Created Successfully!)");
  Logger.log("=========================================================================");
  Logger.log("👉 💻 លីងសម្រាប់លោកគ្រូកែសម្រួល (Edit Form / Teacher Link):\\n" + form.getEditUrl());
  Logger.log("=========================================================================");
  Logger.log("👉 🎯 លីងសម្រាប់ផ្ញើឱ្យសិស្សប្រឡង (Live Exam Link / Student Link):\\n" + form.getPublishedUrl());
  Logger.log("=========================================================================\\n");
  
  try {
    var ui = SpreadsheetApp.getUi();
    if (ui) {
      var htmlOutput = HtmlService.createHtmlOutput(
        '<div style="font-family:\\'Kantumruy Pro\\', sans-serif; padding:25px; background-color:#f8fafc; color:#1e293b; border-radius:15px;">' +
        '<h2 style="color:#10b981; margin-top:0;">🚀 បង្កើត Google Form ទទួលបានជោគជ័យ!</h2>' +
        '<p style="font-size:14px; line-height:1.6; color:#475569;">វិញ្ញាសារបស់លោកគ្រូត្រូវបានបង្កើតឡើងយ៉ាងស្រស់ស្អាត នៅក្នុង Google Drive របស់លោកគ្រូរួចរាល់ហើយ។</p>' +
        '<div style="background-color:#ffffff; border:1px solid #e2e8f0; padding:15px; border-radius:10px; margin-top:20px;">' +
        '<p style="margin:0 0 10px 0; font-size:13px; font-weight:bold; color:#4f46e5;">💻 តំណភ្ជាប់សម្រាប់ការគ្រប់គ្រង និងកែសម្រួល (Edit Form):</p>' +
        '<a href="' + form.getEditUrl() + '" target="_blank" style="word-break:break-all; font-size:12px; color:#2563eb; display:block; margin-bottom:15px; text-decoration:underline;">' + form.getEditUrl() + '</a>' +
        '<p style="margin:0 0 10px 0; font-size:13px; font-weight:bold; color:#10b981;">🎯 តំណភ្ជាប់សម្រាប់សិស្សានុសិស្សប្រឡង (Live Exam Link):</p>' +
        '<a href="' + form.getPublishedUrl() + '" target="_blank" style="word-break:break-all; font-size:12px; color:#10b981; display:block; font-weight:bold; text-decoration:underline;">' + form.getPublishedUrl() + '</a>' +
        '</div>' +
        '<p style="font-size:11px; color:#94a3b8; margin-top:15px; text-align:center;">លោកគ្រូអាចចម្លងតំណភ្ជាប់ពណ៌បៃតង ផ្ញើជូនសិស្សតាមតេឡេក្រាម ឬហ្វេសប៊ុកដើម្បីអនុវត្ត។</p>' +
        '</div>'
      ).setWidth(600).setHeight(400);
      ui.showModalDialog(htmlOutput, "ការរៀបចំវិញ្ញាសា");
    }
  } catch (e) {
    // Graceful fallback when run as an independent/standalone script
    Logger.log("ព័ត៌មាន៖ កូដនេះត្រូវបានដំណើរការជា Standalone Script (ជោគជ័យ)");
  }
}

// ម៉ឺនុយជំនួយពេលប្រើប្រាស់ជាមួយ Google Sheet (ជាជម្រើស)
function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    if (ui) {
      ui.createMenu('📝 បង្កើតវិញ្ញាសា')
        .addItem('🚀 បង្កើត Google Form', 'createGoogleForm')
        .addToUi();
    }
  } catch (e) {
    // មិនមែនដំណើរការនៅក្នុង Google Sheet
  }
}
`;

  return { gsCode: gsCode.trim(), htmlCode: htmlCode.trim(), googleFormCode: formScript.trim() };
};

