import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Building2, User } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CHART_COLORS = ["hsl(160, 84%, 30%)", "hsl(200, 80%, 45%)", "hsl(280, 60%, 55%)", "hsl(40, 85%, 55%)", "hsl(20, 85%, 55%)", "hsl(320, 50%, 50%)"];

interface DashboardStats {
  personalBalance: number;
  companyBalance: number;
  totalBalance: number;
  totalInvestmentValue: number;
  investmentReturn: number;
  monthIncome: number;
  monthExpense: number;
  monthlyTrend: { month: string; income: number; expense: number }[];
  categoryBreakdown: { name: string; value: number }[];
  recentTransactions: { id: number; description: string; amount: number; type: string; date: string; accountId: number }[];
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const hasData = stats.totalBalance > 0 || stats.totalInvestmentValue > 0 || stats.recentTransactions.length > 0;

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Your financial overview</p>
      </div>

      {!hasData && (
        <Card className="border-dashed">
          <CardContent className="p-6">
            <p className="text-sm font-medium">Start by adding an account.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              FinTrack is ready to use now, but you&apos;ll need at least one account before transactions, goals, and investments become meaningful.
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-1">
              <p className="text-sm font-medium text-muted-foreground">Personal Balance</p>
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-semibold mt-2 tabular-nums" data-testid="text-personal-balance">
              {formatCurrency(stats.personalBalance)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-1">
              <p className="text-sm font-medium text-muted-foreground">Company Balance</p>
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-semibold mt-2 tabular-nums" data-testid="text-company-balance">
              {formatCurrency(stats.companyBalance)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-1">
              <p className="text-sm font-medium text-muted-foreground">Month Income</p>
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xl font-semibold mt-2 tabular-nums text-emerald-600 dark:text-emerald-400" data-testid="text-month-income">
              {formatCurrency(stats.monthIncome)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-1">
              <p className="text-sm font-medium text-muted-foreground">Month Expenses</p>
              <ArrowDownRight className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-xl font-semibold mt-2 tabular-nums text-red-600 dark:text-red-400" data-testid="text-month-expense">
              {formatCurrency(stats.monthExpense)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Investment banner */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Investment Portfolio</p>
                <p className="text-lg font-semibold tabular-nums" data-testid="text-investment-value">
                  {formatCurrency(stats.totalInvestmentValue)}
                </p>
              </div>
            </div>
            <Badge variant={stats.investmentReturn >= 0 ? "default" : "destructive"}>
              {stats.investmentReturn >= 0 ? "+" : ""}{stats.investmentReturn.toFixed(1)}% return
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.monthlyTrend.some(m => m.income > 0 || m.expense > 0) ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.monthlyTrend} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="income" fill="hsl(160, 84%, 30%)" radius={[4, 4, 0, 0]} name="Income" />
                  <Bar dataKey="expense" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                Add transactions to see trends
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.categoryBreakdown.length > 0 ? (
              <div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={stats.categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {stats.categoryBreakdown.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-2">
                  {stats.categoryBreakdown.slice(0, 4).map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        {c.name}
                      </span>
                      <span className="tabular-nums text-muted-foreground">{formatCurrency(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                No expenses this month
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {stats.recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {stats.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-2" data-testid={`row-transaction-${tx.id}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-md ${tx.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                      {tx.type === "income" ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-medium tabular-nums whitespace-nowrap ${tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">No transactions yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
