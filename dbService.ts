
import { AvailableSchedule, Claimant, User, Lecturer } from "./types.ts";
import { ACADEMIC_PERIODS } from "./constants.tsx";

const env = (window as any).process.env;
const GAS_URL = env.GAS_API_URL;

/**
 * Helper untuk memanggil Google Apps Script menggunakan GET (CORS Friendly)
 */
const fetchGas = async (action: string, params: any = {}) => {
  if (!GAS_URL || GAS_URL.includes("MASUKKAN_URL")) return null;
  
  const query = new URLSearchParams({ action, ...params }).toString();
  try {
    const response = await fetch(`${GAS_URL}?${query}`);
    if (!response.ok) throw new Error("Gagal terhubung ke server Google Sheets.");
    const data = await response.json();
    
    // Safety check: Pastikan claimants selalu berupa array
    if (Array.isArray(data)) {
      return data.map(item => ({
        ...item,
        claimants: Array.isArray(item.claimants) ? item.claimants : []
      }));
    }
    
    return data;
  } catch (e) {
    console.error("Fetch GAS Error:", e);
    return null;
  }
};

/**
 * Helper untuk memanggil Google Apps Script menggunakan POST
 */
const postGas = async (action: string, data: any = {}, params: any = {}) => {
  if (!GAS_URL || GAS_URL.includes("MASUKKAN_URL")) return null;
  
  const query = new URLSearchParams({ action, ...params }).toString();
  try {
    const response = await fetch(`${GAS_URL}?${query}`, {
      method: "POST",
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (e) {
    console.error("Post GAS Error:", e);
    return null;
  }
};

let cachedActivePeriod = ACADEMIC_PERIODS[0].id;

// REAL-TIME POLLING (Simulasi sinkronisasi cloud)
export const subscribeToSchedules = (callback: (data: AvailableSchedule[], isCache: boolean) => void) => {
  const poll = async () => {
    const data = await fetchGas("getSchedules");
    if (data && Array.isArray(data)) {
      callback(data, false);
    }
  };
  poll();
  const interval = setInterval(poll, 10000); // Cek update setiap 10 detik
  return () => clearInterval(interval);
};

export const subscribeToLecturers = (callback: (data: Lecturer[]) => void) => {
  const poll = async () => {
    const data = await fetchGas("getLecturers");
    if (data && Array.isArray(data)) {
      callback(data);
    }
  };
  poll();
  const interval = setInterval(poll, 15000);
  return () => clearInterval(interval);
};

export const subscribeToActivePeriod = (callback: (id: string) => void) => {
  const poll = async () => {
    const data = await fetchGas("getSettings", { key: "active_period" });
    if (data && data.value) {
      cachedActivePeriod = data.value;
      callback(data.value);
    }
  };
  poll();
  return () => {};
};

export const getActivePeriodId = () => cachedActivePeriod;

// --- OPERASI DATABASE (C.R.U.D) ---

export const addScheduleToDb = async (schedule: AvailableSchedule) => {
  return await postGas("addSchedule", schedule);
};

export const deleteScheduleFromDb = async (id: string) => {
  return await postGas("deleteSchedule", {}, { id });
};

export const claimScheduleInDb = async (scheduleId: string, claimant: Claimant, maxLecturers: number) => {
  const res = await fetchGas("claimSchedule", { 
    scheduleId, 
    nip: claimant.nip, 
    name: claimant.name, 
    jabatan: claimant.jabatan || "", 
    maxLecturers: maxLecturers.toString()
  });
  if (res && res.error) throw new Error(res.error);
  return res;
};

export const unclaimScheduleInDb = async (scheduleId: string, nip: string) => {
  return await fetchGas("unclaimSchedule", { scheduleId, nip });
};

export const addLecturerToDb = async (lecturer: Lecturer) => {
  return await postGas("addLecturer", lecturer);
};

export const deleteLecturerFromDb = async (nip: string) => {
  return await postGas("deleteLecturer", {}, { nip });
};

export const loginApi = async (nip: string, password: string): Promise<User | null> => {
  const res = await fetchGas("login", { nip, password });
  if (res && res.user) return res.user;
  return null;
};

export const downloadDatabaseBackup = () => {
  alert("Data tersimpan otomatis di Google Sheets Anda setiap kali ada perubahan.");
};
