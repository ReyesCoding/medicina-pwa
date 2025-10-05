import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCourseSchema, insertSectionSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/courses", async (_req, res) => {
    try {
      const courses = await storage.getAllCourses();
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ error: "Failed to fetch courses" });
    }
  });

  app.get("/api/courses/:id", async (req, res) => {
    try {
      const course = await storage.getCourse(req.params.id);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      console.error("Error fetching course:", error);
      res.status(500).json({ error: "Failed to fetch course" });
    }
  });

  app.get("/api/sections", async (_req, res) => {
    try {
      const sections = await storage.getAllSections();
      res.json(sections);
    } catch (error) {
      console.error("Error fetching sections:", error);
      res.status(500).json({ error: "Failed to fetch sections" });
    }
  });

  app.get("/api/sections/course/:courseId", async (req, res) => {
    try {
      const sections = await storage.getSectionsByCourse(req.params.courseId);
      res.json(sections);
    } catch (error) {
      console.error("Error fetching sections:", error);
      res.status(500).json({ error: "Failed to fetch sections" });
    }
  });

  app.post("/api/admin/courses", async (req, res) => {
    try {
      const validatedData = insertCourseSchema.parse(req.body);
      const courseData = {
        ...validatedData,
        prerequisites: validatedData.prerequisites ?? [],
        corequisites: validatedData.corequisites ?? [],
        isElective: validatedData.isElective ?? false,
      };
      const course = await storage.createCourse(courseData as any);
      res.status(201).json(course);
    } catch (error: any) {
      console.error("Error creating course:", error);
      res.status(400).json({ error: error.message || "Failed to create course" });
    }
  });

  app.put("/api/admin/courses/:id", async (req, res) => {
    try {
      const validated = insertCourseSchema.partial().parse(req.body);
      const updateData: any = {};
      
      if (validated.name !== undefined) updateData.name = validated.name;
      if (validated.credits !== undefined) updateData.credits = validated.credits;
      if (validated.theoreticalHours !== undefined) updateData.theoreticalHours = validated.theoreticalHours;
      if (validated.practicalHours !== undefined) updateData.practicalHours = validated.practicalHours;
      if (validated.term !== undefined) updateData.term = validated.term;
      if (validated.block !== undefined) updateData.block = validated.block;
      if (validated.prerequisites !== undefined) updateData.prerequisites = validated.prerequisites ?? [];
      if (validated.corequisites !== undefined) updateData.corequisites = validated.corequisites ?? [];
      if (validated.isElective !== undefined) updateData.isElective = validated.isElective;
      if (validated.electiveType !== undefined) updateData.electiveType = validated.electiveType;
      if (validated.description !== undefined) updateData.description = validated.description;
      
      const course = await storage.updateCourse(req.params.id, updateData);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      res.json(course);
    } catch (error: any) {
      console.error("Error updating course:", error);
      res.status(400).json({ error: error.message || "Failed to update course" });
    }
  });

  app.delete("/api/admin/courses/:id", async (req, res) => {
    try {
      const success = await storage.deleteCourse(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Course not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ error: "Failed to delete course" });
    }
  });

  app.post("/api/admin/sections", async (req, res) => {
    try {
      const validatedData = insertSectionSchema.parse(req.body);
      const sectionData = {
        ...validatedData,
        maxCapacity: validatedData.maxCapacity ?? 30,
        currentEnrollment: validatedData.currentEnrollment ?? 0,
      };
      const section = await storage.createSection(sectionData as any);
      res.status(201).json(section);
    } catch (error: any) {
      console.error("Error creating section:", error);
      res.status(400).json({ error: error.message || "Failed to create section" });
    }
  });

  app.put("/api/admin/sections/:id", async (req, res) => {
    try {
      const validated = insertSectionSchema.partial().parse(req.body);
      const updateData: any = {};
      
      if (validated.courseId !== undefined) updateData.courseId = validated.courseId;
      if (validated.sectionNumber !== undefined) updateData.sectionNumber = validated.sectionNumber;
      if (validated.instructor !== undefined) updateData.instructor = validated.instructor;
      if (validated.room !== undefined) updateData.room = validated.room;
      if (validated.crn !== undefined) updateData.crn = validated.crn;
      if (validated.schedule !== undefined) updateData.schedule = validated.schedule;
      if (validated.maxCapacity !== undefined) updateData.maxCapacity = validated.maxCapacity;
      if (validated.currentEnrollment !== undefined) updateData.currentEnrollment = validated.currentEnrollment;
      
      const section = await storage.updateSection(req.params.id, updateData);
      if (!section) {
        return res.status(404).json({ error: "Section not found" });
      }
      res.json(section);
    } catch (error: any) {
      console.error("Error updating section:", error);
      res.status(400).json({ error: error.message || "Failed to update section" });
    }
  });

  app.delete("/api/admin/sections/:id", async (req, res) => {
    try {
      const success = await storage.deleteSection(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Section not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting section:", error);
      res.status(500).json({ error: "Failed to delete section" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
