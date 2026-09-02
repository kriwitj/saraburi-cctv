import React, { useEffect, useState } from 'react';
import { Wrench, CheckCircle, Clock, Image, Upload, AlertCircle } from 'lucide-react';
import { apiClient, extractErrorMessage } from '../api/client';
import SearchableSelect from '../components/SearchableSelect';
import RequiredMark from '../components/RequiredMark';

interface CameraItem {
  id: string;
}

interface TicketItem {
  id: number;
  ticket_number: string;
  camera_id: string;
  issue_description: string;
  reported_by: string;
  status: string;
  resolution_details?: string;
  photo_resolved_url?: string;
}

interface MaintenanceProps {
  currentUser: any;
  cameras: CameraItem[];
  tickets: TicketItem[];
  refetchTickets: () => void;
  addToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

export default function Maintenance({ currentUser, cameras, tickets, refetchTickets, addToast }: MaintenanceProps) {
  const [desc, setDesc] = useState('');
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);

  const canReport = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'LOCAL_GOV_STAFF';
  const isTechnician = currentUser.role === 'MA_TECHNICIAN';

  useEffect(() => {
    if (!selectedCameraId && cameras.length > 0) {
      setSelectedCameraId(cameras[0].id);
    }
  }, [cameras, selectedCameraId]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const cameraId = selectedCameraId || cameras[0]?.id;
    if (!desc || !cameraId) return;
    try {
      await apiClient.post('/tickets', {
        camera_id: cameraId,
        issue_description: desc,
      });
      setDesc('');
      refetchTickets();
      addToast('สร้างใบสั่งแจ้งเสียสำเร็จ และแจ้งเตือนเข้าระบบ LINE Notify แล้ว', 'success');
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'สร้างใบแจ้งซ่อมไม่สำเร็จ'), 'error');
    }
  };

  const handleAcceptTicket = async (tId: number) => {
    try {
      await apiClient.put(`/tickets/${tId}`, { status: 'IN_PROGRESS' });
      refetchTickets();
      addToast(`รับงานซ่อมบำรุงหมายเลขตั๋วสำเร็จ กำลังดำเนินการแก้ไข...`, 'success');
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'รับงานไม่สำเร็จ'), 'error');
    }
  };

  const handleOpenResolveModal = (tId: number) => {
    setSelectedTicketId(tId);
    setResolutionText('');
    setUploadedPhoto(null);
  };

  const handleResolveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionText) {
      addToast('กรุณากรอกสาเหตุการขัดข้องและการแก้ไข', 'error');
      return;
    }
    try {
      await apiClient.put(`/tickets/${selectedTicketId}`, {
        status: 'RESOLVED',
        resolution_details: resolutionText,
      });
      refetchTickets();
      addToast(`บันทึกปิดงานซ่อมและส่งรายงานภาพซ่อมเสร็จเข้าระบบสถิติจังหวัดเรียบร้อย`, 'success');
      setSelectedTicketId(null);
    } catch (err: any) {
      addToast(extractErrorMessage(err, 'ปิดงานซ่อมไม่สำเร็จ'), 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-white animate-in fade-in duration-300">
      
      {/* LEFT COLUMN: ACTION PANEL */}
      <div className="bg-[#121a2f] border border-white/10 rounded-2xl p-6 h-fit flex flex-col gap-6">
        {isTechnician ? (
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-sm text-[#00AEEF] flex items-center gap-2">
              <Wrench className="w-4 h-4" /> แดชบอร์ดช่างเทคนิค (MA Panel)
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              ยินดีต้อนรับผู้รับจ้าง MA ท่านสามารถกดรับงานจากรายการ และอัปเดตสถานะพร้อมแนบรูปถ่ายการทำงานในพื้นที่เพื่อปิดงานตามเงื่อนไข SLA
            </p>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="bg-black/20 p-3 rounded-xl border border-white/5 text-center">
                <Clock className="w-5 h-5 mx-auto text-amber-400 mb-1" />
                <span className="text-[10px] text-slate-400 block uppercase">งานค้างรับ</span>
                <strong className="text-sm font-bold">{tickets.filter(t => t.status === 'OPEN').length} ใบ</strong>
              </div>
              <div className="bg-black/20 p-3 rounded-xl border border-white/5 text-center">
                <CheckCircle className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
                <span className="text-[10px] text-slate-400 block uppercase">ซ่อมเสร็จแล้ว</span>
                <strong className="text-sm font-bold">{tickets.filter(t => t.status === 'RESOLVED').length} ใบ</strong>
              </div>
            </div>
          </div>
        ) : canReport ? (
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-sm text-[#00AEEF]">แจ้งงานเสีย & สร้างตั๋วซ่อม</h3>
            <form onSubmit={handleCreateTicket} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">เลือกกล้องที่มีปัญหา<RequiredMark /></label>
                <SearchableSelect
                  value={selectedCameraId}
                  onChange={(v) => setSelectedCameraId(v)}
                  options={cameras.map(c => ({ value: c.id, label: c.id }))}
                  placeholder="-- เลือกกล้อง --"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">ระบุรายละเอียด/ปัญหาขัดข้อง<RequiredMark /></label>
                <textarea 
                  value={desc} 
                  onChange={(e) => setDesc(e.target.value)} 
                  placeholder="เช่น สัญญาณภาพล้าช้า ภาพกระตุก หรือสายสัญญาณขาดเนื่องจากพายุ..." 
                  rows={3} 
                  className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#00f2fe]" 
                  required
                />
              </div>
              <button type="submit" className="bg-[#005BAC] hover:opacity-90 text-white py-2.5 rounded-lg text-xs font-bold cursor-pointer transition">
                ส่งตั๋วแจ้งซ่อมบำรุง
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-3 text-center py-6">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
            <h4 className="font-bold text-xs text-slate-400">เข้าชมสิทธิ์ Read-Only</h4>
            <p className="text-[10px] text-slate-500">บัญชีของท่านไม่มีสิทธิ์ออกใบแจ้งซ่อม หรือดำเนินการทางช่าง</p>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: TICKETS LIST */}
      <div className="lg:col-span-2 bg-[#121a2f] border border-white/10 rounded-2xl p-6">
        <h3 className="font-bold text-sm text-[#00AEEF] mb-4">รายการใบสั่งงานซ่อมบำรุงและ SLA (Work Orders)</h3>
        <div className="flex flex-col gap-3">
          {tickets.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">ไม่มีรายการใบสั่งงานซ่อมบำรุงในระบบขณะนี้</p>
          ) : (
            tickets.map(t => (
              <div key={t.id} className="bg-black/25 border border-white/5 p-4 rounded-xl flex flex-col md:flex-row justify-between gap-4 md:items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px]">TICKET: {t.ticket_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      t.status === 'OPEN' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      t.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-sky-300 mt-1">กล้องเป้าหมาย: {t.camera_id}</h4>
                  <p className="text-xs text-slate-300 mt-1">{t.issue_description}</p>
                  
                  {t.resolution_details && (
                    <div className="mt-3 bg-white/5 border border-white/5 p-3 rounded-lg text-[11px] text-slate-300">
                      <strong className="text-emerald-400 block mb-1">✓ รายงานผลการแก้ไข:</strong>
                      {t.resolution_details}
                      {t.photo_resolved_url && (
                        <div className="mt-2 flex items-center gap-2 text-sky-400">
                          <Image className="w-3.5 h-3.5" />
                          <span className="text-[10px] underline cursor-pointer">เปิดดูภาพถ่ายหลักฐานการซ่อมเสร็จ</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Scoped Actions */}
                <div className="flex gap-2 shrink-0 self-end md:self-center">
                  {isTechnician && t.status === 'OPEN' && (
                    <button 
                      onClick={() => handleAcceptTicket(t.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-4 rounded-lg cursor-pointer transition"
                    >
                      รับงาน (Accept)
                    </button>
                  )}
                  {isTechnician && t.status === 'IN_PROGRESS' && (
                    <button 
                      onClick={() => handleOpenResolveModal(t.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-4 rounded-lg cursor-pointer transition"
                    >
                      อัปเดต / ปิดงาน
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RESOLVE TICKET MODAL */}
      {selectedTicketId && (
        <div className="fixed inset-0 bg-black/75 z-[15000] flex items-center justify-center backdrop-blur-md">
          <div className="bg-[#0f1525] border border-[#00f2fe]/20 rounded-2xl w-[450px] overflow-hidden shadow-2xl p-6 text-white animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/5">
              <h4 className="font-bold text-sm text-[#00AEEF]">ปิดงานแจ้งซ่อมกล้องวงจรปิด</h4>
              <button onClick={() => setSelectedTicketId(null)} className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer">&times;</button>
            </div>
            <form onSubmit={handleResolveTicket} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">สาเหตุขัดข้องและการแก้ไข<RequiredMark /></label>
                <textarea 
                  value={resolutionText} 
                  onChange={(e) => setResolutionText(e.target.value)} 
                  placeholder="ป้อนรายละเอียดสาเหตุ เช่น ดำเนินการเปลี่ยนตัวพาวเวอร์ซัพพลายกล้อง / เช็คคู่สายเน็ตเวิร์กใหม่เรียบร้อยแล้ว" 
                  rows={3} 
                  className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#00f2fe]" 
                  required 
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400">แนบภาพถ่ายหลักฐานการซ่อมบำรุง</label>
                <div className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-[#00AEEF] transition flex flex-col items-center justify-center gap-2"
                     onClick={() => {
                       setUploadedPhoto("https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300");
                       addToast('อัปโหลดรูปถ่ายหน้างานเสร็จเรียบร้อย', 'success');
                     }}>
                  <Upload className="w-6 h-6 text-slate-500" />
                  <span className="text-[10px] text-slate-400 block">กดคลิกเพื่ออัปโหลดภาพ (จำลอง)</span>
                  {uploadedPhoto && <span className="text-[10px] text-emerald-400 font-bold">✓ อัปโหลดไฟล์ photo_cctv_fixed.png แล้ว</span>}
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-4 pt-3 border-t border-white/5">
                <button type="button" onClick={() => setSelectedTicketId(null)} className="bg-white/5 hover:bg-white/10 text-slate-400 py-2 px-4 rounded-lg text-xs cursor-pointer">ยกเลิก</button>
                <button type="submit" className="bg-emerald-600 text-white py-2 px-5 rounded-lg text-xs font-bold cursor-pointer">ยืนยันปิดงาน</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
