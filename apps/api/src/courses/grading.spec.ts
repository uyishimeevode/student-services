import { gpa, letterGrade } from './grading.js';

describe('grading', () => {
  it('maps scores to letter grades at the band edges', () => {
    expect(letterGrade(100)).toBe('A');
    expect(letterGrade(80)).toBe('A');
    expect(letterGrade(79.5)).toBe('B');
    expect(letterGrade(60)).toBe('C');
    expect(letterGrade(50)).toBe('D');
    expect(letterGrade(49.9)).toBe('F');
    expect(letterGrade(0)).toBe('F');
  });

  it('weights the GPA by credits and ignores ungraded courses', () => {
    expect(
      gpa([
        { grade: 'A', credits: 4 },
        { grade: 'C', credits: 2 },
        { grade: null, credits: 3 },
      ]),
    ).toBe(3.33);
    expect(gpa([])).toBeNull();
  });
});
