import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { hasScheduleConflict } from '@/utils/sections-processor';

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

type Props = {
  open: boolean;
  onClose: () => void;
  course: Course;
  allCourses: Course[];
  onSave: (updated: Course) => void;
  getSectionsForCourse: (courseId: string) => any[];
  setSectionsForCourse: (courseId: string, nextList: any[]) => Promise<void>;
};

export default function EditCourseDialog({
  open,
  onClose,
  course,
  allCourses,
  onSave,
  getSectionsForCourse,
  setSectionsForCourse,
}: Props) {
  // --------- Datos básicos (curso) ----------
  const [form, setForm] = useState<Course>(course);
  const [filter, setFilter] = useState(''); // búsqueda para prereq/coreq

  useEffect(() => setForm(course), [course]);

  const courseIds = useMemo(() => new Set(allCourses.map(c => c.id)), [allCourses]);

  const filteredList = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return allCourses
      .filter(c => c.id !== form.id)
      .filter(c => c.id.toLowerCase().includes(f) || c.name.toLowerCase().includes(f));
  }, [allCourses, filter, form.id]);

  const toggleInList = (key: 'prerequisites' | 'corequisites', id: string) => {
    const list = new Set(form[key] ?? []);
    if (list.has(id)) list.delete(id); else list.add(id);
    setForm({ ...form, [key]: Array.from(list) });
  };

  const handleNumber = (k: keyof Course) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value || 0);
    setForm({ ...form, [k]: isNaN(v) ? 0 : v });
  };

  const handleText = (k: keyof Course) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [k]: e.target.value });
  };

  const validate = (): string | null => {
    if (!form.id || !/^[A-Za-z]{3}\d{3}$/.test(form.id)) return 'ID inválido (ej: MED101)';
    if (!form.name) return 'Nombre requerido';
    if (form.credits < 0) return 'Créditos no pueden ser negativos';
    if (!Number.isInteger(form.term) || form.term <= 0) return 'Term debe ser un entero positivo';
    for (const id of (form.prerequisites ?? [])) if (!courseIds.has(id)) return `Prereq no existe: ${id}`;
    for (const id of (form.corequisites ?? [])) if (!courseIds.has(id)) return `Coreq no existe: ${id}`;
    if ((form.prerequisites ?? []).includes(form.id)) return 'Un curso no puede ser prerequisito de sí mismo';
    if ((form.corequisites ?? []).includes(form.id)) return 'Un curso no puede ser correquisito de sí mismo';
    return null;
  };

  const handleSave = () => {
    const err = validate();
    if (err) {
      setBanner({ type: 'error', text: err });
      return;
    }
    onSave({
      ...form,
      prerequisites: Array.from(new Set(form.prerequisites ?? [])),
      corequisites: Array.from(new Set(form.corequisites ?? [])),
    });
    setBanner({ type: 'success', text: 'Datos del curso guardados.' });
  };

  // --------- Secciones (estado local + UI sin alerts) ----------
  const [sections, setSections] = useState<any[]>([]);
  const [secFilter, setSecFilter] = useState(''); // búsqueda para secciones

  // mini-UI para crear sección
  const [newSec, setNewSec] = useState<{ crn: string; room: string }>({ crn: '', room: '' });

  // mini-UI para añadir bloque
  const [newBlock, setNewBlock] = useState<{ [crn: string]: { day: string; start: string; end: string } }>({});

  // banner inline
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const list = getSectionsForCourse(course.id) || [];
    setSections(Array.isArray(list) ? list : []);
    setBanner(null);
  }, [course.id, getSectionsForCourse]);

  const filteredSections = useMemo(() => {
    const q = secFilter.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter((s) =>
      (s.crn?.toLowerCase?.() || '').includes(q) ||
      (s.room?.toLowerCase?.() || '').includes(q)
    );
  }, [sections, secFilter]);

  const addSection = () => {
    const crn = newSec.crn.trim();
    if (!crn) return setBanner({ type: 'error', text: 'CRN requerido.' });
    if (sections.some(s => s.crn === crn)) {
      return setBanner({ type: 'error', text: 'CRN ya existe.' });
    }
    const room = newSec.room.trim();
    const newEntry = { crn, room, closed: false, schedule: [] as Array<{ day: string; start: string; end: string }> };
    setSections(prev => [...prev, newEntry]);
    setNewSec({ crn: '', room: '' });
    setBanner({ type: 'success', text: `Sección ${crn} agregada.` });
  };

  const editSectionInline = (crn: string, field: 'room' | 'closed', value: any) => {
    setSections(prev => prev.map(s => s.crn === crn ? { ...s, [field]: value } : s));
  };

  const deleteSection = (crn: string) => {
    setSections(prev => prev.filter(s => s.crn !== crn));
    setBanner({ type: 'success', text: `Sección ${crn} eliminada.` });
  };

  const addTimeBlock = (crn: string) => {
    const cfg = newBlock[crn] || { day: 'Mon', start: '07:00', end: '09:00' };
    if (!cfg.day || !cfg.start || !cfg.end) {
      return setBanner({ type: 'error', text: 'Completa día, inicio y fin.' });
    }
    setSections(prev => prev.map(s =>
      s.crn === crn
        ? { ...s, schedule: [...(s.schedule || []), { day: cfg.day, start: cfg.start, end: cfg.end }] }
        : s
    ));
    setNewBlock(prev => ({ ...prev, [crn]: { day: 'Mon', start: '07:00', end: '09:00' } }));
    setBanner({ type: 'success', text: `Bloque agregado a ${crn}.` });
  };

  const removeTimeBlock = (crn: string, i: number) => {
    setSections(prev => prev.map(s =>
      s.crn === crn
        ? { ...s, schedule: (s.schedule || []).filter((_: any, k: number) => k !== i) }
        : s
    ));
  };

  const validateConflicts = (): string[] => {
    const msgs: string[] = [];
    for (let i = 0; i < sections.length; i++) {
      for (let j = i + 1; j < sections.length; j++) {
        const s1 = sections[i];
        const s2 = sections[j];
        if (hasScheduleConflict(s1, s2)) {
          msgs.push(`Conflicto entre ${s1.crn} y ${s2.crn}`);
        }
      }
    }
    return msgs;
  };

  const saveSections = async () => {
    const conflicts = validateConflicts();
    if (conflicts.length > 0) {
      setBanner({ type: 'error', text: `Conflictos:\n${conflicts.join('\n')}` });
      return;
    }
    await setSectionsForCourse(form.id, sections);
    setBanner({ type: 'success', text: `Secciones guardadas para ${form.id}.` });
  };

  const sectionHasConflict = (crn: string) => {
  const me = sections.find(s => s.crn === crn);
  if (!me) return false;
  return sections.some(other =>
    other.crn !== crn && hasScheduleConflict(me, other)
  );
};

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
          <DialogTitle>Editar curso {course.id}</DialogTitle>
          <DialogDescription className="sr-only">
            Edita datos básicos, prerrequisitos, correquisitos y secciones.
          </DialogDescription>
        </DialogHeader>

        {banner && (
          <div className={`mb-3 rounded border p-2 text-sm ${banner.type === 'error' ? 'border-destructive text-destructive' : 'border-green-600 text-green-700'}`}>
            {banner.text.split('\n').map((line, i) => <div key={i}>{line}</div>)}
          </div>
        )}

        <Tabs defaultValue="data" className="mt-2">
          <TabsList>
            <TabsTrigger value="data">Datos básicos</TabsTrigger>
            <TabsTrigger value="sections">Secciones</TabsTrigger>
          </TabsList>

          {/* Pestaña 1: Datos básicos */}
          <TabsContent value="data" className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs">ID</label>
                <Input className="h-8 text-sm" value={form.id} onChange={handleText('id')} />
              </div>
              <div>
                <label className="text-xs">Nombre</label>
                <Input className="h-8 text-sm" value={form.name} onChange={handleText('name')} />
              </div>
              <div>
                <label className="text-xs">Créditos</label>
                <Input className="h-8 text-sm" type="number" value={form.credits} onChange={handleNumber('credits')} />
              </div>
              <div>
                <label className="text-xs">Horas teóricas</label>
                <Input className="h-8 text-sm" type="number" value={form.theoreticalHours} onChange={handleNumber('theoreticalHours')} />
              </div>
              <div>
                <label className="text-xs">Horas prácticas</label>
                <Input className="h-8 text-sm" type="number" value={form.practicalHours} onChange={handleNumber('practicalHours')} />
              </div>
              <div>
                <label className="text-xs">Term</label>
                <Input className="h-8 text-sm" type="number" value={form.term} onChange={handleNumber('term')} />
              </div>
            </div>

            <Separator className="my-2" />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">Prerequisitos</div>
                <Input
                  placeholder="Buscar curso…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="max-w-xs h-8 text-xs"
                />
              </div>
              <div className="max-h-48 overflow-auto border rounded p-2 space-y-1">
                {filteredList.map(c => {
                  const checked = (form.prerequisites ?? []).includes(c.id);
                  return (
                    <label key={`pre-${c.id}`} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleInList('prerequisites', c.id)}
                      />
                      <span className="font-medium">{c.id}</span>
                      <span className="text-muted-foreground"> — {c.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-medium text-sm mt-3">Correquisitos</div>
              <div className="max-h-48 overflow-auto border rounded p-2 space-y-1">
                {filteredList.map(c => {
                  const checked = (form.corequisites ?? []).includes(c.id);
                  return (
                    <label key={`co-${c.id}`} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleInList('corequisites', c.id)}
                      />
                      <span className="font-medium">{c.id}</span>
                      <span className="text-muted-foreground"> — {c.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleSave}>Guardar datos</Button>
            </div>
          </TabsContent>

          {/* Pestaña 2: Secciones */}
          <TabsContent value="sections" className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm">Secciones del curso {form.id}</div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Buscar por CRN/Aula…"
                  value={secFilter}
                  onChange={(e) => setSecFilter(e.target.value)}
                  className="h-8 text-xs max-w-xs"
                />
                <Button size="sm" variant="outline" onClick={saveSections}>Guardar secciones</Button>
              </div>
            </div>

            {/* Agregar sección inline */}
            <div className="flex flex-wrap items-center gap-2 border rounded p-2">
              <Input
                placeholder="CRN (ej. MED100001)"
                value={newSec.crn}
                onChange={(e) => setNewSec({ ...newSec, crn: e.target.value })}
                className="h-8 text-xs max-w-[200px]"
              />
              <Input
                placeholder="Aula (ej. A-101)"
                value={newSec.room}
                onChange={(e) => setNewSec({ ...newSec, room: e.target.value })}
                className="h-8 text-xs max-w-[160px]"
              />
              <Button size="sm" onClick={addSection}>Agregar sección</Button>
            </div>

            {/* Lista de secciones */}
            <div className="space-y-2">
              {filteredSections.map((s) => (
                <div key={s.crn} className="border rounded p-2">
       <div className="flex items-center justify-between gap-2">
  <div className="flex items-center gap-2">
    <div className="text-sm font-medium">{s.crn}</div>
    {sectionHasConflict(s.crn) && (
      <span className="text-xs px-2 py-0.5 rounded-full border border-destructive text-destructive">
        Conflicto
      </span>
    )}
  </div>
  <div className="flex items-center gap-2">
    <label className="text-xs flex items-center gap-1">
      <span>Aula</span>
      <Input
        value={s.room || ''}
        onChange={(e) => editSectionInline(s.crn, 'room', e.target.value)}
        className="h-8 text-xs w-[140px]"
      />
    </label>
    <label className="text-xs flex items-center gap-1">
      <input
        type="checkbox"
        checked={!!s.closed}
        onChange={(e) => editSectionInline(s.crn, 'closed', e.target.checked)}
      />
      <span>Cerrada</span>
    </label>
    <Button size="sm" variant="destructive" onClick={() => deleteSection(s.crn)}>Eliminar</Button>
  </div>
</div>
                  <Separator className="my-2" />

                  {/* bloques horarios */}
                  <div className="space-y-1">
                    {(s.schedule || []).map((t: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div>{t.day} • {t.start}–{t.end}</div>
                        <Button size="sm" variant="ghost" onClick={() => removeTimeBlock(s.crn, i)}>Quitar</Button>
                      </div>
                    ))}

                    {/* añadir bloque inline */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        placeholder="Día (Mon, Tue, Wed, Thu, Fri, Sat)"
                        value={(newBlock[s.crn]?.day) ?? 'Mon'}
                        onChange={(e) => setNewBlock(prev => ({ ...prev, [s.crn]: { ...(prev[s.crn] || { day: 'Mon', start: '07:00', end: '09:00' }), day: e.target.value } }))}
                        className="h-8 text-xs w-[160px]"
                      />
                      <Input
                        placeholder="Inicio HH:MM"
                        value={(newBlock[s.crn]?.start) ?? '07:00'}
                        onChange={(e) => setNewBlock(prev => ({ ...prev, [s.crn]: { ...(prev[s.crn] || { day: 'Mon', start: '07:00', end: '09:00' }), start: e.target.value } }))}
                        className="h-8 text-xs w-[120px]"
                      />
                      <Input
                        placeholder="Fin HH:MM"
                        value={(newBlock[s.crn]?.end) ?? '09:00'}
                        onChange={(e) => setNewBlock(prev => ({ ...prev, [s.crn]: { ...(prev[s.crn] || { day: 'Mon', start: '07:00', end: '09:00' }), end: e.target.value } }))}
                        className="h-8 text-xs w-[120px]"
                      />
                      <Button size="sm" variant="outline" onClick={() => addTimeBlock(s.crn)}>Agregar bloque</Button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredSections.length === 0 && (
                <div className="text-sm text-muted-foreground">No hay secciones</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
