import type { Metadata } from "next";
import "./globals.css";
import "./admin.css";
import { getInstitutionSettings } from "@/lib/institution-settings";

export async function generateMetadata(): Promise<Metadata> {
  const institution = await getInstitutionSettings();

  return {
    title: `${institution.surveyTitle} | ${institution.shortName}`,
    description: institution.surveyDescription,
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
