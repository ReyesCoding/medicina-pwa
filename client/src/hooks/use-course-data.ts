import { useState, useEffect } from 'react';
import { Course, Section } from '@/types';

export function useCourseData() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [coursesRes, sectionsRes] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}data/courses.json`),
          fetch(`${import.meta.env.BASE_URL}data/sections.json`)
        ]);

        if (!coursesRes.ok || !sectionsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const coursesData = await coursesRes.json();
        const sectionsData = await sectionsRes.json();

        setCourses(coursesData);
        setSections(sectionsData);
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

  const getTermName = (termNumber: number): string => {
    const termNames: { [key: number]: string } = {
      1: "PRIMER CUATRIMESTRE",
      2: "SEGUNDO CUATRIMESTRE", 
      3: "TERCER CUATRIMESTRE",
      4: "CUARTO CUATRIMESTRE",
      5: "QUINTO CUATRIMESTRE",
      6: "SEXTO CUATRIMESTRE",
      7: "SÉPTIMO CUATRIMESTRE",
      8: "OCTAVO CUATRIMESTRE",
      9: "NOVENO CUATRIMESTRE",
      10: "DÉCIMO CUATRIMESTRE",
      11: "DÉCIMO PRIMER CUATRIMESTRE",
      12: "DÉCIMO SEGUNDO CUATRIMESTRE",
      13: "DÉCIMO TERCER CUATRIMESTRE",
      14: "DÉCIMO CUARTO CUATRIMESTRE",
      15: "DÉCIMO QUINTO CUATRIMESTRE",
      16: "DÉCIMO SEXTO CUATRIMESTRE",
      17: "DÉCIMO SÉPTIMO CUATRIMESTRE",
      18: "DÉCIMO OCTAVO CUATRIMESTRE",
      19: "PROYECTO DE GRADO"
    };
    return termNames[termNumber] || `CUATRIMESTRE ${termNumber}`;
  };

  const getAllTerms = () => {
    const termMap = new Map();
    courses.forEach(course => {
      if (!termMap.has(course.term)) {
        termMap.set(course.term, {
          term: course.term,
          name: getTermName(course.term),
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
