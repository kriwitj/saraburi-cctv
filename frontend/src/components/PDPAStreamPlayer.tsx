import React, { useState } from 'react';
import { Camera, Shield, AlertTriangle } from 'lucide-react';

interface CameraItem {
  id: string;
  address_ref: string;
  brand: string;
  status: string;
}

interface PDPAStreamPlayerProps {
  camera: CameraItem;
  onClose: () => void;
  addToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
  auditLogs: any[];
  setAuditLogs: (logs: any[]) => void;
}

export function PDPAStreamPlayer({ 
  camera, onClose, addToast, auditLogs, setAuditLogs 
}: PDPAStreamPlayerProps) {
  const [isPdpaVerified, setIsPdpaVerified] = useState(false);
  const [pdpaReason, setPdpaReason] = useState('');
  const [playerMode, setPlayerMode] = useState<'live' | 'playback'>('live');

  const handleVerify = () => {
    if (pdpaReason.trim().length < 5) {
      addToast('กรุณากรอกเหตุผลอย่างน้อย 5 อักษร', 'error');
      return;
    }
    const newLog = {
      id: auditLogs.length + 1,
      username: 'srb_super_admin',
      action: playerMode === 'live' ? 'VIEW_LIVE' : 'VIEW_PLAYBACK',
      target_id: camera.id,
      action_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      client_ip: '192.168.1.120',
      reason: pdpaReason
    };
    setAuditLogs([newLog, ...auditLogs]);
    setIsPdpaVerified(true);
    addToast('อนุมัติ PDPA เข้าชมภาพสตรีมสำเร็จ', 'success');
  };

  return (
    <div className="fixed inset-0 bg-black/85 z-[10000] flex items-center justify-center backdrop-blur-md">
      <div className="bg-[#0c1223] border border-[#00f2fe]/40 rounded-2xl w-[700px] overflow-hidden shadow-[0_10px_50px_rgba(0,242,254,0.25)] text-white">
        <div className="flex justify-between items-center p-5 border-b border-white/10 bg-black/10">
          <h3 className="font-bold text-sm text-[#00AEEF]">
            <Camera className="w-4 h-4 inline mr-2 text-[#00AEEF]" /> มอนิเตอร์กล้อง CCTV ทะเบียนกลาง
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="p-6">
          {!isPdpaVerified ? (
            <div className="flex flex-col gap-6">
              <div className="bg-[#f4b400]/10 border border-[#f4b400]/30 p-4 rounded-xl flex gap-3 text-xs leading-relaxed text-[#f4b400]">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <div>
                  <strong className="block text-sm font-bold mb-1">พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA Compliance)</strong>
                  ระบบจะบันทึกประวัติการเรียกดูและ IP ของท่านลงในฐานข้อมูลกลางเพื่อความโปร่งใสตามมาตรการป้องกันความปลอดภัย
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400 font-semibold">ระบุความจำเป็น / หมายเลขคดีอ้างอิงในการเข้ามอนิเตอร์ภาพ</label>
                <textarea 
                  value={pdpaReason}
                  onChange={(e) => setPdpaReason(e.target.value)}
                  placeholder="เช่น ตรวจส่องการจราจรหนาแน่นแยกปากเพรียว หรือตรวจสอบคดีลักทรัพย์สภ.เมืองสระบุรี"
                  rows={3}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#00AEEF] transition"
                ></textarea>
              </div>

              <button 
                onClick={handleVerify}
                className="w-full bg-gradient-to-r from-[#005BAC] to-[#00AEEF] text-white py-3 rounded-lg text-xs font-bold cursor-pointer hover:opacity-95 shadow-md"
              >
                ยืนยันวัตถุประสงค์และเริ่มการสตรีม
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="w-full h-[350px] bg-black rounded-xl border border-white/5 relative overflow-hidden flex items-center justify-center">
                <div className="absolute top-0 left-0 w-full p-3 bg-gradient-to-b from-black/80 to-transparent flex justify-between text-[11px] text-[#00AEEF] font-semibold z-10">
                  <span>ID: {camera.id}</span>
                  <span>{camera.brand} ({playerMode.toUpperCase()})</span>
                </div>

                {playerMode === 'live' ? (
                  <div className="flex flex-col items-center justify-center w-full h-full relative">
                    <div className="absolute top-4 left-4 bg-red-600/90 text-white font-bold text-[9px] px-2 py-0.5 rounded flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span> LIVE
                    </div>
                    <Camera className="w-8 h-8 animate-pulse text-[#00f2fe]" />
                    <span className="text-xs font-bold text-slate-400 mt-2">Streaming WebRTC 1080P Low-Latency...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full text-amber-400 relative">
                    <AlertTriangle className="w-10 h-10 animate-pulse text-amber-500 mb-2" />
                    <span className="text-xs font-bold">ภาพประวัติย้อนหลัง: บันทึก NVR ท้องถิ่น</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setPlayerMode('live')}
                    className={`py-1.5 px-4 rounded text-xs cursor-pointer font-semibold ${
                      playerMode === 'live' ? 'bg-[#005BAC] text-white' : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    ภาพสด (Live)
                  </button>
                  <button 
                    onClick={() => setPlayerMode('playback')}
                    className={`py-1.5 px-4 rounded text-xs cursor-pointer font-semibold ${
                      playerMode === 'playback' ? 'bg-[#005BAC] text-white' : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    ภาพย้อนหลัง (Playback)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
