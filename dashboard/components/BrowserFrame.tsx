import React from 'react';

interface BrowserFrameProps {
    children: React.ReactNode;
    url?: string;
    className?: string;
}

export const BrowserFrame: React.FC<BrowserFrameProps> = ({
    children,
    url = 'My Guideflow',
    className = ''
}) => {
    return (
        <div className={`bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 ${className}`}>
            {/* Browser Chrome (Header) */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-4 h-12">
                {/* Traffic Lights */}
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#FF5F57] border border-[#E0443E]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#FEBC2E] border border-[#D89E24]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#28C840] border border-[#1AAB29]"></div>
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center gap-4 text-gray-400">
                    <div className="flex gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 4v6h-6" />
                        <path d="M1 20v-6h6" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                </div>

                {/* Address Bar */}
                <div className="flex-1 flex justify-center">
                    <div className="bg-white border border-gray-200 rounded-md px-3 py-1 flex items-center justify-center gap-2 text-sm text-gray-600 min-w-[200px] max-w-sm w-full mx-auto shadow-sm">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="2" y1="12" x2="22" y2="12" />
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                        <span className="truncate">{url}</span>
                    </div>
                </div>

                {/* Right side spacer / expand icon */}
                <div className="w-20 flex justify-end">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                        <polyline points="15 3 21 3 21 9" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white w-full h-full">
                {children}
            </div>
        </div>
    );
};
