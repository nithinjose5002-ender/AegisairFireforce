"use client";

import { useEffect, useState, useRef } from "react";
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
  const [acknowledgedLog, setAcknowledgedLog] = useState([]);
  
  const firestoreUnsubRef = useRef(null);
  const dangerTimerRef = useRef(null);
  const ackRef = useRef(false);
  const riskLevelRef = useRef("SAFE");
  const dangerUsersRef = useRef([]);

  const handleAcknowledgeUser = (userId) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const userToAck = dangerUsersRef.current.find(u => u.id === userId);
    if (userToAck) {
      setAcknowledgedLog(prev => [
        { users: [userToAck], timestamp },
        ...prev,
      ]);
    }
    const remaining = dangerUsersRef.current.filter(u => u.id !== userId);
    dangerUsersRef.current = remaining;
    setDangerUsers(remaining);

    if (remaining.length === 0) {
      ackRef.current = true;
      setGlobalRiskLevel("SAFE");
      riskLevelRef.current = "SAFE";
      if (firestoreUnsubRef.current) {
        firestoreUnsubRef.current();
        firestoreUnsubRef.current = null;
      }
      if (dangerTimerRef.current) {
        clearTimeout(dangerTimerRef.current);
        dangerTimerRef.current = null;
      }
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchStatusAndData = async () => {
      try {
        const gasRef = ref(rtdb, 'devices/esp32-001/gas/value');
        onValue(gasRef, (snapshot) => {
          const gasValue = snapshot.val() || 0;
          const isCurrentlyDanger = gasValue >= 1000;
          
          if (!isCurrentlyDanger) {
             ackRef.current = false;
          }
          
          const wasDanger = riskLevelRef.current.includes("DANGER");
          let nextState = "SAFE";
          
          if (isCurrentlyDanger) {
              if (dangerTimerRef.current) {
                clearTimeout(dangerTimerRef.current);
                dangerTimerRef.current = null;
              }
              
              if (ackRef.current) {
                setDangerUsers([]);
                if (firestoreUnsubRef.current) {
                  firestoreUnsubRef.current();
                  firestoreUnsubRef.current = null;
                }
              } else {
                nextState = `DANGER (${gasValue} ppm)`;
                if (!wasDanger) {
                  if (firestoreUnsubRef.current) firestoreUnsubRef.current();
                  firestoreUnsubRef.current = onFirestoreSnapshot(collection(db, "users"), (querySnapshot) => {
                    const users = [];
                    querySnapshot.forEach((doc) => {
                      const data = doc.data();
                      if (data.deviceId === "esp32-001") users.push({ id: doc.id, ...data });
                    });
                    setDangerUsers(users);
                    dangerUsersRef.current = users;
                    setIsDataLoading(false);
                  }, (error) => {
                    console.error("Error fetching users:", error);
                    setIsDataLoading(false);
                  });
                }
              }
          } else if (wasDanger && !ackRef.current) {
              nextState = `DANGER (${gasValue} ppm) - RECOVERING`;
              if (!dangerTimerRef.current) {
                dangerTimerRef.current = setTimeout(() => {
                  setGlobalRiskLevel("SAFE");
                  riskLevelRef.current = "SAFE";
                  setDangerUsers([]);
                  if (firestoreUnsubRef.current) {
                    firestoreUnsubRef.current();
                    firestoreUnsubRef.current = null;
                  }
                  dangerTimerRef.current = null;
                }, 3 * 60 * 1000);
              }
          } else {
              setDangerUsers([]);
              if (firestoreUnsubRef.current) {
                 firestoreUnsubRef.current();
                 firestoreUnsubRef.current = null;
              }
              setIsDataLoading(false);
              nextState = "SAFE";
          }
          
          setGlobalRiskLevel(nextState);
          riskLevelRef.current = nextState;
        }, { onlyOnce: true });
      } catch (error) {
        console.error("Polling Error:", error);
      }
    };

    fetchStatusAndData();
    const interval = setInterval(fetchStatusAndData, 30000);

    return () => {
      clearInterval(interval);
      if (firestoreUnsubRef.current) firestoreUnsubRef.current();
      if (dangerTimerRef.current) clearTimeout(dangerTimerRef.current);
    };
  }, [user]);

  if (loading || !user) return null;

  const showDangerContent = globalRiskLevel?.toString().toUpperCase().includes("DANGER");

  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      <Sidebar />
      
      <main className="md:ml-[280px] pt-24 p-8">
        <div className="max-w-6xl mx-auto">

          <div className="mb-8 flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">AegisAir FireForce</h2>
              <p className="text-gray-500 mt-1">Intelligent responder dispatch &amp; monitoring</p>
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
                        <a href={`tel:${u.phone}`} className="text-sm font-semibold text-system-blue hover:underline block truncate">{u.phone}</a>
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block mb-0.5">Address</label>
                        <p className="text-sm font-semibold text-gray-700 block truncate">{u.address || u.city}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-2">
                      <label className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block mb-2">Location Map</label>
                      <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                        <iframe 
                          width="100%" 
                          height="100%" 
                          frameBorder="0" 
                          scrolling="no" 
                          marginHeight="0" 
                          marginWidth="0" 
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(u.address || u.city)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                        ></iframe>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                    <button 
                      onClick={() => handleAcknowledgeUser(u.id)}
                      className="text-[10px] font-bold text-system-blue uppercase tracking-widest hover:underline"
                    >
                      Acknowledge
                    </button>
                    <span className="text-[10px] font-mono text-gray-400">ID: {u.id.substring(0, 8)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {acknowledgedLog.length > 0 && (
          <div className="mt-10">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Recently Acknowledged — This Session</h3>
            <div className="space-y-3">
              {acknowledgedLog.map((entry, idx) => (
                <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4">
                  <p className="text-[10px] font-mono text-gray-400 mb-2 uppercase tracking-widest">Acknowledged at {entry.timestamp}</p>
                  <div className="flex flex-wrap gap-3">
                    {entry.users.map((u) => (
                      <div key={u.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-green-400"></span>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{u.fullName}</p>
                          <a href={`tel:${u.phone}`} className="text-[10px] text-system-blue hover:underline">{u.phone}</a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
