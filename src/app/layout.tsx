import "./globals.css"; // CSS global avec Tailwind
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { MathJaxContext } from "better-react-mathjax";
import { mathJaxConfig } from "@/components/admin/utils/mathjaxConfig";

export const metadata = {
  title: "Rosaine Academy",
  description: "Apprenez à votre rythme avec Rosaine Academy",
  icons: {
    icon: "/logo.png", // Favicon principal
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        {/* Favicon principal */}
        <link rel="icon" href="/logo.jpg" sizes="any" />
        <link rel="icon" type="image/jpeg" href="/logo.jpg" />
        {/* Icône Apple (iPhone/iPad) */}
        <link rel="apple-touch-icon" href="/logo.jpg" />
      </head>
      <body className="flex flex-col min-h-screen font-sans">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-6">
          <MathJaxContext version={3} config={mathJaxConfig}>
            {children}
          </MathJaxContext>
        </main>
        <Footer />
      </body>
    </html>
  );
}
