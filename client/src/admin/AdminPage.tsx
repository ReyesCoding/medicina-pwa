import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import provider from '@/data-access/provider';

import CourseToolbar from '@/admin/components/CourseToolbar';
import CourseList from '@/admin/components/CourseList';
import EditCourseDialog from '@/admin/components/EditCourseDialog';
import { buildPrereqEdges, hasCycle } from '@/admin/validators/prereq-graph';

type Course = {
  id: string;
  name: string;
  credits: number;
  theoreticalHours: number;
  practicalHours: number;
  isElective?: boolean;
  electiveType?: 'general' | 'professional';
  term: number;
  area?: string;
  prerequisites?: string[];
  corequisites?: string[];
};

export default function AdminPage() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [sections, setSections] = useState<any | null>(null);

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<{ open: boolean; target: Course | null }>({
    open: false,
    target: null,
  });
  

  // Carga datasets
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cJson, sJson] = await Promise.all([
          provider.getCourses(),
          provider.getSections(),
        ]);
        if (!cancelled) {
          setCourses(cJson as Course[]);
          setSections(sJson);
        }
      } catch (e) {
        console.error('Error loading datasets', e);
        if (!cancelled) {
          setCourses([]);
          setSections([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    const totalCourses = courses?.length ?? 0;
    const totalSections = Array.isArray(sections)
      ? sections.length
      : (sections && sections.courses
          ? sections.courses.reduce((acc: number, c: any) => acc + (c.sections?.length || 0), 0)
          : 0);
    return { totalCourses, totalSections };
  }, [courses, sections]);

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !courses) return courses ?? [];
    return courses.filter(c =>
      c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [search, courses]);

  // Helpers para leer/escribir secciones por curso desde "sections" en memoria
const getCourseSections = (courseId: string): any[] => {
  if (!sections) return [];
  // Caso A: estructura { courses: [{ id, sections: [...] }, ...] }
  if (sections.courses && Array.isArray(sections.courses)) {
    const entry = sections.courses.find((c: any) => c.id === courseId);
    return entry?.sections ? [...entry.sections] : [];
  }
  // Caso B: array plano con courseId
  if (Array.isArray(sections)) {
    return sections.filter((s: any) => s.courseId === courseId);
  }
  return [];
};

const setCourseSections = async (courseId: string, nextList: any[]) => {
  if (!sections) return;

  // Normalizamos copiando
  let next = Array.isArray(sections) ? [...sections] : { ...(sections as any) };

  // Caso A: { courses: [...] }
  if (next.courses && Array.isArray(next.courses)) {
    const idx = next.courses.findIndex((c: any) => c.id === courseId);
    if (idx >= 0) {
      next.courses[idx] = { ...next.courses[idx], sections: nextList };
    } else {
      next.courses.push({ id: courseId, sections: nextList });
    }
  } else if (Array.isArray(next)) {
    // Caso B: array plano con courseId
    next = next.filter((s: any) => s.courseId !== courseId);
    next.push(...nextList.map((s) => ({ ...s, courseId })));
  }

  setSections(next);
  await provider.saveSections(next);
};
  // ===== CRUD =====
  const handleAddCourse = async () => {
    if (!courses) return;
    const id = prompt('ID de la materia (ej. MED101):');
    if (!id) return;
    if (courses.some(c => c.id === id)) return alert('ID ya existe');

    const name = prompt('Nombre de la materia:') || 'Nueva materia';
    const credits = Number(prompt('Créditos:', '4') || 0);
    const theoreticalHours = Number(prompt('Horas teóricas:', '2') || 0);
    const practicalHours = Number(prompt('Horas prácticas:', '2') || 0);
    const term = Number(prompt('Trimestre/Semestre (número):', '1') || 1);

    const next: Course[] = [
      ...courses,
      { id, name, credits, theoreticalHours, practicalHours, term }
    ];
    setCourses(next);
    await provider.saveCourses(next);
    alert('✅ Curso agregado (recuerda Exportar JSON para persistir en el repo)');
  };

  const handleDeleteCourse = async (id: string) => {
    if (!courses) return;
    if (!confirm(`¿Eliminar curso ${id}?`)) return;
    const next = courses.filter(c => c.id !== id);
    setCourses(next);
    await provider.saveCourses(next);
    alert('🗑️ Curso eliminado (recuerda Exportar JSON para persistir en el repo)');
  };

  // ===== Importar/Exportar =====
  const handleImport = (type: 'courses' | 'sections') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        if (type === 'courses') {
          setCourses(json);
          await provider.saveCourses(json);
        } else {
          setSections(json);
          await provider.saveSections(json);
        }
        alert(`✅ Importado ${type}. Recuerda Exportar para guardar una copia.`);
      } catch (e) {
        alert(`❌ Error importando ${type}: ${String(e)}`);
      }
    };
    input.click();
  };

  const handleExport = (type: 'courses' | 'sections') => {
    const data = type === 'courses' ? courses : sections;
    if (!data) {
      alert(`No hay datos de ${type} para exportar.`);
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `${type}.json`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Admin — Medicina PWA</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Editor local de datasets (courses.json / sections.json). Usa Importar/Exportar para trabajar sin backend.
      </p>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Estado de datasets</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded p-3">
            <div className="text-sm text-muted-foreground">Total de cursos</div>
            <div className="text-xl font-bold">{stats.totalCourses}</div>
          </div>
          <div className="border rounded p-3">
            <div className="text-sm text-muted-foreground">Total de secciones</div>
            <div className="text-xl font-bold">{stats.totalSections}</div>
          </div>
          <div className="border rounded p-3">
            <div className="text-sm text-muted-foreground">Modo</div>
            <div className="text-xl font-bold">Front-only</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Herramientas</CardTitle>
        </CardHeader>
        <CardContent>
          <CourseToolbar
            search={search}
            onSearchChange={setSearch}
            onAdd={handleAddCourse}
            onImportCourses={() => handleImport('courses')}
            onImportSections={() => handleImport('sections')}
            onExportCourses={() => handleExport('courses')}
            onExportSections={() => handleExport('sections')}
          />
          <Separator className="my-4" />
          <CourseList
            courses={(filteredCourses || []).slice(0, 200)}  // subo a 200 para que veas más
            onEdit={(c) => setEditing({ open: true, target: c })}
            onDelete={handleDeleteCourse}
          />
          {filteredCourses && filteredCourses.length > 200 && (
            <div className="text-xs text-muted-foreground mt-2">
              Mostrando 200 de {filteredCourses.length} cursos… (paginación vendrá luego)
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de edición de curso (datos básicos + prereq/coreq con validación de ciclos) */}
      {editing.target && (
        <EditCourseDialog
          open={editing.open}
          onClose={() => setEditing({ open: false, target: null })}
          course={editing.target}
          allCourses={courses ?? []}
          onSave={(updated) => {
            if (!courses) return;
            const next = courses.map(cc => cc.id === editing.target!.id ? updated : cc);

            // Validación de ciclos en prereqs
            const edges = buildPrereqEdges(next);
            if (hasCycle(edges)) {
              alert('❌ La edición introduce un ciclo de prerequisitos. Revísalos.');
              return;
            }

            setCourses(next);
            provider.saveCourses(next);
            setEditing({ open: false, target: null });
            alert('✏️ Curso actualizado (recuerda Exportar JSON para persistir en el repo)');
          }}
            getSectionsForCourse={getCourseSections}
            setSectionsForCourse={setCourseSections}

        />
      )}

      <div className="mt-6 text-sm text-muted-foreground">
        Próximo: CRUD de secciones + edición integrada (tab “Secciones”) y verificador de choques de horario.
      </div>
    </div>
  );
}
