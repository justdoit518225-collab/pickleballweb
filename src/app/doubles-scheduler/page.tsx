import type { Metadata } from "next";
import { DoublesSchedulerApp } from "@/components/scheduler/doubles-scheduler-app";

export const metadata: Metadata = {
  title: "雙打賽程產生器",
  description: "匹克球動態雙打賽程與計分",
};

export default function DoublesSchedulerPage() {
  return <DoublesSchedulerApp />;
}
