export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                {/* <p className="text-slate-500 animate-pulse">Yükleniyor...</p> */}
                {/* Text is removed for a cleaner look, but spinner remains as a fallback for routes without skeletons */}
            </div>
        </div>
    )
}
