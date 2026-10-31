import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, AlertOctagon, Download, Upload, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Trash2, Loader2, RefreshCw, X, AlertTriangle, RotateCcw, CheckCircle2, FileText, Check } from 'lucide-react';
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

export const STATUS_LABELS: Record<string, string> = {
  ONLINE: 'พร้อมใช้งาน (ONLINE)',
  OFFLINE: 'ชำรุด/ขัดข้อง (OFFLINE)',
  MAINTENANCE: 'อยู่ระหว่างซ่อม (MAINTENANCE)',
  PENDING_INSTALL: 'รอติดตั้ง (PENDING INSTALL)',
  REMOVED: 'ปลดประจำการ/ลบแล้ว (REMOVED)',
};

export const STATUS_SHORT_LABELS: Record<string, string> = {
  ONLINE: 'พร้อมใช้งาน',
  OFFLINE: 'ชำรุด/ขัดข้อง',
  MAINTENANCE: 'อยู่ระหว่างซ่อม',
  PENDING_INSTALL: 'รอติดตั้ง',
  REMOVED: 'ลบแล้ว',
};

const STATUS_OPTIONS = [
  { value: 'ONLINE', label: 'พร้อมใช้งาน (ONLINE)' },
  { value: 'OFFLINE', label: 'ชำรุด/ขัดข้อง (OFFLINE)' },
  { value: 'MAINTENANCE', label: 'อยู่ระหว่างซ่อม (MAINTENANCE)' },
  { value: 'PENDING_INSTALL', label: 'รอติดตั้ง (PENDING INSTALL)' },
  { value: 'REMOVED', label: 'ปลดประจำการ/ลบแล้ว (REMOVED)' },
];

// แท็บ "ใช้งานอยู่" ไม่รวมสถานะ REMOVED อยู่แล้ว จึงตัดออกจากตัวกรองสถานะเพื่อไม่ให้ซ้ำซ้อนกับแท็บ
const ACTIVE_TAB_STATUS_OPTIONS = STATUS_OPTIONS.filter(o => o.value !== 'REMOVED');

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const SORT_FIELD_OPTIONS = [
  { value: 'address_ref', label: 'ชื่อ/สถานที่ติดตั้ง' },
  { value: 'created_at', label: 'วันที่เพิ่ม' },
];

