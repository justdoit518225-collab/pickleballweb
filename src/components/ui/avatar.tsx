import Image from "next/image";

type AvatarProps = {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
};

const sizes = { sm: 32, md: 40, lg: 64 };

export function Avatar({ src, name, size = "md" }: AvatarProps) {
  const px = sizes[size];
  const initial = name.trim().charAt(0) || "?";

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={px}
        height={px}
        className="rounded-full object-cover"
        unoptimized
      />
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-brand-navy-soft font-medium text-brand-navy"
      style={{
        width: px,
        height: px,
        fontSize: size === "sm" ? 12 : size === "lg" ? 18 : 14,
      }}
    >
      {initial}
    </span>
  );
}
