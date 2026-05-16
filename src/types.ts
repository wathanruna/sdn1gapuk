/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NewsItem {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  content: string; // Detail konten berita
  category: string;
  imageUrl: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  imageUrl: string;
}

export interface ScheduleItem {
  id: string;
  grade: string; // "Kelas 1" - "Kelas 6"
  day: string;
  subjects: {
    time: string;
    name: string;
  }[];
}

export interface ExtraItem {
  id: string;
  name: string;
  description: string;
  longDescription: string; // Detail kegiatan ekskul
  schedule: string;
  coach: string;
  icon: string;
}

export interface StaffItem {
  id: string;
  name: string;
  position: string; // e.g. "Kepala Sekolah", "Guru Kelas 1", "Guru Olahraga"
  imageUrl: string;
  education?: string;
}

export interface Student {
  id: string;
  name: string;
  nisn: string;
  gradeLevel: string;
  className?: '6A' | '6B';
  updatedAt?: string;
  isArchived?: boolean;
}

export interface SubjectGrades {
  pai: number;
  pancasila: number;
  bIndo: number;
  matematika: number;
  ipas: number;
  pjok: number;
  seniBdaya: number;
  bInggris: number;
}

export interface GradeRecord {
  id: string;
  studentId: string;
  semesters: {
    [semester: string]: SubjectGrades;
  };
  updatedAt: string;
}

export interface AppConfig {
  id: string;
  headerImageUrl: string;
  updatedAt?: string;
}

export interface AchievementItem {
  id: string;
  title: string;
  type: 'Guru' | 'Siswa';
  date: string;
  description: string;
  imageUrl?: string;
  category?: string;
}
