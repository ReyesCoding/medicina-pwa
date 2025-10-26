export interface DataProvider {
  getCourses(): Promise<any[]>;
  getSections(): Promise<any>; // según tu JSON (array u objeto), usamos any aquí
  saveCourses(courses: any[]): Promise<void>;
  saveSections(sections: any): Promise<void>;
}
