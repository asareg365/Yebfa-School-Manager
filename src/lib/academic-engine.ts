/**
 * @fileOverview Strategic Academic Engine for Quantitative Report Generation.
 * Handles grading, ranking, attendance aggregation, and institutional statistics.
 */

export interface GradingRule {
  grade: string;
  min: number;
  max: number;
  remark: string;
}

export const DEFAULT_GRADING: GradingRule[] = [
  { grade: "A", min: 80, max: 100, remark: "Excellent" },
  { grade: "B+", min: 75, max: 79, remark: "Very Good" },
  { grade: "B", min: 70, max: 74, remark: "Good" },
  { grade: "C+", min: 65, max: 69, remark: "Credit" },
  { grade: "C", min: 60, max: 64, remark: "Satisfactory" },
  { grade: "D", min: 50, max: 59, remark: "Pass" },
  { grade: "E", min: 0, max: 49, remark: "Incomplete/Fail" },
];

/**
 * Maps a numerical score to a letter grade and remark.
 */
export function calculateGrade(score: number, rules: GradingRule[] = DEFAULT_GRADING) {
  const rule = rules.find(r => score >= r.min && score <= r.max);
  return rule || { grade: "N/A", remark: "N/A" };
}

/**
 * Computes ordinal positions (1st, 2nd, 3rd) handling ties correctly.
 */
export function calculatePositions(studentAverages: { studentId: string; average: number }[]) {
  const sorted = [...studentAverages].sort((a, b) => b.average - a.average);
  const positions: Record<string, string> = {};
  
  let currentRank = 0;
  let prevAvg = -1;

  sorted.forEach((item, index) => {
    if (item.average !== prevAvg) {
      currentRank = index + 1;
    }
    
    const suffix = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    
    positions[item.studentId] = suffix(currentRank);
    prevAvg = item.average;
  });

  return positions;
}

/**
 * Aggregates attendance metrics for a specific student.
 */
export function calculateAttendanceSummary(records: any[]) {
  const total = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const absent = total - present;
  const late = records.filter(r => r.isLate).length;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 100;

  return { total, present, absent, late, percentage };
}

/**
 * Calculates subject-wide statistics for class comparison.
 */
export function calculateSubjectStats(allRecords: any[], subjectId: string) {
  const subjectRecords = allRecords.filter(r => r.subjectId === subjectId);
  if (subjectRecords.length === 0) return null;

  const scores = subjectRecords.map(r => r.totalScore);
  const highest = Math.max(...scores);
  const lowest = Math.min(...scores);
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  const passed = subjectRecords.filter(r => r.totalScore >= 50).length;
  const failed = subjectRecords.length - passed;

  return { highest, lowest, average, passed, failed };
}

/**
 * Deterministic promotion logic based on academic performance.
 */
export function determinePromotion(average: number, failedCount: number) {
  if (average >= 55 && failedCount === 0) return "Promoted";
  if (average >= 50 && failedCount <= 2) return "Promoted on Trial";
  return "Repeat";
}
