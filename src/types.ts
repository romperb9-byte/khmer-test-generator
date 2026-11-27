/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Difficulty {
  EASY = 'ងាយ',
  MEDIUM = 'មធ្យម',
  HARD = 'លំបាក'
}

export enum QuestionType {
  TRUE_FALSE = 'ខុសត្រូវ',
  MATCHING = 'ផ្គូរផ្គង',
  MULTIPLE_CHOICE = 'ពហុជ្រើសរើស',
  FILL_BLANKS = 'បំពេញចន្លោះ',
  SHORT_ANSWER = 'ចម្លើយខ្លី',
  LONG_ANSWER = 'ចម្លើយវែង'
}

export interface Question {
  id: string;
  type: QuestionType;
  difficulty: Difficulty;
  question: string;
  options?: string[]; // For multiple choice and true/false
  matchingPairs?: { left: string; right: string }[]; // For matching
  distractors?: string[]; // Extra incorrect answers for distractors
  answer: string | string[] | { [key: string]: string };
  explanation?: string;
  svg?: string; // Optional SVG code for diagrams or illustrations (e.g. math geometry, science charts)
  allowImageUpload?: boolean; // Allow student to upload JPG answer for written questions
}

export interface TestGeneratorOptions {
  grade: string;
  subject: string;
  material: string;
  images?: string[]; // Base64 strings
  questionCounts: { [key in QuestionType]?: number };
  optionCounts?: { [key in QuestionType]?: number };
  allowImageUpload?: { [key in QuestionType]?: boolean };
  difficultyDistribution: { [key in Difficulty]: number };
  apiKey?: string;
}

export interface GeneratedTest {
  title: string;
  grade: string;
  subject: string;
  exam_month?: string;
  questions: Question[];
  duration?: number;
}

export interface School {
  id: string;
  name: string;
  access_code: string;
  principal_code: string;
  teacher_code?: string;
  student_code?: string;
  google_webhook_url?: string;
  description?: string;
  created_at?: string;
}

export interface SubjectItem {
  id: string;
  school_id: string;
  name: string;
  created_at?: string;
}

export interface SavedTest extends GeneratedTest {
  id: string;
  school_id: string;
  teacher_name: string;
  duration: number;
  is_published: boolean;
  show_score_immediately: boolean;
  max_attempts?: number;
  created_at?: string;
}

export interface StudentSubmission {
  id: string;
  school_id: string;
  test_id: string;
  test_title: string;
  grade: string;
  subject: string;
  exam_month?: string;
  student_id: string;
  student_name: string;
  answers: Record<string, string | Record<number, string>>;
  score: number;
  total_points: number;
  correct_count: number;
  total_questions: number;
  submitted_at?: string;
}

export interface StudentRecord {
  id: string;
  school_id: string;
  student_id: string;
  student_name: string;
  gender: string;
  grade: string;
  school_name: string;
  created_at?: string;
}
