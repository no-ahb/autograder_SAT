const VALID_CHOICES = new Set(['A', 'B', 'C', 'D', 'E']);

function scanAnswerPairs(text) {
  const pairs = [];
  const source = String(text ?? '');

  if (!source.trim()) {
    return pairs;
  }

  // Comprehensive pattern that handles many formats:
  // - Number directly followed by letter: 6d, 7b
  // - Number with separator: 1) a, 1. A, 1-A, 1]a, 1...A, 1   A, etc.
  // Pattern matches: (\d{1,3}) followed by optional separator, then any letter
  // Separator can be: : . ) ] - – — . (ellipsis) or whitespace
  // We capture any letter (A-Za-z) to allow non-A-E answers to be detected for manual review
  
  // Pattern handles both cases:
  // 1. Number directly followed by letter (e.g., 6d, 7b)
  // 2. Number with separator(s) followed by letter (e.g., 1) a, 1. A, 1-A, 1   A)
  // The separator group is optional and can be punctuation or whitespace
  const pattern = /(\d{1,3})(?:\s*[:.)\]\-–—\.]{1,3}\s*|\s+)([A-Za-z])(?=[\s\n\r]|$|[\s).,;:\-–—])|(\d{1,3})\s*([A-Za-z])(?=[\s\n\r]|$)/g;
  
  const matches = Array.from(source.matchAll(pattern));
  
  // Collect all matches (don't deduplicate here - let parseStudentAnswers handle duplicates)
  matches.forEach((match) => {
    // Pattern has two alternatives:
    // 1. With separator: match[1] = number, match[2] = answer
    // 2. Without separator: match[3] = number, match[4] = answer
    const numberRaw = match[1] || match[3];
    const answerRaw = match[2] || match[4];
    
    if (!numberRaw || !answerRaw) {
      return;
    }
    
    const number = Number.parseInt(numberRaw, 10);
    const answer = answerRaw.toUpperCase();
    
    if (Number.isNaN(number)) {
      return;
    }
    
    pairs.push({
      question: number,
      answer,
      raw: match[0].trim(),
      needsManualReview: false
    });
  });
  
  // Sort by question number
  pairs.sort((a, b) => a.question - b.question);
  
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
    const { question, answer, needsManualReview } = entry;

    // If this entry needs manual review (blank, ?, x, etc.)
    if (needsManualReview) {
      const manualEntry = ensureManual(manualMap, question);
      manualEntry.reasons.add('Non-standard answer format');
      manualEntry.answers.add(answer);
      continue;
    }

    // If answer is not a valid choice
    if (!VALID_CHOICES.has(answer)) {
      const manualEntry = ensureManual(manualMap, question);
      manualEntry.reasons.add('Answer outside A-E');
      manualEntry.answers.add(answer);
      continue;
    }

    // If we already have this question in manual review
    if (manualMap.has(question)) {
      manualMap.get(question).answers.add(answer);
      continue;
    }

    // If we already have this question answered
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

  const attemptedQuestions = Array.from(
    new Set([
      ...answerMap.keys(),
      ...manualReview.map((item) => item.question)
    ])
  ).sort((a, b) => a - b);

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
    percent,
    attemptedQuestions
  };
}
