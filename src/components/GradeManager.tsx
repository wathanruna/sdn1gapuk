import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Users, Save, FileDown, Plus, 
  Search, Edit3, Trash2, X,
  Calculator, Book, Calendar, UserPlus,
  Trophy, Medal, Award
} from 'lucide-react';
import { syncData, collections } from '../lib/dataService';
import { Student, GradeRecord, SubjectGrades, AppConfig } from '../types';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

// Helper to get image dimensions
const getImageDimensions = (base64: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    if (!base64 || typeof base64 !== 'string') {
      resolve({ width: 0, height: 0 });
      return;
    }
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    img.src = base64;
  });
};

const SEMESTERS = ['7', '8', '9', '10', '11', '12'];

const INITIAL_SUBJECTS: SubjectGrades = {
  pai: 0, pancasila: 0, bIndo: 0, matematika: 0,
  ipas: 0, pjok: 0, seniBdaya: 0, bInggris: 0
};

export const GradeManager: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [activeSemester, setActiveSemester] = useState<string>('7');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetKeyword, setResetKeyword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [editingStudent, setEditingStudent] = useState<Partial<Student>>({ className: '6B' });
  const [activeClass, setActiveClass] = useState<'ALL' | '6A' | '6B'>('ALL');
  
  const [formData, setFormData] = useState<SubjectGrades>(INITIAL_SUBJECTS);

  // Migration effect for existing students
  useEffect(() => {
    const migrateStudents = async () => {
      const studentsToMigrate = students.filter(s => !s.className);
      if (studentsToMigrate.length > 0) {
        console.log('Migrating existing students to Class 6B');
        for (const s of studentsToMigrate) {
          await syncData.saveItem(collections.students, { ...s, className: '6B' });
        }
      }
    };
    migrateStudents();
  }, [students.length]); // Only run when student list length changes to find legacy data

  useEffect(() => {
    const unsubStudents = syncData.subscribeStudents(setStudents);
    const unsubGrades = syncData.subscribeGrades(setGrades);
    const unsubConfig = syncData.subscribeAppConfig(setAppConfig);
    return () => {
      unsubStudents();
      unsubGrades();
      unsubConfig();
    };
  }, []);

  // Update form data when active semester or student changes
  useEffect(() => {
    if (activeStudent) {
      const existingRecord = grades.find(g => g.studentId === activeStudent.id);
      if (existingRecord && existingRecord.semesters?.[activeSemester]) {
        setFormData(existingRecord.semesters[activeSemester]);
      } else {
        setFormData(INITIAL_SUBJECTS);
      }
    }
  }, [activeStudent, activeSemester, grades]);

  const handleEditGrades = (student: Student) => {
    setActiveStudent(student);
    setActiveSemester('7');
    setIsFormOpen(true);
  };

  const saveGrades = async () => {
    if (!activeStudent) return;
    const existingRecord = grades.find(g => g.studentId === activeStudent.id);
    
    const newSemesters = {
      ...(existingRecord?.semesters || {}),
      [activeSemester]: formData
    };

    const gradeData: GradeRecord = {
      id: existingRecord?.id || `${activeStudent.id}_grade`,
      studentId: activeStudent.id,
      semesters: newSemesters,
      updatedAt: new Date().toISOString()
    };

    await syncData.saveItem(collections.grades, gradeData);
    // We don't close the form automatically so they can switch semesters
    alert(`Nilai semester ${activeSemester} untuk ${activeStudent.name} berhasil disimpan!`);
  };

  const deleteStudent = async (student: Student) => {
    if (!student || !student.id) {
      alert('Error: ID Siswa tidak ditemukan');
      return;
    }
    
    try {
      console.log('Memulai penghapusan data untuk:', student.id);
      
      // 1. Cari dan hapus semua record nilai yang memiliki studentId ini
      const studentGrades = grades.filter(g => g.studentId === student.id);
      for (const gRecord of studentGrades) {
        await syncData.deleteItem(collections.grades, gRecord.id);
      }
      
      // 2. Hapus record siswa itu sendiri
      await syncData.deleteItem(collections.students, student.id);
      
      setConfirmingDeleteId(null);
      // alert(`Data siswa "${student.name}" berhasil dihapus.`); // Reduced noise
    } catch (error) {
      console.error('Error saat menghapus siswa:', error);
      alert('Gagal menghapus data.');
    }
  };

  const resetAllData = async () => {
    if (resetKeyword !== 'HAPUS') {
      alert("Kata kunci salah! Ketik 'HAPUS' untuk mengonfirmasi.");
      return;
    }

    try {
      setIsResetting(true);
      
      // Hapus semua grades
      const gradeBatch = [...grades];
      for (const grade of gradeBatch) {
        await syncData.deleteItem(collections.grades, grade.id);
      }
      
      // Hapus semua students
      const studentBatch = [...students];
      for (const student of studentBatch) {
        await syncData.deleteItem(collections.students, student.id);
      }
      
      alert("BERHASIL! Seluruh data siswa dan nilai telah dihapus.");
      setShowResetConfirm(false);
      setResetKeyword('');
    } catch (error) {
      console.error("Error resetting data:", error);
      alert("Terjadi kesalahan saat membersihkan data.");
    } finally {
      setIsResetting(false);
    }
  };

  const archiveStudent = async (student: Student) => {
    if (!student || !student.id) {
      alert('Error: ID Siswa tidak ditemukan');
      return;
    }
    
    const confirmMessage = `Apakah Anda yakin ingin mengarsipkan data siswa "${student.name}"?\n\nSiswa ini tidak akan muncul lagi di daftar input nilai.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        await syncData.saveItem(collections.students, {
          ...student,
          isArchived: true,
          updatedAt: new Date().toISOString()
        });
        alert(`Data siswa "${student.name}" berhasil diarsipkan.`);
      } catch (error) {
        console.error('Error saat mengarsipkan siswa:', error);
        alert('Gagal mengarsipkan data.');
      }
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setIsStudentModalOpen(true);
  };

  const downloadTemplate = () => {
    const data = [
      { 'NAMA LENGKAP': 'Contoh Siswa 1', 'NISN': '12345', 'KELAS': '6A' },
      { 'NAMA LENGKAP': 'Contoh Siswa 2', 'NISN': '67890', 'KELAS': '6B' },
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Siswa');
    XLSX.writeFile(workbook, 'Template_Import_Siswa.xlsx');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (rows.length === 0) {
          alert('File Excel kosong atau tidak terbaca.');
          return;
        }

        let importedCount = 0;
        for (const item of rows) {
          // Normalize keys to find matches regardless of case or spaces
          const normalizedItem: any = {};
          Object.keys(item).forEach(key => {
            normalizedItem[key.trim().toUpperCase()] = item[key];
          });

          const name = normalizedItem['NAMA LENGKAP'] || normalizedItem['NAMA'] || normalizedItem['NAME'];
          const nisn = String(normalizedItem['NISN'] || normalizedItem['NO INDUK'] || normalizedItem['ID'] || '').trim();
          const cls = String(normalizedItem['KELAS'] || normalizedItem['CLASS'] || '6B').trim().toUpperCase();

          if (name && nisn) {
            const studentData: Student = {
              id: nisn,
              name: String(name).trim(),
              nisn: nisn,
              gradeLevel: 'Kelas 6',
              className: cls.includes('6A') ? '6A' : '6B',
              updatedAt: new Date().toISOString()
            };
            await syncData.saveItem(collections.students, studentData);
            importedCount++;
          }
        }
        
        if (importedCount > 0) {
          alert(`Berhasil mengimpor ${importedCount} data siswa.`);
        } else {
          alert('Tidak ada data siswa yang valid ditemukan. Periksa kembali nama kolom (NAMA LENGKAP, NISN, KELAS).');
        }
        e.target.value = '';
      } catch (error) {
        console.error('Import Error:', error);
        alert('Gagal mengimpor file: ' + (error instanceof Error ? error.message : 'Format file tidak didukung'));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const nameInputRef = React.useRef<HTMLInputElement>(null);

  const saveStudent = async (closeAfter = true) => {
    if (!editingStudent.name || !editingStudent.nisn) return;
    const studentData = {
      ...editingStudent,
      id: editingStudent.id || Date.now().toString(),
      gradeLevel: 'Kelas 6',
      className: editingStudent.className || '6B',
      updatedAt: new Date().toISOString()
    } as Student;
    await syncData.saveItem(collections.students, studentData);
    
    // Reset but keep class context if adding more
    const currentClass = editingStudent.className;
    setEditingStudent({ className: currentClass || '6B' });
    
    if (closeAfter) {
      setIsStudentModalOpen(false);
    } else {
      // Focus name input for next student
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sortedStudents = filteredStudents
      .filter(s => s.gradeLevel === 'Kelas 6')
      .sort((a, b) => a.name.localeCompare(b.name));

    const subjectConfig = [
      { key: 'pai', label: 'AGAMA (PAI)' },
      { key: 'pancasila', label: 'PANCASILA' },
      { key: 'bIndo', label: 'B. INDO' },
      { key: 'matematika', label: 'MATEMATIKA' },
      { key: 'ipas', label: 'IPAS' },
      { key: 'pjok', label: 'PJOK' },
      { key: 'seniBdaya', label: 'SENIBDYA' },
      { key: 'bInggris', label: 'B.INGGRIS' },
    ];

    const addKopToSheet = async (worksheet: ExcelJS.Worksheet, title: string, colCount: number, isRekap = false) => {
      // Default height for the image row
      let kopRowHeight = 100;

      // Estimate total pixel width of the table to center the logo
      // Column widths: NAMA=35, others=12 (average)
      // Standard factor for Excel width to pixel is approx 7.5
      let totalTableWidthUnits = 0;
      if (isRekap) {
        // Rekap has NO, KELAS, NO INDUK, NAMA, and subjects
        totalTableWidthUnits = (colCount - 1) * 12 + 35;
      } else {
        // Headers: NO(12), NO INDUK(12), NAMA(35), 6xSEM(10), JUMLAH(12), RERATA(12)
        // Total columns = 11 for subject sheets
        totalTableWidthUnits = (colCount - 1) * 12 + 35;
      }
      const tableWidthPx = totalTableWidthUnits * 7.5;
      
      try {
        if (appConfig?.headerImageUrl) {
          const base64Content = appConfig.headerImageUrl;
          
          // Detect extension from base64
          const mimeMatch = base64Content.match(/^data:image\/([a-zA-Z+]+);base64,/);
          const detectedExt = mimeMatch ? mimeMatch[1] : 'png';
          // ExcelJS supports: png, jpeg, gif
          let finalExt: 'png' | 'jpeg' | 'gif' = 'png';
          if (detectedExt === 'jpg' || detectedExt === 'jpeg') finalExt = 'jpeg';
          else if (detectedExt === 'gif') finalExt = 'gif';
          else finalExt = 'png'; // default to png, but webp is not supported

          const { width, height } = await getImageDimensions(base64Content);
          const base64Data = base64Content.split(',')[1] || base64Content;
          
          const imageId = workbook.addImage({
            base64: base64Data,
            extension: finalExt,
          });
          
          if (width > 0 && height > 0) {
            const targetWidth = 1040;
            const aspectRatio = width / height;
            const calculatedHeight = targetWidth / aspectRatio;
            
            kopRowHeight = Math.max(80, calculatedHeight * 0.75 + 10);
            worksheet.getRow(1).height = kopRowHeight;

            const startOffsetPx = Math.max(0, (tableWidthPx - targetWidth) / 2);
            const startOffsetEMU = Math.round(startOffsetPx * 9525);

            worksheet.addImage(imageId, {
              tl: { col: 0, row: 0, colOff: startOffsetEMU } as any,
              ext: { width: targetWidth, height: calculatedHeight },
              editAs: 'oneCell'
            });
          } else {
            // Fallback for missing dimensions
            const targetWidth = 1040;
            worksheet.getRow(1).height = 110;
            const startOffsetPx = Math.max(0, (tableWidthPx - targetWidth) / 2);
            const startOffsetEMU = Math.round(startOffsetPx * 9525);
            worksheet.addImage(imageId, {
              tl: { col: 0, row: 0, colOff: startOffsetEMU } as any,
              ext: { width: targetWidth, height: 140 },
              editAs: 'oneCell'
            });
          }
          worksheet.getRow(2).height = 10;
        } else {
          // Fallback text kop if no image in config
          worksheet.mergeCells(1, 1, 1, colCount);
          const cell = worksheet.getCell(1, 1);
          cell.value = 'SDN 1 GAPUK - KOP SEKOLAH';
          cell.font = { name: 'Times New Roman', bold: true, size: 16 };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          worksheet.getRow(1).height = 60;
        }
      } catch (e) {
        console.warn('Logo Kop processing failed, using text fallback.', e);
        // Ensure some header exists even on error
        worksheet.mergeCells(1, 1, 1, colCount);
        const cell = worksheet.getCell(1, 1);
        cell.value = 'DATA NILAI SISWA';
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 40;
      }

      // Title
      const titleRowNum = 3;
      const titleRow = worksheet.getRow(titleRowNum);
      titleRow.height = 30;
      const titleCell = titleRow.getCell(1);
      titleCell.value = title;
      titleCell.font = { name: 'Arial', bold: true, size: 14 };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.mergeCells(titleRowNum, 1, titleRowNum, colCount);

      // Add borders to the table starting from row 5
    };

    // Create individual subject sheets
    for (const subject of subjectConfig) {
      const cleanSubjectLabel = subject.label.replace(/[\[\]]/g, '');
      const ws = workbook.addWorksheet(cleanSubjectLabel);
      
      // Define Columns
      const headers = ['NO. URUT', 'NO. INDUK', 'NAMA'];
      SEMESTERS.forEach(sem => headers.push(`SEM ${sem}`));
      headers.push('JUMLAH', 'RATA-RATA');

      // Auto-fit columns
      ws.columns = headers.map((h, i) => ({
        key: h,
        width: h === 'NAMA' ? 35 : (h.includes('SEM') ? 10 : 12)
      }));

      await addKopToSheet(ws, `REKAP NILAI KELAS 6 ${cleanSubjectLabel} TAHUN 2026`, headers.length, false);

      // Table Header at Row 5
      const headerRowNum = 5;
      const headerRow = ws.getRow(headerRowNum);
      headerRow.height = 25;
      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, size: 10 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // Data Rows
      sortedStudents.forEach((s, index) => {
        const g = grades.find(record => record.studentId === s.id);
        const rowIndex = 6 + index;
        const row = ws.getRow(rowIndex);
        row.height = 20; // Set generous row height
        
        row.getCell(1).value = index + 1;
        row.getCell(2).value = s.nisn;
        row.getCell(3).value = s.name;
        
        let sum = 0;
        let filledCount = 0;
        SEMESTERS.forEach((sem, sIdx) => {
          const semData = g?.semesters?.[sem];
          if (semData) {
            const score = semData[subject.key as keyof SubjectGrades];
            if (typeof score === 'number') {
              row.getCell(4 + sIdx).value = score;
              sum += score;
              filledCount++;
            } else {
              row.getCell(4 + sIdx).value = 0;
            }
          } else {
            row.getCell(4 + sIdx).value = 0;
          }
        });

        row.getCell(4 + SEMESTERS.length).value = sum;
        row.getCell(5 + SEMESTERS.length).value = filledCount > 0 ? Number((sum / filledCount).toFixed(2)) : 0;

        // Add borders to all cells in row
        for (let i = 1; i <= headers.length; i++) {
          row.getCell(i).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          row.getCell(i).alignment = { vertical: 'middle' };
        }
        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(2).alignment = { horizontal: 'center' };
      });

      // Auto-fit columns (approximate)
      /* Removed duplicate setting to avoid header row */
    }

    // Create Rekap sheet
    const rekapWs = workbook.addWorksheet('Rekap Akhir');
    const rekapHeaders = ['NO. URUT', 'KELAS', 'NO. INDUK', 'NAMA'];
    subjectConfig.forEach(s => rekapHeaders.push(s.label.replace(/[\[\]]/g, '')));
    rekapHeaders.push('JUMLAH TOTAL', 'RATA-RATA TOTAL');

    rekapWs.columns = rekapHeaders.map((h) => ({
      key: h,
      width: h === 'NAMA' ? 35 : 12
    }));
    
    // Removed semester details as requested

    await addKopToSheet(rekapWs, 'REKAPAN NILAI KELAS 6 TAHUN 2026', rekapHeaders.length, true);

    // Header Row for Rekap
    const hr = rekapWs.getRow(5);
    hr.height = 25;
    rekapHeaders.forEach((h, i) => {
      const cell = hr.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 10 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Data Rows for Rekap
    sortedStudents.forEach((s, index) => {
      const g = grades.find(record => record.studentId === s.id);
      const rowIndex = 6 + index;
      const row = rekapWs.getRow(rowIndex);
      row.height = 20;

      row.getCell(1).value = index + 1;
      row.getCell(2).value = s.className || '6B';
      row.getCell(3).value = s.nisn;
      row.getCell(4).value = s.name;

      let overallSum = 0;
      let subjectCountWithData = 0;
      subjectConfig.forEach((subject, sIdx) => {
        const semesterScores = SEMESTERS.map(sem => g?.semesters?.[sem]?.[subject.key as keyof SubjectGrades]);
        const filledScores = semesterScores.filter((s): s is number => typeof s === 'number');
        
        const subjectSum = filledScores.reduce((a, b) => a + b, 0);
        const subjectAvg = filledScores.length > 0 ? Number((subjectSum / filledScores.length).toFixed(2)) : 0;
        
        row.getCell(5 + sIdx).value = subjectAvg;
        if (filledScores.length > 0) {
          overallSum += subjectAvg;
          subjectCountWithData++;
        }
      });

      const colOffset = 5 + subjectConfig.length;
      row.getCell(colOffset).value = Number(overallSum.toFixed(2));
      row.getCell(colOffset + 1).value = subjectCountWithData > 0 ? Number((overallSum / subjectCountWithData).toFixed(2)) : 0;

      // Borders
      for (let i = 1; i <= rekapHeaders.length; i++) {
        row.getCell(i).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        row.getCell(i).alignment = { vertical: 'middle' };
      }
    });

    /* Removed duplicate column definition */


    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Rekap_Nilai_Lengkap_Kls6${activeClass !== 'ALL' ? `_${activeClass}` : ''}_${new Date().getFullYear()}.xlsx`;
    saveAs(new Blob([buffer]), fileName);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.nisn.includes(searchTerm);
    const matchesClass = activeClass === 'ALL' || s.className === activeClass;
    const isNotArchived = !s.isArchived;
    return matchesSearch && matchesClass && isNotArchived;
  });

  const rankings = useMemo(() => {
    const classStudents = students.filter(s => 
      (activeClass === 'ALL' || s.className === activeClass) && !s.isArchived
    );

    const scoredStudents = classStudents.map(student => {
      const studentGrade = grades.find(g => g.studentId === student.id);
      if (!studentGrade || !studentGrade.semesters) return { student, avg: 0 };

      const semesterKeys = Object.keys(studentGrade.semesters);
      if (semesterKeys.length === 0) return { student, avg: 0 };

      let totalScore = 0;
      let totalCount = 0;

      const subjects = Object.keys(INITIAL_SUBJECTS) as (keyof SubjectGrades)[];
      semesterKeys.forEach(semKey => {
        const semesterData = studentGrade.semesters![semKey];
        subjects.forEach(sub => {
          const val = (semesterData as any)[sub];
          if (typeof val === 'number') {
            totalScore += val;
            totalCount++;
          }
        });
      });

      return { 
        student, 
        avg: totalCount > 0 ? Number((totalScore / totalCount).toFixed(2)) : 0 
      };
    }).filter(s => s.avg > 0)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 3);

    return scoredStudents;
  }, [students, grades, activeClass]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100">
        <div>
          <h4 className="text-xl font-bold text-blue-950 flex items-center gap-2">
            <Calculator className="text-blue-600" /> Raport Kelas 6 (6A & 6B)
          </h4>
          <p className="text-sm text-slate-500">Input nilai dari Semester 7 sampai 12</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white p-1 rounded-xl border border-blue-100 shadow-sm">
            {['ALL', '6A', '6B'].map((cls) => (
              <button
                key={cls}
                onClick={() => setActiveClass(cls as any)}
                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                  activeClass === cls 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-400 hover:bg-blue-50'
                }`}
              >
                {cls === 'ALL' ? 'Semua' : cls}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={downloadTemplate}
              className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs bg-white px-4 py-2.5 rounded-xl border border-slate-100 transition-all shadow-sm"
              title="Download Format Excel"
            >
              <FileDown size={14} /> <span className="hidden sm:inline">Format</span>
            </button>
            
            <label className="cursor-pointer">
              <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />
              <div className="flex items-center gap-2 bg-white text-emerald-600 border border-emerald-100 px-4 py-2.5 rounded-xl font-bold hover:bg-emerald-50 transition-all shadow-sm text-xs">
                <FileDown size={14} className="rotate-180" /> <span>Import Excel</span>
              </div>
            </label>

            <button 
              onClick={() => {
                setEditingStudent({ className: activeClass === 'ALL' ? '6B' : activeClass as any });
                setIsStudentModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-800 transition-all shadow-lg text-xs"
            >
              <Plus size={18} /> <span>Tambah Siswa</span>
            </button>

            <button 
              onClick={exportToExcel}
              className="flex items-center justify-center gap-2 bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-800 transition-all shadow-md active:scale-95 text-xs"
            >
              <FileDown size={18} /> Ekspor Lengkap
            </button>
          </div>
        </div>
      </div>

      {rankings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
          {rankings.map((rank, index) => {
            const Icon = index === 0 ? Trophy : index === 1 ? Medal : Award;
            const colors = [
              'from-yellow-400 to-yellow-600 shadow-yellow-200',
              'from-slate-300 to-slate-400 shadow-slate-200',
              'from-amber-500 to-amber-700 shadow-amber-200'
            ];
            const bgColors = [
              'bg-yellow-50 border-yellow-100',
              'bg-slate-50 border-slate-100',
              'bg-amber-50 border-amber-100'
            ];

            return (
              <motion.div
                key={rank.student.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative overflow-hidden p-5 rounded-[2rem] border ${bgColors[index]} shadow-xl flex items-center gap-4 group hover:scale-[1.02] transition-transform`}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors[index]} flex items-center justify-center text-white shadow-lg shrink-0`}>
                  <Icon size={28} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Peringkat {index + 1}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${rank.student.className === '6A' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                      {rank.student.className || '6B'}
                    </span>
                  </div>
                  <h5 className="font-bold text-slate-800 truncate leading-tight">{rank.student.name}</h5>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-black text-emerald-600">{rank.student.nisn}</span>
                    <span className="text-[10px] text-slate-400">• Rata-rata: {rank.avg}</span>
                  </div>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Icon size={80} />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {students.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2.5rem] flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-emerald-600 shadow-xl shadow-emerald-200/50">
            <Users size={40} strokeWidth={1.5} />
          </div>
          <div className="max-w-md">
            <h4 className="text-2xl font-bold text-emerald-950 mb-2">Data Siswa Kosong</h4>
            <p className="text-slate-500 text-sm leading-relaxed">
              Anda belum menambahkan data siswa. Silakan download format Excel, isi data siswa Anda, lalu impor kembali untuk memulai.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button 
              onClick={downloadTemplate}
              className="flex items-center gap-2 bg-white text-slate-600 border border-slate-200 px-6 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-all text-sm shadow-sm"
            >
              <FileDown size={18} /> Download Format Excel
            </button>
            <label className="cursor-pointer">
              <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />
              <div className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg hover:shadow-emerald-200 text-sm">
                <FileDown size={18} className="rotate-180" /> Mulai Impor Excel
              </div>
            </label>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Cari siswa berdasarkan nama atau nomor induk..." 
          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 ring-blue-500/20 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {filteredStudents.length > 0 ? (
          filteredStudents.sort((a, b) => a.name.localeCompare(b.name)).map((student) => {
            const studentGrade = grades.find(g => g.studentId === student.id);
            const semestersCount = studentGrade?.semesters ? Object.keys(studentGrade.semesters).length : 0;
            
            return (
              <div 
                key={student.id} 
                className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${semestersCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                    <Users size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800 flex items-center gap-2">
                      {student.name}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${student.className === '6A' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                        {student.className || '6B'}
                      </span>
                    </h5>
                    <p className="text-xs text-slate-400">NISN: {student.nisn} • {student.gradeLevel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {semestersCount > 0 && (
                    <span className="hidden md:flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                      {semestersCount}/6 Semester
                    </span>
                  )}
                  <button 
                    onClick={() => handleEditStudent(student)}
                    className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
                    title="Edit Data Siswa"
                  >
                    <Edit3 size={16} /> <span className="text-[10px] font-bold uppercase hidden md:inline">Edit</span>
                  </button>
                  <button 
                    onClick={() => handleEditGrades(student)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-bold"
                  >
                    <Book size={16} /> <span className="text-[10px] font-bold uppercase hidden md:inline">Input Nilai</span>
                  </button>
                  {confirmingDeleteId === student.id ? (
                    <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-200 animate-in fade-in slide-in-from-right-1">
                      <span className="text-[9px] font-black text-red-700 px-2 uppercase">Yakin Hapus?</span>
                      <button 
                        onClick={() => setConfirmingDeleteId(null)}
                        className="p-1 px-2 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                      >
                        Batal
                      </button>
                      <button 
                        onClick={() => deleteStudent(student)}
                        className="p-1 px-2 text-[10px] font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm transition-all"
                      >
                        Ya
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setConfirmingDeleteId(student.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Hapus Siswa Permanen"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      archiveStudent(student);
                    }}
                    className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer relative z-30"
                    title="Arsipkan Siswa"
                  >
                    <FileDown size={16} className="rotate-90" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-20 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <Users size={40} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 italic">Belum ada data siswa.</p>
          </div>
        )}

        {students.length > 0 && (
          <div className="mt-12 flex flex-col items-center gap-4 p-8 bg-red-50/50 rounded-[2rem] border border-red-100">
            {!showResetConfirm ? (
              <>
                <div className="text-center">
                  <h5 className="text-sm font-bold text-red-900">Menu Tahun Ajaran Baru</h5>
                  <p className="text-[10px] text-red-600 mt-1">Hanya gunakan tombol di bawah ini jika Anda ingin mengosongkan aplikasi untuk siswa baru.</p>
                </div>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="flex items-center gap-2 px-8 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 text-sm"
                >
                  <Trash2 size={18} /> Reset Seluruh Data Siswa & Nilai
                </button>
              </>
            ) : (
              <div className="w-full max-w-sm space-y-4">
                <div className="text-center">
                  <h5 className="text-sm font-bold text-red-900 uppercase tracking-wider">Konfirmasi Penghapusan Total</h5>
                  <p className="text-[10px] text-red-600 mt-1 font-medium">Tindakan ini akan menghapus semua siswa dan nilainya selamanya.</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-red-800 text-center">Ketik <span className="bg-red-200 px-1.5 py-0.5 rounded text-red-900">HAPUS</span> untuk melanjutkan:</p>
                  <input 
                    type="text"
                    value={resetKeyword}
                    onChange={(e) => setResetKeyword(e.target.value.toUpperCase())}
                    className="w-full bg-white border-2 border-red-200 rounded-xl px-4 py-2 text-center font-bold text-red-900 outline-none focus:border-red-500"
                    placeholder="..."
                    disabled={isResetting}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowResetConfirm(false);
                      setResetKeyword('');
                    }}
                    className="flex-1 py-2 rounded-xl font-bold text-slate-500 bg-white border border-slate-200 text-xs"
                    disabled={isResetting}
                  >
                    Batal
                  </button>
                  <button
                    onClick={resetAllData}
                    className="flex-[2] py-2 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-xs flex items-center justify-center gap-2 shadow-lg"
                    disabled={isResetting || resetKeyword !== 'HAPUS'}
                  >
                    {isResetting ? 'Sedang Menghapus...' : 'Ya, Hapus Semua Data'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Grades Modal */}
      {isFormOpen && activeStudent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" 
            onClick={() => setIsFormOpen(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[95vh]"
          >
            <div className="px-8 py-4 bg-blue-700 text-white shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold">Input Nilai Raport</h3>
                  <p className="text-blue-200 text-[10px] uppercase font-black tracking-widest">{activeStudent.name} • {activeStudent.nisn}</p>
                </div>
                <div className="h-8 w-px bg-white/20 mx-2 hidden md:block" />
                <div className="flex items-center gap-1 p-1 bg-white/10 rounded-lg border border-white/10">
                  {SEMESTERS.map(sem => (
                    <button
                      key={sem}
                      onClick={() => setActiveSemester(sem)}
                      className={`py-1.5 px-3 rounded-md text-[10px] font-black transition-all uppercase ${
                        activeSemester === sem ? 'bg-white text-blue-700 shadow-md' : 'hover:bg-white/10 text-white/80'
                      }`}
                    >
                      Smtr {sem}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto grow">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { id: 'pai', label: 'PAI (Agama)' },
                  { id: 'pancasila', label: 'Pancasila' },
                  { id: 'bIndo', label: 'B. Indonesia' },
                  { id: 'matematika', label: 'Matematika' },
                  { id: 'ipas', label: 'IPAS' },
                  { id: 'pjok', label: 'PJOK' },
                  { id: 'seniBdaya', label: 'Seni Budaya' },
                  { id: 'bInggris', label: 'B. Inggris' }
                ].map((subject) => (
                  <div key={subject.id} className="flex flex-col gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-100 transition-colors group">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center text-blue-600 shadow-sm border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Book size={12} />
                      </div>
                      <label className="font-bold text-slate-500 text-[10px] uppercase tracking-wider" htmlFor={subject.id}>{subject.label}</label>
                    </div>
                    <input 
                      id={subject.id}
                      type="number" 
                      min="0" max="100"
                      className="w-full bg-white border border-slate-200 rounded-xl p-4 text-center text-2xl font-black text-blue-900 focus:ring-4 ring-blue-500/10 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={formData[subject.id as keyof SubjectGrades] || 0}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setFormData({ ...formData, [subject.id]: Number(e.target.value) })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Rerata Smtr {activeSemester}</span>
                  </div>
                  <div className="text-xl font-black text-blue-900">
                    {(Object.values(formData as Record<string, number>).reduce((a, b) => a + b, 0) / 8).toFixed(1)}
                  </div>
                </div>
                
                <button 
                  type="button"
                  onClick={async () => {
                    // Option to choose between current semester or all semesters
                    const clearMode = window.confirm(`PILIHAN PEMBERSIHAN DATA:\n\nKlik "OK" untuk membersihkan SEMUA Semester (7-12)\nKlik "Cancel" untuk membersihkan HANYA Semester ${activeSemester} saja.`);
                    
                    const existingRecord = grades.find(g => g.studentId === activeStudent?.id);
                    
                    if (clearMode) {
                      // Logic for ALL SEMESTERS
                      const finalConfirm = window.confirm(`ANDA YAKIN? Ini akan menghapus TOTAL seluruh nilai dari Semester 7 sampai 12 untuk siswa ini.`);
                      if (!finalConfirm) return;

                      // 1. Reset local form UI (all semesters will be effectively cleared when switching)
                      setFormData({ ...INITIAL_SUBJECTS });
                      
                      // 2. Remove all semester data from persistent storage
                      if (existingRecord) {
                        const gradeData: GradeRecord = {
                          ...existingRecord,
                          semesters: {}, // Empty the entire semesters object
                          updatedAt: new Date().toISOString()
                        };
                        
                        try {
                          await syncData.saveItem(collections.grades, gradeData);
                          alert('Seluruh data nilai (Smtr 7-12) berhasil dibersihkan.');
                        } catch (err) {
                          console.error('Error clearing all semesters:', err);
                          alert('Gagal membersihkan data. Silakan coba lagi.');
                        }
                      }
                    } else {
                      // Logic for ONLY CURRENT SEMESTER
                      const confirmSingle = window.confirm(`Kosongkan semua nilai Semester ${activeSemester} saja?`);
                      if (confirmSingle) {
                        // 1. Reset local form UI
                        setFormData({ ...INITIAL_SUBJECTS });
                        
                        // 2. Remove specific semester from persistent storage if it exists
                        if (existingRecord && existingRecord.semesters?.[activeSemester]) {
                          const newSemesters = { ...existingRecord.semesters };
                          delete newSemesters[activeSemester];
                          
                          const gradeData: GradeRecord = {
                            ...existingRecord,
                            semesters: newSemesters,
                            updatedAt: new Date().toISOString()
                          };
                          
                          try {
                            await syncData.saveItem(collections.grades, gradeData);
                            console.log(`Semester ${activeSemester} cleared for student ${activeStudent?.id}`);
                          } catch (err) {
                            console.error('Error clearing semester:', err);
                            alert('Gagal membersihkan data semester ini.');
                          }
                        }
                      }
                    }
                  }}
                  className="text-[10px] font-bold text-red-400 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 border border-transparent hover:border-red-100"
                >
                  <Trash2 size={12} /> Bersihkan
                </button>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="px-6 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-200 transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={saveGrades}
                  className="bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-blue-800 transition-all active:scale-95 text-xs"
                >
                  <Save size={16} /> Simpan Smtr {activeSemester}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Student Modal */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setIsStudentModalOpen(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-[2.5rem] p-8 relative z-10 shadow-2xl"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-blue-950">{editingStudent.id ? 'Edit Data Siswa' : 'Tambah Siswa'}</h3>
                <p className="text-sm text-slate-500">{editingStudent.id ? 'Perbarui informasi siswa.' : 'Anda bisa menambah banyak siswa sekaligus.'}</p>
              </div>
              <button onClick={() => setIsStudentModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Pilih Kelas</label>
                  <div className="flex p-1 bg-slate-100 rounded-xl">
                    {(['6A', '6B'] as const).map((cls) => (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => setEditingStudent({ ...editingStudent, className: cls })}
                        className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${
                          editingStudent.className === cls 
                            ? 'bg-white text-blue-700 shadow-sm' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nama Lengkap Siswa</label>
                <input 
                  ref={nameInputRef}
                  className="w-full bg-slate-50 rounded-2xl p-4 outline-none border border-slate-100 focus:border-blue-300 focus:ring-4 ring-blue-500/5 transition-all"
                  placeholder="Contoh: Muhammad Akhyar"
                  value={editingStudent.name || ''}
                  onChange={e => setEditingStudent({...editingStudent, name: e.target.value})}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nomor Induk / NISN</label>
                <input 
                  className="w-full bg-slate-50 rounded-2xl p-4 outline-none border border-slate-100 focus:border-blue-300 focus:ring-4 ring-blue-500/5 transition-all"
                  placeholder="Contoh: 1521"
                  value={editingStudent.nisn || ''}
                  onChange={e => setEditingStudent({...editingStudent, nisn: e.target.value})}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveStudent(false);
                  }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Selesai
                </button>
                <button 
                  type="button"
                  onClick={() => saveStudent(false)}
                  className="bg-blue-700 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-800 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={18} /> Simpan & Lagi
                </button>
              </div>

              {editingStudent.id && (
                <button
                  type="button"
                  onClick={() => {
                    const studentToArchive = students.find(s => s.id === editingStudent.id);
                    if (studentToArchive) {
                      archiveStudent(studentToArchive);
                      setIsStudentModalOpen(false);
                    }
                  }}
                  className="w-full mt-4 flex items-center justify-center gap-2 p-3 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl text-xs font-bold transition-colors"
                >
                  <FileDown size={14} className="rotate-90" /> Arsipkan Data Siswa
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
};
