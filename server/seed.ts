import { db } from "./db";
import { courses, sections } from "@shared/schema";
import coursesData from "../client/src/data/courses.json";
import sectionsData from "../client/src/data/sections.json";

async function seed() {
  console.log("Starting database seed...");

  try {
    console.log(`Inserting ${coursesData.length} courses...`);
    for (const course of coursesData) {
      await db.insert(courses).values(course).onConflictDoNothing();
    }

    console.log(`Inserting ${sectionsData.length} sections...`);
    for (const section of sectionsData) {
      await db.insert(sections).values(section).onConflictDoNothing();
    }

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed().then(() => process.exit(0));
