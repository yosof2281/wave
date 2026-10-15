// app/layout.jsx
import "./globals.css";
import { sans } from "../lib/fonts";
import { CartProvider } from "../components/CartContext";
import CartDrawer from "../components/CartDrawer";

export const metadata = {
  title: "WAVE",
  description: "Elegance, in motion. The Autumn/Winter 2026 collection.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={sans.className}>
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}