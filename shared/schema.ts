import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Course schema
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey(), // Course code like "ESP-095"
  name: text("name").notNull(),
  credits: integer("credits").notNull(),
  theoreticalHours: integer("theoretical_hours").notNull(),
  practicalHours: integer("practical_hours").notNull(),
  term: integer("term").notNull(),
  block: text("block").notNull(), // PREMÉDICA, CIENCIAS BÁSICAS, etc.
  prerequisites: jsonb("prerequisites").$type<string[]>().default([]),
  corequisites: jsonb("corequisites").$type<string[]>().default([]),
  isElective: boolean("is_elective").default(false),
  electiveType: text("elective_type"), // GEN, BASICAS, CLINICAS
  description: text("description"),
});

export const sections = pgTable("sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  sectionNumber: text("section_number").notNull(),
  instructor: text("instructor").notNull(),
  room: text("room").notNull(),
  crn: text("crn").notNull().unique(),
  schedule: jsonb("schedule").$type<{day: string, startTime: string, endTime: string}[]>().notNull(),
  maxCapacity: integer("max_capacity").default(30),
  currentEnrollment: integer("current_enrollment").default(0),
});

export const studentProgress = pgTable("student_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  status: text("status").notNull(), // "passed", "in_progress", "planned"
  grade: text("grade"),
  completedAt: text("completed_at"),
  sectionId: varchar("section_id").references(() => sections.id),
});

export const coursePlans = pgTable("course_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  plannedTerm: integer("planned_term").notNull(),
  sectionId: varchar("section_id").references(() => sections.id),
  priority: integer("priority").default(1),
});

// Insert schemas
export const insertCourseSchema = createInsertSchema(courses);
export const insertSectionSchema = createInsertSchema(sections);
export const insertStudentProgressSchema = createInsertSchema(studentProgress);
export const insertCoursePlanSchema = createInsertSchema(coursePlans);

// Types
export type Course = typeof courses.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type StudentProgress = typeof studentProgress.$inferSelect;
export type CoursePlan = typeof coursePlans.$inferSelect;

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type InsertSection = z.infer<typeof insertSectionSchema>;
export type InsertStudentProgress = z.infer<typeof insertStudentProgressSchema>;
export type InsertCoursePlan = z.infer<typeof insertCoursePlanSchema>;
