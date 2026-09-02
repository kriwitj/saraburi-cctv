import React, { useState } from 'react';
import { Plus, AlertOctagon } from 'lucide-react';
import { apiClient, extractErrorMessage } from '../api/client';
import { useDistricts, useLocalGovernments } from '../api/hooks';
import SearchableSelect from '../components/SearchableSelect';
import RequiredMark from '../components/RequiredMark';

interface UsersProps {
  currentUser: any;
  users: any[];
  refetchUsers: () => void;
  addToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

const ROLES = ['SUPER_ADMIN', 'GOVERNOR_VIEWER', 'DISTRICT_ADMIN', 'LOCAL_GOV_STAFF', 'MA_TECHNICIAN', 'POLICE_VIEWER'];

const emptyForm = {
  username: '',
  full_name: '',
  role: 'LOCAL_GOV_STAFF',
  district_id: '',
  local_gov_id: '',
  email: '',
  phone: '',
  password: '',
};

export default function Users({ currentUser, users, refetchUsers, addToast }: UsersProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'rbac'>('users');
  const districtsApi = useDistricts();
  const localGovsApi = useLocalGovernments();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [rbacMatrix, setRbacMatrix] = useState<any>({
    SUPER_ADMIN: { view_dashboard: true, view_gis: true, view_pdpa_video: true, crud_cameras: true, db_backup: true },
    GOVERNOR_VIEWER: { view_dashboard: true, view_gis: true, view_pdpa_video: true, crud_cameras: false, db_backup: false },
    LOCAL_GOV_STAFF: { view_dashboard: true, view_gis: true, view_pdpa_video: false, crud_cameras: true, db_backup: false }
  });

  const handleTogglePermission = (role: string, perm: string) => {
    setRbacMatrix((prev: any) => ({
      ...prev,
      [role]: { ...prev[role], [perm]: !prev[role][perm] }
    }));
    addToast(`อัปเดตสิทธิ์บทบาท ${role} เรียบร้อย (จำลอง - ยังไม่มี endpoint บันทึกสิทธิ์)`, 'success');
  };

  const setField = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }));
  };

  const resetForm = () => setForm(emptyForm);

  const localGovsInDistrict = localGovsApi.data.filter(g => !form.district_id || g.district_id === form.district_id);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.full_name || !form.password) {
      addToast('กรุณากรอกชื่อผู้ใช้ ชื่อจริง และรหัสผ่านให้ครบถ้วน', 'error');
      return;
    }
    try {
      await apiClient.post('/admin/users', {
        username: form.username,
        full_name: form.full_name,
        role: form.role,
        district_id: form.district_id || null,
        local_gov_id: form.local_gov_id || null,
        email: form.email || null,
        phone: form.phone || null,
        password: form.password,
      });
      addToast(`เพิ่มผู้ใช้งาน ${form.username} สำเร็จ`, 'success');
      setIsAddModalOpen(false);
      resetForm();
      refetchUsers();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'เพิ่มผู้ใช้งานไม่สำเร็จ'), 'error');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put(`/admin/users/${editingUser.id}`, {
        username: editingUser.username,
        full_name: form.full_name,
        role: form.role,
        district_id: form.district_id || null,
        local_gov_id: form.local_gov_id || null,
        email: form.email || null,
        phone: form.phone || null,
        password: form.password || undefined,
      });
      addToast(`อัปเดตข้อมูลผู้ใช้งานสำเร็จ`, 'success');
      setEditingUser(null);
      resetForm();
      refetchUsers();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'อัปเดตข้อมูลผู้ใช้งานไม่สำเร็จ'), 'error');
    }
  };

  const handleDelete = async () => {
    if (deletingUserId === null) return;
    try {
      await apiClient.delete(`/admin/users/${deletingUserId}`);
      addToast('ลบบัญชีผู้ใช้เรียบร้อย', 'success');
      setDeletingUserId(null);
      refetchUsers();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'ลบบัญชีผู้ใช้ไม่สำเร็จ'), 'error');
    }
  };

  const openEdit = (u: any) => {
    setEditingUser(u);
    setForm({
      username: u.username,
      full_name: u.full_name,
      role: u.role,
      district_id: u.district_id || '',
      local_gov_id: u.local_gov_id || '',
      email: u.email || '',
      phone: u.phone || '',
      password: '',
    });
  };

  const orgLabel = (u: any) => {
    const gov = localGovsApi.data.find(g => g.id === u.local_gov_id);
    if (gov) return gov.name_th;
    const dist = districtsApi.data.find(d => d.id === u.district_id);
    if (dist) return `อำเภอ${dist.name_th}`;
    return 'ระดับจังหวัด';
  };

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  return (
    <div className="flex flex-col gap-6 text-white animate-in fade-in duration-300">
      <div className="flex justify-between items-center border-b border-white/10 pb-4 flex-wrap gap-4">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-4 rounded-lg text-xs font-bold cursor-pointer transition ${
              activeTab === 'users' ? 'bg-[#005BAC] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            รายชื่อผู้บัญชีผู้ใช้
          </button>
          <button
            onClick={() => setActiveTab('rbac')}
            className={`py-2 px-4 rounded-lg text-xs font-bold cursor-pointer transition ${
              activeTab === 'rbac' ? 'bg-[#005BAC] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            เมทริกซ์สิทธิ์ตามบทบาท (RBAC Matrix)
          </button>
        </div>

        {activeTab === 'users' && isSuperAdmin && (
          <button
            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
            className="bg-gradient-to-r from-[#005BAC] to-[#00AEEF] hover:opacity-95 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1 shadow-md cursor-pointer hover:scale-[1.02] transition"
          >
            <Plus className="w-4 h-4" /> เพิ่มผู้ใช้งานใหม่
          </button>
        )}
      </div>

      {activeTab === 'users' ? (
        <div className="bg-[#121a2f] border border-white/10 rounded-2xl p-6 overflow-x-auto">
          {!isSuperAdmin ? (
            <p className="text-xs text-slate-500 text-center py-6">เฉพาะผู้ดูแลระบบจังหวัด (SUPER_ADMIN) เท่านั้นที่สามารถดูและจัดการรายชื่อผู้ใช้งานทั้งหมด</p>
          ) : (
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-black/30 text-slate-400 border-b border-white/10">
                  <th className="p-3">ชื่อผู้ใช้ (Username)</th>
                  <th className="p-3">ชื่อจริง - นามสกุล</th>
                  <th className="p-3">บทบาทสิทธิ์</th>
                  <th className="p-3">สังกัดหน่วยงาน / อำเภอ</th>
                  <th className="p-3">เบอร์ติดต่อ</th>
                  <th className="p-3">อีเมล</th>
                  <th className="p-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="p-3 text-sky-400 font-bold">{u.username}</td>
                    <td className="p-3 font-semibold text-slate-200">{u.full_name}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold rounded">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">{orgLabel(u)}</td>
                    <td className="p-3 text-slate-400">{u.phone || '-'}</td>
                    <td className="p-3 text-slate-400">{u.email || '-'}</td>
                    <td className="p-3 text-right flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="bg-white/5 hover:bg-white/10 text-slate-300 py-1.5 px-3 rounded-lg border border-white/10 cursor-pointer font-bold transition text-[11px]"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => setDeletingUserId(u.id)}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 py-1.5 px-3 rounded-lg border border-red-500/20 cursor-pointer font-bold transition text-[11px]"
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="bg-[#121a2f] border border-white/10 rounded-2xl p-6">
          <h4 className="font-bold text-sm text-[#00AEEF] mb-2">ตารางจับคู่เมทริกซ์สิทธิ์ตามบทบาท (RBAC Matrix Table)</h4>
          <p className="text-xs text-slate-400 mb-6">คลิกเพื่อสลับเปิด/ปิดสิทธิ์ความปลอดภัยในแต่ละกิจกรรมของกลุ่มบทบาทได้ทันที</p>

          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-black/30 border-b border-white/10 text-slate-400">
                  <th className="p-4">บทบาท (Role)</th>
                  <th className="p-4 text-center">ดู Dashboard</th>
                  <th className="p-4 text-center">ดูแผนที่ GIS</th>
                  <th className="p-4 text-center">ผ่านสิทธิ์ PDPA ดูภาพสด</th>
                  <th className="p-4 text-center">แก้ไขกล้อง CRUD</th>
                  <th className="p-4 text-center">กู้คืนสำรองระบบ</th>
                </tr>
              </thead>
              <tbody>
                {['SUPER_ADMIN', 'GOVERNOR_VIEWER', 'LOCAL_GOV_STAFF'].map(role => (
                  <tr key={role} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="p-4 font-bold text-slate-200">{role}</td>
                    {['view_dashboard', 'view_gis', 'view_pdpa_video', 'crud_cameras', 'db_backup'].map(perm => (
                      <td key={perm} className="p-4 text-center">
                        <label className="inline-flex justify-center items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rbacMatrix[role]?.[perm] || false}
                            onChange={() => handleTogglePermission(role, perm)}
                            disabled={!isSuperAdmin}
                            className="w-4 h-4 rounded text-[#00AEEF] bg-black/40 border-white/20 focus:ring-0 cursor-pointer accent-[#00AEEF]"
                          />
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/75 z-[15000] flex items-center justify-center backdrop-blur-md">
          <div className="bg-[#0f1525] border border-[#00f2fe]/20 rounded-2xl w-[480px] overflow-hidden shadow-2xl p-6 text-white animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/5">
              <h4 className="font-bold text-sm text-[#00AEEF]">เพิ่มผู้บัญชีใช้งานระบบใหม่</h4>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer">&times;</button>
            </div>
            <form onSubmit={handleAdd} className="flex flex-col gap-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">ชื่อผู้ใช้งาน (Username)<RequiredMark /></label>
                <input type="text" value={form.username} onChange={setField('username')} placeholder="srb_worker" className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">รหัสผ่านเริ่มต้น (Password)<RequiredMark /></label>
                <input type="password" value={form.password} onChange={setField('password')} placeholder="อย่างน้อย 8 ตัวอักษร" className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">ชื่อจริง - นามสกุล<RequiredMark /></label>
                <input type="text" value={form.full_name} onChange={setField('full_name')} placeholder="นายสถิติ คุ้มภัย" className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400">อีเมลติดต่อ</label>
                  <input type="email" value={form.email} onChange={setField('email')} placeholder="staff@saraburi.go.th" className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400">เบอร์ติดต่อ</label>
                  <input type="text" value={form.phone} onChange={setField('phone')} placeholder="081-2345678" className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">บทบาทสิทธิ์ (Role Group)<RequiredMark /></label>
                <SearchableSelect
                  value={form.role}
                  onChange={(v) => setForm(prev => ({ ...prev, role: v }))}
                  options={ROLES.map(r => ({ value: r, label: r }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400">สังกัดอำเภอ</label>
                  <SearchableSelect
                    value={form.district_id}
                    onChange={(v) => setForm(prev => ({ ...prev, district_id: v, local_gov_id: '' }))}
                    options={districtsApi.data.map(d => ({ value: d.id, label: d.name_th }))}
                    placeholder="-- ระดับจังหวัด --"
                    emptyLabel="-- ระดับจังหวัด --"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400">สังกัด อปท. (รหัส อปท.)</label>
                  <SearchableSelect
                    value={form.local_gov_id}
                    onChange={(v) => setForm(prev => ({ ...prev, local_gov_id: v }))}
                    options={localGovsInDistrict.map(g => ({ value: g.id, label: `${g.name_th} (${g.id})` }))}
                    placeholder="-- ไม่ระบุ --"
                    emptyLabel="-- ไม่ระบุ --"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-4 pt-3 border-t border-white/5">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="bg-white/5 hover:bg-white/10 text-slate-400 py-2 px-4 rounded-lg text-xs cursor-pointer">ยกเลิก</button>
                <button type="submit" className="bg-[#005BAC] text-white py-2 px-5 rounded-lg text-xs font-bold cursor-pointer">สร้างผู้ใช้</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/75 z-[15000] flex items-center justify-center backdrop-blur-md">
          <div className="bg-[#0f1525] border border-[#00f2fe]/20 rounded-2xl w-[480px] overflow-hidden shadow-2xl p-6 text-white animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/5">
              <h4 className="font-bold text-sm text-[#00AEEF]">แก้ไขข้อมูลผู้ใช้ {editingUser.username}</h4>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer">&times;</button>
            </div>
            <form onSubmit={handleUpdate} className="flex flex-col gap-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="flex flex-col gap-1.5 opacity-60">
                <label className="text-xs text-slate-400">ชื่อผู้ใช้ (แก้ไขไม่ได้)</label>
                <input type="text" value={editingUser.username} disabled className="bg-black/40 border border-white/5 rounded-lg p-2.5 text-xs text-slate-400" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)</label>
                <input type="password" value={form.password} onChange={setField('password')} placeholder="••••••••" className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">ชื่อจริง - นามสกุล<RequiredMark /></label>
                <input type="text" value={form.full_name} onChange={setField('full_name')} className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400">อีเมลติดต่อ</label>
                  <input type="email" value={form.email} onChange={setField('email')} className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400">เบอร์ติดต่อ</label>
                  <input type="text" value={form.phone} onChange={setField('phone')} className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">บทบาทสิทธิ์ (Role Group)<RequiredMark /></label>
                <SearchableSelect
                  value={form.role}
                  onChange={(v) => setForm(prev => ({ ...prev, role: v }))}
                  options={ROLES.map(r => ({ value: r, label: r }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400">สังกัดอำเภอ</label>
                  <SearchableSelect
                    value={form.district_id}
                    onChange={(v) => setForm(prev => ({ ...prev, district_id: v, local_gov_id: '' }))}
                    options={districtsApi.data.map(d => ({ value: d.id, label: d.name_th }))}
                    placeholder="-- ระดับจังหวัด --"
                    emptyLabel="-- ระดับจังหวัด --"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400">สังกัด อปท.</label>
                  <SearchableSelect
                    value={form.local_gov_id}
                    onChange={(v) => setForm(prev => ({ ...prev, local_gov_id: v }))}
                    options={localGovsInDistrict.map(g => ({ value: g.id, label: `${g.name_th} (${g.id})` }))}
                    placeholder="-- ไม่ระบุ --"
                    emptyLabel="-- ไม่ระบุ --"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-4 pt-3 border-t border-white/5">
                <button type="button" onClick={() => setEditingUser(null)} className="bg-white/5 hover:bg-white/10 text-slate-400 py-2 px-4 rounded-lg text-xs cursor-pointer">ยกเลิก</button>
                <button type="submit" className="bg-[#005BAC] text-white py-2 px-5 rounded-lg text-xs font-bold cursor-pointer">บันทึกการแก้ไข</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      {deletingUserId !== null && (
        <div className="fixed inset-0 bg-black/75 z-[15000] flex items-center justify-center backdrop-blur-md">
          <div className="bg-[#0f1525] border border-red-500/20 rounded-2xl w-[400px] overflow-hidden shadow-2xl p-6 text-white animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertOctagon className="w-6 h-6 shrink-0 text-red-500" />
              <h4 className="font-bold text-sm">ยืนยันการลบบัญชีผู้ใช้</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              คุณแน่ใจหรือไม่ที่จะลบผู้ใช้งานรหัส <strong className="text-red-400">{users.find(u => u.id === deletingUserId)?.username}</strong>? การกระทำนี้จะถอนสิทธิ์การเข้าสู่ระบบและระบบมอนิเตอร์กลางทันที
            </p>
            <div className="flex gap-3 justify-end pt-3 border-t border-white/5">
              <button onClick={() => setDeletingUserId(null)} className="bg-white/5 hover:bg-white/10 text-slate-400 py-2 px-4 rounded-lg text-xs cursor-pointer">ยกเลิก</button>
              <button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white py-2 px-5 rounded-lg text-xs font-bold cursor-pointer">ลบถาวร</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
