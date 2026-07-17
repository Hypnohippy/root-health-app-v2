import { RootProvider } from "../context/RootContext";
import AuthGate from "../components/AuthGate";

export const metadata = {
  title: "Root Health",
  description: "A system that listens, learns, and guides you.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <RootProvider>
          <AuthGate>
            {children}
          </AuthGate>
        </RootProvider>
      </body>
    </html>
  );
}