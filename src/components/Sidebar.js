"use client";

export default function Sidebar() {
  return (
    <aside className="w-[280px] bg-white border-r border-gray-100 h-screen fixed left-0 top-16 overflow-y-auto no-scrollbar hidden md:block">
      <div className="p-4">
        <sd-component 
            componentId="1178bb72-9e1e-4bb2-bd46-db10764e0418" 
            name="Navigation" 
            activeItem="dashboard" 
            dashboardHref="/dashboard" 
            tasksHref="#tasks" 
            roomsHref="#rooms" 
            streaksHref="#streaks" 
            scheduleHref="#schedule" 
            settingsHref="#settings" 
            userName="Operator" 
            planName="FireForce v1.0.4"
        ></sd-component>
      </div>
    </aside>
  );
}
