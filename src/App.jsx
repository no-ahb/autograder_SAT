import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardCopy,
  FileText,
  Upload,
  Plus
} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';
import { grade, parseKeyText, parseStudentAnswers } from './grader.js';
import { StudentAnalytics } from './StudentAnalytics.jsx';
import {
  loadStudents,
  saveStudents,
  createStudent,
  ensureStudentShape
} from './studentStore.js';

const keyFiles = import.meta.glob('./keys/*.txt', {
  query: '?raw',
  import: 'default',
  eager: true
});

const LOWER_CASE_WORDS = new Set(['and', 'of', 'the', 'for', 'to', 'a', 'in', 'with', 'on']);
const ALWAYS_UPPER = new Set(['sat']);

function formatDescriptor(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((token, index) => {
      if (/^\d+$/.test(token)) {
        return token;
      }
      if (ALWAYS_UPPER.has(token)) {
        return token.toUpperCase();
      }
      if (token === 'alt') {
        return 'Alt';
      }
      if (LOWER_CASE_WORDS.has(token) && index !== 0) {
        return token;
      }
      return token.charAt(0).toUpperCase() + token.slice(1);
    })
    .join(' ');
}

function createKeyEntry(path, raw) {
  const fileName = path.split('/').pop()?.replace('.txt', '') ?? '';
  const parts = fileName.split('-');
  const subjectToken = parts[0] ?? '';
  const numberToken = parts[1] ?? '';
  const descriptorSlug = parts.slice(2).join('-');

  const subjectLabel = subjectToken.charAt(0).toUpperCase() + subjectToken.slice(1);
  const descriptorLabel = descriptorSlug ? formatDescriptor(descriptorSlug) : '';
  const number = Number.parseInt(numberToken, 10);

  const key = parseKeyText(raw);

  return {
    id: fileName,
    key,
    total: key.size,
    subjectToken,
    number,
    label: descriptorLabel ? `${subjectLabel} ${numberToken}: ${descriptorLabel}` : `${subjectLabel} ${numberToken}`,
    descriptor: descriptorLabel,
    subjectLabel,
    raw
  };
}

const KEY_BANK = Object.entries(keyFiles)
  .map(([path, raw]) => createKeyEntry(path, raw))
  .sort((a, b) => {
    const subjectOrder = a.subjectToken === b.subjectToken ? 0 : a.subjectToken === 'english' ? -1 : 1;
    if (subjectOrder !== 0) {
      return subjectOrder;
    }
    if (!Number.isNaN(a.number) && !Number.isNaN(b.number) && a.number !== b.number) {
      return a.number - b.number;
    }
    return a.label.localeCompare(b.label);
  });

const KEY_LOOKUP = KEY_BANK.reduce((map, item) => {
  map.set(item.id, item);
  return map;
}, new Map());

const KEY_GROUPS = KEY_BANK.reduce((groups, item) => {
  if (!groups.has(item.subjectLabel)) {
    groups.set(item.subjectLabel, []);
  }
  groups.get(item.subjectLabel).push(item);
  return groups;
}, new Map());

const CONFETTI_COLORS = ['#2563eb', '#f97316', '#22c55e', '#ec4899', '#0ea5e9'];

const FRACTION_FORMATTER = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
});

function formatDateValue(value) {
  if (!value) {
    return '--';
  }
  try {
    return DATE_FORMATTER.format(new Date(value));
  } catch {
    return value;
  }
}

function formatReport(result) {
  if (!result) {
    return '';
  }

  const {
    keyName,
    correct,
    incorrect,
    manualReview,
    denominator,
    total,
    percent
  } = result;

  const summaryLine = `${correct} / ${denominator || total} correct (${FRACTION_FORMATTER.format(percent)}%)`;

  const lines = [`Worksheet: ${keyName}`, summaryLine, ''];

  if (incorrect.length > 0) {
    lines.push(
      'Incorrect:',
      ...incorrect.map(
        (item) => `  ${item.question}: student ${item.studentAnswer} -> key ${item.correctAnswer}`
      ),
      ''
    );
  } else {
    lines.push('Incorrect: none', '');
  }

  if (manualReview.length > 0) {
    lines.push(
      'Manual review:',
      ...manualReview.map((item) => {
        const reasons = item.reasons.join('; ');
        const answers = item.answers.join(', ');
        return `  ${item.question}: ${answers} (${reasons})`;
      }),
      ''
    );
  } else {
    lines.push('Manual review: none', '');
  }

  return lines.join('\n').trim();
}

