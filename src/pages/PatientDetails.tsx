import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Navbar } from '../components/Navbar';
import { FormEngine } from '../components/FormEngine';
import { ReportManager } from '../components/ReportManager';
import { ArrowLeft, Download, User, HeartPulse, Save, Link } from 'lucide-react';

interface Patient {
  _id: string;
  patientId: string;
  patientName: string;
  age?: number;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  currentPiboScore: number;
  lastViewedAt: string;
  updatedAt: string;
}

interface ScoreState {
  pibo_score1: number;
  pibo_score2: number;
  pibo_score3: number;
  totalPiboScore: number;
  predictionResult: string;
}

export const PatientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('personalAndFamilyHistory');
  const [exporting, setExporting] = useState(false);
  const [saveTrigger, setSaveTrigger] = useState(0);
  const [attachingLink, setAttachingLink] = useState(false);
  
  // Real-time PIBO scores state
  const [scores, setScores] = useState<ScoreState>({
    pibo_score1: 0,
    pibo_score2: 0,
    pibo_score3: 0,
    totalPiboScore: 0,
    predictionResult: 'Control'
  });

  // Fetch Patient Unified Context (demographics, form, reports, files, auditLogs)
  const { data: context, isLoading, error, refetch } = useQuery<{
    patient: Patient;
    form: any;
    reports: any[];
    files: any[];
    auditLogs: any[];
  }>({
    queryKey: ['patientContext', id],
    queryFn: async () => {
      const res = await axios.get(`/patients/${id}`);
      return res.data.data;
    },
    enabled: !!id
  });

  const patient = context?.patient;
  const initialForm = context?.form;
  const reports = context?.reports || [];
  const files = context?.files || [];

  // Sync initial scores from patientContext once loaded/updated
  useEffect(() => {
    if (initialForm?.calculatedValues) {
      setScores(initialForm.calculatedValues);
    }
  }, [context, initialForm]);

  const handleExportExcel = async () => {
    if (!id || !patient) return;
    setExporting(true);
    try {
      const res = await axios.get(`/exports/excel/patient/${id}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Patient_${patient.patientId}_Export.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to generate research Excel spreadsheet.');
    } finally {
      setExporting(false);
    }
  };

  const handleScoresCalculated = (newScores: ScoreState) => {
    setScores(newScores);
  };

  const handleHeaderSave = () => {
    setSaveTrigger(prev => prev + 1);
  };

  const handleHeaderAddLink = async () => {
    const fileName = prompt("Enter Link Title (e.g. Chest CT Scan Google Drive):");
    if (fileName === null) return; // cancelled
    if (!fileName.trim()) {
      alert("Link Title is required.");
      return;
    }
    
    const storageUrl = prompt("Enter Link URL (e.g. https://drive.google.com/...):");
    if (storageUrl === null) return; // cancelled
    if (!storageUrl.trim()) {
      alert("Link URL is required.");
      return;
    }

    if (!storageUrl.trim().startsWith('http://') && !storageUrl.trim().startsWith('https://')) {
      alert("Invalid URL. Must start with http:// or https://");
      return;
    }

    setAttachingLink(true);
    try {
      await axios.post('/reports/link', {
        patientId: id!,
        fileName: fileName.trim(),
        storageUrl: storageUrl.trim()
      });
      refetch(); // Refresh context to show new link
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to attach medical link.');
    } finally {
      setAttachingLink(false);
    }
  };

  const formatUpdatedAt = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch (e) {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-sky-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 text-sm font-semibold animate-pulse">Loading clinical workspace...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <p className="text-red-500 font-semibold text-lg">Patient file not found or unauthorized.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          Return to Dashboard
        </button>
      </div>
    );
  }

  const tabItems = [
    { key: 'personalAndFamilyHistory', label: 'Personal & Family History' },
    { key: 'diseaseHistory', label: 'Disease History' },
    { key: 'clinicalEvaluation', label: 'Clinical Evaluation' },
    { key: 'lungFunction', label: 'Lung Function' },
    { key: 'complementaryStudies', label: 'Complementary Studies' },
    { key: 'piboScore', label: 'PIBO Score' },
    { key: 'reports', label: 'Reports & Files' }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-bold group"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
            Back to Cohort Dashboard
          </button>
        </div>

        {/* Patient Demographics & Action Header Banner */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-premium p-6 mb-6">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
                <User size={24} />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight" id="patient-header-name">
                    {patient.patientName}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider" id="patient-header-id">
                    ID: {patient.patientId}
                  </span>
                  <span className="text-slate-400 text-xs font-semibold" id="patient-header-updatedat">
                    Updated At: {formatUpdatedAt(patient.updatedAt)}
                  </span>
                </div>
                
                {/* Demographic attributes line */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                  {patient.age && <span>Age: <strong className="text-slate-700">{patient.age}y</strong></span>}
                  {patient.gender && <span>Gender: <strong className="text-slate-700">{patient.gender}</strong></span>}
                  {patient.phone && <span>Phone: <strong className="text-slate-700">{patient.phone}</strong></span>}
                  {patient.email && <span>Email: <strong className="text-slate-700">{patient.email}</strong></span>}
                </div>
              </div>
            </div>

            {/* Header Actions & Score Display */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Score breakdown banner widget */}
              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 justify-between md:justify-start">
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cohort Scoring</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs font-black ${
                      scores.predictionResult === 'PIBO' ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                      {scores.predictionResult === 'PIBO' ? 'PIBO Predicted' : 'Control Case'}
                    </span>
                  </div>
                </div>
                <div className="w-px h-8 bg-slate-200"></div>
                <div className="text-center px-1">
                  <span className="text-xl font-black text-slate-800">{scores.totalPiboScore}</span>
                  <span className="text-xs text-slate-400 font-bold">/11</span>
                </div>
              </div>

              {/* Action Buttons Group */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleHeaderSave}
                  disabled={activeTab === 'reports'}
                  className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
                  id="header-save-btn"
                  title="Save REDCap form entries manually"
                >
                  <Save size={14} />
                  Save
                </button>

                <button
                  onClick={handleHeaderAddLink}
                  disabled={attachingLink}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl shadow-sm transition-all"
                  id="header-link-btn"
                  title="Attach external medical web link"
                >
                  <Link size={14} />
                  {attachingLink ? 'Attaching...' : 'Attach Link'}
                </button>

                <button
                  onClick={handleExportExcel}
                  disabled={exporting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl shadow-sm transition-all"
                  id="header-export-btn"
                  title="Export complete patient history and form data to Excel"
                >
                  <Download size={14} />
                  {exporting ? 'Exporting...' : 'Export Excel'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Layout: Tabs (Left), Active workspace panel (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Left Column: Vertical tab list and Sticky Score Panel */}
          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
            
            {/* Dynamic Tabs list */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-premium p-3 space-y-1">
              <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 mb-1">
                Questionnaire Sections
              </p>
              {tabItems.map((item) => {
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${
                      isActive
                        ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/10'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                    id={`tab-btn-${item.key}`}
                  >
                    <span>{item.label}</span>
                    {item.key === 'piboScore' && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-sky-50 text-sky-600'
                      }`}>
                        {scores.totalPiboScore}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Score Breakdown summary widget */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-premium p-5 space-y-4">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-2">
                <HeartPulse size={14} className="text-sky-500" />
                PIBO Scoring breakdown
              </h4>
              
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">1. Healthy Infant</span>
                  <span className="font-bold text-slate-700">{scores.pibo_score1} / 4</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">2. Adenovirus presence</span>
                  <span className="font-bold text-slate-700">{scores.pibo_score2} / 3</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">3. Mosaic attenuation</span>
                  <span className="font-bold text-slate-700">{scores.pibo_score3} / 4</span>
                </div>
                <div className="w-full h-px bg-slate-100 my-1"></div>
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-800">Total PIBO Score</span>
                  <span className="text-sky-600">{scores.totalPiboScore} / 11</span>
                </div>
              </div>

              <div className={`p-3 rounded-xl border text-center text-xs font-bold ${
                scores.predictionResult === 'PIBO'
                  ? 'bg-rose-50 border-rose-100 text-rose-600'
                  : 'bg-emerald-50 border-emerald-100 text-emerald-600'
              }`}>
                {scores.predictionResult === 'PIBO' ? (
                  <span>⚠️ Predicts diagnosis of PIBO (Score &ge; 7)</span>
                ) : (
                  <span>✅ Does not predict PIBO (Score &lt; 7)</span>
                )}
              </div>
            </div>

          </div>

          {/* Right 3 Columns: Active Tab workspace */}
          <div className="lg:col-span-3">
            {activeTab === 'reports' ? (
              <ReportManager
                patientId={patient._id}
                reports={reports}
                files={files}
                onUpdate={refetch}
              />
            ) : (
              <FormEngine
                patientId={patient._id}
                activeSectionKey={activeTab}
                saveTrigger={saveTrigger}
                initialForm={initialForm}
                onScoresCalculated={handleScoresCalculated}
                onUpdate={refetch}
              />
            )}
          </div>

        </div>

      </main>
    </div>
  );
};
