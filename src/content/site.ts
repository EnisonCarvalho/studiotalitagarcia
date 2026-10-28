// Conteúdo editável do site. Atualize textos, fotos e depoimentos aqui.
export const WHATSAPP_NUMBER = "5585933005196";
export const WHATSAPP_DISPLAY = "+55 85 93300-5196";
export const INSTAGRAM_HANDLE = "@studio_talitagarcia";
export const INSTAGRAM_URL = "https://instagram.com/studio_talitagarcia";

export function whatsappLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const GENERAL_MESSAGE =
  "Olá! Conheci o Studio Talita Garcia pelo site e gostaria de saber mais sobre os procedimentos e horários disponíveis para agendamento.";

export function serviceMessage(procedimento: string) {
  return `Olá, Talita! Conheci seu studio pelo site e gostaria de saber mais sobre os procedimentos de ${procedimento} e os horários disponíveis.`;
}

// Fotos: preencha `src` com o endereço da imagem quando disponível.
export type Photo = { src?: string; alt: string; label: string };

export const photos = {
  hero: { alt: "Talita Garcia no Studio Talita Garcia", label: "Foto da Talita" } as Photo,
  portrait: { alt: "Retrato profissional de Talita Garcia", label: "Retrato da Talita" } as Photo,
  space: { alt: "Ambiente do Studio Talita Garcia", label: "Foto do espaço do studio" } as Photo,
  cta: { alt: "Detalhe do ambiente do Studio Talita Garcia", label: "Detalhe do studio" } as Photo,
};

export type Category = "Cílios" | "Sobrancelhas" | "Unhas" | "Depilação";

export const services: {
  id: string;
  title: Category;
  term: string;
  description: string;
  photo: Photo;
}[] = [
  { id: "cilios", title: "Cílios", term: "cílios", description: "Realce o olhar com delicadeza e naturalidade.", photo: { alt: "Extensão de cílios realizada no studio", label: "Foto de cílios" } },
  { id: "sobrancelhas", title: "Sobrancelhas", term: "sobrancelhas", description: "Harmonia e definição para valorizar seu rosto.", photo: { alt: "Design de sobrancelhas realizado no studio", label: "Foto de sobrancelhas" } },
  { id: "unhas", title: "Unhas", term: "unhas", description: "Manicure, unhas em gel e acrílico, com cuidado e acabamento impecável.", photo: { alt: "Unhas feitas no studio", label: "Foto de unhas" } },
  { id: "depilacao", title: "Depilação", term: "depilação", description: "Cuidado, conforto e atenção em cada sessão.", photo: { alt: "Ambiente de depilação do studio", label: "Foto de depilação" } },
];

// Galeria: adicione fotos reais com sua categoria.
export const gallery: (Photo & { category: Category; tall?: boolean })[] = [
  { category: "Cílios", alt: "Resultado de cílios", label: "Cílios", tall: true },
  { category: "Sobrancelhas", alt: "Resultado de sobrancelhas", label: "Sobrancelhas" },
  { category: "Unhas", alt: "Resultado de unhas", label: "Unhas" },
  { category: "Cílios", alt: "Resultado de cílios", label: "Cílios" },
  { category: "Unhas", alt: "Resultado de unhas", label: "Unhas", tall: true },
  { category: "Sobrancelhas", alt: "Resultado de sobrancelhas", label: "Sobrancelhas" },
];

// Depoimentos reais autorizados: { text, name, stars? }
export const testimonials: { text: string; name: string; stars?: number }[] = [];
