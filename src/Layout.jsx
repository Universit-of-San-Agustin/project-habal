import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, Bike, Users, MapPin, BookOpen,
  ShieldAlert, Settings, Menu, X, ChevronRight,
  Activity
} from "lucide-react";

const navItems = [
  { label: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
  { label: "Bookings", page: "Bookings", icon: BookOpen },
  { label: "Networks", page: "Networks", icon: Users },
  { label: "Riders", page: "Riders", icon: Bike },
  { label: "Zones", page: "Zones", icon: MapPin },
  { label: "Audit Log", page: "AuditLog", icon: Activity },
  { label: "Enforcement", page: "Enforcement", icon: ShieldAlert },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Mobile customer app — no sidebar/nav
  if (currentPageName === "Home") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
          <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">
            <Bike className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">Habal Moto</div>
            <div className="text-xs text-gray-400">Iloilo Rider Network</div>
          </div>
          <button
            className="ml-auto lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map(({ label, page, icon: Icon }) => {
            const active = currentPageName === page;
            return (
              <Link
                key={page}
                to={createPageUrl(page)}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
                {active && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">Platform Active</span>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 px-4 py-4 bg-gray-900 border-b border-gray-800">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
            <Bike className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm">Habal Moto</span>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      <style>{`
        :root {
          --background: 9 9 11;
        }
        body { background-color: rgb(3,7,18); }
      `}</style>
    </div>
  );
}