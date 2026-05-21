export default function Nav() {
  const links = [
    { href: "/", label: "Home" },
    { href: "/body", label: "Body" },
    { href: "/mind", label: "Mind" },
    { href: "/journal", label: "Journal" },
    { href: "/insights", label: "Insights" },
    { href: "/coach", label: "Coach" },
    { href: "/profile", label: "You" },
  ];

  return (
    <nav style={styles.nav}>
      <a href="/" style={styles.logo}>
        Root
      </a>

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
    position: "fixed",
    top: "18px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 1000,
    width: "min(920px, calc(100% - 28px))",
    padding: "10px 12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(255,255,255,0.28)",
    border: "1px solid rgba(255,255,255,0.36)",
    borderRadius: "999px",
    backdropFilter: "blur(22px)",
    boxShadow: "0 18px 50px rgba(20,18,15,0.12)",
    boxSizing: "border-box",
  },

  logo: {
    textDecoration: "none",
    fontWeight: "800",
    color: "#1A1A1A",
    padding: "8px 14px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.34)",
    fontSize: "14px",
  },

  links: {
    display: "flex",
    gap: "4px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  link: {
    color: "#2A261F",
    textDecoration: "none",
    fontSize: "13px",
    padding: "8px 10px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.18)",
    whiteSpace: "nowrap",
  },
};
