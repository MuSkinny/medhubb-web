import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Header - Topbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/95 border-b border-slate-200/50 animate-fade-in shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <svg className="w-5 h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gradient-accent">
                  MedHubb
                </h1>
                <p className="text-xs lg:text-sm text-slate-600 font-medium hidden sm:block">
                  La tua salute, gestita con cura
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="medical-btn medical-btn-primary shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                </svg>
                Accedi
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 lg:py-24 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl animate-pulse-soft"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-200/30 rounded-full blur-3xl animate-pulse-soft" style={{animationDelay: '1s'}}></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column - Text Content */}
            <div className="text-center lg:text-left animate-fade-in">
              <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-6">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                Innovazione in Sanità Digitale
              </div>
              
              <h2 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
                La tua salute,{' '}
                <span className="text-gradient-accent">
                  gestita con cura
                </span>
              </h2>
              
              <p className="text-lg lg:text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                MedHubb è la piattaforma digitale che connette medici e pazienti,
                rendendo l&apos;assistenza sanitaria più <strong>accessibile</strong>, <strong>efficiente</strong> e <strong>personalizzata</strong>.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/register/patient"
                  className="medical-btn medical-btn-secondary text-lg px-8 py-4 shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                  Sono un Paziente
                </Link>
                <Link
                  href="/register/doctor"
                  className="medical-btn medical-btn-primary text-lg px-8 py-4 shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                  Sono un Medico
                </Link>
              </div>
            </div>
            
            {/* Right Column - Visual Element */}
            <div className="relative animate-fade-in" style={{animationDelay: '0.3s'}}>
              <div className="relative mx-auto max-w-lg">
                {/* Main Card */}
                <div className="medical-card-elevated p-8 shadow-2xl bg-white/95 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-green-500 shadow-lg">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-4">
                      Piattaforma Integrata
                    </h3>
                    <p className="text-slate-600 mb-6">
                      Gestione completa della relazione medico-paziente
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center text-green-700">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        Sicuro
                      </div>
                      <div className="flex items-center text-blue-700">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        Intuitivo
                      </div>
                      <div className="flex items-center text-purple-700">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        Veloce
                      </div>
                      <div className="flex items-center text-orange-700">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        24/7
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating Elements */}
                <div className="absolute -top-6 -right-6 w-12 h-12 bg-green-400 rounded-full shadow-lg animate-pulse-soft"></div>
                <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-blue-400 rounded-full shadow-lg animate-pulse-soft" style={{animationDelay: '0.5s'}}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24 bg-white/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-slate-800 mb-6">
              Una piattaforma completa per la <span className="text-gradient-accent">sanità digitale</span>
            </h2>
            <p className="text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto">
              Semplifichiamo la gestione sanitaria con strumenti moderni, sicuri e intuitivi
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z"/>
                ),
                title: "Per i Medici",
                description: "Dashboard completa per gestire pazienti, appuntamenti e documentazione medica con efficienza e precisione.",
                gradient: "from-blue-500 to-blue-600",
                features: ["Gestione pazienti", "Calendario integrato", "Prescrizioni digitali", "Report dettagliati"]
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                ),
                title: "Per i Pazienti",
                description: "Accesso semplice e sicuro alle informazioni sanitarie personali, prenotazioni e comunicazione con il medico.",
                gradient: "from-green-500 to-green-600",
                features: ["Prenotazione online", "Storico visite", "Referti digitali", "Messaggistica sicura"]
              },
              {
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                ),
                title: "Sicurezza Totale",
                description: "Protezione avanzata dei dati sanitari con crittografia end-to-end e conformità alle normative europee.",
                gradient: "from-purple-500 to-purple-600",
                features: ["Crittografia avanzata", "GDPR compliant", "Backup automatici", "Accesso controllato"]
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="group medical-card text-center hover:scale-105 transition-all duration-500 animate-fade-in"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className={`w-20 h-20 flex items-center justify-center mx-auto mb-6 rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {feature.icon}
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">
                  {feature.title}
                </h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  {feature.description}
                </p>
                <div className="space-y-2">
                  {feature.features.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-center text-sm text-slate-700">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                      </svg>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-green-600 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
          <div className="text-center mb-12">
            <h3 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Inizia subito con <span className="text-yellow-300">MedHubb</span>
            </h3>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Unisciti a migliaia di medici e pazienti che hanno già scelto la nostra piattaforma per una sanità più digitale e accessibile.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Link
              href="/register/doctor"
              className="group relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center transition-all duration-500 hover:bg-white/20 hover:scale-105 hover:shadow-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent rounded-2xl"></div>
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6 group-hover:bg-white/30 transition-colors">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 919.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                </div>
                <h4 className="text-2xl font-bold text-white mb-4">Sono un Medico</h4>
                <p className="text-blue-100 mb-6 leading-relaxed">
                  Accedi alla dashboard professionale per gestire pazienti, appuntamenti e documentazione medica
                </p>
                <div className="inline-flex items-center text-yellow-300 font-semibold group-hover:text-yellow-200 transition-colors">
                  Registrati ora
                  <svg className="ml-2 w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                  </svg>
                </div>
              </div>
            </Link>

            <Link
              href="/register/patient"
              className="group relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center transition-all duration-500 hover:bg-white/20 hover:scale-105 hover:shadow-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-transparent rounded-2xl"></div>
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6 group-hover:bg-white/30 transition-colors">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                  </svg>
                </div>
                <h4 className="text-2xl font-bold text-white mb-4">Sono un Paziente</h4>
                <p className="text-blue-100 mb-6 leading-relaxed">
                  Prenota visite, consulta referti e mantieni sotto controllo la tua salute in modo semplice e sicuro
                </p>
                <div className="inline-flex items-center text-yellow-300 font-semibold group-hover:text-yellow-200 transition-colors">
                  Registrati ora
                  <svg className="ml-2 w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                  </svg>
                </div>
              </div>
            </Link>
          </div>

          <div className="text-center mt-12">
            <p className="text-blue-100 mb-4 text-lg">Hai già un account?</p>
            <Link
              href="/login"
              className="inline-flex items-center px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all duration-300 backdrop-blur-md border border-white/20"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
              </svg>
              Accedi alla piattaforma
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Logo and Description */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-green-500">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">MedHubb</h3>
                  <p className="text-slate-400 text-sm">La tua salute, gestita con cura</p>
                </div>
              </div>
              <p className="text-slate-300 leading-relaxed max-w-md">
                La piattaforma digitale che connette medici e pazienti per un&apos;assistenza sanitaria più moderna, sicura e personalizzata.
              </p>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Accesso Rapido</h4>
              <div className="space-y-2">
                <Link href="/login" className="block text-slate-300 hover:text-white transition-colors">
                  Accedi
                </Link>
                <Link href="/register/patient" className="block text-slate-300 hover:text-white transition-colors">
                  Registrati come Paziente
                </Link>
                <Link href="/register/doctor" className="block text-slate-300 hover:text-white transition-colors">
                  Registrati come Medico
                </Link>
              </div>
            </div>
            
            {/* Support */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Supporto</h4>
              <div className="space-y-2">
                <div className="text-slate-300">
                  <div className="flex items-center mb-2">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                    </svg>
                    Sicurezza certificata
                  </div>
                  <div className="flex items-center mb-2">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Supporto 24/7
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    GDPR Compliant
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-800 text-center">
            <p className="text-slate-400">
              &copy; 2025 MedHubb. Tutti i diritti riservati. | Piattaforma per la gestione sanitaria digitale
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}