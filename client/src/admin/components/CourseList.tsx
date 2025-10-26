import { Button } from "@/components/ui/button";

type Course = {
  id: string;
  name: string;
  credits: number;
  theoreticalHours: number;
  practicalHours: number;
  term: number;
};

type Props = {
  courses: Course[];
  onEdit: (course: Course) => void;
  onDelete: (id: string) => void;
};

export default function CourseList({ courses, onEdit, onDelete }: Props) {
  if (!courses) {
    return <div className="text-sm text-muted-foreground">Cargando cursos…</div>;
  }
  if (courses.length === 0) {
    return <div className="text-sm text-muted-foreground">No hay cursos</div>;
  }

  return (
    <div className="space-y-2">
      {courses.map((c) => (
        <div key={c.id} className="flex items-center justify-between border rounded p-2">
          <div className="text-sm">
            <div className="font-medium">{c.id} — {c.name}</div>
            <div className="text-muted-foreground">
              {c.credits} créditos • HT {c.theoreticalHours} • HP {c.practicalHours} • Term {c.term}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onEdit(c)}>Editar</Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete(c.id)}>Eliminar</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
