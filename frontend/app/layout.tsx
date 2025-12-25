import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parrot Software Treatment - Cognitive Therapy for Seniors",
  description: "Accessible cognitive and memory treatment applications designed for users 65+ years old",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
