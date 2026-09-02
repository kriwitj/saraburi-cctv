import React, { useState } from 'react';
import { Plus, AlertOctagon } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { apiClient, extractErrorMessage } from '../api/client';
import SearchableSelect from '../components/SearchableSelect';
import RequiredMark from '../components/RequiredMark';

interface ProjectItem {
  id: number;
  name: string;
  fiscal_year: number;
  budget_source: string;
  contract_amount: number;
  contractor_name: string;
}

interface ReportsProps {
  currentUser: any;
  projects: ProjectItem[];
  refetchProjects: () => void;
  addToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

const emptyForm = {
  name: '',
  fiscal_year: '2569',
  budget_source: 'งบจังหวัด',
  contract_amount: '',
  contractor_name: '',
  contract_number: '',
};

export default function Reports({ currentUser, projects, refetchProjects, addToast }: ReportsProps) {
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProj, setEditingProj] = useState<any>(null);
  const [deletingProjId, setDeletingProjId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const setField = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }));
  };

  const resetForm = () => setForm(emptyForm);

  const buildPayload = () => ({
    name: form.name,
    fiscal_year: parseInt(form.fiscal_year, 10),
    budget_source: form.budget_source,
    contract_amount: parseFloat(form.contract_amount || '0'),
    contractor_name: form.contractor_name || null,
    contract_number: form.contract_number || null,
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.contract_amount) return;
    try {
      await apiClient.post('/admin/projects', buildPayload());
      addToast(`เพิ่มโครงการจัดซื้อจัดจ้างสำเร็จ`, 'success');
      setIsAddModalOpen(false);
      resetForm();
      refetchProjects();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'เพิ่มโครงการไม่สำเร็จ'), 'error');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put(`/admin/projects/${editingProj.id}`, buildPayload());
      addToast('แก้ไขรายละเอียดโครงการสำเร็จ', 'success');
      setEditingProj(null);
      resetForm();
      refetchProjects();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'แก้ไขโครงการไม่สำเร็จ'), 'error');
    }
  };

  const handleDelete = async () => {
    if (deletingProjId === null) return;
    try {
      await apiClient.delete(`/admin/projects/${deletingProjId}`);
      addToast('ลบโครงการเรียบร้อยแล้ว', 'success');
      setDeletingProjId(null);
      refetchProjects();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'ลบโครงการไม่สำเร็จ'), 'error');
    }
  };

  const openEdit = (p: any) => {
    setEditingProj(p);
    setForm({
      name: p.name,
      fiscal_year: p.fiscal_year?.toString() || '2569',
      budget_source: p.budget_source || 'งบจังหวัด',
      contract_amount: p.contract_amount?.toString() || '',
      contractor_name: p.contractor_name || '',
      contract_number: p.contract_number || '',
    });
  };

  return (
    <div className="flex flex-col gap-8 text-white animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-base text-[#00AEEF]">ระบบวิเคราะห์งบประมาณและโครงการจัดซื้อสะสม</h3>
          <p className="text-xs text-slate-400 mt-1">บูรณาการข้อมูลการจัดซื้อลดความซ้ำซ้อนระดับองค์กรปกครองส่วนท้องถิ่น</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
            className="bg-[#005BAC] hover:opacity-90 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition"
          >
            <Plus className="w-4 h-4" /> เพิ่มโครงการงบประมาณ
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-[#121a2f] border border-white/10 rounded-2xl p-6">
          <h4 className="font-bold text-sm text-[#00AEEF] mb-6">มูลค่างบประมาณจัดซื้อสะสมรายปี</h4>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={
                Object.entries(
                  projects.reduce((acc: Record<string, number>, p) => {
                    const key = String(p.fiscal_year);
                    acc[key] = (acc[key] || 0) + Number(p.contract_amount || 0);
                    return acc;
                  }, {})
                ).sort(([a], [b]) => a.localeCompare(b)).map(([name, budget]) => ({ name, budget }))
              }>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" stroke="#8b9bb4" fontSize={11} />
                <YAxis stroke="#8b9bb4" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#070b13', borderColor: '#ffffff10' }} />
                <Bar dataKey="budget" fill="#005BAC" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#121a2f] border border-white/10 rounded-2xl p-6 overflow-x-auto">
          <h4 className="font-bold text-sm text-[#00AEEF] mb-4">ตารางโครงการจัดซื้อจัดจ้างกล้องของจังหวัด</h4>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-black/25 text-slate-400 border-b border-white/10">
                <th className="p-3">ปีงบประมาณ</th>
                <th className="p-3">ชื่อแผนจัดจ้าง</th>
                <th className="p-3">แหล่งงบ</th>
                <th className="p-3">งบตามสัญญา</th>
                {isSuperAdmin && <th className="p-3 text-right">การจัดการ</th>}
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="p-3 text-sky-400 font-bold">{p.fiscal_year}</td>
                  <td className="p-3 font-semibold text-slate-200">{p.name}</td>
                  <td className="p-3 text-slate-400">{p.budget_source}</td>
                  <td className="p-3 text-emerald-400 font-bold">{Number(p.contract_amount).toLocaleString()} บาท</td>
                  {isSuperAdmin && (
                    <td className="p-3 text-right flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="bg-white/5 hover:bg-white/10 text-slate-300 py-1.5 px-3 rounded-lg border border-white/10 cursor-pointer font-bold transition text-[11px]"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => setDeletingProjId(p.id)}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 py-1.5 px-3 rounded-lg border border-red-500/20 cursor-pointer font-bold transition text-[11px]"
                      >
                        ลบ
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD PROJECT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/75 z-[15000] flex items-center justify-center backdrop-blur-md">
          <div className="bg-[#0f1525] border border-[#00f2fe]/20 rounded-2xl w-[450px] overflow-hidden shadow-2xl p-6 text-white animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/5">
              <h4 className="font-bold text-sm text-[#00AEEF]">ลงทะเบียนโครงการจัดซื้อจัดจ้างใหม่</h4>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer">&times;</button>
            </div>
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">ชื่อแผนจัดซื้อ/ชื่อโครงการ<RequiredMark /></label>
                <input type="text" value={form.name} onChange={setField('name')} placeholder="โครงการจัดหาเทคโนโลยีเฝ้าระวังภัย อปท. 2569" className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400">ปีงบประมาณ<RequiredMark /></label>
                  <input type="number" value={form.fiscal_year} onChange={setField('fiscal_year')} className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400">แหล่งงบประมาณ<RequiredMark /></label>
                  <SearchableSelect
                    value={form.budget_source}
                    onChange={(v) => setForm(prev => ({ ...prev, budget_source: v }))}
                    options={[
                      { value: 'งบ อปท.', label: 'งบ อปท.' },
                      { value: 'งบจังหวัด', label: 'งบจังหวัด' },
                      { value: 'งบกลุ่มจังหวัด', label: 'งบกลุ่มจังหวัด' },
                      { value: 'เงินอุดหนุน', label: 'เงินอุดหนุน' },
                      { value: 'เงินสะสม', label: 'เงินสะสม' },
                    ]}
                    placeholder="-- เลือกแหล่งงบประมาณ --"
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">วงเงินสัญญาจ้าง (บาท)<RequiredMark /></label>
                <input type="number" value={form.contract_amount} onChange={setField('contract_amount')} placeholder="5400000" className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">คู่สัญญา/ผู้รับจ้าง</label>
                <input type="text" value={form.contractor_name} onChange={setField('contractor_name')} className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" />
              </div>
              <div className="flex gap-3 justify-end mt-4 pt-3 border-t border-white/5">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="bg-white/5 hover:bg-white/10 text-slate-400 py-2 px-4 rounded-lg text-xs cursor-pointer">ยกเลิก</button>
                <button type="submit" className="bg-[#005BAC] text-white py-2 px-5 rounded-lg text-xs font-bold cursor-pointer">เพิ่มแผนจัดซื้อ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROJECT MODAL */}
      {editingProj && (
        <div className="fixed inset-0 bg-black/75 z-[15000] flex items-center justify-center backdrop-blur-md">
          <div className="bg-[#0f1525] border border-[#00f2fe]/20 rounded-2xl w-[450px] overflow-hidden shadow-2xl p-6 text-white animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/5">
              <h4 className="font-bold text-sm text-[#00AEEF]">แก้ไขข้อมูลโครงการ #{editingProj.id}</h4>
              <button onClick={() => setEditingProj(null)} className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer">&times;</button>
            </div>
            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">ชื่อแผนจัดซื้อ/ชื่อโครงการ<RequiredMark /></label>
                <input type="text" value={form.name} onChange={setField('name')} className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400">ปีงบประมาณ<RequiredMark /></label>
                  <input type="number" value={form.fiscal_year} onChange={setField('fiscal_year')} className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400">วงเงินสัญญาจ้าง (บาท)<RequiredMark /></label>
                  <input type="number" value={form.contract_amount} onChange={setField('contract_amount')} className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" required />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">คู่สัญญา/ผู้รับจ้าง</label>
                <input type="text" value={form.contractor_name} onChange={setField('contractor_name')} className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" />
              </div>
              <div className="flex gap-3 justify-end mt-4 pt-3 border-t border-white/5">
                <button type="button" onClick={() => setEditingProj(null)} className="bg-white/5 hover:bg-white/10 text-slate-400 py-2 px-4 rounded-lg text-xs cursor-pointer">ยกเลิก</button>
                <button type="submit" className="bg-[#005BAC] text-white py-2 px-5 rounded-lg text-xs font-bold cursor-pointer">บันทึกการแก้ไข</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE PROJECT CONFIRMATION MODAL */}
      {deletingProjId !== null && (
        <div className="fixed inset-0 bg-black/75 z-[15000] flex items-center justify-center backdrop-blur-md">
          <div className="bg-[#0f1525] border border-red-500/20 rounded-2xl w-[400px] overflow-hidden shadow-2xl p-6 text-white animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertOctagon className="w-6 h-6 shrink-0 text-red-500" />
              <h4 className="font-bold text-sm">ยืนยันการลบโครงการจัดซื้อ</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              คุณแน่ใจหรือไม่ที่จะลบโครงการ #{deletingProjId} ออกจากทะเบียนระบบคลัง? แผนจัดซื้อและรายงานสรุปงบจัดสรรปีนี้จะได้รับผลกระทบ
            </p>
            <div className="flex gap-3 justify-end pt-3 border-t border-white/5">
              <button onClick={() => setDeletingProjId(null)} className="bg-white/5 hover:bg-white/10 text-slate-400 py-2 px-4 rounded-lg text-xs cursor-pointer">ยกเลิก</button>
              <button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white py-2 px-5 rounded-lg text-xs font-bold cursor-pointer">ลบถาวร</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
