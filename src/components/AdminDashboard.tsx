import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit2, Trash2, Save, X, 
  Newspaper, Image as ImageIcon, 
  Calendar, Star, BarChart3, LogOut,
  ChevronRight, Upload, Trophy, Music,
  Palette, Target, BookOpen, Tent,
  Mic2, Heart, Camera, Monitor, Globe, Users, GraduationCap, Shield
} from 'lucide-react';
import { syncData, collections } from '../lib/dataService';
import { NewsItem, GalleryItem, ScheduleItem, ExtraItem, StaffItem, AchievementItem, AppConfig } from '../types';
import { GradeManager } from './GradeManager';
import { AdminAccountManager } from './AdminAccountManager';
import { auth } from '../lib/firebase';

import { NEWS_DATA, GALLERY_DATA, SCHEDULE_DATA, EXTRA_DATA } from '../data';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const MASTER_ADMIN = "wathan045@gmail.com";
  const currentUserEmail = auth.currentUser?.email?.toLowerCase();
  const isMasterAdmin = currentUserEmail === MASTER_ADMIN;

  const [activeTab, setActiveTab] = useState(isMasterAdmin ? 'stats' : 'schedules');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [extras, setExtras] = useState<ExtraItem[]>([]);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploadingKop, setIsUploadingKop] = useState(false);

  // Edit states
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);

  const parseBulkSchedule = (text: string, grade: string) => {
    const days = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU', 'MINGGU'];
    const lines = text.split('\n');
    const results: any[] = [];
    let currentDay = '';
    let currentSubjects: any[] = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (days.includes(trimmed.toUpperCase())) {
        if (currentDay && currentSubjects.length > 0) {
          results.push({
            grade,
            day: currentDay.charAt(0).toUpperCase() + currentDay.slice(1).toLowerCase(),
            subjects: [...currentSubjects]
          });
        }
        currentDay = trimmed.toUpperCase();
        currentSubjects = [];
      } else if (trimmed.includes('|')) {
        const parts = trimmed.split('|');
        if (parts.length >= 2) {
          currentSubjects.push({
            time: parts[0].trim(),
            name: parts[1].trim()
          });
        }
      }
    });

    // Push last day
    if (currentDay && currentSubjects.length > 0) {
      results.push({
        grade,
        day: currentDay.charAt(0).toUpperCase() + currentDay.slice(1).toLowerCase(),
        subjects: currentSubjects
      });
    }

    return results;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string = 'imageUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB for processing)
    if (file.size > 5 * 1024 * 1024) {
      alert('File terlalu besar. Maksimal 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas for compression
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize if too large (max 1200px width/height)
        const MAX_SIZE = 1200;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to webp with 0.7 quality (high compression, good quality)
        const base64 = canvas.toDataURL('image/webp', 0.7);
        setEditingItem({ ...editingItem, [fieldName]: base64 });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const unsubNews = syncData.subscribeNews(setNews);
    const unsubGallery = syncData.subscribeGallery(setGallery);
    const unsubSchedules = syncData.subscribeSchedules(setSchedules);
    const unsubExtras = syncData.subscribeExtra(setExtras);
    const unsubStaff = syncData.subscribeStaff(setStaff);
    const unsubAchievements = syncData.subscribeAchievements(setAchievements);
    const unsubStats = syncData.subscribeStats(setStats);
    const unsubProfile = syncData.subscribeProfile(setProfile);
    const unsubConfig = syncData.subscribeAppConfig(setAppConfig);

    setLoading(false);

    return () => {
      unsubNews();
      unsubGallery();
      unsubSchedules();
      unsubExtras();
      unsubStaff();
      unsubAchievements();
      unsubStats();
      unsubProfile();
      unsubConfig();
    };
  }, []);

  const handleUploadKop = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran file terlalu besar. Maksimal 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadstart = () => setIsUploadingKop(true);
    reader.onload = async (evt) => {
      try {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Use high resolution for Kop (max 2500px width for sharpness)
          const MAX_WIDTH = 2500;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Enable image smoothing for better quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
          }

          // Convert to png for better Excel compatibility
          let base64 = canvas.toDataURL('image/png');
          
          // Fallback if PNG is still too huge (> 900KB for Firestore safety max 1MB)
          if (base64.length > 900000) {
            base64 = canvas.toDataURL('image/jpeg', 0.95); // High quality fallback
          }
          
          // Final safety check, if still too huge, reduce quality more
          if (base64.length > 950000) {
            base64 = canvas.toDataURL('image/jpeg', 0.85);
          }
          
          await syncData.saveAppConfig({
            headerImageUrl: base64
          });
          alert("Logo Kop Sekolah berhasil diperbarui!");
          setIsUploadingKop(false);
        };
        img.src = evt.target?.result as string;
      } catch (err) {
        console.error("Upload error:", err);
        alert("Gagal mengunggah gambar.");
        setIsUploadingKop(false);
      } finally {
        e.target.value = ''; // Reset input so same file can be selected again
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (activeTab === 'schedules' && editingItem?.isBulk) {
      try {
        const parsed = parseBulkSchedule(editingItem.bulkText || '', editingItem.grade || '');
        if (parsed.length === 0) {
          alert('Format jadwal tidak valid atau kosong.');
          setSaving(false);
          return;
        }
        
        // Delete existing for this grade
        const existingForGrade = schedules.filter(s => s.grade === editingItem.grade);
        for (const item of existingForGrade) {
          await syncData.deleteItem(collections.schedules, item.id);
        }

        // Save new ones
        for (const item of parsed) {
          await syncData.saveItem(collections.schedules, item);
        }

        setIsModalOpen(false);
        setEditingItem(null);
        alert('Jadwal bulk berhasil disimpan!');
      } catch (err) {
        console.error(err);
        alert('Gagal memproses jadwal bulk.');
      } finally {
        setSaving(false);
      }
      return;
    }

    let col = '';
    switch (activeTab) {
      case 'news': col = collections.news; break;
      case 'gallery': col = collections.gallery; break;
      case 'staff': col = collections.staff; break;
      case 'achievements': col = collections.achievements; break;
      case 'schedules': col = collections.schedules; break;
      case 'extras': col = collections.extra; break;
      case 'stats': col = collections.stats; break;
      case 'profile': col = collections.profile; break;
      case 'media': col = collections.profile; break;
    }

    try {
      if (activeTab === 'stats') {
        await syncData.saveStats(editingItem);
      } else if (activeTab === 'profile' || activeTab === 'media') {
        await syncData.saveProfile(editingItem);
      } else {
        await syncData.saveItem(col, editingItem);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      alert('Data berhasil disimpan!');
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menyimpan data. Pastikan Anda masuk dengan akun Admin yang benar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus item ini?')) return;
    let col = '';
    switch (activeTab) {
      case 'news': col = collections.news; break;
      case 'gallery': col = collections.gallery; break;
      case 'staff': col = collections.staff; break;
      case 'achievements': col = collections.achievements; break;
      case 'schedules': col = collections.schedules; break;
      case 'extras': col = collections.extra; break;
    }
    
    try {
      await syncData.deleteItem(col, id);
      alert('Data berhasil dihapus!');
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus data.');
    }
  };

  if (loading) return <div className="p-20 text-center font-bold text-blue-900">Loading Dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h2 className="text-3xl font-bold text-blue-950">Panel Administrasi</h2>
          <p className="text-slate-500">Kelola semua konten website dari satu tempat</p>
        </div>
        <button 
          onClick={async () => {
            await auth.signOut();
            onLogout();
          }}
          className="bg-red-50 text-red-600 px-6 py-2.5 rounded-full font-bold flex items-center gap-2 hover:bg-red-600 hover:text-white transition-all shadow-sm"
        >
          <LogOut size={18} /> Keluar
        </button>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1 space-y-2">
          {[
            { id: 'stats', label: 'Statistik Sekolah', icon: BarChart3, masterOnly: true },
            { id: 'profile', label: 'Visi & Misi', icon: Target, masterOnly: true },
            { id: 'media', label: 'Tampilan Utama', icon: ImageIcon, masterOnly: true },
            { id: 'news', label: 'Berita & Pengumuman', icon: Newspaper, masterOnly: true },
            { id: 'achievements', label: 'Prestasi Sekolah', icon: Trophy, masterOnly: true },
            { id: 'gallery', label: 'Galeri Foto', icon: ImageIcon, masterOnly: true },
            { id: 'staff', label: 'Staf & Guru', icon: Users, masterOnly: true },
            { id: 'schedules', label: 'Jadwal Pelajaran', icon: Calendar },
            { id: 'extras', label: 'Ekstrakurikuler', icon: Star, masterOnly: true },
            { id: 'grades', label: 'Nilai Raport (Kls 6)', icon: GraduationCap },
            { id: 'admins', label: 'Kelola Admin', icon: Shield, masterOnly: true },
          ].filter(tab => !tab.masterOnly || isMasterAdmin).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all text-left ${
                activeTab === tab.id 
                ? 'bg-blue-700 text-white shadow-xl translate-x-2' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
              }`}
            >
              <tab.icon size={20} /> {tab.label}
            </button>
          ))}

          {isMasterAdmin && (
            <div className="pt-8 mt-8 border-t border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-4 px-4">Maintenance</p>
              <button
                onClick={async () => {
                  if (window.confirm('Hati-hati! Ini akan menimpa data yang ada dengan data awal. Lanjutkan?')) {
                    await syncData.seedInitialData({
                      news: NEWS_DATA,
                      gallery: GALLERY_DATA,
                      schedules: SCHEDULE_DATA,
                      extra: EXTRA_DATA,
                      staff: [] // Uses default data in service if empty
                    });
                    alert('Data awal berhasil di-seed!');
                  }
                }}
                className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all text-left border border-dashed border-slate-200"
              >
                <Upload size={20} /> Seed Data Awal
              </button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 min-h-[600px]">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-blue-950 capitalize">{activeTab.replace('-', ' ')}</h3>
            <div className="flex gap-2">
              {activeTab === 'schedules' && (
                <>
                  <button 
                    onClick={() => {
                      setEditingItem({ isBulk: true, grade: '', bulkText: '' });
                      setIsModalOpen(true);
                    }}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2 font-bold text-xs"
                  >
                    <Upload size={16} /> Input Sekaligus
                  </button>
                </>
              )}
              {activeTab !== 'stats' && (
                <button 
                  onClick={() => {
                    setEditingItem({});
                    setIsModalOpen(true);
                  }}
                  className="bg-blue-700 text-white p-3 rounded-xl shadow-lg hover:bg-blue-800 transition-all active:scale-95"
                >
                  <Plus size={24} />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {activeTab === 'stats' && (
              stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { key: 'studentCount', label: 'Jumlah Siswa' },
                    { key: 'teacherCount', label: 'Jumlah Guru' },
                    { key: 'accreditation', label: 'Akreditasi' },
                    { key: 'foundationYear', label: 'Tahun Berdiri' },
                  ].map((field) => (
                    <div key={field.key} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">{field.label}</label>
                      <div className="flex justify-between items-center">
                        <span className="text-xl font-bold text-blue-900">{stats[field.key]}</span>
                        <button 
                          onClick={() => {
                            setEditingItem(stats);
                            setIsModalOpen(true);
                          }}
                          className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="md:col-span-2 pt-10 border-t border-slate-100 mt-4">
                    <p className="text-sm text-slate-400 italic">Terakhir diperbarui: {stats.updatedAt ? new Date(stats.updatedAt).toLocaleString('id-ID') : '-'}</p>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                  <BarChart3 size={48} className="mx-auto text-slate-300 mb-4" />
                  <h4 className="text-slate-800 font-bold mb-2">Statistik Belum Diatur</h4>
                  <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">Klik tombol dibawah untuk mengaktifkan fitur statistik sekolah di website.</p>
                  <button 
                    onClick={async () => {
                      const initialStats = { studentCount: '0', teacherCount: '0', accreditation: '-', foundationYear: '-' };
                      await syncData.saveStats(initialStats);
                      setStats(initialStats);
                    }}
                    className="bg-blue-700 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:bg-blue-800 transition-all active:scale-95"
                  >
                    Aktifkan Statistik
                  </button>
                </div>
              )
            )}
            
            {activeTab === 'profile' && (
              profile ? (
                <div className="space-y-8">
                  <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                        <Target size={20} /> Visi Sekolah
                      </h4>
                      <button 
                        onClick={() => {
                          setEditingItem(profile);
                          setIsModalOpen(true);
                        }}
                        className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>
                    <p className="text-slate-600 italic leading-relaxed">"{profile.vision}"</p>
                  </div>

                  <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                        <BookOpen size={20} /> Misi Sekolah
                      </h4>
                      <button 
                        onClick={() => {
                          setEditingItem(profile);
                          setIsModalOpen(true);
                        }}
                        className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>
                    <ul className="space-y-3">
                      {profile.mission?.split('\n').map((line: string, i: number) => (
                        <li key={i} className="flex gap-3 text-slate-600">
                          <div className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6 border-t border-slate-100 italic text-sm text-slate-400">
                    Terakhir diperbarui: {profile.updatedAt ? new Date(profile.updatedAt).toLocaleString('id-ID') : '-'}
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                  <Target size={48} className="mx-auto text-slate-300 mb-4" />
                  <h4 className="text-slate-800 font-bold mb-2">Profil Belum Diatur</h4>
                  <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">Klik tombol dibawah untuk mengatur Visi & Misi sekolah.</p>
                  <button 
                    onClick={async () => {
                      const initialProfile = { 
                        vision: 'Menjadi lembaga pendidikan...', 
                        mission: 'Misi 1\nMisi 2\nMisi 3' 
                      };
                      await syncData.saveProfile(initialProfile);
                      setProfile(initialProfile);
                    }}
                    className="bg-blue-700 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:bg-blue-800 transition-all active:scale-95"
                  >
                    Atur Visi & Misi
                  </button>
                </div>
              )
            )}

            {activeTab === 'media' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col items-center text-center">
                    <div className="w-full aspect-video rounded-3xl overflow-hidden mb-6 bg-slate-200">
                      <img 
                        src={profile?.heroImage || 'https://images.unsplash.com/photo-1544717297-fa95b3ee51f3?auto=format&fit=crop&q=80'} 
                        alt="Hero Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h4 className="font-bold text-blue-900 mb-2">Gambar Utama (Hero)</h4>
                    <p className="text-slate-500 text-sm mb-6">Gambar besar yang muncul di bagian paling atas website.</p>
                    <button 
                      onClick={() => {
                        setEditingItem(profile || { heroImage: '', profileImage: '' });
                        setIsModalOpen(true);
                      }}
                      className="bg-white text-blue-600 px-6 py-3 rounded-2xl font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                    >
                      <Edit2 size={18} /> Ubah Link Gambar
                    </button>
                  </div>

                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col items-center text-center">
                    <div className="w-full aspect-square max-w-[200px] rounded-[3rem] overflow-hidden mb-6 bg-slate-200">
                      <img 
                        src={profile?.profileImage || 'https://images.unsplash.com/photo-1523050335392-93851179ae22?auto=format&fit=crop&q=80'} 
                        alt="Profile Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h4 className="font-bold text-blue-900 mb-2">Gambar Visi & Misi</h4>
                    <p className="text-slate-500 text-sm mb-6">Gambar yang mendampingi teks Visi & Misi sekolah.</p>
                    <button 
                      onClick={() => {
                        setEditingItem(profile || { heroImage: '', profileImage: '' });
                        setIsModalOpen(true);
                      }}
                      className="bg-white text-blue-600 px-6 py-3 rounded-2xl font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                    >
                      <Edit2 size={18} /> Ubah Link Gambar
                    </button>
                  </div>
                </div>

                {/* New Kop Sekolah Section */}
                <div className="bg-blue-50/50 p-8 rounded-[2.5rem] border border-blue-100">
                  <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="w-full md:w-1/3 space-y-4">
                      <div className="bg-white p-4 rounded-3xl shadow-sm border border-blue-100">
                        {appConfig?.headerImageUrl ? (
                          <img src={appConfig.headerImageUrl} alt="Kop Sekolah Preview" className="w-full h-auto rounded-xl" />
                        ) : (
                          <div className="aspect-video bg-blue-100/30 rounded-xl flex items-center justify-center text-blue-300 italic text-xs">
                            Kop belum diupload
                          </div>
                        )}
                      </div>
                      <label className={`block w-full ${isUploadingKop ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
                        <input type="file" accept="image/*" onChange={handleUploadKop} className="hidden" />
                        <div className="flex items-center justify-center gap-2 bg-blue-600 text-white p-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg text-sm">
                          {isUploadingKop ? 'Sedang Mengunggah...' : (appConfig?.headerImageUrl ? 'Ganti Kop Sekolah' : 'Upload Kop Sekolah')}
                        </div>
                      </label>
                      {appConfig?.headerImageUrl && (
                        <button 
                          onClick={async () => {
                            if (window.confirm("Hapus gambar kop? Excel akan kembali menggunakan teks.")) {
                              try {
                                await syncData.saveAppConfig({ headerImageUrl: null });
                                alert("Kop Sekolah dihapus.");
                              } catch (err) {
                                console.error(err);
                                alert("Gagal menghapus kop.");
                              }
                            }
                          }}
                          className="w-full py-2 text-red-500 font-bold text-[10px] hover:bg-red-50 rounded-xl transition-all"
                        >
                          Hapus Kop
                        </button>
                      )}
                    </div>
                    <div className="flex-1 space-y-4">
                      <h4 className="text-2xl font-bold text-blue-900">Gambar Kop Sekolah (Excel)</h4>
                      <p className="text-slate-600 leading-relaxed text-sm">
                        Unggah gambar kop surat sekolah di sini. Gambar ini akan otomatis muncul di bagian paling atas setiap file PDF atau Excel (Rekapan Nilai) yang diekspor dari aplikasi.
                      </p>
                      <ul className="space-y-2 text-xs text-slate-500">
                        <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-blue-400" /> Gunakan format PNG atau JPG</li>
                        <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-blue-400" /> Ukuran maksimal 2MB</li>
                        <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-blue-400" /> Gunakan gambar dengan aspect ratio panjang (lebar)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'news' && news.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                <div className="flex items-center gap-4">
                  <img src={item.imageUrl} className="w-16 h-16 rounded-xl object-cover shadow-sm" alt="" />
                  <div>
                    <h4 className="font-bold text-slate-800 line-clamp-1">{item.title}</h4>
                    <p className="text-xs text-slate-400">{item.date} • {item.category}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-white rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-all"><Edit2 size={18} /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-white rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}

            {activeTab === 'achievements' && achievements.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-2 group hover:border-blue-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-yellow-600 shadow-sm overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <Trophy size={20} />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{item.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.type === 'Guru' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                        {item.type}
                      </span>
                      <p className="text-xs text-slate-400">{item.date} {item.category && `• ${item.category}`}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-white rounded-xl shadow-sm transition-all"><Edit2 size={18} /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-white rounded-xl shadow-sm transition-all"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}

            {activeTab === 'gallery' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {gallery.map((item) => (
                  <div key={item.id} className="relative aspect-square rounded-2xl overflow-hidden group">
                    <img src={item.imageUrl} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-blue-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                      <p className="text-white text-xs font-bold px-2 text-center">{item.title}</p>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-2 bg-white text-blue-700 rounded-lg shadow-lg"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 bg-white text-red-600 rounded-lg shadow-lg"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'staff' && staff.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-2 group hover:border-blue-200 transition-all">
                <div className="flex items-center gap-4">
                  <img src={item.imageUrl || 'https://via.placeholder.com/150'} className="w-12 h-12 rounded-full object-cover shadow-sm" alt="" />
                  <div>
                    <h4 className="font-bold text-slate-800">{item.name}</h4>
                    <p className="text-xs text-slate-400">{item.position}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-white rounded-xl shadow-sm transition-all"><Edit2 size={18} /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-white rounded-xl shadow-sm transition-all"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}

            {activeTab === 'schedules' && (
              <div className="space-y-8">
                {['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'].map(grade => {
                  const gradeSchedules = schedules.filter(s => s.grade === grade);
                  if (gradeSchedules.length === 0) return null;
                  return (
                    <div key={grade} className="space-y-3 pt-4 first:pt-0">
                      <div className="flex justify-between items-center px-2">
                        <h4 className="text-sm font-black text-blue-900/40 uppercase tracking-widest">{grade}</h4>
                        <button 
                          onClick={async () => {
                            if (window.confirm(`Hapus seluruh jadwal untuk ${grade}? Tindakan ini tidak dapat dibatalkan.`)) {
                              try {
                                for (const item of gradeSchedules) {
                                  await syncData.deleteItem(collections.schedules, item.id);
                                }
                                alert(`Jadwal ${grade} berhasil dibersihkan.`);
                              } catch (err) {
                                console.error(err);
                                alert(`Gagal menghapus beberapa jadwal untuk ${grade}.`);
                              }
                            }
                          }}
                          className="text-[10px] font-bold text-red-400 hover:text-red-600 flex items-center gap-1.5 transition-colors bg-red-50/50 px-2 py-1 rounded-lg"
                        >
                          <Trash2 size={12} /> Hapus Jadwal {grade}
                        </button>
                      </div>
                      {gradeSchedules.sort((a,b) => {
                        const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
                        return days.indexOf(a.day) - days.indexOf(b.day);
                      }).map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all">
                          <div>
                            <h4 className="font-bold text-slate-800">{item.day}</h4>
                            <p className="text-xs text-slate-400">{item.subjects.length} Pelajaran</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-white rounded-xl shadow-sm transition-all"><Edit2 size={18} /></button>
                            <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-white rounded-xl shadow-sm transition-all"><Trash2 size={18} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {schedules.length === 0 && <p className="text-center py-10 text-slate-400 italic">Belum ada jadwal. Klik + untuk menambah.</p>}
              </div>
            )}

            {activeTab === 'extras' && extras.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-2 group hover:border-blue-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                    {item.icon === 'Tent' && <Tent size={20} />}
                    {item.icon === 'Music' && <Music size={20} />}
                    {item.icon === 'Trophy' && <Trophy size={20} />}
                    {item.icon === 'Palette' && <Palette size={20} />}
                    {item.icon === 'Target' && <Target size={20} />}
                    {item.icon === 'BookOpen' && <BookOpen size={20} />}
                    {item.icon === 'Mic2' && <Mic2 size={20} />}
                    {item.icon === 'Heart' && <Heart size={20} />}
                    {item.icon === 'Camera' && <Camera size={20} />}
                    {item.icon === 'Monitor' && <Monitor size={20} />}
                    {item.icon === 'Globe' && <Globe size={20} />}
                    {item.icon === 'Users' && <Users size={20} />}
                    {(!item.icon || item.icon === 'Star') && <Star size={20} />}
                  </div>
                  <div><h4 className="font-bold text-slate-800">{item.name}</h4><p className="text-xs text-slate-400">{item.coach || 'Tanpa Pelatih'}</p></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-white rounded-xl shadow-sm transition-all"><Edit2 size={18} /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-white rounded-xl shadow-sm transition-all"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}

            {activeTab === 'grades' && <GradeManager />}
            {activeTab === 'admins' && <AdminAccountManager />}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-[2.5rem] shadow-2xl relative z-10 scrollbar-none p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-blue-950">Edit {activeTab}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={24} /></button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                {activeTab === 'news' && (
                  <>
                    <input required className="w-full bg-slate-50 rounded-2xl p-4 outline-none" placeholder="Judul Berita" value={editingItem?.title || ''} onChange={e => setEditingItem({...editingItem, title: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                      <input required className="w-full bg-slate-50 rounded-2xl p-4 outline-none" placeholder="Tanggal" value={editingItem?.date || ''} onChange={e => setEditingItem({...editingItem, date: e.target.value})} />
                      <input required className="w-full bg-slate-50 rounded-2xl p-4 outline-none" placeholder="Kategori" value={editingItem?.category || ''} onChange={e => setEditingItem({...editingItem, category: e.target.value})} />
                    </div>
                    <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Gambar Berita</label>
                        <div className="flex gap-4 items-center">
                          <div className="w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            {editingItem?.imageUrl ? (
                              <img src={editingItem.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                            ) : (
                              <ImageIcon className="text-slate-300" size={32} />
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <label className="cursor-pointer bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-100 transition-all inline-block">
                              Pilih File Perangkat
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'imageUrl')} />
                            </label>
                            <p className="text-[10px] text-slate-400">Atau masukkan link manual dibawah ini:</p>
                            <input required className="w-full bg-slate-50 rounded-2xl p-4 outline-none text-sm" placeholder="Image URL (Drive/Link)" value={editingItem?.imageUrl || ''} onChange={e => setEditingItem({...editingItem, imageUrl: e.target.value})} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <textarea required className="w-full bg-slate-50 rounded-2xl p-4 outline-none" rows={2} placeholder="Excerpt/Ringkasan" value={editingItem?.excerpt || ''} onChange={e => setEditingItem({...editingItem, excerpt: e.target.value})} />
                    <textarea required className="w-full bg-slate-50 rounded-2xl p-4 outline-none" rows={6} placeholder="Konten Lengkap" value={editingItem?.content || ''} onChange={e => setEditingItem({...editingItem, content: e.target.value})} />
                  </>
                )}

                {activeTab === 'achievements' && (
                  <>
                    <input required className="w-full bg-slate-50 rounded-2xl p-4 outline-none" placeholder="Judul Prestasi (Contoh: Juara 1 Lomba Sains)" value={editingItem?.title || ''} onChange={e => setEditingItem({...editingItem, title: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                      <select required className="w-full bg-slate-50 rounded-2xl p-4 outline-none appearance-none font-bold text-blue-900" value={editingItem?.type || ''} onChange={e => setEditingItem({...editingItem, type: e.target.value as any})}>
                        <option value="">-- Tipe Prestasi --</option>
                        <option value="Siswa">Siswa</option>
                        <option value="Guru">Guru</option>
                      </select>
                      <input required className="w-full bg-slate-50 rounded-2xl p-4 outline-none" placeholder="Tanggal (Contoh: Mei 2024)" value={editingItem?.date || ''} onChange={e => setEditingItem({...editingItem, date: e.target.value})} />
                    </div>
                    <input className="w-full bg-slate-50 rounded-2xl p-4 outline-none" placeholder="Kategori (Contoh: Akademik / Olahraga)" value={editingItem?.category || ''} onChange={e => setEditingItem({...editingItem, category: e.target.value})} />
                    <div className="space-y-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Gambar Prestasi (Opsional)</label>
                        <div className="flex gap-4 items-center">
                          <div className="w-24 h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            {editingItem?.imageUrl ? (
                              <img src={editingItem.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                            ) : (
                              <ImageIcon className="text-slate-300" size={32} />
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <label className="cursor-pointer bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-100 transition-all inline-block">
                              Pilih File Perangkat
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'imageUrl')} />
                            </label>
                            <input className="w-full bg-slate-50 rounded-2xl p-4 outline-none text-sm" placeholder="Atau tempel link gambar" value={editingItem?.imageUrl || ''} onChange={e => setEditingItem({...editingItem, imageUrl: e.target.value})} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <textarea required className="w-full bg-slate-50 rounded-2xl p-4 outline-none" rows={4} placeholder="Deskripsi Prestasi" value={editingItem?.description || ''} onChange={e => setEditingItem({...editingItem, description: e.target.value})} />
                  </>
                )}

                {activeTab === 'gallery' && (
                  <div className="space-y-6">
                    <input required className="w-full bg-slate-50 rounded-2xl p-4 outline-none" placeholder="Judul Foto" value={editingItem?.title || ''} onChange={e => setEditingItem({...editingItem, title: e.target.value})} />
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">File Foto</label>
                        <div className="flex gap-4 items-center">
                          <div className="w-32 h-32 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            {editingItem?.imageUrl ? (
                              <img src={editingItem.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                            ) : (
                              <ImageIcon className="text-slate-300" size={40} />
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <label className="cursor-pointer bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-100 transition-all inline-block">
                              Unggah dari Perangkat
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'imageUrl')} />
                            </label>
                            <p className="text-[10px] text-slate-400">Atau masukkan link manual dibawah ini:</p>
                            <input required className="w-full bg-slate-50 rounded-2xl p-4 outline-none text-sm" placeholder="Image URL (Drive/Link)" value={editingItem?.imageUrl || ''} onChange={e => setEditingItem({...editingItem, imageUrl: e.target.value})} />
                          </div>
                        </div>
                      </div>
                  </div>
                )}

                {activeTab === 'staff' && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Foto Staf/Guru</label>
                      <div className="flex gap-4 items-center">
                        <div className="w-32 h-32 rounded-full bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {editingItem?.imageUrl ? (
                            <img src={editingItem.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                          ) : (
                            <ImageIcon className="text-slate-300" size={40} />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <label className="cursor-pointer bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-100 transition-all inline-block">
                            Pilih Foto Guru
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'imageUrl')} />
                          </label>
                          <p className="text-[10px] text-slate-400">Pastikan foto rasio 1:1 (kotak/lingkaran) agar tidak terpotong.</p>
                          <input className="w-full bg-slate-50 rounded-2xl p-4 outline-none text-sm" placeholder="Atau tempel link foto disini" value={editingItem?.imageUrl || ''} onChange={e => setEditingItem({...editingItem, imageUrl: e.target.value})} />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Nama Lengkap & Gelar</label>
                      <input required className="w-full bg-slate-50 rounded-2xl p-4 outline-none font-bold text-blue-900" placeholder="Contoh: Nama Guru, S.Pd." value={editingItem?.name || ''} onChange={e => setEditingItem({...editingItem, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Jabatan / Guru Mapel</label>
                      <input required className="w-full bg-slate-50 rounded-2xl p-4 outline-none" placeholder="Contoh: Wali Kelas 1 / Kepala Sekolah / Guru PAI" value={editingItem?.position || ''} onChange={e => setEditingItem({...editingItem, position: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Pendidikan Terakhir (Opsional)</label>
                      <input className="w-full bg-slate-50 rounded-2xl p-4 outline-none" placeholder="Contoh: S1 Pendidikan Guru Sekolah Dasar" value={editingItem?.education || ''} onChange={e => setEditingItem({...editingItem, education: e.target.value})} />
                    </div>
                  </div>
                )}

                {activeTab === 'stats' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'studentCount', label: 'Jumlah Siswa Aktif' },
                      { key: 'teacherCount', label: 'Jumlah Tenaga Pendidik' },
                      { key: 'accreditation', label: 'Nilai Akreditasi (A/B/C)' },
                      { key: 'foundationYear', label: 'Tahun Berdiri Sekolah' },
                    ].map(field => (
                      <div key={field.key}>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">{field.label}</label>
                        <input 
                          className="w-full bg-slate-50 rounded-2xl p-4 outline-none font-bold text-blue-900" 
                          value={editingItem?.[field.key] || ''} 
                          onChange={e => setEditingItem({...editingItem, [field.key]: e.target.value})} 
                        />
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'media' && (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Gambar Utama (Hero)</label>
                      <div className="flex gap-6 items-start">
                        <div className="w-48 aspect-video rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                          {editingItem?.heroImage ? (
                            <img src={editingItem.heroImage} className="w-full h-full object-cover" alt="Hero Preview" />
                          ) : (
                            <ImageIcon className="text-slate-300" size={32} />
                          )}
                        </div>
                        <div className="flex-1 space-y-3">
                          <label className="cursor-pointer bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-800 transition-all shadow-md inline-flex items-center gap-2">
                            <Upload size={16} /> Unggah Gambar Hero
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'heroImage')} />
                          </label>
                          <p className="text-[10px] text-slate-400">Rekomendasi ukuran: 1920x1080px. Link manual:</p>
                          <input 
                            className="w-full bg-slate-50 rounded-2xl p-4 outline-none text-sm font-bold text-blue-900" 
                            placeholder="https://images.unsplash.com/..."
                            value={editingItem?.heroImage || ''} 
                            onChange={e => setEditingItem({...editingItem, heroImage: e.target.value})} 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Gambar Profil Visi Misi</label>
                      <div className="flex gap-6 items-start">
                        <div className="w-48 aspect-square rounded-[2rem] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                          {editingItem?.profileImage ? (
                            <img src={editingItem.profileImage} className="w-full h-full object-cover" alt="Profile Preview" />
                          ) : (
                            <ImageIcon className="text-slate-300" size={40} />
                          )}
                        </div>
                        <div className="flex-1 space-y-3">
                          <label className="cursor-pointer bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-800 transition-all shadow-md inline-flex items-center gap-2">
                            <Upload size={16} /> Unggah Gambar Profil
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'profileImage')} />
                          </label>
                          <p className="text-[10px] text-slate-400">Rekomendasi ukuran: 800x800px (1:1). Link manual:</p>
                          <input 
                            className="w-full bg-slate-50 rounded-2xl p-4 outline-none text-sm font-bold text-blue-900" 
                            placeholder="https://images.unsplash.com/..."
                            value={editingItem?.profileImage || ''} 
                            onChange={e => setEditingItem({...editingItem, profileImage: e.target.value})} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Visi Sekolah</label>
                      <textarea 
                        required 
                        className="w-full bg-slate-50 rounded-2xl p-4 outline-none font-bold text-blue-900 leading-relaxed" 
                        rows={3}
                        placeholder="Masukkan visi sekolah..."
                        value={editingItem?.vision || ''} 
                        onChange={e => setEditingItem({...editingItem, vision: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Misi Sekolah (Satu baris per poin)</label>
                      <textarea 
                        required 
                        className="w-full bg-slate-50 rounded-2xl p-4 outline-none text-slate-700 leading-relaxed" 
                        rows={10}
                        placeholder="Masukkan misi sekolah, tekan Enter untuk poin baru..."
                        value={editingItem?.mission || ''} 
                        onChange={e => setEditingItem({...editingItem, mission: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'schedules' && (
                  <div className="space-y-4">
                    {editingItem?.isBulk ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Nama Kelas (Contoh: Kelas 6A)</label>
                          <input 
                            required 
                            className="w-full bg-slate-50 rounded-2xl p-4 outline-none font-bold text-blue-900" 
                            placeholder="Ketik nama kelas..."
                            value={editingItem?.grade || ''} 
                            onChange={e => setEditingItem({...editingItem, grade: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Paste Jadwal Seluruh Minggu</label>
                          <p className="text-[10px] text-slate-400 mb-2">Format: SENIN [Enter] Jam | Mapel [Enter] ...</p>
                          <textarea 
                            required
                            className="w-full bg-slate-50 rounded-2xl p-4 outline-none font-mono text-sm" 
                            rows={12} 
                            placeholder="SENIN&#10;07.00-08.00 | Matematika&#10;08.00-09.00 | Bahasa Indonesia" 
                            value={editingItem?.bulkText || ''} 
                            onChange={e => setEditingItem({...editingItem, bulkText: e.target.value})}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Nama Kelas</label>
                            <input 
                              required 
                              className="w-full bg-slate-50 rounded-2xl p-4 outline-none font-bold text-blue-900" 
                              placeholder="Contoh: Kelas 1A"
                              value={editingItem?.grade || ''} 
                              onChange={e => setEditingItem({...editingItem, grade: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Pilih Hari</label>
                            <select 
                              required 
                              className="w-full bg-slate-50 rounded-2xl p-4 outline-none appearance-none font-bold text-blue-900" 
                              value={editingItem?.day || ''} 
                              onChange={e => setEditingItem({...editingItem, day: e.target.value})}
                            >
                              <option value="">-- Pilih Hari --</option>
                              {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Daftar Pelajaran (Format: Jam|Nama, satu per baris)</label>
                          <textarea 
                            className="w-full bg-slate-50 rounded-2xl p-4 outline-none font-mono text-sm" 
                            rows={6} 
                            placeholder="07:00-08:00|Matematika" 
                            value={editingItem?.subjects?.map((s:any) => `${s.time}|${s.name}`).join('\n') || ''} 
                            onChange={e => {
                              const lines = e.target.value.split('\n');
                              const subs = lines.map(l => {
                                const [time, name] = l.split('|');
                                return { time: (time || '').trim(), name: (name || '').trim() };
                              }).filter(x => x.name);
                              setEditingItem({...editingItem, subjects: subs});
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'extras' && (
                  <div className="space-y-4">
                    <input required className="w-full bg-slate-50 rounded-2xl p-4 outline-none" placeholder="Nama Ekstrakurikuler" value={editingItem?.name || ''} onChange={e => setEditingItem({...editingItem, name: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                      <input className="w-full bg-slate-50 rounded-2xl p-4 outline-none" placeholder="Pelatih" value={editingItem?.coach || ''} onChange={e => setEditingItem({...editingItem, coach: e.target.value})} />
                      <input className="w-full bg-slate-50 rounded-2xl p-4 outline-none" placeholder="Jadwal" value={editingItem?.schedule || ''} onChange={e => setEditingItem({...editingItem, schedule: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Pilih Ikon</label>
                      <select 
                        className="w-full bg-slate-50 rounded-2xl p-4 outline-none appearance-none font-bold text-blue-900" 
                        value={editingItem?.icon || ''} 
                        onChange={e => setEditingItem({...editingItem, icon: e.target.value})}
                      >
                        <option value="">-- Tanpa Ikon --</option>
                        <option value="Trophy">Piala (Olahraga/Prestasi)</option>
                        <option value="Music">Musik (Drum Band/Seni)</option>
                        <option value="Palette">Palet (Menggambar)</option>
                        <option value="Target">Target (Fokus/Panahan)</option>
                        <option value="BookOpen">Buku (Literasi)</option>
                        <option value="Tent">Tenda (Pramuka)</option>
                        <option value="Mic2">Mic (Vokal/Paduan Suara)</option>
                        <option value="Heart">Hati (Kemanusiaan/PMR)</option>
                        <option value="Camera">Kamera (Fotografi)</option>
                        <option value="Monitor">Monitor (TIK)</option>
                        <option value="Users">Orang (Organisasi)</option>
                        <option value="Globe">Dunia (Bahasa/Sains)</option>
                        <option value="Star">Bintang (Umum)</option>
                      </select>
                    </div>
                    <textarea className="w-full bg-slate-50 rounded-2xl p-4 outline-none" rows={2} placeholder="Deskripsi Singkat" value={editingItem?.description || ''} onChange={e => setEditingItem({...editingItem, description: e.target.value})} />
                    <textarea className="w-full bg-slate-50 rounded-2xl p-4 outline-none" rows={4} placeholder="Deskripsi Lengkap" value={editingItem?.longDescription || ''} onChange={e => setEditingItem({...editingItem, longDescription: e.target.value})} />
                  </div>
                )}

                <button disabled={saving} type="submit" className="w-full bg-blue-700 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-blue-800 transition-all flex items-center justify-center gap-2 disabled:bg-slate-400">
                  <Save size={20} /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
