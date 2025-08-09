export default function Footer() {
  return (
    <footer className="bg-pink-100 text-gray-700 py-8 mt-12 border-t border-pink-200">
      <div className="container mx-auto px-4 text-center text-sm space-y-2">
        <p className="text-pink-800 font-medium">
          &copy; {new Date().getFullYear()} TutosHub. Tous droits réservés.
        </p>
        <p>
          Contact :{" "}
          <a
            href="mailto:contact@tutoshub.com"
            className="text-pink-600 hover:underline"
          >
            contact@tutoshub.com
          </a>{" "}
          | Téléphone :{" "}
          <a href="tel:+33123456789" className="text-pink-600 hover:underline">
            01 23 45 67 89
          </a>
        </p>
        <p>
          <a
            href="/privacy"
            className="text-pink-600 hover:underline mr-4"
          >
            Politique de confidentialité
          </a>
          <a
            href="/terms"
            className="text-pink-600 hover:underline"
          >
            Conditions d’utilisation
          </a>
        </p>
      </div>
    </footer>
  );
}
