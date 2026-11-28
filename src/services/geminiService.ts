/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { TestGeneratorOptions, Question, Difficulty, QuestionType, GeneratedTest } from "../types";

const GEMINI_API_KEY_STORAGE = 'ktg_gemini_api_key';

export function getStoredGeminiApiKey(): string {
  try {
    return localStorage.getItem(GEMINI_API_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setStoredGeminiApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE);
    }
  } catch {
    // ignore storage errors
  }
}

function resolveApiKey(explicitKey?: string): string {
  const apiKey =
    explicitKey?.trim() ||
    getStoredGeminiApiKey() ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (typeof process !== 'undefined' ? (process as any).env?.GEMINI_API_KEY : '') ||
    '';

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('សូមបញ្ចូល Gemini API Key (Free) ជាមុនសិន មុននឹងប្រើប្រាស់មុខងារ AI!');
  }
  return apiKey;
}

async function discoverCandidateModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
    if (!res.ok) return [];
    const data = await res.json();
    const models: any[] = data?.models || [];
    const candidates = models
      .filter((m: any) =>
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent') &&
        typeof m.name === 'string' &&
        (m.name.toLowerCase().includes('flash') || m.name.toLowerCase().includes('pro')) &&
        !m.name.toLowerCase().includes('audio') &&
        !m.name.toLowerCase().includes('image') &&
        !m.name.toLowerCase().includes('tts') &&
        !m.name.toLowerCase().includes('embedding')
      )
      .map((m: any) => m.name.replace(/^models\//, ''));

    const priorityScore = (n: string) => {
      if (n.includes('3.8-flash') && !n.includes('lite')) return 1;
      if (n.includes('3-flash') && !n.includes('lite')) return 2;
      if (n === 'gemini-flash-latest') return 3;
      if (n.includes('flash') && !n.includes('lite')) return 4;
      if (n.includes('flash-lite')) return 5;
      return 6;
    };

    return Array.from(new Set(candidates)).sort((a, b) => priorityScore(a) - priorityScore(b));
  } catch {
    return [];
  }
}

async function generateWithAutoFlashModel(
  apiKey: string,
  parts: any[],
  schema: any,
  temperature: number
) {
  const ai = new GoogleGenAI({ apiKey });
  const primaryModel = "gemini-3.8-flash";

  const tryModel = async (model: string) => {
    return await callWithTimeout(
      ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature,
        },
      }),
      45000
    );
  };

  try {
    return await tryModel(primaryModel);
  } catch (primaryErr: any) {
    const msg = String(primaryErr?.message || primaryErr || '');
    const isRetryable =
      msg.includes('404') ||
      msg.includes('NOT_FOUND') ||
      msg.includes('no longer available') ||
      msg.includes('503') ||
      msg.includes('UNAVAILABLE') ||
      msg.includes('high demand') ||
      msg.includes('429');

    if (isRetryable) {
      const discovered = await discoverCandidateModels(apiKey);
      const fallbacks = discovered.filter(m => m !== primaryModel).slice(0, 6);

      for (const model of fallbacks) {
        try {
          return await tryModel(model);
        } catch {
          // try next available model
        }
      }

      // Final retry on primary after short pause if 503
      if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand')) {
        await new Promise(r => setTimeout(r, 3000));
        try {
          return await tryModel(primaryModel);
        } catch {
          throw new Error(
            'ម៉ាស៊ីនបម្រើ Google Gemini AI កំពុងមានអ្នកប្រើប្រាស់ច្រើនពេក (503 High Demand)។ សូមរង់ចាំ ១០-២០ វិនាទី រួចចុចបង្កើតម្ដងទៀត!'
          );
        }
      }
    }
    throw primaryErr;
  }
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { type: Type.STRING, enum: Object.values(QuestionType) },
          difficulty: { type: Type.STRING, enum: Object.values(Difficulty) },
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Options/choices for Multiple Choice (exactly 4 options), True/False (omit or provide ['ត្រឹមត្រូវ', 'មិនត្រឹមត្រូវ']), or Fill in the blanks (optional 4 options). Otherwise, omit." },
          matchingPairs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                left: { type: Type.STRING },
                right: { type: Type.STRING }
              }
            },
            maxItems: 8
          },
          distractors: { type: Type.ARRAY, items: { type: Type.STRING }, maxItems: 4 },
          answer: { type: Type.STRING },
          explanation: { type: Type.STRING }
        },
        required: ["id", "type", "difficulty", "question", "answer"]
      }
    }
  },
  required: ["title", "questions"]
};

