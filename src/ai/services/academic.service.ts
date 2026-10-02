import { BaseAIService } from './base.service';

export class AcademicService extends BaseAIService {
  async getStudentPerformance(tenantId: string) {
    return this.getTenantData("exam_records", tenantId);
  }

  async getAttendance(tenantId: string, studentId?: string) {
    const data = await this.getTenantData("attendance", tenantId);
    return studentId ? data.filter((d: any) => d.studentId === studentId) : data;
  }

  async getSubjectRegistry(tenantId: string) {
    return this.getTenantData("subjects", tenantId);
  }

  async getAssignments(tenantId: string, classId?: string, termId?: string) {
    const data = await this.getTenantData("teacher_assignments", tenantId);
    let filtered = data;
    if (classId) filtered = filtered.filter((d: any) => d.classId === classId);
    if (termId) filtered = filtered.filter((d: any) => d.termId === termId);
    return filtered;
  }
}

export const academicService = new AcademicService();
