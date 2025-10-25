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

function TopicChecklist({ student, worksheetsMeta, onUpdate }) {
  const checklist = student.topicChecklist ?? {};

  return (
    <section className="rounded-3xl border border-white/80 bg-white p-5 shadow-lg shadow-sky-100">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Topic checklist</h3>
        <ClipboardCopy className="size-4 text-slate-400" aria-hidden />
      </div>
      <div className="mt-3 space-y-3">
        {TOPIC_PRIORITY_ORDER.map((priorityKey) => {
          const worksheetsForPriority = worksheetsMeta.filter(
            (item) => WORKSHEET_PRIORITY[item.id] === priorityKey
          );
          if (worksheetsForPriority.length === 0) {
            return null;
          }
          return (
            <div key={priorityKey} className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {PRIORITY_LEVELS[priorityKey]}
              </p>
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {worksheetsForPriority.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-transparent px-2 py-1 transition hover:border-slate-200 hover:bg-white"
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
                          onUpdate(() => ({
                            topicChecklist: nextChecklist
                          }));
                        }}
                      />
                      {item.label}
                    </label>
                  </li>
                ))}
              </ul>
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
        .map((item) => ({
          meta: item,
          record: worksheetMap.get(item.id)
        }))
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
    const grouped = { high: [], medium: [], low: [], other: [] };
    for (const item of assignedList) {
      const priority = WORKSHEET_PRIORITY[item.meta.id] ?? 'other';
      grouped[priority].push(item);
    }
    return grouped;
  }, [assignedList]);

  return (
    <section className="rounded-3xl border border-white/80 bg-white p-5 shadow-lg shadow-sky-100">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Worksheets</h2>
        <p className="text-xs text-slate-500">
          {assignedList.length} assigned · {unassignedList.length} remaining
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {PRIORITY_ORDER.map((priorityKey) => {
          const list = assignedByPriority[priorityKey] ?? [];
          if (priorityKey !== 'other' && list.length === 0) {
            return null;
          }
          const heading =
            priorityKey === 'other' ? 'Additional Worksheets' : PRIORITY_LEVELS[priorityKey];
          return (
            <div key={priorityKey}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {heading}
              </p>
              {list.length === 0 ? (
                <p className="mt-1 text-xs text-slate-400">No work logged yet.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {list.map(({ meta, record }) => (
                    <li key={record.id ?? record.date} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{meta.label}</p>
                          <p className="text-xs text-slate-500">
                            {(() => {
                              const totalAttempted = Object.keys(record.questionStats || {}).length;
                              const correctCount = record.correct || 0;
                              const totalQuestions = meta.total || meta.key?.size || 0;
                              const remainingQuestions = totalQuestions - totalAttempted;
                              const percent = totalAttempted > 0 ? (correctCount / totalAttempted) * 100 : 0;
                              
                              let colorClass = 'text-slate-500';
                              if (percent >= 90) colorClass = 'text-emerald-600';
                              else if (percent >= 70) colorClass = 'text-amber-600';
                              else if (percent > 0) colorClass = 'text-rose-600';
                              
                              return (
                                <>
                                  <span className="font-medium">{totalAttempted} questions completed {formatDate(record.date)}</span>
                                  <br />
                                  <span className={colorClass}>
                                    {correctCount}/{totalAttempted} ({percent.toFixed(0)}%) correct
                                  </span>
                                  {remainingQuestions > 0 && (
                                    <>
                                      <br />
                                      <span className="text-slate-400">{remainingQuestions} questions remaining on worksheet</span>
                                    </>
                                  )}
                                </>
                              );
                            })()}
                          </p>
                        </div>
                      </div>
                      {record.incorrect?.length ? (
                        <details className="mt-2 text-xs text-slate-600">
                          <summary className="cursor-pointer font-semibold text-slate-500">
                            Missed ({record.incorrect.length})
                          </summary>
                          <ul className="mt-1 space-y-1">
                          {record.incorrect.map((item) => (
                            <li key={`${item.question}-${item.studentAnswer}`}>
                              Question {item.question}: {item.studentAnswer}
                              {' -> '}
                              {item.correctAnswer}
                            </li>
                          ))}
                          </ul>
                        </details>
                      ) : null}
                      {record.manualReview?.length ? (
                        <details className="mt-2 text-xs text-slate-600">
                          <summary className="cursor-pointer font-semibold text-slate-500">
                            Manual review ({record.manualReview.length})
                          </summary>
                          <ul className="mt-1 space-y-1">
                              {record.manualReview.map((item) => (
                                <li key={item.question}>
                                  Question {item.question}: {item.answers.join(', ')} (
                                  {item.reasons.join('; ')})
                                </li>
                              ))}
                          </ul>
                        </details>
                      ) : null}
                      {(() => {
                        // Calculate unassigned questions
                        const totalQuestions = meta.total || meta.key?.size || 0;
                        const attemptedQuestions = new Set();
                        
                        // Add questions from incorrect answers
                        if (record.incorrect) {
                          record.incorrect.forEach(item => attemptedQuestions.add(item.question));
                        }
                        
                        // Add questions from manual review
                        if (record.manualReview) {
                          record.manualReview.forEach(item => attemptedQuestions.add(item.question));
                        }
                        
                        // Add questions from correct answers (we need to calculate this from the record)
                        const questionStats = record.questionStats || {};
                        Object.keys(questionStats).forEach(q => {
                          const questionNum = parseInt(q);
                          if (!isNaN(questionNum)) {
                            attemptedQuestions.add(questionNum);
                          }
                        });
                        
                        const unassignedQuestions = [];
                        for (let i = 1; i <= totalQuestions; i++) {
                          if (!attemptedQuestions.has(i)) {
                            unassignedQuestions.push(i);
                          }
                        }
                        
                        return unassignedQuestions.length > 0 ? (
                          <details className="mt-2 text-xs text-slate-600">
                            <summary className="cursor-pointer font-semibold text-slate-500">
                              Unassigned ({unassignedQuestions.length})
                            </summary>
                            <div className="mt-1 text-slate-500">
                              Questions: {unassignedQuestions.join(', ')}
                            </div>
                          </details>
                        ) : null;
                      })()}
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`reviewed-${record.id ?? record.date}`}
                          checked={record.reviewedMisses || false}
                          onChange={(e) => {
                            onUpdate((student) => ({
                              worksheets: (student.worksheets || []).map(w => 
                                w.worksheetId === record.worksheetId 
                                  ? { ...w, reviewedMisses: e.target.checked }
                                  : w
                              )
                            }));
                          }}
                          className="size-3 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
                        />
                        <label htmlFor={`reviewed-${record.id ?? record.date}`} className="text-xs text-slate-600">
                          Reviewed misses in class?
                        </label>
                      </div>
                    </li>
                  ))}
                </ul>
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
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase text-slate-500">Composite</span>
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
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase text-slate-500">Reading/Writing</span>
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
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase text-slate-500">Composite</span>
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
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase text-slate-500">Reading/Writing</span>
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
  return (
    <section className="rounded-3xl border border-white/80 bg-white p-5 shadow-lg shadow-sky-100">
      <h2 className="text-sm font-semibold text-slate-800">Reference</h2>
      <div className="mt-3 space-y-4">
        {COURSE_GUIDELINES.map((section) => (
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
          onClick={() => {
            if (window.confirm(`Are you sure you want to permanently delete all records for ${student.name}? This action cannot be undone.`)) {
              onDeleteStudent();
            }
          }}
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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
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

      <main className="mx-auto mt-6 max-w-6xl px-4">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr_0.8fr]">
          <div className="space-y-4">
            <WorksheetsColumn student={student} worksheetsMeta={worksheetsMeta} onUpdate={onUpdate} />
          </div>
          <div className="space-y-4">
            <PracticeTestsColumn
              student={student}
              onAddCustomPractice={onAddCustomPractice}
              onUpdatePractice={onUpdatePractice}
              onUpdateCustomPractice={onUpdateCustomPractice}
              onDeleteCustomPractice={onDeleteCustomPractice}
            />
          </div>
          <div className="space-y-4">
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
