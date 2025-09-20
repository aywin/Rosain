import "./globals.css"; // CSS global avec Tailwind
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { MathJaxContext } from "better-react-mathjax";
import { mathJaxConfig } from "@/components/admin/utils/mathjaxConfig";

export const metadata = {
  title: "Rosaine Academy",
  description: "Apprenez à votre rythme avec Rosaine Academy",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        {/* Favicon vide pour bloquer celui de Next.js */}
        <link rel="icon" href="data:," />
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
