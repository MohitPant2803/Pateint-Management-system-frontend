import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
  FileText, Calendar, Trash2, Edit3, History, Eye, Plus, X, File, Image, Link
} from 'lucide-react';
import { API_URL } from '../context/AuthContext';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface Report {
  _id: string;
  title: string;
  reportType: string;
  currentVersion: number;
  summary?: string;
  updatedAt: string;
}

interface ReportVersion {
  _id: string;
  versionNumber: number;
  reportData: {
    title: string;
    reportType: string;
    summary?: string;
  };
  editedBy: {
    name: string;
  };
  createdAt: string;
}

interface UploadedFile {
  _id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageUrl: string;
  createdAt: string;
}

interface ReportManagerProps {
  patientId: string;
  reports: Report[];
  files: UploadedFile[];
  onUpdate?: () => void;
}

export const ReportManager: React.FC<ReportManagerProps> = ({ 
  patientId,
  reports = [],
  files = [],
  onUpdate
}) => {
  // Modal states
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Form states (Create/Edit)
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [reportTitle, setReportTitle] = useState('');
  const [reportType, setReportType] = useState('Clinical');
  const [reportSummary, setReportSummary] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Link attachment states
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [submittingLink, setSubmittingLink] = useState(false);

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'report' | 'file'; title: string; message: string } | null>(null);

  // Reports and files are passed as props from the parent patientContext

  // 3. Fetch specific report versions history
  const { data: historyData } = useQuery<{ report: Report; versions: ReportVersion[] }>({
    queryKey: ['reportHistory', selectedReportId],
    queryFn: async () => {
      if (!selectedReportId) return { report: {} as any, versions: [] };
      const res = await axios.get(`/reports/${selectedReportId}`);
      return res.data.data;
    },
    enabled: !!selectedReportId
  });

  const handleOpenWriteModal = (report?: Report) => {
    setError('');
    if (report) {
      setEditingReportId(report._id);
      setReportTitle(report.title);
      setReportType(report.reportType);
      setReportSummary(report.summary || '');
    } else {
      setEditingReportId(null);
      setReportTitle('');
      setReportType('Clinical');
      setReportSummary('');
    }
    setIsReportModalOpen(true);
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!reportTitle.trim() || !reportType) {
      setError('Report Title and Type are required.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingReportId) {
        // Edit report (snapshots previous version)
        await axios.put(`/reports/${editingReportId}`, {
          title: reportTitle.trim(),
          reportType,
          summary: reportSummary.trim()
        });
      } else {
        // Create new report
        await axios.post('/reports', {
          patientId,
          title: reportTitle.trim(),
          reportType,
          summary: reportSummary.trim()
        });
      }
      onUpdate?.();
      setIsReportModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error occurred while saving report.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReport = (id: string) => {
    setDeleteTarget({
      id,
      type: 'report',
      title: 'Delete Report',
      message: 'Are you sure you want to delete this report and its entire history? This cannot be undone.'
    });
    setIsDeleteModalOpen(true);
  };

  // File Upload trigger
  const handleAttachLinkSubmit = async () => {
    if (!linkTitle.trim() || !linkUrl.trim()) {
      alert("Link Title and URL are required.");
      return;
    }
    if (!linkUrl.trim().startsWith('http://') && !linkUrl.trim().startsWith('https://')) {
      alert("Invalid URL. Must start with http:// or https://");
      return;
    }

    setSubmittingLink(true);
    try {
      await axios.post('/reports/link', {
        patientId,
        fileName: linkTitle.trim(),
        storageUrl: linkUrl.trim()
      });
      setLinkTitle('');
      setLinkUrl('');
      onUpdate?.(); // Refetch context
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to attach medical link.');
    } finally {
      setSubmittingLink(false);
    }
  };

  const handleDeleteFile = (id: string) => {
    setDeleteTarget({
      id,
      type: 'file',
      title: 'Delete File Attachment',
      message: 'Are you sure you want to delete this file attachment? This action cannot be undone.'
    });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'report') {
        await axios.delete(`/reports/${deleteTarget.id}`);
      } else {
        await axios.delete(`/reports/upload/${deleteTarget.id}`);
      }
      onUpdate?.();
    } catch (err) {
      alert(`Failed to delete ${deleteTarget.type}.`);
    } finally {
      setDeleteTarget(null);
    }
  };

  const openHistoryModal = (id: string) => {
    setSelectedReportId(id);
    setIsHistoryModalOpen(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        dateStyle: 'medium'
      }) + ' ' + new Date(dateStr).toLocaleTimeString(undefined, {
        timeStyle: 'short'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* LEFT 2 COLUMNS: Written Reports */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FileText size={18} className="text-sky-500" />
            Doctor Written Reports
          </h3>
          <button
            onClick={() => handleOpenWriteModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            id="write-report-btn"
          >
            <Plus size={14} />
            Write Report
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-premium p-12 text-center text-slate-400">
            No reports logged for this patient. Click "Write Report" to create one.
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report._id}
                className="bg-white border border-slate-100 shadow-premium p-5 rounded-2xl hover:border-slate-200 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <h4 className="font-bold text-slate-800 text-sm">{report.title}</h4>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold">
                      {report.reportType}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-600 text-[10px] font-bold">
                      v{report.currentVersion}
                    </span>
                  </div>
                  {report.summary && (
                    <p className="text-slate-600 text-xs leading-relaxed line-clamp-3">
                      {report.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium pt-1">
                    <Calendar size={12} />
                    <span>Last edited {formatDate(report.updatedAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-start">
                  <button
                    onClick={() => openHistoryModal(report._id)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all"
                    title="View History Versions"
                  >
                    <History size={14} />
                  </button>
                  <button
                    onClick={() => handleOpenWriteModal(report)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-sky-600 hover:border-sky-200 transition-all"
                    title="Edit Report"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteReport(report._id)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
                    title="Delete Report"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT 1 COLUMN: Attached Links */}
      <div className="space-y-6">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Link size={18} className="text-sky-500" />
          Attached Medical Links
        </h3>

        {/* Link Attachment Form */}
        <div className="bg-white border border-slate-100 shadow-premium p-5 rounded-2xl space-y-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Attach Medical Link
          </h4>
          <div className="space-y-3">
            <div>
              <input
                type="text"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="Link Title (e.g. Chest CT Scan)"
                className="input-premium text-xs"
              />
            </div>
            <div>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="Link URL (e.g. https://drive.google.com/...)"
                className="input-premium text-xs"
              />
            </div>
            <button
              onClick={handleAttachLinkSubmit}
              disabled={submittingLink}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Plus size={14} />
              {submittingLink ? 'Attaching Link...' : 'Attach Link'}
            </button>
          </div>
        </div>

        {/* Files & Links List */}
        {files.length === 0 ? (
          <div className="bg-white border border-slate-100 shadow-premium p-6 rounded-2xl text-center text-xs text-slate-400">
            No attached medical links. Use the form above to add links.
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => {
              const isImage = file.fileType.startsWith('image/');
              const isLink = file.fileType === 'link';
              
              // Backend host address or direct external link
              const fileUrl = isLink 
                ? file.storageUrl 
                : `${API_URL.replace('/api', '')}${file.storageUrl}`;

              return (
                <div
                  key={file._id}
                  className="bg-white border border-slate-100 shadow-premium p-3.5 rounded-xl flex items-center justify-between gap-3 hover:border-slate-200 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                      {isLink ? <Link size={16} /> : isImage ? <Image size={16} /> : <File size={16} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate" title={file.fileName}>
                        {file.fileName}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {isLink ? 'External Link' : formatFileSize(file.fileSize)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all"
                      title="Open Attachment"
                    >
                      <Eye size={13} />
                    </a>
                    <button
                      onClick={() => handleDeleteFile(file._id)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
                      title="Delete Attachment"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: Write/Edit Report */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-premium-lg border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800">
                {editingReportId ? 'Edit Clinical Report' : 'Write Patient Report'}
              </h3>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveReport} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                  Report Title *
                </label>
                <input
                  type="text"
                  required
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="e.g. Initial Spirometry Evaluation"
                  className="input-premium text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                  Report Type *
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="input-premium text-xs"
                >
                  <option value="Clinical">Clinical Evaluation</option>
                  <option value="Lab">Lab Studies</option>
                  <option value="Imaging">HRCT/X-ray Imaging</option>
                  <option value="Biopsy">Biopsy results</option>
                  <option value="Other">Other Category</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                  Summary / Clinical notes
                </label>
                <textarea
                  value={reportSummary}
                  onChange={(e) => setReportSummary(e.target.value)}
                  placeholder="Write clinical notes, observations, or conclusions..."
                  rows={6}
                  className="input-premium text-xs resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 font-semibold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-semibold text-xs rounded-lg transition-all shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Save Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Report Version Snapshot History */}
      {isHistoryModalOpen && selectedReportId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-premium-lg border border-slate-100 overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Version History Log
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Report: {historyData?.report?.title || 'Loading...'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsHistoryModalOpen(false);
                  setSelectedReportId(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Current Active Version snapshot */}
              <div className="border border-sky-100 bg-sky-50/10 p-4 rounded-xl space-y-2 relative">
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-sky-500 text-white text-[9px] font-bold uppercase tracking-wider">
                  Active (v{historyData?.report?.currentVersion})
                </span>
                <h4 className="text-xs font-bold text-slate-800">
                  {historyData?.report?.title}
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold">
                  Type: {historyData?.report?.reportType} | Last updated {historyData?.report && formatDate(historyData.report.updatedAt)}
                </p>
                {historyData?.report?.summary && (
                  <p className="text-slate-600 text-xs leading-relaxed border-t border-slate-100/50 pt-2 mt-2 whitespace-pre-wrap">
                    {historyData.report.summary}
                  </p>
                )}
              </div>

              {/* Historical snapshots */}
              <div className="space-y-4">
                <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Previous Archive Snapshots
                </h5>

                {(!historyData?.versions || historyData.versions.length === 0) ? (
                  <p className="text-xs text-slate-400 italic">No previous versions archived.</p>
                ) : (
                  <div className="space-y-4 border-l border-slate-200 pl-4 ml-2">
                    {historyData.versions.map((ver) => (
                      <div key={ver._id} className="relative space-y-2 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                        {/* Timeline node */}
                        <div className="absolute -left-[22px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white"></div>
                        
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-extrabold">
                            v{ver.versionNumber}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Snapshot saved {formatDate(ver.createdAt)}
                          </span>
                        </div>
                        
                        <h6 className="text-xs font-bold text-slate-700">
                          {ver.reportData.title}
                        </h6>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Category: {ver.reportData.reportType} | Modified by: {ver.editedBy?.name || 'Doctor'}
                        </p>
                        
                        {ver.reportData.summary && (
                          <p className="text-slate-500 text-xs leading-relaxed pt-1.5 whitespace-pre-wrap italic bg-slate-50 p-2 rounded-lg border border-slate-100/50">
                            {ver.reportData.summary}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={deleteTarget?.title || 'Delete Item'}
        message={deleteTarget?.message || 'Are you sure you want to delete this item?'}
      />
    </div>
  );
};
