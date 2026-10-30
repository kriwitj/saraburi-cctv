import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Shield, LogIn, Key, User, ArrowRight } from 'lucide-react';
import { API_BASE_URL, apiClient, extractErrorMessage } from '../api/client';

const ERROR_MESSAGES: Record<string, string> = {
  sso_failed: 'ไม่สามารถยืนยันตัวตนผ่าน Keycloak ได้ กรุณาลองใหม่อีกครั้ง',
  unregistered: 'บัญชีนี้ยังไม่ได้ลงทะเบียนในระบบ กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์การใช้งาน',
  inactive: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
};

const TEST_ACCOUNTS = [
  { label: 'Super Admin', username: 'srb_super_admin', role: 'แอดมินจังหวัด (CRUD ทั้งหมด)' },
  { label: 'ผู้ว่าฯ / คณะกรรมการ', username: 'gov_viewer', role: 'Read-only ทั้งจังหวัด' },
  { label: 'นายอำเภอเมือง', username: 'district_1901', role: 'เฉพาะอำเภอเมืองสระบุรี' },
  { label: 'เจ้าหน้าที่ อปท.', username: 'localgov_la190101', role: 'เทศบาลเมืองสระบุรี' },
  { label: 'ช่างเทคนิค MA', username: 'ma_tech', role: 'รับงานซ่อมและปิดงาน' },
  { label: 'ตำรวจ / คดี', username: 'police_srb', role: 'ขอดึงภาพตามคำร้อง PDPA' },
];

interface LoginProps {
  onLoginSuccess?: (user: any) => void;
  addToast?: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

export default function Login({ onLoginSuccess, addToast }: LoginProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const errorParam = searchParams.get('error');

  const [username, setUsername] = useState('srb_super_admin');
  const [password, setPassword] = useState('password_123');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(
    errorParam ? ERROR_MESSAGES[errorParam] || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' : null
  );

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setLoginError('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน');
      return;
    }

    setLoading(true);
    setLoginError(null);
    try {
      const res = await apiClient.post('/auth/login', {
        username: username.trim(),
        password: password.trim(),
      });

      const token = res.data.access_token;
      localStorage.setItem('srb_token', token);

      // Fetch user profile
      const meRes = await apiClient.get('/auth/me');
      if (onLoginSuccess) {
        onLoginSuccess(meRes.data);
      }
      if (addToast) {
        addToast(`ยินดีต้อนรับ ${meRes.data.full_name} (${meRes.data.role})`, 'success');
      }
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setLoginError(extractErrorMessage(err, 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeycloakLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/keycloak/login`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#070b13] text-white p-4">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#005BAC]/15 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00AEEF]/10 rounded-full blur-[120px] animate-pulse"></div>

      <div className="w-full max-w-[1050px] min-h-[620px] rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_30px_70px_rgba(0,0,0,0.5)] flex flex-col md:flex-row overflow-hidden z-10">
        
        {/* LEFT COLUMN: HERO BRANDING */}
        <div className="md:w-5/12 bg-gradient-to-br from-[#005BAC]/90 via-[#005BAC]/75 to-[#00AEEF]/80 p-8 md:p-12 flex flex-col justify-between relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.3))]"></div>
          <div className="relative z-10">
            <div className="flex gap-3 mb-4 items-center">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md">
                <Shield className="w-6 h-6 text-[#005BAC]" />
              </div>
              <div>
                <h3 className="font-bold text-white tracking-wider text-sm">SARABURI PROVINCE</h3>
                <p className="text-[10px] text-sky-200">ทะเบียนกลางกล้อง CCTV</p>
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-8 md:mt-12 leading-snug">
              ระบบทะเบียนกลางและ <br />ศูนย์บูรณาการจังหวัด
            </h2>
            <p className="text-xs text-sky-100 mt-4 leading-relaxed">
              สอดคล้องนโยบายแผนจัดซื้อจัดจ้างรายปีขององค์กรปกครองส่วนท้องถิ่น ป้องกันการจัดซื้อพิกัดทับซ้อนและลดจุดบอดพื้นที่จังหวัดตามระเบียบ PDPA
            </p>
          </div>
          
          <div className="relative z-10 mt-8 flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="ตราสัญลักษณ์สระบุรี" 
              className="w-12 h-12 object-contain rounded-full bg-white/20 p-1 shadow-md"
              onError={(e) => {
                // Fallback to empty if not loaded
                (e.target as HTMLElement).style.display = 'none';
              }} 
            />
            <div className="text-[11px] text-sky-100 font-semibold leading-tight">
              ศูนย์ปฏิบัติการความมั่นคงและจราจร <br />
              <span className="text-[10px] text-sky-200">จังหวัดสระบุรี & สำนักงานสถิติจังหวัด</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LOGIN FORM */}
        <div className="md:w-7/12 p-8 md:p-12 flex flex-col justify-center bg-[#0d1322]/80">
          <div className="mb-6">
            <h3 className="text-xl md:text-2xl font-bold text-white">เข้าสู่ระบบ / Sign In</h3>
            <p className="text-xs text-slate-400 mt-1">
              เข้าใช้งานระบบทะเบียนกลางกล้อง CCTV สระบุรี (Enterprise Command Center)
            </p>
          </div>

          {loginError && (
            <div className="mb-5 text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="font-bold">ข้อผิดพลาด:</span> {loginError}
            </div>
          )}

          {/* Quick Select Test Role Pills */}
          <div className="mb-5">
            <label className="text-[11px] font-bold text-[#00AEEF] block mb-2">
              เลือกสิทธิ์ทดสอบด่วน (Quick Switch RBAC):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TEST_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => {
                    setUsername(acc.username);
                    setPassword('password_123');
                    setLoginError(null);
                  }}
                  className={`text-left p-2 rounded-lg border text-[11px] transition cursor-pointer ${
                    username === acc.username
                      ? 'bg-[#005BAC]/30 border-[#00AEEF] text-white shadow-sm'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                  }`}
                >
                  <strong className="block text-sky-300 font-bold truncate">{acc.label}</strong>
                  <span className="text-[9px] text-slate-400 block truncate">{acc.role}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleStandardLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">ชื่อผู้ใช้งาน (Username)</label>
              <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 focus-within:border-[#00AEEF] transition">
                <User className="w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="เช่น srb_super_admin"
                  className="bg-transparent border-none text-xs text-white focus:outline-none w-full"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">รหัสผ่าน (Password)</label>
              <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 focus-within:border-[#00AEEF] transition">
                <Key className="w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="bg-transparent border-none text-xs text-white focus:outline-none w-full"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#005BAC] to-[#00AEEF] hover:opacity-95 text-white font-bold py-3 rounded-xl shadow-lg shadow-sky-500/25 transition cursor-pointer text-xs disabled:opacity-50"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ (Sign In)'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-4 text-[10px] text-slate-500 uppercase tracking-widest">หรือเข้าสู่ระบบองค์กร</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <button
            type="button"
            onClick={handleKeycloakLogin}
            className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold py-2.5 rounded-xl transition cursor-pointer text-xs"
          >
            <LogIn className="w-4 h-4 text-[#00AEEF]" />
            เข้าสู่ระบบด้วย Keycloak SSO
          </button>
        </div>

      </div>
    </div>
  );
}
