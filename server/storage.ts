import { type Course, type Section, type StudentProgress, courses, sections } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getCourse(id: string): Promise<Course | undefined>;
  getAllCourses(): Promise<Course[]>;
  getSection(id: string): Promise<Section | undefined>;
  getSectionsByCourse(courseId: string): Promise<Section[]>;
  getAllSections(): Promise<Section[]>;
  getStudentProgress(studentId: string): Promise<StudentProgress[]>;
  updateStudentProgress(progress: StudentProgress): Promise<StudentProgress>;
  createCourse(course: Course): Promise<Course>;
  updateCourse(id: string, course: Partial<Course>): Promise<Course | undefined>;
  deleteCourse(id: string): Promise<boolean>;
  createSection(section: Omit<Section, "id">): Promise<Section>;
  updateSection(id: string, section: Partial<Section>): Promise<Section | undefined>;
  deleteSection(id: string): Promise<boolean>;
}

export class DbStorage implements IStorage {
  async getCourse(id: string): Promise<Course | undefined> {
    const result = await db.select().from(courses).where(eq(courses.id, id));
    return result[0];
  }

  async getAllCourses(): Promise<Course[]> {
    return await db.select().from(courses);
  }

  async getSection(id: string): Promise<Section | undefined> {
    const result = await db.select().from(sections).where(eq(sections.id, id));
    return result[0];
  }

  async getSectionsByCourse(courseId: string): Promise<Section[]> {
    return await db.select().from(sections).where(eq(sections.courseId, courseId));
  }

  async getAllSections(): Promise<Section[]> {
    return await db.select().from(sections);
  }

  async getStudentProgress(_studentId: string): Promise<StudentProgress[]> {
    return [];
  }

  async updateStudentProgress(progressItem: StudentProgress): Promise<StudentProgress> {
    return progressItem;
  }

  async createCourse(course: Course): Promise<Course> {
    const result = await db.insert(courses).values(course).returning();
    return result[0];
  }

  async updateCourse(id: string, courseUpdate: Partial<Course>): Promise<Course | undefined> {
    const result = await db
      .update(courses)
      .set(courseUpdate)
      .where(eq(courses.id, id))
      .returning();
    return result[0];
  }

  async deleteCourse(id: string): Promise<boolean> {
    const result = await db.delete(courses).where(eq(courses.id, id)).returning();
    return result.length > 0;
  }

  async createSection(section: Omit<Section, "id">): Promise<Section> {
    const result = await db.insert(sections).values(section).returning();
    return result[0];
  }

  async updateSection(id: string, sectionUpdate: Partial<Section>): Promise<Section | undefined> {
    const result = await db
      .update(sections)
      .set(sectionUpdate)
      .where(eq(sections.id, id))
      .returning();
    return result[0];
  }

  async deleteSection(id: string): Promise<boolean> {
    const result = await db.delete(sections).where(eq(sections.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DbStorage();
