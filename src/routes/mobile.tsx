import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { MobileTopBar } from "@/components/mobile/mobile-top-bar";
import { MobileBottomNav } from "@/components/mobile/mobile-bottom-nav";

export const Route = createFileRoute("/mobile")({
  component: MobileLayout,
});

function MobileLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHandoff = pathname.startsWith("/mobile/handoff");

  return (
    <div className="app-frame flex flex-col">
      {!isHandoff && <MobileTopBar />}
      <main className="flex-1 w-full px-4 pb-32 pt-4">
        <Outlet />
      </main>
      {!isHandoff && <MobileBottomNav />}
    </div>
  );
}
