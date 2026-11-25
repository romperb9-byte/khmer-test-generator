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

function resolveGeminiClient(explicitKey?: string): GoogleGenAI {
  const apiKey =
    explicitKey?.trim() ||
    getStoredGeminiApiKey() ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (typeof process !== 'undefined' ? (process as any).env?.GEMINI_API_KEY : '') ||
    '';

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('សូមបញ្ចូល Gemini API Key (Free) ជាមុនសិន មុននឹងប្រើប្រាស់មុខងារ AI!');
  }
  return new GoogleGenAI({ apiKey });
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
          explanation: { type: Type.STRING },
          svg: { type: Type.STRING, description: "SVG code for a diagram or illustration if needed for the question (e.g. math geometry shape, science chart, symbolic icon for early grades). Use viewBox='0 0 200 200' and preserveAspectRatio='xMidYMid meet'. Limit code to essential paths/shapes." }
        },
        required: ["id", "type", "difficulty", "question", "answer"]
      }
    }
  },
  required: ["title", "questions"]
};

export async function generateTest(options: TestGeneratorOptions): Promise<GeneratedTest> {
  const { grade, subject, material, images, questionCounts, difficultyDistribution, apiKey } = options;
  const ai = resolveGeminiClient(apiKey);

  const prompt = `
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
    3. Math Formatting: Use LaTeX for mathematical expressions to ensure they are high-quality. 
       - Fractions: \frac{a}{b} (DO NOT wrap fractions in parentheses like (\frac{a}{b}), just use \frac{a}{b})
       - Numbers: DO NOT wrap single numbers or simple expressions in parentheses unless required by math rules.
       - Exponents: x^{2}
       - Degrees: 90^{\circ}
       - Roots: \sqrt{x}
       Always wrap LaTeX in single dollar signs for inline ($...$) or dollar signs ($$...$$).
    4. For Grade 1-3 Math/Science:
       - If the question involves visual concepts (fractions, geometry, living things), GENERATE a simple SVG diagram in the 'svg' field.
       - SVG rules: Use viewBox="0 0 200 200", width="100%", height="auto". Keep it simple with strokes and fill.
       - Example: For a question about circles, generate a circle SVG. For 1/4 fraction, generate a circle with 1/4 slice colored.
    5. Diagrams: If a question would benefit from a visual aid (e.g., triangle for geometry, cell diagram for biology, number line), generate an SVG illustration.
    6. Distractors: For Multiple Choice, True/False, and Matching, provide plausible distractors (incorrect answers) to make it challenging.
    7. Quality: Ensure questions are pedagogically sound for grade ${grade}.
    8. Formatting: Output in the specified JSON format.
    9. For Multiple Choice: Provide exactly 4 options. The options represent choices A, B, C, D in order. The 'answer' field can be either the index letter ('A', 'B', 'C', 'D') or the full text of the correct option.
    10. For True/False (ខុសត្រូវ): Provide exactly 2 options: ["ត្រឹមត្រូវ", "មិនត្រឹមត្រូវ"] representing A and B. The 'answer' field can be 'A' / 'ត្រឹមត្រូវ' or 'B' / 'មិនត្រឹមត្រូវ'.
    11. For Fill in the blanks (បំពេញចន្លោះ): indicate where the blank is with "........". You can also optionally provide 4 options representing A, B, C, D to fill the blank.
    12. DO NOT provide hundreds of options or repetitive data. Keep the output focused and professional.
    13. Question Order: Strictly arrange questions in this order by group: 1. True/False (ខុសត្រូវ), 2. Matching (ផ្គូរផ្គង), 3. Multiple Choice (ពហុជ្រើសរើស), 4. Fill in the blanks (បំពេញចន្លោះ), 5. Short Answer (ចំណួរចម្លើយខ្លី), 6. Long Answer (សំណួរចម្លើយវែង).
    
    The material is provided below (and in images if attached).
     Material:
    ${material}
  `;

  const contents: any[] = [{ text: prompt }];
  
  if (images && images.length > 0) {
    images.forEach((imgBase64) => {
      const parts = imgBase64.split(",");
      const mimeType = parts[0].match(/:(.*?);/)?.[1] || "image/png";
      const data = parts[1];
      contents.push({
        inlineData: {
          mimeType,
          data
        }
      });
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts: contents },
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA as any,
      temperature: 0.7,
    },
  });

  if (!response.text) {
    throw new Error("Failed to generate test content. Please try again.");
  }

  try {
    const result = JSON.parse(response.text);
    return {
      ...result,
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
  const ai = resolveGeminiClient(apiKey);
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

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: { parts: [imagePart, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: OMR_RESPONSE_SCHEMA as any,
      temperature: 0.2, // low temperature for precise factual extraction
    }
  });

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
