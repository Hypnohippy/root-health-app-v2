export default function RootEnso({ size = 84 }) {
  return (
    <img
      src="/root-logo.png"
      alt="Root Health"
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        display: "inline-block",
      }}
    />
  );
}
