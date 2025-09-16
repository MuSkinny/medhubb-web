import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header - Topbar */}
      <header
        className="border-b animate-fade-in"
        style={{
          height: '60px',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-card)'
        }}
      >
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center h-full">
          <div className="flex items-center space-x-3">
            <div
              className="flex items-center justify-center"
              style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, var(--primary-blue) 0%, #5DADE2 100%)',
                borderRadius: '12px'
              }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <h1
              className="font-semibold"
              style={{
                fontSize: '24px',
                color: 'var(--text-primary)',
                fontWeight: 600
              }}
            >
              MedHubb
            </h1>
          </div>
          <Link
            href="/login"
            className="healthcare-button primary"
          >
            Accedi
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 animate-fade-in">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="font-bold mb-6"
              style={{
                fontSize: '48px',
                color: 'var(--text-primary)',
                lineHeight: '1.2',
                fontWeight: 700
              }}
            >
              La tua salute,{' '}
              <span style={{
                background: 'linear-gradient(135deg, var(--primary-blue) 0%, #8E44AD 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                gestita con cura
              </span>
            </h2>
            <p
              className="max-w-3xl mx-auto"
              style={{
                fontSize: '18px',
                color: 'var(--text-secondary)',
                lineHeight: '1.8',
                fontWeight: 400
              }}
            >
              MedHubb è la piattaforma digitale che connette medici e pazienti,
              rendendo l'assistenza sanitaria più accessibile, efficiente e personalizzata.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {[
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z"/>
                ),
                title: "Per i Medici",
                description: "Gestisci i tuoi pazienti, le visite e la documentazione medica in modo semplice e sicuro.",
                gradient: "linear-gradient(135deg, #4A90E2 0%, #5DADE2 100%)"
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                ),
                title: "Per i Pazienti",
                description: "Prenota visite, consulta i tuoi referti e mantieni sotto controllo la tua salute.",
                gradient: "linear-gradient(135deg, #27AE60 0%, #2ECC71 100%)"
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                ),
                title: "Sicurezza",
                description: "I tuoi dati sanitari sono protetti con i più alti standard di sicurezza e privacy.",
                gradient: "linear-gradient(135deg, #8E44AD 0%, #9B59B6 100%)"
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="healthcare-card text-center animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div
                  className="w-16 h-16 flex items-center justify-center mx-auto mb-6"
                  style={{
                    background: feature.gradient,
                    borderRadius: '12px'
                  }}
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {feature.icon}
                  </svg>
                </div>
                <h3
                  className="font-semibold mb-3"
                  style={{
                    fontSize: '18px',
                    color: 'var(--text-primary)',
                    fontWeight: 600
                  }}
                >
                  {feature.title}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5'
                }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Call to Action */}
          <div className="healthcare-card p-12 animate-fade-in">
            <div className="text-center mb-8">
              <h3
                className="font-bold mb-4"
                style={{
                  fontSize: '32px',
                  color: 'var(--text-primary)',
                  fontWeight: 700
                }}
              >
                Inizia subito con MedHubb
              </h3>
              <p style={{
                fontSize: '18px',
                color: 'var(--text-secondary)'
              }}>
                Scegli il tipo di registrazione più adatto a te e inizia a utilizzare la piattaforma.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <Link
                href="/register/doctor"
                className="healthcare-colored-card text-center transition-all duration-250 hover:transform hover:scale-102"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(255, 255, 255, 0.2)' }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                </div>
                <h4 className="text-xl font-semibold mb-2">Sono un Medico</h4>
                <p className="text-sm opacity-90">
                  Registrati per gestire i tuoi pazienti e la tua pratica medica
                </p>
              </Link>

              <Link
                href="/register/patient"
                className="healthcare-colored-card green text-center transition-all duration-250 hover:transform hover:scale-102"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(255, 255, 255, 0.2)' }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                  </svg>
                </div>
                <h4 className="text-xl font-semibold mb-2">Sono un Paziente</h4>
                <p className="text-sm opacity-90">
                  Registrati per prenotare visite e gestire la tua salute
                </p>
              </Link>
            </div>

            <div className="text-center mt-8">
              <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>Hai già un account?</p>
              <Link
                href="/login"
                className="inline-flex items-center font-medium transition-colors duration-150 hover:opacity-80"
                style={{ color: 'var(--primary-blue)' }}
              >
                Accedi qui
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-12 text-white"
        style={{ background: 'var(--text-primary)' }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div
                className="flex items-center justify-center"
                style={{
                  width: '32px',
                  height: '32px',
                  background: 'linear-gradient(135deg, var(--primary-blue) 0%, var(--secondary-green) 100%)',
                  borderRadius: '8px'
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
              </div>
              <span className="text-lg font-semibold">MedHubb</span>
            </div>
            
          </div>
          <div className="mt-8 pt-8 border-t text-center" style={{ borderColor: 'var(--text-secondary)', color: 'var(--text-secondary)' }}>
            <p>&copy; 2025 MedHubb. Tutti i diritti riservati.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
