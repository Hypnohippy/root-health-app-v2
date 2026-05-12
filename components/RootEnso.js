export default function RootEnso({ size = 86 }) {
  const scale = size / 100;

  return (
    <div
      style={{
        width: size,
        height: size + 28 * scale,
        position: "relative",
        display: "inline-flex",
        alignItems: "flex-start",
        justifyContent: "center",
      }}
    >
      <svg
        width={size}
        height={size + 28 * scale}
        viewBox="0 0 100 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible" }}
      >
        {/* soft shadow */}
        <path
          d="M22 50C19 35 27 20 42 15C58 9 77 17 83 34C89 52 80 70 63 77C46 84 28 77 22 61"
          stroke="rgba(0,0,0,0.16)"
          strokeWidth="9"
          strokeLinecap="round"
          transform="translate(2 3)"
        />

        {/* main brush enso - broken circle */}
        <path
          d="M21 51C18 36 26 20 42 14C58 8 78 16 84 34C91 54 80 73 61 79C43 84 25 76 20 60"
          stroke="#171717"
          strokeWidth="8.5"
          strokeLinecap="round"
        />

        {/* uneven brush overlay */}
        <path
          d="M25 38C30 24 44 16 58 18C72 20 82 31 83 45"
          stroke="#171717"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.86"
        />

        {/* dry brush gap / lighter stroke */}
        <path
          d="M29 68C38 77 53 80 66 73"
          stroke="#2D2A25"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.55"
        />

        {/* root trunk */}
        <path
          d="M50 80C50 89 49 96 48 105"
          stroke="#8A6A43"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* roots */}
        <path
          d="M48 101C41 105 35 111 30 119"
          stroke="#8A6A43"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M49 101C45 109 43 115 40 124"
          stroke="#8A6A43"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M50 101C52 109 55 116 59 124"
          stroke="#8A6A43"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M51 101C59 106 66 113 72 121"
          stroke="#8A6A43"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M47 108C43 108 38 107 34 105"
          stroke="#8A6A43"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.75"
        />
        <path
          d="M53 109C59 109 64 107 69 104"
          stroke="#8A6A43"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.75"
        />

        {/* small red seal */}
        <rect
          x="78"
          y="78"
          width="10"
          height="14"
          rx="1.5"
          fill="#C23B30"
          opacity="0.95"
        />
        <path
          d="M81 82H85M81 86H85M83 80V90"
          stroke="#F7F1E7"
          strokeWidth="0.9"
          strokeLinecap="round"
          opacity="0.85"
        />
      </svg>
    </div>
  );
}
