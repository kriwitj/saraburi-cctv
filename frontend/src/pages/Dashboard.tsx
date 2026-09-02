import React, { useMemo, useState } from 'react';
import { Camera, CheckCircle, AlertTriangle } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useDashboardSummary, useLocalGovernments } from '../api/hooks';
import SearchableSelect from '../components/SearchableSelect';

interface DashboardProps {
  currentUser: any;
  auditLogs: any[];
}

const SCOPE_TEXT: Record<string, { label: string; description: string }> = {
  DISTRICT_ADMIN: {
    label: "เฉพาะอำเภอของตน",
    description: "เฉพาะอำเภอของตน (District Scope)"
  },
  LOCAL_GOV_STAFF: {
    label: "เฉพาะ อปท. สังกัดของตน",
    description: "เฉพาะ อปท. สังกัดของตน (LA Scope)"
  },
  MA_TECHNICIAN: {
    label: "เฉพาะงานสัญญา MA ของตน",
    description: "ตามภารกิจซ่อมบำรุงที่ได้รับมอบหมาย"
  },
  POLICE_VIEWER: {
    label: "เฉพาะพิกัดแผนคดีที่ได้รับอนุมัติ",
    description: "ตามคำร้องขอพยานหลักฐาน PDPA"
  }
};

function formatCount(n: number | undefined): string {
  if (n === undefined || n === null) return "-";
  return `${n.toLocaleString('th-TH')} จุด`;
}

function formatBudget(thb: number | undefined): string {
  if (thb === undefined || thb === null) return "-";
  if (thb === 0) return "-";
  return `${(thb / 1_000_000).toLocaleString('th-TH', { maximumFractionDigits: 1 })} ล้าน`;
}

