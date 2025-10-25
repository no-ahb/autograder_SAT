import { describe, expect, it } from 'vitest';
import { grade, parseKeyText, parseStudentAnswers } from '../grader.js';

const KEY_TEXT = `
1. A
2. B
3. C
4. D
5. E
`;

describe('grade', () => {
  it('grades responses with missing counted in denominator when skipMissing is false', () => {
    const key = parseKeyText(KEY_TEXT);
    const student = parseStudentAnswers('1) a 2) c 4) d');
    const result = grade({ key, studentAnswers: student, skipMissing: false });

    expect(result.total).toBe(5);
    expect(result.correct).toBe(2);
    expect(result.incorrectCount).toBe(1);
    expect(result.missingCount).toBe(2);
    expect(result.denominator).toBe(5);
  });

  it('drops missing answers from denominator when skipMissing is true', () => {
    const key = parseKeyText(KEY_TEXT);
    const student = parseStudentAnswers('1) a 2) c 4) d');
    const result = grade({ key, studentAnswers: student, skipMissing: true });

    expect(result.correct).toBe(2);
    expect(result.denominator).toBe(3);
    expect(result.percent).toBeCloseTo((2 / 3) * 100, 5);
  });

  it('sends duplicate entries to manual review', () => {
    const key = parseKeyText(KEY_TEXT);
    const student = parseStudentAnswers('2) b 2) c');
    const result = grade({ key, studentAnswers: student, skipMissing: false });

    expect(result.manualReviewCount).toBe(1);
    expect(result.manualReview[0].question).toBe(2);
    expect(result.manualReview[0].reasons).toContain('Duplicate answers provided');
  });

  it('sends non A-E answers to manual review', () => {
    const key = parseKeyText(KEY_TEXT);
    const student = parseStudentAnswers('3) z');
    const result = grade({ key, studentAnswers: student, skipMissing: false });

    expect(result.manualReviewCount).toBe(1);
    expect(result.manualReview[0].question).toBe(3);
    expect(result.manualReview[0].reasons).toContain('Answer outside A-E');
  });
});
