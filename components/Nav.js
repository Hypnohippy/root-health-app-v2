export default function Nav() {
  const links = [
    { href: "/", label: "Home" },
    { href: "/body", label: "Body Signals" },
    { href: "/mind", label: "Mind & Emotions" },
    { href: "/journal", label: "Journal" },
    { href: "/insights", label: "Insights" },
    { href: "/coach", label: "Coach" },
    { href: "/profile", label: "Profile" },
  ];

  return (
    <nav style={styles.nav}>
      <div style={styles.logo}>Root Health</div>

      <div style={styles.links}>
        {links.map((link) => (
          <a key={link.href} href={link.href} style={styles.link}>
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    width: "100%",
    padding: "16px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(255,255,255,0.75)",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    boxSizing: "border-box",
  },
  logo: {
    fontWeight: "700",
    color: "#1A1A1A",
  },
  links: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
  },
  link: {
    color: "#333",
    textDecoration: "none",
    fontSize: "14px",
  },
};
