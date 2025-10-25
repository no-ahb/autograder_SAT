import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCopy,
  FileText,
  Sparkles,
  Star,
  Upload
} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';
import { grade, parseKeyText, parseStudentAnswers } from './grader.js';

const keyFiles = import.meta.glob('./keys/*.txt', { query: '?raw', import: 'default', eager: true })

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
    label: descriptorLabel
      ? `${subjectLabel} ${numberToken}: ${descriptorLabel}`
      : `${subjectLabel} ${numberToken}`,
    descriptor: descriptorLabel,
    subjectLabel,
    raw
  };
}

const KEY_BANK = Object.entries(keyFiles)
  .map(([path, raw]) => createKeyEntry(path, raw))
  .sort((a, b) => {
    const subjectOrder =
      a.subjectToken === b.subjectToken ? 0 : a.subjectToken === 'english' ? -1 : 1;
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

function formatReport(result) {
  if (!result) {
    return '';
  }

  const {
    keyName,
    correct,
    incorrect,
    missing,
    manualReview,
    denominator,
    total,
    percent,
    skipMissing
  } = result;

  const summaryLine = `${correct} / ${
    skipMissing ? denominator : total
  } correct (${FRACTION_FORMATTER.format(percent)}%)${
    skipMissing ? ' - missing responses excluded' : ''
  }`;

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

  if (missing.length > 0) {
    lines.push(`Missing: ${missing.join(', ')}`);
  } else {
    lines.push('Missing: none');
  }

  return lines.join('\n').trim();
}

function runSelfTests() {
  const cases = [
    { text: '1) b', expected: { 1: 'B' } },
    { text: '2.D', expected: { 2: 'D' } },
    { text: '(3) c', expected: { 3: 'C' } },
    { text: '5- a', expected: { 5: 'A' } },
    { text: '27.)C', expected: { 27: 'C' } },
    { text: '32.c', expected: { 32: 'C' } }
  ];

  for (const test of cases) {
    const parsed = parseStudentAnswers(test.text);
    const entry = parsed.answers.entries().next().value;
    const [expectedQuestion, expectedAnswer] = Object.entries(test.expected)[0];

    if (!entry || entry[0] !== Number(expectedQuestion)) {
      throw new Error(`Parser failed to locate question in "${test.text}"`);
    }

    const [question, answer] = entry;
    if (answer !== expectedAnswer) {
      throw new Error(`Parser mismatch for question ${question}`);
    }
  }

  const key = new Map([
    [1, 'A'],
    [2, 'B'],
    [3, 'C'],
    [4, 'D']
  ]);

  const student = parseStudentAnswers('1) a\n2) c\n2) b\n4) g');
  const graded = grade({ key, studentAnswers: student, skipMissing: false });

  if (graded.correct !== 1) {
    throw new Error('Grader failed to count correct answers');
  }

  if (graded.manualReviewCount !== 1 || graded.manualReview[0].question !== 2) {
    throw new Error('Duplicate detection failed');
  }

  if (graded.manualReview.some((item) => item.question === 4) === false) {
    throw new Error('Invalid answer value should flag manual review');
  }

  return 'All self-tests passed';
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
          {result.skipMissing ? (
            <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
              Missing responses excluded
            </p>
          ) : null}
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
                  <span className="block text-xs text-slate-500">
                    {item.reasons.join('; ')}
                  </span>
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
  const [selfTestStatus, setSelfTestStatus] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimerRef = useRef(null);

  useEffect(
    () => () => {
      if (confettiTimerRef.current) {
        window.clearTimeout(confettiTimerRef.current);
      }
    },
    []
  );

  const selectedKey = useMemo(() => KEY_LOOKUP.get(selectedKeyId), [selectedKeyId]);

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

  const handleSelfTests = () => {
    try {
      const message = runSelfTests();
      setSelfTestStatus({ status: 'success', message });
    } catch (err) {
      setSelfTestStatus({ status: 'error', message: err.message });
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-rose-50 pb-20 text-slate-900">
      <Confetti show={showConfetti} />
      <header className="border-b border-white/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
              SAT Worksheet Autograder
            </h1>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <button
              type="button"
              onClick={handleSelfTests}
              className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm shadow-amber-200 transition hover:-translate-y-0.5 hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 active:translate-y-0"
            >
              <Sparkles className="size-4" aria-hidden />
              Self-tests
            </button>
            <p className="text-xs text-slate-500">
              Runs a quick parser + grader check with sample answers.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-10 max-w-6xl px-4">
        <section className="space-y-8 rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl shadow-sky-100">
          <div className="grid gap-6 md:grid-cols-[1.5fr,1fr]">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-600">Worksheet key</span>
              <div className="relative">
                <select
                  value={selectedKeyId}
                  onChange={(event) => setSelectedKeyId(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
                </select>
                <FileText
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
              </div>
            </label>

            <div className="flex items-end">
              <label className="group flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 focus-within:border-blue-300">
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
                <span className="text-xs text-slate-500">Drag & drop, or click to browse.</span>
                {fileName ? (
                  <p className="mt-2 text-xs text-slate-600" aria-live="polite">
                    Loaded: {fileName}
                  </p>
                ) : null}
              </label>
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

          <div className="flex flex-wrap items-center justify-between gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={skipMissing}
                onChange={(event) => setSkipMissing(event.target.checked)}
                className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
              />
              Skip missing/illegible from denominator
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleClear}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleGrade}
                className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-200/60 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200 active:scale-95 disabled:opacity-50"
                disabled={isGrading || isLoadingFile}
              >
                <CheckCircle2 className="size-4" aria-hidden />
                {isGrading ? 'Grading...' : 'Grade worksheet'}
              </button>
              <button
                type="button"
                onClick={handleCopyReport}
                disabled={!result}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition enabled:hover:border-blue-300 enabled:hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ClipboardCopy className="size-4" aria-hidden />
                Copy summary
              </button>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <AnimatePresence>
              {isLoadingFile ? (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-sky-700 shadow-sm"
                >
                  <Upload className="size-4 animate-spin" aria-hidden />
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
            {selfTestStatus ? (
              <p
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                  selfTestStatus.status === 'success'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-600'
                }`}
              >
                <Star className="size-4" aria-hidden />
                {selfTestStatus.message}
              </p>
            ) : null}
            {error ? (
              <p className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-600">
                <AlertCircle className="size-4" aria-hidden />
                <span>{error}</span>
              </p>
            ) : null}
          </div>
        </section>

        <div className="mt-10 space-y-6">
          <AnimatePresence mode="wait">
            {result ? <ResultCard key={result.keyId + skipMissing} result={result} /> : null}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
