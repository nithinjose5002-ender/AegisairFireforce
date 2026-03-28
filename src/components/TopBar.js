"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function TopBar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight">AegisAir <span className="text-gray-400 font-normal">Dashboard</span></h1>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
            <div className="text-right">
                <p className="text-sm font-semibold text-gray-800">{user?.displayName || "System Operator"}</p>
                <p className="text-[10px] font-mono text-system-blue uppercase tracking-tighter">Status: Active</p>
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200">
                <span className="text-xs font-bold text-gray-400">FF</span>
            </div>
        </div>
        
        <button 
            onClick={handleLogout}
            className="text-sm font-semibold text-gray-500 hover:text-emergency-red transition-colors flex items-center gap-2"
        >
            Logout
        </button>
      </div>
    </header>
  );
}
