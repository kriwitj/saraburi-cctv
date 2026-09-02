import React from 'react';

interface SettingsProps {
  addToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

export default function Settings({ addToast }: SettingsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-white animate-in fade-in duration-300">
      <div className="bg-[#121a2f] border border-white/10 rounded-2xl p-6">
        <h3 className="font-bold text-sm text-[#00AEEF] mb-6">สำรองและกู้คืนฐานข้อมูลทะเบียนกลาง</h3>
        <div className="flex flex-col gap-4">
          <p className="text-xs text-slate-300">
            ระบบจะทำการส่งไฟล์สำรองข้อมูล (Database dump) ทั้งตารางสินทรัพย์กล้อง ประวัติแจ้งซ่อม และ Audit Logs เข้าระบบคลาวด์กลางภาครัฐแบบอัตโนมัติทุกๆ เที่ยงคืน
          </p>
          <div className="flex gap-4">
            <button 
              onClick={() => addToast('เริ่มทำการสำรองข้อมูลในเซิร์ฟเวอร์จังหวัด...', 'success')}
              className="flex-1 bg-[#005BAC] text-white py-2.5 rounded-lg text-xs font-bold cursor-pointer"
            >
              สั่งสำรองข้อมูลทันที
            </button>
            <button 
              onClick={() => addToast('กู้คืนโครงสร้างฐานข้อมูลเริ่มต้นสำเร็จ', 'success')}
              className="flex-1 bg-white/5 border border-white/10 text-slate-300 py-2.5 rounded-lg text-xs cursor-pointer"
            >
              สั่งกู้คืน (Restore)
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#121a2f] border border-white/10 rounded-2xl p-6">
        <h3 className="font-bold text-sm text-[#00AEEF] mb-6">ตั้งค่าการเชื่อมต่อเซิร์ฟเวอร์แจ้งเตือน</h3>
        <form onSubmit={(e) => { e.preventDefault(); addToast('บันทึกการตั้งค่าเครือข่ายสำเร็จ', 'success'); }} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">เซิร์ฟเวอร์ LINE Notify Token (สำหรับรายงานเสีย)</label>
            <input type="text" placeholder="Line-Notify-Token-Value..." className="bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none" />
          </div>
          <button type="submit" className="bg-[#005BAC] text-white py-2 rounded-lg text-xs font-bold cursor-pointer">
            บันทึกการเชื่อมโยงระบบภายนอก
          </button>
        </form>
      </div>
    </div>
  );
}
