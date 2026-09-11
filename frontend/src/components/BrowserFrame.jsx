export default function BrowserFrame({ src, alt, url = 'app.rhsaas.com.br', className = '' }) {
  return (
    <div className={`rounded-xl overflow-hidden bg-white shadow-2xl border border-black/5 ${className}`}>
      <div className="flex items-center gap-3 bg-gray-50 border-b border-black/5 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
        </div>
        <div className="flex-1 bg-white border border-gray-200 rounded-md px-3 py-1 text-[11px] text-gray-400 font-sans">
          {url}
        </div>
      </div>
      <img src={src} alt={alt} className="w-full block" />
    </div>
  );
}
