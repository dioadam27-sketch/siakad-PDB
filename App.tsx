
import React, { useState, useEffect } from 'react';
import { User } from './types.ts';
import { ACADEMIC_PERIODS } from './constants.tsx';
import Login from './components/Login.tsx';
import Dashboard from './components/Dashboard.tsx';
import { isFirebaseConfigValid } from './firebaseConfig.ts';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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

  if (!isFirebaseConfigValid) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[3rem] max-w-md w-full shadow-2xl text-center">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Konfigurasi Belum Siap</h2>
          <p className="text-slate-500 font-medium mb-8 leading-relaxed">
            Firebase belum dikonfigurasi. Harap isi variabel lingkungan di <code className="bg-slate-100 px-2 py-1 rounded text-indigo-600 font-bold">index.html</code> sesuai dengan Project Firebase Anda.
          </p>
          <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="block w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all">
            Buka Firebase Console
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
            <h2 className="text-4xl font-black text-slate-800 mb-4 tracking-tight">Pilih Semester Akademik</h2>
            <p className="text-slate-500 text-lg mb-12 font-medium">Selamat datang, {user?.name}. Silakan tentukan periode akademik untuk sesi ini.</p>
            
            <div className="space-y-4 max-w-md mx-auto">
              {ACADEMIC_PERIODS.map(period => (
                <button
                  key={period.id}
                  onClick={() => setSelectedSemesterId(period.id)}
                  className="w-full bg-white border-2 border-slate-100 hover:border-indigo-500 p-6 rounded-[2rem] flex items-center justify-between transition-all group hover:shadow-xl hover:-translate-y-1 active:scale-95"
                >
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{period.tahunAkademik}</p>
                    <p className="text-xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{period.namaSemester}</p>
                  </div>
                  <div className="p-3 bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white rounded-2xl transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
            
            <button 
              onClick={handleLogout}
              className="mt-12 text-slate-400 font-bold hover:text-red-500 transition-colors text-sm underline underline-offset-4"
            >
              Logout dari Akun
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-indigo-700 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={handleGoHome}>
            <div className="bg-white/20 p-2 rounded-lg group-hover:bg-white/30 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="font-bold text-xl hidden sm:block">Sistem Akademik PDB</h1>
          </div>
          <button 
            onClick={handleGoHome}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-sm font-bold border border-white/20"
          >
            <span>Ganti Semester</span>
          </button>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black tracking-tight uppercase leading-none mb-1">{user?.name}</p>
            <p className="text-[10px] text-indigo-300 font-bold opacity-80 leading-none">
              NIP: {user?.nip} • {user?.role}
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-bold transition-all border border-white/30 shadow-sm active:scale-95 flex items-center space-x-2"
          >
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        <Dashboard key={`${refreshKey}-${selectedSemesterId}`} user={user!} initialPeriodId={selectedSemesterId} />
      </main>

      <footer className="bg-white border-t p-4 text-center text-slate-500 text-sm">
        &copy; 2024 Sistem Akademik PDB - Cloud Sync Enabled.
      </footer>
    </div>
  );
};

export default App;
