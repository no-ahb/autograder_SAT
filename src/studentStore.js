import { BLUEBOOK_TESTS } from './studentMetadata.js';

const STORAGE_KEY = 'sat-autograder-students-v1';

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function loadStudents() {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(ensureStudentShape);
  } catch {
    return [];
  }
}

export function saveStudents(students) {
  if (!isBrowser()) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  } catch {
    // ignore write errors (storage quota, etc.)
  }
}

export function createStudent(name) {
  const now = new Date().toISOString();
  return ensureStudentShape({
    id: `student-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
    upcomingSatDate: '',
    worksheets: [],
    practiceTests: BLUEBOOK_TESTS.map((test) => ({
      id: test.id,
      label: test.label,
      type: 'bluebook',
      date: '',
      composite: '',
      math: '',
      readingWriting: ''
    })),
    customPracticeTests: [],
    realTests: [],
    topicChecklist: {}
  });
}

export function ensureStudentShape(student) {
  const now = new Date().toISOString();
  const practiceTests =
    student.practiceTests && Array.isArray(student.practiceTests)
      ? normalizePracticeTests(student.practiceTests)
      : BLUEBOOK_TESTS.map((test) => ({
          id: test.id,
          label: test.label,
          type: 'bluebook',
          date: '',
          composite: '',
          math: '',
          readingWriting: ''
        }));

  const bluebookIds = new Set(BLUEBOOK_TESTS.map((test) => test.id));
  const existingIds = new Set(practiceTests.map((item) => item.id));
  const missingDefault = BLUEBOOK_TESTS.filter(
    (test) => !existingIds.has(test.id)
  ).map((test) => ({
    id: test.id,
    label: test.label,
    type: 'bluebook',
    date: '',
    composite: '',
    math: '',
    readingWriting: ''
  }));

  return {
    id: student.id ?? `student-${Date.now()}`,
    name: student.name ?? 'Student',
    createdAt: student.createdAt ?? now,
    updatedAt: student.updatedAt ?? now,
    upcomingSatDate: student.upcomingSatDate ?? '',
    worksheets: Array.isArray(student.worksheets) ? student.worksheets : [],
    practiceTests: [...practiceTests.filter((item) => bluebookIds.has(item.id)), ...missingDefault],
    customPracticeTests: Array.isArray(student.customPracticeTests)
      ? student.customPracticeTests
      : [],
    realTests: Array.isArray(student.realTests) ? student.realTests : [],
    topicChecklist: student.topicChecklist && typeof student.topicChecklist === 'object'
      ? student.topicChecklist
      : {}
  };
}

function normalizePracticeTests(practiceTests) {
  return practiceTests.map((item) => ({
    id: item.id,
    label: item.label ?? item.id,
    type: item.type ?? 'bluebook',
    date: item.date ?? '',
    composite: item.composite ?? '',
    math: item.math ?? '',
    readingWriting: item.readingWriting ?? ''
  }));
}
