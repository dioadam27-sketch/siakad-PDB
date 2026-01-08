
import React, { useState, useEffect, useMemo } from 'react';
import { User, AvailableSchedule } from '../types.ts';
import { ACADEMIC_PERIODS } from '../constants.tsx';
import CourseTable from './CourseTable.tsx';
import CreateCourseForm from './CreateCourseForm.tsx';
import * as dbService from '../dbService.ts';

interface DashboardProps {
  user: User;
  initialPeriodId?: string;
}

type TabKey = 'Rincian' | 'Pilih Jadwal' | 'Monitoring' | 'Master Dosen';

const Dashboard: React.FC<DashboardProps> = ({ user, initialPeriodId }) => {
  const [globalActivePeriodId, setGlobalActivePeriodId] = useState(dbService.getActivePeriodId());
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriodId || dbService.getActivePeriodId());
  const [availableSchedules, setAvailableSchedules] = useState<AvailableSchedule[]>([]);
  const [lecturersList, setLecturersList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('Rincian');
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingPage, setIsSwitchingPage] = useState(false);
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);

  const isAdmin = user.role === 'Admin';
  const MAX_LECTURERS = 2;

  useEffect(() => {
    const unsubSchedules = dbService.subscribeToSchedules((data) => {
      setAvailableSchedules(data);
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
    setTimeout(() => {
      setIsSwitchingPage(false);
    }, 300);
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
    await dbService.addScheduleToDb(newSchedule);
    setActiveTab('Rincian');
  };

  const handleAdminBulkCreateSchedule = async (newSchedules: AvailableSchedule[]) => {
    for (const s of newSchedules) {
      await dbService.addScheduleToDb(s);
    }
    setActiveTab('Rincian');
  };

  const handleDosenPickSchedule = async (scheduleId: string) => {
    try {
      const claimant = { nip: user.nip, name: user.name, jabatan: user.nmJabatanFungsional };
      await dbService.claimScheduleInDb(scheduleId, claimant, MAX_LECTURERS);
      setActiveTab('Rincian');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (isAdmin) {
      if (window.confirm("Hapus jadwal ini dari database master?")) {
        await dbService.deleteScheduleFromDb(id);
      }
    } else {
      if (window.confirm("Batalkan klaim jadwal mengajar Anda?")) {
        await dbService.unclaimScheduleInDb(id, user.nip);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-14 h-14 border-[5px] border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-bold tracking-wide uppercase text-xs">Memuat Data Akademik...</p>
      </div>
    );
  }

  const tabs: TabKey[] = isAdmin 
    ? ['Rincian', 'Pilih Jadwal', 'Monitoring', 'Master Dosen'] 
    : ['Rincian', 'Pilih Jadwal'];

  return (
    <div className={`space-y-6 max-w-7xl mx-auto pb-12 transition-all duration-500 ease-in-out ${isSwitchingPage ? 'opacity-0 scale-[0.98] blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
      {/* Header Section */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 md:p-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-tight">
              {isAdmin ? 'Dashboard Admin PDB' : 'Portal Mengajar Dosen'}
            </h2>
            <p className="text-slate-500 font-medium text-lg">
              Sistem koordinasi jadwal dan ruang kuliah terintegrasi.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
             <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl flex items-center space-x-3">
               <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sistem Online</span>
             </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-10 mt-12 border-b border-slate-50">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-5 px-2 text-sm font-black uppercase tracking-widest transition-all border-b-[3px] -mb-[2px] ${
                activeTab === tab 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 min-h-[600px] p-8 md:p-12">
        
        {/* Tab Rincian */}
        {activeTab === 'Rincian' && (
          <div className="space-y-10 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-3xl font-black text-slate-800">
                  {isAdmin ? `Data Induk Jadwal` : 'Jadwal Mengajar'}
                </h3>
                <div className="flex items-center space-x-3 mt-3">
                  <div className="relative">
                    <button 
                      onClick={() => isAdmin && setShowPeriodPicker(!showPeriodPicker)}
                      className={`px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border flex items-center transition-all ${
                        isAdmin ? 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-200 cursor-default'
                      }`}
                    >
                      <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                      Semester: {selectedPeriodLabel}
                      {isAdmin && (
                        <svg className="w-3.5 h-3.5 ml-2 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>
                    {showPeriodPicker && isAdmin && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden py-2 animate-in zoom-in-95 duration-200">
                        {ACADEMIC_PERIODS.map(p => (
                          <button 
                            key={p.id}
                            onClick={() => handlePeriodChange(p.id)}
                            className={`w-full text-left px-5 py-3 text-xs font-bold transition-colors hover:bg-slate-50 ${selectedPeriod === p.id ? 'text-indigo-600' : 'text-slate-600'}`}
                          >
                            {p.label} {globalActivePeriodId === p.id && ' (✓ Aktif)'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {globalActivePeriodId === selectedPeriod && (
                    <div className="px-3 py-1.5 bg-emerald-50 rounded-xl text-[11px] font-black text-emerald-600 uppercase tracking-wider border border-emerald-100 flex items-center">
                      <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                      </svg>
                      AKTIF
                    </div>
                  )}
                </div>
              </div>
              {!isAdmin && (
                <button 
                  onClick={() => setActiveTab('Pilih Jadwal')} 
                  className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                >
                  Tambah Jadwal
                </button>
              )}
            </div>
            {(isAdmin ? currentPeriodSchedules : myCourses).length > 0 ? (
              <CourseTable courses={isAdmin ? currentPeriodSchedules : myCourses} onDelete={handleDeleteCourse} />
            ) : (
              <div className="text-center py-32 border-[3px] border-dashed border-slate-100 rounded-[3rem] bg-slate-50/20">
                <div className="w-24 h-24 bg-white rounded-[2rem] shadow-sm border border-slate-50 flex items-center justify-center mx-auto mb-8">
                  <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-slate-600">Data Tidak Ditemukan</h4>
                <p className="text-slate-400 font-medium mt-2 max-w-sm mx-auto">
                  Belum ada rekaman jadwal untuk periode <span className="text-indigo-500 font-black">{selectedPeriodLabel}</span>.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab Pilih Jadwal */}
        {activeTab === 'Pilih Jadwal' && (
          <div className="space-y-10 animate-in slide-in-from-right-8 duration-700">
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
                <div className="bg-indigo-600 p-8 rounded-[2rem] shadow-2xl shadow-indigo-100 relative overflow-hidden">
                  <h4 className="text-white text-2xl font-black mb-2 relative z-10">Pendaftaran Mengajar - {selectedPeriodLabel}</h4>
                  <p className="text-indigo-100 text-sm font-medium relative z-10 opacity-80">Silakan pilih dan klaim jadwal kelas yang tersedia di bawah ini.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {availableToPick.length > 0 ? availableToPick.map(s => {
                    const claimedCount = s.claimants?.length || 0;
                    const remainingSlots = MAX_LECTURERS - claimedCount;
                    const isFull = remainingSlots <= 0;
                    
                    return (
                      <div key={s.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 group hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                        {/* Slot Badge */}
                        <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl text-[10px] font-black uppercase tracking-widest ${
                          isFull ? 'bg-slate-100 text-slate-400' : remainingSlots === 1 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {isFull ? 'PENUH' : `SISA ${remainingSlots} SLOT`}
                        </div>

                        <div className="space-y-4 flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-xl uppercase tracking-widest border border-indigo-100">{s.classCode}</span>
                            <h4 className="font-black text-xl text-slate-800 group-hover:text-indigo-600 transition-colors">{s.name}</h4>
                          </div>
                          <div className="space-y-2">
                             <p className="text-slate-500 font-bold text-sm flex items-center">
                               {s.day}, {s.startTime} - {s.endTime}
                             </p>
                             <p className="text-slate-500 font-bold text-sm flex items-center">
                               Ruang {s.room}
                             </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDosenPickSchedule(s.id)} 
                          disabled={isFull}
                          className={`w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-sm active:scale-95 ${
                            isFull 
                              ? 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100' 
                              : 'bg-white text-indigo-600 border-2 border-indigo-50 hover:bg-indigo-600 hover:text-white'
                          }`}
                        >
                          {isFull ? 'PENUH' : 'KLAIM JADWAL'}
                        </button>
                      </div>
                    );
                  }) : <div className="md:col-span-2 text-center py-32 border-[3px] border-dashed border-slate-100 rounded-[3rem] bg-slate-50/10">Tidak ada jadwal yang tersedia.</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Monitoring & Master Dosen */}
        {activeTab === 'Monitoring' && isAdmin && (
          <div className="animate-in fade-in duration-700">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-3xl font-black text-slate-800">Monitoring Pengampuan</h3>
               <button onClick={() => window.print()} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all">Cetak Laporan</button>
             </div>
             <div className="overflow-x-auto rounded-[1.5rem] border border-slate-100">
               <table className="w-full text-left">
                 <thead>
                   <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em]"><th className="py-6 px-6">Mata Kuliah PDB</th><th className="py-6 px-6 text-center">Kelas</th><th className="py-6 px-6 text-center">Kuota & Sisa Slot</th><th className="py-6 px-6">Dosen Terdaftar</th></tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {currentPeriodSchedules.map(s => {
                     const claimedCount = s.claimants?.length || 0;
                     const remaining = MAX_LECTURERS - claimedCount;
                     return (
                       <tr key={s.id} className="text-sm">
                         <td className="py-6 px-6 font-black text-slate-800 text-base">{s.name}</td>
                         <td className="py-6 px-6 text-center"><span className="bg-white px-4 py-2 rounded-xl border border-slate-100 font-black text-slate-600">{s.classCode}</span></td>
                         <td className="py-6 px-6 text-center">
                           <div className="flex flex-col items-center">
                             <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${remaining === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                               {claimedCount} / {MAX_LECTURERS} Terisi
                             </span>
                             <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                               {remaining === 0 ? 'Kuota Terpenuhi' : `Sisa ${remaining} Slot`}
                             </span>
                           </div>
                         </td>
                         <td className="py-6 px-6">{s.claimants?.map(c => <div key={c.nip} className="text-xs font-bold text-slate-600 leading-relaxed">• {c.name}</div>) || <span className="text-slate-300 italic">Belum ada dosen</span>}</td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
          </div>
        )}

        {activeTab === 'Master Dosen' && isAdmin && (
           <div className="space-y-10 animate-in fade-in duration-700">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-3xl font-black text-slate-800 tracking-tight">Database Tenaga Pendidik</h3>
               <div className="bg-indigo-600 text-white px-6 py-3 rounded-[1.25rem] font-black text-xs uppercase tracking-[0.2em]">{lecturersList.length} Dosen</div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {lecturersList.map(l => (
                 <div key={l.nip} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex justify-between items-center group hover:shadow-2xl transition-all border-l-[6px] hover:border-l-indigo-600">
                   <div className="space-y-1">
                     <p className="font-black text-slate-800 text-lg leading-tight truncate">{l.name}</p>
                     <p className="text-[10px] font-bold text-slate-400 tracking-[0.1em]">NIP. {l.nip}</p>
                   </div>
                   <button onClick={async () => { if(confirm(`Hapus data ${l.name}?`)) await dbService.deleteLecturerFromDb(l.nip); }} className="p-3 text-slate-200 hover:text-red-500 rounded-2xl transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                 </div>
               ))}
             </div>
           </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
