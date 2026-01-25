import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { MathJaxContext } from "better-react-mathjax";
import { mathJaxConfig } from "@/components/admin/utils/mathjaxConfig";

export const metadata = {
  title: "Rosaine Academy",
  description: "Apprenez à votre rythme avec Rosaine Academy",
  icons: {
    icon: "/logo.png",
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
        <link rel="icon" href="/logo.jpg" sizes="any" />
        <link rel="icon" type="image/jpeg" href="/logo.jpg" />
        <link rel="apple-touch-icon" href="/logo.jpg" />
      </head>
      <body className="flex flex-col min-h-screen font-sans">
        <Header />
        <main className="flex-grow">
          <MathJaxContext version={3} config={mathJaxConfig}>
            {children}
          </MathJaxContext>
        </main>
        <Footer />
      </body>
    </html>
  );
}