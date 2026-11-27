import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { School, SubjectItem, SavedTest, StudentSubmission, StudentRecord } from '../types';

export const DEFAULT_SUBJECTS = [
  'ភាសាខ្មែរ',
  'គណិតវិទ្យា',
  'រូបវិទ្យា',
  'គីមីវិទ្យា',
  'ជីវវិទ្យា',
  'ប្រវត្តិវិទ្យា',
  'ភូមិវិទ្យា',
  'សីលធម៌-ពលរដ្ឋ',
  'ភាសាបរទេស'
];

const LS_KEYS = {
  SCHOOLS: 'ktg_schools_v1',
  SUBJECTS: 'ktg_subjects_v1',
  TESTS: 'ktg_tests_v1',
  SUBMISSIONS: 'ktg_submissions_v1',
  STUDENTS: 'ktg_students_v1',
};

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ==================== SCHOOLS ====================

export async function fetchSchools(): Promise<School[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as School[];
  }
  return readLS<School[]>(LS_KEYS.SCHOOLS, []);
}

export async function createSchool(input: Omit<School, 'id' | 'created_at'>): Promise<School> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('schools')
      .insert([{
        name: input.name.trim(),
        access_code: input.access_code.trim(),
        principal_code: input.principal_code.trim() || '1234',
        teacher_code: input.teacher_code?.trim() || '1111',
        student_code: input.student_code?.trim() || '2222',
        description: input.description?.trim() || '',
      }])
      .select()
      .single();
    if (error) throw new Error(error.message);

    const school = data as School;
    // Seed default subjects for the new school
    const subjectRows = DEFAULT_SUBJECTS.map(name => ({
      school_id: school.id,
      name,
    }));
    await supabase.from('subjects').insert(subjectRows);
    return school;
  }

  const schools = readLS<School[]>(LS_KEYS.SCHOOLS, []);
  const newSchool: School = {
    id: genId(),
    name: input.name.trim(),
    access_code: input.access_code.trim(),
    principal_code: input.principal_code.trim() || '1234',
    teacher_code: input.teacher_code?.trim() || '1111',
    student_code: input.student_code?.trim() || '2222',
    description: input.description?.trim() || '',
    created_at: new Date().toISOString(),
  };
  writeLS(LS_KEYS.SCHOOLS, [newSchool, ...schools]);

  // Seed default subjects in LS
  const existingSubjects = readLS<SubjectItem[]>(LS_KEYS.SUBJECTS, []);
  const seeded: SubjectItem[] = DEFAULT_SUBJECTS.map(name => ({
    id: genId(),
    school_id: newSchool.id,
    name,
    created_at: new Date().toISOString(),
  }));
  writeLS(LS_KEYS.SUBJECTS, [...existingSubjects, ...seeded]);

  return newSchool;
}

export async function updateSchool(id: string, updates: Partial<Omit<School, 'id' | 'created_at'>>): Promise<School> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('schools')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as School;
  }

  const schools = readLS<School[]>(LS_KEYS.SCHOOLS, []);
  const updatedList = schools.map(s => (s.id === id ? { ...s, ...updates } : s));
  writeLS(LS_KEYS.SCHOOLS, updatedList);
  const found = updatedList.find(s => s.id === id);
  if (!found) throw new Error('រកមិនឃើញសាលា');
  return found;
}

export async function deleteSchool(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('schools').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  const schools = readLS<School[]>(LS_KEYS.SCHOOLS, []).filter(s => s.id !== id);
  writeLS(LS_KEYS.SCHOOLS, schools);
  writeLS(LS_KEYS.SUBJECTS, readLS<SubjectItem[]>(LS_KEYS.SUBJECTS, []).filter(x => x.school_id !== id));
  writeLS(LS_KEYS.TESTS, readLS<SavedTest[]>(LS_KEYS.TESTS, []).filter(x => x.school_id !== id));
  writeLS(LS_KEYS.SUBMISSIONS, readLS<StudentSubmission[]>(LS_KEYS.SUBMISSIONS, []).filter(x => x.school_id !== id));
}

