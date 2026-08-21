import type { Metadata } from "next";
import "./globals.css";
import { INSTITUTION_CONFIG } from "@/config/institution";

export const metadata: Metadata = {
  title: `${INSTITUTION_CONFIG.surveyTitle} | ${INSTITUTION_CONFIG.shortName}`,
  description: INSTITUTION_CONFIG.surveyDescription,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
