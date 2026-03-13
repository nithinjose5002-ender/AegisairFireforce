"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot as onFirestoreSnapshot } from "firebase/firestore";
import { ref, onValue } from "firebase/database";
import { db, rtdb } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [dangerUsers, setDangerUsers] = useState([]);
  const [globalRiskLevel, setGlobalRiskLevel] = useState("SAFE");
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchStatusAndData = async () => {
      try {
        // 1. Fetch Risk Level from RTDB (Polling mode)
        const riskRef = ref(rtdb, 'devices/esp32-001/riskLevel');
        onValue(riskRef, (snapshot) => {
          const risk = snapshot.val();
          const riskStr = risk?.toString().toUpperCase();
          setGlobalRiskLevel(riskStr);

          if (riskStr === "DANGER") {
            // 2. If DANGER, fetch users filtered by deviceId
            const unsubscribeFirestore = onFirestoreSnapshot(collection(db, "users"), (querySnapshot) => {
              const users = [];
              querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Match "deviceId" in user doc with the device name "esp32-001"
                if (data.deviceId === "esp32-001") {
                  users.push({ id: doc.id, ...data });
                }
              });
              setDangerUsers(users);
              setIsDataLoading(false);
            }, (error) => {
              console.error("Error fetching users:", error);
              setIsDataLoading(false);
            });
            
            return () => unsubscribeFirestore();
          } else {
            setDangerUsers([]);
            setIsDataLoading(false);
          }
        }, { onlyOnce: true }); // We use onlyOnce for polling
      } catch (error) {
        console.error("Polling Error:", error);
      }
    };

    // Initial fetch
    fetchStatusAndData();

    // 30-second interval
    const interval = setInterval(fetchStatusAndData, 30000);

    return () => clearInterval(interval);
  }, [user]);

  if (loading || !user) return null;

  const showDangerContent = globalRiskLevel?.toString().toUpperCase() === "DANGER";

  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      <Sidebar />
      
      <main className="md:ml-[280px] pt-24 p-8">
        <div className="max-w-6xl mx-auto">

          <div className="mb-8 flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">AegisAir FireForce branch</h2>
              <p className="text-gray-500 mt-1">Intelligent responder dispatch & monitoring</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-red-50 text-emergency-red rounded-full text-xs font-bold uppercase tracking-wider border border-emergency-red/10 animate-pulse">
                <span className="w-1.5 h-1.5 bg-emergency-red rounded-full"></span>
                Live Feed
            </div>
          </div>

          {isDataLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-48 bg-gray-50 rounded-xl animate-pulse"></div>
                ))}
            </div>
          ) : !showDangerContent ? (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <p className="text-gray-400 font-medium italic">
                    System Status: <span className="text-system-blue font-bold uppercase tracking-widest">{globalRiskLevel || 'STABLE'}</span>
                </p>
                <p className="text-gray-400 mt-2">No immediate danger incidents detected.</p>
            </div>
          ) : dangerUsers.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <p className="text-gray-400 font-medium italic">Danger detected, but no user records found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dangerUsers.map((u) => (
                <div 
                    key={u.id} 
                    className="bg-white p-6 rounded-xl border-2 border-emergency-red shadow-danger-glow transition-all hover:scale-[1.02]"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-red-50 rounded-lg text-emergency-red">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block mb-0.5">Subject Name</label>
                      <p className="text-xl font-bold text-gray-900">{u.fullName}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block mb-0.5">Contact</label>
                        <p className="text-sm font-semibold text-gray-700">{u.phone}</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block mb-0.5">City Node</label>
                        <p className="text-sm font-semibold text-gray-700">{u.city}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                    <button className="text-[10px] font-bold text-system-blue uppercase tracking-widest hover:underline">Dispatch Unit</button>
                    <span className="text-[10px] font-mono text-gray-400">ID: {u.id.substring(0, 8)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
