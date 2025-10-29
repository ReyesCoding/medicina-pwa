// client/src/data-access/DataProvider.ts
export interface DataProvider {
  getCourses(): Promise<any[]>;
  getSections(): Promise<any[]>;
  saveCourses(next: any[]): Promise<void> | void;
  saveSections(next: any[]): Promise<void> | void;
}
