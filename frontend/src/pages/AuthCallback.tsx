import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient, extractErrorMessage } from '../api/client';

interface AuthCallbackProps {
  onLoginSuccess: (user: any) => void;
  addToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

// รับ token จาก redirect ของ /api/v1/auth/keycloak/callback แล้วแลกเป็นข้อมูลผู้ใช้งานปัจจุบัน
export default function AuthCallback({ onLoginSuccess, addToast }: AuthCallbackProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const token = searchParams.get('token');
    if (!token) {
      navigate('/login?error=sso_failed', { replace: true });
      return;
    }

    localStorage.setItem('srb_token', token);
    apiClient.get('/auth/me')
      .then((res) => {
        onLoginSuccess(res.data);
        navigate('/dashboard', { replace: true });
        addToast('เข้าสู่ระบบสำเร็จ สิทธิ์: ' + res.data.role, 'success');
      })
      .catch((err) => {
        localStorage.removeItem('srb_token');
        addToast(extractErrorMessage(err, 'ไม่สามารถเข้าสู่ระบบได้'), 'error');
        navigate('/login?error=sso_failed', { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070b13] text-slate-400 text-sm">
      กำลังเข้าสู่ระบบ...
    </div>
  );
}
