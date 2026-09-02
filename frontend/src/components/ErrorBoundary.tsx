import React from 'react';
import { AlertOctagon } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#070b13] text-white p-8">
          <div className="max-w-lg w-full bg-[#121a2f] border border-red-500/30 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
            <AlertOctagon className="w-10 h-10 text-red-400" />
            <h2 className="text-lg font-bold">เกิดข้อผิดพลาดในการแสดงผลหน้านี้</h2>
            <p className="text-xs text-slate-400 break-words">{this.state.error.message}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              className="mt-2 px-4 py-2 bg-[#005BAC] hover:bg-[#0068c9] rounded-lg text-sm font-semibold transition cursor-pointer"
            >
              โหลดหน้านี้ใหม่
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
