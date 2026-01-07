
import React, { useState, useEffect } from 'react';
import { User, TabType } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Simple persistence check
  useEffect(() => {
    const savedUser = localStorage.getItem('academic_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (nip: string, name: string, role: 'Dosen' | 'Admin', nmJabatanFungsional?: string) => {
    const newUser: User = { nip, name, role, nmJabatanFungsional };
    setUser(newUser);
    setIsAuthenticated(true);
    localStorage.setItem('academic_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('academic_user');
  };

  const handleGoHome = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Beranda</span>
          </button>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black tracking-tight uppercase leading-none mb-1">{user?.name}</p>
            {user?.nmJabatanFungsional && (
              <p className="text-[11px] text-indigo-200 font-black uppercase tracking-widest leading-none mb-1">
                {user.nmJabatanFungsional}
              </p>
            )}
            <p className="text-[10px] text-indigo-300 font-bold opacity-80 leading-none">
              NIP: {user?.nip} • {user?.role}
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-bold transition-all border border-white/30 shadow-sm active:scale-95 flex items-center space-x-2"
          >
            <span>Logout</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        <Dashboard key={refreshKey} user={user!} />
      </main>

      <footer className="bg-white border-t p-4 text-center text-slate-500 text-sm">
        &copy; 2024 Sistem Akademik PDB. Built for Modern Educators.
      </footer>
    </div>
  );
};

export default App;
