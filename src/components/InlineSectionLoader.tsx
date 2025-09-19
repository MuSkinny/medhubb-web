"use client";

interface InlineSectionLoaderProps {
  sectionName: string;
  userType?: "doctor" | "patient";
  className?: string;
  compact?: boolean;
}

export default function InlineSectionLoader({ 
  sectionName, 
  userType = "doctor",
  className = "",
  compact = false
}: InlineSectionLoaderProps) {
  const gradient = userType === "doctor" 
    ? "from-blue-500 to-blue-600" 
    : "from-green-500 to-green-600";

  const primaryColor = userType === "doctor" ? "blue" : "green";

  return (
    <div className={`flex items-center justify-center ${compact ? 'py-12' : 'py-24'} ${className}`}>
      <div className="text-center animate-fade-in">
        {/* Skeleton Cards Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="healthcare-card animate-pulse-soft"
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              <div className="space-y-4">
                <div className={`w-16 h-16 bg-gradient-to-br ${gradient} rounded-2xl mx-auto opacity-20 animate-pulse`}></div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded-lg mx-auto w-24 animate-pulse"></div>
                  <div className="h-3 bg-slate-100 rounded mx-auto w-32 animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Loading Icon e Testo */}
        <div className="relative mb-6">
          <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg animate-pulse-soft`}>
            <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </div>
        </div>

        <h3 className="text-xl font-bold text-slate-800 mb-2">
          Caricamento {sectionName}
        </h3>
        <p className="text-slate-600 mb-6">
          Preparazione dei dati in corso...
        </p>

        {/* Progress Indicator */}
        <div className="flex justify-center items-center space-x-2">
          <div className="flex space-x-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full bg-${primaryColor}-400`}
                style={{
                  animation: `pulse-wave 1.5s ease-in-out infinite`,
                  animationDelay: `${i * 0.1}s`
                }}
              ></div>
            ))}
          </div>
        </div>

        {/* Status Text */}
        <div className="mt-4 text-sm text-slate-500">
          <div className="flex items-center justify-center space-x-2">
            <div className={`w-2 h-2 rounded-full bg-${primaryColor}-500 animate-pulse`}></div>
            <span>Connessione sicura stabilita</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-wave {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}
