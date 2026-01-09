
import React, { useState, useEffect } from 'react';
import { User } from './types.ts';
import { ACADEMIC_PERIODS } from './constants.tsx';
import Login from './components/Login.tsx';
import Dashboard from './components/Dashboard.tsx';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const env = (window as any).process.env;
  const isGasConfigValid = env.GAS_API_URL && !env.GAS_API_URL.includes("MASUKKAN_URL");

  useEffect(() => {
    const savedUser = localStorage.getItem('academic_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem('academic_user');
      }
    }
  }, []);

  if (!isGasConfigValid) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-[3rem] max-w-md w-full shadow-2xl">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-4">API GAS Belum Siap</h2>
          <p className="text-slate-500 font-medium mb-8">
            Silakan masukkan URL Web App Google Apps Script Anda ke dalam <code className="bg-slate-100 px-2 py-1 rounded text-indigo-600">index.html</code>.
          </p>
          <a href="https://script.google.com" target="_blank" rel="noreferrer" className="block w-full bg-indigo-600 text-white font-black py-4 rounded-2xl">
            Buka Google Apps Script
          </a>
        </div>
      </div>
    );
  }

  const handleLogin = (nip: string, name: string, role: 'Dosen' | 'Admin', nmJabatanFungsional?: string) => {
    const newUser: User = { nip, name, role, nmJabatanFungsional };
    setUser(newUser);
    setIsAuthenticated(true);
    localStorage.setItem('academic_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setSelectedSemesterId(null);
    localStorage.removeItem('academic_user');
  };

  const handleGoHome = () => {
    setSelectedSemesterId(null);
    setRefreshKey(prev => prev + 1);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  if (!selectedSemesterId) {
    return (
      <div className="min-h-screen bg-[#3730A3] flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-[#FFF9F2] rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="p-10 md:p-16 text-center">
            <div className="bg-indigo-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 text-indigo-600">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-4xl font-black text-slate-800 mb-4">Pilih Semester</h2>
            <div className="space-y-4 max-w-md mx-auto">
              {ACADEMIC_PERIODS.map(period => (
                <button
                  key={period.id}
                  onClick={() => setSelectedSemesterId(period.id)}
                  className="w-full bg-white border-2 border-slate-100 hover:border-indigo-500 p-6 rounded-[2rem] flex items-center justify-between transition-all group"
                >
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-400 uppercase mb-1">{period.tahunAkademik}</p>
                    <p className="text-xl font-black text-slate-800 group-hover:text-indigo-600">{period.namaSemester}</p>
                  </div>
                  <div className="p-3 bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white rounded-2xl">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={handleLogout} className="mt-12 text-slate-400 font-bold hover:text-red-500 underline underline-offset-4">Logout</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-indigo-700 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={handleGoHome}>
            <div className="bg-white/20 p-2 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" />
              </svg>
            </div>
            <h1 className="font-bold text-xl">Siakad PDB (GAS)</h1>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black tracking-tight leading-none mb-1">{user?.name}</p>
            <p className="text-[10px] text-indigo-300 font-bold opacity-80">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-bold border border-white/30">Logout</button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        <Dashboard key={`${refreshKey}-${selectedSemesterId}`} user={user!} initialPeriodId={selectedSemesterId} />
      </main>

      <footer className="bg-white border-t p-4 text-center text-slate-500 text-sm">
        &copy; 2024 Siakad PDB - Google Sheets Connected.
      </footer>
    </div>
  );
};

export default App;
