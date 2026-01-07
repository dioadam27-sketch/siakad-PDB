
import React, { useState } from 'react';
import { AvailableSchedule } from '../types';
import { DAYS, MOCK_ROOMS, AVAILABLE_COURSES } from '../constants';

interface CreateCourseFormProps {
  onSave: (course: AvailableSchedule) => void;
  onBulkSave?: (courses: AvailableSchedule[]) => void;
  onCancel: () => void;
  selectedPeriodLabel: string;
}

const CreateCourseForm: React.FC<CreateCourseFormProps> = ({ onSave, onBulkSave, onCancel, selectedPeriodLabel }) => {
  const [activeMode, setActiveMode] = useState<'manual' | 'upload'>('manual');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    sks: 2,
    classCode: 'PDB01',
    day: 'Senin',
    date: '',
    year: selectedPeriodLabel.split(' - ')[0] || '2025/2026',
    startTime: '08:00',
    endTime: '09:40',
    room: ''
  });

  const pdbOptions = Array.from({ length: 130 }, (_, i) => {
    const num = (i + 1).toString().padStart(2, '0');
    return `PDB${num}`;
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
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
      const schedules: AvailableSchedule[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim().replace(/^\uFEFF/, "");
        if (!line) continue;
        const [name, code, sks, classCode, day, startTime, endTime, room] = line.split(',');
        if (name && classCode) {
           schedules.push({
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
           });
        }
      }
      if (schedules.length > 0 && onBulkSave) {
        if(window.confirm(`Berhasil membaca ${schedules.length} jadwal. Simpan?`)) onBulkSave(schedules);
      } else { alert("Gagal membaca file."); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-start mb-6">
        <div><h4 className="text-2xl font-bold text-slate-800">Master Input Jadwal</h4></div>
        <button onClick={onCancel} className="text-slate-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
      </div>
      <div className="flex space-x-6 mb-8 border-b">
        <button onClick={() => setActiveMode('manual')} className={`pb-3 font-bold ${activeMode === 'manual' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-400'}`}>Input Manual</button>
        <button onClick={() => setActiveMode('upload')} className={`pb-3 font-bold ${activeMode === 'upload' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-400'}`}>Upload Excel/CSV</button>
      </div>

      {activeMode === 'manual' ? (
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
          <div className="col-span-2"><label className="block text-sm font-bold mb-2">Nama Mata Kuliah</label><select name="name" value={formData.name} onChange={handleChange} className="w-full p-3 border" required><option value="">Pilih MK</option>{AVAILABLE_COURSES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}</select></div>
          <div><label className="block text-sm font-bold mb-2">Kelas</label><select name="classCode" value={formData.classCode} onChange={handleChange} className="w-full p-3 border">{pdbOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
          <button type="submit" className="col-span-2 bg-indigo-600 text-white font-bold p-4">Daftarkan Jadwal</button>
        </form>
      ) : (
        <div className="py-8 px-4 bg-slate-50 rounded-[2rem] border-2 border-dashed text-center">
          <h3 className="text-xl font-bold mb-2">Upload File Excel</h3>
          <p className="text-slate-500 mb-8">Gunakan template yang tersedia agar format sesuai.</p>
          <div className="flex flex-col items-center gap-4">
            <label className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold cursor-pointer shadow-lg">Pilih File<input type="file" accept=".xls,.csv" onChange={handleFileUpload} className="hidden" /></label>
            <button onClick={handleDownloadTemplate} className="text-emerald-600 font-black text-sm hover:underline flex items-center border border-emerald-600/20 px-4 py-2 rounded-lg bg-emerald-50">
              <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download Template Excel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCourseForm;
