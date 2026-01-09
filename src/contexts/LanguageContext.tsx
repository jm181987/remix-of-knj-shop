import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "es" | "pt";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// Product translations by product name (Spanish -> Portuguese)
export const productTranslations: Record<string, { name: string; description: string; category: string }> = {
  // Legging Deportivo Premium
  "Legging Deportivo Premium": {
    name: "Legging Esportivo Premium",
    description: "Legging de alta compressão com cintura alta e bolso lateral. Tecido respirável perfeito para treinos intensos.",
    category: "Leggings"
  },
  // Top Deportivo Cruzado
  "Top Deportivo Cruzado": {
    name: "Top Esportivo Cruzado",
    description: "Top com design cruzado nas costas, suporte médio e tecido macio ao toque. Ideal para yoga e pilates.",
    category: "Tops"
  },
  // Conjunto Fitness 2 Piezas
  "Conjunto Fitness 2 Piezas": {
    name: "Conjunto Fitness 2 Peças",
    description: "Set completo de legging e top combinando. Tecido com tecnologia dry-fit que mantém a pele seca.",
    category: "Conjuntos"
  },
  // Shorts Deportivo Running
  "Shorts Deportivo Running": {
    name: "Shorts Esportivo Running",
    description: "Shorts leves com malha interna e cintura elástica. Perfeitos para correr ou treinar na academia.",
    category: "Shorts"
  },
  // Sudadera Oversize Gym
  "Sudadera Oversize Gym": {
    name: "Moletom Oversize Gym",
    description: "Moletom confortável estilo oversize, ideal para antes e depois do treino. Capuz e bolso canguru.",
    category: "Moletons"
  },
  // Calza Ciclista Media Pierna
  "Calza Ciclista Media Pierna": {
    name: "Bermuda Ciclista Meia Perna",
    description: "Bermuda ciclista até o joelho com compressão suave. Perfeita para spinning e cardio.",
    category: "Leggings"
  },
};

