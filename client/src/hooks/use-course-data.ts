import { useState, useEffect, useMemo } from 'react';
import provider from '@/data-access/provider';
import { Course, Section } from '@/types';

type TermInfo = {
  term: number;
  name: string;
  block?: string;
  credits: number;
  courseCount: number;
};

// Flatea sections si vienen como { courses: [{ id, sections: [] }, ...] }
function flattenSections(raw: any): Section[] {
  if (Array.isArray(raw)) return raw as Section[];

  if (raw && Array.isArray(raw.courses)) {
    return raw.courses.flatMap((c: any) =>
      (c.sections ?? []).map((s: any) => ({
        ...s,
        courseId: s.courseId ?? c.id, // asegura courseId
      }))
    );
  }

  return [];
}

// Term names (igual a los que ya tenías)
function getTermName(termNumber: number): string {
  const termNames: { [key: number]: string } = {
    1: 'PRIMER CUATRIMESTRE',
    2: 'SEGUNDO CUATRIMESTRE',
    3: 'TERCER CUATRIMESTRE',
    4: 'CUARTO CUATRIMESTRE',
    5: 'QUINTO CUATRIMESTRE',
    6: 'SEXTO CUATRIMESTRE',
    7: 'SÉPTIMO CUATRIMESTRE',
    8: 'OCTAVO CUATRIMESTRE',
    9: 'NOVENO CUATRIMESTRE',
    10: 'DÉCIMO CUATRIMESTRE',
    11: 'DÉCIMO PRIMER CUATRIMESTRE',
    12: 'DÉCIMO SEGUNDO CUATRIMESTRE',
    13: 'DÉCIMO TERCER CUATRIMESTRE',
    14: 'DÉCIMO CUARTO CUATRIMESTRE',
    15: 'DÉCIMO QUINTO CUATRIMESTRE',
    16: 'DÉCIMO SEXTO CUATRIMESTRE',
    17: 'DÉCIMO SÉPTIMO CUATRIMESTRE',
    18: 'DÉCIMO OCTAVO CUATRIMESTRE',
    19: 'PROYECTO DE GRADO',
  };
  return termNames[termNumber] || `CUATRIMESTRE ${termNumber}`;
}

export function useCourseData() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sectionsRaw, setSectionsRaw] = useState<any>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [c, s] = await Promise.all([
          provider.getCourses(),   // siempre array
          provider.getSections(),  // puede ser array o {courses:[...]}
        ]);

        if (cancelled) return;

        const coursesArr = Array.isArray(c) ? (c as Course[]) : [];
        const flatSections = flattenSections(s);

        setCourses(coursesArr);
        setSectionsRaw(s);
        setSections(flatSections);

        console.log('[useCourseData] loaded courses:', coursesArr.length);
        console.log('[useCourseData] loaded sections (flat):', flatSections.length);
      } catch (e) {
        console.error('Error loading course data:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const getCourseById = (id: string) => courses.find((course) => course.id === id);

  const getSectionsByCourse = (courseId: string) =>
    sections.filter((section) => (section as any).courseId === courseId);

  const getCoursesByTerm = (term: number) => courses.filter((course) => course.term === term);

  const getElectivesByType = (type: string) =>
    courses.filter((course) => (course as any).isElective && (course as any).electiveType === type);

  const getAllTerms = useMemo(() => {
    const termMap = new Map<number, TermInfo>();
    courses.forEach((course: any) => {
      if (!termMap.has(course.term)) {
        termMap.set(course.term, {
          term: course.term,
          name: getTermName(course.term),
          block: course.block,
          credits: 0,
          courseCount: 0,
        });
      }
      const info = termMap.get(course.term)!;
      info.credits += course.credits || 0;
      info.courseCount += 1;
    });
    return Array.from(termMap.values()).sort((a, b) => a.term - b.term);
  }, [courses]);

  return {
    // datos
    courses,
    sections,     // plano, con courseId asegurado
    sectionsRaw,  // por si necesitas el shape original en Admin
    loading,

    // helpers
    getCourseById,
    getSectionsByCourse,
    getCoursesByTerm,
    getElectivesByType,
    getAllTerms,
  };
}