async function prepareAttachmentPart(dataUrl: string, maxWidth = 1400): Promise<{ mimeType: string; data: string }> {
  if (dataUrl.startsWith('data:application/pdf')) {
    const parts = dataUrl.split(',');
    return {
      mimeType: 'application/pdf',
      data: parts[1] || parts[0],
    };
  }
  return compressImageBase64(dataUrl, maxWidth);
}

async function compressImageBase64(dataUrl: string, maxWidth = 1400): Promise<{ mimeType: string; data: string }> {
  if (typeof document === 'undefined') {
    const parts = dataUrl.split(",");
    return {
      mimeType: parts[0].match(/:(.*?);/)?.[1] || "image/png",
      data: parts[1] || parts[0],
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        const parts = compressed.split(',');
        resolve({ mimeType: 'image/jpeg', data: parts[1] });
        return;
      }
      const parts = dataUrl.split(",");
      resolve({
        mimeType: parts[0].match(/:(.*?);/)?.[1] || "image/png",
        data: parts[1] || parts[0],
      });
    };
    img.onerror = () => {
      const parts = dataUrl.split(",");
      resolve({
        mimeType: parts[0].match(/:(.*?);/)?.[1] || "image/png",
        data: parts[1] || parts[0],
      });
    };
    img.src = dataUrl;
  });
}

async function callWithTimeout<T>(promise: Promise<T>, ms = 60000): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("ការភ្ជាប់ទៅ AI ចំណាយពេលយូរពេក (Timeout)។ សូមព្យាយាមកាត់បន្ថយចំនួនសំណួរ ឬពិនិត្យអ៊ីនធឺណិត/API Key ម្ដងទៀត!"));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

