// App.tsx - Saraburi CCTV Enterprise Command Center Routing Hub
import React, { useEffect, useState } from 'react';
import {
  BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation
} from 'react-router-dom';
import {
  Shield, Camera, LayoutDashboard, Wrench, FileText, History, Settings as SettingsIcon, UserCheck,
  Sun, Moon, Maximize, Languages, LogOut, ChevronLeft, ChevronRight,
  CheckCircle, AlertOctagon, AlertTriangle, Database
} from 'lucide-react';

// Import Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GisMap from './pages/GisMap';
import Cameras from './pages/Cameras';
import Maintenance from './pages/Maintenance';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import MasterData from './pages/MasterData';

// Import Components
import { PDPAStreamPlayer } from './components/PDPAStreamPlayer';
import { apiClient } from './api/client';
import { useAuditLogs, useCameras, useProjects, useTickets, useUsers } from './api/hooks';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [language, setLanguage] = useState<'TH' | 'EN'>('TH');

  const [toasts, setToasts] = useState<{id: number, message: string, type: 'success' | 'error' | 'warning'}[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning') => {
    const id = toasts.length ? Math.max(...toasts.map(t => t.id)) + 1 : 1;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Restore session from a stored JWT so a page refresh doesn't force a re-login
  useEffect(() => {
    const token = localStorage.getItem('srb_token');
    if (!token) {
      setIsRestoringSession(false);
      return;
    }
    apiClient.get('/auth/me')
      .then(res => setCurrentUser(res.data))
      .catch(() => localStorage.removeItem('srb_token'))
      .finally(() => setIsRestoringSession(false));
  }, []);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // API-backed data — replaces the old in-memory mock arrays
  const camerasApi = useCameras();
  const usersApi = useUsers(!!currentUser);
  const ticketsApi = useTickets();
  const auditLogsApi = useAuditLogs(isSuperAdmin);
  const projectsApi = useProjects();

  // Re-fetch every scoped dataset whenever the logged-in account changes (login/switch user),
  // otherwise a different user briefly sees the previous account's cached, differently-scoped data.
  useEffect(() => {
    if (!currentUser) return;
    camerasApi.refetch();
    ticketsApi.refetch();
    projectsApi.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // CCTV Video Player State
  const [selectedCamForPlayer, setSelectedCamForPlayer] = useState<any>(null);

  const handleWatchStream = (cam: any) => {
    // The stream modal renders at the app root, outside any fullscreen element's DOM subtree —
    // the Fullscreen API only displays that subtree, so the modal would otherwise stay invisible.
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    }
    setSelectedCamForPlayer(cam);
  };

  const handleLogout = () => {
    localStorage.removeItem('srb_token');
    setCurrentUser(null);
    addToast('ออกจากระบบเรียบร้อย', 'success');
  };

  if (isRestoringSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070b13] text-slate-400 text-sm">
        กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...
      </div>
    );
  }

  return (
    <BrowserRouter>
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-[20000] flex flex-col gap-2">
        {toasts.map(toast => (
          <div key={toast.id} className={`flex items-center gap-3 p-4 rounded-lg shadow-lg border backdrop-blur-md transition-all duration-300 scale-95 hover:scale-100 ${
            toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
            toast.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
            'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {toast.type === 'error' && <AlertOctagon className="w-5 h-5" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
        ))}
      </div>

      <Routes>
        <Route
          path="/login"
          element={
            currentUser ? <Navigate to="/dashboard" replace /> :
            <Login onLoginSuccess={(user) => setCurrentUser(user)} addToast={addToast} />
          }
        />

        <Route
          path="/*"
          element={
            !currentUser ? <Navigate to="/login" replace /> :
            <MainLayout
              currentUser={currentUser}
              isDarkMode={isDarkMode}
              setIsDarkMode={setIsDarkMode}
              isSidebarCollapsed={isSidebarCollapsed}
              setIsSidebarCollapsed={setIsSidebarCollapsed}
              isPresentationMode={isPresentationMode}
              setIsPresentationMode={setIsPresentationMode}
              language={language}
              setLanguage={setLanguage}
              handleLogout={handleLogout}
            >
              <Routes>
                <Route path="/dashboard" element={<Dashboard currentUser={currentUser} auditLogs={auditLogsApi.data} />} />
                <Route
                  path="/gis"
                  element={
                    <GisMap
                      currentUser={currentUser}
                      cameras={camerasApi.data}
                      handleWatchStream={handleWatchStream}
                    />
                  }
                />
                <Route
                  path="/cameras"
                  element={
                    <Cameras
                      currentUser={currentUser}
                      cameras={camerasApi.data}
                      refetchCameras={camerasApi.refetch}
                      addToast={addToast}
                    />
                  }
                />
                <Route
                  path="/maintenance"
                  element={
                    <Maintenance
                      currentUser={currentUser}
                      cameras={camerasApi.data}
                      tickets={ticketsApi.data}
                      refetchTickets={ticketsApi.refetch}
                      addToast={addToast}
                    />
                  }
                />
                <Route
                  path="/users"
                  element={
                    <Users
                      currentUser={currentUser}
                      users={usersApi.data}
                      refetchUsers={usersApi.refetch}
                      addToast={addToast}
                    />
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <Reports
                      currentUser={currentUser}
                      projects={projectsApi.data}
                      refetchProjects={projectsApi.refetch}
                      addToast={addToast}
                    />
                  }
                />
                <Route path="/logs" element={<Logs auditLogs={auditLogsApi.data} />} />
                <Route path="/settings" element={<Settings addToast={addToast} />} />
                <Route path="/master-data" element={<MasterData isDarkMode={isDarkMode} addToast={addToast} />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </MainLayout>
          }
        />
      </Routes>

      {/* CCTV PLAYER MODAL WITH PDPA VERIFICATION WORKFLOW */}
      {selectedCamForPlayer && (
        <PDPAStreamPlayer
          camera={selectedCamForPlayer}
          onClose={() => setSelectedCamForPlayer(null)}
          addToast={addToast}
          auditLogs={auditLogsApi.data}
          setAuditLogs={() => auditLogsApi.refetch()}
        />
      )}
    </BrowserRouter>
  );
}

// MAIN LAYOUT WRAPPER (SIDEBAR + TOPBAR)
interface MainLayoutProps {
  currentUser: any;
  children: React.ReactNode;
  isDarkMode: boolean;
  setIsDarkMode: (a: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (a: boolean) => void;
  isPresentationMode: boolean;
  setIsPresentationMode: (a: boolean) => void;
  language: 'TH' | 'EN';
  setLanguage: (l: 'TH' | 'EN') => void;
  handleLogout: () => void;
}

function MainLayout({
  currentUser, children, isDarkMode, setIsDarkMode, isSidebarCollapsed, setIsSidebarCollapsed,
  isPresentationMode, setIsPresentationMode, language, setLanguage, handleLogout
}: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className={`flex h-screen overflow-hidden ${isPresentationMode ? 'presentation-active' : ''} ${
      isDarkMode ? 'bg-[#101418] text-white' : 'bg-[#F6F8FB] text-slate-800'
    }`}>
      <aside className={`border-r shrink-0 flex flex-col justify-between transition-all duration-300 ${
        isSidebarCollapsed ? 'w-20' : 'w-72'
      } ${isDarkMode ? 'bg-[#0b0f19] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>

        <div className="flex flex-col gap-6 p-4 overflow-y-auto flex-grow">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#005BAC] to-[#00AEEF] flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <div>
                <h3 className="font-extrabold text-sm tracking-wider">SRI CCTV INTEGRATE</h3>
                <p className="text-[9px] text-[#00AEEF]">Command & Control</p>
              </div>
            )}
          </div>

          <nav className="flex flex-col gap-1.5">
            {[
              { path: '/dashboard', label: 'แดชบอร์ดสรุปผู้บริหาร', icon: LayoutDashboard },
              { path: '/gis', label: 'แผนที่ GIS & กล้องวงจรปิด', icon: Camera },
              { path: '/cameras', label: 'ทะเบียนสินทรัพย์กล้อง', icon: Camera },
              { path: '/maintenance', label: 'แจ้งซ่อม & ประกันสัญญา MA', icon: Wrench },
              { path: '/users', label: 'จัดการสิทธิ์ & สังกัดพื้นที่', icon: UserCheck },
              { path: '/reports', label: 'รายงานงบจัดซื้อจัดจ้าง', icon: FileText },
              { path: '/logs', label: 'ประวัติความปลอดภัย & Logs', icon: History },
              { path: '/settings', label: 'ตั้งค่าการกู้คืน & ระบบ', icon: SettingsIcon },
              { path: '/master-data', label: 'ข้อมูลตั้งต้นระบบ (8 ชุด)', icon: Database }
            ].map(item => {
              const IconComp = item.icon;
              const isActive = currentPath === item.path;

              return (
                <div
                  key={item.path}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer group transition-all duration-200 ${
                    isActive
                      ? 'bg-[#005BAC]/15 border border-[#005BAC]/35 text-[#00AEEF]'
                      : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                  onClick={() => navigate(item.path)}
                >
                  <div className="flex items-center gap-3">
                    <IconComp className={`w-5 h-5 ${isActive ? 'text-[#00AEEF]' : 'text-slate-400 group-hover:text-white'}`} />
                    {!isSidebarCollapsed && <span className="text-xs font-semibold">{item.label}</span>}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/5 flex flex-col gap-2 bg-black/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sky-400 select-none">
              {currentUser.username.substring(0, 2).toUpperCase()}
            </div>
            {!isSidebarCollapsed && (
              <div className="overflow-hidden">
                <h4 className="font-bold text-xs truncate">{currentUser.full_name}</h4>
                <p className="text-[10px] text-slate-400 truncate">{currentUser.role}</p>
              </div>
            )}
            {!isSidebarCollapsed && (
              <button onClick={handleLogout} className="ml-auto text-slate-500 hover:text-red-400 transition cursor-pointer">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full py-1 text-center text-slate-600 hover:text-slate-400 transition flex items-center justify-center gap-1 mt-1 cursor-pointer"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      <div className={`flex-1 flex flex-col h-screen overflow-hidden ${
        isDarkMode ? 'bg-[#101418]' : 'bg-[#F6F8FB]'
      }`}>
        <header className={`border-b flex justify-between items-center p-4 px-8 ${
          isDarkMode ? 'bg-[#080d17] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div className="flex items-center gap-4">
            <div className="text-sm font-bold text-[#00AEEF]">
              ศูนย์ปฏิบัติการจังหวัดสระบุรี (Saraburi CCOC)
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
            <button
              onClick={() => setLanguage(language === 'TH' ? 'EN' : 'TH')}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-[#00AEEF] transition flex items-center gap-1 cursor-pointer"
            >
              <Languages className="w-4 h-4 text-slate-400" />
              <span>{language}</span>
            </button>
            <button
              onClick={() => setIsPresentationMode(!isPresentationMode)}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className={`flex-grow overflow-y-auto p-8 relative ${
          isDarkMode ? 'bg-[#101418]' : 'bg-[#F6F8FB]'
        }`}>
          {children}
        </div>
      </div>
    </div>
  );
}
