"use client";

interface SectionLoaderProps {
  sectionName: string;
  userType?: "doctor" | "patient";
  className?: string;
}

export default function SectionLoader({ 
  sectionName, 
  userType = "doctor",
  className = "" 
}: SectionLoaderProps) {
  const gradient = userType === "doctor" 
    ? "from-blue-500 to-blue-600" 
    : "from-green-500 to-green-600";
    
  const bgGradient = userType === "doctor"
    ? "from-blue-50/30 via-white to-green-50/30"
    : "from-green-50/30 via-white to-blue-50/30";

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient} flex items-center justify-center ${className}`}>
      <div className="text-center animate-fade-in">
        {/* Logo animato */}
        <div className="relative mb-8">
          <div className={`w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-2xl animate-pulse-soft`}>
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
          </div>
          
          {/* Anelli di caricamento */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-28 h-28 border-4 border-transparent border-t-blue-400 rounded-full animate-spin`}></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-36 h-36 border-4 border-transparent border-r-green-400 rounded-full animate-spin`} style={{animationDirection: 'reverse', animationDuration: '2s'}}></div>
          </div>
        </div>

        {/* Testo dinamico */}
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-slate-800">
            Caricamento {sectionName}
          </h3>
          <p className="text-slate-600 max-w-md mx-auto">
            Stiamo preparando i tuoi dati. Questo richiederà solo un momento...
          </p>
        </div>

        {/* Barra di progresso animata */}
        <div className="mt-8 w-80 max-w-full mx-auto">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r ${gradient} rounded-full animate-pulse`} 
                 style={{
                   width: '100%',
                   animation: 'loading-bar 2s ease-in-out infinite'
                 }}>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Preparazione in corso...</p>
        </div>

        {/* Dots animati */}
        <div className="flex justify-center space-x-2 mt-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full bg-gradient-to-r ${gradient}`}
              style={{
                animation: `bounce 1.4s ease-in-out infinite`,
                animationDelay: `${i * 0.16}s`
              }}
            ></div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes loading-bar {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
