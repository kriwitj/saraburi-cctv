import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database, Map, Cpu, Video, ShieldAlert, Award, Wrench, CheckCircle, Search, Plus, AlertOctagon
} from 'lucide-react';
import { apiClient, extractErrorMessage } from '../api/client';
import {
  useCameras, useDeviceBrands, useDeviceCatalog, useDeviceCategories, useDistricts,
  useHealthChecks, useLocalGovernments, useLocalGovTypes, useNvrVmsSystems, useProjects,
  useTickets, useUptimeStats, useVideoRequests,
  useInstallationSites, useInstallPointTypes, useCameraFunctionTypes
} from '../api/hooks';
import SearchableSelect from '../components/SearchableSelect';
import RequiredMark from '../components/RequiredMark';

interface MasterDataProps {
  isDarkMode: boolean;
  addToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

// Small shared confirm-delete modal
function ConfirmDeleteModal({ title, message, onConfirm, onCancel }: { title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/75 z-[15000] flex items-center justify-center backdrop-blur-md">
      <div className="bg-[#0f1525] border border-red-500/20 rounded-2xl w-[400px] overflow-hidden shadow-2xl p-6 text-white animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 text-red-500 mb-4">
          <AlertOctagon className="w-6 h-6 shrink-0 text-red-500" />
          <h4 className="font-bold text-sm">{title}</h4>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed mb-6">{message}</p>
        <div className="flex gap-3 justify-end pt-3 border-t border-white/5">
          <button onClick={onCancel} className="bg-white/5 hover:bg-white/10 text-slate-400 py-2 px-4 rounded-lg text-xs cursor-pointer">ยกเลิก</button>
          <button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white py-2 px-5 rounded-lg text-xs font-bold cursor-pointer">ยืนยันลบถาวร</button>
        </div>
      </div>
    </div>
  );
}

function FormModal({ title, onClose, onSubmit, children }: { title: string; onClose: () => void; onSubmit: (e: React.FormEvent) => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/75 z-[15000] flex items-center justify-center backdrop-blur-md">
      <div className="bg-[#0f1525] border border-[#00f2fe]/20 rounded-2xl w-[500px] overflow-hidden shadow-2xl p-6 text-white animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/5">
          <h4 className="font-bold text-sm text-[#00AEEF]">{title}</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer">&times;</button>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4 max-h-[65vh] overflow-y-auto pr-1">
          {children}
          <div className="flex gap-3 justify-end mt-4 pt-3 border-t border-white/5">
            <button type="button" onClick={onClose} className="bg-white/5 hover:bg-white/10 text-slate-400 py-2 px-4 rounded-lg text-xs cursor-pointer">ยกเลิก</button>
            <button type="submit" className="bg-gradient-to-r from-[#005BAC] to-[#00AEEF] text-white py-2 px-5 rounded-lg text-xs font-bold cursor-pointer">บันทึก</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = "bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none";
const labelCls = "text-xs text-slate-400";

export default function MasterData({ isDarkMode, addToast }: MasterDataProps) {
  const [activeTab, setActiveTab] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H'>('A');
  const navigate = useNavigate();

  const localGovsApi = useLocalGovernments();
  const districtsApi = useDistricts();
  const localGovTypesApi = useLocalGovTypes();

  const brandsApi = useDeviceBrands();
  const categoriesApi = useDeviceCategories();
  const catalogApi = useDeviceCatalog();
  const installationSitesApi = useInstallationSites();
  const installPointTypesApi = useInstallPointTypes();
  const cameraFunctionTypesApi = useCameraFunctionTypes();

  const camerasApi = useCameras();

  const projectsApi = useProjects();

  const nvrApi = useNvrVmsSystems();

  const healthApi = useHealthChecks();
  const uptimeApi = useUptimeStats();

  const ticketsApi = useTickets();
  const videoReqApi = useVideoRequests();

  const cardClass = isDarkMode
    ? "bg-[#121a2f] border border-white/10 text-white"
    : "bg-white border border-slate-200 text-slate-800 shadow-sm";

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div>
        <h3 className="font-extrabold text-lg text-white">ข้อมูลตั้งต้นระบบสารสนเทศ (System Master Datasets)</h3>
        <p className="text-xs text-slate-400 mt-1">โครงสร้างข้อมูลกลาง 8 ชุดวิเคราะห์สำหรับการบูรณาการกล้องวงจรปิดระดับจังหวัด — ข้อมูลนี้คือต้นทางที่หน้าอื่น ๆ (ผู้ใช้งาน, ทะเบียนกล้อง) อ้างอิงตาม</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-white/10">
        {[
          { key: 'A', label: 'A. หน่วยงาน & อปท.', icon: Map },
          { key: 'B', label: 'B. แคตตาล็อกอุปกรณ์', icon: Cpu },
          { key: 'C', label: 'C. ทะเบียนสินทรัพย์กล้อง', icon: Video },
          { key: 'D', label: 'D. โครงการงบประมาณ', icon: Award },
          { key: 'E', label: 'E. โครงสร้างพื้นฐาน NVR', icon: Database },
          { key: 'F', label: 'F. ตรวจสุขภาพระบบ', icon: CheckCircle },
          { key: 'G', label: 'G. ประวัติการแจ้งซ่อม MA', icon: Wrench },
          { key: 'H', label: 'H. ประวัติคำร้องขอดูภาพ', icon: ShieldAlert }
        ].map(tab => {
          const IconComp = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition ${
                activeTab === tab.key
                  ? 'bg-[#005BAC] text-white'
                  : 'bg-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              <IconComp className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className={`${cardClass} rounded-2xl p-6`}>
        {activeTab === 'A' && (
          <TabLocalGovernments
            data={localGovsApi.data} refetch={localGovsApi.refetch}
            districts={districtsApi.data} types={localGovTypesApi.data}
            refetchTypes={localGovTypesApi.refetch}
            addToast={addToast}
          />
        )}
        {activeTab === 'B' && (
          <TabDeviceCatalog
            data={catalogApi.data} refetch={catalogApi.refetch}
            brands={brandsApi.data} refetchBrands={brandsApi.refetch}
            categories={categoriesApi.data}
            installationSites={installationSitesApi.data} refetchInstallationSites={installationSitesApi.refetch}
            installPointTypes={installPointTypesApi.data} refetchInstallPointTypes={installPointTypesApi.refetch}
            cameraFunctionTypes={cameraFunctionTypesApi.data} refetchCameraFunctionTypes={cameraFunctionTypesApi.refetch}
            addToast={addToast}
          />
        )}
        {activeTab === 'C' && (
          <TabCameraAssets data={camerasApi.data} refetch={camerasApi.refetch} navigate={navigate} addToast={addToast} />
        )}
        {activeTab === 'D' && (
          <TabProjects data={projectsApi.data} refetch={projectsApi.refetch} addToast={addToast} />
        )}
        {activeTab === 'E' && (
          <TabNvrVms data={nvrApi.data} refetch={nvrApi.refetch} localGovs={localGovsApi.data} addToast={addToast} />
        )}
        {activeTab === 'F' && (
          <TabHealth health={healthApi.data} uptime={uptimeApi.data} />
        )}
        {activeTab === 'G' && (
          <TabTickets data={ticketsApi.data} refetch={ticketsApi.refetch} addToast={addToast} />
        )}
        {activeTab === 'H' && (
          <TabVideoRequests data={videoReqApi.data} refetch={videoReqApi.refetch} addToast={addToast} />
        )}
      </div>
    </div>
  );
}

// --- TAB A: LOCAL GOVERNMENTS ---
function TabLocalGovernments({ data, refetch, districts, types, refetchTypes, addToast }: any) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [typesManagerOpen, setTypesManagerOpen] = useState(false);
  const empty = { name_th: '', type_id: types[0]?.id || 'SAO', district_id: districts[0]?.id || '', dla_code: '', contact_person: '', phone: '', email: '' };
  const [form, setForm] = useState<any>(empty);

  const filtered = data.filter((g: any) => g.name_th?.toLowerCase().includes(search.toLowerCase()) || g.id?.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setForm(empty); setEditing(null); setModalOpen(true); };
  const openEdit = (g: any) => { setForm({ ...g }); setEditing(g); setModalOpen(true); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await apiClient.put(`/admin/local-governments/${editing.id}`, form);
        addToast('แก้ไขข้อมูล อปท. สำเร็จ', 'success');
      } else {
        await apiClient.post('/admin/local-governments', form);
        addToast('เพิ่ม อปท. ใหม่สำเร็จ', 'success');
      }
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'บันทึกข้อมูลไม่สำเร็จ'), 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await apiClient.delete(`/admin/local-governments/${deletingId}`);
      addToast('ลบ อปท. สำเร็จ', 'success');
      setDeletingId(null);
      refetch();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'ลบไม่สำเร็จ'), 'error');
    }
  };

