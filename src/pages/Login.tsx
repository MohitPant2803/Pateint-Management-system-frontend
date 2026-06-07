import React from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { ShieldCheck, Activity } from 'lucide-react';

export const Login: React.FC = () => {
  const { isAuthenticated } = useAuth();

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGoogleLogin = () => {
    // Redirect directly to backend Google Auth route
    window.location.href = `${API_URL}/auth/google`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-slate-50 via-sky-50/20 to-slate-100/50 p-6 relative overflow-hidden">
      {/* Decorative gradient blur blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-sky-200/30 blur-3xl animate-pulse duration-10000"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-200/20 blur-3xl animate-pulse duration-7000"></div>

      <div className="w-full max-w-md glassmorphism rounded-2xl shadow-premium-lg p-8 relative z-10 transition-all duration-300">
        <div className="flex flex-col items-center justify-center text-center">
          {/* Logo badge */}
          <div className="w-14 h-14 rounded-2xl bg-sky-500 flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-sky-500/20 animate-bounce duration-3000">
            ✚
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-800 tracking-tight">
            PIBO Research Study
          </h1>
          <p className="mt-2 text-slate-500 text-sm font-medium">
            Doctor Patient Management System
          </p>
        </div>

        {/* Clinical Info box */}
        <div className="mt-8 p-4 bg-slate-50/70 border border-slate-100 rounded-xl flex items-start gap-3">
          <Activity className="text-sky-500 shrink-0 mt-0.5" size={18} />
          <div className="text-left text-xs text-slate-500 leading-relaxed">
            Manage patient records, clinical evaluations, lung function studies, complementary investigations, reports, and PIBO scoring through a centralized research platform.
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-sm hover:shadow text-slate-700 hover:text-slate-900 font-semibold text-sm transition-all duration-200"
            id="google-login-btn"
          >
            {/* Standard Google Icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Sign in with Google Workspace</span>
          </button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <ShieldCheck size={14} className="text-slate-400" />
          <span>Secure Multi-Doctor Access Control Enabled</span>
        </div>
      </div>
    </div>
  );
};
