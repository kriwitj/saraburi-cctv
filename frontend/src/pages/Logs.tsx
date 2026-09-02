import React from 'react';

interface AuditLogItem {
  id: number;
  username: string;
  action: string;
  target_id: string;
  action_time: string;
  client_ip: string;
  reason: string;
}

interface LogsProps {
  auditLogs: AuditLogItem[];
}

export default function Logs({ auditLogs }: LogsProps) {
  return (
    <div className="bg-[#121a2f] border border-white/10 rounded-2xl p-6 text-white animate-in fade-in duration-300">
      <h3 className="font-bold text-sm text-[#00AEEF] mb-4">ประวัติการปฏิบัติกิจกรรมของเจ้าหน้าที่และระบบ</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-black/25 text-slate-400">
              <th className="p-3">รหัสบันทึก</th>
              <th className="p-3">ผู้กระทำ</th>
              <th className="p-3">กิจกรรมที่ทำ</th>
              <th className="p-3">กล้องเป้าหมาย</th>
              <th className="p-3">ไอพีเครื่องเรียกใช้</th>
              <th className="p-3">ความจำเป็นตาม PDPA</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map(log => (
              <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition">
                <td className="p-3 text-slate-400">LOG-000{log.id}</td>
                <td className="p-3 font-bold">{log.username}</td>
                <td className="p-3"><code>{log.action}</code></td>
                <td className="p-3 text-sky-400">{log.target_id}</td>
                <td className="p-3 text-slate-300">{log.client_ip}</td>
                <td className="p-3 text-amber-400">{log.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
