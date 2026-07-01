import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar({ userRole = 'ADMIN' }) {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <div className="w-64 h-screen bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4">
            <div>
                <div className="flex items-center gap-2 px-2 py-4 mb-6">
                    <div className="w-7 h-7 bg-gradient-to-tr from-sky-500 to-emerald-500 rounded-lg flex items-center justify-center font-black text-white text-sm">M</div>
                    <span className="text-lg font-bold text-white tracking-tight">My AI 플랫폼</span>
                </div>

                <nav className="space-y-1.5">
                    <button
                        onClick={() => navigate('/')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-all ${
                            isActive('/')
                                ? 'bg-sky-600 text-white shadow-md'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                    >
                        <span className="text-base">📄</span> PDF 파일 요약
                    </button>
                </nav>
            </div>

            <div>
                {userRole === 'ADMIN' && (
                    <div className="border-t border-slate-800 pt-4 mb-2">
                        <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5">
                            System Governance
                        </p>
                        
                        <button
                            onClick={() => navigate('/admin/code-manager')}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold transition-all border ${
                                isActive('/admin')
                                    ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40 shadow-lg'
                                    : 'text-slate-400 bg-slate-950/30 border-transparent hover:bg-slate-800 hover:text-slate-200 hover:border-slate-700'
                            }`}
                        >
                            <span className="text-base">⚙️</span> 프롬프트 거버넌스
                        </button>
                    </div>
                )}
                
                <div className="px-3 py-2 border-t border-slate-800/50 mt-2 text-center">
                    <span className="text-xs text-slate-600 font-mono tracking-wider">v1.2.0-Enterprise</span>
                </div>
            </div>
        </div>
    );
}
