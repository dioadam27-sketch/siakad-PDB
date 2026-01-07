
import React from 'react';
import { Course } from '../types';

interface CourseTableProps {
  courses: Course[];
  onDelete?: (id: string) => void;
}

const CourseTable: React.FC<CourseTableProps> = ({ courses, onDelete }) => {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-separate border-spacing-y-4">
        <thead>
          <tr className="text-slate-400">
            <th className="px-6 py-2 text-xs font-black uppercase tracking-widest w-12 text-center">No</th>
            <th className="px-6 py-2 text-xs font-black uppercase tracking-widest">Mata Kuliah</th>
            <th className="px-6 py-2 text-xs font-black uppercase tracking-widest text-center">SKS</th>
            <th className="px-6 py-2 text-xs font-black uppercase tracking-widest text-center">KLS</th>
            <th className="px-6 py-2 text-xs font-black uppercase tracking-widest">Hari & Waktu</th>
            <th className="px-6 py-2 text-xs font-black uppercase tracking-widest">Ruang</th>
            {onDelete && <th className="px-6 py-2 text-xs font-black uppercase tracking-widest text-center">Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {courses.map((course, index) => (
            <tr key={course.id} className="bg-white hover:bg-slate-50 transition-all group shadow-sm hover:shadow-md">
              <td className="px-6 py-8 text-base text-slate-400 font-black text-center rounded-l-[1.5rem] border-l border-t border-b border-slate-100">{index + 1}</td>
              <td className="px-6 py-8 border-t border-b border-slate-100">
                <div className="font-black text-slate-800 text-xl leading-tight mb-1 group-hover:text-indigo-600 transition-colors">{course.name}</div>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{course.code}</div>
              </td>
              <td className="px-6 py-8 text-center border-t border-b border-slate-100">
                <span className="font-black text-slate-800 text-2xl tracking-tighter">{course.sks}</span>
              </td>
              <td className="px-6 py-8 text-center border-t border-b border-slate-100">
                <span className="bg-slate-100 px-4 py-1.5 rounded-xl text-xs font-black text-slate-500 uppercase tracking-widest">
                  {course.classCode}
                </span>
              </td>
              <td className="px-6 py-8 border-t border-b border-slate-100">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></span>
                    <span className="text-lg font-black text-slate-800">{course.day || '-'}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-400">
                    {course.startTime && course.endTime ? `${course.startTime} - ${course.endTime}` : '-'}
                  </div>
                </div>
              </td>
              <td className="px-6 py-8 border-t border-b border-slate-100">
                <div className="flex items-center space-x-2">
                   <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                   </div>
                   <span className="text-lg font-black text-indigo-700 whitespace-nowrap">{course.room || '-'}</span>
                </div>
              </td>
              {onDelete && (
                <td className="px-6 py-8 text-center rounded-r-[1.5rem] border-r border-t border-b border-slate-100">
                  <button 
                    onClick={() => onDelete(course.id)}
                    className="p-4 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-[1.25rem] transition-all shadow-sm active:scale-90 flex items-center justify-center mx-auto group/btn"
                    title="Batalkan Pilihan"
                  >
                    <svg className="w-6 h-6 group-hover/btn:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CourseTable;
