
export interface User {
  nip: string;
  name: string;
  role: 'Dosen' | 'Admin';
  nmJabatanFungsional?: string;
}

export interface Lecturer {
  name: string;
  nip: string;
  nmJabatanFungsional: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  sks: number;
  classCode: string;
  day?: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  date?: string;
  academicYear?: string;
}

export interface Claimant {
  nip: string;
  name: string;
  jabatan?: string;
}

export interface AvailableSchedule extends Omit<Course, 'id'> {
  id: string;
  isClaimed: boolean;
  claimants: Claimant[];
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  location?: string;
  building?: string;
}

export enum TabType {
  RINCIAN = 'Rincian'
}

export interface AcademicPeriod {
  id: string;
  label: string; // Format: "2025/2026 - Ganjil"
  tahunAkademik: string;
  namaSemester: string;
  groupSemester: string;
  namaSemesterAsli: string;
  tahun: string;
}
