/**
 * Transactional auth emails in the user's language. UK-first launch means the
 * default is English; Polish only when the client explicitly says so (i18next
 * cookie set by the frontend, or a Polish Accept-Language).
 */
export type EmailLang = 'en' | 'pl';

export const pickEmailLang = (req?: {
  cookies?: Record<string, string>;
  headers?: Record<string, unknown>;
}): EmailLang => {
  const cookie = req?.cookies?.i18next;
  if (cookie === 'pl' || cookie === 'en') {
    return cookie;
  }
  const header = String(req?.headers?.['accept-language'] || '');
  return header.toLowerCase().startsWith('pl') ? 'pl' : 'en';
};

export const authEmails = {
  activation: {
    en: {
      subject: 'Activate your account',
      html: (url: string) =>
        `Click <a href="${url}">here</a> to activate your account.<br />The link opens Postra and completes your registration.`,
    },
    pl: {
      subject: 'Aktywuj swoje konto',
      html: (url: string) =>
        `Aby aktywować konto, kliknij <a href="${url}">tutaj</a>.<br />Link aktywacyjny otworzy stronę Postra i pozwoli dokończyć rejestrację.`,
    },
  },
  resetPassword: {
    en: {
      subject: 'Reset your password',
      html: (url: string) =>
        `We received a request to reset the password for your account.<br />Click <a href="${url}">here</a> to set a new password.<br />The link expires in 20 minutes.`,
    },
    pl: {
      subject: 'Zresetuj swoje hasło',
      html: (url: string) =>
        `Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta.<br />Kliknij <a href="${url}">tutaj</a>, aby ustawić nowe hasło.<br />Link wygaśnie za 20 minut.`,
    },
  },
};