export async function generateTest(options: TestGeneratorOptions): Promise<GeneratedTest> {
  const { grade, subject, material, images, questionCounts, optionCounts, allowImageUpload, difficultyDistribution, apiKey, mode = 'generate' } = options;
  const resolvedKey = resolveApiKey(apiKey);

  const mcCount = optionCounts?.[QuestionType.MULTIPLE_CHOICE] || 4;
  const tfCount = optionCounts?.[QuestionType.TRUE_FALSE] || 2;
  const matchCount = optionCounts?.[QuestionType.MATCHING] || 5;
  const fillCount = optionCounts?.[QuestionType.FILL_BLANKS] ?? 4;

  const copyPrompt = `
    You are a professional Khmer exam digitizer. Your task is to TRANSCRIBE and CONVERT the pasted exam/test (from text and/or attached images) into the structured JSON test format, STRICTLY PRESERVING the original questions, wording, meaning, numbers, options, and order.

    Target Grade: ${grade}
    Subject: ${subject}

    CRITICAL RULES FOR COPYING/TRANSCRIBING:
    1. Extract ONLY the exam questions/prompts (ប្រធានវិញ្ញាសា) from the pasted text, images, or PDF! Ignore school headers, student name/date/signature blanks, page numbers, and administrative boilerplate.
    2. DO NOT invent new questions or rewrite/alter the meaning of the original question prompts! Keep the original Khmer wording, numbers, and content faithful to the source.
    2. Extract ALL questions present in the pasted test text/images in their original order.
    3. Classify each extracted question into the appropriate type:
       - ${QuestionType.TRUE_FALSE} (ខុសត្រូវ)
       - ${QuestionType.MATCHING} (ផ្គូរផ្គង)
       - ${QuestionType.MULTIPLE_CHOICE} (ពហុជ្រើសរើស)
       - ${QuestionType.FILL_BLANKS} (បំពេញចន្លោះ)
       - ${QuestionType.SHORT_ANSWER} (ចម្លើយខ្លី)
       - ${QuestionType.LONG_ANSWER} (ចម្លើយវែង)
    4. Preserve all original options (for Multiple Choice, True/False, Fill in blanks) and matchingPairs (for Matching).
    5. If the answer key is provided in the source, extract it accurately. If not provided, solve/determine the correct answer accurately.
    6. Math & Science Formula Formatting (LaTeX):
       - Use proper LaTeX ($...$ or $$...$$) for fractions (\\frac{a}{b}), exponents (x^{2}), square roots (\\sqrt{x}), and chemistry/physics/biology formulas (wrapped in parentheses when inline, e.g. ($H_{2}O$), ($F = m \\cdot a$)).
       - Do NOT wrap plain standalone numbers (like 5, 12) in $...$.
    7. Do NOT generate raw SVG or HTML strings.
    8. Output MUST be in the specified JSON format.

    Source Exam Material:
    ${material}
  `;

  const generatePrompt = `
    You are a professional Khmer teacher assistant. Generate a monthly/semester test in Khmer based on the provided material.
    
    Target Grade: ${grade}
    Subject: ${subject}
    
    Difficulty Distribution:
    - Easy: ${difficultyDistribution[Difficulty.EASY]}%
    - Medium: ${difficultyDistribution[Difficulty.MEDIUM]}%
    - Hard: ${difficultyDistribution[Difficulty.HARD]}%
    
    Question Counts Request:
    ${Object.entries(questionCounts)
      .filter(([_, count]) => count! > 0)
      .map(([type, count]) => `- ${type}: ${count}`)
      .join('\n')}
    
    Guidelines:
    1. Language: Use formal Khmer.
    2. Variety: strictly follow the question types requested.
    3. Math & Science Formula Formatting (LaTeX):
       - Mathematics (គណិតវិទ្យា): Use proper LaTeX ($...$ or $$...$$) for ALL math formulas, equations, and expressions:
         * Fractions: \frac{a}{b} (DO NOT wrap fractions in parentheses like (\frac{a}{b}), just use \frac{a}{b})
         * Exponents / Powers: x^{2}, a^{n}, 10^{-3}
         * Square roots / Nth roots: \sqrt{x}, \sqrt{a^{2}+b^{2}}, \sqrt[3]{x}
         * Degrees & Symbols: 90^{\circ}, \pi, \leq, \geq, \neq, \times, \div, \vec{v}
         * Plain standalone numbers (like 5, 12, 3.5, 20%) without formulas should be written directly without $...$.
       - Chemistry (គីមីវិទ្យា): Format all chemical formulas, ions, and reaction equations in LaTeX wrapped in parentheses when inline in Khmer text, e.g., ($H_{2}O$), ($H_{2}SO_{4}$), ($CO_{2}$), ($Ca^{2+}$), ($2H_{2} + O_{2} \rightarrow 2H_{2}O$).
       - Physics (រូបវិទ្យា): Format all physics formulas and equations in LaTeX wrapped in parentheses when inline, e.g., ($F = m \cdot a$), ($v = \frac{d}{t}$), ($E_{k} = \frac{1}{2}mv^{2}$), ($P = U \cdot I$), ($g = 9.8\text{ m/s}^{2}$).
       - Biology (ជីវវិទ្យា): Format biological equations, chemical processes, and genetic notation in LaTeX wrapped in parentheses when inline, e.g., ($6CO_{2} + 6H_{2}O \rightarrow C_{6}H_{12}O_{6} + 6O_{2}$), ($ATP$), ($DNA$).
       Never put spaces right after an opening $ or right before a closing $.
    4. Keep questions concise, clear, and pedagogically sound for grade ${grade}. Do NOT generate raw SVG or HTML strings.
    5. Distractors: For Multiple Choice, True/False, and Matching, provide plausible distractors (incorrect answers) to make it challenging.
    6. Quality: Ensure questions are pedagogically sound for grade ${grade}.
    8. Formatting: Output in the specified JSON format.
    9. For Multiple Choice (ពហុជ្រើសរើស): Provide exactly ${mcCount} options (choices A, B, C, ... in order). The 'answer' field should be the index letter ('A', 'B', 'C', ...) or the full text of the correct option.
    10. For True/False (ខុសត្រូវ): Provide exactly ${tfCount} options.${tfCount === 2 ? ' Use ["ត្រឹមត្រូវ", "មិនត្រឹមត្រូវ"] representing A and B.' : ` Provide ${tfCount} statements/choices (A, B, C, ...) for the student to choose which statement is true/correct.`} The 'answer' field should be the correct letter ('A', 'B', ...).
    11. For Matching (ផ្គូរផ្គង): Provide exactly ${matchCount} matchingPairs per matching question.
    12. For Fill in the blanks (បំពេញចន្លោះ): indicate where the blank is with "........". ${fillCount > 0 ? `Provide exactly ${fillCount} options representing choices to fill the blank.` : 'Do not provide options (open blank).'}
    13. DO NOT provide hundreds of options or repetitive data. Keep the output focused and professional.
    14. Question Order: Strictly arrange questions in this order by group: 1. True/False (ខុសត្រូវ), 2. Matching (ផ្គូរផ្គង), 3. Multiple Choice (ពហុជ្រើសរើស), 4. Fill in the blanks (បំពេញចន្លោះ), 5. Short Answer (ចំណួរចម្លើយខ្លី), 6. Long Answer (សំណួរចម្លើយវែង).
    
    The material is provided below (and in images if attached).
     Material:
    ${material}
  `;

  const prompt = mode === 'copy' ? copyPrompt : generatePrompt;

  const contents: any[] = [{ text: prompt }];
  
  if (images && images.length > 0) {
    const preparedList = await Promise.all(images.map(img => prepareAttachmentPart(img)));
    preparedList.forEach(({ mimeType, data }) => {
      contents.push({
        inlineData: {
          mimeType,
          data
        }
      });
    });
  }

  const response = await generateWithAutoFlashModel(
    resolvedKey,
    contents,
    RESPONSE_SCHEMA as any,
    0.7
  );

  if (!response.text) {
    throw new Error("Failed to generate test content. Please try again.");
  }

  try {
    const result = JSON.parse(response.text);
    const questions = Array.isArray(result.questions)
      ? result.questions.map((q: Question) => ({
          ...q,
          allowImageUpload:
            (q.type === QuestionType.SHORT_ANSWER || q.type === QuestionType.LONG_ANSWER) &&
            Boolean(allowImageUpload?.[q.type]),
        }))
      : [];
    return {
      ...result,
      questions,
      grade,
      subject
    };
  } catch (e) {
    console.error("JSON Parse Error:", e, response.text);
    throw new Error("Error parsing generated test. Please try again.");
  }
}

