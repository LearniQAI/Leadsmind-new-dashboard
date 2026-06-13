import { useState, useEffect } from 'react';

export type Language = 'en' | 'af';

const TRANSLATIONS = {
  en: {
    selectDate: 'Select Date',
    selectSlot: 'Select Available Slot',
    enterDetails: 'Enter Lead Details',
    leadName: 'Lead Name',
    emailAddress: 'Email Address',
    additionalNotes: 'Additional Notes',
    confirmBooking: 'Confirm Strategic Booking',
    selectSlotFirst: 'Please select a time slot above first',
    bookingConfirmed: 'Booking Confirmed',
    bookingSuccessMsg: 'Your strategic session has been successfully scheduled. You\'ll receive a confirmation email shortly.',
    scheduleAnother: 'Schedule Another',
    secureBooking: 'Secure Booking',
    duration: 'Duration',
    minutes: 'Minutes',
    timezone: 'Timezone',
    popiaConsent: 'I hereby consent to the processing of my personal information in accordance with POPIA regulations.',
    popiaRequired: 'You must accept the POPIA consent to book.',
    paymentNotice: 'Paid consultation. You will be redirected to PayFast to complete payment of',
  },
  af: {
    selectDate: 'Kies Datum',
    selectSlot: 'Kies Beskikbare Tydgleuf',
    enterDetails: 'Voer Kontakbesonderhede In',
    leadName: 'Naam',
    emailAddress: 'E-pos Adres',
    additionalNotes: 'Addisionele Notas',
    confirmBooking: 'Bevestig Strategiese Bespreking',
    selectSlotFirst: 'Kies asseblief eers \'n tydgleuf hierbo',
    bookingConfirmed: 'Bespreking Bevestig',
    bookingSuccessMsg: 'Jou strategiese sessie is suksesvol geskeduleer. Jy sal binnekort \'n bevestigings-e-pos ontvang.',
    scheduleAnother: 'Skeduleer Nog Een',
    secureBooking: 'Veilige Bespreking',
    duration: 'Duur',
    minutes: 'Minute',
    timezone: 'Tydsone',
    popiaConsent: 'Ek gee hiermee toestemming vir die verwerking van my persoonlike inligting in ooreenstemming met POPIA-regulasies.',
    popiaRequired: 'U moet die POPIA-toestemming aanvaar om te bespreek.',
    paymentNotice: 'Betaalde konsultasie. Jy sal na PayFast herlei word om betaling te voltooi van',
  }
};

export function useTranslation() {
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('leadsmind_booking_lang') as Language;
    if (saved === 'en' || saved === 'af') {
      setLang(saved);
    }
  }, []);

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('leadsmind_booking_lang', newLang);
  };

  const t = (key: keyof typeof TRANSLATIONS['en']) => {
    return TRANSLATIONS[lang][key] || TRANSLATIONS['en'][key];
  };

  return { lang, changeLanguage, t };
}