export default function Cameras({ currentUser, cameras, refetchCameras, addToast }: CamerasProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'removed'>('active');
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
  const [selectedCameraIds, setSelectedCameraIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState('ONLINE');
  const [isBulkStatusUpdating, setIsBulkStatusUpdating] = useState(false);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<{ type: 'single'; id: string } | { type: 'bulk'; ids: string[] } | null>(null);
  const [permanentConfirmInput, setPermanentConfirmInput] = useState('');
  const [isPermanentDeleting, setIsPermanentDeleting] = useState(false);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const nvrVmsApi = useNvrVmsSystems(form.local_gov_id || undefined);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportPreviewing, setIsImportPreviewing] = useState(false);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [importPreviewData, setImportPreviewData] = useState<{
    total_rows: number;
    imported_count: number;
    failed_count: number;
    errors: Array<{ row: number; column: string; error: string }>;
    preview_items?: Array<{
      row: number;
      id?: string;
      local_gov_id?: string;
      local_gov_name?: string;
      brand?: string;
      model?: string;
      lat?: number;
      lng?: number;
      address_ref?: string;
      status?: string;
      is_existing: boolean;
      is_valid: boolean;
      error_message?: string;
    }>;
  } | null>(null);
  const [previewFilterTab, setPreviewFilterTab] = useState<'ALL' | 'VALID' | 'ERROR'>('ALL');
  const [previewSearch, setPreviewSearch] = useState('');
  const [isSingleDeleting, setIsSingleDeleting] = useState(false);
  const [opProgress, setOpProgress] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    percent: number;
    statusText: string;
    type?: 'import' | 'delete' | 'permanent_delete';
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    percent: 0,
    statusText: '',
  });
  const [importSummary, setImportSummary] = useState<any>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const canEdit = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'DISTRICT_ADMIN' || currentUser.role === 'LOCAL_GOV_STAFF';

  const catalogLabel = (cat: any) => {
    const brand = brandsApi.data.find(b => b.id === cat.brand_id);
    return `${brand ? brand.name + ' ' : ''}${cat.model} (#${cat.id})`;
  };

  const filteredCameras = useMemo(() => {
    const filtered = cameras.filter(c =>
      (activeTab === 'removed' ? c.status === 'REMOVED' : c.status !== 'REMOVED') &&
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
  }, [cameras, activeTab, searchQuery, filterLocalGovId, filterStatus, sortField, sortDir]);

  const removedCount = useMemo(() => cameras.filter(c => c.status === 'REMOVED').length, [cameras]);
  const activeCount = cameras.length - removedCount;

  const totalPages = Math.max(1, Math.ceil(filteredCameras.length / pageSize));
  const clampedPage = Math.min(currentPage, totalPages);
  const paginatedCameras = useMemo(
    () => filteredCameras.slice((clampedPage - 1) * pageSize, clampedPage * pageSize),
    [filteredCameras, clampedPage, pageSize]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, filterLocalGovId, filterStatus, sortField, sortDir, pageSize]);

  const setField = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }));
  };

  const resetForm = () => setForm(emptyForm);

  const buildPayload = () => ({
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
    if (!form.address_ref || !form.local_gov_id || !form.latitude || !form.longitude) {
      addToast('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (อปท., สถานที่, พิกัด)', 'error');
      return;
    }
    try {
      const res = await apiClient.post('/cameras', buildPayload());
      addToast(`ลงทะเบียนกล้อง ${res.data.id} สำเร็จ`, 'success');
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

  const currentPageCameraIds = useMemo(() => paginatedCameras.map(c => c.id), [paginatedCameras]);
  const isAllCurrentPageSelected = currentPageCameraIds.length > 0 && currentPageCameraIds.every(id => selectedCameraIds.includes(id));
  const isSomeCurrentPageSelected = currentPageCameraIds.some(id => selectedCameraIds.includes(id)) && !isAllCurrentPageSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeCurrentPageSelected;
    }
  }, [isSomeCurrentPageSelected]);

  useEffect(() => {
    setSelectedCameraIds([]);
  }, [activeTab]);

  const toggleSelectOne = (id: string) => {
    setSelectedCameraIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllCurrentPage = () => {
    if (isAllCurrentPageSelected) {
      setSelectedCameraIds(prev => prev.filter(id => !currentPageCameraIds.includes(id)));
    } else {
      setSelectedCameraIds(prev => Array.from(new Set([...prev, ...currentPageCameraIds])));
    }
  };

  const selectAllFiltered = () => {
    setSelectedCameraIds(filteredCameras.map(c => c.id));
  };

  const clearSelection = () => {
    setSelectedCameraIds([]);
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedCameraIds.length === 0) return;
    setIsBulkStatusUpdating(true);
    try {
      const res = await apiClient.post('/cameras/bulk-status', {
        ids: selectedCameraIds,
        status: bulkTargetStatus,
      });
      addToast(res.data?.message || `ปรับเปลี่ยนสถานะกล้องสำเร็จ ${res.data?.updated_count || selectedCameraIds.length} รายการ`, 'success');
      setSelectedCameraIds([]);
      setIsBulkStatusModalOpen(false);
      refetchCameras();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'ปรับเปลี่ยนสถานะกล้องแบบกลุ่มไม่สำเร็จ'), 'error');
    } finally {
      setIsBulkStatusUpdating(false);
    }
  };

  const runProgress = (
    initialTitle: string,
    initialSubtitle: string,
    type: 'import' | 'delete' | 'permanent_delete',
    stages: Array<{ targetPct: number; text: string }>
  ) => {
    let currentPct = 12;
    setOpProgress({
      isOpen: true,
      title: initialTitle,
      subtitle: initialSubtitle,
      percent: 12,
      statusText: stages[0]?.text || 'กำลังดำเนินการ...',
      type,
    });

    let stageIdx = 0;
    const interval = setInterval(() => {
      if (stageIdx < stages.length) {
        const currentStage = stages[stageIdx];
        if (currentPct < currentStage.targetPct) {
          currentPct += Math.min(3, currentStage.targetPct - currentPct);
          setOpProgress(prev => ({
            ...prev,
            percent: currentPct,
            statusText: currentStage.text,
          }));
        } else {
          stageIdx++;
        }
      }
    }, 100);

    return {
      finish: async (successText: string) => {
        clearInterval(interval);
        setOpProgress(prev => ({
          ...prev,
          percent: 100,
          statusText: successText || 'เสร็จสมบูรณ์ 100%',
        }));
        await new Promise(r => setTimeout(r, 400));
        setOpProgress(prev => ({ ...prev, isOpen: false }));
      },
      error: () => {
        clearInterval(interval);
        setOpProgress(prev => ({ ...prev, isOpen: false }));
      },
    };
  };

  const handleBulkDelete = async () => {
    if (selectedCameraIds.length === 0) return;
    setIsBulkDeleting(true);
    const count = selectedCameraIds.length;
    const progress = runProgress(
      'กำลังย้ายกล้องไปที่แท็บลบแล้ว',
      `${count} รายการที่เลือก`,
      'delete',
      [
        { targetPct: 40, text: 'กำลังตรวจสอบรายการกล้องที่เลือก...' },
        { targetPct: 75, text: 'กำลังปรับเปลี่ยนสถานะกล้องในระบบ...' },
        { targetPct: 92, text: 'กำลังบันทึกประวัติการทำงาน (Audit Log)...' },
      ]
    );

    try {
      const res = await apiClient.post('/cameras/bulk-delete', { ids: selectedCameraIds });
      await progress.finish('ย้ายกล้องไปที่แท็บลบแล้วสำเร็จ 100%!');
      addToast(res.data?.message || `ลบกล้อง ${res.data?.deleted_count || count} รายการสำเร็จ`, 'success');
      setSelectedCameraIds([]);
      setIsBulkDeleteModalOpen(false);
      refetchCameras();
    } catch (err: any) {
      progress.error();
      addToast(extractErrorMessage(err, 'ลบกล้องแบบกลุ่มไม่สำเร็จ'), 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCamId) return;
    setIsSingleDeleting(true);
    const camId = deletingCamId;
    const progress = runProgress(
      'กำลังลบข้อมูลกล้อง',
      `รหัสกล้อง: ${camId}`,
      'delete',
      [
        { targetPct: 45, text: 'กำลังปรับสถานะเป็นลบแล้ว (REMOVED)...' },
        { targetPct: 85, text: 'กำลังจัดเก็บบันทึกประวัติการทำงาน...' },
      ]
    );

    try {
      await apiClient.delete(`/cameras/${camId}`);
      await progress.finish('ลบข้อมูลกล้องย้ายไปแท็บลบแล้วสำเร็จ 100%!');
      addToast(`ลบกล้อง ${camId} ย้ายไปแท็บลบแล้ว`, 'success');
      setDeletingCamId(null);
      refetchCameras();
    } catch (err: any) {
      progress.error();
      addToast(extractErrorMessage(err, 'ลบกล้องไม่สำเร็จ'), 'error');
    } finally {
      setIsSingleDeleting(false);
    }
  };

  const handleOpenPermanentDeleteSingle = (id: string) => {
    setPermanentDeleteTarget({ type: 'single', id });
    setPermanentConfirmInput('');
  };

  const handleOpenPermanentDeleteBulk = () => {
    if (selectedCameraIds.length === 0) return;
    setPermanentDeleteTarget({ type: 'bulk', ids: [...selectedCameraIds] });
    setPermanentConfirmInput('');
  };

  const handleConfirmPermanentDelete = async () => {
    if (!permanentDeleteTarget) return;
    const trimmed = permanentConfirmInput.trim();
    if (trimmed !== 'ลบถาวร' && trimmed.toUpperCase() !== 'DELETE') {
      addToast("กรุณาพิมพ์คำว่า 'ลบถาวร' หรือ 'DELETE' เพื่อยืนยัน", 'warning');
      return;
    }

    setIsPermanentDeleting(true);
    const isBulk = permanentDeleteTarget.type === 'bulk';
    const count = isBulk ? permanentDeleteTarget.ids.length : 1;
    const label = isBulk ? `${count} รายการที่เลือก` : `รหัสกล้อง: ${permanentDeleteTarget.id}`;

    const progress = runProgress(
      'กำลังลบข้อมูลกล้องแบบถาวร',
      label,
      'permanent_delete',
      [
        { targetPct: 35, text: 'กำลังตรวจสอบสิทธิ์ความปลอดภัยการลบถาวร...' },
        { targetPct: 70, text: 'กำลังลบข้อมูลกล้องและข้อมูลเชื่อมโยงออกจากฐานข้อมูล...' },
        { targetPct: 92, text: 'กำลังบันทึกประวัติความปลอดภัย (Hard Delete Audit)...' },
      ]
    );

    try {
      if (permanentDeleteTarget.type === 'single') {
        await apiClient.delete(`/cameras/${permanentDeleteTarget.id}/permanent`, {
          params: { confirm_text: trimmed }
        });
        await progress.finish('ลบข้อมูลกล้องแบบถาวรเรียบร้อยแล้ว!');
        addToast(`ลบข้อมูลกล้อง ${permanentDeleteTarget.id} แบบถาวรเรียบร้อยแล้ว`, 'success');
      } else {
        const res = await apiClient.post('/cameras/bulk-permanent-delete', {
          ids: permanentDeleteTarget.ids,
          confirm_text: trimmed
        });
        await progress.finish('ลบข้อมูลกล้องแบบถาวรเรียบร้อยแล้ว!');
        addToast(res.data?.message || `ลบข้อมูลกล้องแบบถาวรสำเร็จ ${res.data?.deleted_count || count} รายการ`, 'success');
        setSelectedCameraIds([]);
      }
      setPermanentDeleteTarget(null);
      setPermanentConfirmInput('');
      refetchCameras();
    } catch (err: any) {
      progress.error();
      addToast(extractErrorMessage(err, 'ลบข้อมูลกล้องแบบถาวรไม่สำเร็จ'), 'error');
    } finally {
      setIsPermanentDeleting(false);
    }
  };

  const handleRestoreSingle = async (camId: string) => {
    try {
      const res = await apiClient.post('/cameras/bulk-status', {
        ids: [camId],
        status: 'ONLINE',
      });
      addToast(res.data?.message || `กู้คืนสถานะกล้อง ${camId} เป็นพร้อมใช้งานสำเร็จ`, 'success');
      refetchCameras();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'กู้คืนสถานะกล้องไม่สำเร็จ'), 'error');
    }
  };

  const handleBulkRestore = async () => {
    if (selectedCameraIds.length === 0) return;
    try {
      const res = await apiClient.post('/cameras/bulk-status', {
        ids: selectedCameraIds,
        status: 'ONLINE',
      });
      addToast(res.data?.message || `กู้คืนสถานะกล้อง ${selectedCameraIds.length} รายการเป็นพร้อมใช้งานแล้ว`, 'success');
      setSelectedCameraIds([]);
      refetchCameras();
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'กู้คืนสถานะกล้องไม่สำเร็จ'), 'error');
    }
  };

  const openEdit = (c: any) => {
    setEditingCam(c);
    setForm({
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

  const handleDownloadTemplate = async (format: 'csv' | 'xlsx' = 'csv') => {
    try {
      const res = await apiClient.get('/cameras/template', {
        params: { format },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `sri_cctv_template.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast(`ดาวน์โหลด Template (${format.toUpperCase()}) สำเร็จ`, 'success');
    } catch (err: any) {
      if (format === 'xlsx') {
        addToast(extractErrorMessage(err, 'ดาวน์โหลด Template Excel ไม่สำเร็จ'), 'error');
        return;
      }
      // Fallback: download client-side template if backend request fails
      const sampleCsv = `id,serial_number,asset_registry_no,mac_address,private_ip,public_ip,brand,model,category,local_gov_id,district_id,latitude,longitude,elevation_m,azimuth_deg,view_angle_deg,view_range_m,address_ref,installation_site_id,install_point_type_id,camera_function_type_id,purpose_type,status,nvr_name,project_fiscal_year,project_name,install_date,warranty_expiry,stream_url\nSRI-1901-190101-0001,HK-89124-XYZ,ครภ.518-68-0001,E0:50:8B:1A:2C:4F,192.168.1.10,118.172.45.67,Hikvision,DS-2CD21,BULLET,5190101,1901,14.527200,100.912500,3.0,120.0,90.0,30.0,สี่แยกตลาดโต้รุ่ง สระบุรี เสาไฟฟ้าหน้าเซเว่น,ROAD_INTERSECTION,AREA_OVERVIEW,GENERAL,TRAFFIC,ONLINE,NVR-Municipal-Office-1,2568,โครงการติดตั้งกล้องเขตเศรษฐกิจชั้นใน,2024-01-15,2028-12-31,rtsp://admin:pass@192.168.1.10:554/live\n,DH-99120-ABC,ครภ.518-68-0002,F4:4E:05:AA:BB:CC,192.168.1.11,118.172.45.68,Dahua,DH-IPC,PTZ,เทศบาลเมืองสระบุรี,1901,14.532100,100.915200,3.5,45.0,85.0,45.0,หน้า สภ.เมืองสระบุรี เสาทางเข้าหลัก,GOVERNMENT_AGENCY,ENTRANCE_EXIT,PUBLIC_AREA_VIEW,SAFETY,ONLINE,NVR-Municipal-Office-1,2568,โครงการติดตั้งกล้องเขตเศรษฐกิจชั้นใน,2024-02-01,2028-12-31,`;
      const blob = new Blob(['\uFEFF' + sampleCsv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sri_cctv_template.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('ดาวน์โหลด Template (สำรอง) เรียบร้อย', 'success');
    }
  };


  const filteredPreviewItems = useMemo(() => {
    if (!importPreviewData?.preview_items) return [];
    return importPreviewData.preview_items.filter(item => {
      if (previewFilterTab === 'VALID' && !item.is_valid) return false;
      if (previewFilterTab === 'ERROR' && item.is_valid) return false;
      if (previewSearch.trim()) {
        const q = previewSearch.toLowerCase();
        const matchId = (item.id || '').toLowerCase().includes(q);
        const matchGov = (item.local_gov_name || '').toLowerCase().includes(q) || (item.local_gov_id || '').toLowerCase().includes(q);
        const matchBrand = (item.brand || '').toLowerCase().includes(q) || (item.model || '').toLowerCase().includes(q);
        const matchAddr = (item.address_ref || '').toLowerCase().includes(q);
        const matchErr = (item.error_message || '').toLowerCase().includes(q);
        return matchId || matchGov || matchBrand || matchAddr || matchErr;
      }
      return true;
    });
  }, [importPreviewData, previewFilterTab, previewSearch]);

  const handleImportFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImportFile(file);
    setIsImportPreviewing(true);

    const progress = runProgress(
      'กำลังตรวจสอบโครงสร้างไฟล์นำเข้า',
      file.name,
      'import',
      [
        { targetPct: 35, text: 'กำลังอ่านไฟล์และตรวจสอบคอลัมน์...' },
        { targetPct: 65, text: 'กำลังตรวจสอบหน่วยงานเจ้าของและพิกัดแผนที่...' },
        { targetPct: 88, text: 'กำลังสร้างตารางจำลองสรุปผลพรีวิว...' },
      ]
    );

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/cameras/import?preview=true', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) {
            const upPct = Math.round((evt.loaded * 30) / evt.total);
            setOpProgress(p => ({
              ...p,
              percent: Math.max(p.percent, upPct),
              statusText: upPct < 30 ? `กำลังอัปโหลดไฟล์ (${Math.round((evt.loaded * 100) / evt.total)}%)...` : 'อัปโหลดเสร็จสิ้น กำลังตรวจสอบโครงสร้าง...',
            }));
          }
        }
      });
      await progress.finish('ตรวจสอบข้อมูลสำเร็จ!');
      setImportPreviewData(res.data);
      setPreviewFilterTab('ALL');
      setPreviewSearch('');
    } catch (err: any) {
      progress.error();
      addToast(extractErrorMessage(err, 'ไม่สามารถเปิดอ่านไฟล์หรือตรวจสอบข้อมูลได้'), 'error');
      setPendingImportFile(null);
    } finally {
      setIsImportPreviewing(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const handleConfirmImportSubmit = async () => {
    if (!pendingImportFile) return;
    setIsSubmittingImport(true);

    const count = importPreviewData?.imported_count || 0;
    const progress = runProgress(
      'กำลังนำเข้าข้อมูลสู่ฐานข้อมูล',
      `${count} รายการที่ผ่านการตรวจสอบ`,
      'import',
      [
        { targetPct: 30, text: 'กำลังเตรียมชุดข้อมูลและตรวจสอบรุ่น Master Data...' },
        { targetPct: 65, text: 'กำลังบันทึกข้อมูลกล้องและสร้างรหัส Asset ID...' },
        { targetPct: 90, text: 'กำลังบันทึกประวัติการทำงาน (Audit Log)...' },
      ]
    );

    try {
      const formData = new FormData();
      formData.append('file', pendingImportFile);
      const res = await apiClient.post('/cameras/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await progress.finish('บันทึกข้อมูลลงฐานข้อมูลสำเร็จ 100%!');
      setImportSummary(res.data);
      setImportPreviewData(null);
      setPendingImportFile(null);
      if (res.data.imported_count > 0) refetchCameras();
      addToast(
        res.data.failed_count === 0
          ? `นำเข้าข้อมูลกล้องสำเร็จ ${res.data.imported_count} รายการ`
          : `นำเข้าสำเร็จ ${res.data.imported_count} รายการ, ล้มเหลว ${res.data.failed_count} รายการ`,
        res.data.failed_count === 0 ? 'success' : 'warning'
      );
    } catch (err: any) {
      progress.error();
      addToast(extractErrorMessage(err, 'นำเข้าข้อมูลไม่สำเร็จ'), 'error');
    } finally {
      setIsSubmittingImport(false);
    }
  };

  const renderFormFields = () => (
    <div className="flex flex-col gap-4 max-h-[65vh] overflow-y-auto pr-1">
      {/* 1. รหัสกล้อง (Asset ID) แสดงสถานะ auto-generate */}
      <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
        <label className="text-xs font-bold text-[#00AEEF] flex items-center justify-between">
          <span>รหัสกล้อง (Asset ID)</span>
          <span className="text-[10px] font-normal text-sky-300">
            {editingCam ? 'โหมดแก้ไข (อ้างอิงรหัสเดิม)' : 'ระบบสร้างรันเลขอัตโนมัติตามหน่วยงานเจ้าของ (ไม่ต้องกรอก)'}
          </span>
        </label>
        <input
          type="text"
          value={editingCam ? editingCam.id : 'ระบบจะสร้างรันเลขอัตโนมัติ (เช่น SRI-1901-190101-0001) โดยใช้ข้อมูลหน่วยงานเจ้าของ'}
          disabled
          className="bg-black/20 border border-white/10 rounded-lg p-2.5 text-xs text-sky-200 cursor-not-allowed opacity-80"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">หมายเลขซีเรียล</label>
          <input type="text" value={form.serial_number} onChange={setField('serial_number')} placeholder="HK-99120-X" className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#00AEEF] focus:outline-none" />
        </div>
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
            options={localGovsApi.data.map(g => ({ value: g.id, label: `${g.name_th} (${g.dla_code || g.id.replace("LA-", "")})` }))}
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
          <label className="text-xs text-slate-400">จุดติดตั้ง</label>
          <SearchableSelect
            value={form.installation_site_id}
            onChange={(v) => setForm(prev => ({ ...prev, installation_site_id: v }))}
            options={installationSitesApi.data.map((s: any) => ({ value: s.id, label: s.name_th }))}
            placeholder="-- ไม่ระบุ --"
            emptyLabel="-- ไม่ระบุ --"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400">ประเภทจุดติดตั้ง</label>
          <SearchableSelect
            value={form.install_point_type_id}
            onChange={(v) => setForm(prev => ({ ...prev, install_point_type_id: v }))}
            options={installPointTypesApi.data.map((t: any) => ({ value: t.id, label: t.name_th }))}
            placeholder="-- ไม่ระบุ --"
            emptyLabel="-- ไม่ระบุ --"
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
          <label className="text-xs text-slate-400">จุดมุ่งหมายหลัก</label>
          <SearchableSelect
            value={form.purpose_type}
            onChange={(v) => setForm(prev => ({ ...prev, purpose_type: v }))}
            options={PURPOSE_TYPES}
            placeholder="-- ไม่ระบุ (ความปลอดภัย) --"
            emptyLabel="-- ไม่ระบุ (ความปลอดภัย) --"
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
              <button
                onClick={() => handleDownloadTemplate('csv')}
                className="bg-sky-500/10 hover:bg-sky-500/20 text-[#00AEEF] font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 border border-[#00AEEF]/30 cursor-pointer transition hover:scale-[1.02]"
                title="ดาวน์โหลดไฟล์ Template CSV (คอลัมน์ตรงกับการส่งออก)"
              >
                <Download className="w-4 h-4 text-[#00AEEF]" /> Template CSV
              </button>
              <button
                onClick={() => handleDownloadTemplate('xlsx')}
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 border border-emerald-500/30 cursor-pointer transition hover:scale-[1.02]"
                title="ดาวน์โหลดไฟล์ Template Excel (พร้อมชีต Data Dictionary)"
              >
                <Download className="w-4 h-4 text-emerald-400" /> Template Excel
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleImportFileSelected}
                className="hidden"
              />
              <button
                onClick={() => importInputRef.current?.click()}
                disabled={isImportPreviewing}
                className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 border border-white/10 cursor-pointer disabled:opacity-50"
              >
                {isImportPreviewing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                    <span>กำลังตรวจสอบข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>นำเข้าไฟล์ (CSV/Excel)</span>
                  </>
                )}
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

      <div className="flex items-center gap-2 border-b border-white/10">
        <button
          onClick={() => { setActiveTab('active'); setFilterStatus(''); setSelectedCameraIds([]); }}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 -mb-px cursor-pointer transition ${
            activeTab === 'active' ? 'border-[#00AEEF] text-[#00AEEF]' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          ใช้งานอยู่ ({activeCount})
        </button>
        <button
          onClick={() => { setActiveTab('removed'); setFilterStatus(''); setSelectedCameraIds([]); }}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 -mb-px cursor-pointer transition ${
            activeTab === 'removed' ? 'border-red-400 text-red-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          ลบแล้ว ({removedCount})
        </button>
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
          {activeTab === 'active' && (
            <div className="w-40">
              <SearchableSelect
                value={filterStatus}
                onChange={setFilterStatus}
                options={ACTIVE_TAB_STATUS_OPTIONS}
                placeholder="ทุกสถานะ"
                emptyLabel="ทุกสถานะ"
              />
            </div>
          )}
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
                {canEdit && (
                  <th className="p-4 w-10 text-center">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      onChange={toggleSelectAllCurrentPage}
                      title={isAllCurrentPageSelected ? "ยกเลิกเลือกหน้านี้" : "เลือกทั้งหมดในหน้านี้"}
                      className="w-4 h-4 rounded border-slate-400 text-[#00AEEF] focus:ring-[#00AEEF] cursor-pointer accent-[#00AEEF]"
                    />
                  </th>
                )}
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
              {paginatedCameras.map(c => {
                const isSelected = selectedCameraIds.includes(c.id);
                return (
                  <tr
                    key={c.id}
                    className={`border-b border-white/5 transition ${
                      isSelected ? 'bg-[#00AEEF]/10 border-l-2 border-l-[#00AEEF]' : 'hover:bg-white/5'
                    }`}
                  >
                    {canEdit && (
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(c.id)}
                          className="w-4 h-4 rounded border-slate-400 text-[#00AEEF] focus:ring-[#00AEEF] cursor-pointer accent-[#00AEEF]"
                        />
                      </td>
                    )}
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
                        c.status === 'OFFLINE' ? 'bg-red-400' :
                        c.status === 'MAINTENANCE' ? 'bg-amber-400' :
                        c.status === 'PENDING_INSTALL' ? 'bg-blue-400' :
                        'bg-slate-400'
                      }`}></span>
                      {STATUS_SHORT_LABELS[c.status] || c.status}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="p-4 text-right flex justify-end items-center gap-1.5">
                      <button
                        onClick={() => openEdit(c)}
                        className="bg-white/5 hover:bg-white/10 text-slate-300 py-1.5 px-2.5 rounded-lg border border-white/10 cursor-pointer font-bold transition text-[11px]"
                      >
                        แก้ไข
                      </button>
                      {activeTab === 'active' ? (
                        <button
                          onClick={() => setDeletingCamId(c.id)}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 py-1.5 px-2.5 rounded-lg border border-red-500/20 cursor-pointer font-bold transition text-[11px]"
                        >
                          ลบ
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleRestoreSingle(c.id)}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 py-1.5 px-2.5 rounded-lg border border-emerald-500/20 cursor-pointer font-bold transition text-[11px] flex items-center gap-1"
                            title="กู้คืนสถานะเป็นพร้อมใช้งาน"
                          >
                            <RotateCcw className="w-3 h-3" /> กู้คืน
                          </button>
                          <button
                            onClick={() => handleOpenPermanentDeleteSingle(c.id)}
                            className="bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 py-1.5 px-2.5 rounded-lg border border-rose-500/30 cursor-pointer font-bold transition text-[11px] flex items-center gap-1"
                            title="ลบข้อมูลกล้องนี้ออกจากฐานข้อมูลอย่างถาวร"
                          >
                            <Trash2 className="w-3 h-3 text-rose-400" /> ลบถาวร
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
                );
              })}
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

      {/* FLOATING BATCH ACTION DOCK (Zero Layout Shift) */}
      {canEdit && selectedCameraIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1000] animate-in fade-in slide-in-from-bottom-5 duration-200 pointer-events-auto">
          <div className={`flex flex-wrap items-center gap-3.5 bg-[#091124]/95 border ${activeTab === 'removed' ? 'border-rose-500/40 shadow-rose-950/50' : 'border-[#00AEEF]/40 shadow-cyan-950/50'} backdrop-blur-xl rounded-2xl px-5 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.7)] text-white`}>
            <div className="flex items-center gap-2.5">
              <span className={`flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full ${activeTab === 'removed' ? 'bg-rose-600' : 'bg-[#00AEEF]'} text-white font-black text-xs shadow-md`}>
                {selectedCameraIds.length}
              </span>
              <span className="text-xs font-bold text-white whitespace-nowrap">
                เลือก <strong className={activeTab === 'removed' ? 'text-rose-400' : 'text-[#00AEEF]'}>{selectedCameraIds.length}</strong> รายการ {activeTab === 'removed' ? '(แท็บลบแล้ว)' : ''}
              </span>
              {selectedCameraIds.length < filteredCameras.length && (
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-xs text-sky-300 hover:text-white underline cursor-pointer font-medium ml-1 whitespace-nowrap"
                >
                  (เลือกทั้งหมด {filteredCameras.length} รายการ)
                </button>
              )}
            </div>

            <div className="h-5 w-px bg-white/20 mx-0.5 hidden sm:block" />

            <div className="flex items-center gap-2">
              {activeTab === 'active' ? (
                <>
                  <button
                    type="button"
                    onClick={() => { setBulkTargetStatus('ONLINE'); setIsBulkStatusModalOpen(true); }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#00AEEF] hover:bg-[#0096ce] text-white shadow-md shadow-[#00AEEF]/30 transition cursor-pointer whitespace-nowrap"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    เปลี่ยนสถานะ
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBulkDeleteModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/30 transition cursor-pointer whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    ลบที่เลือก
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleBulkRestore}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 transition cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    กู้คืนสถานะที่เลือก
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenPermanentDeleteBulk}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 transition cursor-pointer whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    ลบถาวรที่เลือก
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={clearSelection}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition cursor-pointer ml-1"
                title="ยกเลิกการเลือกทั้งหมด"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CAMERA MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/75 z-[15000] flex items-center justify-center backdrop-blur-md">
          <div className="bg-[#0f1525] border border-[#00f2fe]/20 rounded-2xl w-[560px] overflow-hidden shadow-2xl p-6 text-white animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/5">
              <h4 className="font-bold text-sm text-[#00AEEF]">ลงทะเบียนกล้อง CCTV ใหม่</h4>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer">&times;</button>
            </div>
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              {renderFormFields()}
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
              {renderFormFields()}
              <div className="flex gap-3 justify-end mt-4 pt-3 border-t border-white/5">
                <button type="button" onClick={() => setEditingCam(null)} className="bg-white/5 hover:bg-white/10 text-slate-400 py-2 px-4 rounded-lg text-xs cursor-pointer">ยกเลิก</button>
                <button type="submit" className="bg-[#005BAC] text-white py-2 px-5 rounded-lg text-xs font-bold cursor-pointer">บันทึกการแก้ไข</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT PREVIEW MODAL (สรุปตารางก่อน submit เข้าฐานข้อมูล) */}
      {importPreviewData && (
        <div className="fixed inset-0 bg-black/80 z-[15000] flex items-center justify-center backdrop-blur-md p-3 sm:p-5">
          <div className="bg-[#0c1222] border border-[#00f2fe]/30 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-white animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/30 border border-sky-500/30 flex items-center justify-center text-[#00AEEF]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-white flex items-center gap-2">
                    ตรวจสอบและสรุปข้อมูลการนำเข้ากล้อง
                    <span className="text-xs font-normal text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                      ก่อนบันทึกลงฐานข้อมูล
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    ไฟล์: <span className="text-slate-200 font-mono">{pendingImportFile?.name}</span>
                    {pendingImportFile?.size ? ` (${(pendingImportFile.size / 1024).toFixed(1)} KB)` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setImportPreviewData(null);
                  setPendingImportFile(null);
                }}
                disabled={isSubmittingImport}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition text-lg font-bold cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Container */}
            <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-900/80 border border-white/5 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-400">ข้อมูลทั้งหมดในไฟล์</div>
                    <div className="text-2xl font-black text-slate-100">{importPreviewData.total_rows}</div>
                  </div>
                  <div className="text-xs font-medium text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg">แถว</div>
                </div>

                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-emerald-300 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> พร้อมนำเข้าสู่ระบบ
                    </div>
                    <div className="text-2xl font-black text-emerald-400">{importPreviewData.imported_count}</div>
                  </div>
                  <div className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    รายการผ่าน
                  </div>
                </div>

                <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-rose-300 font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> พบข้อผิดพลาด
                    </div>
                    <div className="text-2xl font-black text-rose-400">{importPreviewData.failed_count}</div>
                  </div>
                  <div className="text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                    ไม่สามารถนำเข้า
                  </div>
                </div>
              </div>

              {/* Alert Warning if has errors */}
              {importPreviewData.failed_count > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300">แจ้งเตือน:</span> พบรายการที่ไม่ผ่านการตรวจสอบจำนวน {importPreviewData.failed_count} แถว (จะถูกข้ามและไม่บันทึกลงฐานข้อมูล) ระบบจะทำการบันทึกเฉพาะรายการที่ผ่านการตรวจสอบเท่านั้น ({importPreviewData.imported_count} รายการ)
                  </div>
                </div>
              )}

              {/* Filter Tabs & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                {/* Tabs */}
                <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5 w-fit">
                  <button
                    onClick={() => setPreviewFilterTab('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      previewFilterTab === 'ALL'
                        ? 'bg-sky-500 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ทั้งหมด ({importPreviewData.total_rows})
                  </button>
                  <button
                    onClick={() => setPreviewFilterTab('VALID')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      previewFilterTab === 'VALID'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-emerald-400 hover:text-emerald-300'
                    }`}
                  >
                    พร้อมนำเข้า ({importPreviewData.imported_count})
                  </button>
                  <button
                    onClick={() => setPreviewFilterTab('ERROR')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      previewFilterTab === 'ERROR'
                        ? 'bg-rose-600 text-white shadow'
                        : 'text-rose-400 hover:text-rose-300'
                    }`}
                  >
                    ข้อผิดพลาด ({importPreviewData.failed_count})
                  </button>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={previewSearch}
                    onChange={e => setPreviewSearch(e.target.value)}
                    placeholder="ค้นหาในตารางสรุป..."
                    className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  {previewSearch && (
                    <button
                      onClick={() => setPreviewSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-950/40">
                <div className="max-h-[380px] overflow-x-auto overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-300 border-collapse">
                    <thead className="bg-[#121b2f] text-slate-400 sticky top-0 z-10 border-b border-white/10 text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 w-14 text-center">แถว</th>
                        <th className="py-2.5 px-3 w-32">ผลการตรวจสอบ</th>
                        <th className="py-2.5 px-3 min-w-[150px]">รหัสกล้อง</th>
                        <th className="py-2.5 px-3 min-w-[170px]">หน่วยงานเจ้าของ</th>
                        <th className="py-2.5 px-3 min-w-[140px]">ยี่ห้อ / รุ่น</th>
                        <th className="py-2.5 px-3 min-w-[130px]">พิกัด (Lat, Lng)</th>
                        <th className="py-2.5 px-3 min-w-[150px]">สถานที่ติดตั้ง</th>
                        <th className="py-2.5 px-3 w-24 text-center">สถานะ</th>
                        <th className="py-2.5 px-3 min-w-[200px]">หมายเหตุ / ข้อผิดพลาด</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-normal">
                      {filteredPreviewItems.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                            ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา
                          </td>
                        </tr>
                      ) : (
                        filteredPreviewItems.map((item, idx) => (
                          <tr
                            key={idx}
                            className={`transition hover:bg-white/[0.03] ${
                              !item.is_valid
                                ? 'bg-rose-950/20'
                                : item.is_existing
                                ? 'bg-sky-950/15'
                                : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {item.row}
                            </td>
                            <td className="py-2.5 px-3">
                              {!item.is_valid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                  <AlertTriangle className="w-2.5 h-2.5" /> ไม่ผ่าน
                                </span>
                              ) : item.is_existing ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                  <RotateCcw className="w-2.5 h-2.5" /> อัปเดตเดิม
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  <Check className="w-2.5 h-2.5" /> เพิ่มใหม่
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-medium text-slate-200">
                              {item.id}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="text-slate-200 font-medium">{item.local_gov_name || '-'}</div>
                              {item.local_gov_id && (
                                <div className="text-[10px] text-slate-400 font-mono">{item.local_gov_id}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-slate-300">{item.brand || '-'}</span>
                              {item.model && <span className="text-slate-500 ml-1 font-mono text-[11px]">({item.model})</span>}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                              {item.lat != null && item.lng != null ? `${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-300 max-w-[160px] truncate" title={item.address_ref}>
                              {item.address_ref || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-400' :
                                item.status === 'MAINTENANCE' ? 'bg-amber-500/10 text-amber-400' :
                                'bg-slate-700/50 text-slate-400'
                              }`}>
                                {item.status || 'ONLINE'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-xs">
                              {item.error_message ? (
                                <span className="text-rose-400 font-medium flex items-center gap-1">
                                  <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                                  {item.error_message}
                                </span>
                              ) : (
                                <span className="text-emerald-400/80 text-[11px] flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> พร้อมบันทึก
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-white/10 bg-slate-900/60">
              <div className="text-xs text-slate-400">
                พร้อมนำเข้าสู่ฐานข้อมูล: <span className="text-emerald-400 font-bold">{importPreviewData.imported_count}</span> รายการ
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setImportPreviewData(null);
                    setPendingImportFile(null);
                  }}
                  disabled={isSubmittingImport}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 border border-white/10 transition cursor-pointer disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImportSubmit}
                  disabled={isSubmittingImport || importPreviewData.imported_count === 0}
                  className="bg-gradient-to-r from-[#005BAC] to-[#00AEEF] hover:opacity-95 text-white font-bold py-2 px-5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-sky-500/20 cursor-pointer transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSubmittingImport ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังนำเข้าสู่ฐานข้อมูล...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ยืนยันนำเข้าข้อมูล ({importPreviewData.imported_count} รายการ)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
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

      {/* BULK STATUS UPDATE MODAL */}
      {isBulkStatusModalOpen && (
        <div className="fixed inset-0 bg-black/75 z-[15000] flex items-center justify-center backdrop-blur-md p-4">
          <div className="bg-[#0f1525] border border-[#00AEEF]/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 text-white animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center gap-3 text-[#00AEEF] mb-3">
              <div className="p-2.5 rounded-xl bg-[#00AEEF]/10 border border-[#00AEEF]/20">
                <RefreshCw className="w-6 h-6 text-[#00AEEF]" />
              </div>
              <div>
                <h4 className="font-bold text-base text-white">เปลี่ยนสถานะกล้องวงจรปิดแบบกลุ่ม</h4>
                <p className="text-xs text-[#00AEEF]">การดำเนินการนี้จะส่งผลต่อกล้องจำนวน {selectedCameraIds.length} รายการ</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              เลือกสถานะใหม่ที่ต้องการกำหนดให้กับกล้องวงจรปิดที่เลือกจำนวน <strong className="text-white font-bold">{selectedCameraIds.length} รายการ</strong>
            </p>

            {/* Status Radio Choices */}
            <div className="space-y-2 mb-4">
              {[
                { value: 'ONLINE', label: 'พร้อมใช้งาน (ONLINE)', desc: 'กล้องทำงานปกติ บันทึกภาพและสตรีมได้', color: 'emerald' },
                { value: 'OFFLINE', label: 'ชำรุด/ขัดข้อง (OFFLINE)', desc: 'กล้องไม่ส่งสัญญาณภาพหรือขัดข้อง', color: 'red' },
                { value: 'MAINTENANCE', label: 'อยู่ระหว่างซ่อม (MAINTENANCE)', desc: 'กำลังดำเนินการตรวจสอบ/ซ่อมแซม', color: 'amber' },
                { value: 'PENDING_INSTALL', label: 'รอติดตั้ง (PENDING INSTALL)', desc: 'อยู่ระหว่างรอการติดตั้งหรือส่งมอบ', color: 'blue' },
              ].map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    bulkTargetStatus === opt.value
                      ? 'bg-[#00AEEF]/10 border-[#00AEEF] shadow-sm'
                      : 'bg-black/20 border-white/5 hover:bg-white/5'
                  }`}
                >
                  <input
                    type="radio"
                    name="bulkStatus"
                    value={opt.value}
                    checked={bulkTargetStatus === opt.value}
                    onChange={(e) => setBulkTargetStatus(e.target.value)}
                    className="mt-0.5 w-4 h-4 text-[#00AEEF] focus:ring-[#00AEEF] cursor-pointer accent-[#00AEEF]"
                  />
                  <div className="flex-grow">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        opt.color === 'emerald' ? 'bg-emerald-400' :
                        opt.color === 'red' ? 'bg-red-400' :
                        opt.color === 'amber' ? 'bg-amber-400' : 'bg-blue-400'
                      }`}></span>
                      <span className="text-xs font-bold text-white">{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Selected Items Preview */}
            <div className="bg-black/40 border border-white/5 rounded-xl p-3 mb-4 overflow-y-auto max-h-36 divide-y divide-white/5">
              <div className="text-[11px] text-slate-400 font-semibold mb-2 flex justify-between">
                <span>รายการกล้องที่จะเปลี่ยนสถานะ:</span>
                <span>{selectedCameraIds.length} รายการ</span>
              </div>
              {selectedCameraIds.slice(0, 10).map(id => {
                const cam = cameras.find(c => c.id === id);
                return (
                  <div key={id} className="py-1 flex items-center justify-between text-xs">
                    <span className="font-mono text-[#00AEEF] font-bold">{id}</span>
                    <span className="text-slate-400 truncate max-w-[240px] text-right">{cam?.address_ref || '-'}</span>
                  </div>
                );
              })}
              {selectedCameraIds.length > 10 && (
                <div className="pt-1.5 text-center text-xs text-slate-500 italic">
                  ... และอีก {selectedCameraIds.length - 10} รายการ
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-white/10 mt-auto">
              <button
                type="button"
                onClick={() => setIsBulkStatusModalOpen(false)}
                disabled={isBulkStatusUpdating}
                className="bg-white/5 hover:bg-white/10 text-slate-300 py-2 px-4 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleBulkStatusUpdate}
                disabled={isBulkStatusUpdating}
                className="flex items-center gap-1.5 bg-[#00AEEF] hover:bg-[#0096ce] text-white py-2 px-5 rounded-xl text-xs font-bold cursor-pointer shadow-lg shadow-[#00AEEF]/20 disabled:opacity-50"
              >
                {isBulkStatusUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    บันทึกเปลี่ยนสถานะ ({selectedCameraIds.length} รายการ)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/75 z-[15000] flex items-center justify-center backdrop-blur-md p-4">
          <div className="bg-[#0f1525] border border-red-500/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 text-white animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center gap-3 text-red-500 mb-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertOctagon className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h4 className="font-bold text-base text-white">ยืนยันการลบกล้องวงจรปิดแบบกลุ่ม</h4>
                <p className="text-xs text-red-400">การดำเนินการนี้จะส่งผลต่อกล้องจำนวน {selectedCameraIds.length} รายการ</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              คุณแน่ใจหรือไม่ที่จะลบกล้องที่เลือกจำนวน <strong className="text-white font-bold">{selectedCameraIds.length} รายการ</strong> ออกจากระบบทะเบียนกลาง? 
              ข้อมูลกล้องจะไม่ถูกลบถาวร แต่จะย้ายไปแสดงในแท็บ <span className="text-amber-400 font-semibold">'ลบแล้ว' (REMOVED)</span> โดยจะไม่แสดงในแผนที่และรายการกล้องที่ใช้งานอยู่
            </p>

            {/* Selected Items Preview */}
            <div className="bg-black/40 border border-white/5 rounded-xl p-3 mb-4 overflow-y-auto max-h-48 divide-y divide-white/5">
              <div className="text-[11px] text-slate-400 font-semibold mb-2 flex justify-between">
                <span>รายการกล้องที่เลือก:</span>
                <span>{selectedCameraIds.length} รายการ</span>
              </div>
              {selectedCameraIds.slice(0, 15).map(id => {
                const cam = cameras.find(c => c.id === id);
                return (
                  <div key={id} className="py-1.5 flex items-center justify-between text-xs">
                    <span className="font-mono text-[#00AEEF] font-bold">{id}</span>
                    <span className="text-slate-400 truncate max-w-[240px] text-right">{cam?.address_ref || '-'}</span>
                  </div>
                );
              })}
              {selectedCameraIds.length > 15 && (
                <div className="pt-2 text-center text-xs text-slate-500 italic">
                  ... และอีก {selectedCameraIds.length - 15} รายการ
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-white/10 mt-auto">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                disabled={isBulkDeleting}
                className="bg-white/5 hover:bg-white/10 text-slate-300 py-2 px-4 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white py-2 px-5 rounded-xl text-xs font-bold cursor-pointer shadow-lg shadow-red-600/30 disabled:opacity-50"
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังลบข้อมูล...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    ยืนยันการลบ {selectedCameraIds.length} รายการ
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMANENT DELETE CONFIRMATION MODAL (Type-to-Confirm) */}
      {permanentDeleteTarget && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
          <div className="bg-[#121a2f] border border-rose-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">ยืนยันการลบข้อมูลกล้องแบบถาวร</h3>
                <p className="text-xs text-rose-300 font-medium">Permanent Delete (ไม่สามารถกู้คืนได้)</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-slate-300 flex flex-col gap-1.5">
              <p className="text-rose-300 font-semibold flex items-center gap-1.5">
                <span>⚠️</span> คำเตือน: ข้อมูลกล้องและประวัติทั้งหมดจะถูกลบออกจากฐานข้อมูลจริงอย่างถาวร
              </p>
              <p className="text-slate-300 mt-1">
                {permanentDeleteTarget.type === 'single' ? (
                  <>ต้องการลบกล้องรหัส <strong className="text-rose-300 font-mono px-1 py-0.5 rounded bg-black/40">{permanentDeleteTarget.id}</strong></>
                ) : (
                  <>ต้องการลบกล้องที่เลือกทั้งหมด <strong className="text-rose-300 text-sm">{permanentDeleteTarget.ids.length}</strong> รายการ</>
                )}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-300 leading-relaxed">
                เพื่อยืนยันการลบจริง กรุณาพิมพ์คำว่า <span className="font-bold text-rose-400 font-mono bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 select-all">ลบถาวร</span> หรือ <span className="font-bold text-rose-400 font-mono bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 select-all">DELETE</span> ในช่องด้านล่าง:
              </label>
              <input
                type="text"
                value={permanentConfirmInput}
                onChange={(e) => setPermanentConfirmInput(e.target.value)}
                placeholder="พิมพ์ 'ลบถาวร' หรือ 'DELETE' เพื่อยืนยัน"
                className="bg-black/50 border border-rose-500/40 focus:border-rose-400 rounded-xl p-3 text-sm text-white focus:outline-none text-center font-bold tracking-wider placeholder:text-slate-500"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => { setPermanentDeleteTarget(null); setPermanentConfirmInput(''); }}
                disabled={isPermanentDeleting}
                className="bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition border border-white/10 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmPermanentDelete}
                disabled={isPermanentDeleting || (permanentConfirmInput.trim() !== 'ลบถาวร' && permanentConfirmInput.trim().toUpperCase() !== 'DELETE')}
                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-30 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                {isPermanentDeleting ? 'กำลังลบถาวร...' : 'ยืนยันลบถาวร'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL ACTION PROGRESS OVERLAY (EFFECT LOADING & PERCENTAGE) */}
      {opProgress.isOpen && (
        <div className="fixed inset-0 bg-black/85 z-[20000] flex items-center justify-center backdrop-blur-xl p-4 animate-in fade-in duration-200">
          <div className="bg-[#0b1120] border border-white/10 rounded-3xl w-full max-w-md p-7 text-center shadow-2xl relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div
              className={`absolute -top-20 -left-20 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none ${
                opProgress.type === 'permanent_delete'
                  ? 'bg-rose-600'
                  : opProgress.type === 'delete'
                  ? 'bg-amber-600'
                  : 'bg-sky-500'
              }`}
            />
            <div
              className={`absolute -bottom-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none ${
                opProgress.type === 'permanent_delete'
                  ? 'bg-rose-800'
                  : opProgress.type === 'delete'
                  ? 'bg-amber-800'
                  : 'bg-teal-500'
              }`}
            />

            {/* Icon with Spinning Ring */}
            <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <div
                className={`absolute inset-0 rounded-full border-2 border-dashed animate-spin ${
                  opProgress.type === 'permanent_delete'
                    ? 'border-rose-500/60'
                    : opProgress.type === 'delete'
                    ? 'border-amber-500/60'
                    : 'border-sky-400/60'
                }`}
                style={{ animationDuration: '6s' }}
              />
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                  opProgress.type === 'permanent_delete'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-rose-500/20'
                    : opProgress.type === 'delete'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-amber-500/20'
                    : 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sky-500/20'
                }`}
              >
                {opProgress.type === 'permanent_delete' ? (
                  <Trash2 className="w-7 h-7 animate-pulse" />
                ) : opProgress.type === 'delete' ? (
                  <AlertTriangle className="w-7 h-7 animate-pulse" />
                ) : (
                  <Upload className="w-7 h-7 animate-pulse" />
                )}
              </div>
            </div>

            {/* Title & Subtitle */}
            <h3 className="text-lg font-bold text-white mb-1">{opProgress.title}</h3>
            {opProgress.subtitle && (
              <div className="inline-block px-3 py-0.5 rounded-full text-xs font-mono text-slate-300 bg-white/5 border border-white/10 mb-4">
                {opProgress.subtitle}
              </div>
            )}

            {/* Big Percentage Display */}
            <div className="my-2">
              <span
                className={`text-4xl font-black tracking-tight ${
                  opProgress.type === 'permanent_delete'
                    ? 'text-rose-400'
                    : opProgress.type === 'delete'
                    ? 'text-amber-400'
                    : 'text-[#00f2fe]'
                }`}
              >
                {Math.round(opProgress.percent)}%
              </span>
            </div>

            {/* Progress Bar Container */}
            <div className="w-full bg-slate-900 rounded-full h-3 p-0.5 border border-white/10 mb-3 overflow-hidden shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out relative ${
                  opProgress.type === 'permanent_delete'
                    ? 'bg-gradient-to-r from-red-600 to-rose-400 shadow-rose-500/50'
                    : opProgress.type === 'delete'
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-400 shadow-amber-500/50'
                    : 'bg-gradient-to-r from-[#005BAC] via-[#00AEEF] to-[#00f2fe] shadow-sky-500/50'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, opProgress.percent))}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
              </div>
            </div>

            {/* Status Message */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-300 min-h-[22px]">
              {opProgress.percent < 100 ? (
                <Loader2
                  className={`w-3.5 h-3.5 animate-spin ${
                    opProgress.type === 'permanent_delete'
                      ? 'text-rose-400'
                      : opProgress.type === 'delete'
                      ? 'text-amber-400'
                      : 'text-sky-400'
                  }`}
                />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="font-medium">{opProgress.statusText}</span>
            </div>

            <p className="text-[11px] text-slate-500 mt-4">
              กรุณารอสักครู่ ระบบกำลังประมวลผลข้อมูล...
            </p>
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
              คุณแน่ใจหรือไม่ที่จะลบกล้องรหัส <strong className="text-red-400">{deletingCamId}</strong> ออกจากทะเบียนกลาง? ข้อมูลกล้องจะไม่ถูกลบถาวร แต่จะย้ายไปแสดงในแท็บ "ลบแล้ว" และสามารถกู้คืนได้ภายหลังโดยแก้ไขสถานะ
            </p>
            <div className="flex gap-3 justify-end pt-3 border-t border-white/5">
              <button
                type="button"
                disabled={isSingleDeleting}
                onClick={() => setDeletingCamId(null)}
                className="bg-white/5 hover:bg-white/10 text-slate-400 py-2 px-4 rounded-lg text-xs cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSingleDeleting}
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSingleDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังลบ...</span>
                  </>
                ) : (
                  <span>ยืนยันลบ</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
