
import React, { useState, useEffect, useMemo } from 'react';
import { User, Course, AvailableSchedule } from '../types';
import { ACADEMIC_PERIODS, INITIAL_AVAILABLE_SCHEDULES } from '../constants';
import CourseTable from './CourseTable';
import CreateCourseForm from './CreateCourseForm';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DashboardProps {
  user: User;
}

type TabKey = 'Rincian' | 'Pilih Jadwal' | 'Monitoring';

type SortConfig = {
  key: keyof AvailableSchedule;
  direction: 'asc' | 'desc';
} | null;

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [selectedPeriod, setSelectedPeriod] = useState(ACADEMIC_PERIODS[0].id);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [availableSchedules, setAvailableSchedules] = useState<AvailableSchedule[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('Rincian');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });

  const isAdmin = user.role === 'Admin';
  const MAX_LECTURERS = 2;

  // Load state from local storage
  useEffect(() => {
    const savedMyCourses = localStorage.getItem(`my_courses_${user.nip}`);
    const savedAvailable = localStorage.getItem('available_schedules_pool');
    
    if (savedMyCourses) {
      setMyCourses(JSON.parse(savedMyCourses));
    }

    if (savedAvailable) {
      setAvailableSchedules(JSON.parse(savedAvailable));
    } else {
      setAvailableSchedules(INITIAL_AVAILABLE_SCHEDULES);
      localStorage.setItem('available_schedules_pool', JSON.stringify(INITIAL_AVAILABLE_SCHEDULES));
    }
  }, [user.nip]);

  // Sync personal courses
  useEffect(() => {
    localStorage.setItem(`my_courses_${user.nip}`, JSON.stringify(myCourses));
  }, [myCourses, user.nip]);

  // Global sync helper
  const updateGlobalPool = (pool: AvailableSchedule[]) => {
    setAvailableSchedules(pool);
    localStorage.setItem('available_schedules_pool', JSON.stringify(pool));
  };

  const handleAdminCreateSchedule = (newSchedule: AvailableSchedule) => {
    updateGlobalPool([...availableSchedules, newSchedule]);
    setActiveTab('Rincian');
  };

  const handleDosenPickSchedule = (scheduleId: string) => {
    const schedule = availableSchedules.find(s => s.id === scheduleId);
    
    if (schedule) {
      const alreadyPicked = schedule.claimants.some(c => c.nip === user.nip);
      if (alreadyPicked) {
        alert("Anda sudah mengambil jadwal ini.");
        return;
      }

      if (schedule.claimants.length >= MAX_LECTURERS) {
        alert("Maaf, jadwal ini sudah penuh (maksimal 2 dosen).");
        return;
      }

      const newClaimant = { 
        nip: user.nip, 
        name: user.name, 
        jabatan: user.nmJabatanFungsional 
      };

      const updatedPool = availableSchedules.map(s => 
        s.id === scheduleId ? { 
          ...s, 
          isClaimed: true,
          claimants: [...s.claimants, newClaimant]
        } : s
      );

      setMyCourses(prev => [...prev, { ...schedule }]);
      updateGlobalPool(updatedPool);
      setActiveTab('Rincian');
    }
  };

  const handleDeleteCourse = (id: string) => {
    // Remove from user's personal list
    setMyCourses(prev => prev.filter(c => c.id !== id));
    
    // Remove user from global pool claimants
    const updatedPool = availableSchedules.map(s => {
      if (s.id === id) {
        const remainingClaimants = s.claimants.filter(c => c.nip !== user.nip);
        return {
          ...s,
          claimants: remainingClaimants,
          isClaimed: remainingClaimants.length > 0
        };
      }
      return s;
    });
    
    updateGlobalPool(updatedPool);
  };

  const sortedSchedules = useMemo(() => {
    let sortableItems = [...availableSchedules];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aVal = (a[sortConfig.key as keyof AvailableSchedule] || '').toString().toLowerCase();
        const bVal = (b[sortConfig.key as keyof AvailableSchedule] || '').toString().toLowerCase();
        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [availableSchedules, sortConfig]);

  const requestSort = (key: keyof AvailableSchedule) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF('landscape');
      
      doc.setFontSize(18);
      doc.text('Laporan Monitoring Jadwal PDB', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      const periodLabel = ACADEMIC_PERIODS.find(p => p.id === selectedPeriod)?.label || '';
      doc.text(`Periode: ${periodLabel}`, 14, 28);
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 34);
      
      const headers = [["No", "Mata Kuliah", "Kelas", "Hari", "Waktu", "Ruang", "Status", "Pengampu"]];
      const rows = sortedSchedules.map((s, index) => [
        index + 1,
        `${s.name}\n(${s.code})`,
        s.classCode,
        s.day || '-',
        `${s.startTime || '-'} - ${s.endTime || '-'}`,
        s.room || '-',
        s.claimants.length >= MAX_LECTURERS ? "Penuh" : (s.claimants.length > 0 ? `Terisi (${s.claimants.length})` : "Kosong"),
        s.claimants.length > 0 
          ? s.claimants.map(c => `${c.name} (${c.nip})`).join('\n') 
          : "Belum Ada"
      ]);

      autoTable(doc, {
        head: headers,
        body: rows,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 50 },
          2: { cellWidth: 20 },
          7: { cellWidth: 70 }
        },
        didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.text(`Halaman ${data.pageNumber}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
        }
      });

      doc.save(`Monitoring_Jadwal_PDB_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("PDF Export failed", err);
      alert("Terjadi kesalahan saat mengekspor PDF. Pastikan library telah dimuat sepenuhnya.");
    }
  };

  const tabs: TabKey[] = isAdmin ? ['Rincian', 'Pilih Jadwal', 'Monitoring'] : ['Rincian', 'Pilih Jadwal'];

  return (
    <div className="space-y-6 animate-in fade-in duration-700 max-w-7xl mx-auto px-4 py-8">
      <div className="bg-[#FFF9F2] rounded-[2rem] shadow-sm border border-orange-100 p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">
              {isAdmin ? 'Manajemen Master Jadwal' : 'Manajemen Jadwal & Ruang'}
            </h2>
            <p className="text-slate-500 text-lg">
              {isAdmin 
                ? 'Kelola master jadwal dan pantau pilihan jadwal oleh para Dosen.' 
                : 'Lihat rincian jadwal mengajar Anda atau pilih dari jadwal yang tersedia.'}
            </p>
          </div>
          <div className="flex items-center">
            <div className="relative group">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-2xl px-6 py-4 pr-12 font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 outline-none cursor-pointer hover:border-indigo-300 transition-all text-base shadow-sm"
              >
                {ACADEMIC_PERIODS.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-indigo-500 transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
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
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {isAdmin && tab === 'Pilih Jadwal' ? 'Input Jadwal Baru' : tab}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#FFF9F2] rounded-[2.5rem] shadow-sm border border-orange-100 min-h-[500px] overflow-hidden">
        <div className="p-8">
          {activeTab === 'Rincian' && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-800">
                  {isAdmin ? 'Master Pool Jadwal' : `Jadwal Mengajar - ${user.name}`}
                </h3>
                <button 
                  onClick={() => setActiveTab('Pilih Jadwal')}
                  className="flex items-center space-x-3 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-xl hover:shadow-indigo-200 active:scale-95"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{isAdmin ? 'Tambah Master MK' : 'Tambah MK'}</span>
                </button>
              </div>

              {isAdmin ? (
                <CourseTable 
                  courses={availableSchedules} 
                  onDelete={(id) => updateGlobalPool(availableSchedules.filter(s => s.id !== id))} 
                />
              ) : (
                myCourses.length > 0 ? (
                  <CourseTable courses={myCourses} onDelete={handleDeleteCourse} />
                ) : (
                  <div className="py-24 text-center flex flex-col items-center">
                    <div className="bg-[#F1F5F9] w-36 h-36 rounded-full flex items-center justify-center mb-10 shadow-inner group">
                      <svg className="w-16 h-16 text-slate-300 group-hover:scale-110 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <h4 className="text-3xl font-black text-slate-800 mb-4">Jadwal Masih Kosong</h4>
                    <p className="text-slate-500 max-w-xl mx-auto mb-12 text-xl font-medium leading-relaxed">
                      Anda belum memilih mata kuliah untuk periode ini. <br/> Silakan pilih dari jadwal yang telah diinput Admin.
                    </p>
                    <button 
                      onClick={() => setActiveTab('Pilih Jadwal')}
                      className="inline-flex items-center space-x-3 bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-5 rounded-[2rem] font-black text-xl transition-all shadow-2xl hover:shadow-indigo-200 active:scale-95"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Pilih Mata Kuliah Sekarang</span>
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          {activeTab === 'Pilih Jadwal' && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
              {isAdmin ? (
                <CreateCourseForm 
                  onSave={handleAdminCreateSchedule} 
                  onCancel={() => setActiveTab('Rincian')} 
                  selectedPeriodLabel={ACADEMIC_PERIODS.find(p => p.id === selectedPeriod)?.label || ''}
                />
              ) : (
                <div className="space-y-10">
                  <div className="border-b border-orange-100 pb-8">
                    <h4 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Pilih Jadwal Kuliah</h4>
                    <p className="text-slate-500 text-lg font-medium">Klik "Pilih Jadwal" pada mata kuliah yang ingin Anda ambil untuk mengajar (Maksimal 2 Dosen per jadwal).</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-8">
                    {availableSchedules.filter(s => !s.claimants.some(c => c.nip === user.nip)).length > 0 ? (
                      availableSchedules
                        .filter(s => !s.claimants.some(c => c.nip === user.nip))
                        .map(schedule => {
                          const slotsLeft = MAX_LECTURERS - schedule.claimants.length;
                          const isFull = slotsLeft <= 0;
                          
                          return (
                            <div key={schedule.id} className={`bg-white border border-slate-100 p-8 rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between hover:shadow-2xl hover:border-indigo-100 transition-all group ${isFull ? 'opacity-70 grayscale-[0.5]' : 'active:scale-[0.99]'}`}>
                              <div className="flex items-start space-x-6">
                                <div className={`p-5 rounded-[1.5rem] transition-all duration-300 ${isFull ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                  </svg>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-4">
                                    <div className={`font-black text-2xl transition-colors ${isFull ? 'text-slate-400' : 'text-slate-800 group-hover:text-indigo-600'}`}>
                                      {schedule.name}
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${slotsLeft === 2 ? 'bg-emerald-100 text-emerald-600' : slotsLeft === 1 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                                      {slotsLeft > 0 ? `${slotsLeft} Slot Tersedia` : 'Penuh'}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-3 mb-4">
                                    <span className="bg-slate-100 px-3 py-1 rounded-lg text-xs font-black text-slate-500 tracking-tighter uppercase">{schedule.code}</span>
                                    <span className="text-sm font-bold text-slate-400">| SKS: {schedule.sks}</span>
                                    <span className="text-sm font-bold text-indigo-400 px-2 py-0.5 border border-indigo-100 rounded-md">KELAS {schedule.classCode}</span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-4 text-slate-500">
                                    <div className="flex items-center bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                                      <span className="w-3 h-3 rounded-full bg-emerald-500 mr-3 shadow-sm"></span>
                                      <span className="font-black text-base text-slate-700">{schedule.day}</span>
                                    </div>
                                    <div className="flex items-center font-extrabold text-base">
                                      <svg className="w-5 h-5 mr-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                      {schedule.startTime} - {schedule.endTime}
                                    </div>
                                    <div className="flex items-center font-black text-base text-indigo-700">
                                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                      {schedule.room}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <button 
                                onClick={() => !isFull && handleDosenPickSchedule(schedule.id)}
                                disabled={isFull}
                                className={`mt-8 md:mt-0 px-10 py-5 rounded-[2rem] font-black text-xl transition-all shadow-2xl ${isFull ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-200 hover:-translate-y-1 active:translate-y-0'}`}
                              >
                                {isFull ? 'Penuh' : 'Pilih Jadwal'}
                              </button>
                            </div>
                          );
                        })
                    ) : (
                      <div className="py-24 text-center bg-slate-100/50 rounded-[3rem] border-4 border-dashed border-slate-200">
                        <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
                          <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <h5 className="text-2xl font-black text-slate-800 mb-2">Semua Sudah Terambil</h5>
                        <p className="text-slate-500 text-lg font-medium px-12">Tidak ada jadwal master yang tersedia saat ini atau Anda sudah mengambil semua jadwal yang ada.</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-center pt-10">
                    <button 
                      onClick={() => setActiveTab('Rincian')}
                      className="text-slate-400 font-black text-lg hover:text-indigo-600 transition-all flex items-center space-x-3 group"
                    >
                      <svg className="w-6 h-6 group-hover:-translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                      <span>Kembali ke Jadwal Saya</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Monitoring' && isAdmin && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                  <h4 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Monitoring Pemilihan Jadwal</h4>
                  <p className="text-slate-500 text-lg font-medium">Pantau mata kuliah mana saja yang sudah diambil oleh Dosen pengampu. Klik judul kolom untuk sortir.</p>
                </div>
                <button 
                  onClick={handleExportPDF}
                  className="flex items-center space-x-3 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-xl hover:shadow-red-200 active:scale-95"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a2 2 0 00-.586-1.414l-5.414-5.414A2 2 0 0011.586 2H7a2 2 0 00-2 2v15a2 2 0 002 2z" />
                  </svg>
                  <span>Download PDF</span>
                </button>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-4">
                  <thead>
                    <tr className="text-slate-400">
                      <th 
                        className="px-6 py-2 text-xs font-black uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors"
                        onClick={() => requestSort('name')}
                      >
                        Mata Kuliah {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th 
                        className="px-6 py-2 text-xs font-black uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors"
                        onClick={() => requestSort('classCode')}
                      >
                        Kelas {sortConfig?.key === 'classCode' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th 
                        className="px-6 py-2 text-xs font-black uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors"
                        onClick={() => requestSort('isClaimed')}
                      >
                        Status {sortConfig?.key === 'isClaimed' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                      </th>
                      <th 
                        className="px-6 py-2 text-xs font-black uppercase tracking-widest cursor-pointer hover:text-indigo-600 transition-colors"
                      >
                        Dosen Pengampu
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSchedules.map((schedule) => (
                      <tr key={schedule.id} className="bg-white hover:bg-slate-50 transition-all group shadow-sm border border-slate-100">
                        <td className="px-6 py-6 rounded-l-[1.5rem] border-l border-t border-b border-slate-50">
                          <div className="font-black text-slate-800 text-lg">{schedule.name}</div>
                          <div className="text-xs text-slate-400 font-bold uppercase">{schedule.code}</div>
                        </td>
                        <td className="px-6 py-6 border-t border-b border-slate-50">
                          <span className="bg-slate-100 px-3 py-1 rounded-lg text-xs font-black text-slate-500 uppercase tracking-widest">
                            {schedule.classCode}
                          </span>
                        </td>
                        <td className="px-6 py-6 border-t border-b border-slate-100">
                          {schedule.claimants.length >= MAX_LECTURERS ? (
                            <div className="flex items-center text-red-600 font-bold text-sm">
                              <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                              Penuh (2/2)
                            </div>
                          ) : schedule.claimants.length > 0 ? (
                            <div className="flex items-center text-emerald-600 font-bold text-sm">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                              Terisi ({schedule.claimants.length}/2)
                            </div>
                          ) : (
                            <div className="flex items-center text-amber-500 font-bold text-sm">
                              <span className="w-2 h-2 rounded-full bg-amber-400 mr-2"></span>
                              Kosong (0/2)
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-6 rounded-r-[1.5rem] border-r border-t border-b border-slate-100">
                          {schedule.claimants.length > 0 ? (
                            <div className="space-y-3">
                              {schedule.claimants.map(claimant => (
                                <div key={claimant.nip} className="flex items-center space-x-3">
                                  <div className="bg-indigo-100 p-2 rounded-full shrink-0">
                                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                  </div>
                                  <div>
                                    <div className="font-black text-slate-800 text-sm">{claimant.name}</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">NIP: {claimant.nip} • {claimant.jabatan || 'Dosen'}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-300 italic text-sm">Belum ada pengampu</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
