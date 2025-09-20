"use client";

export default function Footer() {
  const colors = {
    darkBlue: "#25364C",     // Fond
    white: "#FFFFFF",         // Texte
    primaryGreen: "#65B04E",  // Liens et hover
    lightHover: "#E5F0FA",   // Hover clair si besoin
  };

  return (
    <footer style={{ backgroundColor: colors.darkBlue, color: colors.white }} className="py-8 mt-12">
      <div className="container mx-auto px-4 text-center text-sm space-y-2">
        <p className="font-medium">
          &copy; {new Date().getFullYear()} Rosaine Academy. Tous droits réservés.
        </p>
        <p>
          Contact :{" "}
          <a
            href="mailto:contact@rosaineacademy.com"
            style={{ color: colors.primaryGreen }}
            className="hover:underline"
          >
            contact@rosaineacademy.com
          </a>{" "}
          | Téléphone :{" "}
          <a
            href="tel:+33123456789"
            style={{ color: colors.primaryGreen }}
            className="hover:underline"
          >
            01 23 45 67 89
          </a>
        </p>
        <p>
          <a
            href="/privacy"
            style={{ color: colors.primaryGreen }}
            className="hover:underline mr-4"
          >
            Politique de confidentialité
          </a>
          <a
            href="/terms"
            style={{ color: colors.primaryGreen }}
            className="hover:underline"
          >
            Conditions d’utilisation
          </a>
        </p>
      </div>
    </footer>
  );
}
