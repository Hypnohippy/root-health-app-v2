export default function RootEnso({ size = 72 }) {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: "6px solid #181818",
          borderRightColor: "transparent",
          transform: "rotate(-18deg)",
          opacity: 0.95,
          boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: "-10px",
          width: "2px",
          height: "18px",
          background: "#8B6B4A",
          borderRadius: "999px",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: "-18px",
          left: "50%",
          width: "26px",
          height: "2px",
          background: "#8B6B4A",
          transform: "translateX(-50%)",
          opacity: 0.7,
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: "-14px",
          left: "50%",
          width: "14px",
          height: "14px",
          borderLeft: "2px solid #8B6B4A",
          borderBottom: "2px solid #8B6B4A",
          transform: "translateX(-50%) rotate(-45deg)",
          opacity: 0.7,
        }}
      />
    </div>
  );
}
