import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Camera, MapPin, BarChart3, ShieldCheck, Lock, ChevronRight } from 'lucide-react';
import { apiClient } from '../api/client';

interface LandingPageProps {
  currentUser: any;
}

export default function LandingPage({ currentUser }: LandingPageProps) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_cameras: 179,
    online_cameras: 100,
    offline_cameras: 0,
    total_budget: 0,
  });

  useEffect(() => {
    // Fetch live statistics from public endpoint
    apiClient.get('/public/stats')
      .then(res => {
        if (res.data) {
          setStats({
            total_cameras: res.data.total_cameras ?? 179,
            online_cameras: res.data.online_cameras ?? 100,
            offline_cameras: res.data.offline_cameras ?? 0,
            total_budget: res.data.total_budget ?? 0,
          });
        }
      })
      .catch(() => {
        // Fallback to initial display stats if backend is unreachable
      });
  }, []);

  return (
    <div className="h-screen max-h-screen w-full relative flex flex-col justify-between overflow-hidden font-sans select-none bg-[#030712] text-white">
      {/* BACKGROUND IMAGE & AMBIENT OVERLAYS */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: "url('/images/home/background.png')" }}
      >
        {/* Soft gradient masks to keep typography ultra crisp while preserving the artwork */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#030914]/90 via-[#061226]/55 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-[#030712]/50 pointer-events-none" />
      </div>

      {/* TOPBAR NAVIGATION */}
      <header className="relative z-20 flex items-center justify-between px-6 lg:px-12 py-3 lg:py-4 border-b border-white/5 backdrop-blur-sm bg-black/10 shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#005BAC] to-[#00AEEF] flex items-center justify-center shadow-lg shadow-[#00AEEF]/20">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm tracking-wider text-white">
              SRI CCTV INTEGRATE
            </h2>
            <p className="text-[10px] text-[#00AEEF] font-semibold tracking-wide">
              Command & Control
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate(currentUser ? '/dashboard' : '/login')}
          className="group flex items-center gap-2 px-4 lg:px-5 py-2 rounded-full bg-gradient-to-r from-[#00AEEF] to-[#0070BA] hover:from-[#33beff] hover:to-[#0082d9] text-white font-bold text-xs shadow-md shadow-[#00AEEF]/30 hover:shadow-[#00AEEF]/50 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5 text-white" />
          <span>{currentUser ? 'เข้าสู่แดชบอร์ดระบบ' : 'Login เข้าสู่ระบบ'}</span>
          <ChevronRight className="w-3.5 h-3.5 text-white group-hover:translate-x-1 transition-transform" />
        </button>
      </header>

      {/* MAIN HERO SECTION */}
      <main className="relative z-10 max-w-2xl px-6 lg:px-12 py-2 lg:py-4 flex flex-col justify-center flex-grow overflow-hidden">
        {/* Accent Tagline with indicator line */}
        <div className="flex items-center gap-2 text-xs text-cyan-400 font-semibold tracking-wider mb-2">
          <span className="w-5 h-0.5 bg-cyan-400 rounded-full inline-block"></span>
          <span>เชื่อมโยงภาพ • ควบคุมได้ • ความปลอดภัยที่มากกว่า</span>
        </div>

        {/* English Brand Headings with Cyan Glow */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-[#00AEEF] tracking-tight leading-none mb-1 drop-shadow-md">
          SRI CCTV INTEGRATE
        </h1>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00AEEF] via-sky-300 to-white tracking-tight leading-tight mb-3">
          Command & Control
        </h2>

        {/* Thai Subhead */}
        <div className="mb-2.5">
          <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white tracking-wide">
            ศูนย์บริหารระบบทะเบียนกลางกล้องวงจรปิด จังหวัดสระบุรี
          </h3>
          <p className="text-[11px] sm:text-xs text-cyan-300/80 font-medium">
            (Saraburi CCTV CCOC)
          </p>
        </div>

        {/* Paragraph description */}
        <p className="text-xs text-slate-300 leading-relaxed max-w-lg mb-4 line-clamp-3">
          บูรณาการข้อมูลกล้องวงจรปิด ครอบคลุมทุกพื้นที่ในจังหวัดสระบุรี เพื่อความปลอดภัยของประชาชน และการบริหารจัดการอย่างมีประสิทธิภาพ
        </p>

        {/* 4 Feature Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-xl">
          {/* Card 1 */}
          <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-[#081226]/75 backdrop-blur-md border border-cyan-500/20 hover:border-cyan-400/50 hover:bg-[#081226]/90 transition duration-200">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-1.5 shadow-inner">
              <Camera className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-white leading-tight">ติดตามสถานการณ์</span>
            <span className="text-[9px] text-slate-400 mt-0.5">แบบเรียลไทม์</span>
          </div>

          {/* Card 2 */}
          <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-[#081226]/75 backdrop-blur-md border border-blue-500/20 hover:border-blue-400/50 hover:bg-[#081226]/90 transition duration-200">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-1.5 shadow-inner">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-white leading-tight">ครอบคลุมทุกพื้นที่</span>
            <span className="text-[9px] text-slate-400 mt-0.5">ทั้งจังหวัดสระบุรี</span>
          </div>

          {/* Card 3 */}
          <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-[#081226]/75 backdrop-blur-md border border-teal-500/20 hover:border-teal-400/50 hover:bg-[#081226]/90 transition duration-200">
            <div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-1.5 shadow-inner">
              <BarChart3 className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-white leading-tight">บริหารจัดการข้อมูล</span>
            <span className="text-[9px] text-slate-400 mt-0.5">อย่างมีประสิทธิภาพ</span>
          </div>

          {/* Card 4 */}
          <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-[#081226]/75 backdrop-blur-md border border-sky-500/20 hover:border-sky-400/50 hover:bg-[#081226]/90 transition duration-200">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-1.5 shadow-inner">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-white leading-tight">เสริมสร้าง</span>
            <span className="text-[9px] text-slate-400 mt-0.5">ความปลอดภัย</span>
          </div>
        </div>
      </main>

      {/* BOTTOM FLOATING STATS GLASS BAR */}
      <footer className="relative z-20 px-4 lg:px-12 pb-4 lg:pb-5 shrink-0">
        <div className="w-full max-w-6xl mx-auto rounded-2xl bg-[#081226]/85 backdrop-blur-xl border border-[#00AEEF]/30 shadow-2xl shadow-cyan-950/60 p-3 sm:p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 divide-y md:divide-y-0 md:divide-x divide-white/10">
            {/* Stat 1: Total Cameras */}
            <div className="flex items-center gap-3 px-2 sm:px-3 py-1">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#005BAC]/40 to-[#00AEEF]/20 border border-[#00AEEF]/40 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4 text-[#00AEEF]" />
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-black text-white">{stats.total_cameras}</span>
                  <span className="text-[11px] text-slate-400 font-semibold">จุด</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">จำนวนกล้อง (ทั้งจังหวัด)</p>
              </div>
            </div>

            {/* Stat 2: Online Cameras */}
            <div className="flex items-center gap-3 px-2 sm:px-3 py-1">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse"></span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-black text-emerald-400">{stats.online_cameras}</span>
                  <span className="text-[11px] text-slate-400 font-semibold">จุด</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">พร้อมใช้งาน (ONLINE)</p>
              </div>
            </div>

            {/* Stat 3: Offline Cameras */}
            <div className="flex items-center gap-3 px-2 sm:px-3 py-1">
              <div className="w-9 h-9 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                <span className="w-3 h-3 rounded-full bg-red-400 shadow-[0_0_10px_#f87171]"></span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-black text-red-400">{stats.offline_cameras}</span>
                  <span className="text-[11px] text-slate-400 font-semibold">จุด</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">ชำรุดรอแก้ไข</p>
              </div>
            </div>

            {/* Stat 4: Total Budget */}
            <div className="flex items-center gap-3 px-2 sm:px-3 py-1">
              <div className="w-9 h-9 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-black text-white">
                    {stats.total_budget > 0 ? `${(stats.total_budget / 1000000).toFixed(1)}M` : '-'}
                  </span>
                  {stats.total_budget > 0 && <span className="text-[11px] text-slate-400 font-semibold">บาท</span>}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">งบจัดซื้อจัดจ้างสะสม</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
