
import { AvailableSchedule, Claimant, User, Lecturer } from "./types.ts";
import { ACADEMIC_PERIODS, LECTURERS, INITIAL_AVAILABLE_SCHEDULES } from "./constants.tsx";

// Kunci penyimpanan di Browser (LocalStorage)
const STORAGE_KEYS = {
  SCHEDULES: 'pdb_schedules_data',
  ACTIVE_PERIOD: 'pdb_active_period',
  LECTURERS: 'pdb_lecturers_data'
};

// Simulasi delay jaringan agar terasa seperti aplikasi nyata
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- SCHEDULE SERVICES ---

export const subscribeToSchedules = (callback: (schedules: AvailableSchedule[]) => void) => {
  // Fungsi untuk memuat data dari LocalStorage
  const loadData = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
      if (stored) {
        callback(JSON.parse(stored));
      } else {
        // Jika data kosong (pengguna baru), isi dengan data awal dari constants
        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(INITIAL_AVAILABLE_SCHEDULES));
        callback(INITIAL_AVAILABLE_SCHEDULES);
      }
    } catch (e) {
      console.error("Gagal memuat jadwal:", e);
      callback([]);
    }
  };

  loadData();

  // Polling sederhana untuk mendeteksi perubahan (misal dari tab lain)
  const interval = setInterval(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
    if (stored) {
      callback(JSON.parse(stored)); 
    }
  }, 1000);

  return () => clearInterval(interval);
};

export const addScheduleToDb = async (schedule: AvailableSchedule) => {
  await delay(500);
  const stored = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
  const schedules: AvailableSchedule[] = stored ? JSON.parse(stored) : [];
  
  schedules.push(schedule);
  localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
};

export const deleteScheduleFromDb = async (id: string) => {
  await delay(500);
  const stored = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
  let schedules: AvailableSchedule[] = stored ? JSON.parse(stored) : [];
  
  schedules = schedules.filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
};

export const claimScheduleInDb = async (scheduleId: string, claimant: Claimant, maxLecturers: number) => {
  await delay(600);
  const stored = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
  let schedules: AvailableSchedule[] = stored ? JSON.parse(stored) : [];
  
  const scheduleIndex = schedules.findIndex(s => s.id === scheduleId);
  if (scheduleIndex > -1) {
    const schedule = schedules[scheduleIndex];
    if (!schedule.claimants) schedule.claimants = [];
    
    // Cek apakah user sudah klaim sebelumnya
    if (schedule.claimants.some(c => c.nip === claimant.nip)) {
        throw new Error("Anda sudah mengklaim jadwal ini.");
    }
    
    // Cek kuota
    if (schedule.claimants.length >= maxLecturers) {
        throw new Error("Kuota dosen untuk jadwal ini sudah penuh.");
    }
    
    // Simpan klaim
    schedule.claimants.push(claimant);
    schedule.isClaimed = schedule.claimants.length >= maxLecturers; 
    
    schedules[scheduleIndex] = schedule;
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
  } else {
      throw new Error("Jadwal tidak ditemukan.");
  }
};

export const unclaimScheduleInDb = async (scheduleId: string, nip: string) => {
  await delay(500);
  const stored = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
  let schedules: AvailableSchedule[] = stored ? JSON.parse(stored) : [];
  
  const scheduleIndex = schedules.findIndex(s => s.id === scheduleId);
  if (scheduleIndex > -1) {
    const schedule = schedules[scheduleIndex];
    if (schedule.claimants) {
        schedule.claimants = schedule.claimants.filter(c => c.nip !== nip);
        // Reset status full jika ada yang keluar
        schedule.isClaimed = false; 
        
        schedules[scheduleIndex] = schedule;
        localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
    }
  }
};

// --- SETTINGS SERVICES ---

export const getActivePeriodId = (): string => {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_PERIOD) || ACADEMIC_PERIODS[0].id;
};

export const setActivePeriodInDb = async (periodId: string) => {
  await delay(300);
  localStorage.setItem(STORAGE_KEYS.ACTIVE_PERIOD, periodId);
};

export const subscribeToActivePeriod = (callback: (periodId: string) => void) => {
  const check = () => {
      const id = localStorage.getItem(STORAGE_KEYS.ACTIVE_PERIOD) || ACADEMIC_PERIODS[0].id;
      callback(id);
  };
  check();
  const interval = setInterval(check, 1000);
  return () => clearInterval(interval);
};

// --- LECTURER SERVICES ---

export const subscribeToLecturers = (callback: (lecturers: Lecturer[]) => void) => {
  const loadData = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LECTURERS);
      if (stored) {
        callback(JSON.parse(stored));
      } else {
        // Inisialisasi data awal jika belum ada
        localStorage.setItem(STORAGE_KEYS.LECTURERS, JSON.stringify(LECTURERS));
        callback(LECTURERS);
      }
    } catch (e) {
      console.error("Gagal memuat dosen:", e);
      callback([]);
    }
  };

  loadData();

  const interval = setInterval(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.LECTURERS);
    if (stored) {
      callback(JSON.parse(stored));
    }
  }, 1000);

  return () => clearInterval(interval);
};

