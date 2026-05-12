import { Outlet, createRootRoute, useRouterState } from "@tanstack/react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";

function RootShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLogin = pathname.startsWith("/login");
  const isMobile = pathname === "/mobile" || pathname.startsWith("/mobile/");

  if (isLogin || isMobile) {
    return (
      <TooltipProvider delayDuration={150}>
        <Outlet />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="app-frame flex flex-col">
        <TopBar />
        <main className="flex-1 w-full px-4 pb-32 pt-4">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </TooltipProvider>
  );
}

export const Route = createRootRoute({
  component: RootShell,
});
