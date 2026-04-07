import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Target } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Goal, Account } from "@shared/schema";

export default function Goals() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updateDialog, setUpdateDialog] = useState<Goal | null>(null);
  const [updateAmount, setUpdateAmount] = useState("");
  const { toast } = useToast();

  const { data: goals = [], isLoading } = useQuery<Goal[]>({ queryKey: ["/api/goals"] });
  const { data: accounts = [] } = useQuery<Account[]>({ queryKey: ["/api/accounts"] });
  const hasAccounts = accounts.length > 0;

  const [form, setForm] = useState({
    name: "",
    targetAmount: "",
    currentAmount: "0",
    deadline: "",
    accountId: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/goals", {
        ...form,
        targetAmount: parseFloat(form.targetAmount),
        currentAmount: parseFloat(form.currentAmount || "0"),
        accountId: parseInt(form.accountId),
        deadline: form.deadline || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setDialogOpen(false);
      setForm({ name: "", targetAmount: "", currentAmount: "0", deadline: "", accountId: "" });
      toast({ title: "Goal created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: number; amount: number }) => {
      const res = await apiRequest("PATCH", `/api/goals/${id}`, { currentAmount: amount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setUpdateDialog(null);
      toast({ title: "Goal updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({ title: "Goal deleted" });
    },
  });

  const getAccountName = (id: number) => accounts.find((a) => a.id === id)?.name ?? "Unknown";

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-goals-title">Goals</h1>
          <p className="text-sm text-muted-foreground mt-1">Track progress toward financial targets</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-goal" disabled={!hasAccounts}>
              <Plus className="w-4 h-4 mr-1" /> Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Goal</DialogTitle>
            </DialogHeader>
            {!hasAccounts && (
              <p className="mt-2 text-sm text-muted-foreground">
                Create an account first so you can attach each goal to the right bucket.
              </p>
            )}
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Goal Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Emergency Fund" data-testid="input-goal-name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Target Amount</Label>
                  <Input type="number" step="0.01" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} placeholder="0.00" data-testid="input-goal-target" />
                </div>
                <div className="space-y-1.5">
                  <Label>Current Amount</Label>
                  <Input type="number" step="0.01" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} placeholder="0.00" data-testid="input-goal-current" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Account</Label>
                  <Select value={form.accountId} onValueChange={(v) => setForm({ ...form, accountId: v })}>
                    <SelectTrigger data-testid="select-goal-account"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Deadline</Label>
                  <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} data-testid="input-goal-deadline" />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate()}
                disabled={!form.name || !form.targetAmount || !form.accountId || createMutation.isPending}
                data-testid="button-submit-goal"
              >
                {createMutation.isPending ? "Creating..." : "Create Goal"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Update Dialog */}
      <Dialog open={!!updateDialog} onOpenChange={(open) => { if (!open) setUpdateDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Progress</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Current Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={updateAmount}
                onChange={(e) => setUpdateAmount(e.target.value)}
                data-testid="input-update-goal-amount"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => updateDialog && updateMutation.mutate({ id: updateDialog.id, amount: parseFloat(updateAmount) })}
              disabled={updateMutation.isPending}
              data-testid="button-update-goal"
            >
              Update
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!hasAccounts ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Create an account before setting financial goals.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const pct = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
            return (
              <Card key={goal.id} data-testid={`card-goal-${goal.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <Target className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{goal.name}</p>
                        <p className="text-xs text-muted-foreground">{getAccountName(goal.accountId)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setUpdateDialog(goal);
                          setUpdateAmount(String(goal.currentAmount));
                        }}
                        data-testid={`button-edit-goal-${goal.id}`}
                      >
                        Update
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(goal.id)} data-testid={`button-delete-goal-${goal.id}`}>
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="tabular-nums">{formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}</span>
                      <span className="tabular-nums">{pct.toFixed(0)}%</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                    {goal.deadline && (
                      <p className="text-xs text-muted-foreground">Deadline: {formatDate(goal.deadline)}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No goals yet. Set your first financial target.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