function Confetti({ show }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, index) => ({
        id: index,
        left: Math.random() * 100,
        delay: Math.random() * 0.3,
        duration: 0.8 + Math.random() * 0.5,
        rotation: Math.random() * 180 - 90,
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length]
      })),
    []
  );

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-hidden
        >
          {pieces.map((piece) => (
            <motion.span
              key={piece.id}
              className="absolute h-3 w-1.5 rounded"
              style={{ left: `${piece.left}%`, backgroundColor: piece.color }}
              initial={{ top: '-5%', opacity: 0, rotate: piece.rotation }}
              animate={{ top: '110%', opacity: 1, rotate: piece.rotation + 90 }}
              transition={{ duration: piece.duration, delay: piece.delay, ease: 'easeOut' }}
            />
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function ResultCard({ result }) {
  if (!result) {
    return null;
  }

  const percentDisplay = FRACTION_FORMATTER.format(result.percent);

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.24 }}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <CheckCircle2 className="size-6" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">{result.keyName}</p>
          <p className="text-2xl font-semibold text-slate-900">
            {result.correct} / {result.skipMissing ? result.denominator : result.total} correct{' '}
            <span className="text-slate-500">({percentDisplay}%)</span>
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">Incorrect</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{result.incorrectCount}</p>
          {result.incorrectCount > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {result.incorrect.map((item) => (
                <li key={item.question}>
                  {item.question}:{' '}
                  <span className="font-semibold text-rose-500">{item.studentAnswer}</span>
                  {' -> '}
                  {item.correctAnswer}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-400">No errors logged.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">Manual review</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{result.manualReviewCount}</p>
          {result.manualReviewCount > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {result.manualReview.map((item) => (
                <li key={item.question}>
                  {item.question}: {item.answers.join(', ')}
                  <span className="block text-xs text-slate-500">{item.reasons.join('; ')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Nothing pending here.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">Missing</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{result.missingCount}</p>
          {result.missingCount > 0 ? (
            <p className="mt-2 text-sm text-slate-600">{result.missing.join(', ')}</p>
          ) : (
            <p className="mt-2 text-sm text-slate-400">All covered.</p>
          )}
        </div>
      </div>
    </motion.section>
  );
}

export default function App() {
  const [selectedKeyId, setSelectedKeyId] = useState(KEY_BANK[0]?.id ?? '');
  const [studentInput, setStudentInput] = useState('');
  const [skipMissing, setSkipMissing] = useState(true);
  const [fileName, setFileName] = useState('');
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [showStudentAnalytics, setShowStudentAnalytics] = useState(false);
  const confettiTimerRef = useRef(null);

  useEffect(
    () => () => {
      if (confettiTimerRef.current) {
        window.clearTimeout(confettiTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const stored = loadStudents();
    if (stored.length > 0) {
      setStudents(stored);
      setSelectedStudentId(stored[0].id);
    }
  }, []);

  useEffect(() => {
    if (students.length === 0) {
      setSelectedStudentId('');
      return;
    }
    if (!students.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  useEffect(() => {
    saveStudents(students);
  }, [students]);

  const selectedKey = useMemo(() => KEY_LOOKUP.get(selectedKeyId), [selectedKeyId]);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) ?? null,
    [students, selectedStudentId]
  );

  const updateCurrentStudent = (mutator) => {
    if (!selectedStudentId) {
      return;
    }
    setStudents((prev) =>
      prev.map((student) => {
        if (student.id !== selectedStudentId) {
          return student;
        }
        const changes = mutator(student) ?? {};
        const merged = ensureStudentShape({
          ...student,
          ...changes
        });
        merged.updatedAt = new Date().toISOString();
        return merged;
      })
    );
  };

  const handleAddStudent = () => {
    const name = window.prompt('Student name');
    if (!name || !name.trim()) {
      return;
    }
    const newStudent = createStudent(name.trim());
    setStudents((prev) => [...prev, newStudent]);
    setSelectedStudentId(newStudent.id);
    setShowStudentAnalytics(false);
  };

  const handleAddCustomPractice = () => {
    updateCurrentStudent((student) => ({
      customPracticeTests: [
        ...(student.customPracticeTests ?? []),
        {
          id: `custom-${Date.now()}`,
          label: `Practice ${((student.customPracticeTests ?? []).length || 0) + 1}`,
          date: '',
          composite: '',
          math: '',
          readingWriting: ''
        }
      ]
    }));
  };

  const handleUpdatePractice = (id, key, value) => {
    updateCurrentStudent((student) => ({
      practiceTests: (student.practiceTests ?? []).map((test) =>
        test.id === id ? { ...test, [key]: value } : test
      )
    }));
  };

  const handleUpdateCustomPractice = (id, key, value) => {
    updateCurrentStudent((student) => ({
      customPracticeTests: (student.customPracticeTests ?? []).map((test) =>
        test.id === id ? { ...test, [key]: value } : test
      )
    }));
  };

  const handleAddRealTest = () => {
    updateCurrentStudent((student) => ({
      realTests: [
        ...(student.realTests ?? []),
        {
          id: `official-${Date.now()}`,
          date: '',
          status: 'upcoming',
          composite: '',
          math: '',
          readingWriting: '',
          notes: ''
        }
      ]
    }));
  };

  const handleUpdateRealTest = (id, key, value) => {
    updateCurrentStudent((student) => ({
      realTests: (student.realTests ?? []).map((test) =>
        test.id === id ? { ...test, [key]: value } : test
      )
    }));
  };

  const persistWorksheetResult = (gradeResult) => {
    if (!selectedKey || !selectedStudent) {
      return;
    }
    const entry = {
      id: `worksheet-${Date.now()}`,
      worksheetId: selectedKey.id,
      worksheetLabel: selectedKey.label,
      date: new Date().toISOString(),
      correct: gradeResult.correct,
      denominator: gradeResult.denominator,
      total: gradeResult.total,
      skipMissing,
      percent: gradeResult.percent,
      incorrect: gradeResult.incorrect,
      manualReview: gradeResult.manualReview,
      missingQuestions: gradeResult.missing
    };

    updateCurrentStudent((student) => {
      const worksheets = Array.isArray(student.worksheets) ? [...student.worksheets] : [];
      const existingIndex = worksheets.findIndex(
        (item) => item.worksheetId === selectedKey.id
      );
      if (existingIndex >= 0) {
        worksheets[existingIndex] = entry;
      } else {
        worksheets.unshift(entry);
      }
      return {
        worksheets,
        topicChecklist: {
          ...(student.topicChecklist ?? {}),
          [selectedKey.id]: true
        }
      };
    });
  };

  const handleFile = async (file) => {
    if (!file) {
      return;
    }

    setError(null);
    setIsLoadingFile(true);
    setFileName(file.name);

    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: buffer, disableWorker: true }).promise;
        let text = '';

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          const pageText = content.items.map((item) => item.str).join(' ');
          text += `${pageText}\n`;
        }

        setStudentInput((prev) => (prev ? `${prev.trim()}\n${text.trim()}` : text.trim()));
      } else {
        const text = await file.text();
        setStudentInput((prev) => (prev ? `${prev.trim()}\n${text.trim()}` : text.trim()));
      }
    } catch (err) {
      setError(err.message || 'Unable to read file');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleGrade = () => {
    if (!selectedKey) {
      setError('Pick a worksheet key to grade.');
      return;
    }
    if (!selectedStudent) {
      setError('Add or select a student to log results.');
      return;
    }
    if (selectedKey.total === 0) {
      setError('Selected key has no questions.');
      return;
    }

    setError(null);
    setIsGrading(true);
    setCopyStatus('');

    try {
      const parsedAnswers = parseStudentAnswers(studentInput);
      const gradeResult = grade({
        key: selectedKey.key,
        studentAnswers: parsedAnswers,
        skipMissing
      });

      persistWorksheetResult(gradeResult);

      const report = formatReport({
        ...gradeResult,
        keyName: selectedKey.label,
        skipMissing
      });

      setResult({
        ...gradeResult,
        keyId: selectedKey.id,
        keyName: selectedKey.label,
        skipMissing,
        report
      });
      setShowConfetti(true);
      if (confettiTimerRef.current) {
        window.clearTimeout(confettiTimerRef.current);
      }
      confettiTimerRef.current = window.setTimeout(() => {
        setShowConfetti(false);
      }, 1400);
    } catch (err) {
      setError(err.message || 'Grading failed');
    } finally {
      setIsGrading(false);
    }
  };

  const handleCopyReport = async () => {
    if (!result) {
      return;
    }

    try {
      await navigator.clipboard.writeText(result.report);
      setCopyStatus('Summary copied');
      window.setTimeout(() => setCopyStatus(''), 1500);
    } catch {
      setCopyStatus('Clipboard blocked');
      window.setTimeout(() => setCopyStatus(''), 1500);
    }
  };

  const handleClear = () => {
    setStudentInput('');
    setFileName('');
    setResult(null);
    setCopyStatus('');
    setError(null);
  };

  const onDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  const onDragOver = (event) => {
    event.preventDefault();
  };

  if (showStudentAnalytics && selectedStudent) {
    return (
      <StudentAnalytics
        student={selectedStudent}
        worksheetsMeta={KEY_BANK}
        onClose={() => setShowStudentAnalytics(false)}
        onUpdate={updateCurrentStudent}
        onAddCustomPractice={handleAddCustomPractice}
        onUpdatePractice={handleUpdatePractice}
        onUpdateCustomPractice={handleUpdateCustomPractice}
        onDeleteCustomPractice={handleDeleteCustomPractice}
        onAddRealTest={handleAddRealTest}
        onUpdateRealTest={handleUpdateRealTest}
        onDeleteRealTest={handleDeleteRealTest}
        onDeleteStudent={handleDeleteStudent}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-rose-50 pb-10 text-slate-900">
      <Confetti show={showConfetti} />
      <header className="border-b border-white/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-semibold text-slate-900">SAT Worksheet Autograder</h1>
        </div>
      </header>

      <main className="mx-auto mt-6 max-w-6xl px-4">
        <div className="grid gap-6 md:grid-cols-2">
          <motion.section
            className="space-y-4 rounded-3xl border border-white/80 bg-white/90 p-4 shadow-xl shadow-sky-100"
            whileHover={{ translateY: -4 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
          >
            <div className="grid gap-4">
              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-600">Student</span>
                {students.length > 0 ? (
                  <motion.select
                    value={selectedStudentId}
                    onChange={(event) => setSelectedStudentId(event.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    whileHover={{ scale: 1.01 }}
                    whileFocus={{ scale: 1.01 }}
                    aria-label="Select student"
                  >
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </motion.select>
                ) : (
                  <p className="text-xs text-slate-500">
                    Add a student to start tracking worksheets and tests.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <motion.button
                    type="button"
                    onClick={handleAddStudent}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200"
                    whileHover={{ scale: 1.04, translateY: -2 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <Plus className="size-4" aria-hidden />
                    Add student
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => selectedStudent && setShowStudentAnalytics(true)}
                    disabled={!selectedStudent}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition enabled:hover:border-blue-300 enabled:hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
                    whileHover={!selectedStudent ? undefined : { scale: 1.04, translateY: -2 }}
                    whileTap={!selectedStudent ? undefined : { scale: 0.96 }}
                  >
                    <BarChart3 className="size-4" aria-hidden />
                    Student analytics
                  </motion.button>
                </div>
                {selectedStudent && selectedStudent.upcomingSatDate ? (
                  <p className="text-xs text-slate-500">
                    Next SAT: {formatDateValue(selectedStudent.upcomingSatDate)}
                  </p>
                ) : null}
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-600">Worksheet key</span>
                <div className="relative">
                  <motion.select
                    value={selectedKeyId}
                    onChange={(event) => setSelectedKeyId(event.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    whileHover={{ scale: 1.01 }}
                    whileFocus={{ scale: 1.01 }}
                    aria-label="Select worksheet answer key"
                  >
                    {Array.from(KEY_GROUPS.entries()).map(([groupLabel, items]) => (
                      <optgroup key={groupLabel} label={groupLabel}>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label} ({item.total} questions)
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </motion.select>
                  <FileText
                    className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                </div>
              </label>

              <div className="flex items-end">
                <motion.label
                  whileHover={{ scale: 1.02, translateY: -3 }}
                  whileTap={{ scale: 0.97 }}
                  className="group flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 focus-within:border-blue-300"
                >
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleFile(file);
                        event.target.value = '';
                      }
                    }}
                  />
                  <Upload className="size-6 text-blue-500" aria-hidden />
                  <span className="font-medium text-slate-900">Upload PDF or TXT</span>
                  <span className="text-xs text-slate-500">Drag and drop, or click to browse.</span>
                  {fileName ? (
                    <p className="mt-2 text-xs text-slate-600" aria-live="polite">
                      Loaded: {fileName}
                    </p>
                  ) : null}
                </motion.label>
              </div>
            </div>

            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              className="group rounded-2xl border border-slate-200 bg-slate-50 transition focus-within:border-blue-300"
            >
              <label className="flex w-full flex-col gap-2 p-4">
                <span className="flex items-center justify-between text-sm font-medium text-slate-600">
                  Student answers
                  <span className="text-xs text-slate-500">Supports patterns like 1) A | 27.)C | 32.c</span>
                </span>
                <textarea
                  value={studentInput}
                  onChange={(event) => setStudentInput(event.target.value)}
                  rows={10}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Paste answers here"
                  aria-label="Student answer text"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={skipMissing}
                  onChange={(event) => setSkipMissing(event.target.checked)}
                  className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
                />
                Skip missing or illegible from denominator
              </label>
              <div className="flex flex-wrap gap-3">
                <motion.button
                  type="button"
                  onClick={handleClear}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200"
                  whileHover={{ scale: 1.04, translateY: -2 }}
                  whileTap={{ scale: 0.96 }}
                >
                  Clear
                </motion.button>
                <motion.button
                  type="button"
                  onClick={handleGrade}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-200/60 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200 disabled:opacity-50"
                  whileHover={
                    isGrading || isLoadingFile ? undefined : { scale: 1.05, translateY: -3 }
                  }
                  whileTap={isGrading || isLoadingFile ? undefined : { scale: 0.95 }}
                  disabled={isGrading || isLoadingFile}
                >
                  <CheckCircle2 className="size-4" aria-hidden />
                  {isGrading ? 'Grading...' : 'Grade worksheet'}
                </motion.button>
                <motion.button
                  type="button"
                  onClick={handleCopyReport}
                  disabled={!result}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition enabled:hover:border-blue-300 enabled:hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
                  whileHover={!result ? undefined : { scale: 1.04, translateY: -2 }}
                  whileTap={!result ? undefined : { scale: 0.96 }}
                >
                  <ClipboardCopy className="size-4" aria-hidden />
                  Copy summary
                </motion.button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <AnimatePresence>
                {isLoadingFile ? (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-sky-700 shadow-sm"
                  >
                    <motion.span
                      className="flex size-4 items-center justify-center"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                    >
                      <Upload className="size-4" aria-hidden />
                    </motion.span>
                    Loading file...
                  </motion.p>
                ) : null}
              </AnimatePresence>
              <AnimatePresence>
                {copyStatus ? (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-blue-700 shadow-sm"
                  >
                    <ClipboardCopy className="size-4" aria-hidden />
                    {copyStatus}
                  </motion.p>
                ) : null}
              </AnimatePresence>
              {error ? (
                <p className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-600">
                  <AlertCircle className="size-4" aria-hidden />
                  <span>{error}</span>
                </p>
              ) : null}
            </div>
          </motion.section>

          <div className="md:sticky md:top-4">
            <AnimatePresence mode="wait">
              {result ? <ResultCard key={result.keyId + skipMissing} result={result} /> : null}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
