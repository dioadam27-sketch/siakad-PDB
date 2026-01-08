
import { AvailableSchedule, Claimant } from "./types.ts";
import { INITIAL_AVAILABLE_SCHEDULES, LECTURERS, ACADEMIC_PERIODS } from "./constants.tsx";

const KEY_SCHEDULES = 'pdb_schedules_master';
const KEY_ACTIVE_PERIOD = 'pdb_active_period';

// --- HELPER FUNCTIONS ---

const getLocalSchedules = (): AvailableSchedule[] => {
  const stored = localStorage.getItem(KEY_SCHEDULES);
  if (!stored) {
    // Seeding data awal jika kosong
    localStorage.setItem(KEY_SCHEDULES, JSON.stringify(INITIAL_AVAILABLE_SCHEDULES));
    return INITIAL_AVAILABLE_SCHEDULES;
  }
  return JSON.parse(stored);
};

// --- SCHEDULE SERVICES ---

export const subscribeToSchedules = (callback: (schedules: AvailableSchedule[]) => void) => {
  // Panggil langsung data saat ini
  callback(getLocalSchedules());

  // Polling sederhana untuk mensimulasikan realtime di tab yang sama atau antar tab
  const interval = setInterval(() => {
    callback(getLocalSchedules());
  }, 1000);

  return () => clearInterval(interval);
};

export const addScheduleToDb = async (schedule: AvailableSchedule) => {
  const current = getLocalSchedules();
  // Simulasi network delay
  await new Promise(r => setTimeout(r, 300));
  const updated = [...current, schedule];
  localStorage.setItem(KEY_SCHEDULES, JSON.stringify(updated));
};

export const deleteScheduleFromDb = async (id: string) => {
  const current = getLocalSchedules();
  const updated = current.filter(s => s.id !== id);
  localStorage.setItem(KEY_SCHEDULES, JSON.stringify(updated));
};

export const claimScheduleInDb = async (scheduleId: string, claimant: Claimant, maxLecturers: number) => {
  await new Promise(r => setTimeout(r, 500)); // Simulasi loading
  const current = getLocalSchedules();
  const index = current.findIndex(s => s.id === scheduleId);
  
  if (index === -1) throw new Error("Jadwal tidak ditemukan");
  
  const schedule = current[index];
  const claimants = schedule.claimants || [];
  
  if (claimants.length >= maxLecturers) throw new Error("Maaf, slot kelas ini sudah penuh.");
  if (claimants.some(c => c.nip === claimant.nip)) throw new Error("Anda sudah terdaftar di kelas ini.");
  
  const updatedSchedule = {
    ...schedule,
    claimants: [...claimants, claimant],
    isClaimed: true
  };
  
  current[index] = updatedSchedule;
  localStorage.setItem(KEY_SCHEDULES, JSON.stringify(current));
};

export const unclaimScheduleInDb = async (scheduleId: string, nip: string) => {
  const current = getLocalSchedules();
  const index = current.findIndex(s => s.id === scheduleId);
  
  if (index === -1) return;
  
  const schedule = current[index];
  const updatedClaimants = (schedule.claimants || []).filter(c => c.nip !== nip);
  
  current[index] = {
    ...schedule,
    claimants: updatedClaimants,
    isClaimed: updatedClaimants.length > 0
  };
  
  localStorage.setItem(KEY_SCHEDULES, JSON.stringify(current));
};

// --- SETTINGS SERVICES ---

export const getActivePeriodId = (): string => {
  return localStorage.getItem(KEY_ACTIVE_PERIOD) || ACADEMIC_PERIODS[0].id;
};

export const setActivePeriodInDb = async (periodId: string) => {
  localStorage.setItem(KEY_ACTIVE_PERIOD, periodId);
};

export const subscribeToActivePeriod = (callback: (periodId: string) => void) => {
  // Polling untuk mendeteksi perubahan active period
  const interval = setInterval(() => {
    callback(getActivePeriodId());
  }, 1000);
  
  callback(getActivePeriodId());
  return () => clearInterval(interval);
};

// --- LECTURER SERVICES ---

export const subscribeToLecturers = (callback: (lecturers: any[]) => void) => {
  // Mengembalikan data statis dari constants
  setTimeout(() => callback(LECTURERS), 100);
  return () => {};
};

export const deleteLecturerFromDb = async (nip: string) => {
  alert("Mode LocalStorage: Data dosen (Static Constants) tidak dapat dihapus permanen.");
};

export const seedInitialData = async () => {
  localStorage.removeItem(KEY_SCHEDULES);
  alert("Data reset ke default (Initial Seed). Reload halaman untuk melihat efeknya.");
};
