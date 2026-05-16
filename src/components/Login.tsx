import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, CheckCircle2 } from 'lucide-react';
import { auth, googleProvider, signInWithPopup, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface LoginProps {
  onLogin: (success: boolean) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userEmail = result.user.email?.toLowerCase();
      const isMasterAdmin = userEmail === 'wathan045@gmail.com';
      
      let isAdditionalAdmin = false;
      if (userEmail && !isMasterAdmin) {
        const adminDoc = await getDoc(doc(db, 'admins', userEmail));
        isAdditionalAdmin = adminDoc.exists();
      }

      if (isMasterAdmin || isAdditionalAdmin) {
        onLogin(true);
      } else {
        setError(`Akses Ditolak. Email ${result.user.email} tidak terdaftar sebagai Admin.`);
        await auth.signOut();
      }
    } catch (err: any) {
      console.error(err);
      setError('Gagal masuk: ' + (err.message || 'Error tidak diketahui'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-slate-100"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-6">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-bold text-blue-950">Akses Admin</h2>
          <p className="text-slate-500 mt-2">Gunakan Akun Google untuk otentikasi keamanan database.</p>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-2">
            <div className="flex gap-3 items-center">
              <CheckCircle2 className="text-blue-600 shrink-0" size={18} />
              <p className="text-[10px] text-blue-800 font-medium">
                Sistem otentikasi aman untuk administrator sekolah.
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm font-medium border border-red-100 text-center">
              {error}
            </div>
          )}

          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white border-2 border-slate-100 hover:border-blue-500 text-slate-800 py-4 rounded-2xl font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? 'Menghubungkan...' : 'Masuk dengan Google'}
          </button>
          
          <div className="pt-6 border-t border-slate-50 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono">SDN 1 GAPUK SECURE ADMIN</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
