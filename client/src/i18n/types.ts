import 'react-i18next';
import common from './locales/en/common.json';
import dashboard from './locales/en/dashboard.json';
import transactions from './locales/en/transactions.json';
import investments from './locales/en/investments.json';
import goals from './locales/en/goals.json';
import accounts from './locales/en/accounts.json';
import validation from './locales/en/validation.json';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      dashboard: typeof dashboard;
      transactions: typeof transactions;
      investments: typeof investments;
      goals: typeof goals;
      accounts: typeof accounts;
      validation: typeof validation;
    };
  }
}
