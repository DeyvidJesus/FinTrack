import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Wallet, Building2, User } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Account } from "@shared/schema";

const COLORS = ["#059669", "#2563eb", "#7c3aed", "#d97706", "#dc2626", "#0891b2", "#e11d48", "#4f46e5"];

export default function Accounts() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const { toast } = useToast();

  const { data: accounts = [], isLoading } = useQuery<Account[]>({ queryKey: ["/api/accounts"] });

  const [form, setForm] = useState({
    name: "",
    type: "personal",
    currency: "BRL",
    balance: "0",
    color: COLORS[0],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/accounts", {
        ...form,
        balance: parseFloat(form.balance || "0"),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setDialogOpen(false);
      setForm({ name: "", type: "personal", currency: "BRL", balance: "0", color: COLORS[Math.floor(Math.random() * COLORS.length)] });
      toast({ title: "Account created" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Account deleted" });
    },
  });

  const filtered = tab === "all" ? accounts : accounts.filter((a) => a.type === tab);
  const personalTotal = accounts.filter((a) => a.type === "personal").reduce((s, a) => s + a.balance, 0);
  const companyTotal = accounts.filter((a) => a.type === "company").reduce((s, a) => s + a.balance, 0);
  const parsedBalance = Number(form.balance);

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-accounts-title">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage personal and company accounts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-account">
              <Plus className="w-4 h-4 mr-1" /> Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Account Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Checking" data-testid="input-account-name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger data-testid="select-account-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                    <SelectTrigger data-testid="select-account-currency"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">BRL</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Starting Balance</Label>
                <Input type="number" step="0.01" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} placeholder="0.00" data-testid="input-account-balance" />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      className={`w-7 h-7 rounded-full transition-all ${form.color === c ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setForm({ ...form, color: c })}
                      data-testid={`button-color-${c.replace("#", "")}`}
                    />
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate()}
                disabled={!form.name.trim() || Number.isNaN(parsedBalance) || createMutation.isPending}
                data-testid="button-submit-account"
              >
                {createMutation.isPending ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-2 rounded-md bg-blue-500/10">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Personal Total</p>
              <p className="text-lg font-semibold tabular-nums" data-testid="text-personal-total">{formatCurrency(personalTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-2 rounded-md bg-purple-500/10">
              <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Company Total</p>
              <p className="text-lg font-semibold tabular-nums" data-testid="text-company-total">{formatCurrency(companyTotal)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
          <TabsTrigger value="personal" data-testid="tab-personal">Personal</TabsTrigger>
          <TabsTrigger value="company" data-testid="tab-company">Company</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((account) => (
                <Card key={account.id} data-testid={`card-account-${account.id}`}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: account.color }} />
                        <div>
                          <p className="text-sm font-medium">{account.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {account.type === "company" ? "Company" : "Personal"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{account.currency}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold tabular-nums">{formatCurrency(account.balance, account.currency)}</p>
                        <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(account.id)} data-testid={`button-delete-account-${account.id}`}>
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">No accounts found. Create one to get started.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
