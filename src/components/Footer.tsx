export default function Footer() {
  return (
    <footer className="bg-[#1B9AAA] text-white py-8 mt-12">
      <div className="container mx-auto px-4 text-center text-sm space-y-2">
        <p className="font-medium">
          &copy; {new Date().getFullYear()} Rosaine Academy. Tous droits réservés.
        </p>
        <p>
          Contact :{" "}
          <a
            href="mailto:contact@rosaineacademy.com"
            className="text-[#4CAF50] hover:underline"
          >
            contact@rosaineacademy.com
          </a>{" "}
          | Téléphone :{" "}
          <a href="tel:+33123456789" className="text-[#4CAF50] hover:underline">
            01 23 45 67 89
          </a>
        </p>
        <p>
          <a
            href="/privacy"
            className="text-[#4CAF50] hover:underline mr-4"
          >
            Politique de confidentialité
          </a>
          <a
            href="/terms"
            className="text-[#4CAF50] hover:underline"
          >
            Conditions d’utilisation
          </a>
        </p>
      </div>
    </footer>
  );
}
