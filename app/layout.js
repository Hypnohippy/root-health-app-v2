export const metadata = {
  title: "Root Health",
  description: "A system that listens, learns, and guides you."
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
