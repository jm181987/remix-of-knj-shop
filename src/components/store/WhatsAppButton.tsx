import { MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface WhatsAppButtonProps {
  phoneNumber?: string;
}

export function WhatsAppButton({ phoneNumber }: WhatsAppButtonProps) {
  const { t } = useLanguage();

  if (!phoneNumber) return null;

  const cleanNumber = phoneNumber.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${cleanNumber}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 hover:shadow-xl animate-bounce-slow"
      aria-label={t("whatsapp.contact")}
    >
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-30" />
      <MessageCircle className="relative h-7 w-7" fill="currentColor" />
    </a>
  );
}
