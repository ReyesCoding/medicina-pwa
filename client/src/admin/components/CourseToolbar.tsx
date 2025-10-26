import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  onAdd: () => void;
  onImportCourses: () => void;
  onImportSections: () => void;
  onExportCourses: () => void;
  onExportSections: () => void;
};

export default function CourseToolbar({
  search,
  onSearchChange,
  onAdd,
  onImportCourses,
  onImportSections,
  onExportCourses,
  onExportSections,
}: Props) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex-1">
        <Input
          placeholder="Buscar curso por ID o nombre…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onAdd}>Agregar curso</Button>
        <Button variant="outline" onClick={onImportCourses}>Importar courses.json</Button>
        <Button variant="outline" onClick={onImportSections}>Importar sections.json</Button>
        <Button variant="outline" onClick={onExportCourses}>Exportar courses.json</Button>
        <Button variant="outline" onClick={onExportSections}>Exportar sections.json</Button>
      </div>
    </div>
  );
}
