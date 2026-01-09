import React, { useState } from 'react';
import { loginApi, downloadDatabaseBackup } from '../dbService';

interface LoginProps {
  onLogin: (nip: string, name: string, role: 'Dosen' | 'Admin', nmJabatanFungsional?: string) => void;
}

type LoginState = 'SELECT_ROLE' | 'LOGIN_FORM';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [view, setView] = useState<LoginState>('SELECT_ROLE');
  const [selectedRole, setSelectedRole] = useState<'Dosen' | 'Admin' | null>(null);
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectRole = (role: 'Dosen' | 'Admin') => {
    setSelectedRole(role);
    setView('LOGIN_FORM');
    setError(null);
    setNip('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = await loginApi(nip, password);
      
      if (user) {
        if (user.role !== selectedRole) {
          setError(`Akun ini bukan akun ${selectedRole}. Silakan ganti peran login.`);
        } else {
          onLogin(user.nip, user.name, user.role, user.nmJabatanFungsional);
        }
      } else {
        setError("NIP atau Kata Sandi salah.");
      }
    } catch (err) {
      setError("Terjadi kesalahan koneksi server.");
    } finally {
      setLoading(false);
    }
  };

  if (view === 'SELECT_ROLE') {
    return (
      <div className="min-h-screen bg-[#3730A3] flex items-center justify-center p-4 relative">
        {/* Tombol Backup DB di Halaman Depan */}
        <div className="absolute top-6 right-6 z-10">
            <button
                onClick={downloadDatabaseBackup}
                className="flex items-center space-x-2 text-indigo-200 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl backdrop-blur-md border border-white/10 active:scale-95"
                title="Download Backup Database"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="text-sm font-bold">Backup Database</span>
            </button>
        </div>

        <div className="w-full max-w-4xl">
          <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Sistem Akademik PDB</h1>
            <p className="text-indigo-100 text-lg">Selamat datang di Sistem Informasi Akademik. Pilih sesi login Anda.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
            {/* Dosen Option */}
            <button 
              onClick={() => handleSelectRole('Dosen')}
              className="group bg-[#FFF9F2] p-10 rounded-[2.5rem] shadow-2xl transition-all hover:scale-105 active:scale-95 text-left flex flex-col items-center md:items-start animate-in slide-in-from-left-8 duration-700"
            >
              <div className="bg-indigo-100 p-6 rounded-3xl mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-colors text-indigo-600 shadow-sm">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14l9-5-9-5-9 5 9 5z" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-slate-800 mb-2">Portal Dosen</h3>
              <p className="text-slate-500 text-lg text-center md:text-left">Kelola jadwal kuliah dan koordinasi ruang kelas secara efisien.</p>
              <div className="mt-8 flex items-center text-indigo-600 font-bold group-hover:translate-x-2 transition-transform">
                <span>Masuk Sekarang</span>
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </button>

            {/* Admin Option */}
            <button 
              onClick={() => handleSelectRole('Admin')}
              className="group bg-[#FFF9F2] p-10 rounded-[2.5rem] shadow-2xl transition-all hover:scale-105 active:scale-95 text-left flex flex-col items-center md:items-start animate-in slide-in-from-right-8 duration-700"
            >
              <div className="bg-orange-100 p-6 rounded-3xl mb-8 group-hover:bg-orange-600 group-hover:text-white transition-colors text-orange-600 shadow-sm">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-slate-800 mb-2">Portal Admin</h3>
              <p className="text-slate-500 text-lg text-center md:text-left">Manajemen data master jadwal, periode akademik, dan kontrol sistem.</p>
              <div className="mt-8 flex items-center text-orange-600 font-bold group-hover:translate-x-2 transition-transform">
                <span>Masuk Sekarang</span>
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#3730A3] flex items-center justify-center p-4">
      <div className="bg-[#FFF9F2] w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="p-10 pb-8">
          <button 
            onClick={() => setView('SELECT_ROLE')}
            className="flex items-center text-slate-400 hover:text-indigo-600 transition-colors font-bold mb-6 group"
          >
            <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali
          </button>

          {/* Icon Based on Role */}
          <div className="flex justify-center mb-10">
            <div className={`${selectedRole === 'Admin' ? 'bg-orange-100' : 'bg-indigo-100'} p-6 rounded-full`}>
              {selectedRole === 'Admin' ? (
                <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              )}
            </div>
          </div>

          <h2 className="text-[2.5rem] font-bold text-center text-[#1E293B] mb-2 leading-tight">Portal {selectedRole}</h2>
          <p className="text-[#64748B] text-center text-lg mb-10">
            {selectedRole === 'Dosen' ? 'Akses Manajemen Jadwal Kuliah' : 'Silakan masuk untuk mengelola sistem'}
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl animate-in shake-in duration-300">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-bold text-[#1E293B]">NIP / Username</label>
              <input
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder={selectedRole === 'Admin' ? 'admin' : 'Masukkan NIP'}
                className="w-full px-5 py-4 rounded-2xl border border-[#E2E8F0] bg-[#FFF9F2] focus:ring-2 focus:ring-[#5046E5] focus:border-[#5046E5] transition-all outline-none text-lg text-slate-600 placeholder:text-slate-300"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-[#1E293B]">Kata Sandi</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={selectedRole === 'Admin' ? 'admin' : 'NIP sebagai Sandi'}
                className="w-full px-5 py-4 rounded-2xl border border-[#E2E8F0] bg-[#FFF9F2] focus:ring-2 focus:ring-[#5046E5] focus:border-[#5046E5] transition-all outline-none text-lg text-slate-600 placeholder:text-slate-300"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${selectedRole === 'Admin' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-[#5046E5] hover:bg-[#4338CA]'} text-white font-bold py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center space-x-3 text-lg active:scale-95`}
            >
              {loading ? (
                <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  <span>Masuk Sekarang</span>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="bg-[#FFF4E5] p-10 text-center border-t border-[#F1F5F9]">
          <p className="text-base text-[#64748B] italic font-medium leading-relaxed">
            "Fokus pada efisiensi akademik untuk masa depan yang lebih cerah."
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;