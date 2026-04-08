import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import type definitions
import './types';

// Import English translations
import commonEN from './locales/en/common.json';
import dashboardEN from './locales/en/dashboard.json';
import transactionsEN from './locales/en/transactions.json';
import investmentsEN from './locales/en/investments.json';
import goalsEN from './locales/en/goals.json';
import accountsEN from './locales/en/accounts.json';
import validationEN from './locales/en/validation.json';

// Import Portuguese (BR) translations
import commonPT from './locales/pt-BR/common.json';
import dashboardPT from './locales/pt-BR/dashboard.json';
import transactionsPT from './locales/pt-BR/transactions.json';
import investmentsPT from './locales/pt-BR/investments.json';
import goalsPT from './locales/pt-BR/goals.json';
import accountsPT from './locales/pt-BR/accounts.json';
import validationPT from './locales/pt-BR/validation.json';

// Import Spanish translations
import commonES from './locales/es/common.json';
import dashboardES from './locales/es/dashboard.json';
import transactionsES from './locales/es/transactions.json';
import investmentsES from './locales/es/investments.json';
import goalsES from './locales/es/goals.json';
import accountsES from './locales/es/accounts.json';
import validationES from './locales/es/validation.json';

// Configure i18next
i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources: {
      en: {
        common: commonEN,
        dashboard: dashboardEN,
        transactions: transactionsEN,
        investments: investmentsEN,
        goals: goalsEN,
        accounts: accountsEN,
        validation: validationEN,
      },
      'pt-BR': {
        common: commonPT,
        dashboard: dashboardPT,
        transactions: transactionsPT,
        investments: investmentsPT,
        goals: goalsPT,
        accounts: accountsPT,
        validation: validationPT,
      },
      es: {
        common: commonES,
        dashboard: dashboardES,
        transactions: transactionsES,
        investments: investmentsES,
        goals: goalsES,
        accounts: accountsES,
        validation: validationES,
      },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'dashboard', 'transactions', 'investments', 'goals', 'accounts', 'validation'],

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;
