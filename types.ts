
export interface User {
  nip: string;
  name: string;
  role: 'Dosen' | 'Admin';
  nmJabatanFungsional?: string;
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
  isClaimed: boolean; // Keep for backwards compatibility/simplicity, interpreted as "At least one claimed"
  claimants: Claimant[];
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
}

export enum TabType {
  RINCIAN = 'Rincian'
}

export interface AcademicPeriod {
  id: string;
  label: string;
}
