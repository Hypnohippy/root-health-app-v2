import { RootProvider } from "../context/RootContext";

export const metadata = {
  title: "Root Health",
  description: "A system that listens, learns, and guides you.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <RootProvider>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}