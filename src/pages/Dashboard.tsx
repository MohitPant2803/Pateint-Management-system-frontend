import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { NewPatientModal } from '../components/NewPatientModal';
import { Search, Plus, UserCheck, Calendar, Activity } from 'lucide-react';

interface Patient {
  _id: string;
  patientId: string;
  patientName: string;
  age?: number;
  gender?: string;
  currentPiboScore: number;
  updatedAt: string;
}

export const Dashboard: React.FC = () => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  // Fetch patients with instant React Query caching & automatic refetching on search change
  const { data: patients = [], isLoading, refetch } = useQuery<Patient[]>({
    queryKey: ['patients', search],
    queryFn: async () => {
      const res = await axios.get(`/patients?search=${encodeURIComponent(search)}`);
      return res.data.data;
    }
  });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <UserCheck className="text-sky-500" size={24} />
              PIBO Clinical Registry System
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Manage patient records, clinical evaluations, lung function data, and research outcomes within the PIBO cohort.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm rounded-xl transition-all duration-200 shadow-sm shadow-sky-500/10 hover:shadow"
            id="register-patient-btn"
          >
            <Plus size={18} />
            <span>New Patient</span>
          </button>
        </div>

        {/* Filters/Search area */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-premium p-4 mb-6 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Instant Search by Patient ID or Patient Name..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 hover:bg-slate-50/80 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200"
              id="search-patient-input"
            />
          </div>
        </div>

        {/* Patient Table Container */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-premium overflow-hidden">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-sky-500 rounded-full animate-spin"></div>
              <p className="mt-4 text-slate-400 text-sm font-semibold animate-pulse">Loading dataset...</p>
            </div>
          ) : patients.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 mb-3">
                <Search size={24} />
              </div>
              <h3 className="text-slate-700 font-semibold text-base">No patients found</h3>
              <p className="text-slate-400 text-sm mt-1 max-w-xs">
                {search ? 'Try adjusting your search criteria or clear the filter.' : 'Register a new patient to begin compiling clinical data.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Patient ID</th>
                    <th className="py-4 px-6">Patient Name</th>
                    <th className="py-4 px-6">PIBO Score</th>
                    <th className="py-4 px-6 flex items-center gap-1.5"><Calendar size={14} /> Updated At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-medium">
                  {patients.map((patient) => (
                    <tr
                      key={patient._id}
                      onClick={() => navigate(`/patient/${patient._id}`)}
                      className="hover:bg-slate-50/50 cursor-pointer transition-colors duration-150 group"
                      id={`patient-row-${patient.patientId}`}
                    >
                      <td className="py-4 px-6 text-sky-600 font-bold group-hover:underline">
                        {patient.patientId}
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-800">
                        {patient.patientName}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          patient.currentPiboScore >= 7 
                            ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}>
                          <Activity size={12} />
                          {patient.currentPiboScore} / 11
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-400">
                        {formatDate(patient.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      <NewPatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={refetch}
      />
    </div>
  );
};
