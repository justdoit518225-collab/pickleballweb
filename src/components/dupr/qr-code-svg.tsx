import QRCode from "qrcode";

export async function QrCodeSvg({
  value,
  size = 200,
  className = "",
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const svg = await QRCode.toString(value, {
    type: "svg",
    margin: 2,
    width: size,
    color: {
      dark: "#0B2447",
      light: "#FFFFFF",
    },
  });

  return (
    <div
      className={`inline-block bg-white p-3 ${className}`}
      style={{ width: size + 24, height: size + 24 }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
