import { ArrowLeft } from "lucide-react";

export default function BackToHome() {
  return (
    <a
      href="/"
      data-ocid="nav.link"
      className="inline-flex items-center gap-2 text-white/60 hover:text-[#C9A84C] transition-colors text-sm font-medium py-4 px-6"
    >
      <ArrowLeft size={16} />
      Back to Home
    </a>
  );
}