export default function Dashboard({ currentUser, auditLogs }: DashboardProps) {
  const canFilterByOrg = currentUser.role !== 'LOCAL_GOV_STAFF';
  const [filterLocalGovId, setFilterLocalGovId] = useState('');
  const localGovsApi = useLocalGovernments();
  const { data: summary, loading } = useDashboardSummary(canFilterByOrg ? filterLocalGovId : undefined);

  const localGovOptions = useMemo(() => {
    const list = currentUser.role === 'DISTRICT_ADMIN'
      ? localGovsApi.data.filter((g: any) => g.district_id === currentUser.district_id)
      : localGovsApi.data;
    return list.map((g: any) => ({ value: g.id, label: g.name_th }));
  }, [localGovsApi.data, currentUser.role, currentUser.district_id]);

  const scope = SCOPE_TEXT[currentUser.role] || { label: "ทั้งจังหวัด", description: "ทั้งจังหวัด (All Province)" };
  const scopeLabel = scope.label;
  const currentScopeText = scope.description;

  const totalCams = loading ? "กำลังโหลด..." : formatCount(summary?.total_cameras);
  const onlineCams = loading ? "กำลังโหลด..." : formatCount(summary?.online_cameras);
  const offlineCams = loading ? "กำลังโหลด..." : formatCount(summary?.offline_cameras);
  const budgetTotal = loading ? "กำลังโหลด..." : formatBudget(summary?.accumulated_budget_thb);

  const areaChartData = (summary?.yearly_trend || []).map((row: any) => ({
    name: String(row.year + 543), // แปลง ค.ศ. เป็น พ.ศ.
    cameras: row.cameras,
    online: row.online
  }));

  return (
    <div className="flex flex-col gap-8 text-white animate-in fade-in duration-300">
      {/* Scope Welcome Banner */}
      <div className="bg-gradient-to-r from-[#005BAC]/30 to-[#00AEEF]/10 border border-[#00f2fe]/20 p-6 rounded-2xl flex flex-col gap-2 relative z-20 backdrop-blur-xl">
        <span className="text-[10px] bg-[#00AEEF]/20 text-[#00AEEF] border border-[#00AEEF]/30 px-3 py-1 rounded-full w-fit font-bold uppercase tracking-wider">
          ผู้ใช้งาน: {currentUser.full_name} ({currentUser.role})
        </span>
        <h2 className="text-xl font-extrabold text-white">
          ศูนย์บริหารระบบทะเบียนกลางกล้องวงจรปิด (Saraburi CCTV CCOC Dashboard)
        </h2>
        <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
          ขอบเขตการดูข้อมูล: <strong className="text-[#00AEEF]">{currentScopeText}</strong>
        </p>
        {canFilterByOrg && (
          <div className="mt-2 w-full max-w-xs">
            <SearchableSelect
              value={filterLocalGovId}
              onChange={setFilterLocalGovId}
              options={localGovOptions}
              placeholder="ทุกหน่วยงาน"
              emptyLabel="ทุกหน่วยงาน"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#121a2f] border border-white/10 rounded-2xl p-6 flex justify-between items-center relative overflow-hidden">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">จำนวนกล้อง ({scopeLabel})</p>
            <h3 className="text-2xl font-extrabold text-white mt-2">{totalCams}</h3>
          </div>
          <Camera className="w-8 h-8 text-[#00AEEF]" />
        </div>

        <div className="bg-[#121a2f] border border-white/10 rounded-2xl p-6 flex justify-between items-center relative overflow-hidden">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">พร้อมใช้งานสด (ONLINE)</p>
            <h3 className="text-2xl font-extrabold text-emerald-400 mt-2">{onlineCams}</h3>
          </div>
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>

        <div className="bg-[#121a2f] border border-white/10 rounded-2xl p-6 flex justify-between items-center relative overflow-hidden">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">ชำรุดรอแก้ไข</p>
            <h3 className="text-2xl font-extrabold text-red-400 mt-2">{offlineCams}</h3>
          </div>
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>

        <div className="bg-[#121a2f] border border-white/10 rounded-2xl p-6 flex justify-between items-center relative overflow-hidden">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">งบจัดซื้อจัดจ้างสะสม</p>
            <h3 className="text-2xl font-extrabold text-[#00AEEF] mt-2">{budgetTotal}</h3>
          </div>
          <div className="w-8 h-8 bg-[#00AEEF]/10 rounded-lg flex items-center justify-center font-bold text-[#00AEEF]">฿</div>
        </div>
      </div>

      <div className="bg-[#121a2f] border border-white/10 rounded-2xl p-6 shadow-md">
        <h4 className="font-bold text-sm text-[#00AEEF] mb-6">อัตราการติดตั้งกล้องและ Uptime สะสมรายปี</h4>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="name" stroke="#8b9bb4" fontSize={11} />
              <YAxis stroke="#8b9bb4" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#070b13', borderColor: '#ffffff10' }} />
              <Area type="monotone" dataKey="cameras" stroke="#005BAC" fill="#005BAC" fillOpacity={0.1} name="จำนวนกล้องรวม" />
              <Area type="monotone" dataKey="online" stroke="#27AE60" fill="#27AE60" fillOpacity={0.15} name="พร้อมใช้งานสด" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#121a2f] border border-white/10 rounded-2xl p-6">
        <h4 className="font-bold text-sm text-[#00AEEF] mb-4">รายงานความเคลื่อนไหวระเบียบความมั่นคง (CCTV Activity logs)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-black/20 text-slate-400">
                <th className="p-3">เวลาที่ประมวลผล</th>
                <th className="p-3">ผู้เรียกใช้สิทธิ์</th>
                <th className="p-3">คำสั่งการเข้าถึง</th>
                <th className="p-3">เลขรหัสกล้อง</th>
                <th className="p-3">วัตถุประสงค์ PDPA</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.slice(0, 5).map(log => (
                <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="p-3 text-slate-400">{log.action_time}</td>
                  <td className="p-3 font-bold">{log.username}</td>
                  <td className="p-3"><code>{log.action}</code></td>
                  <td className="p-3 text-sky-400">{log.target_id}</td>
                  <td className="p-3 text-amber-400">{log.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
