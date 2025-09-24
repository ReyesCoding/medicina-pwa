import { type Course, type Section, type StudentProgress } from "@shared/schema";
import { randomUUID } from "crypto";

// Storage interface for Medicine Curriculum Planner
export interface IStorage {
  getCourse(id: string): Promise<Course | undefined>;
  getAllCourses(): Promise<Course[]>;
  getSection(id: string): Promise<Section | undefined>;
  getSectionsByCourse(courseId: string): Promise<Section[]>;
  getStudentProgress(studentId: string): Promise<StudentProgress[]>;
  updateStudentProgress(progress: StudentProgress): Promise<StudentProgress>;
}

export class MemStorage implements IStorage {
  private courses: Map<string, Course>;
  private sections: Map<string, Section>;
  private progress: Map<string, StudentProgress>;

  constructor() {
    this.courses = new Map();
    this.sections = new Map();
    this.progress = new Map();
  }

  async getCourse(id: string): Promise<Course | undefined> {
    return this.courses.get(id);
  }

  async getAllCourses(): Promise<Course[]> {
    return Array.from(this.courses.values());
  }

  async getSection(id: string): Promise<Section | undefined> {
    return this.sections.get(id);
  }

  async getSectionsByCourse(courseId: string): Promise<Section[]> {
    return Array.from(this.sections.values()).filter(
      (section) => section.courseId === courseId
    );
  }

  async getStudentProgress(studentId: string): Promise<StudentProgress[]> {
    return Array.from(this.progress.values()).filter(
      (progress) => progress.studentId === studentId
    );
  }

  async updateStudentProgress(progressItem: StudentProgress): Promise<StudentProgress> {
    const id = progressItem.id || randomUUID();
    const progress: StudentProgress = { ...progressItem, id };
    this.progress.set(id, progress);
    return progress;
  }
}

export const storage = new MemStorage();
