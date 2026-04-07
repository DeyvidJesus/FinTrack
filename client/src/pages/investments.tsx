import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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

const INVESTMENT_TYPES = [
  { value: "stocks", label: "Stocks" },
  { value: "crypto", label: "Crypto" },
  { value: "bonds", label: "Bonds" },
  { value: "real_estate", label: "Real Estate" },
  { value: "other", label: "Other" },
];

export default function Investments() {
  const [accountFilter, setAccountFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

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
      toast({ title: "Investment added" });
    },
    onError: () => toast({ title: "Error", description: "Failed to add investment", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/investments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Investment removed" });
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
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-investments-title">Investments</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your portfolio performance</p>
        </div>
        <div className="flex items-center gap-3">
          <AccountSwitcher value={accountFilter} onChange={setAccountFilter} />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-investment" disabled={!hasAccounts}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Investment</DialogTitle>
              </DialogHeader>
              {!hasAccounts && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Create an account first so this investment can be assigned correctly.
                </p>
              )}
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger data-testid="select-inv-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INVESTMENT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Account</Label>
                    <Select value={form.accountId} onValueChange={(v) => setForm({ ...form, accountId: v })}>
                      <SelectTrigger data-testid="select-inv-account"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. AAPL, Bitcoin" data-testid="input-inv-name" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Cost Basis</Label>
                    <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" data-testid="input-inv-amount" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Current Value</Label>
                    <Input type="number" step="0.01" value={form.currentValue} onChange={(e) => setForm({ ...form, currentValue: e.target.value })} placeholder="0.00" data-testid="input-inv-value" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Purchase Date</Label>
                  <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} data-testid="input-inv-date" />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate()}
                  disabled={!form.name || !form.amount || !form.accountId || createMutation.isPending}
                  data-testid="button-submit-investment"
                >
                  {createMutation.isPending ? "Adding..." : "Add Investment"}
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
            <p className="text-sm text-muted-foreground">Total Invested</p>
            <p className="text-lg font-semibold mt-1 tabular-nums">{formatCurrency(totalCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Current Value</p>
            <p className="text-lg font-semibold mt-1 tabular-nums">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Return</p>
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
            <p className="text-sm text-muted-foreground py-12 text-center">Create an account before tracking investments.</p>
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
                        <span className="text-xs text-muted-foreground">Bought {formatDate(inv.purchaseDate)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-medium tabular-nums">{formatCurrency(inv.currentValue)}</p>
                        <p className={`text-xs tabular-nums ${ret >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {ret >= 0 ? "+" : ""}{ret.toFixed(1)}%
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(inv.id)} data-testid={`button-delete-inv-${inv.id}`}>
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-12 text-center">No investments yet. Start building your portfolio.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
