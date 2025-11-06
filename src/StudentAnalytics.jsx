import { useEffect, useMemo, useState } from 'react';
import {
  ClipboardCopy,
  Plus,
  UserCircle2,
  X,
  Pencil,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { PRIORITY_LEVELS, WORKSHEET_PRIORITY, COURSE_GUIDELINES } from './studentMetadata.js';

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
});

const PRIORITY_ORDER = ['high', 'medium', 'low', 'other'];
const TOPIC_PRIORITY_ORDER = ['high', 'medium', 'low'];

function formatDate(value) {
  if (!value) {
    return '--';
  }
  try {
    return DATE_FORMATTER.format(new Date(value));
  } catch {
    return value;
  }
}

function formatDateCompact(value) {
  const formatted = formatDate(value);
  return typeof formatted === 'string' ? formatted.replace(',', '') : formatted;
}

function extractBluebookNumber(label) {
  if (!label) {
    return Number.MAX_SAFE_INTEGER;
  }
  const match = label.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

function percentDisplay(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--';
  }
  return `${value.toFixed(1)}%`;
}

function formatQuestionRanges(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    return '';
  }

  const sorted = Array.from(
    new Set(
      numbers
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => !Number.isNaN(value))
    )
  ).sort((a, b) => a - b);

  const ranges = [];
  let rangeStart = sorted[0];
  let previous = sorted[0];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    if (current === previous + 1) {
      previous = current;
      continue;
    }
    ranges.push(rangeStart === previous ? `${rangeStart}` : `${rangeStart}-${previous}`);
    rangeStart = current;
    previous = current;
  }

  ranges.push(rangeStart === previous ? `${rangeStart}` : `${rangeStart}-${previous}`);
  return ranges.join(', ');
}

function formatWorksheetSummary(record, meta) {
  if (!record || !meta) {
    return '';
  }

  const totalQuestions = record.totalQuestions ?? meta.total ?? 0;
  const correct = record.correct ?? 0;
  const denominator = record.denominator ?? totalQuestions;
  const percent = record.percent ?? (denominator > 0 ? (correct / denominator) * 100 : 0);
  const incorrect = Array.isArray(record.incorrect) ? record.incorrect : [];
  
  const lines = [`Worksheet: ${meta.label}`];
  lines.push(`${correct} / ${denominator} correct (${percent.toFixed(1)}%)`);
  lines.push('');

  if (incorrect.length > 0) {
    lines.push('Incorrect:');
    incorrect.forEach((item) => {
      lines.push(`  ${item.question}: student ${item.studentAnswer} -> key ${item.correctAnswer}`);
    });
  } else {
    lines.push('Incorrect: none');
  }

  return lines.join('\n');
}

function deriveAttemptedInfo(record) {
  const attemptedSet = new Set();
  let reliable = false;

  if (Array.isArray(record?.attemptedQuestions) && record.attemptedQuestions.length > 0) {
    record.attemptedQuestions.forEach((value) => {
      const number = Number.parseInt(value, 10);
      if (!Number.isNaN(number)) {
        attemptedSet.add(number);
      }
    });
    reliable = attemptedSet.size > 0;
  }

  if (!reliable) {
    const statsEntries = Object.entries(record?.questionStats ?? {});
    if (statsEntries.length > 0) {
      let hasCorrect = false;
      for (const [questionKey, value] of statsEntries) {
        const number = Number.parseInt(questionKey, 10);
        if (Number.isNaN(number)) {
          continue;
        }
        attemptedSet.add(number);
        if (value?.status === 'correct') {
          hasCorrect = true;
        }
      }
      reliable = hasCorrect || (record?.correct ?? 0) === 0;
      if (!reliable) {
        attemptedSet.clear();
      }
    }
  }

  return { set: attemptedSet, reliable };
}

