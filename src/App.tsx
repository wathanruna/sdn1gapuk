/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, X, Phone, Mail, MapPin, 
  ChevronRight, Calendar, Users, 
  Trophy, BookOpen, Clock, Tent, 
  Music, Cpu, Instagram, Facebook, Twitter,
  Settings, Palette, Target, Mic2, Heart,
  Camera, Monitor, Globe, Star, ArrowLeft, ArrowRight
} from 'lucide-react';
import { syncData } from './lib/dataService';
import { translations } from './lib/translations';
import { NewsItem, GalleryItem, ScheduleItem, ExtraItem, StaffItem, AchievementItem } from './types';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';
import { auth, onAuthStateChanged, db } from './lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const NavLink = ({ href, children, onClick, scrolled }: { href: string; children: React.ReactNode; onClick?: () => void, scrolled?: boolean }) => (
  <a 
    href={href} 
    onClick={onClick}
    className={`${scrolled ? 'text-slate-600 hover:text-blue-700' : 'text-white hover:text-blue-200'} font-medium transition-colors duration-200`}
  >
    {children}
  </a>
);

// Modal Component Wrapper
const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-[2.5rem] shadow-2xl relative z-10 scrollbar-none"
        >
          <div className="sticky top-0 bg-white/80 backdrop-blur-md px-8 py-6 border-b border-slate-100 flex justify-between items-center z-20">
            <h3 className="text-xl font-bold text-blue-950">{title}</h3>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
            >
              <X size={24} />
            </button>
          </div>
          <div className="p-8">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default function App() {
  const [lang, setLang] = useState<'id' | 'en'>('id');
  const t = translations[lang];

  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [galleryData, setGalleryData] = useState<GalleryItem[]>([]);
  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
  const [extraData, setExtraData] = useState<ExtraItem[]>([]);
  const [staffData, setStaffData] = useState<StaffItem[]>([]);
  const [achievementsData, setAchievementsData] = useState<AchievementItem[]>([]);
  const [showAllGallery, setShowAllGallery] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const staffScrollRef = useRef<HTMLDivElement>(null);

  const scrollStaff = (direction: 'left' | 'right') => {
    if (staffScrollRef.current) {
      const scrollAmount = 300;
      staffScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  const [stats, setStats] = useState({
    studentCount: '136',
    teacherCount: '12',
    accreditation: 'B',
    foundationYear: '1987'
  });
  const [profile, setProfile] = useState({
    vision: 'Menjadi lembaga pendidikan dasar yang unggul dalam prestasi, berkarakter mulia, dan berwawasan teknologi masa depan berdasarkan iman dan taqwa.',
    mission: 'Menanamkan nilai karakter dan budi pekerti luhur sejak dini.\nMenyelenggarakan pembelajaran kreatif dan inovatif berbasis IT.\nMengembangkan potensi bakat siswa melalui berbagai ekstrakurikuler.',
    heroImage: 'https://images.unsplash.com/photo-1544717297-fa95b3ee51f3?auto=format&fit=crop&q=80',
    profileImage: 'https://images.unsplash.com/photo-1523050335392-93851179ae22?auto=format&fit=crop&q=80'
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState('Senin');
  const [selectedGrade, setSelectedGrade] = useState('Kelas 1');
  
  // Contact Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Registration Form State
  const [regForm, setRegForm] = useState({
    studentName: '',
    birthPlace: '',
    birthDate: '',
    parentName: '',
    whatsapp: '',
    address: ''
  });

  // Modal States
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [selectedExtra, setSelectedExtra] = useState<ExtraItem | null>(null);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<GalleryItem | null>(null);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [isAllNewsOpen, setIsAllNewsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      const userEmail = user?.email?.toLowerCase();
      const isMasterAdmin = userEmail === 'wathan045@gmail.com';
      
      let isAdditionalAdmin = false;
      if (userEmail && !isMasterAdmin) {
        try {
          const adminDoc = await getDoc(doc(db, 'admins', userEmail));
          isAdditionalAdmin = adminDoc.exists();
        } catch (err) {
          console.error("Admin check failed:", err);
        }
      }

      if (user && (isMasterAdmin || isAdditionalAdmin)) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    });

    // Subscribe to Firebase data
    const unsubNews = syncData.subscribeNews(setNewsData);
    const unsubGallery = syncData.subscribeGallery(setGalleryData);
    const unsubSchedules = syncData.subscribeSchedules((data) => {
      setScheduleData(data);
      // Automatically select the first available grade if current selection is not in data
      const uniqueGrades = Array.from(new Set(data.map(s => s.grade))).sort();
      if (uniqueGrades.length > 0 && (!selectedGrade || !uniqueGrades.includes(selectedGrade))) {
        setSelectedGrade(uniqueGrades[0]);
      }
    });
    const unsubExtras = syncData.subscribeExtra(setExtraData);
    const unsubStaff = syncData.subscribeStaff(setStaffData);
    const unsubAchievements = syncData.subscribeAchievements(setAchievementsData);
    const unsubStats = syncData.subscribeStats((val) => val && setStats(val));
    const unsubProfile = syncData.subscribeProfile((val) => val && setProfile(val));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      unsubNews();
      unsubGallery();
      unsubSchedules();
      unsubExtras();
      unsubStaff();
      unsubAchievements();
      unsubStats();
      unsubProfile();
    };
  }, []);

  if (isAdminMode) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md py-4">
          <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src="https://lh3.googleusercontent.com/d/1sUaFfYHajE5E__zoW7DGQM9odSDDnwHg" alt="Logo" className="w-10 h-10 object-contain" />
              <h1 className="font-bold text-blue-900">ADMIN PANEL - SDN 1 GAPUK</h1>
            </div>
            <button onClick={() => setIsAdminMode(false)} className="text-slate-600 font-bold hover:text-blue-700 transition-colors">Kembali ke Website</button>
          </div>
        </nav>
        {isLoggedIn ? (
          <AdminDashboard onLogout={() => setIsLoggedIn(false)} />
        ) : (
          <Login onLogin={(success) => setIsLoggedIn(success)} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex justify-between items-center">
          <a href="#beranda" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-12 h-12 flex items-center justify-center">
              <img 
                src="https://lh3.googleusercontent.com/d/1sUaFfYHajE5E__zoW7DGQM9odSDDnwHg" 
                alt="Logo SDN 1 Gapuk" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className={`font-bold text-lg leading-none ${scrolled ? 'text-blue-900' : 'text-white'}`}>SD NEGERI 1 GAPUK</h1>
              <p className={`text-[10px] uppercase tracking-wider font-semibold mt-1 ${scrolled ? 'text-slate-500' : 'text-blue-100'}`}>Cerdas, Berkarakter, Unggul</p>
            </div>
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink href="#visi-misi" scrolled={scrolled}>{t.nav.visionMission}</NavLink>
            <NavLink href="#pendaftaran" scrolled={scrolled}>{t.nav.registration}</NavLink>
            <NavLink href="#prestasi" scrolled={scrolled}>{t.nav.prestasi}</NavLink>
            <NavLink href="#berita" scrolled={scrolled}>{t.nav.news}</NavLink>
            <NavLink href="#staf" scrolled={scrolled}>{t.nav.staf}</NavLink>
            <NavLink href="#jadwal" scrolled={scrolled}>{t.nav.jadwal}</NavLink>
            <NavLink href="#galeri" scrolled={scrolled}>{t.nav.galeri}</NavLink>
            
            {/* Language Switcher */}
            <div className={`flex items-center gap-1 border rounded-full p-1 ${scrolled ? 'border-slate-200 bg-slate-50' : 'border-white/20 bg-white/10'}`}>
              <button 
                onClick={() => setLang('id')}
                className={`text-[10px] font-bold px-2 py-1 rounded-full transition-all ${lang === 'id' ? 'bg-blue-600 text-white shadow-sm' : scrolled ? 'text-slate-400' : 'text-white/50'}`}
              >
                ID
              </button>
              <button 
                onClick={() => setLang('en')}
                className={`text-[10px] font-bold px-2 py-1 rounded-full transition-all ${lang === 'en' ? 'bg-blue-600 text-white shadow-sm' : scrolled ? 'text-slate-400' : 'text-white/50'}`}
              >
                EN
              </button>
            </div>

            <a 
              href="#kontak"
              className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2.5 rounded-full font-semibold transition-all shadow-lg hover:shadow-blue-200 active:scale-95"
            >
              {t.nav.hubungi}
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-4 md:hidden">
            <button 
              onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
              className={`text-xs font-bold w-10 h-10 rounded-full border flex items-center justify-center ${scrolled ? 'border-slate-200 text-blue-900' : 'border-white/30 text-white'}`}
            >
              {lang.toUpperCase()}
            </button>
            <button className={`p-2 ${scrolled ? 'text-blue-900' : 'text-white'}`} onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-full left-0 right-0 bg-white shadow-xl border-t border-slate-100 p-4 flex flex-col gap-4 md:hidden"
            >
              <NavLink href="#visi-misi" onClick={() => setIsMenuOpen(false)} scrolled={true}>{t.nav.visionMission}</NavLink>
              <NavLink href="#pendaftaran" onClick={() => setIsMenuOpen(false)} scrolled={true}>{t.nav.registration}</NavLink>
              <NavLink href="#prestasi" onClick={() => setIsMenuOpen(false)} scrolled={true}>{t.nav.prestasi}</NavLink>
              <NavLink href="#berita" onClick={() => setIsMenuOpen(false)} scrolled={true}>{t.nav.news}</NavLink>
              <NavLink href="#staf" onClick={() => setIsMenuOpen(false)} scrolled={true}>{t.nav.staf}</NavLink>
              <NavLink href="#jadwal" onClick={() => setIsMenuOpen(false)} scrolled={true}>{t.nav.jadwal}</NavLink>
              <NavLink href="#galeri" onClick={() => setIsMenuOpen(false)} scrolled={true}>{t.nav.galeri}</NavLink>
              <NavLink href="#kontak" onClick={() => setIsMenuOpen(false)} scrolled={true}>{t.nav.contact}</NavLink>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main>
        {/* Hero Section */}
        <section id="beranda" className="relative h-[105vh] flex items-center overflow-hidden pt-12 pb-40">
          <div className="absolute inset-0 z-0">
            <img 
              src={profile.heroImage} 
              className="w-full h-full object-cover brightness-[0.4]"
              alt="SDN 1 Gapuk"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-950/80 to-transparent" />
          </div>

          <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10 w-full mt-20">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-2xl text-white pt-14"
            >
              <span className="inline-block bg-blue-600/30 backdrop-blur-md border border-blue-400/30 px-4 py-1.5 rounded-full text-sm font-semibold mb-6 tracking-wide uppercase">
                {t.hero.welcome}
              </span>
              <h2 className="text-5xl md:text-7xl font-bold leading-[1.1] mb-6">
                {t.hero.futureTitle} <br /> <span className="text-blue-400">{t.hero.futureSub}</span>
              </h2>
              <p className="text-lg text-slate-200 mb-10 leading-relaxed max-w-lg">
                {t.hero.description}
              </p>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => setIsRegistrationOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-bold flex items-center gap-2 transition-all shadow-xl hover:shadow-blue-500/20 active:scale-95 group"
                >
                  {t.hero.registerNow} <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <a href="#visi-misi" className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border border-white/30 px-8 py-4 rounded-full font-bold transition-all active:scale-95">
                  {t.hero.knowUs}
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="relative z-20 md:-mt-16 mt-10 max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t.stats.activeStudents, value: stats.studentCount, icon: Users },
              { label: t.stats.teachers, value: stats.teacherCount, icon: BookOpen },
              { label: t.stats.accreditation, value: stats.accreditation, icon: Trophy },
              { label: t.stats.foundationYear, value: stats.foundationYear, icon: Clock },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center text-center border border-slate-100"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-4">
                  <stat.icon size={24} />
                </div>
                <h3 className="text-2xl font-bold text-blue-900 mb-1">{stat.value}</h3>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Vision & Mission */}
        <section id="visi-misi" className="py-24 max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-blue-950 mb-4">{t.profile.visionMissionTitle}</h2>
            <div className="w-20 h-1.5 bg-blue-600 mx-auto rounded-full" />
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl"
            >
              <img 
                src={profile.profileImage} 
                className="w-full h-full object-cover" 
                alt="Vision"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100">
                <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    <Trophy size={18} />
                  </div>
                  {t.profile.visionTitle}
                </h3>
                <p className="text-slate-600 leading-relaxed italic">
                  "{profile.vision}"
                </p>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100">
                <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    <BookOpen size={18} />
                  </div>
                  {t.profile.missionTitle}
                </h3>
                <ul className="space-y-3 text-slate-600">
                  {profile.mission.split('\n').map((point, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Achievements Section */}
        <section id="prestasi" className="py-24 bg-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
              <div className="max-w-xl">
                <span className="text-blue-600 font-black uppercase tracking-[0.2em] text-xs mb-4 block">Prestasi Terkini</span>
                <h2 className="text-4xl md:text-5xl font-bold text-blue-950 leading-tight">
                  Kebanggaan <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Terbaik Kami</span>
                </h2>
                <div className="w-24 h-1.5 bg-blue-600 mt-6 rounded-full" />
              </div>
              <p className="text-slate-500 max-w-md text-sm leading-relaxed">
                Apresiasi untuk dedikasi dan kerja keras siswa serta tenaga pendidik SDN 1 Gapuk dalam berbagai ajang kompetisi.
              </p>
            </div>

            {achievementsData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {achievementsData.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="group bg-slate-50 rounded-[2.5rem] p-6 border border-slate-100 hover:border-blue-200 hover:bg-white hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-500"
                  >
                    <div className="relative aspect-video rounded-3xl overflow-hidden mb-6 bg-slate-200">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-blue-200">
                          <Trophy size={60} />
                        </div>
                      )}
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-lg ${
                          item.type === 'Guru' 
                          ? 'bg-purple-600/90 text-white' 
                          : 'bg-orange-600/90 text-white'
                        }`}>
                          {item.type}
                        </span>
                        {item.category && (
                          <span className="bg-white/90 backdrop-blur-md text-slate-800 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg">
                            {item.category}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="px-2">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{item.date}</span>
                      </div>
                      <h3 className="text-xl font-bold text-blue-950 mb-3 group-hover:text-blue-700 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                <Trophy size={60} className="mx-auto text-slate-200 mb-6" />
                <h4 className="text-slate-800 font-bold mb-2">Prestasi Belum Tersedia</h4>
                <p className="text-slate-500 text-sm italic">Belum ada data prestasi yang ditambahkan oleh admin.</p>
              </div>
            )}
          </div>
        </section>

        {/* Staff Section */}
        <section id="staf" className="py-20 max-w-7xl mx-auto px-4 md:px-8 relative">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-blue-950 mb-3">{t.staff.title}</h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-sm">{t.staff.description}</p>
            <div className="w-16 h-1 bg-blue-600 mx-auto rounded-full mt-4" />
          </div>

          <div className="relative group">
            {/* Navigation Arrows */}
            {staffData.length > 0 && (
              <>
                <button 
                  onClick={() => scrollStaff('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-6 z-30 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg border border-slate-100 text-blue-900 hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 hidden md:flex"
                >
                  <ArrowLeft size={20} />
                </button>
                <button 
                  onClick={() => scrollStaff('right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-6 z-30 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg border border-slate-100 text-blue-900 hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 hidden md:flex"
                >
                  <ArrowRight size={20} />
                </button>
              </>
            )}

            <div 
              ref={staffScrollRef}
              className="flex gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory scroll-smooth"
              style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
            >
              {staffData.length > 0 ? staffData.map((person, i) => (
                <motion.div
                  key={person.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="group shrink-0 w-44 md:w-52 snap-center"
                >
                  <div className="relative mb-4">
                    <div className="aspect-[3/4] rounded-[2rem] overflow-hidden shadow-lg border-4 border-white group-hover:border-blue-50 transition-all">
                      <img 
                        src={person.imageUrl || 'https://images.unsplash.com/photo-1544168190-79c17527004f?auto=format&fit=crop&q=80'} 
                        alt={person.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 rounded-xl shadow-md border border-slate-50 whitespace-nowrap">
                      <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">{person.position}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-base text-blue-950 leading-tight">{person.name}</h4>
                    {person.education && <p className="text-[10px] text-slate-400 mt-1">{person.education}</p>}
                  </div>
                </motion.div>
              )) : (
                <div className="w-full py-16 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                  <Users size={40} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-slate-400 text-sm italic">{t.staff.empty}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* News Section */}
        <section id="berita" className="py-24 bg-slate-100/50">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-3xl font-bold text-blue-950 mb-4">{t.news.title}</h2>
                <div className="w-16 h-1 bg-blue-600 rounded-full" />
              </div>
              <button 
                onClick={() => setIsAllNewsOpen(true)}
                className="text-blue-700 font-bold flex items-center gap-2 hover:gap-3 transition-all"
              >
                {t.news.viewAll} <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {newsData.length > 0 ? newsData.map((news, i) => (
                <motion.button 
                  key={news.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -5 }}
                  onClick={() => setSelectedNews(news)}
                  className="bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all group cursor-pointer text-left w-full"
                >
                  <div className="h-52 overflow-hidden">
                    <img 
                      src={news.imageUrl} 
                      alt={news.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                        {news.category}
                      </span>
                      <span className="text-slate-400 text-xs flex items-center gap-1">
                        <Calendar size={12} /> {news.date}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg mb-3 text-blue-950 group-hover:text-blue-700 transition-colors line-clamp-2">
                      {news.title}
                    </h3>
                    <p className="text-slate-600 text-sm mb-4 line-clamp-3">
                      {news.excerpt}
                    </p>
                    <div className="pt-4 border-t border-slate-100 flex items-center text-blue-600 font-bold text-sm">
                      {t.news.readMore} <ChevronRight size={16} />
                    </div>
                  </div>
                </motion.button>
              )) : (
                <div className="col-span-3 text-center py-10 text-slate-400 font-medium">{t.news.empty}</div>
              )}
            </div>
          </div>
        </section>

        {/* Schedule & Extra Section */}
        <section id="jadwal" className="py-24 max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-2 gap-20">
            {/* Class Schedule */}
            <div>
              <div className="mb-10">
                <h2 className="text-3xl font-bold text-blue-950 mb-4">{t.schedule.title}</h2>
                <div className="flex flex-wrap gap-2 mb-6">
                  {Array.from(new Set(scheduleData.map(s => s.grade))).sort().map(grade => (
                    <button
                      key={grade}
                      onClick={() => setSelectedGrade(grade)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        selectedGrade === grade 
                        ? 'bg-blue-900 shadow-md text-white' 
                        : 'bg-white text-slate-400 hover:bg-slate-100 border border-slate-100'
                      }`}
                    >
                      {grade}
                    </button>
                  ))}
                  {scheduleData.length === 0 && (
                    <p className="text-slate-400 text-xs italic">{t.news.empty}</p>
                  )}
                </div>
                <p className="text-slate-500 text-sm">{t.schedule.description}</p>
              </div>
              
              <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
                {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day) => (
                  <button
                    key={day}
                    onClick={() => setActiveTab(day)}
                    className={`px-6 py-2.5 rounded-full font-bold transition-all text-sm shrink-0 ${
                      activeTab === day 
                      ? 'bg-blue-700 text-white shadow-lg' 
                      : 'bg-white text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {lang === 'id' ? day : {
                      'Senin': 'Monday',
                      'Selasa': 'Tuesday',
                      'Rabu': 'Wednesday',
                      'Kamis': 'Thursday',
                      'Jumat': 'Friday',
                      'Sabtu': 'Saturday'
                    }[day]}
                  </button>
                ))}
              </div>
              
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden min-h-[300px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${selectedGrade}-${activeTab}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4"
                  >
                    {scheduleData.find(s => s.day === activeTab && s.grade === selectedGrade)?.subjects.map((sub, i) => (
                      <div 
                        key={i} 
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 ${i !== 0 ? 'border-t border-slate-50' : ''}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex-shrink-0 flex items-center justify-center text-blue-700">
                            <Clock size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 break-words">{sub.name}</h4>
                            <p className="text-xs text-slate-400 font-medium">{t.schedule.hour}</p>
                          </div>
                        </div>
                        <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-lg self-start sm:self-center shrink-0">
                          {sub.time}
                        </span>
                      </div>
                    )) || (
                      <div className="py-20 text-center text-slate-400 italic font-medium">
                        {t.schedule.empty.replace('{grade}', selectedGrade).replace('{day}', lang === 'id' ? activeTab : {
                          'Senin': 'Monday',
                          'Selasa': 'Tuesday',
                          'Rabu': 'Wednesday',
                          'Kamis': 'Thursday',
                          'Jumat': 'Friday',
                          'Sabtu': 'Saturday'
                        }[activeTab] || activeTab)}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Extracurricular */}
            <div>
              <div className="mb-10">
                <h2 className="text-3xl font-bold text-blue-950 mb-4">{t.extra.title}</h2>
                <p className="text-slate-500">{t.extra.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {extraData.length > 0 ? extraData.map((extra, i) => (
                  <motion.div
                    key={extra.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => setSelectedExtra(extra)}
                    className="bg-white p-6 rounded-3xl shadow-lg border border-slate-50 hover:bg-blue-700 hover:text-white transition-all group cursor-pointer w-full box-border"
                  >
                    <div className="w-12 h-12 bg-blue-50 group-hover:bg-blue-600 rounded-2xl flex items-center justify-center text-blue-700 group-hover:text-white mb-4 transition-colors">
                      {extra.icon === 'Tent' && <Tent size={24} />}
                      {extra.icon === 'Music' && <Music size={24} />}
                      {extra.icon === 'Cpu' && <Cpu size={24} />}
                      {extra.icon === 'Trophy' && <Trophy size={24} />}
                      {extra.icon === 'Palette' && <Palette size={24} />}
                      {extra.icon === 'Target' && <Target size={24} />}
                      {extra.icon === 'BookOpen' && <BookOpen size={24} />}
                      {extra.icon === 'Mic2' && <Mic2 size={24} />}
                      {extra.icon === 'Heart' && <Heart size={24} />}
                      {extra.icon === 'Camera' && <Camera size={24} />}
                      {extra.icon === 'Monitor' && <Monitor size={24} />}
                      {extra.icon === 'Users' && <Users size={24} />}
                      {extra.icon === 'Globe' && <Globe size={24} />}
                      {extra.icon === 'Star' && <Star size={24} />}
                      {!extra.icon && <Star size={24} />}
                    </div>
                    <h3 className="font-bold mb-2">{extra.name}</h3>
                    <p className="text-slate-500 group-hover:text-blue-100 text-sm leading-relaxed">
                      {extra.description}
                    </p>
                  </motion.div>
                )) : (
                  <p className="col-span-2 text-center text-slate-400 py-6 italic">{t.extra.empty}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Gallery Section */}
        <section id="galeri" className="py-24 bg-blue-950 text-white">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 italic serif">{t.gallery.title}</h2>
              <p className="text-blue-200">{t.gallery.description}</p>
              <div className="w-20 h-1.5 bg-blue-500 mx-auto rounded-full mt-6" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[200px]">
              {(showAllGallery ? galleryData : galleryData.slice(0, 5)).map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedGalleryImage(item)}
                  className={`relative group overflow-hidden rounded-2xl cursor-pointer ${
                    i === 0 ? 'md:col-span-2 md:row-span-2' : ''
                  }`}
                >
                  <img 
                    src={item.imageUrl} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                    <p className="font-bold text-sm tracking-wide uppercase">{item.title}</p>
                  </div>
                </motion.div>
              ))}
              {galleryData.length === 0 && (
                <div className="col-span-4 text-center py-10 text-blue-300 italic">{t.gallery.empty}</div>
              )}
            </div>

            {galleryData.length > 5 && (
              <div className="text-center mt-12">
                <button 
                  onClick={() => setShowAllGallery(!showAllGallery)}
                  className="bg-blue-600/20 hover:bg-blue-600 border border-blue-500/50 text-white px-10 py-3.5 rounded-full font-bold transition-all shadow-lg active:scale-95"
                >
                  {showAllGallery ? t.gallery.showLess : t.gallery.showMore}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Registration Banner */}
        <section id="pendaftaran" className="py-20 max-w-7xl mx-auto px-4 md:px-8">
          <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-[3rem] p-8 md:p-16 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl -ml-32 -mb-32" />
            
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">{t.cta.title}</h2>
              <p className="text-blue-100 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
                {t.cta.description}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <button 
                  onClick={() => setIsRegistrationOpen(true)}
                  className="bg-white text-blue-800 hover:bg-slate-100 px-10 py-5 rounded-full font-bold text-lg shadow-xl active:scale-95 transition-all w-full sm:w-auto"
                >
                  {t.cta.registerOnline}
                </button>
                <a 
                  href="https://wa.me/6285939324177" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 group cursor-pointer"
                >
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <Phone size={24} />
                  </div>
                  <div className="text-left">
                    <p className="text-blue-200 text-xs font-bold uppercase tracking-widest">{t.cta.contactUs}</p>
                    <p className="text-xl font-bold">085939324177</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="kontak" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 md:px-8 grid lg:grid-cols-2 gap-20">
            <div>
              <h2 className="text-3xl font-bold text-blue-950 mb-6">{t.contact.title}</h2>
              <p className="text-slate-500 mb-10 leading-relaxed">
                {t.contact.description}
              </p>
              
              <div className="space-y-8">
                <a 
                  href="https://maps.app.goo.gl/T9xSZRxH5SJvfjeJ9" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-start gap-6 group cursor-pointer"
                >
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-700 shrink-0 group-hover:bg-blue-100 transition-colors">
                    <MapPin size={28} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg mb-1 group-hover:text-blue-700 transition-colors">{t.contact.address}</h4>
                    <p className="text-slate-500">{t.contact.addressVal}</p>
                  </div>
                </a>

                <a 
                  href="https://wa.me/6285939324177" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-start gap-6 group cursor-pointer"
                >
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-700 shrink-0 group-hover:bg-blue-100 transition-colors">
                    <Phone size={28} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg mb-1 group-hover:text-blue-700 transition-colors">{t.contact.phone}</h4>
                    <p className="text-slate-500">085939324177</p>
                  </div>
                </a>

                <a 
                  href="mailto:sdn01gapuk@gmail.com" 
                  className="flex items-start gap-6 group cursor-pointer"
                >
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-700 shrink-0 group-hover:bg-blue-100 transition-colors">
                    <Mail size={28} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg mb-1 group-hover:text-blue-700 transition-colors">{t.contact.email}</h4>
                    <p className="text-slate-500">sdn01gapuk@gmail.com</p>
                  </div>
                </a>
              </div>

              <div className="mt-12 flex gap-4">
                {[Instagram, Facebook, Twitter].map((Icon, i) => (
                  <a key={i} href="#" className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-blue-700 hover:text-white transition-all">
                    <Icon size={20} />
                  </a>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-8 rounded-[3rem] shadow-inner border border-slate-200">
              <h3 className="text-2xl font-bold text-blue-950 mb-8">{t.contact.sendMessage}</h3>
              <form 
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsSubmitting(true);
                  
                  const mailtoLink = `mailto:sdn01gapuk@gmail.com?subject=${encodeURIComponent(formData.subject || 'Pesan dari Website SDN 1 Gapuk')}&body=${encodeURIComponent(`Nama: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`)}`;
                  
                  window.location.href = mailtoLink;
                  
                  setTimeout(() => {
                    alert(t.contact.success);
                    setFormData({ name: '', email: '', subject: '', message: '' });
                    setIsSubmitting(false);
                  }, 500);
                }}
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <input 
                    required
                    type="text" 
                    placeholder={t.contact.formName} 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="bg-white border-none rounded-2xl py-4 px-6 shadow-sm focus:ring-2 focus:ring-blue-500 w-full outline-none" 
                  />
                  <input 
                    required
                    type="email" 
                    placeholder={t.contact.formEmail} 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="bg-white border-none rounded-2xl py-4 px-6 shadow-sm focus:ring-2 focus:ring-blue-500 w-full outline-none" 
                  />
                </div>
                <input 
                  required
                  type="text" 
                  placeholder={t.contact.formSubject} 
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="bg-white border-none rounded-2xl py-4 px-6 shadow-sm focus:ring-2 focus:ring-blue-500 w-full outline-none" 
                />
                <textarea 
                  required
                  rows={4} 
                  placeholder={t.contact.formMessage} 
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="bg-white border-none rounded-2xl py-4 px-6 shadow-sm focus:ring-2 focus:ring-blue-500 w-full outline-none resize-none"
                ></textarea>
                <button 
                  disabled={isSubmitting}
                  className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white w-full py-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95"
                >
                  {isSubmitting ? t.contact.sending : t.contact.sendButton}
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <div className="flex items-center gap-3 justify-center mb-6">
            <div className="w-12 h-12 flex items-center justify-center">
              <img 
                src="https://lh3.googleusercontent.com/d/1sUaFfYHajE5E__zoW7DGQM9odSDDnwHg" 
                alt="Logo SDN 1 Gapuk" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className="font-bold text-white tracking-tight text-xl">SD NEGERI 1 GAPUK</h1>
          </div>
          <p className="text-slate-500 text-sm mb-8">{t.footer.copyright}</p>
          <div className="flex items-center justify-center gap-8 text-slate-400 text-xs uppercase tracking-widest font-semibold">
            <button onClick={() => setIsPrivacyOpen(true)} className="hover:text-blue-400 transition-colors">Privacy Policy</button>
            <button onClick={() => setIsTermsOpen(true)} className="hover:text-blue-400 transition-colors">Terms of Service</button>
            <a href="https://rumah.pendidikan.go.id/ruang/murid" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">E-Learning</a>
          </div>
          <div className="mt-8">
            <button 
              onClick={() => setIsAdminMode(true)}
              className="inline-flex items-center gap-2 text-[10px] text-slate-700 hover:text-blue-400 transition-colors uppercase font-bold tracking-widest"
            >
              <Settings size={12} /> {t.footer.loginAdmin}
            </button>
          </div>
        </div>
      </footer>

      {/* List Semua Berita Modal */}
      <Modal 
        isOpen={isAllNewsOpen} 
        onClose={() => setIsAllNewsOpen(false)} 
        title="Daftar Berita & Pengumuman"
      >
        <div className="space-y-2">
          {newsData.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {newsData.map((news) => (
                <button 
                  key={news.id}
                  onClick={() => {
                    setSelectedNews(news);
                    setIsAllNewsOpen(false);
                  }}
                  className="w-full py-5 flex gap-5 text-left group hover:bg-slate-50 transition-all rounded-2xl px-2 mb-2"
                >
                  <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden shadow-sm">
                    <img src={news.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">
                        {news.category}
                      </span>
                      <span className="text-slate-400 text-[10px] flex items-center gap-1 font-medium">
                        <Calendar size={10} /> {news.date}
                      </span>
                    </div>
                    <h4 className="font-bold text-blue-950 group-hover:text-blue-700 transition-colors line-clamp-2 text-sm">
                      {news.title}
                    </h4>
                    <p className="text-slate-500 text-[11px] mt-1 line-clamp-2 font-medium">
                      {news.excerpt}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center py-10 text-slate-400 font-medium italic">Belum ada berita yang diterbitkan.</p>
          )}
        </div>
      </Modal>

      {/* Detail Berita Modal */}
      <Modal 
        isOpen={selectedNews !== null} 
        onClose={() => setSelectedNews(null)} 
        title="Detail Berita & Pengumuman"
      >
        {selectedNews && (
          <div className="space-y-6">
            <img 
              src={selectedNews.imageUrl} 
              alt={selectedNews.title} 
              className="w-full h-64 object-cover rounded-3xl shadow-lg"
              referrerPolicy="no-referrer"
            />
            <div className="flex items-center gap-3">
              <span className="bg-blue-50 text-blue-700 text-xs font-bold uppercase px-3 py-1 rounded-full">
                {selectedNews.category}
              </span>
              <span className="text-slate-400 text-sm flex items-center gap-1">
                <Calendar size={14} /> {selectedNews.date}
              </span>
            </div>
            <h2 className="text-3xl font-bold text-blue-950 leading-tight">
              {selectedNews.title}
            </h2>
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-600 leading-relaxed text-lg whitespace-pre-wrap">
                {selectedNews.content}
              </p>
            </div>
            <div className="pt-6 border-t border-slate-100">
              <button 
                onClick={() => setSelectedNews(null)}
                className="bg-blue-700 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-800 transition-colors"
              >
                Tutup Review
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Detail Ekstrakurikuler Modal */}
      <Modal 
        isOpen={selectedExtra !== null} 
        onClose={() => setSelectedExtra(null)} 
        title="Detail Ekstrakurikuler"
      >
        {selectedExtra && (
          <div className="space-y-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center text-blue-700">
                {selectedExtra.icon === 'Tent' && <Tent size={40} />}
                {selectedExtra.icon === 'Music' && <Music size={40} />}
                {selectedExtra.icon === 'Cpu' && <Cpu size={40} />}
                {selectedExtra.icon === 'Trophy' && <Trophy size={40} />}
              </div>
              <div>
                <h2 className="text-3xl font-bold text-blue-950">{selectedExtra.name}</h2>
                <p className="text-blue-600 font-semibold">{selectedExtra.coach}</p>
              </div>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-6 rounded-3xl">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Clock size={14} /> Jadwal Latihan
                </h4>
                <p className="font-bold text-slate-800">{selectedExtra.schedule}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Users size={14} /> Status
                </h4>
                <p className="font-bold text-slate-800 text-green-600">Terbuka untuk Anggota Baru</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-blue-950">Tentang Kegiatan</h3>
              <p className="text-slate-600 leading-relaxed text-lg">
                {selectedExtra.longDescription}
              </p>
            </div>

            <button 
              onClick={() => setSelectedExtra(null)}
              className="w-full bg-blue-700 text-white py-4 rounded-3xl font-bold hover:bg-blue-800 transition-colors"
            >
              Kembali ke Menu
            </button>
          </div>
        )}
      </Modal>

      {/* Registration Form Modal */}
      <Modal 
        isOpen={isRegistrationOpen} 
        onClose={() => setIsRegistrationOpen(false)} 
        title={t.registration.title}
      >
        <div className="space-y-8">
          <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex gap-4 items-center">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shrink-0">
              <Users size={24} />
            </div>
            <div>
              <p className="text-blue-900 font-bold">Pendaftaran TA 2026/2027</p>
              <p className="text-blue-700 text-sm italic">{lang === 'id' ? 'Mohon isi data dengan lengkap dan teliti.' : 'Please fill in the data completely and carefully.'}</p>
            </div>
          </div>

          <form 
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              const message = `${t.registration.waMessage}\n\n📝 *${t.registration.waStudentTitle}*\n- Nama: ${regForm.studentName}\n- Tempat Lahir: ${regForm.birthPlace}\n- Tgl Lahir: ${regForm.birthDate}\n\n👤 *${t.registration.waParentTitle}*\n- Nama: ${regForm.parentName}\n- WhatsApp: ${regForm.whatsapp}\n- Alamat: ${regForm.address}\n\n${t.registration.waClosing}`;

              const whatsappUrl = `https://wa.me/6285939324177?text=${encodeURIComponent(message)}`;
              window.open(whatsappUrl, '_blank');
              
              alert(t.registration.alertSuccess);
              setIsRegistrationOpen(false);
            }}
          >
            <div className="space-y-4">
              <h4 className="font-bold text-slate-400 text-xs uppercase tracking-widest mb-4">{t.registration.studentInfo}</h4>
              <input 
                required 
                type="text" 
                placeholder={t.registration.studentName}
                className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-blue-500 outline-none" 
                value={regForm.studentName}
                onChange={e => setRegForm({...regForm, studentName: e.target.value})}
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <input 
                  required 
                  type="text" 
                  placeholder={t.registration.birthPlace}
                  className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={regForm.birthPlace}
                  onChange={e => setRegForm({...regForm, birthPlace: e.target.value})}
                />
                <input 
                  required 
                  type="date" 
                  className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-blue-500 outline-none text-slate-500" 
                  value={regForm.birthDate}
                  onChange={e => setRegForm({...regForm, birthDate: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-slate-400 text-xs uppercase tracking-widest mb-4">{t.registration.parentInfo}</h4>
              <input 
                required 
                type="text" 
                placeholder={t.registration.parentName}
                className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-blue-500 outline-none" 
                value={regForm.parentName}
                onChange={e => setRegForm({...regForm, parentName: e.target.value})}
              />
              <input 
                required 
                type="tel" 
                placeholder={t.registration.whatsapp}
                className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-blue-500 outline-none" 
                value={regForm.whatsapp}
                onChange={e => setRegForm({...regForm, whatsapp: e.target.value})}
              />
              <textarea 
                required 
                rows={3} 
                placeholder={t.registration.address}
                className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                value={regForm.address}
                onChange={e => setRegForm({...regForm, address: e.target.value})}
              ></textarea>
            </div>

            <button type="submit" className="w-full bg-blue-700 text-white py-5 rounded-3xl font-bold text-lg hover:bg-blue-800 transition-all shadow-xl active:scale-95">
              {t.registration.submitButton}
            </button>
          </form>
        </div>
      </Modal>

      {/* Gallery Image Modal */}
      <Modal 
        isOpen={selectedGalleryImage !== null} 
        onClose={() => setSelectedGalleryImage(null)} 
        title={selectedGalleryImage?.title || 'Galeri Foto'}
      >
        {selectedGalleryImage && (
          <div className="space-y-4">
            <img 
              src={selectedGalleryImage.imageUrl} 
              alt={selectedGalleryImage.title} 
              className="w-full h-auto max-h-[60vh] object-contain rounded-2xl shadow-lg"
              referrerPolicy="no-referrer"
            />
            <p className="text-slate-500 text-center text-sm font-medium">
              {selectedGalleryImage.title}
            </p>
          </div>
        )}
      </Modal>
      {/* Privacy Policy Modal */}
      <Modal 
        isOpen={isPrivacyOpen} 
        onClose={() => setIsPrivacyOpen(false)} 
        title="Kebijakan Privasi SD Negeri 1 Gapuk"
      >
        <div className="max-w-none text-slate-600 text-sm leading-relaxed space-y-6">
          <p>Selamat datang di situs resmi SD Negeri 1 Gapuk. Kami berkomitmen untuk melindungi privasi dan keamanan data pribadi seluruh warga sekolah, terutama siswa, orang tua, dan tenaga pendidik. Kebijakan ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi Anda.</p>
          
          <section>
            <h4 className="text-blue-900 font-bold mb-2">1. Informasi yang Kami Kumpulkan</h4>
            <p>Kami mengumpulkan informasi terbatas yang bertujuan untuk mendukung kegiatan administrasi dan komunikasi pendidikan, yaitu:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Identitas Pribadi: Nama lengkap siswa dan orang tua/wali.</li>
              <li>Kontak: Alamat email, nomor telepon/WhatsApp, dan alamat rumah.</li>
              <li>Data Akademik: Nomor Induk Siswa Nasional (NISN) dan data kelas (digunakan pada formulir tertentu).</li>
              <li>Data Teknis: Alamat IP dan jenis perangkat yang digunakan untuk mengakses situs guna optimalisasi tampilan web.</li>
            </ul>
          </section>

          <section>
            <h4 className="text-blue-900 font-bold mb-2">2. Penggunaan Informasi</h4>
            <p>Informasi yang Anda berikan kepada SD Negeri 1 Gapuk akan digunakan untuk:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Mempermudah proses administrasi dan pendaftaran siswa baru secara daring.</li>
              <li>Mengirimkan informasi penting terkait kalender akademik dan kegiatan sekolah.</li>
              <li>Menampilkan dokumentasi kegiatan siswa dan prestasi sekolah (dengan tetap menjaga etika dan privasi anak).</li>
              <li>Meningkatkan layanan keamanan dan kenyamanan navigasi pada situs web kami.</li>
            </ul>
          </section>

          <section>
            <h4 className="text-blue-900 font-bold mb-2">3. Perlindungan Data Anak</h4>
            <p>Sebagai institusi pendidikan dasar, kami sangat berhati-hati terhadap data anak di bawah umur:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Kami tidak akan pernah menjual atau memberikan data pribadi siswa kepada pihak ketiga untuk kepentingan iklan atau komersial.</li>
              <li>Pengunggahan foto atau identitas siswa di situs web dilakukan dengan prinsip edukatif dan perlindungan anak.</li>
              <li>Kami menyarankan orang tua untuk tetap memantau aktivitas daring putra-putrinya.</li>
            </ul>
          </section>

          <section>
            <h4 className="text-blue-900 font-bold mb-2">4. Keamanan Informasi</h4>
            <p>Kami menggunakan prosedur pengamanan fisik dan elektronik untuk melindungi data Anda dari akses yang tidak sah. Akses terhadap database informasi pribadi hanya diberikan kepada staf sekolah yang berkepentingan langsung dengan tugas administratif.</p>
          </section>

          <section>
            <h4 className="text-blue-900 font-bold mb-2">5. Hak Orang Tua dan Wali Murid</h4>
            <p>Anda memiliki hak penuh untuk:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Menanyakan data apa saja yang kami simpan mengenai putra-putri Anda.</li>
              <li>Meminta perbaikan jika terdapat kesalahan data identitas.</li>
              <li>Meminta penghapusan data kontak jika sudah tidak lagi menjadi bagian dari komunitas sekolah.</li>
            </ul>
          </section>

          <section>
            <h4 className="text-blue-900 font-bold mb-2">6. Perubahan Kebijakan</h4>
            <p>SD Negeri 1 Gapuk berhak memperbarui kebijakan ini sewaktu-waktu guna mengikuti perkembangan regulasi perlindungan data di Indonesia. Setiap perubahan akan diumumkan secara transparan melalui halaman ini.</p>
          </section>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <h4 className="text-blue-900 font-bold mb-3 font-sans">Kontak Informasi</h4>
            <div className="space-y-1 text-xs">
              <p><span className="font-bold">Nama Sekolah:</span> SD Negeri 1 Gapuk</p>
              <p><span className="font-bold">Alamat:</span> Dusun Gapuk Baru, Desa Gapuk, Kecamatan Suralaga, Kab. Lombok Timur</p>
              <p><span className="font-bold">Email:</span> wathan045@gmail.com</p>
              <p><span className="font-bold">Telepon/WA:</span> 085939324177</p>
              <p className="mt-4 text-slate-400 italic">Terakhir diperbarui: 11 Mei 2026</p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Terms of Service Modal */}
      <Modal 
        isOpen={isTermsOpen} 
        onClose={() => setIsTermsOpen(false)} 
        title="Ketentuan Layanan SD Negeri 1 Gapuk"
      >
        <div className="max-w-none text-slate-600 text-sm leading-relaxed space-y-6">
          <p>Selamat datang di situs web resmi SD Negeri 1 Gapuk. Dengan mengakses atau menggunakan situs ini, Anda dianggap telah membaca, memahami, dan menyetujui untuk terikat oleh ketentuan-ketentuan berikut.</p>

          <section>
            <h4 className="text-blue-900 font-bold mb-2">1. Penerimaan Ketentuan</h4>
            <p>Situs ini disediakan untuk tujuan informasi pendidikan, komunikasi sekolah, dan layanan administrasi bagi siswa serta orang tua. Jika Anda tidak menyetujui salah satu bagian dari ketentuan ini, kami sarankan untuk tidak melanjutkan penggunaan situs ini.</p>
          </section>

          <section>
            <h4 className="text-blue-900 font-bold mb-2">2. Hak Kekayaan Intelektual</h4>
            <p>Seluruh konten yang ada di situs ini, termasuk namun tidak terbatas pada teks, logo, foto kegiatan, video, dan desain grafis, adalah milik SD Negeri 1 Gapuk kecuali disebutkan lain. Pengunjung dilarang menyalin, mendistribusikan, atau menggunakan konten situs untuk kepentingan komersial tanpa izin tertulis dari pihak sekolah.</p>
          </section>

          <section>
            <h4 className="text-blue-900 font-bold mb-2">3. Penggunaan yang Diizinkan</h4>
            <p>Anda setuju untuk menggunakan situs ini hanya untuk tujuan yang sah. Anda dilarang untuk:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Menggunakan situs dengan cara yang dapat merusak, melumpuhkan, atau membebani server sekolah.</li>
              <li>Melakukan tindakan "spamming" pada formulir kontak atau komentar.</li>
              <li>Mengambil atau menyebarluaskan foto siswa yang ada di website ini untuk tujuan yang melanggar hukum atau asusila.</li>
            </ul>
          </section>

          <section>
            <h4 className="text-blue-900 font-bold mb-2">4. Akurasi Informasi</h4>
            <p>Kami berupaya sebaik mungkin untuk menyediakan informasi yang akurat (seperti jadwal ujian, pengumuman libur, dll). Namun, SD Negeri 1 Gapuk tidak bertanggung jawab atas kerugian yang timbul jika terjadi kesalahan teknis atau keterlambatan pembaruan informasi. Kami menyarankan untuk tetap melakukan konfirmasi langsung ke sekolah untuk hal-hal yang bersifat krusial.</p>
          </section>

          <section>
            <h4 className="text-blue-900 font-bold mb-2">5. Link Pihak Ketiga</h4>
            <p>Situs kami mungkin berisi tautan ke situs web lain (seperti Dapodik, portal Kemendikbud, atau aplikasi belajar). Kami tidak bertanggung jawab atas isi atau kebijakan privasi pada situs-situs luar tersebut.</p>
          </section>

          <section>
            <h4 className="text-blue-900 font-bold mb-2">6. Pembatasan Tanggung Jawab</h4>
            <p>Sekolah tidak bertanggung jawab atas segala bentuk kerusakan atau virus yang mungkin menginfeksi perangkat komputer Anda saat mengakses situs ini atau mengunduh materi dari situs ini.</p>
          </section>

          <section>
            <h4 className="text-blue-900 font-bold mb-2">7. Perubahan Ketentuan</h4>
            <p>Pihak sekolah berhak untuk mengubah atau memperbarui Ketentuan Layanan ini kapan saja tanpa pemberitahuan terlebih dahulu. Perubahan akan berlaku segera setelah dipublikasikan di halaman ini.</p>
          </section>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <h4 className="text-blue-900 font-bold mb-3 font-sans">Informasi Kontak</h4>
            <div className="space-y-1 text-xs">
              <p><span className="font-bold">Nama Sekolah:</span> SD Negeri 1 Gapuk</p>
              <p><span className="font-bold">Alamat:</span> Dusun Gapuk Baru, Desa Gapuk, Kec. Suralaga, Kab. Lombok Timur</p>
              <p><span className="font-bold">Email:</span> wathan045@gmail.com</p>
              <p><span className="font-bold">Telepon:</span> 085939324177</p>
              <p className="mt-4 text-slate-400 italic">Terakhir diperbarui: 11 Mei 2026</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