export const addLecturerToDb = async (lecturer: Lecturer) => {
  await delay(500);
  const stored = localStorage.getItem(STORAGE_KEYS.LECTURERS);
  const lecturers: Lecturer[] = stored ? JSON.parse(stored) : LECTURERS;
  
  // Cek duplikasi NIP
  if (lecturers.some(l => l.nip === lecturer.nip)) {
    throw new Error("NIP Dosen sudah terdaftar.");
  }

  lecturers.push(lecturer);
  localStorage.setItem(STORAGE_KEYS.LECTURERS, JSON.stringify(lecturers));
};

export const deleteLecturerFromDb = async (nip: string) => {
  await delay(500);
  const stored = localStorage.getItem(STORAGE_KEYS.LECTURERS);
  let lecturers: Lecturer[] = stored ? JSON.parse(stored) : LECTURERS;
  
  lecturers = lecturers.filter(l => l.nip !== nip);
  localStorage.setItem(STORAGE_KEYS.LECTURERS, JSON.stringify(lecturers));
};

// --- AUTH SERVICES ---

export const loginApi = async (nip: string, password: string): Promise<User | null> => {
  await delay(800); // Simulasi loading network
  
  // 1. Cek Login Admin
  if (nip === 'admin' && password === 'admin') {
      return {
          nip: 'admin',
          name: 'Administrator',
          role: 'Admin'
      };
  }
  
  // 2. Cek Login Dosen (Password = NIP)
  if (nip === password) {
      // Ambil data dosen terbaru dari LocalStorage (bukan constant)
      const stored = localStorage.getItem(STORAGE_KEYS.LECTURERS);
      const currentLecturers: Lecturer[] = stored ? JSON.parse(stored) : LECTURERS;
      
      const lecturer = currentLecturers.find(l => l.nip === nip);
      if (lecturer) {
          return {
              nip: lecturer.nip,
              name: lecturer.name,
              role: 'Dosen',
              nmJabatanFungsional: lecturer.nmJabatanFungsional
          };
      }
  }
  
  // Login Gagal
  return null;
};

// --- BACKUP SERVICES (SQL FORMAT) ---
export const downloadDatabaseBackup = async () => {
    try {
      const schedulesStr = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
      const schedules: AvailableSchedule[] = schedulesStr ? JSON.parse(schedulesStr) : [];
      const activePeriod = localStorage.getItem(STORAGE_KEYS.ACTIVE_PERIOD) || "";
      
      // Header SQL
      let sqlContent = `-- Database Backup for Sistem Akademik PDB\n`;
      sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
      sqlContent += `-- Active Period ID: ${activePeriod}\n\n`;
      
      sqlContent += `SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n`;
      sqlContent += `START TRANSACTION;\n`;
      sqlContent += `SET time_zone = "+07:00";\n\n`;

      // 1. Struktur Tabel: schedules
      sqlContent += `-- Table structure for table \`schedules\`\n`;
      sqlContent += `CREATE TABLE IF NOT EXISTS \`schedules\` (\n`;
      sqlContent += `  \`id\` varchar(255) NOT NULL,\n`;
      sqlContent += `  \`code\` varchar(50) DEFAULT NULL,\n`;
      sqlContent += `  \`name\` varchar(255) DEFAULT NULL,\n`;
      sqlContent += `  \`sks\` int(11) DEFAULT NULL,\n`;
      sqlContent += `  \`class_code\` varchar(50) DEFAULT NULL,\n`;
      sqlContent += `  \`day\` varchar(20) DEFAULT NULL,\n`;
      sqlContent += `  \`start_time\` varchar(20) DEFAULT NULL,\n`;
      sqlContent += `  \`end_time\` varchar(20) DEFAULT NULL,\n`;
      sqlContent += `  \`room\` varchar(50) DEFAULT NULL,\n`;
      sqlContent += `  \`academic_year\` varchar(100) DEFAULT NULL,\n`;
      sqlContent += `  \`claimants_json\` text DEFAULT NULL,\n`;
      sqlContent += `  PRIMARY KEY (\`id\`)\n`;
      sqlContent += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

      // 2. Dump Data: schedules
      if (schedules.length > 0) {
        sqlContent += `-- Dumping data for table \`schedules\`\n`;
        sqlContent += `INSERT INTO \`schedules\` (\`id\`, \`code\`, \`name\`, \`sks\`, \`class_code\`, \`day\`, \`start_time\`, \`end_time\`, \`room\`, \`academic_year\`, \`claimants_json\`) VALUES\n`;
        
        const values = schedules.map(s => {
           // Helper untuk escape single quote agar aman di SQL
           const escape = (str: string | undefined | null) => str ? `'${str.replace(/'/g, "\\'")}'` : 'NULL';
           // Simpan claimants sebagai JSON string
           const claimantsJson = s.claimants ? JSON.stringify(s.claimants) : '[]';
           
           return `(${escape(s.id)}, ${escape(s.code)}, ${escape(s.name)}, ${s.sks || 0}, ${escape(s.classCode)}, ${escape(s.day)}, ${escape(s.startTime)}, ${escape(s.endTime)}, ${escape(s.room)}, ${escape(s.academicYear)}, '${claimantsJson.replace(/'/g, "\\'")}')`;
        }).join(",\n");
        
        sqlContent += values + `;\n`;
      }

      sqlContent += `\nCOMMIT;\n`;
      
      // Download File
      const blob = new Blob([sqlContent], { type: 'application/sql' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `pdb_backup_${new Date().toISOString().slice(0,10)}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Backup error:", e);
      alert("Gagal membuat file backup SQL.");
    }
};