// ==================== SUBJECTS ====================

export async function fetchSubjects(schoolId: string): Promise<SubjectItem[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []) as SubjectItem[];
  }
  return readLS<SubjectItem[]>(LS_KEYS.SUBJECTS, []).filter(s => s.school_id === schoolId);
}

export async function addSubject(schoolId: string, name: string): Promise<SubjectItem> {
  const cleanName = name.trim();
  if (!cleanName) throw new Error('សូមបញ្ចូលឈ្មោះមុខវិជ្ជា');

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('subjects')
      .insert([{ school_id: schoolId, name: cleanName }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as SubjectItem;
  }

  const subjects = readLS<SubjectItem[]>(LS_KEYS.SUBJECTS, []);
  const dup = subjects.find(s => s.school_id === schoolId && s.name === cleanName);
  if (dup) throw new Error('មុខវិជ្ជានេះមានរួចហើយ!');
  const newSubj: SubjectItem = {
    id: genId(),
    school_id: schoolId,
    name: cleanName,
    created_at: new Date().toISOString(),
  };
  writeLS(LS_KEYS.SUBJECTS, [...subjects, newSubj]);
  return newSubj;
}

export async function deleteSubject(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  const subjects = readLS<SubjectItem[]>(LS_KEYS.SUBJECTS, []).filter(s => s.id !== id);
  writeLS(LS_KEYS.SUBJECTS, subjects);
}

// ==================== TESTS ====================

export async function fetchTests(schoolId: string): Promise<SavedTest[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('tests')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as SavedTest[];
  }
  return readLS<SavedTest[]>(LS_KEYS.TESTS, []).filter(t => t.school_id === schoolId);
}

export async function saveTest(input: Omit<SavedTest, 'id' | 'created_at'>): Promise<SavedTest> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('tests')
      .insert([input])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as SavedTest;
  }

  const tests = readLS<SavedTest[]>(LS_KEYS.TESTS, []);
  const newTest: SavedTest = {
    ...input,
    id: genId(),
    created_at: new Date().toISOString(),
  };
  writeLS(LS_KEYS.TESTS, [newTest, ...tests]);
  return newTest;
}

export async function updateTestSettings(
  id: string,
  updates: Partial<Pick<SavedTest, 'is_published' | 'show_score_immediately' | 'max_attempts' | 'title' | 'duration'>>
): Promise<SavedTest> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('tests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as SavedTest;
  }

  const tests = readLS<SavedTest[]>(LS_KEYS.TESTS, []);
  const updated = tests.map(t => (t.id === id ? { ...t, ...updates } : t));
  writeLS(LS_KEYS.TESTS, updated);
  const found = updated.find(t => t.id === id);
  if (!found) throw new Error('រកមិនឃើញវិញ្ញាសា');
  return found;
}

export async function deleteTest(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('tests').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  const tests = readLS<SavedTest[]>(LS_KEYS.TESTS, []).filter(t => t.id !== id);
  writeLS(LS_KEYS.TESTS, tests);
}

// ==================== SUBMISSIONS ====================

export async function fetchSubmissions(schoolId: string): Promise<StudentSubmission[]> {
  if (isSupabaseConfigured && supabase) {
    const all: StudentSubmission[] = [];
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('school_id', schoolId)
        .order('submitted_at', { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      const batch = (data || []) as StudentSubmission[];
      all.push(...batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }
    return all;
  }
  return readLS<StudentSubmission[]>(LS_KEYS.SUBMISSIONS, []).filter(s => s.school_id === schoolId);
}

export async function submitStudentTest(
  input: Omit<StudentSubmission, 'id' | 'submitted_at'>
): Promise<StudentSubmission> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('submissions')
      .insert([input])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as StudentSubmission;
  }

  const subs = readLS<StudentSubmission[]>(LS_KEYS.SUBMISSIONS, []);
  const newSub: StudentSubmission = {
    ...input,
    id: genId(),
    submitted_at: new Date().toISOString(),
  };
  writeLS(LS_KEYS.SUBMISSIONS, [newSub, ...subs]);
  return newSub;
}

