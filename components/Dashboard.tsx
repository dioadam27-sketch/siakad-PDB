
import React, { useState, useEffect, useMemo } from 'react';
import { User, Course, AvailableSchedule } from '../types';
import { ACADEMIC_PERIODS, INITIAL_AVAILABLE_SCHEDULES, DAYS, LECTURERS } from '../constants';
import CourseTable from './CourseTable';
import CreateCourseForm from './CreateCourseForm';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DashboardProps {
  user: User;
}

type TabKey = 'Rincian' | 'Pilih Jadwal' | 'Monitoring' | 'Master Dosen';

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [selectedPeriod, setSelectedPeriod] = useState(ACADEMIC_PERIODS[0].id);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [availableSchedules, setAvailableSchedules] = useState<AvailableSchedule[]>([]);
  const [lecturersList, setLecturersList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('Rincian');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });

  const [showAddDosen, setShowAddDosen] = useState(false);
  const [newDosen, setNewDosen] = useState({ name: '', nip: '', nmJabatanFungsional: 'Asisten Ahli' });

  const isAdmin = user.role === 'Admin';
  const MAX_LECTURERS = 2;

  useEffect(() => {
    const savedMyCourses = localStorage.getItem(`my_courses_${user.nip}`);
    const savedAvailable = localStorage.getItem('available_schedules_pool');
    const savedLecturers = localStorage.getItem('master_lecturers');
    
    if (savedMyCourses) setMyCourses(JSON.parse(savedMyCourses));
    if (savedAvailable) {
      setAvailableSchedules(JSON.parse(savedAvailable));
    } else {
      setAvailableSchedules(INITIAL_AVAILABLE_SCHEDULES);
      localStorage.setItem('available_schedules_pool', JSON.stringify(INITIAL_AVAILABLE_SCHEDULES));
    }
    if (savedLecturers) {
      setLecturersList(JSON.parse(savedLecturers));
    } else {
      setLecturersList(LECTURERS);
      localStorage.setItem('master_lecturers', JSON.stringify(LECTURERS));
    }
  }, [user.nip]);

  useEffect(() => {
    localStorage.setItem(`my_courses_${user.nip}`, JSON.stringify(myCourses));
  }, [myCourses, user.nip]);

  const updateGlobalPool = (pool: AvailableSchedule[]) => {
    setAvailableSchedules(pool);
    localStorage.setItem('available_schedules_pool', JSON.stringify(pool));
  };

  const updateLecturerMaster = (list: any[]) => {
    setLecturersList(list);
    localStorage.setItem('master_lecturers', JSON.stringify(list));
  };

  const handleAdminCreateSchedule = (newSchedule: AvailableSchedule) => {
    updateGlobalPool([...availableSchedules, newSchedule]);
    setActiveTab('Rincian');
  };

  const handleAdminBulkCreateSchedule = (newSchedules: AvailableSchedule[]) => {
    updateGlobalPool([...availableSchedules, ...newSchedules]);
    setActiveTab('Rincian');
  };

  const handleDosenPickSchedule = (scheduleId: string) => {
    const schedule = availableSchedules.find(s => s.id === scheduleId);
    if (schedule) {
      if (schedule.claimants.some(c => c.nip === user.nip)) {
        alert("Anda sudah mengambil jadwal ini.");
        return;
      }
      if (schedule.claimants.length >= MAX_LECTURERS) {
        alert("Maaf, jadwal ini sudah penuh (maksimal 2 dosen).");
        return;
      }
      const newClaimant = { nip: user.nip, name: user.name, jabatan: user.nmJabatanFungsional };
      const updatedPool = availableSchedules.map(s => 
        s.id === scheduleId ? { ...s, isClaimed: true, claimants: [...s.claimants, newClaimant] } : s
      );
      setMyCourses(prev => [...prev, { ...schedule }]);
      updateGlobalPool(updatedPool);
      setActiveTab('Rincian');
    }
  };

  const handleDeleteCourse = (id: string) => {
    setMyCourses(prev => prev.filter(c => c.id !== id));
    const updatedPool = availableSchedules.map(s => {
      if (s.id === id) {
        const remaining = s.claimants.filter(c => c.nip !== user.nip);
        return { ...s, claimants: remaining, isClaimed: remaining.length > 0 };
      }
      return s;
    });
    updateGlobalPool(updatedPool);
  };

  const sortedData = useMemo(() => {
    let items = activeTab === 'Master Dosen' ? [...lecturersList] : [...availableSchedules];
    if (sortConfig !== null) {
      items.sort((a: any, b: any) => {
        if (sortConfig.key === 'day') {
           const aIndex = DAYS.indexOf(a.day || '');
           const bIndex = DAYS.indexOf(b.day || '');
           if (aIndex < bIndex) return sortConfig.direction === 'asc' ? -1 : 1;
           if (aIndex > bIndex) return sortConfig.direction === 'asc' ? 1 : -1;
           return 0;
        }
        const aVal = (a[sortConfig.key] || '').toString().toLowerCase();
        const bVal = (b[sortConfig.key] || '').toString().toLowerCase();
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [availableSchedules, lecturersList, sortConfig, activeTab]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF('landscape');
      doc.setFontSize(18);
      doc.text('Laporan Monitoring Jadwal PDB', 14, 20);
      const periodLabel = ACADEMIC_PERIODS.find(p => p.id === selectedPeriod)?.label || '';
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Periode: ${periodLabel}`, 14, 28);
      const headers = [["No", "Mata Kuliah", "Kelas", "Hari", "Waktu", "Ruang", "Status", "Pengampu"]];
      const rows = availableSchedules.map((s, index) => [
        index + 1,
        `${s.name}\n(${s.code})`,
        s.classCode,
        s.day || '-',
        `${s.startTime || '-'} - ${s.endTime || '-'}`,
        s.room || '-',
        s.claimants.length >= MAX_LECTURERS ? "Penuh" : (s.claimants.length > 0 ? `Terisi (${s.claimants.length})` : "Kosong"),
        s.claimants.map(c => `${c.name} (${c.nip})`).join('\n')
      ]);
      autoTable(doc, { head: headers, body: rows, startY: 40, theme: 'grid' });
      doc.save(`Monitoring_Jadwal_PDB_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) { alert("Ekspor PDF gagal."); }
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
            <th>Nama Lengkap</th><th>NIP</th><th>Jabatan Fungsional</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Dosen Contoh, Ph.D.</td><td>198001012023011001</td><td>Asisten Ahli</td></tr>
        </tbody>
      </table>
    `;
    const blob = new Blob([wrapInExcelHtml(table)], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "template_master_dosen.xls";
    link.click();
  };

  const handleDownloadScheduleTemplate = () => {
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

  const handleAddLecturer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDosen.name || !newDosen.nip) return;
    if (lecturersList.some(l => l.nip === newDosen.nip)) { alert("NIP sudah terdaftar!"); return; }
    updateLecturerMaster([...lecturersList, newDosen]);
    setNewDosen({ name: '', nip: '', nmJabatanFungsional: 'Asisten Ahli' });
    setShowAddDosen(false);
  };

  const handleDeleteLecturer = (nip: string) => {
    if (window.confirm("Hapus dosen dari master?")) updateLecturerMaster(lecturersList.filter(l => l.nip !== nip));
  };

  const tabs: TabKey[] = isAdmin 
    ? ['Rincian', 'Pilih Jadwal', 'Monitoring', 'Master Dosen'] 
    : ['Rincian', 'Pilih Jadwal'];

  return (
    <div className="space-y-6 animate-in fade-in duration-700 max-w-7xl mx-auto px-4 py-8">
      <div className="bg-[#FFF9F2] rounded-[2rem] shadow-sm border border-orange-100 p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">
              {isAdmin ? 'Manajemen Master Jadwal' : 'Manajemen Jadwal & Ruang'}
            </h2>
            <p className="text-slate-500 text-lg">
              {isAdmin ? 'Kelola master dosen, jadwal, dan monitoring.' : 'Lihat rincian jadwal atau pilih jadwal mengajar.'}
            </p>
          </div>
          <div className="flex items-center">
            <div className="relative group">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-2xl px-6 py-4 pr-12 font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 outline-none cursor-pointer hover:border-indigo-300 transition-all text-base shadow-sm"
              >
                {ACADEMIC_PERIODS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-indigo-500 transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-12 mt-12 border-b border-slate-100">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-2 text-base font-extrabold transition-all border-b-4 -mb-[2px] ${
                activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {isAdmin && tab === 'Pilih Jadwal' ? 'Input Jadwal Baru' : tab}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#FFF9F2] rounded-[2.5rem] shadow-sm border border-orange-100 min-h-[500px] overflow-hidden p-8">
        {activeTab === 'Rincian' && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-800">{isAdmin ? 'Master Pool Jadwal' : `Jadwal Mengajar - ${user.name}`}</h3>
              <div className="flex space-x-3">
                {isAdmin && (
                  <button onClick={handleDownloadScheduleTemplate} className="flex items-center space-x-3 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-2xl font-black transition-all shadow-xl active:scale-95">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    <span>Template Excel</span>
                  </button>
                )}
                <button onClick={() => setActiveTab('Pilih Jadwal')} className="flex items-center space-x-3 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-xl active:scale-95">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                  <span>{isAdmin ? 'Tambah Master MK' : 'Tambah MK'}</span>
                </button>
              </div>
            </div>
            {isAdmin ? (
              <CourseTable courses={availableSchedules} onDelete={(id) => updateGlobalPool(availableSchedules.filter(s => s.id !== id))} />
            ) : (
              myCourses.length > 0 ? <CourseTable courses={myCourses} onDelete={handleDeleteCourse} /> : (
                <div className="py-24 text-center flex flex-col items-center">
                  <div className="bg-[#F1F5F9] w-36 h-36 rounded-full flex items-center justify-center mb-10 shadow-inner group">
                    <svg className="w-16 h-16 text-slate-300 group-hover:scale-110 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>
                  </div>
                  <h4 className="text-3xl font-black text-slate-800 mb-4">Jadwal Masih Kosong</h4>
                  <button onClick={() => setActiveTab('Pilih Jadwal')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-5 rounded-[2rem] font-black text-xl transition-all shadow-2xl active:scale-95">Pilih Mata Kuliah</button>
                </div>
              )
            )}
          </div>
        )}

        {activeTab === 'Pilih Jadwal' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
            {isAdmin ? (
              <CreateCourseForm onSave={handleAdminCreateSchedule} onBulkSave={handleAdminBulkCreateSchedule} onCancel={() => setActiveTab('Rincian')} selectedPeriodLabel={ACADEMIC_PERIODS.find(p => p.id === selectedPeriod)?.label || ''} />
            ) : (
              <div className="space-y-10">
                <div className="border-b border-orange-100 pb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div><h4 className="text-3xl font-black text-slate-800 mb-3">Pilih Jadwal Kuliah</h4></div>
                  <div className="flex space-x-4"><button onClick={() => requestSort('name')} className="px-4 py-2 rounded-lg text-sm font-black bg-indigo-600 text-white">Nama</button></div>
                </div>
                <div className="grid grid-cols-1 gap-8">
                  {(sortedData as AvailableSchedule[]).filter(s => !s.claimants.some(c => c.nip === user.nip)).map(schedule => {
                    const isFull = schedule.claimants.length >= MAX_LECTURERS;
                    return (
                      <div key={schedule.id} className={`bg-white border border-slate-100 p-8 rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between hover:shadow-2xl transition-all ${isFull ? 'opacity-70' : ''}`}>
                        <div><h5 className="font-black text-2xl text-slate-800">{schedule.name}</h5><p>{schedule.day} | {schedule.startTime} - {schedule.endTime}</p></div>
                        <button onClick={() => !isFull && handleDosenPickSchedule(schedule.id)} disabled={isFull} className={`px-10 py-5 rounded-[2rem] font-black text-xl ${isFull ? 'bg-slate-300' : 'bg-indigo-600 text-white'}`}>{isFull ? 'Penuh' : 'Pilih Jadwal'}</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'Monitoring' && isAdmin && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex justify-between items-center mb-10">
              <h4 className="text-3xl font-black text-slate-800">Monitoring Jadwal</h4>
              <button onClick={handleExportPDF} className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-black">Download PDF</button>
            </div>
            <table className="w-full border-separate border-spacing-y-4">
              <thead><tr className="text-slate-400"><th>MK</th><th>Kelas</th><th>Status</th><th>Pengampu</th></tr></thead>
              <tbody>
                {(sortedData as AvailableSchedule[]).map(s => (
                  <tr key={s.id} className="bg-white p-6 shadow-sm">
                    <td>{s.name}</td><td>{s.classCode}</td><td>{s.claimants.length}/2</td><td>{s.claimants.map(c => c.name).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Master Dosen' && isAdmin && (
          <div className="animate-in fade-in slide-in-from-left-8 duration-500">
            <div className="flex justify-between items-center mb-10">
              <h4 className="text-3xl font-black text-slate-800">Master Dosen</h4>
              <div className="flex space-x-3">
                <button onClick={handleDownloadTemplate} className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black">Template Excel</button>
                <button onClick={() => setShowAddDosen(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black">Tambah Dosen</button>
              </div>
            </div>
            {showAddDosen && (
              <form onSubmit={handleAddLecturer} className="p-8 bg-white border-2 border-emerald-100 rounded-[2rem] mb-10 grid grid-cols-3 gap-6">
                <input type="text" value={newDosen.name} onChange={e => setNewDosen({...newDosen, name: e.target.value})} className="border p-3" placeholder="Nama" required />
                <input type="text" value={newDosen.nip} onChange={e => setNewDosen({...newDosen, nip: e.target.value})} className="border p-3" placeholder="NIP" required />
                <button type="submit" className="bg-emerald-600 text-white font-bold">Simpan</button>
              </form>
            )}
            <table className="w-full border-separate border-spacing-y-4 text-left">
              <thead><tr><th>Nama</th><th>NIP</th><th>Aksi</th></tr></thead>
              <tbody>
                {lecturersList.map(l => (
                  <tr key={l.nip} className="bg-white p-6"><td>{l.name}</td><td>{l.nip}</td><td><button onClick={() => handleDeleteLecturer(l.nip)} className="text-red-500 font-bold">Hapus</button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
