'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardShellProps {
  children: React.ReactNode;
  user?: {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string | null;
    avatarUrl?: string | null;
  } | null;
  workspace?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    plan?: string;
  } | null;
  branding?: {
    platformName?: string | null;
    logoUrl?: string | null;
  };
  role?: string | null;
}

export function DashboardShell({ children, user, workspace, branding, role }: DashboardShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Merge branding data into workspace object for Sidebar consumption
  const enrichedWorkspace = workspace ? {
    ...workspace,
    branding: branding
  } : null;

  return (
    <div className="flex min-h-screen bg-[#030303]">
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden border-r border-white/5 bg-[#0b0b10] md:block fixed top-0 left-0 bottom-0 overflow-hidden z-50 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-[80px]" : "w-[280px]"
      )}>
        <Sidebar
          user={user}
          workspace={enrichedWorkspace}
          role={role}
          className="h-full"
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
      </div>

      <div className={cn(
        "flex flex-1 flex-col transition-all duration-300 ease-in-out",
        isCollapsed ? "md:pl-[80px]" : "md:pl-[280px]"
      )}>
        {/* Top Bar with Mobile Menu Trigger */}
        <header className="sticky top-0 z-40 flex h-20 items-center bg-[#030303]/80 backdrop-blur-xl border-b border-white/5 px-4 md:px-0">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden ml-4 text-white/50 hover:text-white">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              }
            />
            <SheetContent side="left" className="p-0 w-[280px] bg-[#0b0b10] border-r border-white/5">
              <Sidebar user={user} workspace={enrichedWorkspace} role={role} className="h-full" />
            </SheetContent>
          </Sheet>

          <div className="flex-1 w-full">
            <TopBar user={user} workspace={enrichedWorkspace} />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-8 md:p-12">
          <div className="mx-auto max-w-7xl animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
