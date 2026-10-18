export default function Legend() {
  return (
    <div className="absolute bottom-24 left-4 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-[10px] text-slate-400 backdrop-blur-xl md:bottom-4">
      <div className="mb-1 uppercase tracking-wider">Fire radiative power</div>
      <div className="h-1.5 w-40 rounded-full bg-gradient-to-r from-yellow-300 via-orange-400 via-60% to-rose-200" />
      <div className="mt-1 flex justify-between">
        <span>low</span>
        <span>high</span>
      </div>
    </div>
  );
}
