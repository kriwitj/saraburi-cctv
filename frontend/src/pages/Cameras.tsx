import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, AlertOctagon, Download, Upload, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { apiClient, extractErrorMessage } from '../api/client';
import {
  useDeviceBrands, useDeviceCatalog, useLocalGovernments, useNvrVmsSystems, useProjects,
  useInstallationSites, useInstallPointTypes, useCameraFunctionTypes
} from '../api/hooks';
import SearchableSelect from '../components/SearchableSelect';
import RequiredMark from '../components/RequiredMark';

interface CamerasProps {
  currentUser: any;
  cameras: any[];
  refetchCameras: () => void;
  addToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

const PURPOSE_TYPES = [
  { value: 'SAFETY', label: 'ความปลอดภัย' },
  { value: 'TRAFFIC', label: 'จราจร' },
  { value: 'ENVIRONMENT', label: 'สิ่งแวดล้อม' },
  { value: 'DISASTER', label: 'ป้องกันภัยพิบัติ' },
];

const emptyForm = {
  id: '',
  serial_number: '',
  asset_registry_no: '',
  mac_address: '',
  private_ip: '',
  public_ip: '',
  catalog_id: '',
  local_gov_id: '',
  nvr_vms_id: '',
  project_id: '',
  latitude: '',
  longitude: '',
  elevation_m: '3.0',
  azimuth_deg: '0',
  view_angle_deg: '90',
  view_range_m: '30',
  address_ref: '',
  installation_site_id: '',
  install_point_type_id: '',
  camera_function_type_id: '',
  purpose_type: 'SAFETY',
  status: 'PENDING_INSTALL',
  install_date: '',
  warranty_expiry: '',
  photo_site_url: '',
  photo_view_url: '',
  stream_url: '',
};

const STATUS_OPTIONS = [
  { value: 'PENDING_INSTALL', label: 'PENDING_INSTALL' },
  { value: 'ONLINE', label: 'ONLINE' },
  { value: 'OFFLINE', label: 'OFFLINE' },
  { value: 'MAINTENANCE', label: 'MAINTENANCE' },
  { value: 'REMOVED', label: 'REMOVED' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const SORT_FIELD_OPTIONS = [
  { value: 'address_ref', label: 'ชื่อ/สถานที่ติดตั้ง' },
  { value: 'created_at', label: 'วันที่เพิ่ม' },
];

export default function Cameras({ currentUser, cameras, refetchCameras, addToast }: CamerasProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocalGovId, setFilterLocalGovId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortField, setSortField] = useState<'address_ref' | 'created_at'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const localGovsApi = useLocalGovernments();
  const catalogApi = useDeviceCatalog();
  const brandsApi = useDeviceBrands();
  const projectsApi = useProjects();
  const installationSitesApi = useInstallationSites();
  const installPointTypesApi = useInstallPointTypes();
  const cameraFunctionTypesApi = useCameraFunctionTypes();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCam, setEditingCam] = useState<any>(null);
  const [deletingCamId, setDeletingCamId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const nvrVmsApi = useNvrVmsSystems(form.local_gov_id || undefined);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<any>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const canEdit = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'DISTRICT_ADMIN' || currentUser.role === 'LOCAL_GOV_STAFF';

  const catalogLabel = (cat: any) => {
    const brand = brandsApi.data.find(b => b.id === cat.brand_id);
    return `${brand ? brand.name + ' ' : ''}${cat.model} (#${cat.id})`;
  };

  const filteredCameras = useMemo(() => {
    const filtered = cameras.filter(c =>
      (c.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.address_ref?.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (!filterLocalGovId || c.local_gov_id === filterLocalGovId) &&
      (!filterStatus || c.status === filterStatus)
    );
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'address_ref') {
        cmp = (a.address_ref || '').localeCompare(b.address_ref || '', 'th');
      } else {
        cmp = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [cameras, searchQuery, filterLocalGovId, filterStatus, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredCameras.length / pageSize));
  const clampedPage = Math.min(currentPage, totalPages);
  const paginatedCameras = useMemo(
    () => filteredCameras.slice((clampedPage - 1) * pageSize, clampedPage * pageSize),
    [filteredCameras, clampedPage, pageSize]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterLocalGovId, filterStatus, sortField, sortDir, pageSize]);

  const setField = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }));
  };

  const resetForm = () => setForm(emptyForm);

  const buildPayload = () => ({
    id: form.id,
    serial_number: form.serial_number || null,
    asset_registry_no: form.asset_registry_no || null,
    mac_address: form.mac_address || null,
    private_ip: form.private_ip || null,
    public_ip: form.public_ip || null,
    catalog_id: form.catalog_id ? Number(form.catalog_id) : null,
    local_gov_id: form.local_gov_id,
    nvr_vms_id: form.nvr_vms_id ? Number(form.nvr_vms_id) : null,
    project_id: form.project_id ? Number(form.project_id) : null,
    latitude: parseFloat(form.latitude),
    longitude: parseFloat(form.longitude),
    elevation_m: parseFloat(form.elevation_m || '3.0'),
    azimuth_deg: parseFloat(form.azimuth_deg || '0'),
    view_angle_deg: parseFloat(form.view_angle_deg || '90'),
    view_range_m: parseFloat(form.view_range_m || '30'),
    address_ref: form.address_ref,
    installation_site_id: form.installation_site_id || null,
    install_point_type_id: form.install_point_type_id || null,
    camera_function_type_id: form.camera_function_type_id || null,
    purpose_type: form.purpose_type,
    status: form.status,
    install_date: form.install_date || null,
    warranty_expiry: form.warranty_expiry || null,
    photo_site_url: form.photo_site_url || null,
    photo_view_url: form.photo_view_url || null,
    stream_url: form.stream_url || null,
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id || !form.address_ref || !form.local_gov_id || !form.latitude || !form.longitude) {
      addToast('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (รหัสกล้อง, อปท., สถานที่, พิกัด)', 'error');
      return;
    }
    try {
      await apiClient.post('/cameras', buildPayload());
      addToast(`ลงทะเบียนกล้อง ${form.id} สำเร็จ`, 'success');
      setIsAddModalOpen(false);
      resetForm();
      refetchCameras();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'ลงทะเบียนกล้องไม่สำเร็จ'), 'error');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put(`/cameras/${editingCam.id}`, buildPayload());
      addToast(`แก้ไขข้อมูลกล้อง ${editingCam.id} เรียบร้อย`, 'success');
      setEditingCam(null);
      resetForm();
      refetchCameras();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'แก้ไขข้อมูลกล้องไม่สำเร็จ'), 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingCamId) return;
    try {
      await apiClient.delete(`/cameras/${deletingCamId}`);
      addToast(`ลบกล้อง ${deletingCamId} ออกจากระบบแล้ว`, 'success');
      setDeletingCamId(null);
      refetchCameras();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'ลบกล้องไม่สำเร็จ'), 'error');
    }
  };

  const openEdit = (c: any) => {
    setEditingCam(c);
    setForm({
      id: c.id,
      serial_number: c.serial_number || '',
      asset_registry_no: c.asset_registry_no || '',
      mac_address: c.mac_address || '',
      private_ip: c.private_ip || '',
      public_ip: c.public_ip || '',
      catalog_id: c.catalog_id?.toString() || '',
      local_gov_id: c.local_gov_id || '',
      nvr_vms_id: c.nvr_vms_id?.toString() || '',
      project_id: c.project_id?.toString() || '',
      latitude: c.latitude?.toString() || '',
      longitude: c.longitude?.toString() || '',
      elevation_m: c.elevation_m?.toString() || '3.0',
      azimuth_deg: c.azimuth_deg?.toString() || '0',
      view_angle_deg: c.view_angle_deg?.toString() || '90',
      view_range_m: c.view_range_m?.toString() || '30',
      address_ref: c.address_ref || '',
      installation_site_id: c.installation_site_id || '',
      install_point_type_id: c.install_point_type_id || '',
      camera_function_type_id: c.camera_function_type_id || '',
      purpose_type: c.purpose_type || 'SAFETY',
      status: c.status || 'PENDING_INSTALL',
      install_date: c.install_date || '',
      warranty_expiry: c.warranty_expiry || '',
      photo_site_url: c.photo_site_url || '',
      photo_view_url: c.photo_view_url || '',
      stream_url: c.stream_url || '',
    });
  };

  const localGovName = (id: string) => localGovsApi.data.find(g => g.id === id)?.name_th || id;
  const installPointTypeName = (id: string) => installPointTypesApi.data.find((t: any) => t.id === id)?.name_th || id || '-';

  const handleExport = async (format: 'xlsx' | 'csv') => {
    setIsExporting(true);
    try {
      const res = await apiClient.get('/cameras/export', {
        params: { format },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `sri_cctv_cameras_export.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('ส่งออกข้อมูลกล้องสำเร็จ', 'success');
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'ส่งออกข้อมูลไม่สำเร็จ'), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/cameras/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportSummary(res.data);
      if (res.data.imported_count > 0) refetchCameras();
      addToast(
        res.data.failed_count === 0
          ? `นำเข้าข้อมูลกล้องสำเร็จ ${res.data.imported_count} รายการ`
          : `นำเข้าสำเร็จ ${res.data.imported_count} รายการ, ล้มเหลว ${res.data.failed_count} รายการ`,
        res.data.failed_count === 0 ? 'success' : 'warning'
      );
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'นำเข้าข้อมูลไม่สำเร็จ'), 'error');
    } finally {
      setIsImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const renderFormFields = (isEdit: boolean) => (
    <div className="flex flex-col gap-4 max-h-[65vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">รหัสสินทรัพย์ (Asset ID)<RequiredMark /></label>
          <input type="text" value={form.id} onChange={setField('id')} disabled={isEdit} placeholder="SRI-1901-190101-0001" className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none disabled:opacity-50" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">หมายเลขซีเรียล</label>
          <input type="text" value={form.serial_number} onChange={setField('serial_number')} placeholder="HK-99120-X" className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">เลขครุภัณฑ์</label>
          <input type="text" value={form.asset_registry_no} onChange={setField('asset_registry_no')} placeholder="ครภ.518-60-0001" className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">MAC Address</label>
          <input type="text" value={form.mac_address} onChange={setField('mac_address')} placeholder="00:25:96:FF:FE:12" className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">รุ่นอุปกรณ์ (Device Catalog)</label>
          <SearchableSelect
            value={form.catalog_id}
            onChange={(v) => setForm(prev => ({ ...prev, catalog_id: v }))}
            options={catalogApi.data.map(cat => ({ value: String(cat.id), label: catalogLabel(cat) }))}
            placeholder="-- ไม่ระบุ --"
            emptyLabel="-- ไม่ระบุ --"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">Private IP</label>
          <input type="text" value={form.private_ip} onChange={setField('private_ip')} placeholder="192.168.1.10" className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">Public IP</label>
          <input type="text" value={form.public_ip} onChange={setField('public_ip')} placeholder="203.0.113.10" className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-400">สถานที่ติดตั้ง<RequiredMark /></label>
        <input type="text" value={form.address_ref} onChange={setField('address_ref')} placeholder="สี่แยกทางรถไฟสระบุรี" className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">หน่วยงานเจ้าของ<RequiredMark /></label>
          <SearchableSelect
            value={form.local_gov_id}
            onChange={(v) => setForm(prev => ({ ...prev, local_gov_id: v }))}
            options={localGovsApi.data.map(g => ({ value: g.id, label: `${g.name_th} (${g.id})` }))}
            placeholder="-- เลือกหน่วยงาน --"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">ระบบ NVR/VMS ที่บันทึก</label>
          <SearchableSelect
            value={form.nvr_vms_id}
            onChange={(v) => setForm(prev => ({ ...prev, nvr_vms_id: v }))}
            options={nvrVmsApi.data.map(n => ({ value: String(n.id), label: n.name }))}
            placeholder="-- ไม่ระบุ --"
            emptyLabel="-- ไม่ระบุ --"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-400">โครงการจัดซื้อที่มา</label>
        <SearchableSelect
          value={form.project_id}
          onChange={(v) => setForm(prev => ({ ...prev, project_id: v }))}
          options={projectsApi.data.map(p => ({ value: String(p.id), label: p.name }))}
          placeholder="-- ไม่ระบุ --"
          emptyLabel="-- ไม่ระบุ --"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">ละติจูด (Latitude)<RequiredMark /></label>
          <input type="number" step="0.000001" value={form.latitude} onChange={setField('latitude')} placeholder="14.5272" className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">ลองจิจูด (Longitude)<RequiredMark /></label>
          <input type="number" step="0.000001" value={form.longitude} onChange={setField('longitude')} placeholder="100.9125" className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" required />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">ความสูง (m)</label>
          <input type="number" step="0.1" value={form.elevation_m} onChange={setField('elevation_m')} className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">ทิศ (Azimuth °)</label>
          <input type="number" step="1" value={form.azimuth_deg} onChange={setField('azimuth_deg')} className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">มุมมอง (°)</label>
          <input type="number" step="1" value={form.view_angle_deg} onChange={setField('view_angle_deg')} className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">ระยะมองเห็น (m)</label>
          <input type="number" step="1" value={form.view_range_m} onChange={setField('view_range_m')} className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">จุดติดตั้ง<RequiredMark /></label>
          <SearchableSelect
            value={form.installation_site_id}
            onChange={(v) => setForm(prev => ({ ...prev, installation_site_id: v }))}
            options={installationSitesApi.data.map((s: any) => ({ value: s.id, label: s.name_th }))}
            placeholder="-- เลือกจุดติดตั้ง --"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">ประเภทจุดติดตั้ง<RequiredMark /></label>
          <SearchableSelect
            value={form.install_point_type_id}
            onChange={(v) => setForm(prev => ({ ...prev, install_point_type_id: v }))}
            options={installPointTypesApi.data.map((t: any) => ({ value: t.id, label: t.name_th }))}
            placeholder="-- เลือกประเภทจุดติดตั้ง --"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">รายละเอียดประเภทกล้อง</label>
          <SearchableSelect
            value={form.camera_function_type_id}
            onChange={(v) => setForm(prev => ({ ...prev, camera_function_type_id: v }))}
            options={cameraFunctionTypesApi.data.map((t: any) => ({ value: t.id, label: t.name_th }))}
            placeholder="-- ไม่ระบุ --"
            emptyLabel="-- ไม่ระบุ --"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">จุดมุ่งหมายหลัก<RequiredMark /></label>
          <SearchableSelect
            value={form.purpose_type}
            onChange={(v) => setForm(prev => ({ ...prev, purpose_type: v }))}
            options={PURPOSE_TYPES}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-400">สถานะ<RequiredMark /></label>
        <SearchableSelect
          value={form.status}
          onChange={(v) => setForm(prev => ({ ...prev, status: v }))}
          options={STATUS_OPTIONS}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">วันที่ติดตั้ง</label>
          <input type="date" value={form.install_date} onChange={setField('install_date')} className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">วันหมดประกัน</label>
          <input type="date" value={form.warranty_expiry} onChange={setField('warranty_expiry')} className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-400">ลิงก์สตรีมภาพ (Stream URL)</label>
        <input type="text" value={form.stream_url} onChange={setField('stream_url')} placeholder="rtsp://... หรือ webrtc://..." className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">ภาพถ่ายจุดติดตั้ง (URL)</label>
          <input type="text" value={form.photo_site_url} onChange={setField('photo_site_url')} className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">ภาพตัวอย่างมุมกล้อง (URL)</label>
          <input type="text" value={form.photo_view_url} onChange={setField('photo_view_url')} className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 text-white animate-in fade-in duration-300">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h3 className="font-extrabold text-lg text-white">ทะเบียนจัดการสินทรัพย์กล้องวงจรปิด</h3>
          <p className="text-xs text-slate-400 mt-1">เพิ่ม แก้ไข และวิเคราะห์ข้อมูลกล้องทั้งหมดในโครงการ (ข้อมูลตรงตาม Master Data ทะเบียนสินทรัพย์กล้อง)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleExport('xlsx')}
            disabled={isExporting}
            className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 border border-white/10 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> {isExporting ? 'กำลังส่งออก...' : 'ส่งออก Excel'}
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 border border-white/10 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> {isExporting ? 'กำลังส่งออก...' : 'ส่งออก CSV'}
          </button>
          {canEdit && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleImportFileSelected}
                className="hidden"
              />
              <button
                onClick={() => importInputRef.current?.click()}
                disabled={isImporting}
                className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 border border-white/10 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4" /> {isImporting ? 'กำลังนำเข้า...' : 'นำเข้าไฟล์ (CSV/Excel)'}
              </button>
              <button
                onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                className="bg-gradient-to-r from-[#005BAC] to-[#00AEEF] hover:opacity-95 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-sky-500/20 cursor-pointer transition-all duration-200 hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" /> ลงทะเบียนกล้องใหม่
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-[#121a2f] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-black/20 border border-white/5 rounded-xl px-4 py-2 w-full max-w-md items-center gap-2">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="ค้นหาด้วยไอดี หรือสถานที่ติดตั้ง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-xs text-white focus:outline-none w-full"
            />
          </div>
          <div className="w-48">
            <SearchableSelect
              value={filterLocalGovId}
              onChange={setFilterLocalGovId}
              options={localGovsApi.data.map(g => ({ value: g.id, label: g.name_th }))}
              placeholder="ทุกหน่วยงาน"
              emptyLabel="ทุกหน่วยงาน"
            />
          </div>
          <div className="w-40">
            <SearchableSelect
              value={filterStatus}
              onChange={setFilterStatus}
              options={STATUS_OPTIONS}
              placeholder="ทุกสถานะ"
              emptyLabel="ทุกสถานะ"
            />
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[11px] text-slate-500">เรียงตาม</span>
            <div className="w-44">
              <SearchableSelect
                value={sortField}
                onChange={(v) => setSortField(v as 'address_ref' | 'created_at')}
                options={SORT_FIELD_OPTIONS}
              />
            </div>
            <button
              onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
              title={sortDir === 'asc' ? 'น้อยไปมาก' : 'มากไปน้อย'}
              className="bg-white/5 hover:bg-white/10 text-slate-300 p-2.5 rounded-lg border border-white/10 cursor-pointer"
            >
              {sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-black/40 text-slate-400 border-b border-white/10">
                <th className="p-4">รหัสกล้อง (Asset ID)</th>
                <th className="p-4">เลขครุภัณฑ์</th>
                <th className="p-4">สถานที่ติดตั้ง</th>
                <th className="p-4">หน่วยงาน (อปท.)</th>
                <th className="p-4">MAC Address</th>
                <th className="p-4">ประเภทจุดติดตั้ง / วัตถุประสงค์</th>
                <th className="p-4">หมดประกัน</th>
                <th className="p-4">สถานะ</th>
                {canEdit && <th className="p-4 text-right">เครื่องมือ</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedCameras.map(c => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="p-4 font-bold text-[#00AEEF]">{c.id}</td>
                  <td className="p-4 text-slate-400 font-mono">{c.asset_registry_no || '-'}</td>
                  <td className="p-4 font-semibold text-slate-200">{c.address_ref}</td>
                  <td className="p-4 text-slate-400">{localGovName(c.local_gov_id)}</td>
                  <td className="p-4 text-slate-500 font-mono">{c.mac_address || '-'}</td>
                  <td className="p-4 text-slate-400">{installPointTypeName(c.install_point_type_id)} / {c.purpose_type || '-'}</td>
                  <td className="p-4 text-slate-400">{c.warranty_expiry || '-'}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                      c.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      c.status === 'OFFLINE' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        c.status === 'ONLINE' ? 'bg-emerald-400' :
                        c.status === 'OFFLINE' ? 'bg-red-400' : 'bg-amber-400'
                      }`}></span>
                      {c.status}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="p-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="bg-white/5 hover:bg-white/10 text-slate-300 py-1.5 px-3 rounded-lg border border-white/10 cursor-pointer font-bold transition text-[11px]"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => setDeletingCamId(c.id)}
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

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>แสดง</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-black/30 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none cursor-pointer"
            >
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>รายการ จากทั้งหมด {filteredCameras.length} รายการ</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={clampedPage <= 1}
              className="bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 p-2 rounded-lg border border-white/10 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-slate-400">หน้า {clampedPage} จาก {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={clampedPage >= totalPages}
              className="bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 p-2 rounded-lg border border-white/10 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ADD CAMERA MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/75 z-[15000] flex items-center justify-center backdrop-blur-md">
          <div className="bg-[#0f1525] border border-[#00f2fe]/20 rounded-2xl w-[560px] overflow-hidden shadow-2xl p-6 text-white animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/5">
              <h4 className="font-bold text-sm text-[#00AEEF]">ลงทะเบียนกล้อง CCTV ใหม่</h4>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer">&times;</button>
            </div>
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              {renderFormFields(false)}
              <div className="flex gap-3 justify-end mt-4 pt-3 border-t border-white/5">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="bg-white/5 hover:bg-white/10 text-slate-400 py-2 px-4 rounded-lg text-xs cursor-pointer">ยกเลิก</button>
                <button type="submit" className="bg-gradient-to-r from-[#005BAC] to-[#00AEEF] text-white py-2 px-5 rounded-lg text-xs font-bold cursor-pointer">ลงทะเบียน</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CAMERA MODAL */}
      {editingCam && (
        <div className="fixed inset-0 bg-black/75 z-[15000] flex items-center justify-center backdrop-blur-md">
          <div className="bg-[#0f1525] border border-[#00f2fe]/20 rounded-2xl w-[560px] overflow-hidden shadow-2xl p-6 text-white animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/5">
              <h4 className="font-bold text-sm text-[#00AEEF]">แก้ไขข้อมูลกล้อง {editingCam.id}</h4>
              <button onClick={() => setEditingCam(null)} className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer">&times;</button>
            </div>
            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
              {renderFormFields(true)}
              <div className="flex gap-3 justify-end mt-4 pt-3 border-t border-white/5">
                <button type="button" onClick={() => setEditingCam(null)} className="bg-white/5 hover:bg-white/10 text-slate-400 py-2 px-4 rounded-lg text-xs cursor-pointer">ยกเลิก</button>
                <button type="submit" className="bg-[#005BAC] text-white py-2 px-5 rounded-lg text-xs font-bold cursor-pointer">บันทึกการแก้ไข</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT SUMMARY MODAL */}
      {importSummary && (
        <div className="fixed inset-0 bg-black/75 z-[15000] flex items-center justify-center backdrop-blur-md">
          <div className="bg-[#0f1525] border border-[#00f2fe]/20 rounded-2xl w-[520px] overflow-hidden shadow-2xl p-6 text-white animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
              <h4 className="font-bold text-sm text-[#00AEEF]">ผลการนำเข้าข้อมูลกล้องแบบชุด</h4>
              <button onClick={() => setImportSummary(null)} className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer">&times;</button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-black/30 rounded-xl p-3 text-center">
                <div className="text-lg font-extrabold text-slate-200">{importSummary.total_rows}</div>
                <div className="text-[10px] text-slate-500">แถวทั้งหมด</div>
              </div>
              <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
                <div className="text-lg font-extrabold text-emerald-400">{importSummary.imported_count}</div>
                <div className="text-[10px] text-slate-500">นำเข้าสำเร็จ</div>
              </div>
              <div className="bg-red-500/10 rounded-xl p-3 text-center">
                <div className="text-lg font-extrabold text-red-400">{importSummary.failed_count}</div>
                <div className="text-[10px] text-slate-500">ล้มเหลว</div>
              </div>
            </div>
            {importSummary.errors?.length > 0 && (
              <div className="max-h-[240px] overflow-y-auto border-t border-white/5 pt-3">
                <table className="w-full text-[11px] text-left">
                  <thead>
                    <tr className="text-slate-400">
                      <th className="p-2">แถว</th>
                      <th className="p-2">คอลัมน์</th>
                      <th className="p-2">ข้อผิดพลาด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importSummary.errors.map((err: any, idx: number) => (
                      <tr key={idx} className="border-b border-white/5">
                        <td className="p-2 font-bold text-slate-300">{err.row}</td>
                        <td className="p-2 text-slate-400">{err.column}</td>
                        <td className="p-2 text-red-400">{err.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end pt-4 mt-2 border-t border-white/5">
              <button onClick={() => setImportSummary(null)} className="bg-white/5 hover:bg-white/10 text-slate-400 py-2 px-4 rounded-lg text-xs cursor-pointer">ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingCamId && (
        <div className="fixed inset-0 bg-black/75 z-[15000] flex items-center justify-center backdrop-blur-md">
          <div className="bg-[#0f1525] border border-red-500/20 rounded-2xl w-[400px] overflow-hidden shadow-2xl p-6 text-white animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertOctagon className="w-6 h-6 shrink-0 text-red-500" />
              <h4 className="font-bold text-sm">ยืนยันการลบกล้องวงจรปิด</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              คุณแน่ใจหรือไม่ที่จะลบกล้องรหัส <strong className="text-red-400">{deletingCamId}</strong> ออกจากทะเบียนกลาง? การกระทำนี้ไม่สามารถเรียกคืนข้อมูลได้
            </p>
            <div className="flex gap-3 justify-end pt-3 border-t border-white/5">
              <button onClick={() => setDeletingCamId(null)} className="bg-white/5 hover:bg-white/10 text-slate-400 py-2 px-4 rounded-lg text-xs cursor-pointer">ยกเลิก</button>
              <button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white py-2 px-5 rounded-lg text-xs font-bold cursor-pointer">ยืนยันลบถาวร</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
