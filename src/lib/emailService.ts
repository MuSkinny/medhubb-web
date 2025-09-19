import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailData {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailData) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'MedHub Team <noreply@medhubb.app>', // Il tuo dominio verificato
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('Errore invio email:', error);
      throw new Error(`Errore invio email: ${error.message}`);
    }

    console.log('Email inviata con successo:', data);
    return data;
  } catch (error) {
    console.error('Errore servizio email:', error);
    throw error;
  }
}

export function getApprovalEmailTemplate(doctorName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Benvenuto in MedHubb</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #2D3748;
          background-color: #F7FAFC;
        }
        .email-wrapper {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 30px;
          text-align: center;
          color: white;
        }
        .logo {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }
        .tagline {
          font-size: 16px;
          opacity: 0.9;
          font-weight: 300;
        }
        .success-icon {
          width: 60px;
          height: 60px;
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          margin: 20px auto 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .content {
          padding: 40px 30px;
          background-color: #ffffff;
        }
        .greeting {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #2D3748;
        }
        .message {
          font-size: 16px;
          margin-bottom: 25px;
          color: #4A5568;
          line-height: 1.7;
        }
        .features-list {
          background-color: #F7FAFC;
          border-radius: 8px;
          padding: 20px;
          margin: 25px 0;
        }
        .features-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 15px;
          color: #2D3748;
        }
        .feature-item {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          font-size: 15px;
          color: #4A5568;
        }
        .feature-icon {
          width: 20px;
          height: 20px;
          background-color: #48BB78;
          border-radius: 50%;
          margin-right: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: white;
        }
        .cta-section {
          text-align: center;
          margin: 35px 0;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          transition: transform 0.2s ease;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        .support-section {
          background-color: #EDF2F7;
          border-radius: 8px;
          padding: 20px;
          margin-top: 30px;
          text-align: center;
        }
        .support-text {
          font-size: 14px;
          color: #718096;
          margin-bottom: 10px;
        }
        .support-email {
          color: #667eea;
          font-weight: 600;
          text-decoration: none;
        }
        .footer {
          text-align: center;
          color: #A0AEC0;
          font-size: 12px;
          padding: 25px 30px;
          background-color: #F7FAFC;
          border-top: 1px solid #E2E8F0;
        }
        .footer-links {
          margin-bottom: 15px;
        }
        .footer-link {
          color: #667eea;
          text-decoration: none;
          margin: 0 15px;
        }
        @media only screen and (max-width: 600px) {
          .email-wrapper { margin: 0 10px; }
          .header, .content { padding: 30px 20px; }
          .greeting { font-size: 22px; }
          .cta-button { padding: 12px 24px; }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <div class="logo">MedHubb</div>
          <div class="tagline">La tua piattaforma sanitaria digitale</div>
          <div class="success-icon">✓</div>
        </div>

        <div class="content">
          <div class="greeting">Congratulazioni, Dr. ${doctorName}!</div>

          <div class="message">
            Siamo entusiasti di informarti che la tua candidatura per entrare a far parte della comunità MedHubb è stata <strong>approvata con successo</strong>.
          </div>

          <div class="message">
            Il tuo account professionale è ora attivo e puoi accedere immediatamente a tutte le funzionalità avanzate della nostra piattaforma.
          </div>

          <div class="features-list">
            <div class="features-title">Cosa puoi fare ora:</div>
            <div class="feature-item">
              <div class="feature-icon">✓</div>
              Gestire il tuo portfolio pazienti in modo sicuro
            </div>
            <div class="feature-item">
              <div class="feature-icon">✓</div>
              Pianificare e gestire appuntamenti online
            </div>
            <div class="feature-item">
              <div class="feature-icon">✓</div>
              Emettere prescrizioni digitali certificate
            </div>
            <div class="feature-item">
              <div class="feature-icon">✓</div>
              Comunicare in modo sicuro con i pazienti
            </div>
            <div class="feature-item">
              <div class="feature-icon">✓</div>
              Accedere a strumenti di telemedicina avanzati
            </div>
          </div>

          <div class="cta-section">
            <a href="https://medhubb.app/login" class="cta-button">Accedi alla Dashboard</a>
          </div>

          <div class="support-section">
            <div class="support-text">Hai bisogno di aiuto per iniziare?</div>
            <div class="support-text">Il nostro team di supporto è sempre a disposizione</div>
            <a href="mailto:support@medhubb.app" class="support-email">support@medhubb.app</a>
          </div>
        </div>

        <div class="footer">
          <div class="footer-links">
            <a href="https://medhubb.app/privacy" class="footer-link">Privacy Policy</a>
            <a href="https://medhubb.app/terms" class="footer-link">Termini di Servizio</a>
            <a href="https://medhubb.app/help" class="footer-link">Centro Assistenza</a>
          </div>
          <div>© 2024 MedHubb S.r.l. Tutti i diritti riservati.</div>
          <div>Via della Salute 123, 00100 Roma, Italia</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getRejectionEmailTemplate(doctorName: string, reason?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Aggiornamento richiesta MedHubb</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #2D3748;
          background-color: #F7FAFC;
        }
        .email-wrapper {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
          padding: 40px 30px;
          text-align: center;
          color: white;
        }
        .logo {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }
        .tagline {
          font-size: 16px;
          opacity: 0.9;
          font-weight: 300;
        }
        .info-icon {
          width: 60px;
          height: 60px;
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          margin: 20px auto 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .content {
          padding: 40px 30px;
          background-color: #ffffff;
        }
        .greeting {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #2D3748;
        }
        .message {
          font-size: 16px;
          margin-bottom: 25px;
          color: #4A5568;
          line-height: 1.7;
        }
        .reason-section {
          background-color: #FED7D7;
          border-left: 4px solid #E53E3E;
          border-radius: 6px;
          padding: 20px;
          margin: 25px 0;
        }
        .reason-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 10px;
          color: #C53030;
        }
        .reason-text {
          font-size: 15px;
          color: #2D3748;
          line-height: 1.6;
        }
        .next-steps {
          background-color: #F7FAFC;
          border-radius: 8px;
          padding: 20px;
          margin: 25px 0;
        }
        .next-steps-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 15px;
          color: #2D3748;
        }
        .step-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 12px;
          font-size: 15px;
          color: #4A5568;
        }
        .step-number {
          width: 24px;
          height: 24px;
          background-color: #667eea;
          color: white;
          border-radius: 50%;
          margin-right: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
        }
        .cta-section {
          text-align: center;
          margin: 35px 0;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          transition: transform 0.2s ease;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        .support-section {
          background-color: #EDF2F7;
          border-radius: 8px;
          padding: 20px;
          margin-top: 30px;
          text-align: center;
        }
        .support-text {
          font-size: 14px;
          color: #718096;
          margin-bottom: 10px;
        }
        .support-email {
          color: #667eea;
          font-weight: 600;
          text-decoration: none;
        }
        .footer {
          text-align: center;
          color: #A0AEC0;
          font-size: 12px;
          padding: 25px 30px;
          background-color: #F7FAFC;
          border-top: 1px solid #E2E8F0;
        }
        .footer-links {
          margin-bottom: 15px;
        }
        .footer-link {
          color: #667eea;
          text-decoration: none;
          margin: 0 15px;
        }
        @media only screen and (max-width: 600px) {
          .email-wrapper { margin: 0 10px; }
          .header, .content { padding: 30px 20px; }
          .greeting { font-size: 22px; }
          .cta-button { padding: 12px 24px; }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <div class="logo">MedHubb</div>
          <div class="tagline">La tua piattaforma sanitaria digitale</div>
          <div class="info-icon">!</div>
        </div>

        <div class="content">
          <div class="greeting">Gentile Dr. ${doctorName},</div>

          <div class="message">
            Grazie per aver mostrato interesse verso MedHubb e per aver inviato la tua candidatura per entrare a far parte della nostra comunità di professionisti sanitari.
          </div>

          <div class="message">
            Dopo un'attenta valutazione del tuo profilo, al momento non siamo in grado di approvare la tua richiesta di registrazione.
          </div>

          ${reason ? `
          <div class="reason-section">
            <div class="reason-title">Dettagli della valutazione:</div>
            <div class="reason-text">${reason}</div>
          </div>
          ` : ''}

          <div class="next-steps">
            <div class="next-steps-title">Prossimi passi consigliati:</div>
            <div class="step-item">
              <div class="step-number">1</div>
              <div>Verifica che tutti i documenti richiesti siano completi e aggiornati</div>
            </div>
            <div class="step-item">
              <div class="step-number">2</div>
              <div>Assicurati che le informazioni professionali siano accurate</div>
            </div>
            <div class="step-item">
              <div class="step-number">3</div>
              <div>Ripresenta la candidatura quando sarai pronto</div>
            </div>
          </div>

          <div class="message">
            Ti incoraggiamo a riprovare in futuro. Il nostro team sarà felice di rivalutare la tua candidatura non appena avrai apportato le necessarie migliorie.
          </div>

          <div class="cta-section">
            <a href="https://medhubb.app/register/doctor" class="cta-button">Candidati di Nuovo</a>
          </div>

          <div class="support-section">
            <div class="support-text">Hai domande o bisogno di chiarimenti?</div>
            <div class="support-text">Il nostro team di supporto è qui per aiutarti</div>
            <a href="mailto:support@medhubb.app" class="support-email">support@medhubb.app</a>
          </div>
        </div>

        <div class="footer">
          <div class="footer-links">
            <a href="https://medhubb.app/privacy" class="footer-link">Privacy Policy</a>
            <a href="https://medhubb.app/terms" class="footer-link">Termini di Servizio</a>
            <a href="https://medhubb.app/help" class="footer-link">Centro Assistenza</a>
          </div>
          <div>© 2024 MedHubb S.r.l. Tutti i diritti riservati.</div>
          <div>Via della Salute 123, 00100 Roma, Italia</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getPasswordResetEmailTemplate(userName: string, resetLink: string, userType: 'doctor' | 'patient'): string {
  const userTypeLabel = userType === 'doctor' ? 'Dr.' : 'Gentile';
  const dashboardType = userType === 'doctor' ? 'medica' : 'paziente';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Password MedHubb</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #2D3748;
          background-color: #F7FAFC;
        }
        .email-wrapper {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
          padding: 40px 30px;
          text-align: center;
          color: white;
        }
        .logo {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }
        .tagline {
          font-size: 16px;
          opacity: 0.9;
          font-weight: 300;
        }
        .lock-icon {
          width: 60px;
          height: 60px;
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          margin: 20px auto 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .content {
          padding: 40px 30px;
          background-color: #ffffff;
        }
        .greeting {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #2D3748;
        }
        .message {
          font-size: 16px;
          margin-bottom: 25px;
          color: #4A5568;
          line-height: 1.7;
        }
        .security-notice {
          background-color: #EBF8FF;
          border-left: 4px solid #4299E1;
          border-radius: 6px;
          padding: 20px;
          margin: 25px 0;
        }
        .security-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 10px;
          color: #2B6CB0;
        }
        .security-text {
          font-size: 14px;
          color: #2D3748;
          line-height: 1.6;
        }
        .cta-section {
          text-align: center;
          margin: 35px 0;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
          color: white;
          padding: 16px 40px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          transition: transform 0.2s ease;
          box-shadow: 0 4px 12px rgba(66, 153, 225, 0.3);
        }
        .expiry-notice {
          background-color: #FFFAF0;
          border: 1px solid #F6E05E;
          border-radius: 8px;
          padding: 15px;
          margin: 25px 0;
          text-align: center;
        }
        .expiry-text {
          font-size: 14px;
          color: #744210;
          font-weight: 500;
        }
        .support-section {
          background-color: #EDF2F7;
          border-radius: 8px;
          padding: 20px;
          margin-top: 30px;
          text-align: center;
        }
        .support-text {
          font-size: 14px;
          color: #718096;
          margin-bottom: 10px;
        }
        .support-email {
          color: #4299e1;
          font-weight: 600;
          text-decoration: none;
        }
        .footer {
          text-align: center;
          color: #A0AEC0;
          font-size: 12px;
          padding: 25px 30px;
          background-color: #F7FAFC;
          border-top: 1px solid #E2E8F0;
        }
        .footer-links {
          margin-bottom: 15px;
        }
        .footer-link {
          color: #4299e1;
          text-decoration: none;
          margin: 0 15px;
        }
        @media only screen and (max-width: 600px) {
          .email-wrapper { margin: 0 10px; }
          .header, .content { padding: 30px 20px; }
          .greeting { font-size: 22px; }
          .cta-button { padding: 14px 32px; }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <div class="logo">MedHubb</div>
          <div class="tagline">La tua piattaforma sanitaria digitale</div>
          <div class="lock-icon">🔐</div>
        </div>

        <div class="content">
          <div class="greeting">${userTypeLabel} ${userName},</div>

          <div class="message">
            Abbiamo ricevuto una richiesta per reimpostare la password del tuo account MedHubb. Se non hai fatto questa richiesta, puoi ignorare questa email in sicurezza.
          </div>

          <div class="message">
            Per reimpostare la tua password e accedere nuovamente alla tua dashboard ${dashboardType}, clicca sul pulsante qui sotto:
          </div>

          <div class="cta-section">
            <a href="${resetLink}" class="cta-button">Reimposta Password</a>
          </div>

          <div class="expiry-notice">
            <div class="expiry-text">⏰ Questo link scadrà tra 1 ora per la tua sicurezza</div>
          </div>

          <div class="security-notice">
            <div class="security-title">Importante per la tua sicurezza:</div>
            <div class="security-text">
              • Non condividere mai questo link con nessuno<br>
              • Assicurati di essere sul sito ufficiale medhubb.app<br>
              • Scegli una password forte e unica<br>
              • Se non hai richiesto questo reset, contatta immediatamente il supporto
            </div>
          </div>

          <div class="support-section">
            <div class="support-text">Hai bisogno di aiuto o hai dubbi sulla sicurezza?</div>
            <div class="support-text">Il nostro team di supporto è sempre disponibile</div>
            <a href="mailto:support@medhubb.app" class="support-email">support@medhubb.app</a>
          </div>
        </div>

        <div class="footer">
          <div class="footer-links">
            <a href="https://medhubb.app/privacy" class="footer-link">Privacy Policy</a>
            <a href="https://medhubb.app/terms" class="footer-link">Termini di Servizio</a>
            <a href="https://medhubb.app/security" class="footer-link">Sicurezza</a>
          </div>
          <div>© 2024 MedHubb S.r.l. Tutti i diritti riservati.</div>
          <div>Via della Salute 123, 00100 Roma, Italia</div>
        </div>
      </div>
    </body>
    </html>
  `;
}