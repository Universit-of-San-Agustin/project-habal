import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Mobile customer app — no sidebar/nav
  if (currentPageName === "Home") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      <style>{`
        :root { --background: 9 9 11; }
        body { background-color: rgb(3,7,18); }
      `}</style>
    </div>
  );
}