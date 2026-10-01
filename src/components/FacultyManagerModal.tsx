import React, { useState, useEffect, useRef } from 'react';
import { FacultyTeacher } from '../types';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowUp, 
  ArrowDown, 
  Upload, 
  Image as ImageIcon, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Users, 
  UserPlus, 
  Link as LinkIcon,
  ShieldCheck,
  AlertCircle,
  Loader2,
  RefreshCw,
  Camera
} from 'lucide-react';
import { uploadToSupabaseStorage, ensureSupabaseStorageUrl } from '../lib/supabaseClient';

import gillianSelkridgeAsset from '../assets/images/gillian_selkridge_1786642912894.jpg';
import samuelSelkridgeAsset from '../assets/images/samuel_selkridge_1786642928268.jpg';
import galeGrantAsset from '../assets/images/gale_grant_1786642942313.jpg';
import christyRubenAsset from '../assets/images/christy_ruben_1786642955859.jpg';
import garodAndrewsAsset from '../assets/images/garod_andrews_1786642969381.jpg';

export const PRESET_FACULTY_IMAGES = [
  { name: 'Apostle Gillian Selkridge', title: 'Apostle & Director', url: gillianSelkridgeAsset },
  { name: 'Pastor Samuel Selkridge', title: 'Senior Pastor & Dean', url: samuelSelkridgeAsset },
  { name: 'Pastor Gale Grant', title: 'Curriculum Chair', url: galeGrantAsset },
  { name: 'Pastor Christy Arthur', title: 'Lead Instructor', url: christyRubenAsset },
  { name: 'Prophet Garod Andrews', title: 'Prophetic Dept Head', url: garodAndrewsAsset }
];

