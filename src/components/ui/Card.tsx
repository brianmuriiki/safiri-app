interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export default function Card({
  children,
  className = "",
  onClick,
  hover,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#111827] border border-white/8 rounded-2xl ${hover ? "hover:border-orange-500/30 hover:bg-[#141e33] transition-all duration-200 cursor-pointer" : ""} ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
