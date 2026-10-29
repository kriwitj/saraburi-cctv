import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, LogIn } from 'lucide-react';
import { API_BASE_URL } from '../api/client';

const ERROR_MESSAGES: Record<string, string> = {
  sso_failed: 'ไม่สามารถยืนยันตัวตนผ่าน Keycloak ได้ กรุณาลองใหม่อีกครั้ง',
  unregistered: 'บัญชีนี้ยังไม่ได้ลงทะเบียนในระบบ กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์การใช้งาน',
  inactive: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
};

export default function Login() {
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');

  const handleKeycloakLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/keycloak/login`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#070b13] text-white">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#005BAC]/15 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00AEEF]/10 rounded-full blur-[120px] animate-pulse"></div>

      <div className="w-[1000px] h-[600px] rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_30px_70px_rgba(0,0,0,0.5)] flex overflow-hidden z-10">
        <div className="w-1/2 bg-gradient-to-br from-[#005BAC]/80 to-[#00AEEF]/70 p-12 flex flex-col justify-between relative">
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
            <h2 className="text-3xl font-extrabold text-white mt-12 leading-snug">
              ระบบทะเบียนกลางและ <br />ศูนย์บูรณาการจังหวัด
            </h2>
            <p className="text-xs text-sky-100 mt-4 leading-relaxed">
              สอดคล้องนโยบายแผนจัดซื้อจัดจ้างรายปีขององค์กรปกครองส่วนท้องถิ่น ป้องกันการจัดซื้อพิกัดทับซ้อนและลดจุดบอดพื้นที่จังหวัด
            </p>
          </div>
          <img src="https://upload.wikimedia.org/wikipedia/commons/0/06/Seal_Saraburi.png" alt="Saraburi" className="w-12 h-12 object-contain self-start relative z-10" />
        </div>

        <div className="w-1/2 p-12 flex flex-col justify-center">
          <h3 className="text-2xl font-bold text-white mb-2">เข้าสู่ระบบ / Sign In</h3>
          <p className="text-xs text-slate-400 mb-8">เข้าสู่ระบบทะเบียนกลางจังหวัดผ่านบัญชีผู้ใช้งานกลาง (Keycloak SSO)</p>

          {error && (
            <div className="mb-6 text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded-md px-4 py-3">
              {ERROR_MESSAGES[error] || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง'}
            </div>
          )}

          <button
            onClick={handleKeycloakLogin}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#005BAC] to-[#00AEEF] hover:opacity-90 text-white font-bold py-3 rounded-md shadow-lg shadow-sky-500/25 transition cursor-pointer text-sm"
          >
            <LogIn className="w-4 h-4" />
            เข้าสู่ระบบด้วย Keycloak
          </button>
        </div>
      </div>
    </div>
  );
}
