import { describe, expect, it } from 'vitest';
import { parseStudentAnswers } from '../grader.js';

describe('parseStudentAnswers', () => {
  it('parses multiple common SAT answer formats', () => {
    const samples = ['1) b', '2.D', '(3) c', '5- a', '27.)C', '32.c'];
    const parsed = parseStudentAnswers(samples.join('\n'));
    const expected = new Map([
      [1, 'B'],
      [2, 'D'],
      [3, 'C'],
      [5, 'A'],
      [27, 'C'],
      [32, 'C']
    ]);

    for (const [question, answer] of expected.entries()) {
      expect(parsed.answers.get(question)).toBe(answer);
    }
  });

  it('flags duplicate answers for manual review', () => {
    const parsed = parseStudentAnswers('1) a 1) b');
    expect(parsed.answers.has(1)).toBe(false);
    expect(parsed.manualReview).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          question: 1,
          reasons: expect.arrayContaining(['Duplicate answers provided'])
        })
      ])
    );
  });

  it('flags unexpected answer choices', () => {
    const parsed = parseStudentAnswers('4) g');
    expect(parsed.answers.has(4)).toBe(false);
    expect(parsed.manualReview).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          question: 4,
          answers: expect.arrayContaining(['G']),
          reasons: expect.arrayContaining(['Answer outside A-E'])
        })
      ])
    );
  });
});
