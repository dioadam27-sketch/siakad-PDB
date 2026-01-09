
import React, { useState, useEffect, useMemo, memo } from 'react';
import { User, AvailableSchedule, Lecturer } from '../types.ts';
import { ACADEMIC_PERIODS, MOCK_ROOMS } from '../constants.tsx';
import CourseTable from './CourseTable.tsx';
import CreateCourseForm from './CreateCourseForm.tsx';
import * as dbService from '../dbService.ts';

const LecturerCard = memo(({ lecturer, onDelete }: { lecturer: Lecturer, onDelete: (nip: string) => void }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 flex justify-between items-center group hover:shadow-2xl transition-all border-l-[6px] hover:border-l-indigo-600 animate-in fade-in duration-300">
    <div className="space-y-1 overflow-hidden">
      <p className="font-black text-slate-800 text-lg leading-tight truncate">{lecturer.name}</p>
      <p className="text-[10px] font-bold text-slate-400 tracking-[0.1em]">NIP/NIM. {lecturer.nip}</p>
      <p className="text-[10px] font-bold text-indigo-500 tracking-wider bg-indigo-50 inline-block px-2 py-0.5 rounded-lg mt-1">{lecturer.nmJabatanFungsional || '-'}</p>
    </div>
    <button onClick={() => onDelete(lecturer.nip)} className="p-3 text-slate-200 hover:text-red-500 rounded-2xl transition-all ml-2 flex-shrink-0 hover:bg-red-50">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
    </button>
  </div>
));

interface DashboardProps {
  user: User;
  initialPeriodId?: string;
}

type TabKey = 'Rincian' | 'Pilih Jadwal' | 'Monitoring' | 'Master Dosen';

