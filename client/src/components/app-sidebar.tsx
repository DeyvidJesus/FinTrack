import { LayoutDashboard, ArrowLeftRight, TrendingUp, Target, Wallet, Calendar, Settings, Sun, Moon } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation('common');

  const navItems = [
    { title: t('nav.dashboard'), url: "/", icon: LayoutDashboard },
    { title: t('nav.transactions'), url: "/transactions", icon: ArrowLeftRight },
    { title: t('nav.dailyEntries'), url: "/daily-entries", icon: Calendar },
    { title: t('nav.investments'), url: "/investments", icon: TrendingUp },
    { title: t('nav.goals'), url: "/goals", icon: Target },
    { title: t('nav.accounts'), url: "/accounts", icon: Wallet },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="FinTrack logo">
            <rect x="2" y="2" width="24" height="24" rx="6" stroke="currentColor" strokeWidth="2" className="text-primary" />
            <path d="M8 18V12L14 8L20 12V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
            <circle cx="14" cy="14" r="2" fill="currentColor" className="text-primary" />
          </svg>
          <span className="text-base font-semibold tracking-tight" data-testid="text-app-name">{t('common.appName')}</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('common.navigation')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item, idx) => (
                <SidebarMenuItem key={idx}>
                  <SidebarMenuButton
                    asChild
                    data-active={location === item.url || (item.url !== "/" && location.startsWith(item.url))}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase()}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-4 pb-4">
        <Button
          size="icon"
          variant="ghost"
          onClick={toggleTheme}
          data-testid="button-theme-toggle"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