export const BADGE_COLOR_OPTIONS = [
  { label: 'Purple (Apostolic)', value: 'bg-purple-100 text-purple-900 dark:bg-purple-900/90 dark:text-purple-100 border-purple-300 dark:border-purple-700' },
  { label: 'Indigo (Pastoral)', value: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/90 dark:text-indigo-100 border-indigo-300 dark:border-indigo-700' },
  { label: 'Emerald (Theology)', value: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/90 dark:text-emerald-100 border-emerald-300 dark:border-emerald-700' },
  { label: 'Amber (Homiletics)', value: 'bg-amber-100 text-amber-950 dark:bg-amber-900/90 dark:text-amber-100 border-amber-300 dark:border-amber-700' },
  { label: 'Sky (Prophetic)', value: 'bg-sky-100 text-sky-900 dark:bg-sky-900/90 dark:text-sky-100 border-sky-300 dark:border-sky-700' },
  { label: 'Rose (Leadership)', value: 'bg-rose-100 text-rose-900 dark:bg-rose-900/90 dark:text-rose-100 border-rose-300 dark:border-rose-700' }
];

interface FacultyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  facultyList: FacultyTeacher[];
  onSaveFacultyList: (newList: FacultyTeacher[]) => void;
  onResetToDefault: () => void;
}

/**
 * Optimizes an image File into a high-clarity, lightweight data URL (JPEG ~80-120KB)
 * so it never breaches localStorage / payload quotas or fails to render.
 */
async function optimizeImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed reading file'));
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        reject(new Error('Empty file result'));
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error('Failed decoding image'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        // Draw and compress to high quality JPEG
        ctx.drawImage(img, 0, 0, width, height);
        const optimized = canvas.toDataURL('image/jpeg', 0.88);
        resolve(optimized);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

export const FacultyManagerModal: React.FC<FacultyManagerModalProps> = ({
  isOpen,
  onClose,
  facultyList,
  onSaveFacultyList,
  onResetToDefault
}) => {
  const [teachers, setTeachers] = useState<FacultyTeacher[]>(facultyList);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Synchronize internal state whenever facultyList changes from parent or when modal opens
  useEffect(() => {
    if (Array.isArray(facultyList) && facultyList.length > 0) {
      setTeachers(facultyList);
    }
  }, [facultyList, isOpen]);

  // Form Fields State
  const [formData, setFormData] = useState<FacultyTeacher>({
    id: '',
    name: '',
    title: '',
    role: '',
    bio: '',
    module: '',
    image: '',
    badgeColor: BADGE_COLOR_OPTIONS[0].value
  });

  const [imageTab, setImageTab] = useState<'upload' | 'preset' | 'url'>('upload');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleStartAdd = () => {
    setIsAddingNew(true);
    setEditingId(null);
    setImageError(false);
    setImageTab('upload');
    setFormData({
      id: `faculty-${Date.now()}`,
      name: '',
      title: 'Instructor & Minister',
      role: 'Course Instructor',
      bio: '',
      module: 'Module 1: General Ministry',
      image: gillianSelkridgeAsset,
      badgeColor: BADGE_COLOR_OPTIONS[0].value
    });
  };

  const handleStartEdit = (teacher: FacultyTeacher) => {
    setIsAddingNew(false);
    setEditingId(teacher.id);
    setImageError(false);
    setImageTab('upload');
    setFormData({ ...teacher });
  };

  const handleCancelForm = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setImageError(false);
  };

  const processAndSetImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WEBP, or HEIC).');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert('Image file size must be less than 25MB.');
      return;
    }

    setIsUploadingImage(true);
    setImageError(false);

    try {
      // 1. Optimize locally immediately for zero-delay, flawless high-resolution preview & local saving
      const optimizedDataUrl = await optimizeImageFile(file);
      setFormData(prev => ({ ...prev, image: optimizedDataUrl }));
      showToast('Profile photo updated and optimized!');

      // 2. Asynchronously upload to Supabase Storage in background if bucket exists
      try {
        const cleanName = (file.name || 'faculty_photo').replace(/[^a-zA-Z0-9_.-]/g, '_');
        const pubUrl = await uploadToSupabaseStorage('classroom_media', `faculty_${Date.now()}_${cleanName}`, file);
        if (pubUrl && pubUrl.startsWith('http')) {
          setFormData(prev => ({ ...prev, image: pubUrl }));
        }
      } catch (cloudErr) {
        console.warn("Background cloud storage upload notice:", cloudErr);
      }
    } catch (err) {
      console.error("Failed processing instructor image:", err);
      // Direct FileReader fallback
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData(prev => ({ ...prev, image: event.target!.result as string }));
          showToast('Profile photo loaded!');
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processAndSetImageFile(file);
    // Reset file input value so user can re-select same file if needed
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processAndSetImageFile(file);
    }
  };

  const handleSaveTeacherForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter the instructor name.');
      return;
    }

    let finalImage = formData.image || gillianSelkridgeAsset;
    try {
      const cleanSlug = (formData.name || 'instructor').toLowerCase().replace(/[^a-z0-9]/g, '_');
      const uploadedUrl = await ensureSupabaseStorageUrl('classroom_media', `faculty_${cleanSlug}_${Date.now()}.jpg`, finalImage);
      if (uploadedUrl) {
        finalImage = uploadedUrl;
      }
    } catch (e) {
      console.warn("Storage upload fallback in teacher save:", e);
    }

    const teacherToSave: FacultyTeacher = {
      ...formData,
      image: finalImage
    };

    let updatedList: FacultyTeacher[];
    if (isAddingNew) {
      const newId = `faculty-${Date.now()}`;
      updatedList = [...teachers, { ...teacherToSave, id: newId }];
      showToast(`Added ${formData.name} to Faculty Roster!`);
    } else {
      updatedList = teachers.map(t => t.id === editingId ? { ...teacherToSave } : t);
      showToast(`Updated ${formData.name} profile & photo!`);
    }

    setTeachers(updatedList);
    onSaveFacultyList(updatedList);
    setIsAddingNew(false);
    setEditingId(null);
  };

  const handleDeleteTeacher = (id: string, name: string) => {
    if (teachers.length <= 1) {
      alert('The faculty banner requires at least one instructor.');
      return;
    }
    if (confirm(`Are you sure you want to remove ${name} from the faculty roster?`)) {
      const updatedList = teachers.filter(t => t.id !== id);
      setTeachers(updatedList);
      onSaveFacultyList(updatedList);
      showToast(`Removed ${name}`);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...teachers];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setTeachers(updated);
    onSaveFacultyList(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === teachers.length - 1) return;
    const updated = [...teachers];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setTeachers(updated);
    onSaveFacultyList(updated);
  };

  const handleReset = () => {
    if (confirm('Reset faculty roster back to the original 5 default instructors? Any custom edits will be replaced.')) {
      onResetToDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden relative my-auto">
        
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center shadow-lg">
              <Users className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Faculty & Instructors Manager
                </h2>
                <span className="px-2.5 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400" /> Admin Controls
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Edit instructor titles, bios, modules, profile photos, and revolving showcase order
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-black text-center flex items-center justify-center gap-2 animate-fadeIn shadow-md">
            <Check className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {isAddingNew || editingId ? (
            /* Add / Edit Form View */
            <form onSubmit={handleSaveTeacherForm} className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-500" />
                  {isAddingNew ? 'Add New Faculty Member' : `Edit Instructor: ${formData.name}`}
                </h3>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  ← Back to Roster
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Photo Upload & Preview Section */}
                <div className="md:col-span-5 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      Instructor Profile Picture <span className="text-amber-500">*</span>
                    </label>
                    {formData.image && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, image: gillianSelkridgeAsset }));
                          setImageError(false);
                          showToast('Reset photo to default portrait');
                        }}
                        className="text-[10px] font-bold text-slate-500 hover:text-rose-500 transition-colors"
                      >
                        Reset Photo
                      </button>
                    )}
                  </div>

                  {/* Photo Preview Card with Drag & Drop */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                    onDragLeave={() => setIsDraggingOver(false)}
                    onDrop={handleDrop}
                    onClick={() => {
                      if (fileInputRef.current) fileInputRef.current.click();
                    }}
                    className={`relative rounded-xl overflow-hidden border cursor-pointer transition-all aspect-[3/4] w-full max-w-[240px] mx-auto shadow-xl group ${
                      isDraggingOver
                        ? 'border-amber-400 bg-amber-950/40 ring-4 ring-amber-400/40 scale-105'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-950 hover:border-purple-500'
                    }`}
                    title="Click or drop an image file to upload a new profile picture"
                  >
                    {formData.image && !imageError ? (
                      <img
                        src={formData.image}
                        alt="Preview"
                        onError={() => setImageError(true)}
                        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:bg-slate-100 dark:hover:bg-slate-700"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center bg-slate-900">
                        <ImageIcon className="w-12 h-12 mb-2 text-slate-500 stroke-1" />
                        <span className="text-xs font-bold text-slate-200">No Image Selected</span>
                        <span className="text-[10px] text-slate-400 mt-1">Click to browse or drop photo</span>
                      </div>
                    )}

                    {isUploadingImage && (
                      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 text-center animate-fadeIn z-20">
                        <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-2" />
                        <span className="text-xs font-black">Optimizing Portrait...</span>
                        <span className="text-[9px] text-slate-300 mt-0.5">High-Clarity Format</span>
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3.5 z-10">
                      <div className="flex items-center gap-1.5 text-white text-xs font-black">
                        <Camera className="w-4 h-4 text-amber-400" />
                        <span>Click to Change Photo</span>
                      </div>
                      <span className="text-[10px] text-slate-300 mt-0.5">Supports JPG, PNG, WEBP & HEIC</span>
                    </div>
                  </div>

                  {/* Photo Source Selector Tabs */}
                  <div className="space-y-2.5">
                    <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setImageTab('upload')}
                        className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                          imageTab === 'upload' 
                            ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs' 
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <Upload className="w-3 h-3" />
                        Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageTab('preset')}
                        className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                          imageTab === 'preset' 
                            ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs' 
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Faculty Presets
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageTab('url')}
                        className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                          imageTab === 'url' 
                            ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs' 
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <LinkIcon className="w-3 h-3" />
                        Image URL
                      </button>
                    </div>

                    {/* Tab 1: Upload from Device */}
                    {imageTab === 'upload' && (
                      <div className="space-y-2">
                        <label className="flex flex-col items-center justify-center px-4 py-2 border border-dashed border-purple-300 dark:border-purple-800 hover:border-purple-500 rounded-xl transition-all cursor-pointer bg-purple-50/50 dark:bg-purple-950/20 text-center group">
                          <Upload className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-extrabold text-purple-900 dark:text-purple-200">
                            Choose Image from Device
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Auto-optimizes dimensions & quality
                          </span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}

                    {/* Tab 2: Standard Anointed Faculty Presets */}
                    {imageTab === 'preset' && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">
                          Select from Anointed Ministry Faculty:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                          {PRESET_FACULTY_IMAGES.map((preset, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, image: preset.url }));
                                setImageError(false);
                                showToast(`Selected ${preset.name}`);
                              }}
                              className={`p-1.5 rounded-xl border text-left flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                                formData.image === preset.url
                                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/50 text-amber-950 dark:text-amber-200 ring-2 ring-amber-400'
                                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              <img src={preset.url} alt="" className="w-8 h-8 rounded-lg object-cover object-top shrink-0 border border-slate-300 dark:border-slate-700" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-black truncate">{preset.name}</p>
                                <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate">{preset.title}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tab 3: Direct Web Image URL */}
                    {imageTab === 'url' && (
                      <div className="space-y-1.5">
                        <div className="flex gap-1.5">
                          <input
                            type="url"
                            value={formData.image ?? ''}
                            onChange={(e) => {
                              setFormData(prev => ({ ...prev, image: e.target.value }));
                              setImageError(false);
                            }}
                            placeholder="https://example.com/pastor-photo.jpg"
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (navigator.clipboard) {
                                navigator.clipboard.readText().then(text => {
                                  if (text && (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('data:'))) {
                                    setFormData(prev => ({ ...prev, image: text }));
                                    setImageError(false);
                                    showToast('Pasted image URL!');
                                  }
                                });
                              }
                            }}
                            className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            title="Paste from Clipboard"
                          >
                            Paste
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Paste direct image link (HTTPS) or base64 data string
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Input Fields */}
                <div className="md:col-span-7 space-y-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                      Full Name & Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name ?? ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Apostle Gillian Selkridge"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        Position Title
                      </label>
                      <input
                        type="text"
                        value={formData.title ?? ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g. Apostle & School Director"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        Role / Focus Area
                      </label>
                      <input
                        type="text"
                        value={formData.role ?? ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                        placeholder="e.g. Apostolic Oversight & Governance"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        Module Assigned
                      </label>
                      <input
                        type="text"
                        value={formData.module ?? ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, module: e.target.value }))}
                        placeholder="e.g. Module 1: Apostolic Governance"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                        Badge Theme Color
                      </label>
                      <select
                        value={formData.badgeColor ?? ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, badgeColor: e.target.value }))}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                      >
                        {BADGE_COLOR_OPTIONS.map((opt, oIdx) => (
                          <option key={oIdx} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                      Instructor Biography & Vision Quote
                    </label>
                    <textarea
                      rows={4}
                      value={formData.bio ?? ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Enter instructor overview, ministerial qualifications, or spiritual vision..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCancelForm}
                      className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all cursor-pointer active:opacity-80"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isAddingNew ? 'Add to Faculty' : 'Save Instructor Changes'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            /* Instructors List View */
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    Current Revolving Faculty Roster ({teachers.length} Members)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Use the arrows to reorder how instructors appear in the home screen showcase
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleStartAdd}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:opacity-80"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add New Instructor</span>
                </button>
              </div>

              {/* Roster Cards List */}
              <div className="space-y-2.5">
                {teachers.map((teacher, index) => (
                  <div
                    key={teacher.id}
                    className="p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 shadow-xs flex items-center justify-between gap-3 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-300 dark:border-slate-700 shrink-0 shadow-xs">
                        <img
                          src={teacher.image || gillianSelkridgeAsset}
                          alt={teacher.name}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = gillianSelkridgeAsset;
                          }}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                            {teacher.name}
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${teacher.badgeColor}`}>
                            {teacher.module}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 truncate">
                          {teacher.title}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {teacher.role}
                        </p>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Move Up/Down */}
                      <button
                        type="button"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className={`p-2 rounded-xl border border-slate-200 dark:border-slate-700 ${
                          index === 0 
                            ? 'opacity-30 cursor-not-allowed text-slate-400' 
                            : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer'
                        }`}
                        title="Move Up in Showcase Order"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === teachers.length - 1}
                        className={`p-2 rounded-xl border border-slate-200 dark:border-slate-700 ${
                          index === teachers.length - 1 
                            ? 'opacity-30 cursor-not-allowed text-slate-400' 
                            : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer'
                        }`}
                        title="Move Down in Showcase Order"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(teacher)}
                        className="p-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors cursor-pointer flex items-center gap-1"
                        title="Edit Instructor details and change photo"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-bold hidden sm:inline">Edit</span>
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                        className="p-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900 transition-colors cursor-pointer"
                        title="Delete Instructor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
            <span>Reset to Default 5 Faculty Members</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

