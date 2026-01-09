
import React, { useState } from 'react';
import { Course, Room } from '../types';
import { DAYS, MOCK_ROOMS } from '../constants';

interface UpdateScheduleFormProps {
  course: Course;
  onSave: (updated: Course) => void;
  onCancel: () => void;
}

const UpdateScheduleForm: React.FC<UpdateScheduleFormProps> = ({ course, onSave, onCancel }) => {
  const [day, setDay] = useState(course.day || '');
  const [startTime, setStartTime] = useState(course.startTime || '08:00');
  const [endTime, setEndTime] = useState(course.endTime || '09:40');
  const [room, setRoom] = useState(course.room || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...course,
      day,
      startTime,
      endTime,
      room
    });
  };

  return (
    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h4 className="text-lg font-bold text-slate-800">Update Jadwal Mata Kuliah</h4>
          <p className="text-sm text-slate-500">{course.name} ({course.code})</p>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Pilih Hari</label>
          <select 
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            required
          >
            <option value="">-- Pilih Hari --</option>
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Pilih Ruangan</label>
          <select 
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            required
          >
            <option value="">-- Pilih Ruangan --</option>
            {MOCK_ROOMS.map(r => (
              <option key={r.id} value={r.name}>
                {r.name} - {r.location} (Kaps: {r.capacity})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Jam Mulai</label>
          <input 
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Jam Selesai</label>
          <input 
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            required
          />
        </div>

        <div className="md:col-span-2 flex justify-end space-x-3 mt-4">
          <button 
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition-all"
          >
            Batal
          </button>
          <button 
            type="submit"
            className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200"
          >
            Simpan Perubahan
          </button>
        </div>
      </form>
    </div>
  );
};

export default UpdateScheduleForm;
