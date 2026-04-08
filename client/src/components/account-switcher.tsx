import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Account } from "@shared/schema";

interface AccountSwitcherProps {
  value: string;
  onChange: (value: string) => void;
  showAll?: boolean;
  filterType?: "personal" | "company";
}

export function AccountSwitcher({ value, onChange, showAll = true, filterType }: AccountSwitcherProps) {
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });
  const { t } = useTranslation('common');

  const filtered = filterType ? accounts.filter((a) => a.type === filterType) : accounts;
  const personalAccounts = filtered.filter((a) => a.type === "personal");
  const companyAccounts = filtered.filter((a) => a.type === "company");
  const hasAccounts = filtered.length > 0;

  return (
    <Select value={value} onValueChange={onChange} disabled={!hasAccounts && !showAll}>
      <SelectTrigger className="w-[200px]" data-testid="select-account-switcher">
        <SelectValue placeholder={hasAccounts ? t('common.allAccounts') : t('common.noAccountsYet')} />
      </SelectTrigger>
      <SelectContent>
        {showAll && <SelectItem value="all">{t('common.allAccounts')}</SelectItem>}
        {personalAccounts.length > 0 && (
          <SelectGroup>
            <SelectLabel>{t('common.personal')}</SelectLabel>
            {personalAccounts.map((account) => (
              <SelectItem key={account.id} value={String(account.id)}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: account.color }} />
                  {account.name}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {companyAccounts.length > 0 && (
          <SelectGroup>
            <SelectLabel>{t('common.company')}</SelectLabel>
            {companyAccounts.map((account) => (
              <SelectItem key={account.id} value={String(account.id)}>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: account.color }} />
                  {account.name}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {!hasAccounts && !showAll && (
          <SelectItem value="no-accounts" disabled>
            {t('common.noAccountsAvailable')}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
