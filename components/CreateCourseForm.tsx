
import React, { useState } from 'react';
import { AvailableSchedule } from '../types';
import { DAYS, MOCK_ROOMS, AVAILABLE_COURSES } from '../constants';

interface CreateCourseFormProps {
  onSave: (course: AvailableSchedule) => void;
  onBulkSave?: (courses: AvailableSchedule[]) => void;
  onCancel: () => void;
  selectedPeriodLabel: string;
  existingSchedules: AvailableSchedule[];
}

const CreateCourseForm: React.FC<CreateCourseFormProps> = ({ onSave, onBulkSave, onCancel, selectedPeriodLabel, existingSchedules }) => {
  const [activeMode, setActiveMode] = useState<'manual' | 'upload'>('manual');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    sks: 2,
    classCode: 'PDB01',
    day: 'Senin',
    date: '',
    year: selectedPeriodLabel, 
    startTime: '08:00',
    endTime: '09:40',
    room: ''
  });

  const pdbOptions = Array.from({ length: 130 }, (_, i) => {
    const num = (i + 1).toString().padStart(2, '0');
    return `PDB${num}`;
  });

  // Helper untuk mengecek apakah dua interval waktu bentrok
  const isTimeOverlapping = (start1: string, end1: string, start2: string, end2: string) => {
    return (start1 < end2) && (start2 < end1);
  };

  // Mencari jadwal yang bentrok
  const findConflict = (newSched: Partial<AvailableSchedule>, listToCheck: AvailableSchedule[]) => {
    return listToCheck.find(s => 
      s.academicYear === newSched.academicYear &&
      s.room === newSched.room &&
      s.day === newSched.day &&
      isTimeOverlapping(newSched.startTime!, newSched.endTime!, s.startTime!, s.endTime!)
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setErrorMsg(null); // Clear error on change
    if (name === 'name') {
      const selected = AVAILABLE_COURSES.find(c => c.name === value);
      setFormData(prev => ({ 
        ...prev, 
        name: value,
        code: selected ? selected.code : prev.code,
        sks: selected ? selected.sks : prev.sks
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.room) {
      setErrorMsg("Harap isi semua field yang diperlukan.");
      return;
    }

    const newSchedule: AvailableSchedule = {
      id: `as-${Math.random().toString(36).substr(2, 9)}`,
      name: formData.name,
      code: formData.code,
      sks: Number(formData.sks),
      classCode: formData.classCode,
      day: formData.day,
      startTime: formData.startTime,
      endTime: formData.endTime,
      room: formData.room,
      date: formData.date,
      academicYear: formData.year,
      isClaimed: false,
      claimants: []
    };

    // Validasi Bentrok
    const conflict = findConflict(newSchedule, existingSchedules);
    if (conflict) {
      setErrorMsg(
        `JADWAL BENTROK! Ruang ${newSchedule.room} sudah dipesan oleh ${conflict.name} (${conflict.classCode}) pada pukul ${conflict.startTime} - ${conflict.endTime}.`
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    onSave(newSchedule);
  };

  const wrapInExcelHtml = (tableHtml: string) => `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Template</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><meta charset="utf-8"></head>
    <body>${tableHtml}</body>
    </html>
  `;

  const handleDownloadTemplate = () => {
    const table = `
      <table border="1">
        <thead>
          <tr style="background-color: #10b981; color: white; font-weight: bold;">
            <th>Nama Mata Kuliah</th><th>Kode MK</th><th>SKS</th><th>Kelas</th><th>Hari</th><th>Jam Mulai</th><th>Jam Selesai</th><th>Ruang</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Agama Islam 1</td><td>UAK25000001</td><td>2</td><td>PDB01</td><td>Senin</td><td>08:00</td><td>09:40</td><td>GC-3.05</td></tr>
        </tbody>
      </table>
    `;
    const blob = new Blob([wrapInExcelHtml(table)], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "template_jadwal.xls";
    link.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n');
      const schedulesToSave: AvailableSchedule[] = [];
      const conflictsFound: string[] = [];
      
      const localList = [...existingSchedules];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim().replace(/^\uFEFF/, "");
        if (!line) continue;
        const [name, code, sks, classCode, day, startTime, endTime, room] = line.split(',');
        
        if (name && classCode) {
           const tempSchedule: AvailableSchedule = {
             id: `as-${Math.random().toString(36).substr(2, 9)}`,
             name: name.trim(),
             code: code?.trim() || 'MK',
             sks: Number(sks) || 2,
             classCode: classCode.trim(),
             day: day?.trim() || 'Senin',
             startTime: startTime?.trim() || '08:00',
             endTime: endTime?.trim() || '09:40',
             room: room?.trim() || 'TBA',
             isClaimed: false,
             claimants: [],
             academicYear: formData.year
           };

           const conflict = findConflict(tempSchedule, localList);
           if (conflict) {
             conflictsFound.push(`Baris ${i+1}: ${tempSchedule.name} (${tempSchedule.classCode}) BENTROK`);
           } else {
             schedulesToSave.push(tempSchedule);
             localList.push(tempSchedule);
           }
        }
      }

      if (conflictsFound.length > 0) {
        setErrorMsg(`JADWAL BENTROK ditemukan pada file sebanyak ${conflictsFound.length} baris. Hanya jadwal yang aman yang akan diproses.`);
      }

      if (schedulesToSave.length > 0 && onBulkSave) {
        if(window.confirm(`Simpan ${schedulesToSave.length} jadwal yang valid?`)) {
          onBulkSave(schedulesToSave);
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h4 className="text-2xl font-black text-slate-800 tracking-tight">Master Input Jadwal</h4>
          <p className="text-slate-500 text-sm font-medium">Menambahkan jadwal ke periode <strong>{selectedPeriodLabel}</strong></p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tampilan Notifikasi Bentrok */}
      {errorMsg && (
        <div className="mb-8 p-6 bg-red-50 border-l-[6px] border-red-500 rounded-2xl flex items-start animate-in shake-in duration-300 shadow-sm">
          <div className="bg-red-500 text-white p-2 rounded-lg mr-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h5 className="font-black text-red-600 text-sm uppercase tracking-widest mb-1">Peringatan Sistem</h5>
            <p className="text-red-700 font-bold leading-relaxed">{errorMsg}</p>
          </div>
        </div>
      )}

      <div className="flex space-x-8 mb-8 border-b border-slate-100">
        <button 
          onClick={() => { setActiveMode('manual'); setErrorMsg(null); }} 
          className={`pb-4 text-sm font-black uppercase tracking-widest transition-all border-b-2 -mb-[2px] ${
            activeMode === 'manual' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Input Manual
        </button>
        <button 
          onClick={() => { setActiveMode('upload'); setErrorMsg(null); }} 
          className={`pb-4 text-sm font-black uppercase tracking-widest transition-all border-b-2 -mb-[2px] ${
            activeMode === 'upload' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Upload Excel/CSV
        </button>
      </div>

      {activeMode === 'manual' ? (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nama Mata Kuliah</label>
            <select 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none shadow-sm"
              required
            >
              <option value="">Pilih Mata Kuliah</option>
              {AVAILABLE_COURSES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Kode MK</label>
            <input type="text" value={formData.code} readOnly className="w-full p-4 bg-slate-100 border border-slate-200 rounded-2xl font-bold text-slate-500 outline-none cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">SKS</label>
            <input type="text" value={formData.sks} readOnly className="w-full p-4 bg-slate-100 border border-slate-200 rounded-2xl font-bold text-slate-500 outline-none cursor-not-allowed" />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Kelas</label>
            <select name="classCode" value={formData.classCode} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm">
              {pdbOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Hari</label>
            <select name="day" value={formData.day} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm">
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Jam Mulai</label>
            <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" required />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Jam Selesai</label>
            <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" required />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Ruangan</label>
            <select name="room" value={formData.room} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" required>
              <option value="">Pilih Ruangan</option>
              {MOCK_ROOMS.map(r => <option key={r.id} value={r.name}>{r.name} (Kaps: {r.capacity})</option>)}
            </select>
          </div>

          <div className="md:col-span-2 pt-4">
            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-[0.98]">
              Daftarkan Jadwal
            </button>
          </div>
        </form>
      ) : (
        <div className="py-12 px-4 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center">
          <div className="bg-white w-20 h-20 rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6 text-indigo-600">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">Upload Database Jadwal</h3>
          <p className="text-slate-500 font-medium mb-10 max-w-sm mx-auto">Gunakan file Excel atau CSV sesuai template.</p>
          <div className="flex flex-col items-center gap-6">
            <label className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black cursor-pointer shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">
              Pilih File Excel/CSV
              <input type="file" accept=".xls,.csv" onChange={handleFileUpload} className="hidden" />
            </label>
            <button onClick={handleDownloadTemplate} className="text-emerald-600 font-black text-sm flex items-center bg-emerald-50 px-6 py-3 rounded-xl border border-emerald-100">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Unduh Template (.xls)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCourseForm;
