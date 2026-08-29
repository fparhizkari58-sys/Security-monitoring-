"use client";

import React, { useState, useEffect, useCallback } from "react";
import CommandHeader from "@/components/CommandHeader";
import AndroidBottomNav, { AndroidStatusBar } from "@/components/AndroidBottomNav";
import TabShiftReport24H from "@/components/TabShiftReport24H";
import TabPatrolQr from "@/components/TabPatrolQr";
import TabCompetencyExams from "@/components/TabCompetencyExams";
import TabExecutiveReports from "@/components/TabExecutiveReports";
import { getOfflineScans, clearOfflineScan } from "@/lib/offline-queue";

export default function AvicennaSecurityAndroidApp() {
  const [activeTab, setActiveTab] = useState<
    "SHIFT_REPORT" | "PATROL_QR" | "EXAMS" | "REPORTS"
  >("SHIFT_REPORT");
  const [activeRole, setActiveRole] = useState<string>("security_officer");
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(false);
  const [currentTheme, setCurrentTheme] = useState<"sleek" | "dark">("sleek");

  const [shiftReport, setShiftReport] = useState<any | null>(null);
  const [patrolTasks, setPatrolTasks] = useState<any[]>([]);
  const [patrolSummary, setPatrolSummary] = useState({
    red: 4,
    yellow: 2,
    green: 12,
    total: 18,
  });

  const [examSessions, setExamSessions] = useState<any[]>([]);
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);

  // اعمال تم به المان ریشه html
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      currentTheme === "sleek" ? "sleek" : "dark"
    );
    if (currentTheme === "sleek") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  }, [currentTheme]);

  const toggleTheme = () => {
    setCurrentTheme((prev) => (prev === "sleek" ? "dark" : "sleek"));
  };

  const fetchAllData = useCallback(async () => {
    try {
      const [shiftRes, patrolRes, examRes, userRes] = await Promise.all([
        fetch("/api/shift-report"),
        fetch("/api/patrols"),
        fetch("/api/exams"),
        fetch("/api/users"),
      ]);

      if (shiftRes.ok) {
        const shiftData = await shiftRes.json();
        setShiftReport(shiftData.shiftReport);
      }

      if (patrolRes.ok) {
        const patrolData = await patrolRes.json();
        setPatrolTasks(patrolData.patrolTasks || []);
        if (patrolData.summary) {
          setPatrolSummary(patrolData.summary);
        }
      }

      if (examRes.ok) {
        const examData = await examRes.json();
        setExamSessions(examData.sessions || []);
        setExamQuestions(examData.questions || []);
      }

      if (userRes.ok) {
        const userData = await userRes.json();
        setUsersList(userData.users || []);
      }
    } catch (err) {
      console.error("Error loading Avicenna Hospital Security data:", err);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleSyncOffline = async () => {
    const offlineScans = await getOfflineScans();
    for (const scan of offlineScans) {
      try {
        await fetch("/api/patrols", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "SCAN_QR",
            patrolId: scan.patrolId,
            userLat: scan.userLat,
            userLng: scan.userLng,
            note: "اسکن آفلاین سنکرون‌شده از Room/IndexedDB",
          }),
        });
        await clearOfflineScan(scan.id);
      } catch (err) {
        console.error("Failed syncing offline scan:", err);
      }
    }
    fetchAllData();
  };

  return (
    <div
      className={`min-h-screen transition-colors ${
        isPhoneFrame
          ? "bg-slate-900/90 py-6 px-2 flex flex-col items-center justify-center"
          : "bg-[#F7F9FF] dark:bg-[#090D16] text-[#1A1C1E] dark:text-[#F8FAFC]"
      }`}
    >
      {/* بدنه اپلیکیشن: در حالت Phone Frame مانند گوشی اندروید با لبه‌های ۴۴dp و در حالت عریض تمام‌صفحه */}
      <div
        className={`w-full transition-all duration-300 ${
          isPhoneFrame
            ? "max-w-[440px] android-phone-frame bg-[#F7F9FF] dark:bg-[#090D16] text-[#1A1C1E] dark:text-[#F8FAFC] overflow-hidden border-4 border-slate-700 relative my-auto shadow-2xl"
            : "min-h-screen flex flex-col justify-between"
        }`}
      >
        {/* نوار وضعیت سیستم اندروید (ساعت، باتری، سیگنال 5G) */}
        <AndroidStatusBar />

        {/* سربرگ نوار ابزار بالا (AppBar) */}
        <CommandHeader
          activeRole={activeRole}
          onChangeRole={setActiveRole}
          patrolCounts={patrolSummary}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onSyncOffline={handleSyncOffline}
          isSimulatedOffline={isSimulatedOffline}
          onToggleOffline={() => setIsSimulatedOffline((prev) => !prev)}
          isPhoneFrame={isPhoneFrame}
          onTogglePhoneFrame={() => setIsPhoneFrame((prev) => !prev)}
          currentTheme={currentTheme}
          onToggleTheme={toggleTheme}
        />

        {/* محتوای فعال ۴ بخش اصلی اپلیکیشن اندروید */}
        <main className="flex-1 px-3 sm:px-6 py-5 max-w-7xl mx-auto w-full pb-20">
          {activeTab === "SHIFT_REPORT" && (
            <TabShiftReport24H
              shiftReport={shiftReport}
              activeRole={activeRole}
              onRefreshReport={fetchAllData}
            />
          )}

          {activeTab === "PATROL_QR" && (
            <TabPatrolQr
              patrolTasks={patrolTasks}
              activeRole={activeRole}
              isSimulatedOffline={isSimulatedOffline}
              onRefreshPatrols={fetchAllData}
            />
          )}

          {activeTab === "EXAMS" && (
            <TabCompetencyExams
              sessions={examSessions}
              questions={examQuestions}
              onRefreshExams={fetchAllData}
              activeRole={activeRole}
            />
          )}

          {activeTab === "REPORTS" && (
            <TabExecutiveReports
              shiftReport={shiftReport}
              patrolSummary={patrolSummary}
              usersList={usersList}
            />
          )}
        </main>

        {/* ناوبری چهارگانه پایین اندروید (Material 3 Bottom Navigation) */}
        <AndroidBottomNav
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          redCount={patrolSummary.red}
          yellowCount={patrolSummary.yellow}
          greenCount={patrolSummary.green}
        />
      </div>
    </div>
  );
}
