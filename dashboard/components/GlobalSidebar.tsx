'use client';

import React from 'react';

interface GlobalSidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

export const GlobalSidebar: React.FC<GlobalSidebarProps> = ({ isCollapsed, onToggle }) => {
    return (
        <div className={`bg-[#F5F5F7] border-r border-gray-200 flex flex-col h-full bg-opacity-50 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-60'}`}>
            {/* Branding */}
            <div className={`p-4 flex items-center mb-2 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                <div className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                    <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <span className="text-lg font-bold text-gray-900 tracking-tight whitespace-nowrap">Guideflow.</span>
                </div>
                <button
                    onClick={onToggle}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                </button>
            </div>

            {/* Workspace Switcher */}
            <div className={`px-2 mb-6 ${isCollapsed ? 'flex justify-center' : ''}`}>
                <button className={`flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-all group ${isCollapsed ? 'w-10 h-10 justify-center' : 'w-full justify-between'}`}>
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-6 h-6 bg-gray-100 rounded border border-gray-200 flex items-center justify-center flex-shrink-0">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 21h18M3 7v1a3 3 0 0 0 6 0V7m6 0v1a3 3 0 0 0 6 0V7M7 1h1m8 0h1m-9 20V3m8 18V3" />
                            </svg>
                        </div>
                        {!isCollapsed && <span className="text-sm font-medium text-gray-700 truncate">Fifth Third Ban</span>}
                    </div>
                    {!isCollapsed && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
                        </svg>
                    )}
                </button>
            </div>

            {/* PRODUCTS Section */}
            <div className="px-2 flex flex-col gap-1">
                {!isCollapsed && <h3 className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">PRODUCTS</h3>}
                <nav className="flex flex-col gap-0.5">
                    {[
                        { name: 'Interactive demo', icon: <path d="m12 19 7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.5 1.5" />, active: true },
                        { name: 'Sandbox', icon: <path d="M7 10v4h3v-4H7zM3 3h18v18H3V3zm2 2v14h14V5H5zm2 5h10v6H7v-6z" /> },
                        { name: 'Demo center', icon: <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3m18 0v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8m18 0-9-4-9 4m18 0-9 4-9-4" /> },
                        { name: 'Live demo', icon: <path d="M12 20h9M3 20h3M3 13h1m3 0h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v3h10M3 13v7" /> },
                        { name: 'Analytics', icon: <path d="M18 20V10M12 20V4M6 20v-6" /> },
                    ].map((item) => (
                        <button
                            key={item.name}
                            title={isCollapsed ? item.name : undefined}
                            className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all group ${item.active ? 'bg-gray-200 text-gray-900 shadow-sm' : 'text-gray-500 hover:bg-gray-100'
                                } ${isCollapsed ? 'justify-center px-0 w-10 h-10 mx-auto' : 'w-full'}`}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                                {item.icon}
                            </svg>
                            {!isCollapsed && <span className="truncate">{item.name}</span>}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Bottom Section */}
            <div className="mt-8 px-2 pb-4 flex flex-col gap-0.5">
                {[
                    { name: 'Offline guideflows', icon: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></> },
                    { name: 'Affiliate program', icon: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> },
                    { name: 'Chrome Extension', icon: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" /><line x1="20" y1="12" x2="22" y2="12" /><line x1="2" y1="12" x2="4" y2="12" /></> },
                    { name: 'Integrations', icon: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></> },
                    { name: 'Help Center', icon: <><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></> },
                    { name: 'Settings', icon: <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.72v.18a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></> },
                ].map((item) => (
                    <button
                        key={item.name}
                        title={isCollapsed ? item.name : undefined}
                        className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-all ${isCollapsed ? 'justify-center px-0 w-10 h-10 mx-auto' : 'w-full'}`}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                            {item.icon}
                        </svg>
                        {!isCollapsed && <span className="truncate">{item.name}</span>}
                    </button>
                ))}

                <div className={`mt-4 bg-white border border-gray-100 rounded-xl shadow-sm flex items-center group cursor-pointer hover:bg-gray-50 transition-all ${isCollapsed ? 'w-10 h-10 justify-center p-0 mx-auto' : 'px-4 py-3 justify-between'}`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                            ES
                        </div>
                        {!isCollapsed && (
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-xs font-semibold text-gray-900 truncate">ethan shen</span>
                                <span className="text-[10px] text-gray-500 truncate">dominickshen@163....</span>
                            </div>
                        )}
                    </div>
                    {!isCollapsed && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                            <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
                        </svg>
                    )}
                </div>
            </div>
        </div>
    );
};
