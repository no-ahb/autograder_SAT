import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCopy,
  FileText,
  Sparkles,
  Upload
} from 'lucide-react';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';
import { grade, parseKeyText, parseStudentAnswers } from './grader.js';
import english101 from './keys/english-101.txt?raw';
import english116 from './keys/english-116.txt?raw';
import math201 from './keys/math-201.txt?raw';
import math204 from './keys/math-204.txt?raw';

const RAW_KEYS = [
  {
    id: 'english-101',
    label: 'English 101',
    subject: 'Reading & Writing',
    raw: english101
  },
  {
    id: 'english-116',
    label: 'English 116',
    subject: 'Reading & Writing',
    raw: english116
  },
  {
    id: 'math-201',
    label: 'Math 201',
    subject: 'Math (Calculator)',
    raw: math201
  },
  {
    id: 'math-204',
    label: 'Math 204',
    subject: 'Math (Non-Calculator)',
    raw: math204
  }
];

const KEY_BANK = RAW_KEYS.map((item) => {
  const key = parseKeyText(item.raw);
  return {
    ...item,
    key,
    total: key.size
  };
});

const KEY_LOOKUP = KEY_BANK.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});

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
  } correct (${FRACTION_FORMATTER.format(percent)}%)${skipMissing ? ' - missing skipped' : ''}`;

  const lines = [
    `Worksheet: ${keyName}`,
    summaryLine,
    ''
  ];

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
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-black/40 backdrop-blur"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="size-6" aria-hidden />
        </div>
        <div>
          <p className="text-sm text-slate-300">{result.keyName}</p>
          <p className="text-2xl font-semibold text-white">
            {result.correct} / {result.skipMissing ? result.denominator : result.total} correct{' '}
            <span className="text-slate-300">({percentDisplay}%)</span>
          </p>
          {result.skipMissing ? (
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Missing responses excluded from denominator
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-slate-800/60 p-4">
          <p className="text-sm text-slate-400">Incorrect</p>
          <p className="mt-1 text-xl font-semibold text-white">{result.incorrectCount}</p>
          {result.incorrectCount > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-slate-300">
              {result.incorrect.map((item) => (
                <li key={item.question}>
                  {item.question}: <span className="text-rose-400">{item.studentAnswer}</span>
                  {' -> '}
                  {item.correctAnswer}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-400">None</p>
          )}
        </div>

        <div className="rounded-lg bg-slate-800/60 p-4">
          <p className="text-sm text-slate-400">Manual review</p>
          <p className="mt-1 text-xl font-semibold text-white">{result.manualReviewCount}</p>
          {result.manualReviewCount > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-slate-300">
              {result.manualReview.map((item) => (
                <li key={item.question}>
                  {item.question}: {item.answers.join(', ')}
                  <span className="block text-xs text-slate-400">
                    {item.reasons.join('; ')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Clear</p>
          )}
        </div>

        <div className="rounded-lg bg-slate-800/60 p-4">
          <p className="text-sm text-slate-400">Missing</p>
          <p className="mt-1 text-xl font-semibold text-white">{result.missingCount}</p>
          {result.missingCount > 0 ? (
            <p className="mt-2 text-sm text-slate-300">{result.missing.join(', ')}</p>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Answered</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm text-slate-300">Copy-ready summary</p>
        <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/60 p-4 font-mono text-sm text-slate-200">
          <pre className="whitespace-pre-wrap leading-6">{result.report}</pre>
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

  const selectedKey = useMemo(() => KEY_LOOKUP[selectedKeyId], [selectedKeyId]);

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
      setCopyStatus('Copied!');
    } catch {
      setCopyStatus('Clipboard blocked');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-16 text-slate-100">
      <header className="border-b border-slate-900/60 bg-slate-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              SAT Worksheet Autograder
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Grade English and Math worksheets privately in your browser. Paste student answers or
              drop a PDF/TXT file - no uploads, no servers.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSelfTests}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-lg shadow-black/30 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-foreground active:scale-[0.99]"
          >
            <Sparkles className="size-4" aria-hidden />
            Self-tests
          </button>
        </div>
      </header>

      <main className="mx-auto mt-10 max-w-5xl px-4">
        <section className="space-y-8 rounded-3xl border border-slate-900/60 bg-slate-950/70 p-6 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="grid gap-6 md:grid-cols-[1.5fr,1fr]">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-300">Worksheet key</span>
              <div className="relative">
                <select
                  value={selectedKeyId}
                  onChange={(event) => setSelectedKeyId(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 pr-10 text-sm text-white shadow-inner shadow-black/20 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
                  aria-label="Select answer key"
                >
                  {KEY_BANK.map((item) => (
                    <option key={item.id} value={item.id}>
                  {item.label} - {item.subject} ({item.total} questions)
                    </option>
                  ))}
                </select>
                <FileText
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
                  aria-hidden
                />
              </div>
            </label>

            <div className="flex items-end">
              <label className="group flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 px-4 py-6 text-center text-sm text-slate-300 transition hover:border-primary hover:text-white focus-within:border-primary">
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
                <Upload className="size-6 text-primary" aria-hidden />
                <span className="font-medium text-white">Upload PDF or TXT</span>
                <span className="text-xs text-slate-400">
                  Drag & drop, or click to browse. Nothing leaves this page.
                </span>
                {fileName ? (
                  <p className="mt-2 text-xs text-slate-300" aria-live="polite">
                    Loaded: {fileName}
                  </p>
                ) : null}
              </label>
            </div>
          </div>

          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            className="group rounded-2xl border border-slate-900 bg-slate-950/60 transition focus-within:border-primary"
          >
            <label className="flex w-full flex-col gap-2 p-4">
              <span className="flex items-center justify-between text-sm font-medium text-slate-300">
                Student answers
                <span className="text-xs text-slate-500">
                  Supports patterns like 1) A | 27.)C | 32.c
                </span>
              </span>
              <textarea
                value={studentInput}
                onChange={(event) => setStudentInput(event.target.value)}
                rows={10}
                className="w-full resize-y rounded-xl border border-slate-800 bg-transparent px-4 py-3 font-mono text-sm text-slate-100 shadow-inner shadow-black/20 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
                placeholder="Paste answers here..."
                aria-label="Student answer text"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={skipMissing}
                onChange={(event) => setSkipMissing(event.target.checked)}
                className="size-4 rounded border-slate-700 bg-slate-900 text-primary focus:ring-primary"
              />
              Skip missing/illegible from denominator
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleClear}
                className="rounded-full border border-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleGrade}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-black/30 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground active:scale-[0.99]"
                disabled={isGrading || isLoadingFile}
              >
                <CheckCircle2 className="size-4" aria-hidden />
                {isGrading ? 'Grading...' : 'Grade worksheet'}
              </button>
              <button
                type="button"
                onClick={handleCopyReport}
                disabled={!result}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition enabled:hover:border-primary enabled:hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ClipboardCopy className="size-4" aria-hidden />
                Copy summary
              </button>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            {isLoadingFile ? (
              <p className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1 text-slate-300">
                <Upload className="size-4 animate-pulse" aria-hidden />
                Loading file...
              </p>
            ) : null}
            {copyStatus ? (
              <p className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1 text-slate-300">
                <ClipboardCopy className="size-4" aria-hidden />
                {copyStatus}
              </p>
            ) : null}
            {selfTestStatus ? (
              <p
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                  selfTestStatus.status === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : 'bg-rose-500/10 text-rose-300'
                }`}
              >
                <Sparkles className="size-4" aria-hidden />
                {selfTestStatus.message}
              </p>
            ) : null}
            {error ? (
              <p className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-rose-200">
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
