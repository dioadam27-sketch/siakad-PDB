
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  runTransaction,
  getDoc,
  getDocs
} from "firebase/firestore";
import { db } from "./firebaseConfig.ts";
import { AvailableSchedule, Claimant, User, Lecturer } from "./types.ts";
import { ACADEMIC_PERIODS, LECTURERS } from "./constants.tsx";

// --- HELPER UNTUK ID ---
const SETTINGS_COLLECTION = "settings";
const SCHEDULES_COLLECTION = "schedules";
const LECTURERS_COLLECTION = "lecturers";
const ACTIVE_PERIOD_DOC = "active_period";

// --- SCHEDULE SERVICES ---

export const subscribeToSchedules = (callback: (schedules: AvailableSchedule[], isFromCache: boolean) => void) => {
  return onSnapshot(collection(db, SCHEDULES_COLLECTION), { includeMetadataChanges: true }, (snapshot) => {
    const schedules = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AvailableSchedule[];
    
    // Memberitahu UI apakah data ini instan dari cache atau fresh dari server
    callback(schedules, snapshot.metadata.fromCache);
  });
};

export const addScheduleToDb = async (schedule: AvailableSchedule) => {
  const { id, ...data } = schedule;
  await setDoc(doc(db, SCHEDULES_COLLECTION, id), data);
};

export const deleteScheduleFromDb = async (id: string) => {
  await deleteDoc(doc(db, SCHEDULES_COLLECTION, id));
};

export const claimScheduleInDb = async (scheduleId: string, claimant: Claimant, maxLecturers: number) => {
  const scheduleRef = doc(db, SCHEDULES_COLLECTION, scheduleId);

  try {
    await runTransaction(db, async (transaction) => {
      const scheduleDoc = await transaction.get(scheduleRef);
      if (!scheduleDoc.exists()) {
        throw new Error("Jadwal tidak ditemukan.");
      }

      const scheduleData = scheduleDoc.data() as AvailableSchedule;
      const claimants = scheduleData.claimants || [];

      if (claimants.some(c => c.nip === claimant.nip)) {
        throw new Error("Anda sudah mengklaim jadwal ini.");
      }

      if (claimants.length >= maxLecturers) {
        throw new Error("Kuota dosen untuk jadwal ini sudah penuh.");
      }

      const newClaimants = [...claimants, claimant];
      transaction.update(scheduleRef, {
        claimants: newClaimants,
        isClaimed: newClaimants.length >= maxLecturers
      });
    });
  } catch (e: any) {
    throw e;
  }
};

export const unclaimScheduleInDb = async (scheduleId: string, nip: string) => {
  const scheduleRef = doc(db, SCHEDULES_COLLECTION, scheduleId);
  
  await runTransaction(db, async (transaction) => {
    const scheduleDoc = await transaction.get(scheduleRef);
    if (!scheduleDoc.exists()) return;

    const scheduleData = scheduleDoc.data() as AvailableSchedule;
    const claimants = scheduleData.claimants || [];
    
    const newClaimants = claimants.filter(c => c.nip !== nip);
    transaction.update(scheduleRef, {
      claimants: newClaimants,
      isClaimed: false
    });
  });
};

// --- SETTINGS SERVICES ---

let cachedActivePeriodId = ACADEMIC_PERIODS[0].id;

export const getActivePeriodId = (): string => {
  return cachedActivePeriodId;
};

export const setActivePeriodInDb = async (periodId: string) => {
  await setDoc(doc(db, SETTINGS_COLLECTION, ACTIVE_PERIOD_DOC), { value: periodId });
};

export const subscribeToActivePeriod = (callback: (periodId: string) => void) => {
  return onSnapshot(doc(db, SETTINGS_COLLECTION, ACTIVE_PERIOD_DOC), (doc) => {
    if (doc.exists()) {
      const id = doc.data().value;
      cachedActivePeriodId = id;
      callback(id);
    } else {
      callback(cachedActivePeriodId);
    }
  });
};

