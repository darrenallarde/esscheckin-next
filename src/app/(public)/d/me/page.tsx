import type { Metadata } from "next";
import { StudentHub } from "./StudentHub";

export const metadata: Metadata = {
  title: "My Hub | SheepDoggo",
  description: "Your prayers, devotionals, and profile",
};

export default function Page() {
  return <StudentHub />;
}