const Dashboard: React.FC<DashboardProps> = ({ user, initialPeriodId }) => {
  const [globalActivePeriodId, setGlobalActivePeriodId] = useState(dbService.getActivePeriodId());
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriodId || dbService.getActivePeriodId());
  const [availableSchedules, setAvailableSchedules] = useState<AvailableSchedule[]>([]);
  const [lecturersList, setLecturersList] = useState<Lecturer[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('Rincian');
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingPage, setIsSwitchingPage] = useState(false);
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'synced'>('syncing');

  const [showAddLecturerModal, setShowAddLecturerModal] = useState(false);
  const [newLecturer, setNewLecturer] = useState({ name: '', nip: '', nmJabatanFungsional: 'Asisten Ahli' });

  const isAdmin = user.role === 'Admin';
  const MAX_LECTURERS = 2;

  useEffect(() => {
    const unsubSchedules = dbService.subscribeToSchedules((data) => {
      setAvailableSchedules(data);
      setSyncStatus('synced');
      setIsLoading(false);
    });

    const unsubLecturers = dbService.subscribeToLecturers((data) => {
      setLecturersList(data);
    });

    const unsubActivePeriod = dbService.subscribeToActivePeriod((id) => {
      setGlobalActivePeriodId(id);
      if (!isAdmin && !initialPeriodId) {
        setSelectedPeriod(id);
      }
    });

    return () => {
      unsubSchedules();
      unsubLecturers();
      unsubActivePeriod();
    };
  }, [isAdmin, initialPeriodId]);

  const selectedPeriodLabel = useMemo(() => {
    return ACADEMIC_PERIODS.find(p => p.id === selectedPeriod)?.label || '';
  }, [selectedPeriod]);

  const handlePeriodChange = (newPeriodId: string) => {
    setIsSwitchingPage(true);
    setSelectedPeriod(newPeriodId);
    setShowPeriodPicker(false);
    setTimeout(() => setIsSwitchingPage(false), 200);
  };

  const currentPeriodSchedules = useMemo(() => {
    return availableSchedules.filter(s => s.academicYear === selectedPeriodLabel);
  }, [availableSchedules, selectedPeriodLabel]);

  const myCourses = useMemo(() => {
    return currentPeriodSchedules.filter(s => s.claimants?.some(c => c.nip === user.nip));
  }, [currentPeriodSchedules, user.nip]);

  const availableToPick = useMemo(() => {
    return currentPeriodSchedules.filter(s => !s.claimants?.some(c => c.nip === user.nip));
  }, [currentPeriodSchedules, user.nip]);

  const handleAdminCreateSchedule = async (newSchedule: AvailableSchedule) => {
    setSyncStatus('syncing');
    await dbService.addScheduleToDb(newSchedule);
    setActiveTab('Rincian');
  };

  const handleAdminBulkCreateSchedule = async (newSchedules: AvailableSchedule[]) => {
    setSyncStatus('syncing');
    for (const s of newSchedules) {
      await dbService.addScheduleToDb(s);
    }
    setActiveTab('Rincian');
  };

  const handleDosenPickSchedule = async (scheduleId: string) => {
    try {
      setSyncStatus('syncing');
      const claimant = { nip: user.nip, name: user.name, jabatan: user.nmJabatanFungsional };
      // LANGKAH 2: Menulis klaim ke Google Sheets yang sama
      await dbService.claimScheduleInDb(scheduleId, claimant, MAX_LECTURERS);
      setActiveTab('Rincian');
    } catch (err: any) {
      alert(err.message);
      setSyncStatus('synced');
    }
  };

  const handleDeleteCourse = async (id: string) => {
    const msg = isAdmin ? "Hapus jadwal ini dari database pusat?" : "Batalkan klaim jadwal mengajar Anda?";
    if (window.confirm(msg)) {
      setSyncStatus('syncing');
      if (isAdmin) await dbService.deleteScheduleFromDb(id);
      else await dbService.unclaimScheduleInDb(id, user.nip);
    }
  };

  const handleAddLecturer = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!newLecturer.name || !newLecturer.nip) return alert("Wajib diisi.");
    try {
      setSyncStatus('syncing');
      await dbService.addLecturerToDb(newLecturer);
      setShowAddLecturerModal(false);
      setNewLecturer({ name: '', nip: '', nmJabatanFungsional: 'Asisten Ahli' });
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteLecturer = async (nip: string) => {
    if(confirm(`Hapus data dosen ini dari Cloud?`)) {
      setSyncStatus('syncing');
      await dbService.deleteLecturerFromDb(nip);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 animate-pulse">
        <div className="w-12 h-12 bg-indigo-100 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
        <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Sinkronisasi Cloud Sheets...</p>
      </div>
    );
  }

  const tabs: TabKey[] = isAdmin 
    ? ['Rincian', 'Pilih Jadwal', 'Monitoring', 'Master Dosen'] 
    : ['Rincian', 'Pilih Jadwal'];

  return (
    <div className={`space-y-6 max-w-7xl mx-auto pb-12 transition-all duration-300 ease-out ${isSwitchingPage ? 'opacity-40 blur-sm scale-98' : 'opacity-100'}`}>
      
      {/* ALUR BISNIS INDICATOR (Satu Database Google Sheets) */}
      {!isAdmin && (
        <div className="bg-indigo-900 text-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative group">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/5 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
          <div className="relative z-10">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300 mb-6">Alur Sinkronisasi Google Sheets</h4>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
              <div className={`flex items-center space-x-4 ${activeTab === 'Rincian' && myCourses.length === 0 ? 'opacity-100' : 'opacity-50'}`}>
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black">1</div>
                <div>
                  <p className="font-bold text-sm">Persiapan Admin</p>
                  <p className="text-[10px] text-indigo-300 font-medium">Data di Tab 'Schedules'</p>
                </div>
              </div>
              <div className="hidden md:block w-12 h-px bg-white/20"></div>
              <div className={`flex items-center space-x-4 ${activeTab === 'Pilih Jadwal' ? 'opacity-100' : 'opacity-50'}`}>
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black">2</div>
                <div>
                  <p className="font-bold text-sm">Klaim Dosen</p>
                  <p className="text-[10px] text-indigo-300 font-medium">Update Tab 'Schedules'</p>
                </div>
              </div>
              <div className="hidden md:block w-12 h-px bg-white/20"></div>
              <div className={`flex items-center space-x-4 ${activeTab === 'Rincian' && myCourses.length > 0 ? 'opacity-100' : 'opacity-50'}`}>
                <div className="w-10 h-10 rounded-full bg-emerald-400 text-indigo-900 flex items-center justify-center font-black">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <p className="font-bold text-sm">Tersimpan</p>
                  <p className="text-[10px] text-emerald-300 font-medium">File Sheets Terpusat</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 md:p-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-tight">
              {isAdmin ? 'Dashboard Admin PDB' : 'Portal Mengajar Dosen'}
            </h2>
            <div className="flex items-center space-x-3">
              <span className="text-slate-500 font-medium text-lg">Connected to</span>
              <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg font-black text-xs border border-emerald-100 uppercase tracking-widest">Single Google Sheet</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
             <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl flex items-center space-x-3 group">
               <span className={`w-2.5 h-2.5 rounded-full transition-colors ${syncStatus === 'syncing' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></span>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600">
                    {syncStatus === 'syncing' ? 'Processing...' : 'Sync Active'}
               </span>
             </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-10 mt-12 border-b border-slate-50">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-5 px-2 text-sm font-black uppercase tracking-widest transition-all border-b-[3px] -mb-[2px] ${
                activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 min-h-[500px] p-8 md:p-12 relative overflow-hidden">
        
        {activeTab === 'Rincian' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-3xl font-black text-slate-800">
                  {isAdmin ? `Database Master Jadwal` : 'Rekap Mengajar Saya'}
                </h3>
                <div className="flex items-center space-x-3 mt-3">
                  <div className="relative">
                    <button 
                      onClick={() => isAdmin && setShowPeriodPicker(!showPeriodPicker)}
                      className={`px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border flex items-center transition-all ${
                        isAdmin ? 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-200 cursor-default'
                      }`}
                    >
                      Semester: {selectedPeriodLabel}
                      {isAdmin && <svg className="w-3.5 h-3.5 ml-2 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>}
                    </button>
                    {showPeriodPicker && isAdmin && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden py-2 animate-in zoom-in-95 duration-200">
                        {ACADEMIC_PERIODS.map(p => (
                          <button key={p.id} onClick={() => handlePeriodChange(p.id)} className={`w-full text-left px-5 py-3 text-xs font-bold transition-colors hover:bg-slate-50 ${selectedPeriod === p.id ? 'text-indigo-600 bg-indigo-50/30' : 'text-slate-600'}`}>
                            {p.label} {globalActivePeriodId === p.id && ' (Aktif)'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {!isAdmin && <button onClick={() => setActiveTab('Pilih Jadwal')} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95">Klaim Jadwal Baru</button>}
            </div>
            {(isAdmin ? currentPeriodSchedules : myCourses).length > 0 ? (
              <CourseTable courses={isAdmin ? currentPeriodSchedules : myCourses} onDelete={handleDeleteCourse} />
            ) : (
              <div className="text-center py-32 border-[3px] border-dashed border-slate-50 rounded-[3rem] bg-slate-50/10">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" /></svg>
                </div>
                <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Belum ada rekaman jadwal di Google Sheets</p>
                {!isAdmin && <button onClick={() => setActiveTab('Pilih Jadwal')} className="mt-6 text-indigo-600 font-bold hover:underline">Lihat Jadwal Tersedia &rarr;</button>}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Pilih Jadwal' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
            {isAdmin ? (
              <CreateCourseForm 
                onSave={handleAdminCreateSchedule} 
                onBulkSave={handleAdminBulkCreateSchedule} 
                onCancel={() => setActiveTab('Rincian')} 
                selectedPeriodLabel={selectedPeriodLabel}
                existingSchedules={availableSchedules}
              />
            ) : (
              <div className="space-y-8">
                <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-start gap-4 mb-8">
                  <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-sm text-amber-800 font-medium leading-relaxed">
                    Setiap klaim yang Anda lakukan akan langsung mengupdate file Google Sheets pusat. 
                    Maksimal tim pengajar per kelas adalah <strong>{MAX_LECTURERS} Dosen</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {availableToPick.length > 0 ? availableToPick.map(s => {
                    const claimedCount = s.claimants?.length || 0;
                    const isFull = claimedCount >= MAX_LECTURERS;
                    return (
                      <div key={s.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 group hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
                        <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl text-[10px] font-black uppercase tracking-widest ${isFull ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-600'}`}>
                          {isFull ? 'PENUH' : `SISA ${MAX_LECTURERS - claimedCount} SLOT`}
                        </div>
                        <div className="space-y-4 flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-xl uppercase tracking-widest">{s.classCode}</span>
                            <h4 className="font-black text-xl text-slate-800">{s.name}</h4>
                          </div>
                          <p className="text-slate-500 font-bold text-sm">{s.day}, {s.startTime} - {s.endTime} @ {s.room}</p>
                          <div className="flex items-center gap-2">
                             {s.claimants?.length > 0 ? (
                               s.claimants.map(c => (
                                 <div key={c.nip} className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 border-2 border-white" title={c.name}>
                                   {c.name.charAt(0)}
                                 </div>
                               ))
                             ) : (
                               <span className="text-[10px] text-slate-300 font-bold italic uppercase tracking-widest">Belum ada tim pengajar</span>
                             )}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDosenPickSchedule(s.id)} 
                          disabled={isFull} 
                          className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-sm active:scale-95 ${isFull ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : 'bg-white text-indigo-600 border-2 border-indigo-50 hover:bg-indigo-600 hover:text-white'}`}
                        >
                          {isFull ? 'PENUH' : 'KLAIM SEKARANG'}
                        </button>
                      </div>
                    );
                  }) : (
                    <div className="md:col-span-2 text-center py-20 border-[3px] border-dashed border-slate-50 rounded-[3rem]">
                       <p className="text-slate-300 font-black text-xs uppercase tracking-widest">Tidak ada jadwal tersedia di periode ini</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ... Tab Monitoring & Master Dosen tetap sama ... */}
        {activeTab === 'Monitoring' && isAdmin && (
          <div className="animate-in fade-in duration-500">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-3xl font-black text-slate-800">Laporan Real-time Sheets</h3>
               <button onClick={() => window.print()} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all">Cetak Laporan</button>
             </div>
             <div className="overflow-x-auto rounded-[1.5rem] border border-slate-100">
               <table className="w-full text-left">
                 <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                   <tr><th className="py-6 px-6">Mata Kuliah</th><th className="py-6 px-6 text-center">Kelas</th><th className="py-6 px-6 text-center">Slot</th><th className="py-6 px-6">Dosen Pengajar</th></tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {currentPeriodSchedules.map(s => (
                     <tr key={s.id} className="text-sm hover:bg-slate-50/50 transition-colors">
                       <td className="py-6 px-6 font-black text-slate-800">{s.name}</td>
                       <td className="py-6 px-6 text-center font-bold text-slate-400">{s.classCode}</td>
                       <td className="py-6 px-6 text-center">
                         <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${(s.claimants?.length || 0) >= MAX_LECTURERS ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                           {s.claimants?.length || 0} / {MAX_LECTURERS}
                         </span>
                       </td>
                       <td className="py-6 px-6 text-xs font-bold text-slate-500">
                         {s.claimants && s.claimants.length > 0 ? (
                            <div className="space-y-1">
                              {s.claimants.map(c => <div key={c.nip} className="flex items-center space-x-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span><span>{c.name}</span></div>)}
                            </div>
                         ) : <span className="text-slate-300 italic">Belum ada dosen</span>}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {activeTab === 'Master Dosen' && isAdmin && (
           <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
             <div className="flex justify-between items-center">
               <div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">Master Dosen (Tab Lecturers)</h3>
                <p className="text-slate-500 text-sm font-medium mt-1">Daftar tenaga pendidik yang tersinkronisasi di Cloud.</p>
               </div>
               <button onClick={() => setShowAddLecturerModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-[1.25rem] font-bold text-xs uppercase tracking-wider hover:bg-indigo-700 shadow-lg shadow-indigo-100 flex items-center transition-all active:scale-95">
                 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                 Tambah Dosen
               </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {lecturersList.map(l => (
                 <LecturerCard key={l.nip} lecturer={l} onDelete={handleDeleteLecturer} />
               ))}
             </div>

             {showAddLecturerModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                  <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <h4 className="text-xl font-black text-slate-800">Registrasi Dosen Baru</h4>
                      <button onClick={() => setShowAddLecturerModal(false)} className="text-slate-400 hover:text-slate-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                    <form onSubmit={handleAddLecturer} className="p-8 space-y-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nama Lengkap & Gelar</label>
                          <input type="text" value={newLecturer.name} onChange={(e) => setNewLecturer({...newLecturer, name: e.target.value.toUpperCase()})} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500" placeholder="CONTOH: DR. FULAN, M.T." required />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nomor Induk Pegawai (NIP)</label>
                          <input type="text" value={newLecturer.nip} onChange={(e) => setNewLecturer({...newLecturer, nip: e.target.value})} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500" placeholder="18 DIGIT ANGKA" required />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Jabatan Fungsional</label>
                          <select value={newLecturer.nmJabatanFungsional} onChange={(e) => setNewLecturer({...newLecturer, nmJabatanFungsional: e.target.value})} className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold outline-none">
                            <option value="Asisten Ahli">Asisten Ahli</option>
                            <option value="Lektor">Lektor</option>
                            <option value="Lektor Kepala">Lektor Kepala</option>
                            <option value="Guru Besar">Guru Besar</option>
                            <option value="Tenaga Pengajar">Tenaga Pengajar</option>
                          </select>
                        </div>
                      </div>
                      <div className="pt-4 flex space-x-4">
                        <button type="button" onClick={() => setShowAddLecturerModal(false)} className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50">Batal</button>
                        <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95">Simpan Data</button>
                      </div>
                    </form>
                  </div>
                </div>
             )}
           </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
