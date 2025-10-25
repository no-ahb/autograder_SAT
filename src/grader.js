const VALID_CHOICES = new Set(['A', 'B', 'C', 'D', 'E']);

function scanAnswerPairs(text) {
  const pairs = [];
  const source = String(text ?? '');
  const regex = /(\d{1,3})\s*(?:[\.\)\-:]*\s*)?([A-Za-z])/g;

  if (!source.trim()) {
    return pairs;
  }

  let match;
  while ((match = regex.exec(source)) !== null) {
    const [token, numberRaw, answerRaw] = match;
    const index = match.index;
    const end = index + token.length;
    const before = index > 0 ? source[index - 1] : '';
    const after = end < source.length ? source[end] : '';

    if (/[A-Za-z0-9]/.test(before)) {
      continue;
    }

    if (/[A-Za-z]/.test(after)) {
      continue;
    }

    const number = Number.parseInt(numberRaw, 10);
    if (Number.isNaN(number)) {
      continue;
    }

    pairs.push({
      question: number,
      answer: answerRaw.toUpperCase(),
      raw: token.trim()
    });
  }

  return pairs;
}

function ensureManual(manualMap, question) {
  if (!manualMap.has(question)) {
    manualMap.set(question, {
      question,
      answers: new Set(),
      reasons: new Set()
    });
  }

  return manualMap.get(question);
}

export function parseKeyText(text) {
  const keyMap = new Map();
  const entries = scanAnswerPairs(text);

  for (const entry of entries) {
    if (!VALID_CHOICES.has(entry.answer)) {
      continue;
    }

    if (!keyMap.has(entry.question)) {
      keyMap.set(entry.question, entry.answer);
    }
  }

  return keyMap;
}

export function parseStudentAnswers(text) {
  const answerMap = new Map();
  const manualMap = new Map();
  const entries = scanAnswerPairs(text);

  for (const entry of entries) {
    const { question, answer } = entry;

    if (!VALID_CHOICES.has(answer)) {
      const manualEntry = ensureManual(manualMap, question);
      manualEntry.reasons.add('Answer outside A-E');
      manualEntry.answers.add(answer);
      continue;
    }

    if (manualMap.has(question)) {
      manualMap.get(question).answers.add(answer);
      continue;
    }

    if (answerMap.has(question)) {
      const manualEntry = ensureManual(manualMap, question);
      manualEntry.reasons.add('Duplicate answers provided');
      manualEntry.answers.add(answerMap.get(question));
      manualEntry.answers.add(answer);
      answerMap.delete(question);
      continue;
    }

    answerMap.set(question, answer);
  }

  const manualReview = Array.from(manualMap.values()).map((item) => ({
    question: item.question,
    answers: Array.from(item.answers),
    reasons: Array.from(item.reasons)
  }));

  return {
    answers: answerMap,
    manualReview
  };
}

export function grade({ key, studentAnswers, skipMissing = false }) {
  if (!(key instanceof Map)) {
    throw new Error('grade expected key to be a Map<int, string>');
  }

  if (!studentAnswers || !(studentAnswers.answers instanceof Map)) {
    throw new Error('grade expected studentAnswers from parseStudentAnswers');
  }

  const answerMap = new Map(studentAnswers.answers);
  const manualMap = new Map(
    studentAnswers.manualReview.map((item) => [
      item.question,
      {
        question: item.question,
        answers: new Set(item.answers),
        reasons: new Set(item.reasons)
      }
    ])
  );

  for (const [question, answer] of answerMap.entries()) {
    if (!key.has(question)) {
      const manualEntry = ensureManual(manualMap, question);
      manualEntry.reasons.add('No answer key entry for this question');
      manualEntry.answers.add(answer);
      answerMap.delete(question);
    }
  }

  const manualQuestions = new Set(manualMap.keys());
  const incorrect = [];
  const missing = [];
  let correct = 0;

  for (const [question, correctAnswer] of key.entries()) {
    if (manualQuestions.has(question)) {
      continue;
    }

    const studentAnswer = answerMap.get(question);
    if (!studentAnswer) {
      missing.push(question);
      continue;
    }

    if (studentAnswer === correctAnswer) {
      correct += 1;
    } else {
      incorrect.push({
        question,
        correctAnswer,
        studentAnswer
      });
    }
  }

  const total = key.size;
  const missingCount = missing.length;
  const incorrectCount = incorrect.length;
  const denominator = skipMissing ? total - missingCount : total;
  const percent = denominator > 0 ? (correct / denominator) * 100 : 0;

  const manualReview = Array.from(manualMap.values())
    .map((item) => ({
      question: item.question,
      answers: Array.from(item.answers).sort(),
      reasons: Array.from(item.reasons)
    }))
    .sort((a, b) => a.question - b.question);

  return {
    total,
    correct,
    incorrect,
    incorrectCount,
    missing,
    missingCount,
    manualReview,
    manualReviewCount: manualReview.length,
    denominator,
    percent
  };
}
