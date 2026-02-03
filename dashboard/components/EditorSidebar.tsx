interface EditorSidebarProps {
    steps?: any[];
    onStepClick?: (frame: number) => void;
}

export const EditorSidebar: React.FC<EditorSidebarProps> = ({ steps = [], onStepClick }) => {
    return (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto">
            <div className="p-4 flex flex-col gap-6">
                {/* Add Steps Button */}
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm text-gray-700 font-medium">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add steps
                </button>

                {/* Steps Section */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 block">Flow steps</h3>
                    <div className="flex flex-col gap-3">
                        {steps.length > 0 ? (
                            steps.map((step, index) => (
                                <div
                                    key={step.id}
                                    onClick={() => onStepClick?.(step.startFrame || 0)}
                                    className={`group cursor-pointer transition-all ${index === 0 ? 'ring-2 ring-blue-500 rounded-xl' : 'hover:ring-1 hover:ring-gray-300 rounded-xl'}`}
                                >
                                    <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden relative">
                                        {step.imageUrl && (
                                            <img
                                                src={step.imageUrl}
                                                alt={`Step ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                                            {String(index + 1).padStart(2, '0')}
                                        </div>
                                    </div>
                                    <div className="mt-1.5 flex flex-col px-1">
                                        <span className="text-[11px] font-bold text-gray-900 truncate">{step.scriptText || `Step ${index + 1}`}</span>
                                        <span className="text-[9px] text-gray-500">{Math.round(step.durationFrames / 30)}s</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="border border-blue-500 rounded-xl overflow-hidden cursor-pointer group relative">
                                <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '8px 8px' }}></div>
                                    <div className="bg-white rounded-lg shadow-sm p-2 group-hover:scale-105 transition-transform duration-200">
                                        <div className="w-6 h-6 flex items-center justify-center">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute inset-0 border-2 border-blue-500 rounded-xl pointer-events-none"></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