export interface OmrAnswerKeyItem {
  questionNumber: number;
  correctAnswer: string;
}

export interface OmrGradedAnswer {
  questionNumber: number;
  detectedMark: string | null;
  isCorrect: boolean;
  correctAnswer: string;
}

export interface OmrGradingResult {
  studentName: string;
  studentId: string;
  grade: string;
  score: number;
  totalQuestions: number;
  detectedAnswers: OmrGradedAnswer[];
  teacherFeedback: string;
}

const OMR_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    studentName: { type: Type.STRING, description: "Name of the student detected from the handwritten name field at the top of the answer sheet." },
    studentId: { type: Type.STRING, description: "ID, roll number, or desk number of the student detected from the ID field." },
    grade: { type: Type.STRING, description: "Grade of the student, e.g., 'ថ្នាក់ទី ១២' or whatever is written." },
    score: { type: Type.INTEGER, description: "Total number of correct answers detected." },
    totalQuestions: { type: Type.INTEGER, description: "Total number of questions graded." },
    detectedAnswers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionNumber: { type: Type.INTEGER },
          detectedMark: { type: Type.STRING, nullable: true, description: "The answer marked by the student: A, B, C, or D (or ក, ខ, គ, ឃ depending on what's marked, normalized to standard A, B, C, D or ក, ខ, គ, ឃ matching the answer key format). If blank or multiple circles are marked, return null." },
          isCorrect: { type: Type.BOOLEAN },
          correctAnswer: { type: Type.STRING }
        },
        required: ["questionNumber", "detectedMark", "isCorrect", "correctAnswer"]
      }
    },
    teacherFeedback: { type: Type.STRING, description: "Encouraging and constructive teacher feedback written in professional Khmer. Congratulate high scores, offer tips for improvement on low scores." }
  },
  required: ["studentName", "studentId", "grade", "score", "totalQuestions", "detectedAnswers", "teacherFeedback"]
};