const translations: Record<Language, Record<string, string>> = {
  es: {
    // Store
    "store.welcome": "Bienvenido a",
    "store.subtitle": "Descubre nuestros productos y realiza tu compra de forma rápida y segura con Mercado Pago",
    "store.search": "Buscar productos...",
    "store.noProducts": "No hay productos disponibles",
    "store.rights": "Todos los derechos reservados.",
    "store.onlineStore": "Tienda Online",
    "store.buyAt": "Compra en",
    "store.qualityProducts": "Productos de calidad con Mercado Pago.",
    
    // Hero
    "hero.pricesIn": "Precios en",
    "hero.pricesReference": "* Precios en $U son referenciales. El pago se realiza en R$",
    
    // Product
    "product.addToCart": "Agregar al carrito",
    "product.outOfStock": "Sin stock",
    "product.pickupAvailable": "Retiro en tienda disponible",
    "product.selectVariant": "Seleccionar variante",
    "product.lastUnits": "¡Últimas",
    "product.soldOut": "Agotado",
    "product.added": "agregado al carrito",
    
    // Cart
    "cart.title": "Carrito",
    "cart.empty": "Tu carrito está vacío",
    "cart.total": "Total",
    "cart.checkout": "Finalizar Compra",
    "cart.remove": "Eliminar",
    
    // Checkout
    "checkout.title": "Finalizar Compra",
    "checkout.customerInfo": "Información del Cliente",
    "checkout.name": "Nombre completo",
    "checkout.email": "Correo electrónico",
    "checkout.phone": "Teléfono",
    "checkout.shippingMethod": "Método de Envío",
    "checkout.selectLocation": "Haz clic en el mapa para seleccionar tu ubicación de entrega",
    "checkout.locationSelected": "Ubicación seleccionada",
    "checkout.orderSummary": "Resumen del Pedido",
    "checkout.subtotal": "Subtotal",
    "checkout.shipping": "Envío",
    "checkout.payWithPix": "Pagar con PIX",
    "checkout.processing": "Procesando...",
    "checkout.notes": "Notas adicionales",
    "checkout.notesPlaceholder": "Instrucciones especiales para la entrega...",
    
    // Shipping methods
    "shipping.pickup": "Retiro en tienda",
    "shipping.pickupDesc": "Gratis - Recoge en nuestra tienda",
    "shipping.local": "Entrega local",
    "shipping.localDesc": "Entrega en tu dirección",
    "shipping.sedex": "Sedex Brasil",
    "shipping.sedexDesc": "Envío nacional Brasil",
    "shipping.turil": "Turil Uruguay",
    "shipping.turilDesc": "Envío a Uruguay",
    
    // Footer
    "footer.paymentMethods": "Formas de Pago",
    "footer.cards": "Tarjetas de Crédito y Débito",
    "footer.contact": "Contacto",
    "footer.socialMedia": "Redes Sociales",
    "footer.developedBy": "Desarrollado por",
    
    // WhatsApp
    "whatsapp.contact": "Contáctanos por WhatsApp",
    
    // Language
    "language.select": "Idioma",
    "language.es": "Español",
    "language.pt": "Português",
  },
  pt: {
    // Store
    "store.welcome": "Bem-vindo a",
    "store.subtitle": "Descubra nossos produtos e faça sua compra de forma rápida e segura com pagamento PIX",
    "store.search": "Buscar produtos...",
    "store.noProducts": "Não há produtos disponíveis",
    "store.rights": "Todos os direitos reservados.",
    "store.onlineStore": "Loja Online",
    "store.buyAt": "Compre em",
    "store.qualityProducts": "Produtos de qualidade com pagamento PIX.",
    
    // Hero
    "hero.pricesIn": "Preços em",
    "hero.pricesReference": "* Preços em $U são referenciais. O pagamento é feito em R$",
    
    // Product
    "product.addToCart": "Adicionar ao carrinho",
    "product.outOfStock": "Sem estoque",
    "product.pickupAvailable": "Retirada na loja disponível",
    "product.selectVariant": "Selecionar variante",
    "product.lastUnits": "Últimas",
    "product.soldOut": "Esgotado",
    "product.added": "adicionado ao carrinho",
    
    // Cart
    "cart.title": "Carrinho",
    "cart.empty": "Seu carrinho está vazio",
    "cart.total": "Total",
    "cart.checkout": "Finalizar Compra",
    "cart.remove": "Remover",
    
    // Checkout
    "checkout.title": "Finalizar Compra",
    "checkout.customerInfo": "Informações do Cliente",
    "checkout.name": "Nome completo",
    "checkout.email": "E-mail",
    "checkout.phone": "Telefone",
    "checkout.shippingMethod": "Método de Envio",
    "checkout.selectLocation": "Clique no mapa para selecionar sua localização de entrega",
    "checkout.locationSelected": "Localização selecionada",
    "checkout.orderSummary": "Resumo do Pedido",
    "checkout.subtotal": "Subtotal",
    "checkout.shipping": "Frete",
    "checkout.payWithPix": "Pagar com PIX",
    "checkout.processing": "Processando...",
    "checkout.notes": "Notas adicionais",
    "checkout.notesPlaceholder": "Instruções especiais para a entrega...",
    
    // Shipping methods
    "shipping.pickup": "Retirada na loja",
    "shipping.pickupDesc": "Grátis - Retire em nossa loja",
    "shipping.local": "Entrega local",
    "shipping.localDesc": "Entrega no seu endereço",
    "shipping.sedex": "Sedex Brasil",
    "shipping.sedexDesc": "Envio nacional Brasil",
    "shipping.turil": "Turil Uruguai",
    "shipping.turilDesc": "Envio para o Uruguai",
    
    // Footer
    "footer.paymentMethods": "Formas de Pagamento",
    "footer.cards": "Cartões de Crédito e Débito",
    "footer.contact": "Contato",
    "footer.socialMedia": "Redes Sociais",
    "footer.developedBy": "Desenvolvido por",
    
    // WhatsApp
    "whatsapp.contact": "Entre em contato pelo WhatsApp",
    
    // Language
    "language.select": "Idioma",
    "language.es": "Español",
    "language.pt": "Português",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("store-language");
    return (saved as Language) || "es";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("store-language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
