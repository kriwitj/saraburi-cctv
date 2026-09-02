import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { apiClient, extractErrorMessage } from '../api/client';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

export default function Login({ onLoginSuccess, addToast }: LoginProps) {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const tokenRes = await apiClient.post('/auth/login', {
        username: usernameInput,
        password: passwordInput,
      });
      const token = tokenRes.data.access_token;
      localStorage.setItem('srb_token', token);

      const meRes = await apiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      onLoginSuccess(meRes.data);
      navigate('/dashboard');
      addToast('เข้าสู่ระบบสำเร็จ สิทธิ์: ' + meRes.data.role, 'success');
    } catch (err: any) {
      localStorage.removeItem('srb_token');
      addToast(extractErrorMessage(err, 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง'), 'error');
    } finally {
      setIsSubmitting(false);
    }
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
          <p className="text-xs text-slate-400 mb-8">กรุณากรอกรหัสผ่านเพื่อเข้าใช้งานระบบทะเบียนกลางจังหวัด</p>
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">ชื่อผู้ใช้งาน (Username)</label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="srb_super_admin"
                className="w-full bg-[#0a0f1d] border border-white/10 rounded-md py-2.5 px-4 text-sm text-white focus:outline-none focus:border-[#00f2fe]"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">รหัสผ่าน (Password)</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="ป้อนรหัสผ่าน"
                  className="w-full bg-[#0a0f1d] border border-white/10 rounded-md py-2.5 px-4 text-sm text-white focus:outline-none focus:border-[#00f2fe]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 w-full bg-gradient-to-r from-[#005BAC] to-[#00AEEF] hover:opacity-90 disabled:opacity-50 text-white font-bold py-3 rounded-md shadow-lg shadow-sky-500/25 transition cursor-pointer text-sm"
            >
              {isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบระบบกลาง'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