export async function deleteSubmission(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('submissions').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  const subs = readLS<StudentSubmission[]>(LS_KEYS.SUBMISSIONS, []).filter(s => s.id !== id);
  writeLS(LS_KEYS.SUBMISSIONS, subs);
}

export async function countStudentAttempts(
  schoolId: string,
  testId: string,
  studentId: string
): Promise<number> {
  const cleanSid = studentId.trim().toLowerCase();
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('submissions')
      .select('student_id')
      .eq('school_id', schoolId)
      .eq('test_id', testId);
    if (error) throw new Error(error.message);
    return (data || []).filter((r: any) => String(r.student_id || '').trim().toLowerCase() === cleanSid).length;
  }
  return readLS<StudentSubmission[]>(LS_KEYS.SUBMISSIONS, []).filter(
    s => s.school_id === schoolId && s.test_id === testId && s.student_id.trim().toLowerCase() === cleanSid
  ).length;
}

// ==================== STUDENTS ROSTER ====================

export async function fetchStudents(schoolId: string): Promise<StudentRecord[]> {
  if (isSupabaseConfigured && supabase) {
    const all: StudentRecord[] = [];
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .order('grade', { ascending: true })
        .order('student_id', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      const batch = (data || []) as StudentRecord[];
      all.push(...batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }
    return all;
  }
  return readLS<StudentRecord[]>(LS_KEYS.STUDENTS, []).filter(s => s.school_id === schoolId);
}

export async function upsertStudents(
  schoolId: string,
  rows: Omit<StudentRecord, 'id' | 'school_id' | 'created_at'>[]
): Promise<void> {
  const cleanRows = rows
    .filter(r => r.student_id.trim() && r.student_name.trim())
    .map(r => ({
      school_id: schoolId,
      student_id: r.student_id.trim(),
      student_name: r.student_name.trim(),
      gender: r.gender.trim(),
      grade: r.grade.trim(),
      school_name: r.school_name.trim(),
    }));

  if (cleanRows.length === 0) return;

  if (isSupabaseConfigured && supabase) {
    const chunkSize = 500;
    for (let i = 0; i < cleanRows.length; i += chunkSize) {
      const chunk = cleanRows.slice(i, i + chunkSize);
      const { error } = await supabase
        .from('students')
        .upsert(chunk, { onConflict: 'school_id,student_id' });
      if (error) throw new Error(error.message);
    }
    return;
  }

  const existing = readLS<StudentRecord[]>(LS_KEYS.STUDENTS, []);
  const map = new Map<string, StudentRecord>();
  existing.forEach(s => map.set(`${s.school_id}:${s.student_id}`, s));
  cleanRows.forEach(r => {
    const key = `${r.school_id}:${r.student_id}`;
    const prev = map.get(key);
    map.set(key, {
      id: prev?.id || genId(),
      created_at: prev?.created_at || new Date().toISOString(),
      ...r,
    });
  });
  writeLS(LS_KEYS.STUDENTS, Array.from(map.values()));
}

export async function updateStudent(
  id: string,
  updates: Partial<Omit<StudentRecord, 'id' | 'school_id' | 'created_at'>>
): Promise<StudentRecord> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as StudentRecord;
  }

  const existing = readLS<StudentRecord[]>(LS_KEYS.STUDENTS, []);
  const updated = existing.map(s => (s.id === id ? { ...s, ...updates } : s));
  writeLS(LS_KEYS.STUDENTS, updated);
  const found = updated.find(s => s.id === id);
  if (!found) throw new Error('រកមិនឃើញទិន្នន័យសិស្ស');
  return found;
}

export async function deleteStudent(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  const existing = readLS<StudentRecord[]>(LS_KEYS.STUDENTS, []).filter(s => s.id !== id);
  writeLS(LS_KEYS.STUDENTS, existing);
}
