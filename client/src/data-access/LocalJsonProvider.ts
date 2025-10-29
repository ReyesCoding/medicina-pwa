// client/src/data-access/LocalJsonProvider.ts
import { DataProvider } from './DataProvider';

const LS_COURSES_KEY = 'admin:courses';
const LS_SECTIONS_KEY = 'admin:sections';

class LocalJsonProvider implements DataProvider {
  private base = import.meta.env.BASE_URL; // p.ej. "/medicina-pwa/"
  private courses: any[] = [];        // <-- siempre array
  private sections: any = null;       // puede ser array o { courses: [...] }

  private readLocal<T = unknown>(key: string): T | null {
    try {
      const txt = localStorage.getItem(key);
      if (!txt) return null;
      return JSON.parse(txt) as T;
    } catch {
      return null;
    }
  }

  async getCourses(): Promise<any[]> {
    // 1) Si ya tenemos cache, retornamos
    if (this.courses.length > 0) return this.courses;

    // 2) Intentar localStorage (Admin)
    const local = this.readLocal<any>(LS_COURSES_KEY);
    if (local) {
      this.courses = Array.isArray(local)
        ? local
        : (Array.isArray(local?.courses) ? local.courses : []);
      if (this.courses.length > 0) return this.courses;
    }

    // 3) Fetch desde /public/data
    try {
      const res = await fetch(`${this.base}data/courses.json`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`courses ${res.status}`);
      const json = await res.json();
      this.courses = Array.isArray(json)
        ? json
        : (Array.isArray(json?.courses) ? json.courses : []);
    } catch (err) {
      console.error('[LocalJsonProvider] getCourses error:', err);
      this.courses = [];
    }

    return this.courses; // <-- ahora siempre es array
  }

  async getSections(): Promise<any> {
    // Mantiene shape original (array o {courses:[...]})
    if (this.sections) return this.sections;

    // 1) LocalStorage (Admin)
    const local = this.readLocal<any>(LS_SECTIONS_KEY);
    if (local) {
      this.sections = local;
      return this.sections;
    }

    // 2) Fetch desde /public/data
    try {
      const res = await fetch(`${this.base}data/sections.json`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`sections ${res.status}`);
      const json = await res.json();
      this.sections = json ?? []; // fallback seguro
    } catch (err) {
      console.error('[LocalJsonProvider] getSections error:', err);
      this.sections = [];
    }

    return this.sections;
  }

  async saveCourses(next: any[]): Promise<void> {
    this.courses = Array.isArray(next) ? next : [];
    try {
      localStorage.setItem(LS_COURSES_KEY, JSON.stringify(this.courses));
    } catch {}
  }

  async saveSections(next: any): Promise<void> {
    this.sections = next ?? {};
    try {
      localStorage.setItem(LS_SECTIONS_KEY, JSON.stringify(this.sections));
    } catch {}
  }
}

export default LocalJsonProvider;
export { LocalJsonProvider };
