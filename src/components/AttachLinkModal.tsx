import React, { useState, useEffect } from 'react';
import { X, Link } from 'lucide-react';

interface AttachLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, url: string) => Promise<void>;
  submitting: boolean;
}

export const AttachLinkModal: React.FC<AttachLinkModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  submitting
}) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  // Clear fields when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setUrl('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Link Title is required.');
      return;
    }
    if (!url.trim()) {
      setError('Link URL is required.');
      return;
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      setError('Invalid URL. Must start with http:// or https://');
      return;
    }

    try {
      await onSubmit(title.trim(), trimmedUrl);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to attach link.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-premium-lg border border-slate-100 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
              <Link size={16} />
            </div>
            <h2 className="text-base font-bold text-slate-800">Attach Medical Link</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Link Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Chest CT Scan Google Drive"
              className="input-premium text-xs"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Link URL *
            </label>
            <input
              type="text"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g., https://drive.google.com/..."
              className="input-premium text-xs"
            />
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 font-semibold text-xs transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white font-semibold text-xs rounded-xl transition-all shadow-sm shadow-sky-500/10"
            >
              {submitting ? 'Attaching...' : 'Attach Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
