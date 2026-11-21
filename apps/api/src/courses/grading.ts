/** Letter grade bands on a 0 to 100 score. */
export const GRADE_BANDS: readonly {
  min: number;
  grade: string;
  points: number;
}[] = [
  { min: 80, grade: 'A', points: 4 },
  { min: 70, grade: 'B', points: 3 },
  { min: 60, grade: 'C', points: 2 },
  { min: 50, grade: 'D', points: 1 },
  { min: 0, grade: 'F', points: 0 },
];

export const PASS_MARK = 50;

export function letterGrade(score: number): string {
  return GRADE_BANDS.find((band) => score >= band.min)!.grade;
}

export function gradePoints(grade: string): number {
  return GRADE_BANDS.find((band) => band.grade === grade)?.points ?? 0;
}

/** Credit-weighted grade point average on a 4-point scale, rounded to two decimals. */
export function gpa(
  results: { grade: string | null; credits: number }[],
): number | null {
  const graded = results.filter((r) => r.grade);
  const credits = graded.reduce((sum, r) => sum + r.credits, 0);
  if (credits === 0) return null;
  const points = graded.reduce(
    (sum, r) => sum + gradePoints(r.grade!) * r.credits,
    0,
  );
  return Math.round((points / credits) * 100) / 100;
}
