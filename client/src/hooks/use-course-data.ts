import { useState, useEffect } from 'react';
import { Course, Section } from '@/types';
import coursesData from '@/data/courses.json';
import sectionsData from '@/data/sections.json';

export function useCourseData() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading from JSON files
    const loadData = async () => {
      try {
        // In a real app, these would be API calls
        setCourses(coursesData as Course[]);
        setSections(sectionsData as Section[]);
      } catch (error) {
        console.error('Error loading course data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getCourseById = (id: string) => {
    return courses.find(course => course.id === id);
  };

  const getSectionsByCourse = (courseId: string) => {
    return sections.filter(section => section.courseId === courseId);
  };

  const getCoursesByTerm = (term: number) => {
    return courses.filter(course => course.term === term);
  };

  const getElectivesByType = (type: string) => {
    return courses.filter(course => course.isElective && course.electiveType === type);
  };

  const getAllTerms = () => {
    const termMap = new Map();
    courses.forEach(course => {
      if (!termMap.has(course.term)) {
        termMap.set(course.term, {
          term: course.term,
          name: `Term ${course.term}`,
          block: course.block,
          credits: 0,
          courseCount: 0
        });
      }
      const termInfo = termMap.get(course.term);
      termInfo.credits += course.credits;
      termInfo.courseCount += 1;
    });
    return Array.from(termMap.values()).sort((a, b) => a.term - b.term);
  };

  return {
    courses,
    sections,
    loading,
    getCourseById,
    getSectionsByCourse,
    getCoursesByTerm,
    getElectivesByType,
    getAllTerms
  };
}
