import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { Save, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface FormField {
  fieldKey: string;
  label: string;
  type: string;
  required: boolean;
  validation: {
    type?: string;
    min?: any;
    max?: any;
  };
  options: Array<{ value: string; label: string }>;
  visibilityRules?: string;
  calculationRules?: string;
  helpText?: string;
}

interface FormSchema {
  sectionKey: string;
  sectionName: string;
  fields: FormField[];
}

interface FormEngineProps {
  patientId: string;
  activeSectionKey: string;
  saveTrigger?: number;
  initialForm?: any;
  onScoresCalculated: (scores: {
    pibo_score1: number;
    pibo_score2: number;
    pibo_score3: number;
    totalPiboScore: number;
    predictionResult: string;
  }) => void;
  onUpdate?: () => void;
}

export const FormEngine: React.FC<FormEngineProps> = ({
  patientId,
  activeSectionKey,
  saveTrigger,
  initialForm,
  onScoresCalculated,
  onUpdate
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const autosaveTimerRef = useRef<any>(null);
  
  // 1. Fetch schemas
  const { data: schemas = [], isLoading: loadingSchema } = useQuery<FormSchema[]>({
    queryKey: ['schemas'],
    queryFn: async () => {
      const res = await axios.get('/forms/schemas');
      return res.data.data;
    }
  });

  // Form data is passed as a prop from the parent patientContext

  // Load answers into state on fetch/prop change
  useEffect(() => {
    if (initialForm && initialForm.sections) {
      const flattenedAnswers: Record<string, any> = {};
      const sectionKeys = Object.keys(initialForm.sections);
      
      for (const sectionKey of sectionKeys) {
        const sectionData = initialForm.sections[sectionKey] || {};
        // Mongoose maps can be plain objects or nested. Copy them
        Object.keys(sectionData).forEach(key => {
          flattenedAnswers[key] = sectionData[key];
        });
      }
      setFormData(flattenedAnswers);
    }
  }, [initialForm]);

  // Listen for manual save triggers from the parent page header
  useEffect(() => {
    if (saveTrigger && saveTrigger > 0) {
      handleManualSave();
    }
  }, [saveTrigger]);

  const activeSchema = schemas.find(s => s.sectionKey === activeSectionKey);

  // 3. Conditional Visibility Engine
  const isFieldVisible = (field: FormField) => {
    if (!field.visibilityRules) return true;
    const rule = field.visibilityRules.trim();

    // Regex to match e.g. [neonatal_mv] = '1' or [injury_virology_other1(14)] = '1'
    const match = rule.match(/\[([a-zA-Z0-9_]+)(?:\(([a-zA-Z0-9_]+)\))?\]\s*(=|!=)\s*['"]?([^'"]+)['"]?/);
    if (match) {
      const dependentKey = match[1];
      const subKey = match[2]; // e.g. "14" if checkbox check
      const op = match[3];
      const targetValue = match[4];

      const parentValue = formData[dependentKey];

      if (subKey) {
        // Checkbox sub-option check (REDCap format: var___code)
        const isSelected = parentValue?.[subKey] === true || parentValue?.[subKey] === 'true' || parentValue?.[subKey] === 1 || parentValue?.[subKey] === '1';
        return op === '=' ? isSelected : !isSelected;
      } else {
        // Standard radio / dropdown value check
        if (op === '=') {
          return String(parentValue) === String(targetValue);
        } else if (op === '!=') {
          return String(parentValue) !== String(targetValue);
        }
      }
    }
    return true;
  };

  // 4. Calculations Engine (Client Side for Instant UX, mirrors Backend)
  const runLocalCalculations = (currentFormData: Record<string, any>) => {
    const healthyInfant = currentFormData.healthy_infant;
    const injuryVirologyAdeno = currentFormData.injury_virology_adeno;
    const chestCtTrap = currentFormData.chest_ct_trap;

    let pibo_score1 = 0;
    if (healthyInfant === '1' || healthyInfant === 1) {
      pibo_score1 = 4;
    }

    let pibo_score2 = 0;
    if (injuryVirologyAdeno === '1' || injuryVirologyAdeno === 1) {
      pibo_score2 = 3;
    }

    let pibo_score3 = 0;
    if (chestCtTrap === '1' || chestCtTrap === 1) {
      pibo_score3 = 4;
    }

    const totalPiboScore = pibo_score1 + pibo_score2 + pibo_score3;
    const predictionResult = totalPiboScore >= 7 ? 'PIBO' : 'Control';

    onScoresCalculated({
      pibo_score1,
      pibo_score2,
      pibo_score3,
      totalPiboScore,
      predictionResult
    });
  };

  // 5. Save Action
  const saveForm = async (updatedData: Record<string, any> = formData) => {
    setSaveStatus('saving');
    setErrorMessage('');
    try {
      // Group flat state variables back into respective sections
      const sectionsPayload: Record<string, any> = {
        personalAndFamilyHistory: {},
        diseaseHistory: {},
        clinicalEvaluation: {},
        lungFunction: {},
        complementaryStudies: {},
        piboScore: {}
      };

      // Map each form schema field back to its section
      schemas.forEach(section => {
        section.fields.forEach(field => {
          if (updatedData[field.fieldKey] !== undefined) {
            sectionsPayload[section.sectionKey][field.fieldKey] = updatedData[field.fieldKey];
          }
        });
      });

      const res = await axios.put(`/forms/patient/${patientId}`, {
        sections: sectionsPayload
      });

      if (res.data.success) {
        setSaveStatus('saved');
        // Let backend calculations populate in the UI callback
        if (res.data.data?.calculatedValues) {
          onScoresCalculated(res.data.data.calculatedValues);
        }
        onUpdate?.();
      }
    } catch (err: any) {
      setSaveStatus('error');
      setErrorMessage(err.response?.data?.message || 'Error occurred while autosaving clinical data.');
    }
  };

  // 6. Handle field edits
  const handleFieldChange = (key: string, value: any) => {
    setSaveStatus('idle');
    const updatedData = { ...formData, [key]: value };
    setFormData(updatedData);

    // Run client side calculations instantly
    runLocalCalculations(updatedData);

    // Debounced autosave (2 seconds)
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      saveForm(updatedData);
    }, 2000);
  };

  const handleCheckboxChange = (fieldKey: string, optionValue: string, checked: boolean) => {
    setSaveStatus('idle');
    const currentVal = formData[fieldKey] || {};
    const newVal = { ...currentVal, [optionValue]: checked };
    
    const updatedData = { ...formData, [fieldKey]: newVal };
    setFormData(updatedData);

    // Trigger debounced autosave
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      saveForm(updatedData);
    }, 2000);
  };

  const handleManualSave = () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    saveForm();
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  if (loadingSchema || !initialForm) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-sky-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 text-sm font-semibold animate-pulse">Loading section layout...</p>
      </div>
    );
  }

  if (!activeSchema) {
    return (
      <div className="py-12 text-center text-slate-400">
        <AlertCircle className="mx-auto text-slate-300 mb-2" size={24} />
        <p className="text-sm font-semibold">Section schema could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Save Status Bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl">
        <div className="flex items-center gap-2 text-xs font-semibold">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-sky-500">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping"></span>
              Autosaving entries...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-emerald-500">
              <CheckCircle size={14} />
              All changes autosaved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-red-500">
              <AlertCircle size={14} />
              {errorMessage || 'Autosave failed. Check connections.'}
            </span>
          )}
          {saveStatus === 'idle' && (
            <span className="text-slate-400">Draft unsaved</span>
          )}
        </div>

        <button
          onClick={handleManualSave}
          className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-sm transition-all"
          id="manual-save-btn"
        >
          <Save size={13} />
          Save & Recalculate
        </button>
      </div>

      {/* Dynamic Fields Grid */}
      <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-premium">
        
        {/* Render only visible fields */}
        {activeSchema.fields.map((field) => {
          if (!isFieldVisible(field)) return null;

          

          return (
            <div key={field.fieldKey} className="space-y-1.5 border-b border-slate-50 pb-4 last:border-0 last:pb-0">
              
              {/* Field Label and Help Metadata */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-slate-800">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {field.helpText && (
                  <span className="text-xs text-slate-400 font-medium mt-0.5 flex items-start gap-1">
                    <Info size={12} className="shrink-0 mt-0.5 text-slate-300" />
                    {field.helpText}
                  </span>
                )}
              </div>

              {/* RENDER FIELD ACCORDING TO TYPE */}
              <div className="mt-2">
                {/* 1. TEXT / NUMERIC INPUT */}
                {field.type === 'text' && (
                  <input
                    type={field.validation?.type === 'integer' || field.validation?.type === 'number' ? 'number' : 'text'}
                    value={formData[field.fieldKey] || ''}
                    onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
                    min={field.validation?.min}
                    max={field.validation?.max}
                    className="input-premium max-w-md"
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                )}

                {/* 2. NOTES / TEXTAREA */}
                {field.type === 'notes' && (
                  <textarea
                    value={formData[field.fieldKey] || ''}
                    onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
                    rows={4}
                    className="input-premium resize-none"
                    placeholder={`Enter additional details...`}
                  />
                )}

                {/* 3. SELECT DROPDOWN */}
                {field.type === 'dropdown' && (
                  <select
                    value={formData[field.fieldKey] || ''}
                    onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
                    className="input-premium max-w-md"
                  >
                    <option value="">-- Choose Option --</option>
                    {field.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {/* 4. RADIO BUTTONS */}
                {field.type === 'radio' && (
                  <div className="flex flex-wrap gap-4 mt-1">
                    {field.options.map((opt) => {
                      const isChecked = String(formData[field.fieldKey]) === String(opt.value);
                      return (
                        <div
                          key={opt.value}
                          onClick={() => handleFieldChange(field.fieldKey, opt.value)}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-semibold cursor-pointer select-none transition-all ${
                            isChecked
                              ? 'bg-sky-50 border-sky-300 text-sky-700 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={field.fieldKey}
                            value={opt.value}
                            checked={isChecked}
                            readOnly
                            className="sr-only pointer-events-none"
                          />
                          <span>{opt.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 5. CHECKBOXES (Support multiple selections) */}
                {field.type === 'checkbox' && (
                  <div className="flex flex-wrap gap-4 mt-1">
                    {field.options.map((opt) => {
                      const isChecked = formData[field.fieldKey]?.[opt.value] === true;
                      return (
                        <div
                          key={opt.value}
                          onClick={() => handleCheckboxChange(field.fieldKey, opt.value, !isChecked)}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-semibold cursor-pointer select-none transition-all ${
                            isChecked
                              ? 'bg-sky-50 border-sky-300 text-sky-700 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="rounded text-sky-500 focus:ring-sky-500 border-slate-300 pointer-events-none"
                          />
                          <span>{opt.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 6. CALCULATED FIELD (DISPLAY ONLY) */}
                {field.type === 'calc' && (
                  <div className="flex items-center gap-2 p-3 bg-slate-50/80 border border-slate-100 rounded-xl max-w-md">
                    <span className="text-sm font-bold text-slate-800">
                      Value:
                    </span>
                    <span className="text-sm font-black text-sky-600">
                      {formData[field.fieldKey] || '0'}
                    </span>
                  </div>
                )}

                {/* 7. DESCRIPTIVE HEADERS (NO INPUT) */}
                {field.type === 'descriptive' && (
                  <div className="p-3 bg-slate-50/50 border border-slate-100/50 rounded-xl text-xs text-slate-400 font-medium leading-relaxed">
                    {field.label}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