export async function gradeOmrSheet(
  imageBase64: string,
  answerKey: OmrAnswerKeyItem[],
  apiKey?: string
): Promise<OmrGradingResult> {
  const resolvedKey = resolveApiKey(apiKey);
  const parts = imageBase64.split(",");
  const mimeType = parts[0].match(/:(.*?);/)?.[1] || "image/png";
  const data = parts[1] || parts[0];

  const prompt = `
    You are an expert AI OMR (Optical Mark Recognition) Answer Sheet Grader and Scanner.
    Your task is to analyze the image of a student's hand-filled answer sheet, extract their written info (Name, Student ID/Seat Number, Grade), and grade their answers against the provided Correct Answer Key.

    Correct Answer Key:
    ${JSON.stringify(answerKey, null, 2)}

    Instructions:
    1. Carefully scan the top section of the sheet to detect the student's name (ឈ្មោះ), Student ID/Seat Number (លេខតុ/លេខបន្ទប់), and grade (ថ្នាក់ទី). Convert handwritten Khmer text or numbers accurately. If any field is empty or illegible, return "មិនស្គាល់" (Unknown) or empty string.
    2. For each question number in the Correct Answer Key, examine the corresponding answer row on the sheet:
       - Find which bubble/option is filled (A, B, C, D or ក, ខ, គ, ឃ). Note that circles can be shaded with ink, pencil, marked with a checkmark (✓), or an X (✗).
       - Identify the selected option. Ensure you match letters properly: A/ក, B/ខ, C/គ, D/ឃ. Normalize the returned detectedMark to match the format of the correct answer (e.g. if correct answer is 'A', detectedMark should be 'A', 'B', 'C', or 'D').
       - Compare the student's marked answer with the 'correctAnswer' from the key.
       - Mark 'isCorrect' as true if they match, and false otherwise.
    3. Compute the final score (count of correct answers).
    4. Write a professional, personalized teacher feedback in Khmer ('teacherFeedback'). It should:
       - Address the student by name (if detected, e.g. "ប្អូន វីរៈ...").
       - Praise the student for their correct answers and achievements.
       - Provide constructive, warm encouragement for any wrong answers, inviting them to review the topics.
       - Use an polite, encouraging tone in formal Khmer.

    Output MUST be in the specified JSON format.
  `;

  const imagePart = {
    inlineData: {
      mimeType,
      data
    }
  };

  const textPart = {
    text: prompt
  };

  const response = await generateWithAutoFlashModel(
    resolvedKey,
    [imagePart, textPart],
    OMR_RESPONSE_SCHEMA as any,
    0.2
  );

  if (!response.text) {
    throw new Error("Failed to scan and grade the OMR sheet. Please ensure the image is clear and try again.");
  }

  try {
    return JSON.parse(response.text) as OmrGradingResult;
  } catch (e) {
    console.error("OMR Parse Error:", e, response.text);
    throw new Error("Error parsing OMR grading results. Please ensure the answer sheet image is well-aligned and try again.");
  }
}
