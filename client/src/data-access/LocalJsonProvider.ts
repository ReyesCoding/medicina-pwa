import { DataProvider } from './DataProvider';

export class LocalJsonProvider implements DataProvider {
  private courses: any[] | null = null;
  private sections: any | null = null; // puede ser array u objeto

  async getCourses(): Promise<any[]> {
    if (this.courses) return this.courses;
    const res = await fetch(`${import.meta.env.BASE_URL}data/courses.json`);
    const json = await res.json();
    this.courses = Array.isArray(json) ? json : [];
    return this.courses;
  }

  async getSections(): Promise<any> {
    if (this.sections) return this.sections;
    const res = await fetch(`${import.meta.env.BASE_URL}data/sections.json`);
    const json = await res.json();
    // No forzamos a array: tus utils esperan a veces objeto con .courses
    this.sections = json ?? {};
    return this.sections;
  }

  async saveCourses(courses: any[]): Promise<void> {
    this.courses = Array.isArray(courses) ? courses : [];
    localStorage.setItem('admin:courses', JSON.stringify(this.courses));
  }

  async saveSections(sections: any): Promise<void> {
    this.sections = sections ?? {};
    localStorage.setItem('admin:sections', JSON.stringify(this.sections));
  }
}
