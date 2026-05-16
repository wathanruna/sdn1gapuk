import { NewsItem, GalleryItem, ScheduleItem, ExtraItem } from './types';

export const NEWS_DATA: NewsItem[] = [
  {
    id: '1',
    title: 'Penerimaan Peserta Didik Baru (PPDB) TA 2026/2027 Telah Dibuka',
    date: '10 Mei 2026',
    excerpt: 'Segera daftarkan putra-putri Anda untuk bergabung bersama keluarga besar SD Negeri 1 Gapuk.',
    content: 'Pendaftaran Peserta Didik Baru (PPDB) SD Negeri 1 Gapuk untuk tahun ajaran 2026/2027 resmi dibuka mulai hari ini. Kami mengundang bapak/ibu wali murid untuk mendaftarkan putra-putrinya melalui jalur online atau datang langsung ke ruang panitia PPDB di sekolah. Kuota terbatas hanya untuk 4 kelas paralel dengan kapasitas per kelas 25 siswa.',
    category: 'Pengumuman',
    imageUrl: 'https://picsum.photos/seed/school1/800/600',
  },
  {
    id: '2',
    title: 'Prestasi Gemilang di Olimpiade Matematika Nasional',
    date: '05 Mei 2026',
    excerpt: 'Siswa kami berhasil meraih medali emas dalam ajang bergengsi OMN ke-15 di Jakarta.',
    content: 'Ananda Raka dari kelas 5B berhasil mengharumkan nama sekolah dengan meraih medali emas pada Olimpiade Matematika Nasional ke-15. Kompetisi yang diikuti oleh ribuan peserta dari seluruh Indonesia ini menjadi ajang pembuktian kualitas akademik siswa-siswi SD Negeri 1 Gapuk. Kepala Sekolah mengapresiasi kerja keras Raka dan guru pembimbing.',
    category: 'Prestasi',
    imageUrl: 'https://picsum.photos/seed/award/800/600',
  },
  {
    id: '3',
    title: 'Kegiatan Outbound Tahunan Kelas 5 dan 6',
    date: '28 April 2026',
    excerpt: 'Membangun karakter dan kerjasama tim melalui kegiatan alam bebas yang menyenangkan.',
    content: 'Kegiatan outbound tahunan yang dilaksanakan di kawasan Puncak, Bogor ini bertema "Together to be Better". Selama dua hari, para siswa diajak untuk mengenal alam, melatih kepemimpinan, dan mempererat tali persaudaraan antar teman sejawat melalui berbagai permainan ketangkasan dan edukasi lingkungan.',
    category: 'Kegiatan',
    imageUrl: 'https://picsum.photos/seed/outbound/800/600',
  },
];

export const GALLERY_DATA: GalleryItem[] = [
  { id: '1', title: 'Upacara Bendera', imageUrl: 'https://lh3.googleusercontent.com/d/1Ln70xXegqeVZz_vFCcLQY7D9MlWNYLJP' },
  { id: '2', title: 'Perpustakaan Sekolah', imageUrl: 'https://picsum.photos/seed/library/800/600' },
  { id: '3', title: 'Laboratorium Komputer', imageUrl: 'https://picsum.photos/seed/comp/800/600' },
  { id: '4', title: 'Kegiatan Pramuka', imageUrl: 'https://lh3.googleusercontent.com/d/1PVAU4knGHCqFp_ibYjRScU-02KEI4UYr' },
  { id: '5', title: 'Lomba Olahraga', imageUrl: 'https://picsum.photos/seed/sports/800/600' },
  { id: '6', title: 'Pentas Seni', imageUrl: 'https://picsum.photos/seed/art/800/600' },
];

export const SCHEDULE_DATA: ScheduleItem[] = [
  {
    id: 's1',
    grade: 'Kelas 1',
    day: 'Senin',
    subjects: [
      { time: '07:00 - 08:30', name: 'Upacara Bendera' },
      { time: '08:30 - 10:00', name: 'Bahasa Indonesia' },
      { time: '10:30 - 12:00', name: 'Matematika' },
    ],
  },
  {
    id: 's2',
    grade: 'Kelas 1',
    day: 'Selasa',
    subjects: [
      { time: '07:30 - 09:00', name: 'Pendidikan Agama' },
      { time: '09:00 - 10:00', name: 'IPA' },
      { time: '10:30 - 12:00', name: 'IPS' },
    ],
  },
  {
    id: 's3',
    grade: 'Kelas 1',
    day: 'Rabu',
    subjects: [
      { time: '07:30 - 09:00', name: 'PJOK' },
      { time: '09:00 - 10:00', name: 'Bahasa Inggris' },
      { time: '10:30 - 12:00', name: 'SBdP' },
    ],
  },
];

export const EXTRA_DATA: ExtraItem[] = [
  { 
    id: '1', 
    name: 'Pramuka', 
    description: 'Membangun karakter mandiri dan disiplin.',
    longDescription: 'Kegiatan wajib bagi kelas 3-6 yang fokus pada ketangkasan, kerjasama tim, dan pengabdian masyarakat.',
    schedule: 'Jumat, 15:30 - 17:00',
    coach: 'Kak Ahmad Kurniawan',
    icon: 'Tent' 
  },
  { 
    id: '2', 
    name: 'Tari Tradisional', 
    description: 'Melestarikan budaya melalui gerak seni.',
    longDescription: 'Mempelajari berbagai tarian daerah nusantara untuk pementasan formal dan festival seni.',
    schedule: 'Sabtu, 09:00 - 11:00',
    coach: 'Ibu Ratna Sari',
    icon: 'Music' 
  },
  { 
    id: '3', 
    name: 'Robotik', 
    description: 'Mengasah kreativitas dan logika teknologi.',
    longDescription: 'Fokus pada dasar-dasar pemrograman dan perakitan robot menggunakan kit edukasi modern.',
    schedule: 'Rabu, 14:00 - 16:00',
    coach: 'Bapak Dedi Pratama',
    icon: 'Cpu' 
  },
  { 
    id: '4', 
    name: 'Sepak Bola', 
    description: 'Mengembangkan bakat olahraga dan kerjasama.',
    longDescription: 'Pelatihan teknik dasar bola, strategi tim, dan persiapan kompetisi antar sekolah.',
    schedule: 'Selasa & Kamis, 16:00 - 17:30',
    coach: 'Bapak Coach Yanto',
    icon: 'Trophy' 
  },
];