  const districtName = (id: string) => districts.find((d: any) => d.id === id)?.name_th || id;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h4 className="font-bold text-sm text-[#00AEEF]">A. ข้อมูลหน่วยงาน</h4>
        <div className="flex gap-2">
          <SearchBox value={search} onChange={setSearch} />
          <button onClick={() => setTypesManagerOpen(true)} className="bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer border border-white/10">
            จัดการประเภทหน่วยงาน
          </button>
          <AddButton onClick={openAdd} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-black/30 border-b border-white/10 text-slate-400">
              <th className="p-3">รหัสหน่วยงาน</th>
              <th className="p-3">ชื่อหน่วยงาน</th>
              <th className="p-3">อำเภอ</th>
              <th className="p-3">ผู้ประสานงานหลัก</th>
              <th className="p-3">เบอร์ติดต่อ</th>
              <th className="p-3 text-right">เครื่องมือ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((g: any) => (
              <tr key={g.id} className="border-b border-white/5 hover:bg-white/5 transition">
                <td className="p-3 font-bold text-sky-400">{g.dla_code || '-'}</td>
                <td className="p-3 font-semibold text-slate-200">{g.name_th}</td>
                <td className="p-3">{districtName(g.district_id)}</td>
                <td className="p-3 text-slate-300">{g.contact_person || '-'}</td>
                <td className="p-3 text-slate-400">{g.phone || '-'}</td>
                <td className="p-3 text-right flex justify-end gap-2">
                  <EditBtn onClick={() => openEdit(g)} />
                  <DeleteBtn onClick={() => setDeletingId(g.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <FormModal title={editing ? `แก้ไข อปท. ${editing.id}` : 'เพิ่ม อปท. ใหม่'} onClose={() => setModalOpen(false)} onSubmit={submit}>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>ชื่อหน่วยงาน<RequiredMark /></label>
            <input className={inputCls} value={form.name_th} onChange={e => setForm({ ...form, name_th: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>ประเภทหน่วยงาน</label>
              <SearchableSelect
                value={form.type_id}
                onChange={(v) => setForm({ ...form, type_id: v })}
                options={types.map((t: any) => ({ value: t.id, label: t.name_th }))}
                placeholder="-- เลือกประเภทหน่วยงาน --"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>อำเภอ<RequiredMark /></label>
              <SearchableSelect
                value={form.district_id}
                onChange={(v) => setForm({ ...form, district_id: v })}
                options={districts.map((d: any) => ({ value: d.id, label: d.name_th }))}
                placeholder="-- เลือกอำเภอ --"
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>รหัสหน่วยงาน<RequiredMark /></label>
            <input className={inputCls} value={form.dla_code || ''} onChange={e => setForm({ ...form, dla_code: e.target.value })} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>ผู้ประสานงานหลัก</label>
            <input className={inputCls} value={form.contact_person || ''} onChange={e => setForm({ ...form, contact_person: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>เบอร์ติดต่อ</label>
              <input className={inputCls} value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>อีเมล</label>
              <input className={inputCls} value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
        </FormModal>
      )}

      {deletingId && (
        <ConfirmDeleteModal
          title="ยืนยันการลบ อปท."
          message={`คุณแน่ใจหรือไม่ที่จะลบ อปท. รหัส ${deletingId}?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}

      {typesManagerOpen && (
        <LocalGovTypesManagerModal
          types={types}
          refetchTypes={refetchTypes}
          addToast={addToast}
          onClose={() => setTypesManagerOpen(false)}
        />
      )}
    </div>
  );
}

// --- SUB-MODAL: MASTER DATA FOR ประเภทหน่วยงาน (LocalGovType CRUD) ---
function LocalGovTypesManagerModal({ types, refetchTypes, addToast, onClose }: any) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ id: string; name_th: string }>({ id: '', name_th: '' });

  const resetForm = () => { setForm({ id: '', name_th: '' }); setEditingId(null); };

  const openEdit = (t: any) => { setForm({ id: t.id, name_th: t.name_th }); setEditingId(t.id); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiClient.put(`/admin/local-gov-types/${editingId}`, { id: editingId, name_th: form.name_th });
        addToast('แก้ไขประเภทหน่วยงาน สำเร็จ', 'success');
      } else {
        await apiClient.post('/admin/local-gov-types', { id: form.id, name_th: form.name_th });
        addToast('เพิ่มประเภทหน่วยงาน ใหม่สำเร็จ', 'success');
      }
      resetForm();
      await refetchTypes();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'บันทึกไม่สำเร็จ'), 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await apiClient.delete(`/admin/local-gov-types/${deletingId}`);
      addToast('ลบประเภทหน่วยงาน สำเร็จ', 'success');
      setDeletingId(null);
      await refetchTypes();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'ลบไม่สำเร็จ (อาจมี อปท. ใช้งานประเภทนี้อยู่)'), 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-[15000] flex items-center justify-center backdrop-blur-md">
      <div className="bg-[#0f1525] border border-[#00f2fe]/20 rounded-2xl w-[480px] overflow-hidden shadow-2xl p-6 text-white animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
          <h4 className="font-bold text-sm text-[#00AEEF]">จัดการประเภทหน่วยงาน (Local Gov Types)</h4>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer">&times;</button>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>รหัสประเภท<RequiredMark /></label>
              <input
                className={inputCls}
                value={form.id}
                onChange={e => setForm({ ...form, id: e.target.value.toUpperCase() })}
                disabled={!!editingId}
                required
                placeholder="เช่น SAO"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>ชื่อประเภท<RequiredMark /></label>
              <input
                className={inputCls}
                value={form.name_th}
                onChange={e => setForm({ ...form, name_th: e.target.value })}
                required
                placeholder="เช่น องค์การบริหารส่วนตำบล"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            {editingId && (
              <button type="button" onClick={resetForm} className="bg-white/5 hover:bg-white/10 text-slate-400 py-2 px-4 rounded-lg text-xs cursor-pointer">ยกเลิกแก้ไข</button>
            )}
            <button type="submit" className="bg-gradient-to-r from-[#005BAC] to-[#00AEEF] text-white py-2 px-5 rounded-lg text-xs font-bold cursor-pointer">
              {editingId ? 'บันทึกการแก้ไข' : 'เพิ่มประเภทใหม่'}
            </button>
          </div>
        </form>

        <div className="max-h-[300px] overflow-y-auto border-t border-white/5 pt-3">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-slate-400">
                <th className="p-2">รหัส</th>
                <th className="p-2">ชื่อประเภท</th>
                <th className="p-2 text-right">เครื่องมือ</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t: any) => (
                <tr key={t.id} className="border-b border-white/5">
                  <td className="p-2 font-bold text-sky-400">{t.id}</td>
                  <td className="p-2 text-slate-200">{t.name_th}</td>
                  <td className="p-2 text-right flex justify-end gap-2">
                    <EditBtn onClick={() => openEdit(t)} />
                    <DeleteBtn onClick={() => setDeletingId(t.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-4 mt-2 border-t border-white/5">
          <button onClick={onClose} className="bg-white/5 hover:bg-white/10 text-slate-400 py-2 px-4 rounded-lg text-xs cursor-pointer">ปิดหน้าต่าง</button>
        </div>
      </div>

      {deletingId && (
        <ConfirmDeleteModal
          title="ยืนยันการลบประเภทหน่วยงาน"
          message={`คุณแน่ใจหรือไม่ที่จะลบประเภทหน่วยงาน รหัส ${deletingId}? (หาก อปท. ใดใช้งานประเภทนี้อยู่จะไม่สามารถลบได้)`}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}

// --- GENERIC LOOKUP MANAGER SECTION (id + name_th CRUD, always visible inline — not a modal) ---
function LookupManagerSection({ title, endpoint, items, refetchItems, addToast, idPlaceholder }: any) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ id: string; name_th: string }>({ id: '', name_th: '' });

  const resetForm = () => { setForm({ id: '', name_th: '' }); setEditingId(null); };

  const openEdit = (t: any) => { setForm({ id: t.id, name_th: t.name_th }); setEditingId(t.id); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiClient.put(`${endpoint}/${editingId}`, { id: editingId, name_th: form.name_th });
        addToast(`แก้ไข${title} สำเร็จ`, 'success');
      } else {
        await apiClient.post(endpoint, { id: form.id, name_th: form.name_th });
        addToast(`เพิ่ม${title} ใหม่สำเร็จ`, 'success');
      }
      resetForm();
      await refetchItems();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'บันทึกไม่สำเร็จ'), 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await apiClient.delete(`${endpoint}/${deletingId}`);
      addToast(`ลบ${title} สำเร็จ`, 'success');
      setDeletingId(null);
      await refetchItems();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'ลบไม่สำเร็จ (อาจมีข้อมูลอ้างอิงใช้งานอยู่)'), 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4 border-t border-white/10 pt-6 mt-2">
      <h4 className="font-bold text-sm text-[#00AEEF]">{title}</h4>

      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5 w-40">
          <label className={labelCls}>รหัส<RequiredMark /></label>
          <input
            className={inputCls}
            value={form.id}
            onChange={e => setForm({ ...form, id: e.target.value.toUpperCase() })}
            disabled={!!editingId}
            required
            placeholder={idPlaceholder}
          />
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <label className={labelCls}>ชื่อ<RequiredMark /></label>
          <input
            className={inputCls}
            value={form.name_th}
            onChange={e => setForm({ ...form, name_th: e.target.value })}
            required
          />
        </div>
        {editingId && (
          <button type="button" onClick={resetForm} className="bg-white/5 hover:bg-white/10 text-slate-400 py-2.5 px-4 rounded-lg text-xs cursor-pointer">ยกเลิกแก้ไข</button>
        )}
        <button type="submit" className="bg-gradient-to-r from-[#005BAC] to-[#00AEEF] text-white py-2.5 px-5 rounded-lg text-xs font-bold cursor-pointer">
          {editingId ? 'บันทึกการแก้ไข' : 'เพิ่มรายการใหม่'}
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-black/30 border-b border-white/10 text-slate-400">
              <th className="p-3">รหัส</th>
              <th className="p-3">ชื่อ</th>
              <th className="p-3 text-right">เครื่องมือ</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={3} className="p-4 text-center text-slate-500">ยังไม่มีข้อมูล</td></tr>
            ) : items.map((t: any) => (
              <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition">
                <td className="p-3 font-bold text-sky-400">{t.id}</td>
                <td className="p-3 text-slate-200">{t.name_th}</td>
                <td className="p-3 text-right flex justify-end gap-2">
                  <EditBtn onClick={() => openEdit(t)} />
                  <DeleteBtn onClick={() => setDeletingId(t.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deletingId && (
        <ConfirmDeleteModal
          title={`ยืนยันการลบ${title}`}
          message={`คุณแน่ใจหรือไม่ที่จะลบรายการรหัส ${deletingId}? (หากมีกล้องใช้งานรหัสนี้อยู่จะไม่สามารถลบได้)`}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}

// --- TAB B: DEVICE CATALOG ---
function TabDeviceCatalog({
  data, refetch, brands, refetchBrands, categories,
  installationSites, refetchInstallationSites, installPointTypes, refetchInstallPointTypes,
  cameraFunctionTypes, refetchCameraFunctionTypes, addToast
}: any) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [newBrandName, setNewBrandName] = useState('');
  const empty = { brand_id: brands[0]?.id || '', model: '', category_id: categories[0]?.id || 'FIXED', resolution: '4MP', ip_rating: 'IP66', fov_horizontal: '90', status_eol: false };
  const [form, setForm] = useState<any>(empty);

  const openAdd = () => { setForm(empty); setEditing(null); setModalOpen(true); };
  const openEdit = (c: any) => { setForm({ ...c, fov_horizontal: c.fov_horizontal?.toString() || '90' }); setEditing(c); setModalOpen(true); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, brand_id: Number(form.brand_id), fov_horizontal: parseFloat(form.fov_horizontal || '90') };
    try {
      if (editing) {
        await apiClient.put(`/admin/catalogs/${editing.id}`, payload);
        addToast('แก้ไขแคตตาล็อกสำเร็จ', 'success');
      } else {
        await apiClient.post('/admin/catalogs', payload);
        addToast('เพิ่มแคตตาล็อกใหม่สำเร็จ', 'success');
      }
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'บันทึกไม่สำเร็จ'), 'error');
    }
  };

  const addBrand = async () => {
    if (!newBrandName.trim()) return;
    try {
      const res = await apiClient.post('/admin/device-brands', { name: newBrandName.trim() });
      addToast(`เพิ่มยี่ห้อ ${newBrandName} สำเร็จ`, 'success');
      setNewBrandName('');
      await refetchBrands();
      setForm((prev: any) => ({ ...prev, brand_id: res.data.id }));
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'เพิ่มยี่ห้อไม่สำเร็จ'), 'error');
    }
  };

  const confirmDelete = async () => {
    if (deletingId === null) return;
    try {
      await apiClient.delete(`/admin/catalogs/${deletingId}`);
      addToast('ลบแคตตาล็อกสำเร็จ', 'success');
      setDeletingId(null);
      refetch();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'ลบไม่สำเร็จ'), 'error');
    }
  };

  const brandName = (id: number) => brands.find((b: any) => b.id === id)?.name || id;
  const categoryName = (id: string) => categories.find((c: any) => c.id === id)?.name_th || id;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h4 className="font-bold text-sm text-[#00AEEF]">B. แคตตาล็อกอุปกรณ์กล้องวงจรปิดอ้างอิง (Device Specification Catalog)</h4>
        <div className="flex gap-2 flex-wrap">
          <AddButton onClick={openAdd} label="เพิ่มรุ่นอุปกรณ์" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-black/30 border-b border-white/10 text-slate-400">
              <th className="p-3">ยี่ห้อ</th>
              <th className="p-3">รุ่นอุปกรณ์</th>
              <th className="p-3">ประเภทกล้อง</th>
              <th className="p-3">ความละเอียด</th>
              <th className="p-3">มุมมอง (FOV)</th>
              <th className="p-3">มาตรฐาน IP</th>
              <th className="p-3">สถานะ EOL</th>
              <th className="p-3 text-right">เครื่องมือ</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d: any) => (
              <tr key={d.id} className="border-b border-white/5 hover:bg-white/5 transition">
                <td className="p-3 font-bold text-slate-200">{brandName(d.brand_id)}</td>
                <td className="p-3 text-sky-300 font-bold">{d.model}</td>
                <td className="p-3 text-slate-300">{categoryName(d.category_id)}</td>
                <td className="p-3">{d.resolution}</td>
                <td className="p-3 text-slate-400">{d.fov_horizontal}°</td>
                <td className="p-3 text-slate-400">{d.ip_rating}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] ${!d.status_eol ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{d.status_eol ? 'EOL' : 'Active'}</span></td>
                <td className="p-3 text-right flex justify-end gap-2">
                  <EditBtn onClick={() => openEdit(d)} />
                  <DeleteBtn onClick={() => setDeletingId(d.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <FormModal title={editing ? `แก้ไขแคตตาล็อก #${editing.id}` : 'เพิ่มรุ่นอุปกรณ์ใหม่'} onClose={() => setModalOpen(false)} onSubmit={submit}>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>ยี่ห้อ<RequiredMark /></label>
            <div className="flex gap-2">
              <SearchableSelect
                className="flex-1"
                value={String(form.brand_id)}
                onChange={(v) => setForm({ ...form, brand_id: v })}
                options={brands.map((b: any) => ({ value: String(b.id), label: b.name }))}
                placeholder="-- เลือกยี่ห้อ --"
                required
              />
            </div>
            <div className="flex gap-2 mt-1">
              <input className={inputCls + ' flex-1'} placeholder="เพิ่มยี่ห้อใหม่..." value={newBrandName} onChange={e => setNewBrandName(e.target.value)} />
              <button type="button" onClick={addBrand} className="bg-white/10 hover:bg-white/20 text-xs px-3 rounded-lg cursor-pointer">เพิ่ม</button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>รุ่นอุปกรณ์ (Model)<RequiredMark /></label>
            <input className={inputCls} value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>ประเภทกล้อง<RequiredMark /></label>
              <SearchableSelect
                value={form.category_id}
                onChange={(v) => setForm({ ...form, category_id: v })}
                options={categories.map((c: any) => ({ value: c.id, label: c.name_th }))}
                placeholder="-- เลือกประเภทกล้อง --"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>ความละเอียด<RequiredMark /></label>
              <input className={inputCls} value={form.resolution} onChange={e => setForm({ ...form, resolution: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>มุมมอง FOV (°)</label>
              <input type="number" className={inputCls} value={form.fov_horizontal} onChange={e => setForm({ ...form, fov_horizontal: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>มาตรฐาน IP Rating</label>
              <input className={inputCls} value={form.ip_rating} onChange={e => setForm({ ...form, ip_rating: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={!!form.status_eol} onChange={e => setForm({ ...form, status_eol: e.target.checked })} className="accent-[#00AEEF]" />
            <label className={labelCls}>สถานะ End-of-Life (EOL)</label>
          </div>
        </FormModal>
      )}

      {deletingId !== null && (
        <ConfirmDeleteModal
          title="ยืนยันการลบแคตตาล็อก"
          message={`คุณแน่ใจหรือไม่ที่จะลบแคตตาล็อกรหัส #${deletingId}?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}

      <LookupManagerSection
        title="จุดติดตั้ง"
        endpoint="/admin/installation-sites"
        items={installationSites}
        refetchItems={refetchInstallationSites}
        addToast={addToast}
        idPlaceholder="เช่น COMMUNITY_PUBLIC"
      />
      <LookupManagerSection
        title="ประเภทจุดติดตั้ง"
        endpoint="/admin/install-point-types"
        items={installPointTypes}
        refetchItems={refetchInstallPointTypes}
        addToast={addToast}
        idPlaceholder="เช่น AREA_OVERVIEW"
      />
      <LookupManagerSection
        title="รายละเอียดประเภทกล้อง"
        endpoint="/admin/camera-function-types"
        items={cameraFunctionTypes}
        refetchItems={refetchCameraFunctionTypes}
        addToast={addToast}
        idPlaceholder="เช่น GENERAL"
      />
    </div>
  );
}

// --- TAB C: CAMERA ASSETS (read + quick-edit link to Cameras page) ---
function TabCameraAssets({ data, refetch, navigate, addToast }: any) {
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const filtered = data.filter((c: any) => c.id?.toLowerCase().includes(search.toLowerCase()) || c.address_ref?.toLowerCase().includes(search.toLowerCase()));

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await apiClient.delete(`/cameras/${deletingId}`);
      addToast('ลบกล้องสำเร็จ', 'success');
      setDeletingId(null);
      refetch();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'ลบไม่สำเร็จ'), 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h4 className="font-bold text-sm text-[#00AEEF]">C. ทะเบียนสินทรัพย์หลักกล้องวงจรปิดสระบุรี (Camera Assets Database)</h4>
        <div className="flex gap-2">
          <SearchBox value={search} onChange={setSearch} />
          <button onClick={() => navigate('/cameras')} className="bg-gradient-to-r from-[#005BAC] to-[#00AEEF] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> ไปยังหน้าลงทะเบียนกล้อง
          </button>
        </div>
      </div>
      <p className="text-[11px] text-slate-500">แหล่งข้อมูลนี้ตรงกับหน้า "ทะเบียนสินทรัพย์กล้อง" ทุกประการ — การเพิ่ม/แก้ไขฟิลด์ครบถ้วนทำได้ที่หน้านั้น ที่นี่ใช้สำหรับตรวจสอบและลบเท่านั้น</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-black/30 border-b border-white/10 text-slate-400">
              <th className="p-3">รหัสกล้องกลาง</th>
              <th className="p-3">ซีเรียลนัมเบอร์</th>
              <th className="p-3">MAC Address</th>
              <th className="p-3">พิกัด Lat, Lng</th>
              <th className="p-3">ความสูง/ทิศหัน</th>
              <th className="p-3">จุดมุ่งหมายหลัก</th>
              <th className="p-3">หมดประกัน</th>
              <th className="p-3 text-right">เครื่องมือ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((cam: any) => (
              <tr key={cam.id} className="border-b border-white/5 hover:bg-white/5 transition">
                <td className="p-3 font-bold text-sky-400">{cam.id}</td>
                <td className="p-3 text-slate-300 font-bold">{cam.serial_number || '-'}</td>
                <td className="p-3 font-semibold text-slate-400">{cam.mac_address || '-'}</td>
                <td className="p-3">{cam.latitude?.toFixed?.(4)}, {cam.longitude?.toFixed?.(4)}</td>
                <td className="p-3">{cam.elevation_m}m / {cam.azimuth_deg}°</td>
                <td className="p-3"><span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[10px]">{cam.purpose_type}</span></td>
                <td className="p-3 text-slate-400">{cam.warranty_expiry || '-'}</td>
                <td className="p-3 text-right flex justify-end gap-2">
                  <EditBtn onClick={() => navigate('/cameras')} />
                  <DeleteBtn onClick={() => setDeletingId(cam.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deletingId && (
        <ConfirmDeleteModal
          title="ยืนยันการลบกล้อง"
          message={`คุณแน่ใจหรือไม่ที่จะลบกล้องรหัส ${deletingId}?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}

// --- TAB D: PURCHASE PROJECTS ---
function TabProjects({ data, refetch, addToast }: any) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const empty = { name: '', fiscal_year: '2569', budget_source: 'งบจังหวัด', budget_allocated: '', contract_amount: '', contract_number: '', contractor_name: '', warranty_expiry: '', total_points: '1' };
  const [form, setForm] = useState<any>(empty);

  const openAdd = () => { setForm(empty); setEditing(null); setModalOpen(true); };
  const openEdit = (p: any) => {
    setForm({
      name: p.name, fiscal_year: p.fiscal_year?.toString(), budget_source: p.budget_source,
      budget_allocated: p.budget_allocated?.toString() || '', contract_amount: p.contract_amount?.toString(),
      contract_number: p.contract_number || '', contractor_name: p.contractor_name || '',
      warranty_expiry: p.warranty_expiry || '', total_points: p.total_points?.toString() || '1',
    });
    setEditing(p);
    setModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      fiscal_year: parseInt(form.fiscal_year, 10),
      budget_source: form.budget_source,
      budget_allocated: parseFloat(form.budget_allocated || '0'),
      contract_amount: parseFloat(form.contract_amount || '0'),
      contract_number: form.contract_number || null,
      contractor_name: form.contractor_name || null,
      warranty_expiry: form.warranty_expiry || null,
      total_points: parseInt(form.total_points || '1', 10),
    };
    try {
      if (editing) {
        await apiClient.put(`/admin/projects/${editing.id}`, payload);
        addToast('แก้ไขโครงการสำเร็จ', 'success');
      } else {
        await apiClient.post('/admin/projects', payload);
        addToast('เพิ่มโครงการใหม่สำเร็จ', 'success');
      }
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'บันทึกไม่สำเร็จ'), 'error');
    }
  };

  const confirmDelete = async () => {
    if (deletingId === null) return;
    try {
      await apiClient.delete(`/admin/projects/${deletingId}`);
      addToast('ลบโครงการสำเร็จ', 'success');
      setDeletingId(null);
      refetch();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'ลบไม่สำเร็จ'), 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h4 className="font-bold text-sm text-[#00AEEF]">D. โครงการงบประมาณจัดซื้อบูรณาการสะสม (Procurement & Budgets)</h4>
        <AddButton onClick={openAdd} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-black/30 border-b border-white/10 text-slate-400">
              <th className="p-3">รหัสโครงการ</th>
              <th className="p-3">ชื่อแผนงานจัดจ้าง</th>
              <th className="p-3">แหล่งงบประมาณ</th>
              <th className="p-3">วงเงินในสัญญา</th>
              <th className="p-3">คู่สัญญาจ้าง</th>
              <th className="p-3">จำนวนกล้อง</th>
              <th className="p-3 text-right">เครื่องมือ</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p: any) => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition">
                <td className="p-3 font-bold text-sky-400">#{p.id}</td>
                <td className="p-3 font-semibold text-slate-200">{p.name}</td>
                <td className="p-3">{p.budget_source}</td>
                <td className="p-3 font-bold text-emerald-400">{Number(p.contract_amount).toLocaleString()} บาท</td>
                <td className="p-3 text-slate-400">{p.contractor_name || '-'}</td>
                <td className="p-3">{p.total_points} กล้อง</td>
                <td className="p-3 text-right flex justify-end gap-2">
                  <EditBtn onClick={() => openEdit(p)} />
                  <DeleteBtn onClick={() => setDeletingId(p.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <FormModal title={editing ? `แก้ไขโครงการ #${editing.id}` : 'เพิ่มโครงการใหม่'} onClose={() => setModalOpen(false)} onSubmit={submit}>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>ชื่อโครงการ<RequiredMark /></label>
            <input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>ปีงบประมาณ<RequiredMark /></label>
              <input type="number" className={inputCls} value={form.fiscal_year} onChange={e => setForm({ ...form, fiscal_year: e.target.value })} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>แหล่งงบประมาณ<RequiredMark /></label>
              <input className={inputCls} value={form.budget_source} onChange={e => setForm({ ...form, budget_source: e.target.value })} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>วงเงินตั้ง (บาท)</label>
              <input type="number" className={inputCls} value={form.budget_allocated} onChange={e => setForm({ ...form, budget_allocated: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>วงเงินสัญญา (บาท)<RequiredMark /></label>
              <input type="number" className={inputCls} value={form.contract_amount} onChange={e => setForm({ ...form, contract_amount: e.target.value })} required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>เลขที่สัญญา</label>
            <input className={inputCls} value={form.contract_number} onChange={e => setForm({ ...form, contract_number: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>คู่สัญญา/ผู้รับจ้าง</label>
            <input className={inputCls} value={form.contractor_name} onChange={e => setForm({ ...form, contractor_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>วันหมดประกัน</label>
              <input type="date" className={inputCls} value={form.warranty_expiry} onChange={e => setForm({ ...form, warranty_expiry: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>จำนวนจุดกล้อง</label>
              <input type="number" className={inputCls} value={form.total_points} onChange={e => setForm({ ...form, total_points: e.target.value })} />
            </div>
          </div>
        </FormModal>
      )}

      {deletingId !== null && (
        <ConfirmDeleteModal
          title="ยืนยันการลบโครงการ"
          message={`คุณแน่ใจหรือไม่ที่จะลบโครงการ #${deletingId}?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}

// --- TAB E: NVR/VMS SYSTEMS ---
function TabNvrVms({ data, refetch, localGovs, addToast }: any) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const empty = { local_gov_id: localGovs[0]?.id || '', name: '', brand: '', model: '', ip_address: '', channels: '16', storage_capacity_tb: '', retention_days: '30' };
  const [form, setForm] = useState<any>(empty);

  const openAdd = () => { setForm(empty); setEditing(null); setModalOpen(true); };
  const openEdit = (n: any) => {
    setForm({
      local_gov_id: n.local_gov_id, name: n.name, brand: n.brand || '', model: n.model || '',
      ip_address: n.ip_address || '', channels: n.channels?.toString() || '16',
      storage_capacity_tb: n.storage_capacity_tb?.toString() || '', retention_days: n.retention_days?.toString() || '30',
    });
    setEditing(n);
    setModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      channels: parseInt(form.channels || '16', 10),
      storage_capacity_tb: form.storage_capacity_tb ? parseFloat(form.storage_capacity_tb) : null,
      retention_days: parseInt(form.retention_days || '30', 10),
    };
    try {
      if (editing) {
        await apiClient.put(`/admin/nvr-vms/${editing.id}`, payload);
        addToast('แก้ไขระบบ NVR/VMS สำเร็จ', 'success');
      } else {
        await apiClient.post('/admin/nvr-vms', payload);
        addToast('เพิ่มระบบ NVR/VMS ใหม่สำเร็จ', 'success');
      }
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'บันทึกไม่สำเร็จ'), 'error');
    }
  };

  const confirmDelete = async () => {
    if (deletingId === null) return;
    try {
      await apiClient.delete(`/admin/nvr-vms/${deletingId}`);
      addToast('ลบระบบ NVR/VMS สำเร็จ', 'success');
      setDeletingId(null);
      refetch();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'ลบไม่สำเร็จ'), 'error');
    }
  };

  const localGovName = (id: string) => localGovs.find((g: any) => g.id === id)?.name_th || id;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h4 className="font-bold text-sm text-[#00AEEF]">E. โครงสร้างระบบบันทึก VMS, เครือข่าย และไฟฟ้า (NVR & Infrastructure)</h4>
        <AddButton onClick={openAdd} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-black/30 border-b border-white/10 text-slate-400">
              <th className="p-3">หน่วยงานเจ้าของศูนย์</th>
              <th className="p-3">ชื่อระบบ</th>
              <th className="p-3">ยี่ห้อ/รุ่น</th>
              <th className="p-3">IP Address</th>
              <th className="p-3">จำนวนช่อง</th>
              <th className="p-3">Retention (วัน)</th>
              <th className="p-3 text-right">เครื่องมือ</th>
            </tr>
          </thead>
          <tbody>
            {data.map((n: any) => (
              <tr key={n.id} className="border-b border-white/5 hover:bg-white/5 transition">
                <td className="p-3 font-bold text-slate-200">{localGovName(n.local_gov_id)}</td>
                <td className="p-3 font-semibold text-sky-400">{n.name}</td>
                <td className="p-3 text-slate-300">{n.brand} {n.model}</td>
                <td className="p-3">{n.ip_address || '-'}</td>
                <td className="p-3">{n.channels}</td>
                <td className="p-3 text-slate-400">{n.retention_days}</td>
                <td className="p-3 text-right flex justify-end gap-2">
                  <EditBtn onClick={() => openEdit(n)} />
                  <DeleteBtn onClick={() => setDeletingId(n.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <FormModal title={editing ? `แก้ไขระบบ #${editing.id}` : 'เพิ่มระบบ NVR/VMS ใหม่'} onClose={() => setModalOpen(false)} onSubmit={submit}>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>หน่วยงานเจ้าของ (อปท.)<RequiredMark /></label>
            <SearchableSelect
              value={form.local_gov_id}
              onChange={(v) => setForm({ ...form, local_gov_id: v })}
              options={localGovs.map((g: any) => ({ value: g.id, label: g.name_th }))}
              placeholder="-- เลือก อปท. --"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>ชื่อระบบ/ศูนย์<RequiredMark /></label>
            <input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>ยี่ห้อ</label>
              <input className={inputCls} value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>รุ่น</label>
              <input className={inputCls} value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>IP Address</label>
            <input className={inputCls} value={form.ip_address} onChange={e => setForm({ ...form, ip_address: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>จำนวนช่อง</label>
              <input type="number" className={inputCls} value={form.channels} onChange={e => setForm({ ...form, channels: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>ความจุ (TB)</label>
              <input type="number" className={inputCls} value={form.storage_capacity_tb} onChange={e => setForm({ ...form, storage_capacity_tb: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Retention (วัน)</label>
              <input type="number" className={inputCls} value={form.retention_days} onChange={e => setForm({ ...form, retention_days: e.target.value })} />
            </div>
          </div>
        </FormModal>
      )}

      {deletingId !== null && (
        <ConfirmDeleteModal
          title="ยืนยันการลบระบบ NVR/VMS"
          message={`คุณแน่ใจหรือไม่ที่จะลบระบบรหัส #${deletingId}?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}

// --- TAB F: HEALTH & UPTIME (READ-ONLY) ---
function TabHealth({ health, uptime }: any) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h4 className="font-bold text-sm text-[#00AEEF]">F. สภาพความพร้อมใช้งานและการมอนิเตอร์สุขภาพ (System Health & Uptime)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-black/30 border-b border-white/10 text-slate-400">
                <th className="p-3">รหัสกล้อง</th>
                <th className="p-3">สถานะปิง</th>
                <th className="p-3">ระยะดีเลย์ Ping</th>
                <th className="p-3">สถานะสตรีม</th>
                <th className="p-3">เวลาที่ตรวจสอบล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {health.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">ยังไม่มีข้อมูลผลตรวจสถานะอัตโนมัติ</td></tr>
              ) : health.map((h: any) => (
                <tr key={h.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="p-3 font-bold text-slate-200">{h.camera_id}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${h.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{h.status}</span>
                  </td>
                  <td className="p-3 text-slate-300">{h.ping_latency_ms ? `${h.ping_latency_ms}ms` : 'Timeout'}</td>
                  <td className="p-3">{h.stream_status || '-'}</td>
                  <td className="p-3 text-slate-400">{h.check_time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h4 className="font-bold text-sm text-[#00AEEF]">Availability รายเดือน (Uptime Monthly Stats)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-black/30 border-b border-white/10 text-slate-400">
                <th className="p-3">รหัสกล้อง</th>
                <th className="p-3">เดือน</th>
                <th className="p-3">Availability</th>
              </tr>
            </thead>
            <tbody>
              {uptime.length === 0 ? (
                <tr><td colSpan={3} className="p-6 text-center text-slate-500">ยังไม่มีข้อมูลสถิติ Uptime รายเดือน</td></tr>
              ) : uptime.map((u: any) => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="p-3 font-bold text-slate-200">{u.camera_id}</td>
                  <td className="p-3">{u.year_month}</td>
                  <td className="p-3 text-[#00AEEF] font-bold">{u.availability_pct != null ? `${u.availability_pct}%` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- TAB G: MAINTENANCE TICKETS ---
function TabTickets({ data, refetch, addToast }: any) {
  const updateStatus = async (id: number, status: string) => {
    try {
      await apiClient.put(`/tickets/${id}`, { status });
      addToast('อัปเดตสถานะตั๋วซ่อมสำเร็จ', 'success');
      refetch();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'อัปเดตไม่สำเร็จ'), 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h4 className="font-bold text-sm text-[#00AEEF]">G. งานซ่อมบำรุงและประวัติการแก้ปัญหา (Maintenance Tickets & SLA)</h4>
      <p className="text-[11px] text-slate-500">สร้างใบแจ้งซ่อมใหม่ได้ที่หน้า "แจ้งซ่อม & ประกันสัญญา MA"</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-black/30 border-b border-white/10 text-slate-400">
              <th className="p-3">รหัสตั๋วซ่อม</th>
              <th className="p-3">รหัสกล้อง</th>
              <th className="p-3">แจ้งซ่อมเมื่อ</th>
              <th className="p-3">รายละเอียด</th>
              <th className="p-3">ผู้รับผิดชอบงาน</th>
              <th className="p-3">สถานะตั๋ว</th>
              <th className="p-3 text-right">เครื่องมือ</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-slate-500">ไม่มีรายการใบแจ้งซ่อมในระบบ</td></tr>
            ) : data.map((t: any) => (
              <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition">
                <td className="p-3 font-bold text-sky-400">{t.ticket_number}</td>
                <td className="p-3 text-slate-200 font-bold">{t.camera_id}</td>
                <td className="p-3 text-slate-400">{t.reported_at}</td>
                <td className="p-3 text-slate-300">{t.issue_description}</td>
                <td className="p-3 text-slate-300">{t.reported_by}</td>
                <td className="p-3"><span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[10px] font-bold">{t.status}</span></td>
                <td className="p-3 text-right flex justify-end gap-2">
                  {t.status === 'OPEN' && (
                    <button onClick={() => updateStatus(t.id, 'IN_PROGRESS')} className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg cursor-pointer">รับงาน</button>
                  )}
                  {t.status === 'IN_PROGRESS' && (
                    <button onClick={() => updateStatus(t.id, 'RESOLVED')} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg cursor-pointer">ปิดงาน</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- TAB H: PDPA VIDEO REQUESTS ---
function TabVideoRequests({ data, refetch, addToast }: any) {
  const approve = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      await apiClient.put(`/video-requests/${id}/approve`, { status });
      addToast(status === 'APPROVED' ? 'อนุมัติคำร้องขอภาพสำเร็จ' : 'ปฏิเสธคำร้องขอภาพสำเร็จ', 'success');
      refetch();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'ดำเนินการไม่สำเร็จ'), 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h4 className="font-bold text-sm text-[#00AEEF]">H. บันทึกคำร้องขอเข้าดูสตรีมย้อนหลัง (PDPA Stream Request Logs)</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-black/30 border-b border-white/10 text-slate-400">
              <th className="p-3">รหัสคำร้อง</th>
              <th className="p-3">ผู้ขอดูภาพ</th>
              <th className="p-3">สังกัดหน่วยงาน</th>
              <th className="p-3">เลขคดี/บันทึก</th>
              <th className="p-3">ช่วงเวลาที่ขอ</th>
              <th className="p-3">สถานะ</th>
              <th className="p-3 text-right">เครื่องมือ</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-slate-500">ไม่มีคำร้องขอภาพย้อนหลังในระบบ</td></tr>
            ) : data.map((r: any) => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition">
                <td className="p-3 font-bold text-sky-400">{r.request_number}</td>
                <td className="p-3 font-semibold text-slate-200">{r.requester_name}</td>
                <td className="p-3 text-slate-300">{r.requester_agency || '-'}</td>
                <td className="p-3 font-bold text-slate-400">{r.case_number || '-'}</td>
                <td className="p-3 text-slate-400">{r.start_time} - {r.end_time}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  r.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' :
                  r.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                }`}>{r.status}</span></td>
                <td className="p-3 text-right flex justify-end gap-2">
                  {r.status === 'PENDING' && (
                    <>
                      <button onClick={() => approve(r.id, 'APPROVED')} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg cursor-pointer">อนุมัติ</button>
                      <button onClick={() => approve(r.id, 'REJECTED')} className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold py-1.5 px-3 rounded-lg cursor-pointer">ปฏิเสธ</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- SHARED SMALL UI HELPERS ---
function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex bg-black/20 border border-white/5 rounded-xl px-3 py-2 items-center gap-2">
      <Search className="w-3.5 h-3.5 text-slate-500" />
      <input type="text" placeholder="ค้นหา..." value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent border-none text-xs text-white focus:outline-none w-40" />
    </div>
  );
}

function AddButton({ onClick, label = 'เพิ่มรายการใหม่' }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="bg-gradient-to-r from-[#005BAC] to-[#00AEEF] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5">
      <Plus className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

function EditBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="bg-white/5 hover:bg-white/10 text-slate-300 py-1.5 px-3 rounded-lg border border-white/10 cursor-pointer font-bold transition text-[11px]">แก้ไข</button>;
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 py-1.5 px-3 rounded-lg border border-red-500/20 cursor-pointer font-bold transition text-[11px]">ลบ</button>;
}
