import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AccountSwitcher } from "@/components/account-switcher";
import type { Account } from "@shared/schema";

interface DailyEntry {
  id: number;
  accountId: number;
  year: number;
  month: number;
  day: number;
  category: string;
  amount: number;
  notes: string | null;
}

interface DailyEntriesResponse {
  entries: DailyEntry[];
  dailyData: Record<number, Record<string, number>>;
  dailyBalances: Record<number, number>;
  monthlyTotals: Record<string, number>;
  percentages: Record<string, number>;
  consolidation: {
    saldoMesAnterior: number;
    saldoMes: number;
    saldoProximoMes: number;
  };
}

const categoryConfig = {
  renda: { label: "Renda", type: "income" },
  contribuicao: { label: "Contribuição", type: "expense" },
  impostos_taxas: { label: "Impostos e Taxas", type: "expense" },
  moradia: { label: "Moradia", type: "expense" },
  alimentacao: { label: "Alimentação", type: "expense" },
  transporte: { label: "Transporte", type: "expense" },
  seguros: { label: "Seguros", type: "expense" },
  dividas: { label: "Dívidas", type: "expense" },
  lazer_eventos: { label: "Lazer e Eventos", type: "expense" },
  vestuario: { label: "Vestuário", type: "expense" },
  investimento: { label: "Investimento", type: "expense" },
  saude: { label: "Saúde", type: "expense" },
  educacao: { label: "Educação", type: "expense" },
  cuidados_pessoais: { label: "Cuidados Pessoais", type: "expense" },
  comunicacao: { label: "Comunicação", type: "expense" },
  manutencao: { label: "Manutenção", type: "expense" },
  diversos: { label: "Diversos", type: "expense" },
} as const;

export default function DailyEntries() {
  const today = new Date();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [editingCell, setEditingCell] = useState<{ day: number; category: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const { toast } = useToast();
  const { t } = useTranslation(['dailyEntries', 'common']);

  const { data: accounts = [] } = useQuery<Account[]>({ queryKey: ["/api/accounts"] });

  const hasAccounts = accounts.length > 0;
  const accountId = selectedAccountId === "all" || !selectedAccountId
    ? (accounts[0]?.id || 0)
    : parseInt(selectedAccountId);

  const { data, isLoading } = useQuery<DailyEntriesResponse>({
    queryKey: ["/api/daily-entries", accountId, selectedYear, selectedMonth],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/daily-entries?accountId=${accountId}&year=${selectedYear}&month=${selectedMonth}`);
      return res.json();
    },
    enabled: hasAccounts && accountId > 0,
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ day, category, amount }: { day: number; category: string; amount: number }) => {
      const res = await apiRequest("POST", "/api/daily-entries", {
        accountId,
        year: selectedYear,
        month: selectedMonth,
        day,
        category,
        amount,
        notes: null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-entries"] });
      setEditingCell(null);
      setEditValue("");
      toast({ title: t('dailyEntries:messages.saved') });
    },
    onError: () => toast({
      title: t('common:messages.error'),
      description: t('dailyEntries:messages.failedToSave'),
      variant: "destructive"
    }),
  });

  const handleCellClick = (day: number, category: string) => {
    const currentValue = data?.dailyData[day]?.[category] || 0;
    setEditingCell({ day, category });
    setEditValue(currentValue === 0 ? "" : String(Math.abs(currentValue)));
  };

  const handleCellSave = () => {
    if (!editingCell) return;
    const amount = parseFloat(editValue) || 0;
    const category = editingCell.category;
    const isIncome = categoryConfig[category as keyof typeof categoryConfig].type === "income";
    const finalAmount = isIncome ? amount : -amount;

    upsertMutation.mutate({
      day: editingCell.day,
      category: editingCell.category,
      amount: finalAmount,
    });
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCellSave();
    } else if (e.key === "Escape") {
      setEditingCell(null);
      setEditValue("");
    }
  };

  const categories = Object.keys(categoryConfig) as Array<keyof typeof categoryConfig>;
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  const years = Array.from({ length: 11 }, (_, i) => today.getFullYear() - 5 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {t('dailyEntries:title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('dailyEntries:subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <AccountSwitcher value={selectedAccountId} onChange={setSelectedAccountId} />
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={String(month)}>
                  {new Date(2000, month - 1).toLocaleString(t('common:locale'), { month: "long" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!hasAccounts ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-sm text-muted-foreground text-center">
              {t('dailyEntries:empty.noAccount')}
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="p-5">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('dailyEntries:matrix.title')}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px] sticky left-0 bg-background">{t('dailyEntries:matrix.day')}</TableHead>
                    {categories.map((cat) => (
                      <TableHead key={cat} className="text-center min-w-[100px]">
                        {categoryConfig[cat].label}
                      </TableHead>
                    ))}
                    <TableHead className="text-center font-semibold">{t('dailyEntries:matrix.balance')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                    <TableRow key={day}>
                      <TableCell className="font-medium sticky left-0 bg-background">{day}</TableCell>
                      {categories.map((cat) => {
                        const value = data?.dailyData[day]?.[cat] || 0;
                        const isEditing = editingCell?.day === day && editingCell?.category === cat;

                        return (
                          <TableCell key={cat} className="text-center p-0">
                            {isEditing ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleCellSave}
                                onKeyDown={handleCellKeyDown}
                                className="h-8 text-center border-0 focus-visible:ring-2"
                                autoFocus
                              />
                            ) : (
                              <button
                                onClick={() => handleCellClick(day, cat)}
                                className={`w-full h-8 text-xs hover:bg-muted transition-colors ${
                                  value !== 0
                                    ? value > 0
                                      ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                      : "text-red-600 dark:text-red-400 font-medium"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {value !== 0 ? formatCurrency(Math.abs(value)) : "—"}
                              </button>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className={`text-center font-semibold ${
                        (data?.dailyBalances[day] || 0) >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}>
                        {formatCurrency(Math.abs(data?.dailyBalances[day] || 0))}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold bg-muted/50">
                    <TableCell>{t('dailyEntries:matrix.total')}</TableCell>
                    {categories.map((cat) => (
                      <TableCell key={cat} className={`text-center ${
                        (data?.monthlyTotals[cat] || 0) >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}>
                        {formatCurrency(Math.abs(data?.monthlyTotals[cat] || 0))}
                      </TableCell>
                    ))}
                    <TableCell className={`text-center ${
                      (data?.consolidation.saldoMes || 0) >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}>
                      {formatCurrency(Math.abs(data?.consolidation.saldoMes || 0))}
                    </TableCell>
                  </TableRow>
                  <TableRow className="font-semibold">
                    <TableCell>{t('dailyEntries:matrix.percentage')}</TableCell>
                    {categories.map((cat) => (
                      <TableCell key={cat} className="text-center text-muted-foreground">
                        {cat === "renda" ? "—" : `${(data?.percentages[cat] || 0).toFixed(1)}%`}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">—</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{t('dailyEntries:summary.previousMonth')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(data?.consolidation.saldoMesAnterior || 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{t('dailyEntries:summary.currentMonth')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${
                  (data?.consolidation.saldoMes || 0) >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}>
                  {formatCurrency(data?.consolidation.saldoMes || 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{t('dailyEntries:summary.nextMonth')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(data?.consolidation.saldoProximoMes || 0)}
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
