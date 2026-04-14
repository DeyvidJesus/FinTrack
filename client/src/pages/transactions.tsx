import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency, formatDate, getTodayISO } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AccountSwitcher } from "@/components/account-switcher";
import type { Transaction, Account, Category } from "@shared/schema";

export default function Transactions() {
  const [accountFilter, setAccountFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation(['transactions', 'common']);

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", accountFilter !== "all" ? `?accountId=${accountFilter}` : ""],
  });

  const { data: accounts = [] } = useQuery<Account[]>({ queryKey: ["/api/accounts"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });

  const [form, setForm] = useState({
    description: "",
    amount: "",
    type: "expense",
    date: getTodayISO(),
    accountId: "",
    categoryId: "",
    notes: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/transactions", {
        ...form,
        amount: parseFloat(form.amount),
        accountId: parseInt(form.accountId),
        categoryId: form.categoryId ? parseInt(form.categoryId) : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-entries"] });
      setDialogOpen(false);
      setForm({ description: "", amount: "", type: "expense", date: getTodayISO(), accountId: "", categoryId: "", notes: "" });
      toast({ title: t('transactions:messages.added') });
    },
    onError: () => toast({
      title: t('common:messages.error'),
      description: t('transactions:messages.failedToAdd'),
      variant: "destructive"
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-entries"] });
      toast({ title: t('transactions:messages.deleted') });
    },
  });

  const filteredCategories = categories.filter((c) => c.type === form.type);
  const hasAccounts = accounts.length > 0;

  const getAccountName = (id: number) => accounts.find((a) => a.id === id)?.name ?? "Unknown";
  const getAccountType = (id: number) => accounts.find((a) => a.id === id)?.type ?? "personal";

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-transactions-title">
            {t('transactions:title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('transactions:subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <AccountSwitcher value={accountFilter} onChange={setAccountFilter} />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-transaction" disabled={!hasAccounts}>
                <Plus className="w-4 h-4 mr-1" /> {t('common:actions.add')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('transactions:dialog.newTransaction')}</DialogTitle>
              </DialogHeader>
              {!hasAccounts && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('transactions:messages.createAccountFirst')}
                </p>
              )}
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t('transactions:form.type')}</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, categoryId: "" })}>
                      <SelectTrigger data-testid="select-tx-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">{t('transactions:form.typeIncome')}</SelectItem>
                        <SelectItem value="expense">{t('transactions:form.typeExpense')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('transactions:form.account')}</Label>
                    <Select value={form.accountId} onValueChange={(v) => setForm({ ...form, accountId: v })}>
                      <SelectTrigger data-testid="select-tx-account">
                        <SelectValue placeholder={t('transactions:form.placeholderSelect')} />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('transactions:form.description')}</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder={t('transactions:form.placeholderDescription')}
                    data-testid="input-tx-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t('transactions:form.amount')}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      placeholder={t('transactions:form.placeholderAmount')}
                      data-testid="input-tx-amount"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('transactions:form.date')}</Label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      data-testid="input-tx-date"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('transactions:form.category')}</Label>
                  <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                    <SelectTrigger data-testid="select-tx-category">
                      <SelectValue placeholder={t('transactions:form.placeholderOptional')} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('transactions:form.notes')}</Label>
                  <Input
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder={t('transactions:form.placeholderOptional')}
                    data-testid="input-tx-notes"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate()}
                  disabled={!form.description || !form.amount || !form.accountId || createMutation.isPending}
                  data-testid="button-submit-transaction"
                >
                  {createMutation.isPending ? t('common:status.adding') : t('common:actions.add') + ' Transaction'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {!hasAccounts ? (
            <p className="text-sm text-muted-foreground py-12 text-center">
              {t('transactions:empty.noAccount')}
            </p>
          ) : isLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : transactions.length > 0 ? (
            <div className="divide-y divide-border">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-3 px-5 py-3" data-testid={`row-transaction-${tx.id}`}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-1.5 rounded-md shrink-0 ${tx.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                      {tx.type === "income" ? (
                        <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {t(`common:common.${getAccountType(tx.accountId)}`)} — {getAccountName(tx.accountId)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-sm font-medium tabular-nums ${tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(tx.id)}
                      data-testid={`button-delete-tx-${tx.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-12 text-center">
              {t('transactions:empty.noTransactions')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
