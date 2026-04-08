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
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, formatDate, getTodayISO } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AccountSwitcher } from "@/components/account-switcher";
import type { Investment, Account } from "@shared/schema";

export default function Investments() {
  const [accountFilter, setAccountFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation(['investments', 'common']);

  const INVESTMENT_TYPES = [
    { value: "stocks", label: t('investments:types.stocks') },
    { value: "crypto", label: t('investments:types.crypto') },
    { value: "bonds", label: t('investments:types.bonds') },
    { value: "real_estate", label: t('investments:types.realEstate') },
    { value: "other", label: t('investments:types.other') },
  ];

  const queryStr = accountFilter !== "all" ? `?accountId=${accountFilter}` : "";
  const { data: investments = [], isLoading } = useQuery<Investment[]>({
    queryKey: ["/api/investments", queryStr],
  });
  const { data: accounts = [] } = useQuery<Account[]>({ queryKey: ["/api/accounts"] });

  const [form, setForm] = useState({
    name: "",
    type: "stocks",
    amount: "",
    currentValue: "",
    purchaseDate: getTodayISO(),
    accountId: "",
    notes: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/investments", {
        ...form,
        amount: parseFloat(form.amount),
        currentValue: parseFloat(form.currentValue || form.amount),
        accountId: parseInt(form.accountId),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setDialogOpen(false);
      setForm({ name: "", type: "stocks", amount: "", currentValue: "", purchaseDate: getTodayISO(), accountId: "", notes: "" });
      toast({ title: t('investments:messages.added') });
    },
    onError: () => toast({
      title: t('common:messages.error'),
      description: t('investments:messages.failedToAdd'),
      variant: "destructive"
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/investments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: t('investments:messages.removed') });
    },
  });

  const totalCost = investments.reduce((s, i) => s + i.amount, 0);
  const totalValue = investments.reduce((s, i) => s + i.currentValue, 0);
  const totalReturn = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
  const hasAccounts = accounts.length > 0;

  const getAccountName = (id: number) => accounts.find((a) => a.id === id)?.name ?? "Unknown";

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-investments-title">
            {t('investments:title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('investments:subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <AccountSwitcher value={accountFilter} onChange={setAccountFilter} />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-investment" disabled={!hasAccounts}>
                <Plus className="w-4 h-4 mr-1" /> {t('common:actions.add')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('investments:dialog.newInvestment')}</DialogTitle>
              </DialogHeader>
              {!hasAccounts && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('investments:messages.createAccountFirst')}
                </p>
              )}
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t('investments:form.type')}</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger data-testid="select-inv-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INVESTMENT_TYPES.map((tp) => (
                          <SelectItem key={tp.value} value={tp.value}>{tp.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('investments:form.account')}</Label>
                    <Select value={form.accountId} onValueChange={(v) => setForm({ ...form, accountId: v })}>
                      <SelectTrigger data-testid="select-inv-account">
                        <SelectValue placeholder={t('investments:form.placeholderSelect')} />
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
                  <Label>{t('investments:form.name')}</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={t('investments:form.placeholderName')}
                    data-testid="input-inv-name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t('investments:form.costBasis')}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      placeholder={t('investments:form.placeholderAmount')}
                      data-testid="input-inv-amount"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('investments:form.currentValue')}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.currentValue}
                      onChange={(e) => setForm({ ...form, currentValue: e.target.value })}
                      placeholder={t('investments:form.placeholderAmount')}
                      data-testid="input-inv-value"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('investments:form.purchaseDate')}</Label>
                  <Input
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                    data-testid="input-inv-date"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate()}
                  disabled={!form.name || !form.amount || !form.accountId || createMutation.isPending}
                  data-testid="button-submit-investment"
                >
                  {createMutation.isPending ? t('common:status.adding') : t('common:actions.add') + ' Investment'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t('investments:summary.totalInvested')}</p>
            <p className="text-lg font-semibold mt-1 tabular-nums">{formatCurrency(totalCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t('investments:summary.currentValue')}</p>
            <p className="text-lg font-semibold mt-1 tabular-nums">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{t('investments:summary.totalReturn')}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className={`text-lg font-semibold tabular-nums ${totalReturn >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {totalReturn >= 0 ? "+" : ""}{totalReturn.toFixed(2)}%
              </p>
              {totalReturn >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investment List */}
      <Card>
        <CardContent className="p-0">
          {!hasAccounts ? (
            <p className="text-sm text-muted-foreground py-12 text-center">
              {t('investments:empty.noAccount')}
            </p>
          ) : isLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : investments.length > 0 ? (
            <div className="divide-y divide-border">
              {investments.map((inv) => {
                const ret = inv.amount > 0 ? ((inv.currentValue - inv.amount) / inv.amount) * 100 : 0;
                return (
                  <div key={inv.id} className="flex items-center justify-between gap-3 px-5 py-3" data-testid={`row-investment-${inv.id}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{inv.name}</p>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{inv.type}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{getAccountName(inv.accountId)}</span>
                        <span className="text-xs text-muted-foreground">
                          {t('investments:bought')} {formatDate(inv.purchaseDate)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-medium tabular-nums">{formatCurrency(inv.currentValue)}</p>
                        <p className={`text-xs tabular-nums ${ret >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {ret >= 0 ? "+" : ""}{ret.toFixed(1)}%
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(inv.id)}
                        data-testid={`button-delete-inv-${inv.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-12 text-center">
              {t('investments:empty.noInvestments')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
