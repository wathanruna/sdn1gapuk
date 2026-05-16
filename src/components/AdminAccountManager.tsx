import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Plus, Trash2, Mail, UserPlus, CheckCircle2 } from 'lucide-react';
import { syncData, collections } from '../lib/dataService';
import { auth } from '../lib/firebase';

export const AdminAccountManager: React.FC = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const MASTER_ADMIN = "wathan045@gmail.com";
  const currentUserEmail = auth.currentUser?.email?.toLowerCase();

  useEffect(() => {
    const unsub = syncData.subscribeAdmins(setAdmins);
    return () => unsub();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) return;
    
    setIsLoading(true);
    try {
      await syncData.saveAdmin(newEmail);
      setNewEmail('');
      alert('Admin berhasil ditambahkan!');
    } catch (error) {
      console.error(error);
      alert('Gagal menambahkan admin. Pastikan Anda memiliki hak akses.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAdmin = async (email: string) => {
    if (email === MASTER_ADMIN) {
      alert('Master admin tidak dapat dihapus.');
      return;
    }
    
    if (window.confirm(`Hapus hak akses admin untuk ${email}?`)) {
      try {
        await syncData.deleteItem(collections.admins, email);
      } catch (error) {
        console.error(error);
        alert('Gagal menghapus admin.');
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-blue-900 text-white p-8 rounded-[2.5rem] shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
          <Shield size={120} />
        </div>
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-2 flex items-center gap-3">
            <Shield className="text-blue-300" /> Kelola Hak Akses Admin
          </h3>
          <p className="text-blue-100 text-sm max-w-md">
            Tambahkan email guru atau staf lain agar mereka dapat login dan mengelola konten website sekolah ini.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm sticky top-8">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <UserPlus size={18} className="text-blue-600" /> Tambah Admin
            </h4>
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Google</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="email" 
                    placeholder="nama@gmail.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 ring-blue-500/20 transition-all text-sm"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:bg-blue-800 transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading ? 'Memproses...' : <><Plus size={18} /> Beri Akses</>}
              </button>
            </form>
            <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                <strong>PENTING:</strong> Email yang ditambahkan harus berupa email Google aktif karena login menggunakan Google Authentication.
              </p>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <h4 className="font-bold text-slate-800 ml-2">Daftar Administrator Aktif</h4>
          
          <div className="space-y-3">
            {/* Master Admin */}
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                  <Shield size={20} />
                </div>
                <div>
                  <h5 className="font-bold text-blue-900">{MASTER_ADMIN}</h5>
                  <span className="text-[9px] font-black uppercase text-blue-600 bg-white px-2 py-0.5 rounded-full border border-blue-100 italic">
                    👑 Master Admin (System)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-blue-600">
                <CheckCircle2 size={18} />
              </div>
            </div>

            {/* Other Admins */}
            {admins.filter(a => a.id !== MASTER_ADMIN).map((admin) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={admin.id}
                className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-700">{admin.email}</h5>
                    <p className="text-[10px] text-slate-400">Ditambahkan pada {admin.updatedAt ? new Date(admin.updatedAt).toLocaleDateString() : '-'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteAdmin(admin.email)}
                  className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
              </motion.div>
            ))}

            {admins.filter(a => a.id !== MASTER_ADMIN).length === 0 && (
              <div className="py-12 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 italic text-sm">Belum ada admin tambahan.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
