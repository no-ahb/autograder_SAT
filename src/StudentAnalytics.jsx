import { useMemo } from 'react';
import { ClipboardCopy, Plus, UserCircle2, X } from 'lucide-react';
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
  const worksheetMap = useMemo(() => {
    const assigned = new Map();
    for (const entry of student.worksheets ?? []) {
      assigned.set(entry.worksheetId, entry);
    }
    return assigned;
  }, [student.worksheets]);

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

              return (
                <li
                  key={record.id ?? record.date}
                  className={`relative rounded-xl border border-white/70 bg-white p-4 pt-6 text-xs text-slate-600 shadow-sm transition ${hoverClasses} hover:bg-white`}
                >
                  <button
                    type="button"
                    onClick={() => handleDeleteWorksheet(record, meta)}
                    className="absolute right-3 top-3 inline-flex size-6 items-center justify-center text-slate-400 transition hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200"
                    aria-label={`Delete logged results for ${meta.label}`}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{meta.label}</p>
                      <p className="text-xs text-slate-500">
                        <span className="font-medium">
                          Latest update {formatDate(record.date)} · {totalAttempted} of{' '}
                          {totalQuestions || '—'} logged
                        </span>
                        <br />
                        <span className={colorClass}>
                          {correctCount}/{totalAttempted || 0} ({percent.toFixed(0)}%) correct
                        </span>
                        {totalQuestions > 0 ? (
                          <>
                            <br />
                            <span className="text-slate-400">
                              Coverage: {coverageDisplay} logged · {pendingDisplay} pending upload
                            </span>
                            <br />
                            <span className="text-slate-400">
                              {totalCompletionPercent.toFixed(1)}% of worksheet covered ·{' '}
                              {remainingPercent.toFixed(1)}% remaining
                            </span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>
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
                              <li key={entry.id} className="space-y-2">
                                <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-white px-3 py-2 shadow-sm shadow-white">
                                  <div>
                                    <p className="font-semibold text-slate-700">
                                      {entry.attempted || 0} questions completed {entryDate}
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
                      {totalQuestions > 0 ? (
                        <p className="mt-1 text-slate-500">
                          {totalAttempted}/{totalQuestions} completed (
                          {totalCompletionPercent.toFixed(1)}%) · {remainingQuestions} remaining (
                          {remainingPercent.toFixed(1)}%)
                        </p>
                      ) : (
                        <p className="mt-1 text-slate-500">{totalAttempted} questions logged</p>
                      )}
                      {incorrectEntries.length ? (
                        <details className="mt-2 text-xs">
                          <summary className="cursor-pointer font-semibold text-slate-600">
                            Currently incorrect ({incorrectEntries.length})
                          </summary>
                          <ul className="mt-1 space-y-1 text-slate-600">
                            {incorrectEntries.map((item) => (
                              <li key={`${record.id ?? record.date}-agg-miss-${item.question}`}>
                                Question {item.question}:{' '}
                                {(item.studentAnswer || '—').toString().toUpperCase()}
                                {' -> '}
                                {(item.correctAnswer || '—').toString().toUpperCase()}
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : (
                        <p className="mt-2 text-xs text-emerald-600">
                          No outstanding incorrect responses.
                        </p>
                      )}
                      {manualEntries.length ? (
                        <details className="mt-2 text-xs">
                          <summary className="cursor-pointer font-semibold text-slate-600">
                            Manual review ({manualEntries.length})
                          </summary>
                          <ul className="mt-1 space-y-1 text-slate-600">
                            {manualEntries.map((item) => (
                              <li key={`${record.id ?? record.date}-agg-manual-${item.question}`}>
                                Question {item.question}: {item.answers.join(', ')}
                                <span className="block text-[11px] text-slate-400">
                                  {item.reasons.join('; ')}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
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
            })}`
          </ul>
        )}
      </div>
    );
  };

  return (
    <section className="rounded-3xl border border-white/80 bg-white p-5 shadow-lg shadow-sky-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Worksheets</h2>
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
  return (
    <section className="rounded-3xl border border-white/80 bg-white p-5 shadow-lg shadow-sky-100">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Practice tests</h2>
        <button
          type="button"
          onClick={onAddCustomPractice}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200"
        >
          <Plus className="size-3.5" aria-hidden />
          Add custom
        </button>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Bluebook tests
          </p>
          <ul className="mt-2 space-y-2">
            {(student.practiceTests ?? []).map((test) => (
              <li
                key={test.id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600"
              >
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
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function OfficialTestsColumn({ student, onUpdate, onAddRealTest, onUpdateRealTest, onDeleteRealTest }) {
  const realTests = student.realTests ?? [];
  const completedOfficial = realTests.filter((item) => item.status === 'completed');
  const upcomingOfficial = realTests.filter((item) => item.status !== 'completed');

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-white/80 bg-white p-5 shadow-lg shadow-sky-100">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">SAT timeline</h2>
          <button
            type="button"
            onClick={onAddRealTest}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200"
          >
            <Plus className="size-3.5" aria-hidden />
            Add official test
          </button>
        </div>
        <div className="mt-4 space-y-4 text-sm text-slate-600">
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

          <div className="space-y-3">
            {completedOfficial.length > 0 ? (
              <div className="rounded-2xl bg-slate-50 p-3 text-xs">
                <p className="font-semibold text-slate-600">Completed</p>
                <ul className="mt-2 space-y-1 text-slate-600">
                  {completedOfficial.map((test) => (
                    <li key={test.id} className="rounded-lg border border-slate-100 bg-white p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span>{formatDate(test.date)}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="Composite"
                            value={test.composite ?? ''}
                            onChange={(event) =>
                              onUpdateRealTest(test.id, 'composite', event.target.value)
                            }
                            className="w-24 rounded border border-slate-200 px-2 py-1 text-xs text-slate-600"
                          />
                          <button
                            type="button"
                            onClick={() => onDeleteRealTest(test.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 transition hover:border-red-300 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-200"
                          >
                            <X className="size-3" aria-hidden />
                            Delete
                          </button>
                        </div>
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
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {upcomingOfficial.length > 0 ? (
              <div className="rounded-2xl bg-slate-50 p-3 text-xs">
                <p className="font-semibold text-slate-600">Upcoming</p>
                <ul className="mt-2 space-y-2 text-slate-600">
                  {upcomingOfficial.map((test) => (
                    <li key={test.id} className="rounded-lg border border-slate-100 bg-white p-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="date"
                          value={test.date ?? ''}
                          onChange={(event) =>
                            onUpdateRealTest(test.id, 'date', event.target.value)
                          }
                          className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600"
                        />
                        <div className="flex items-center gap-2">
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
                          <button
                            type="button"
                            onClick={() => onDeleteRealTest(test.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 transition hover:border-red-300 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-200"
                          >
                            <X className="size-3" aria-hidden />
                            Delete
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Notes"
                        value={test.notes ?? ''}
                        onChange={(event) => onUpdateRealTest(test.id, 'notes', event.target.value)}
                        className="mt-2 w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-600"
                      />
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
        <div className="grid gap-8 lg:grid-cols-4">
          <div className="space-y-4 lg:col-span-2">
            <WorksheetsColumn student={student} worksheetsMeta={worksheetsMeta} onUpdate={onUpdate} />
          </div>
          <div className="space-y-4 lg:col-span-1">
            <PracticeTestsColumn
              student={student}
              onAddCustomPractice={onAddCustomPractice}
              onUpdatePractice={onUpdatePractice}
              onUpdateCustomPractice={onUpdateCustomPractice}
              onDeleteCustomPractice={onDeleteCustomPractice}
            />
          </div>
          <div className="space-y-4 lg:col-span-1">
            <OfficialTestsColumn
              student={student}
              onUpdate={onUpdate}
              onAddRealTest={onAddRealTest}
              onUpdateRealTest={onUpdateRealTest}
              onDeleteRealTest={onDeleteRealTest}
            />
          </div>
          <div className="space-y-4 lg:col-span-2 lg:col-start-3">
            <ReferenceColumn onDeleteStudent={onDeleteStudent} />
          </div>
        </div>
      </main>
    </div>
  );
}