function TopicChecklist({ student, worksheetsMeta, onUpdate }) {
  const checklist = student.topicChecklist ?? {};

  // Group worksheets by subject and priority
  const groupedWorksheets = useMemo(() => {
    const groups = {
      english: { high: [], medium: [], low: [] },
      math: { high: [], medium: [], low: [] }
    };
    
    worksheetsMeta.forEach(item => {
      const priority = WORKSHEET_PRIORITY[item.id] || 'low';
      const subject = item.id.startsWith('english') ? 'english' : 'math';
      groups[subject][priority].push(item);
    });
    
    return groups;
  }, [worksheetsMeta]);

  return (
    <section className="rounded-3xl border border-white/80 bg-white p-5 shadow-lg shadow-sky-100">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Topic checklist</h3>
        <ClipboardCopy className="size-4 text-slate-400" aria-hidden />
      </div>
      <div className="mt-3 space-y-4">
        {TOPIC_PRIORITY_ORDER.map((priorityKey) => {
          const englishItems = groupedWorksheets.english[priorityKey] || [];
          const mathItems = groupedWorksheets.math[priorityKey] || [];
          if (englishItems.length === 0 && mathItems.length === 0) return null;

          return (
            <div key={priorityKey} className="rounded-2xl bg-slate-50 p-3">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {PRIORITY_LEVELS[priorityKey]}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-blue-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">English</p>
                  {englishItems.length === 0 ? (
                    <p className="mt-2 text-xs text-blue-400">None</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-xs text-slate-600">
                      {englishItems.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-transparent px-2 py-1 transition hover:border-blue-200 hover:bg-white"
                        >
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={Boolean(checklist[item.id])}
                              onChange={(event) => {
                                const nextChecklist = {
                                  ...(student.topicChecklist ?? {}),
                                  [item.id]: event.target.checked
                                };
                                onUpdate(() => ({ topicChecklist: nextChecklist }));
                              }}
                            />
                            {item.label}
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-2xl bg-red-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-red-500">Math</p>
                  {mathItems.length === 0 ? (
                    <p className="mt-2 text-xs text-red-400">None</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-xs text-slate-600">
                      {mathItems.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-transparent px-2 py-1 transition hover:border-red-200 hover:bg-white"
                        >
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={Boolean(checklist[item.id])}
                              onChange={(event) => {
                                const nextChecklist = {
                                  ...(student.topicChecklist ?? {}),
                                  [item.id]: event.target.checked
                                };
                                onUpdate(() => ({ topicChecklist: nextChecklist }));
                              }}
                            />
                            {item.label}
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function WorksheetsColumn({ student, worksheetsMeta, onUpdate }) {
  const [lastDeletedHistory, setLastDeletedHistory] = useState(null);
  const [collapsedCards, setCollapsedCards] = useState({});

  const worksheetMap = useMemo(() => {
    const assigned = new Map();
    for (const entry of student.worksheets ?? []) {
      assigned.set(entry.worksheetId, entry);
    }
    return assigned;
  }, [student.worksheets]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z';
      if (!isUndo || !lastDeletedHistory) {
        return;
      }
      event.preventDefault();
      const { worksheetId, entry, index } = lastDeletedHistory;
      onUpdate((draft) => ({
        worksheets: (draft.worksheets ?? []).map((worksheet) => {
          if (worksheet.worksheetId !== worksheetId) {
            return worksheet;
          }
          const history = Array.isArray(worksheet.history) ? [...worksheet.history] : [];
          const insertIndex = Math.max(0, Math.min(index, history.length));
          history.splice(insertIndex, 0, entry);
          return {
            ...worksheet,
            history
          };
        })
      }));
      setLastDeletedHistory(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lastDeletedHistory, onUpdate]);

  const assignedList = useMemo(
    () =>
      worksheetsMeta
        .filter((item) => worksheetMap.has(item.id))
        .map((item) => {
          const record = worksheetMap.get(item.id);
          const subject = item.id.startsWith('math') ? 'math' : 'english';
          const priority = WORKSHEET_PRIORITY[item.id] ?? 'other';
          return {
            meta: item,
            record,
            subject,
            priority
          };
        })
        .sort((a, b) => {
          const dateA = a.record?.date ?? '';
          const dateB = b.record?.date ?? '';
          if (dateA === dateB) return 0;
          return dateA > dateB ? -1 : 1;
        }),
    [worksheetMap, worksheetsMeta]
  );

  const unassignedList = useMemo(
    () => worksheetsMeta.filter((item) => !worksheetMap.has(item.id)),
    [worksheetMap, worksheetsMeta]
  );

  const assignedByPriority = useMemo(() => {
    const grouped = {};
    for (const priority of PRIORITY_ORDER) {
      grouped[priority] = { english: [], math: [] };
    }
    for (const item of assignedList) {
      const priority = PRIORITY_ORDER.includes(item.priority) ? item.priority : 'other';
      const bucket = grouped[priority] ?? grouped.other;
      bucket[item.subject].push(item);
    }
    return grouped;
  }, [assignedList]);

  const handleDeleteWorksheet = (record, meta) => {
    if (!record) {
      return;
    }
    const worksheetLabel = meta?.label ?? 'worksheet';
    if (!window.confirm(`Remove logged results for ${worksheetLabel}?`)) {
      return;
    }
    const recordId = record.id;
    const worksheetId = record.worksheetId;
    onUpdate((draft) => ({
      worksheets: (draft.worksheets ?? []).filter((item) => {
        if (recordId) {
          return item.id !== recordId;
        }
        return item.worksheetId !== worksheetId;
      })
    }));
  };

  const handleToggleHistoryReview = (record, historyId, checked) => {
    if (!record || !historyId) {
      return;
    }
    const latestHistoryId = Array.isArray(record.history) && record.history.length > 0 ? record.history[0].id : null;
    onUpdate((draft) => ({
      worksheets: (draft.worksheets ?? []).map((worksheet) => {
        if (worksheet.worksheetId !== record.worksheetId) {
          return worksheet;
        }
        const nextHistory = (worksheet.history ?? []).map((entry) =>
          entry.id === historyId ? { ...entry, reviewed: checked } : entry
        );
        return {
          ...worksheet,
          history: nextHistory,
          reviewedMisses:
            historyId === latestHistoryId ? checked : worksheet.reviewedMisses ?? false
        };
      })
    }));
  };

  const handleDeleteHistoryEntry = (record, historyId) => {
    if (!record || !historyId) {
      return;
    }
    const historyList = Array.isArray(record.history) ? record.history : [];
    const entryIndex = historyList.findIndex((entry) => entry.id === historyId);
    if (entryIndex === -1) {
      return;
    }
    const entryToRestore = historyList[entryIndex];
    onUpdate((draft) => ({
      worksheets: (draft.worksheets ?? []).map((worksheet) => {
        if (worksheet.worksheetId !== record.worksheetId) {
          return worksheet;
        }
        return {
          ...worksheet,
          history: (worksheet.history ?? []).filter((entry) => entry.id !== historyId)
        };
      })
    }));
    setLastDeletedHistory({
      worksheetId: record.worksheetId,
      entry: entryToRestore,
      index: entryIndex
    });
  };

  const toggleWorksheetCollapsed = (cardId) => {
    if (!cardId) {
      return;
    }
    setCollapsedCards((previous) => ({
      ...previous,
      [cardId]: !previous?.[cardId]
    }));
  };

  const SubjectPanel = ({ subject, items }) => {
    const isEnglish = subject === 'english';
    const panelClasses = isEnglish
      ? 'border-blue-100 bg-blue-50'
      : 'border-rose-100 bg-rose-50';
    const headingClasses = isEnglish ? 'text-blue-600' : 'text-rose-600';
    const emptyClasses = isEnglish ? 'text-blue-400' : 'text-rose-400';
    const hoverClasses = isEnglish ? 'hover:border-blue-200' : 'hover:border-rose-200';

    return (
      <div className={`rounded-2xl border ${panelClasses} p-3`}>
        <p className={`text-[11px] font-semibold uppercase tracking-wide ${headingClasses}`}>
          {isEnglish ? 'English' : 'Math'}
        </p>
        {items.length === 0 ? (
          <p className={`mt-2 text-xs ${emptyClasses}`}>None assigned yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {items.map(({ meta, record }) => {
              const totalQuestions =
                record.totalQuestions ?? meta.total ?? meta.key?.size ?? 0;
              const attemptedInfo = deriveAttemptedInfo(record);
              const fallbackAttempted =
                (record.correct ?? 0) +
                (record.incorrectCount ?? 0) +
                (record.manualReviewCount ?? 0);
              const rawAttempted =
                typeof record.totalAttempted === 'number'
                  ? record.totalAttempted
                  : attemptedInfo.reliable
                    ? attemptedInfo.set.size
                    : fallbackAttempted;
              const totalAttempted =
                totalQuestions > 0
                  ? Math.max(0, Math.min(rawAttempted, totalQuestions))
                  : Math.max(0, rawAttempted);
              const derivedCorrect =
                typeof record.correct === 'number'
                  ? record.correct
                  : attemptedInfo.reliable
                    ? Array.from(attemptedInfo.set).filter(
                        (question) =>
                          record.questionStats?.[question]?.status === 'correct'
                      ).length
                    : 0;
              const correctCount = Math.max(0, Math.min(derivedCorrect, totalAttempted));
              const remainingQuestions =
                totalQuestions > 0 ? Math.max(totalQuestions - totalAttempted, 0) : 0;
              const percent =
                totalAttempted > 0 ? (correctCount / totalAttempted) * 100 : 0;

              let colorClass = 'text-slate-500';
              if (percent >= 90) {
                colorClass = 'text-emerald-600';
              } else if (percent >= 70) {
                colorClass = 'text-amber-600';
              } else if (percent > 0) {
                colorClass = 'text-rose-600';
              }

              const coveragePercent =
                totalQuestions > 0 ? (totalAttempted / totalQuestions) * 100 : 0;
              const pendingPercent =
                totalQuestions > 0 ? (remainingQuestions / totalQuestions) * 100 : 0;

              let unassignedQuestions = null;
              if (Array.isArray(record.missing) && record.missing.length > 0) {
                unassignedQuestions = Array.from(
                  new Set(
                    record.missing
                      .map((value) => Number.parseInt(value, 10))
                      .filter((value) => !Number.isNaN(value))
                  )
                ).sort((a, b) => a - b);
              } else if (attemptedInfo.reliable && totalQuestions > 0) {
                const derived = [];
                for (let index = 1; index <= totalQuestions; index += 1) {
                  if (!attemptedInfo.set.has(index)) {
                    derived.push(index);
                  }
                }
                unassignedQuestions = derived;
              } else if (totalQuestions > 0 && totalAttempted >= totalQuestions) {
                unassignedQuestions = [];
              }

              const unassignedCount = Array.isArray(unassignedQuestions)
                ? unassignedQuestions.length
                : null;
              const unassignedDisplay = Array.isArray(unassignedQuestions)
                ? formatQuestionRanges(unassignedQuestions)
                : '';
              const coverageDisplay = percentDisplay(coveragePercent);
              const pendingDisplay = percentDisplay(pendingPercent);
              const fallbackIncorrect = [];
              const fallbackManual = [];
              Object.entries(record.questionStats ?? {}).forEach(([questionKey, value]) => {
                const questionNumber = Number.parseInt(questionKey, 10);
                if (Number.isNaN(questionNumber)) {
                  return;
                }
                if (value?.status === 'incorrect') {
                  fallbackIncorrect.push({
                    question: questionNumber,
                    studentAnswer: value.studentAnswer ?? '',
                    correctAnswer: value.correctAnswer ?? ''
                  });
                } else if (value?.status === 'manual') {
                  fallbackManual.push({
                    question: questionNumber,
                    answers: Array.isArray(value.manualAnswers) ? value.manualAnswers : [],
                    reasons: Array.isArray(value.manualReasons) ? value.manualReasons : []
                  });
                }
              });
              const incorrectEntries =
                Array.isArray(record.incorrect) && record.incorrect.length > 0
                  ? record.incorrect
                  : fallbackIncorrect;
              const manualEntries =
                Array.isArray(record.manualReview) && record.manualReview.length > 0
                  ? record.manualReview
                  : fallbackManual;

              const historyListRaw = Array.isArray(record.history) ? record.history : [];
              const historyList = historyListRaw
                .map((entry) => ({
                  ...entry,
                  incorrect: Array.isArray(entry.incorrect) ? entry.incorrect : [],
                  manualReview: Array.isArray(entry.manualReview) ? entry.manualReview : [],
                  missing: Array.isArray(entry.missing) ? entry.missing : []
                }))
                .sort((a, b) => {
                  const aDate = a.recordedAt ?? '';
                  const bDate = b.recordedAt ?? '';
                  if (aDate === bDate) {
                    return (b.id ?? '').localeCompare(a.id ?? '');
                  }
                  return bDate.localeCompare(aDate);
                });
              const totalCompletionPercent =
                totalQuestions > 0 ? (totalAttempted / totalQuestions) * 100 : 0;
              const remainingPercent =
                totalQuestions > 0 ? (remainingQuestions / totalQuestions) * 100 : 0;
              const cardId = record?.worksheetId ?? record?.id ?? meta.id;
              const isCollapsed = Boolean(collapsedCards[cardId]);

              return (
                <li
                  key={record.id ?? record.date}
                  className={`relative rounded-xl border border-white/70 bg-white p-4 pt-6 text-xs text-slate-600 shadow-sm transition ${hoverClasses} hover:bg-white`}
                >
                  <div className="absolute right-3 top-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleWorksheetCollapsed(cardId)}
                      className="inline-flex size-6 items-center justify-center text-slate-400 transition hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200"
                      aria-expanded={!isCollapsed}
                      aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} details for ${meta.label}`}
                    >
                      {isCollapsed ? (
                        <ChevronDown className="size-4" aria-hidden />
                      ) : (
                        <ChevronUp className="size-4" aria-hidden />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const summary = formatWorksheetSummary(record, meta);
                        try {
                          await navigator.clipboard.writeText(summary);
                        } catch {
                          // Clipboard blocked
                        }
                      }}
                      className="inline-flex size-6 items-center justify-center text-slate-400 transition hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200"
                      aria-label={`Copy summary for ${meta.label}`}
                    >
                      <ClipboardCopy className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWorksheet(record, meta)}
                      className="inline-flex size-6 items-center justify-center text-slate-400 transition hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200"
                      aria-label={`Delete logged results for ${meta.label}`}
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{meta.label}</p>
                      <p className="text-xs text-slate-500">
                        <span className="font-medium">
                          {formatDate(record.date)} · {totalAttempted} questions graded
                        </span>
                        <br />
                        <span className={colorClass}>
                          {correctCount}/{totalAttempted || 0} ({percent.toFixed(0)}%) correct
                        </span>
                        {totalQuestions > 0 ? (
                          <>
                            <br />
                            <span className="text-slate-400">
                              {totalCompletionPercent.toFixed(1)}% of worksheet covered ·{' '}
                              {remainingPercent.toFixed(1)}% remaining
                            </span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  ) : null}
                  {!isCollapsed ? (
                    <div className="mt-4 space-y-4">
                    {historyList.length > 0 ? (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Upload log
                        </p>
                        <ul className="mt-2 list-disc space-y-3 pl-4 text-xs text-slate-600 marker:text-slate-400">
                          {historyList.map((entry) => {
                            const entryDate = formatDate(entry.recordedAt);
                            const entryPercent =
                              typeof entry.percent === 'number'
                                ? entry.percent.toFixed(0)
                                : entry.attempted > 0
                                  ? ((entry.correct / entry.attempted) * 100).toFixed(0)
                                  : '0';
                            const reviewedChecked = Boolean(entry.reviewed);
                            return (
                              <li key={entry.id} className="space-y-2 relative">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteHistoryEntry(record, entry.id)}
                                  className="absolute right-2 top-2 inline-flex size-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition hover:border-rose-200 hover:text-rose-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200"
                                  aria-label="Delete upload log entry"
                                >
                                  <X className="size-3.5" aria-hidden />
                                </button>
                                <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-white px-3 py-2 pr-8 shadow-sm shadow-white">
                                  <div>
                                    <p className="font-semibold text-slate-700">
                                      {entryDate}
                                    </p>
                                    <p className="mt-1 text-slate-500">
                                      {entry.correct}/{entry.attempted || 0} ({entryPercent}%)
                                      correct
                                    </p>
                                  </div>
                                  <label className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                    <input
                                      type="checkbox"
                                      checked={reviewedChecked}
                                      onChange={(event) =>
                                        handleToggleHistoryReview(
                                          record,
                                          entry.id,
                                          event.target.checked
                                        )
                                      }
                                      className="size-3 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
                                    />
                                    Reviewed in class?
                                  </label>
                                </div>
                                {entry.incorrect.length ? (
                                  <details className="rounded-lg border border-slate-100 bg-white/80 px-3 py-2">
                                    <summary className="cursor-pointer text-xs font-semibold text-slate-600">
                                      Missed ({entry.incorrect.length})
                                    </summary>
                                    <ul className="mt-1 space-y-1 text-xs text-slate-600">
                                      {entry.incorrect.map((item) => (
                                        <li key={`${entry.id}-missed-${item.question}`}>
                                          Question {item.question}:{' '}
                                          {(item.studentAnswer || '—').toString().toUpperCase()}
                                          {' -> '}
                                          {(item.correctAnswer || '—').toString().toUpperCase()}
                                        </li>
                                      ))}
                                    </ul>
                                  </details>
                                ) : null}
                                {entry.manualReview.length ? (
                                  <details className="rounded-lg border border-slate-100 bg-white/80 px-3 py-2">
                                    <summary className="cursor-pointer text-xs font-semibold text-slate-600">
                                      Manual review ({entry.manualReview.length})
                                    </summary>
                                    <ul className="mt-1 space-y-1 text-xs text-slate-600">
                                      {entry.manualReview.map((item) => (
                                        <li key={`${entry.id}-manual-${item.question}`}>
                                          Question {item.question}:{' '}
                                          {(item.answers || []).join(', ') || '—'}
                                          <span className="block text-[11px] text-slate-400">
                                            {(item.reasons || []).join('; ')}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </details>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/40 px-3 py-4 text-xs text-slate-400">
                        No uploads logged yet. Grade this worksheet to start the history.
                      </div>
                    )}
                    <div className="rounded-2xl border border-slate-100 bg-white/90 p-3 text-xs text-slate-600">
                      <p className="font-semibold text-slate-700">Total progress</p>
                      {unassignedQuestions !== null ? (
                        <details className="mt-2 text-xs">
                          <summary className="cursor-pointer font-semibold text-slate-600">
                            Questions remaining ({unassignedCount ?? 0})
                          </summary>
                          <div className="mt-1 text-slate-500">
                            {unassignedCount ? (
                              <>Questions: {unassignedDisplay}</>
                            ) : (
                              'No outstanding questions.'
                            )}
                          </div>
                        </details>
                      ) : totalQuestions > 0 ? (
                        <p className="mt-2 text-xs text-slate-400">
                          Upload the latest grading to see remaining question ranges.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  const overallPercentages = useMemo(() => {
    let englishCorrect = 0;
    let englishTotal = 0;
    let mathCorrect = 0;
    let mathTotal = 0;

    assignedList.forEach(({ record, subject }) => {
      if (!record) return;
      const correct = record.correct ?? 0;
      const denominator = record.denominator ?? record.totalQuestions ?? 0;
      if (denominator === 0) return;

      if (subject === 'english') {
        englishCorrect += correct;
        englishTotal += denominator;
      } else {
        mathCorrect += correct;
        mathTotal += denominator;
      }
    });

    const englishOverall = englishTotal > 0 ? (englishCorrect / englishTotal) * 100 : 0;
    const mathOverall = mathTotal > 0 ? (mathCorrect / mathTotal) * 100 : 0;

    return { englishOverall, mathOverall };
  }, [assignedList]);

  return (
    <section className="rounded-3xl border border-white/80 bg-white p-5 shadow-lg shadow-sky-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Worksheets</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={async () => {
              const text = `Overall English: ${overallPercentages.englishOverall.toFixed(1)}%`;
              try {
                await navigator.clipboard.writeText(text);
              } catch {
                // Clipboard blocked
              }
            }}
            className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 transition hover:border-blue-300 hover:bg-blue-100"
            title="Click to copy overall English percentage"
          >
            English: {overallPercentages.englishOverall.toFixed(1)}%
          </button>
          <button
            type="button"
            onClick={async () => {
              const text = `Overall Math: ${overallPercentages.mathOverall.toFixed(1)}%`;
              try {
                await navigator.clipboard.writeText(text);
              } catch {
                // Clipboard blocked
              }
            }}
            className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-600 transition hover:border-rose-300 hover:bg-rose-100"
            title="Click to copy overall Math percentage"
          >
            Math: {overallPercentages.mathOverall.toFixed(1)}%
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {(() => {
            const englishAssigned = assignedList.filter((item) => item.subject === 'english').length;
            const mathAssigned = assignedList.filter((item) => item.subject === 'math').length;
            const englishRemaining = unassignedList.filter((item) =>
              item.id.startsWith('english')
            ).length;
            const mathRemaining = unassignedList.filter((item) => item.id.startsWith('math')).length;
            const englishTotal = englishAssigned + englishRemaining;
            const mathTotal = mathAssigned + mathRemaining;
            const englishPercent = englishTotal > 0 ? (englishAssigned / englishTotal) * 100 : 0;
            const mathPercent = mathTotal > 0 ? (mathAssigned / mathTotal) * 100 : 0;
            const englishPercentDisplay = percentDisplay(englishPercent);
            const mathPercentDisplay = percentDisplay(mathPercent);

            return (
              <>
                <span className="text-blue-600">
                  English: {englishAssigned} assigned · {englishRemaining} remaining (
                  {englishPercentDisplay})
                </span>
                <br />
                <span className="text-rose-600">
                  Math: {mathAssigned} assigned · {mathRemaining} remaining ({mathPercentDisplay})
                </span>
              </>
            );
          })()}
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {PRIORITY_ORDER.map((priorityKey) => {
          const group = assignedByPriority[priorityKey] ?? { english: [], math: [] };
          const heading =
            priorityKey === 'other' ? 'Additional Worksheets' : PRIORITY_LEVELS[priorityKey];
          const hasAssignments = group.english.length > 0 || group.math.length > 0;

          if (!hasAssignments && priorityKey !== 'other') {
            return null;
          }

          return (
            <div key={priorityKey} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {heading}
              </p>
              {hasAssignments ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <SubjectPanel subject="english" items={group.english} />
                  <SubjectPanel subject="math" items={group.math} />
                </div>
              ) : (
                <p className="mt-1 text-xs text-slate-400">No work logged yet.</p>
              )}
            </div>
          );
        })}
      </div>

      <TopicChecklist student={student} worksheetsMeta={worksheetsMeta} onUpdate={onUpdate} />
    </section>
  );
}

function PracticeTestsColumn({
  student,
  onAddCustomPractice,
  onUpdatePractice,
  onUpdateCustomPractice,
  onDeleteCustomPractice
}) {
  const [isEditing, setIsEditing] = useState(false);

  const sortedPracticeTests = useMemo(() => {
    const tests = Array.isArray(student.practiceTests) ? [...student.practiceTests] : [];
    const taken = tests.filter((test) => Boolean(test.date)).sort((a, b) => {
      const dateA = a.date ?? '';
      const dateB = b.date ?? '';
      return dateB.localeCompare(dateA);
    });
    const upcoming = tests.filter((test) => !test.date).sort((a, b) => {
      const numberA = extractBluebookNumber(a.label ?? '');
      const numberB = extractBluebookNumber(b.label ?? '');
      if (numberA === numberB) {
        return (a.label ?? '').localeCompare(b.label ?? '');
      }
      return numberA - numberB;
    });
    return [...taken, ...upcoming];
  }, [student.practiceTests]);

  return (
    <section className="rounded-3xl border border-white/80 bg-white p-5 shadow-lg shadow-sky-100">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Practice tests</h2>
        <div className="flex items-center gap-2">
          {isEditing && (
            <button
              type="button"
              onClick={onAddCustomPractice}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200"
            >
              <Plus className="size-3.5" aria-hidden />
              Add custom
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200"
          >
            {isEditing ? (
              <>
                <Check className="size-3.5" aria-hidden />
                Save
              </>
            ) : (
              <>
                <Pencil className="size-3.5" aria-hidden />
                Edit
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Bluebook tests
          </p>
          <ul className="mt-2 space-y-2">
            {sortedPracticeTests.map((test) => (
              <li
                key={test.id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600"
              >
                {isEditing ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-700">{test.label}</span>
                      <input
                        type="date"
                        value={test.date ?? ''}
                        onChange={(event) => onUpdatePractice(test.id, 'date', event.target.value)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600"
                      />
                    </div>
                    <div className="mt-2 space-y-2">
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase text-slate-500">Overall score</span>
                        <input
                          type="number"
                          min="200"
                          max="1600"
                          placeholder="—"
                          value={test.composite ?? ''}
                          onChange={(event) =>
                            onUpdatePractice(test.id, 'composite', event.target.value)
                          }
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600"
                        />
                      </label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase text-slate-500">English</span>
                          <input
                            type="number"
                            min="10"
                            max="800"
                            placeholder="—"
                            value={test.readingWriting ?? ''}
                            onChange={(event) =>
                              onUpdatePractice(test.id, 'readingWriting', event.target.value)
                            }
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase text-slate-500">Math</span>
                          <input
                            type="number"
                            min="10"
                            max="800"
                            placeholder="—"
                            value={test.math ?? ''}
                            onChange={(event) => onUpdatePractice(test.id, 'math', event.target.value)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600"
                          />
                        </label>
                      </div>
                    </div>
                  </>
                ) : (
                  (() => {
                    const formattedDate = test.date ? `${formatDateCompact(test.date)}:` : '';
                    const compositeScore = test.composite ? Number.parseInt(test.composite, 10) : null;
                    const englishScore = test.readingWriting
                      ? Number.parseInt(test.readingWriting, 10)
                      : null;
                    const mathScore = test.math ? Number.parseInt(test.math, 10) : null;
                    return (
                      <div className="space-y-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                          {formattedDate ? (
                            <span className="font-medium text-slate-600">{formattedDate}</span>
                          ) : null}
                          <span>{test.label}</span>
                          {compositeScore !== null ? (
                            <span className="text-sm font-bold text-slate-900">{compositeScore}</span>
                          ) : (
                            <span className="text-sm font-medium text-slate-400">—</span>
                          )}
                        </p>
                        {(englishScore !== null || mathScore !== null) && (
                          <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                            {englishScore !== null ? (
                              <span className="font-semibold text-blue-600">
                                English
                                <span className="ml-1 font-normal text-slate-600">{englishScore}</span>
                              </span>
                            ) : null}
                            {mathScore !== null ? (
                              <span className="font-semibold text-rose-600">
                                Math
                                <span className="ml-1 font-normal text-slate-600">{mathScore}</span>
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Custom practice
          </p>
          {(!student.customPracticeTests || student.customPracticeTests.length === 0) && (
            <p className="mt-2 text-xs text-slate-400">No custom practice tests yet.</p>
          )}
          <ul className="mt-2 space-y-2">
            {(student.customPracticeTests ?? []).map((test) => (
              <li
                key={test.id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600"
              >
                {isEditing ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-700">{test.label}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={test.date ?? ''}
                          onChange={(event) =>
                            onUpdateCustomPractice(test.id, 'date', event.target.value)
                          }
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600"
                        />
                        <button
                          type="button"
                          onClick={() => onDeleteCustomPractice(test.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 transition hover:border-red-300 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-200"
                        >
                          <X className="size-3" aria-hidden />
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 space-y-2">
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase text-slate-500">Overall score</span>
                        <input
                          type="number"
                          min="200"
                          max="1600"
                          placeholder="—"
                          value={test.composite ?? ''}
                          onChange={(event) =>
                            onUpdateCustomPractice(test.id, 'composite', event.target.value)
                          }
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600"
                        />
                      </label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase text-slate-500">English</span>
                          <input
                            type="number"
                            min="10"
                            max="800"
                            placeholder="—"
                            value={test.readingWriting ?? ''}
                            onChange={(event) =>
                              onUpdateCustomPractice(test.id, 'readingWriting', event.target.value)
                            }
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase text-slate-500">Math</span>
                          <input
                            type="number"
                            min="10"
                            max="800"
                            placeholder="—"
                            value={test.math ?? ''}
                            onChange={(event) =>
                              onUpdateCustomPractice(test.id, 'math', event.target.value)
                            }
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600"
                          />
                        </label>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    {test.composite || test.readingWriting || test.math ? (
                      <p className="text-xs text-slate-700">
                        <span className="font-semibold">{test.label}:</span>{' '}
                        {test.composite ? (
                          <span>{test.composite}</span>
                        ) : null}
                        {test.readingWriting || test.math ? (
                          <>
                            {test.composite ? ' ' : ''}
                            {test.readingWriting ? (
                              <span className="text-blue-600 font-medium">{test.readingWriting}</span>
                            ) : null}
                            {test.readingWriting && test.math ? ' ' : ''}
                            {test.math ? (
                              <span className="text-rose-600 font-medium">{test.math}</span>
                            ) : null}
                          </>
                        ) : null}
                      </p>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">{test.label}</span>
                        {test.date ? (
                          <span className="text-slate-500 text-xs">{formatDate(test.date)}</span>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function OfficialTestsColumn({ student, onUpdate, onAddRealTest, onUpdateRealTest, onDeleteRealTest }) {
  const [isEditing, setIsEditing] = useState(false);
  const realTests = student.realTests ?? [];
  const completedOfficial = realTests
    .filter((item) => item.status === 'completed')
    .sort((a, b) => {
      const dateA = a.date ?? '';
      const dateB = b.date ?? '';
      if (dateA === dateB) return 0;
      return dateB.localeCompare(dateA); // Newest to oldest
    });
  const upcomingOfficial = realTests
    .filter((item) => item.status !== 'completed')
    .sort((a, b) => {
      const dateA = a.date ?? '';
      const dateB = b.date ?? '';
      if (dateA === dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.localeCompare(dateB); // Nearest to furthest
    });

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-white/80 bg-white p-5 shadow-lg shadow-sky-100">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">SAT timeline</h2>
          <div className="flex items-center gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={onAddRealTest}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200"
              >
                <Plus className="size-3.5" aria-hidden />
                Add official test
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200"
            >
              {isEditing ? (
                <>
                  <Check className="size-3.5" aria-hidden />
                  Save
                </>
              ) : (
                <>
                  <Pencil className="size-3.5" aria-hidden />
                  Edit
                </>
              )}
            </button>
          </div>
        </div>
        <div className="mt-4 space-y-4 text-sm text-slate-600">
          {isEditing ? (
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold uppercase text-slate-500">Next SAT date</span>
              <input
                type="date"
                value={student.upcomingSatDate ?? ''}
                onChange={(event) =>
                  onUpdate(() => ({
                    upcomingSatDate: event.target.value
                  }))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
          ) : (
            <div className="text-xs">
              <p className="font-semibold uppercase text-slate-500">Next SAT date</p>
              <p className="mt-1 text-slate-700">
                {student.upcomingSatDate ? formatDate(student.upcomingSatDate) : '—'}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {upcomingOfficial.length > 0 ? (
              <div className="rounded-2xl bg-slate-50 p-3 text-xs">
                <p className="font-semibold text-slate-600">Upcoming</p>
                <ul className="mt-2 space-y-2 text-slate-600">
                  {upcomingOfficial.map((test) => (
                    <li key={test.id} className="relative rounded-lg border border-slate-100 bg-white p-2 pr-8">
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => onDeleteRealTest(test.id)}
                          className="absolute right-2 top-2 inline-flex size-6 items-center justify-center text-slate-400 transition hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200"
                          aria-label="Delete upcoming test"
                        >
                          <X className="size-4" aria-hidden />
                        </button>
                      )}
                      {isEditing ? (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="date"
                              value={test.date ?? ''}
                              onChange={(event) =>
                                onUpdateRealTest(test.id, 'date', event.target.value)
                              }
                              className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600"
                            />
                            <select
                              value={test.status ?? 'upcoming'}
                              onChange={(event) =>
                                onUpdateRealTest(test.id, 'status', event.target.value)
                              }
                              className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600"
                            >
                              <option value="upcoming">Scheduled</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>
                          <input
                            type="text"
                            placeholder="Notes"
                            value={test.notes ?? ''}
                            onChange={(event) => onUpdateRealTest(test.id, 'notes', event.target.value)}
                            className="mt-2 w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-600"
                          />
                        </>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-700">
                              {test.date ? formatDate(test.date) : 'TBD'}
                            </span>
                            {test.notes && (
                              <span className="text-xs text-slate-500">{test.notes}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {completedOfficial.length > 0 ? (
              <div className="rounded-2xl bg-slate-50 p-3 text-xs">
                <p className="font-semibold text-slate-600">Completed</p>
                <ul className="mt-2 space-y-1 text-slate-600">
                  {completedOfficial.map((test) => (
                    <li key={test.id} className="relative rounded-lg border border-slate-100 bg-white p-2 pr-8">
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => onDeleteRealTest(test.id)}
                          className="absolute right-2 top-2 inline-flex size-6 items-center justify-center text-slate-400 transition hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200"
                          aria-label={`Delete test from ${formatDate(test.date)}`}
                        >
                          <X className="size-4" aria-hidden />
                        </button>
                      )}
                      {isEditing ? (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <span>{formatDate(test.date)}</span>
                            <input
                              type="number"
                              placeholder="Composite"
                              value={test.composite ?? ''}
                              onChange={(event) =>
                                onUpdateRealTest(test.id, 'composite', event.target.value)
                              }
                              className="w-24 rounded border border-slate-200 px-2 py-1 text-xs text-slate-600"
                            />
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <label className="flex flex-col gap-1">
                              <span className="text-[10px] uppercase text-slate-500">Reading/Writing</span>
                              <input
                                type="number"
                                value={test.readingWriting ?? ''}
                                onChange={(event) =>
                                  onUpdateRealTest(test.id, 'readingWriting', event.target.value)
                                }
                                className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600"
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-[10px] uppercase text-slate-500">Math</span>
                              <input
                                type="number"
                                value={test.math ?? ''}
                                onChange={(event) => onUpdateRealTest(test.id, 'math', event.target.value)}
                                className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600"
                              />
                            </label>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-700">{formatDate(test.date)}</span>
                            {test.composite && (
                              <span className="text-slate-600 font-semibold">{test.composite}</span>
                            )}
                          </div>
                          {(test.readingWriting || test.math) && (
                            <div className="flex gap-4 text-xs text-slate-600">
                              {test.readingWriting && (
                                <span>
                                  <span className="font-semibold">Reading/Writing:</span> {test.readingWriting}
                                </span>
                              )}
                              {test.math && (
                                <span>
                                  <span className="font-semibold">Math:</span> {test.math}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {completedOfficial.length === 0 && upcomingOfficial.length === 0 ? (
              <p className="text-xs text-slate-400">No official tests logged yet.</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function TestDayPredictor({ student }) {
  // Get all practice and real tests with dates and composite scores
  const allTests = useMemo(() => {
    const tests = [];
    
    // Add practice tests
    (student.practiceTests ?? []).forEach((test) => {
      if (test.date && test.composite) {
        tests.push({
          date: test.date,
          composite: Number.parseInt(test.composite, 10),
          english: test.readingWriting ? Number.parseInt(test.readingWriting, 10) : null,
          math: test.math ? Number.parseInt(test.math, 10) : null,
          type: 'practice',
          label: test.label ?? 'Practice'
        });
      }
    });
    
    // Add custom practice tests
    (student.customPracticeTests ?? []).forEach((test) => {
      if (test.date && test.composite) {
        tests.push({
          date: test.date,
          composite: Number.parseInt(test.composite, 10),
          english: test.readingWriting ? Number.parseInt(test.readingWriting, 10) : null,
          math: test.math ? Number.parseInt(test.math, 10) : null,
          type: 'practice',
          label: test.label ?? 'Practice'
        });
      }
    });
    
    // Add completed real tests
    (student.realTests ?? [])
      .filter((test) => test.status === 'completed' && test.date && test.composite)
      .forEach((test) => {
        tests.push({
          date: test.date,
          composite: Number.parseInt(test.composite, 10),
          english: test.readingWriting ? Number.parseInt(test.readingWriting, 10) : null,
          math: test.math ? Number.parseInt(test.math, 10) : null,
          type: 'real',
          label: test.notes?.trim() || 'Official'
        });
      });
    
    // Sort by date (newest first)
    return tests.sort((a, b) => {
      const dateA = a.date ?? '';
      const dateB = b.date ?? '';
      return dateB.localeCompare(dateA);
    });
  }, [student]);
  
  // Get last 3 scores
  const lastThreeScores = allTests.slice(0, 3);
  const averageScoreRaw = lastThreeScores.length > 0
    ? lastThreeScores.reduce((sum, test) => sum + test.composite, 0) / lastThreeScores.length
    : null;
  const averageScore = typeof averageScoreRaw === 'number'
    ? Math.round(averageScoreRaw / 10) * 10
    : null;
  
  if (!averageScore) {
    return null;
  }
  
  const chronologicalData = [...allTests].reverse();
  const chartData = chronologicalData.map((test) => ({
    date: test.date,
    label: test.label,
    type: test.type,
    composite: test.composite,
    english: typeof test.english === 'number' ? test.english : null,
    math: typeof test.math === 'number' ? test.math : null
  }));
  
  return (
    <section className="rounded-3xl border border-white/80 bg-white p-5 shadow-lg shadow-sky-100">
      <h2 className="text-sm font-semibold text-slate-800">Test day predictor</h2>
      <div className="mt-3">
        <p className="text-xs text-slate-500">Average of last 3 scores</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{averageScore}</p>
        {lastThreeScores.length > 0 && (
          <div className="mt-2 space-y-1 text-xs text-slate-600">
            {lastThreeScores.map((test, index) => (
              <div key={index} className="flex items-center justify-between">
                <span>{formatDateCompact(test.date)}</span>
                <span className="font-medium">{test.composite}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <ScoreTrendChart data={chartData} />
    </section>
  );
}

function ScoreTrendChart({ data }) {
  const chartData = Array.isArray(data) ? data : [];
  if (chartData.length === 0) {
    return null;
  }

  const width = 640;
  const height = 280;
  const paddingX = 48;
  const paddingYTop = 48;
  const paddingYBottom = 48;
  const minScore = 400;
  const maxScore = 1600;
  const range = maxScore - minScore;
  const step = 100;

  const getX = (index) =>
    chartData.length === 1
      ? width / 2
      : paddingX + (index / (chartData.length - 1)) * (width - paddingX * 2);

  const getY = (value) =>
    height -
    paddingYBottom -
    ((Math.min(Math.max(value, minScore), maxScore) - minScore) / range) *
      (height - paddingYTop - paddingYBottom);

  const buildPath = (key) => {
    let path = '';
    let started = false;
    chartData.forEach((item, index) => {
      const value = item[key];
      if (typeof value !== 'number' || Number.isNaN(value)) {
        started = false;
        return;
      }
      const x = getX(index);
      const y = getY(value);
      if (!started) {
        path += `M ${x} ${y}`;
        started = true;
      } else {
        path += ` L ${x} ${y}`;
      }
    });
    return path;
  };

  const overallPath = buildPath('composite');
  const englishPath = buildPath('english');
  const mathPath = buildPath('math');

  const shortLabel = (item) => {
    if (item.label) {
      return item.label.replace('Bluebook', 'BB');
    }
    return item.type === 'real' ? 'Official' : 'Test';
  };

  const ticks = [];
  for (let score = minScore; score <= maxScore; score += step) {
    ticks.push(score);
  }

  const labelOffset = 16;

  return (
    <div className="mt-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-72 w-full"
        role="img"
        aria-label="Score trends chart"
      >
        {/* Axes */}
        <line
          x1={paddingX}
          y1={height - paddingYBottom}
          x2={width - paddingX}
          y2={height - paddingYBottom}
          stroke="#cbd5f5"
        />
        <line x1={paddingX} y1={paddingYTop} x2={paddingX} y2={height - paddingYBottom} stroke="#cbd5f5" />

        {/* Horizontal grid lines */}
        {ticks.map((score) => {
          const y = getY(score);
          return (
            <g key={`grid-${score}`}>
              <line
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
              <text
                x={paddingX - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px]"
              >
                {score}
              </text>
            </g>
          );
        })}

        {/* Paths */}
        {overallPath && (
          <path d={overallPath} stroke="#0f172a" strokeWidth="2" fill="none" strokeLinecap="round" />
        )}
        {englishPath && (
          <path d={englishPath} stroke="#2563eb" strokeWidth="2" fill="none" strokeLinecap="round" />
        )}
        {mathPath && (
          <path d={mathPath} stroke="#dc2626" strokeWidth="2" fill="none" strokeLinecap="round" />
        )}

        {/* Circles */}
        {chartData.map((item, index) => {
          const x = getX(index);
          const compositeY = typeof item.composite === 'number' ? getY(item.composite) : null;
          const englishY = typeof item.english === 'number' ? getY(item.english) : null;
          const mathY = typeof item.math === 'number' ? getY(item.math) : null;
          const validY = (value) => typeof value === 'number' && !Number.isNaN(value);
          const computeOffset = (value, others) => {
            if (!validY(value)) {
              return null;
            }
            const validOthers = others.filter((other) => validY(other));
            const higherCount = validOthers.filter((other) => value < other).length;
            const lowerCount = validOthers.filter((other) => value > other).length;
            if (higherCount === validOthers.length) {
              return -labelOffset;
            }
            if (lowerCount === validOthers.length) {
              return labelOffset + 4;
            }
            if (higherCount > lowerCount) {
              return -labelOffset;
            }
            if (lowerCount > higherCount) {
              return labelOffset + 4;
            }
            return value < (compositeY ?? value) ? -labelOffset : labelOffset + 4;
          };
          let englishOffset = computeOffset(englishY, [compositeY, mathY]);
          let mathOffset = computeOffset(mathY, [compositeY, englishY]);

          if (englishY !== null && mathY !== null) {
            if (englishY <= mathY) {
              englishOffset = -labelOffset;
              mathOffset = labelOffset + 6;
            } else {
              mathOffset = -labelOffset;
              englishOffset = labelOffset + 6;
            }
          }

          const adjustForCompositeLabel = (value, offset) => {
            if (!validY(value) || typeof offset !== 'number') {
              return offset;
            }
            if (!validY(compositeY)) {
              return offset;
            }
            const compositeLabelY = (compositeY ?? 0) - labelOffset;
            const labelY = value + offset;
            if (Math.abs(labelY - compositeLabelY) < 10) {
              return offset + (offset < 0 ? -6 : 6);
            }
            return offset;
          };

          englishOffset = adjustForCompositeLabel(englishY, englishOffset);
          mathOffset = adjustForCompositeLabel(mathY, mathOffset);
          return (
            <g key={`${item.date}-${index}`}>
              {compositeY !== null ? (
                <>
                  <circle cx={x} cy={compositeY} r={3} fill="#0f172a" />
                  <text
                    x={x}
                    y={compositeY - labelOffset}
                    textAnchor="middle"
                    className="fill-slate-900 text-[10px] font-semibold"
                  >
                    {item.composite}
                  </text>
                </>
              ) : null}
              {englishY !== null ? (
                <>
                  <circle cx={x} cy={englishY} r={2.5} fill="#2563eb" />
                  <text
                    x={x}
                    y={englishY + (englishOffset ?? labelOffset)}
                    textAnchor="middle"
                    className="fill-blue-600 text-[9px]"
                  >
                    {item.english}
                  </text>
                </>
              ) : null}
              {mathY !== null ? (
                <>
                  <circle cx={x} cy={mathY} r={2.5} fill="#dc2626" />
                  <text
                    x={x}
                    y={mathY + (mathOffset ?? labelOffset)}
                    textAnchor="middle"
                    className="fill-rose-600 text-[9px]"
                  >
                    {item.math}
                  </text>
                </>
              ) : null}
            </g>
          );
        })}

        {/* Labels */}
        {chartData.map((item, index) => (
          <text
            key={`label-${item.date}-${index}`}
            x={getX(index)}
            y={height - paddingYBottom + 16}
            textAnchor="middle"
            className="fill-slate-500 text-[10px]"
          >
            {shortLabel(item)}
          </text>
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap gap-4 text-[11px] uppercase tracking-wide text-slate-500">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-4 rounded-full bg-slate-900" /> Overall
        </span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-4 rounded-full bg-blue-600" /> English
        </span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-4 rounded-full bg-rose-600" /> Math
        </span>
      </div>
    </div>
  );
}

function ReferenceColumn({ onDeleteStudent }) {
  const orderedGuidelines = useMemo(() => {
    const sections = [...COURSE_GUIDELINES];
    const contentIndex = sections.findIndex((section) =>
      section.title.toLowerCase().startsWith('content')
    );
    if (contentIndex > 0) {
      const [contentSection] = sections.splice(contentIndex, 1);
      sections.unshift(contentSection);
    }
    return sections;
  }, []);

  return (
    <section className="rounded-3xl border border-white/80 bg-white p-5 shadow-lg shadow-sky-100">
      <h2 className="text-sm font-semibold text-slate-800">Reference</h2>
      <div className="mt-3 space-y-4">
        {orderedGuidelines.map((section) => (
          <details
            key={section.title}
            className="group rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600"
          >
            <summary className="cursor-pointer list-none font-semibold text-slate-700">
              {section.title}
            </summary>
            <div className="mt-2 space-y-2 text-xs leading-relaxed text-slate-500">
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.mustHaves ? (
                <div>
                  <p className="mt-3 font-semibold text-slate-600">The must haves</p>
                  <ul className="mt-1 space-y-1">
                    {section.mustHaves.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {section.priorityNotes ? (
                <div>
                  <p className="mt-3 font-semibold text-slate-600">Priority of packets</p>
                  <ul className="mt-1 space-y-1">
                    {section.priorityNotes.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {section.sessions ? (
                <div>
                  <p className="mt-3 font-semibold text-slate-600">General outline</p>
                  <ul className="mt-1 space-y-2">
                    {section.sessions.map((session) => (
                      <li key={session.heading}>
                        <p className="font-semibold text-slate-600">{session.heading}</p>
                        <ul className="mt-1 space-y-1">
                          {session.items.map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {section.worksheetHighlights ? (
                <div>
                  <p className="mt-3 font-semibold text-slate-600">Worksheet highlights</p>
                  <ul className="mt-1 space-y-1">
                    {section.worksheetHighlights.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </details>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-red-200">
        <button
          type="button"
          onClick={onDeleteStudent}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:border-red-400 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-200"
        >
          <X className="size-4" aria-hidden />
          Erase Student Record
        </button>
      </div>
    </section>
  );
}

export function StudentAnalytics({
  student,
  worksheetsMeta,
  onClose,
  onUpdate,
  onAddCustomPractice,
  onUpdatePractice,
  onUpdateCustomPractice,
  onDeleteCustomPractice,
  onAddRealTest,
  onUpdateRealTest,
  onDeleteRealTest,
  onDeleteStudent
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-rose-50 pb-16 text-slate-900">
      <header className="border-b border-white/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <UserCircle2 className="size-10 text-blue-500" aria-hidden />
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{student.name}</h1>
              <p className="text-sm text-slate-500">
                Student since {formatDate(student.createdAt)} · Last updated {formatDate(student.updatedAt)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200"
          >
            <X className="size-4" aria-hidden />
            Back to grading
          </button>
        </div>
      </header>

      <main className="mx-auto mt-6 max-w-[90rem] px-4">
        <div className="grid gap-8 lg:grid-cols-4 xl:grid-cols-4">
          <div className="space-y-4 lg:col-span-2">
            <WorksheetsColumn student={student} worksheetsMeta={worksheetsMeta} onUpdate={onUpdate} />
          </div>
          <div className="space-y-6 lg:col-span-1">
            <PracticeTestsColumn
              student={student}
              onAddCustomPractice={onAddCustomPractice}
              onUpdatePractice={onUpdatePractice}
              onUpdateCustomPractice={onUpdateCustomPractice}
              onDeleteCustomPractice={onDeleteCustomPractice}
            />
            <TestDayPredictor student={student} />
          </div>
          <div className="space-y-6 lg:col-span-1">
            <OfficialTestsColumn
              student={student}
              onUpdate={onUpdate}
              onAddRealTest={onAddRealTest}
              onUpdateRealTest={onUpdateRealTest}
              onDeleteRealTest={onDeleteRealTest}
            />
            <ReferenceColumn onDeleteStudent={onDeleteStudent} />
          </div>
        </div>
      </main>
    </div>
  );
}