// --- LECTURER SERVICES ---

export const subscribeToLecturers = (callback: (lecturers: Lecturer[], isFromCache: boolean) => void) => {
  return onSnapshot(collection(db, LECTURERS_COLLECTION), { includeMetadataChanges: true }, (snapshot) => {
    const lecturers = snapshot.docs.map(doc => doc.data() as Lecturer);
    callback(lecturers, snapshot.metadata.fromCache);
  });
};

export const addLecturerToDb = async (lecturer: Lecturer) => {
  await setDoc(doc(db, LECTURERS_COLLECTION, lecturer.nip), lecturer);
};

export const deleteLecturerFromDb = async (nip: string) => {
  await deleteDoc(doc(db, LECTURERS_COLLECTION, nip));
};

// --- AUTH SERVICES ---

export const loginApi = async (nip: string, password: string): Promise<User | null> => {
  if (nip === 'admin' && password === 'admin') {
      return {
          nip: 'admin',
          name: 'Administrator',
          role: 'Admin'
      };
  }
  
  if (nip === password) {
      const lecturerRef = doc(db, LECTURERS_COLLECTION, nip);
      const lecturerSnap = await getDoc(lecturerRef);
      
      if (lecturerSnap.exists()) {
          const lecturer = lecturerSnap.data() as Lecturer;
          return {
              nip: lecturer.nip,
              name: lecturer.name,
              role: 'Dosen',
              nmJabatanFungsional: lecturer.nmJabatanFungsional
          };
      }
  }
  
  return null;
};

export const migrateLocalToCloud = async (localSchedules: AvailableSchedule[], localLecturers: Lecturer[]) => {
    for (const s of localSchedules) {
        await addScheduleToDb(s);
    }
    for (const l of localLecturers) {
        await addLecturerToDb(l);
    }
};

export const downloadDatabaseBackup = async () => {
    try {
      const schedulesSnap = await getDocs(collection(db, SCHEDULES_COLLECTION));
      const schedules = schedulesSnap.docs.map(d => ({id: d.id, ...d.data()})) as AvailableSchedule[];
      
      const activePeriodSnap = await getDoc(doc(db, SETTINGS_COLLECTION, ACTIVE_PERIOD_DOC));
      const activePeriod = activePeriodSnap.exists() ? activePeriodSnap.data().value : "";
      
      let sqlContent = `-- Cloud Database Backup for Sistem Akademik PDB\n`;
      sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
      sqlContent += `-- Active Period ID: ${activePeriod}\n\n`;
      
      sqlContent += `SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n`;
      sqlContent += `START TRANSACTION;\n`;
      sqlContent += `SET time_zone = "+07:00";\n\n`;

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

      if (schedules.length > 0) {
        sqlContent += `INSERT INTO \`schedules\` (\`id\`, \`code\`, \`name\`, \`sks\`, \`class_code\`, \`day\`, \`start_time\`, \`end_time\`, \`room\`, \`academic_year\`, \`claimants_json\`) VALUES\n`;
        const values = schedules.map(s => {
           const escape = (str: any) => str ? `'${String(str).replace(/'/g, "\\'")}'` : 'NULL';
           const claimantsJson = s.claimants ? JSON.stringify(s.claimants) : '[]';
           return `(${escape(s.id)}, ${escape(s.code)}, ${escape(s.name)}, ${s.sks || 0}, ${escape(s.classCode)}, ${escape(s.day)}, ${escape(s.startTime)}, ${escape(s.endTime)}, ${escape(s.room)}, ${escape(s.academicYear)}, '${claimantsJson.replace(/'/g, "\\'")}')`;
        }).join(",\n");
        sqlContent += values + `;\n`;
      }

      sqlContent += `\nCOMMIT;\n`;
      const blob = new Blob([sqlContent], { type: 'application/sql' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pdb_cloud_backup_${new Date().toISOString().slice(0,10)}.sql`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Backup error:", e);
      alert("Gagal membuat file backup Cloud.");
    }
};
