import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  onSnapshot 
} from 'firebase/firestore';
import { db } from './firebase';
import { NewsItem, GalleryItem, ScheduleItem, ExtraItem, StaffItem, AchievementItem } from '../types';

export const collections = {
  news: 'news',
  gallery: 'gallery',
  schedules: 'schedules',
  extra: 'extracurriculars',
  staff: 'staff',
  achievements: 'achievements',
  stats: 'settings/stats',
  profile: 'settings/profile',
  students: 'students',
  grades: 'grades',
  admins: 'admins',
  config: 'settings/config'
};

// Generic error handler as per integration guidelines
const handleFirestoreError = (error: unknown, operation: string, path: string | null) => {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType: operation,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

// Helper to convert Google Drive share links to direct display links
const formatGoogleDriveUrl = (url: string) => {
  if (!url) return url;
  // If it's already a direct lh3 link, return as is
  if (url.includes('lh3.googleusercontent.com/d/')) return url;
  
  // Google Drive Share Link matches: /file/d/[ID]/view or ?id=[ID]
  const driveIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveIdMatch && driveIdMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveIdMatch[1]}`;
  }
  return url;
};

export const syncData = {
  subscribeNews: (callback: (data: NewsItem[]) => void) => {
    return onSnapshot(query(collection(db, collections.news), orderBy('date', 'desc')), 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewsItem));
        callback(items);
      },
      (error) => handleFirestoreError(error, 'list', collections.news)
    );
  },
  
  subscribeGallery: (callback: (data: GalleryItem[]) => void) => {
    return onSnapshot(collection(db, collections.gallery), 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryItem));
        callback(items);
      },
      (error) => handleFirestoreError(error, 'list', collections.gallery)
    );
  },

  subscribeSchedules: (callback: (data: ScheduleItem[]) => void) => {
    return onSnapshot(collection(db, collections.schedules), 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleItem));
        callback(items);
      },
      (error) => handleFirestoreError(error, 'list', collections.schedules)
    );
  },

  subscribeExtra: (callback: (data: ExtraItem[]) => void) => {
    return onSnapshot(collection(db, collections.extra), 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExtraItem));
        callback(items);
      },
      (error) => handleFirestoreError(error, 'list', collections.extra)
    );
  },

  subscribeStaff: (callback: (data: StaffItem[]) => void) => {
    return onSnapshot(collection(db, collections.staff), 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffItem));
        callback(items);
      },
      (error) => handleFirestoreError(error, 'list', collections.staff)
    );
  },

  subscribeAchievements: (callback: (data: AchievementItem[]) => void) => {
    return onSnapshot(query(collection(db, collections.achievements), orderBy('updatedAt', 'desc')), 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AchievementItem));
        callback(items);
      },
      (error) => handleFirestoreError(error, 'list', collections.achievements)
    );
  },

  subscribeStats: (callback: (data: any) => void) => {
    return onSnapshot(doc(db, collections.stats), 
      (snapshot) => {
        callback(snapshot.exists() ? snapshot.data() : null);
      },
      (error) => handleFirestoreError(error, 'get', collections.stats)
    );
  },

  subscribeProfile: (callback: (data: any) => void) => {
    return onSnapshot(doc(db, collections.profile), 
      (snapshot) => {
        callback(snapshot.exists() ? snapshot.data() : null);
      },
      (error) => handleFirestoreError(error, 'get', collections.profile)
    );
  },

  subscribeStudents: (callback: (data: any[]) => void) => {
    return onSnapshot(collection(db, collections.students), 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(items);
      },
      (error) => handleFirestoreError(error, 'list', collections.students)
    );
  },

  subscribeGrades: (callback: (data: any[]) => void) => {
    return onSnapshot(collection(db, collections.grades), 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(items);
      },
      (error) => handleFirestoreError(error, 'list', collections.grades)
    );
  },

  subscribeAdmins: (callback: (data: any[]) => void) => {
    return onSnapshot(collection(db, collections.admins), 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(items);
      },
      (error) => handleFirestoreError(error, 'list', collections.admins)
    );
  },

  subscribeAppConfig: (callback: (data: any) => void) => {
    return onSnapshot(doc(db, collections.config), 
      (snapshot) => {
        callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
      },
      (error) => handleFirestoreError(error, 'get', collections.config)
    );
  },

  // Save/Update functions
  saveItem: async (col: string, item: any) => {
    try {
      const { id, ...data } = item;
      // Auto-format image URLs if present
      if (data.imageUrl) {
        data.imageUrl = formatGoogleDriveUrl(data.imageUrl);
      }
      const docRef = doc(db, col, id || Date.now().toString());
      await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
    } catch (error) {
      handleFirestoreError(error, 'write', col);
    }
  },

  deleteItem: async (col: string, id: string) => {
    try {
      await deleteDoc(doc(db, col, id));
    } catch (error) {
      handleFirestoreError(error, 'delete', `${col}/${id}`);
    }
  },

  saveStats: async (stats: any) => {
    try {
      await setDoc(doc(db, collections.stats), { ...stats, updatedAt: new Date().toISOString() });
    } catch (error) {
      handleFirestoreError(error, 'write', collections.stats);
    }
  },

  saveProfile: async (profile: any) => {
    try {
      await setDoc(doc(db, collections.profile), { ...profile, updatedAt: new Date().toISOString() });
    } catch (error) {
      handleFirestoreError(error, 'write', collections.profile);
    }
  },

  saveAdmin: async (email: string) => {
    try {
      const lowerEmail = email.toLowerCase().trim();
      await setDoc(doc(db, collections.admins, lowerEmail), { 
        email: lowerEmail, 
        updatedAt: new Date().toISOString() 
      });
    } catch (error) {
      handleFirestoreError(error, 'write', `${collections.admins}/${email}`);
    }
  },

  saveAppConfig: async (config: any) => {
    try {
      await setDoc(doc(db, collections.config), { 
        ...config, 
        updatedAt: new Date().toISOString() 
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, 'write', collections.config);
    }
  },

  seedInitialData: async (data: { news: NewsItem[], gallery: GalleryItem[], schedules: ScheduleItem[], extra: ExtraItem[], staff?: StaffItem[] }) => {
    try {
      for (const item of data.news) await setDoc(doc(db, collections.news, item.id), { ...item, updatedAt: new Date().toISOString() });
      for (const item of data.gallery) await setDoc(doc(db, collections.gallery, item.id), { ...item, updatedAt: new Date().toISOString() });
      for (const item of data.schedules) await setDoc(doc(db, collections.schedules, item.id || Date.now().toString()), { ...item, updatedAt: new Date().toISOString() });
      for (const item of data.extra) await setDoc(doc(db, collections.extra, item.id), { ...item, updatedAt: new Date().toISOString() });
      
      const staffToSeed = data.staff || [
        { id: '1', name: 'H. Moh. Nasib, S.Pd.', position: 'Kepala Sekolah', imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80', education: 'S1 PGSD' },
        { id: '2', name: 'Siti Aminah, S.Pd.', position: 'Wali Kelas 1', imageUrl: 'https://images.unsplash.com/photo-1544717297-fa95b3ee51f3?auto=format&fit=crop&q=80', education: 'S1 PGSD' },
        { id: '3', name: 'Ahmad Fauzi, S.Pd.I', position: 'Guru Agama', imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80', education: 'S1 PAI' },
        { id: '4', name: 'Dewi Sartika, S.Pd.', position: 'Guru Olahraga', imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80', education: 'S1 Penjaskes' }
      ];
      for (const item of staffToSeed) await setDoc(doc(db, collections.staff, item.id), { ...item, updatedAt: new Date().toISOString() });

      await setDoc(doc(db, collections.stats), { 
        studentCount: '136', 
        teacherCount: '12', 
        accreditation: 'B', 
        foundationYear: '1987', 
        updatedAt: new Date().toISOString() 
      });
      await setDoc(doc(db, collections.profile), {
        vision: 'Menjadi lembaga pendidikan dasar yang unggul dalam prestasi, berkarakter mulia, dan berwawasan teknologi masa depan berdasarkan iman dan taqwa.',
        mission: 'Menanamkan nilai karakter dan budi pekerti luhur sejak dini.\nMenyelenggarakan pembelajaran kreatif dan inovatif berbasis IT.\nMengembangkan potensi bakat siswa melalui berbagai ekstrakurikuler.',
        heroImage: 'https://images.unsplash.com/photo-1544717297-fa95b3ee51f3?auto=format&fit=crop&q=80',
        profileImage: 'https://images.unsplash.com/photo-1523050335392-93851179ae22?auto=format&fit=crop&q=80',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, 'write', 'multiple');
    }
  }
};
