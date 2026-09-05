import { RootProvider } from "../context/RootContext";
import AuthGate from "../components/AuthGate";

export const metadata = {
  metadataBase: new URL("https://www.roothealth.app"),
  title: {
    default: "Root Health",
    template: "%s | Root Health",
  },
  description:
    "Root Health helps people understand their wellbeing, recognise patterns, and take practical next steps for their health.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "Root Health",
    title: "Root Health",
    description:
      "Understand your wellbeing, recognise patterns, and take practical next steps for your health.",
    images: [
      {
        url: "/visuals/root-personal-hero.jpg",
        alt: "Root Health",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Root Health",
    description:
      "Understand your wellbeing, recognise patterns, and take practical next steps for your health.",
    images: ["/visuals/root-personal-hero.jpg"],
  },
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
