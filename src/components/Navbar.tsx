import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { doctor, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-slate-100 shadow-premium sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Medical Logo Icon */}
            <div className="flex-shrink-0 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                ✚
              </div>
              <span className="font-bold text-slate-800 tracking-tight text-lg">
                Doctor Patient Management System
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {doctor && (
              <div className="flex items-center gap-3 border-r border-slate-100 pr-4">
                {doctor.profilePicture ? (
                  <img
                    src={doctor.profilePicture}
                    alt={doctor.name}
                    className="w-8 h-8 rounded-full ring-2 ring-sky-500/10 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center text-sky-600">
                    <User size={16} />
                  </div>
                )}
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">
                    {doctor.name}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium leading-none">
                    {doctor.role || 'Doctor'}
                  </p>
                </div>
              </div>
            )}
            
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-500 hover:bg-red-50 text-sm font-medium transition-all duration-200"
              title="Logout from system"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
