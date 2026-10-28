// Conteúdo editável do site. Atualize textos, fotos e depoimentos aqui.
export const WHATSAPP_NUMBER = "5585933005196";
export const WHATSAPP_DISPLAY = "+55 85 93300-5196";
export const INSTAGRAM_HANDLE = "@studio_talitagarcia";
export const INSTAGRAM_URL = "https://www.instagram.com/studio_talitagarcia/";

export function whatsappLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const GENERAL_MESSAGE =
  "Olá! Conheci o Studio Talita Garcia pelo site e gostaria de saber mais sobre os procedimentos e horários disponíveis para agendamento.";

export function serviceMessage(procedimento: string) {
  return `Olá, Talita! Conheci seu studio pelo site e gostaria de saber mais sobre os procedimentos de ${procedimento} e os horários disponíveis.`;
}

import perfil from "@/assets/talita-perfil.png.asset.json";
import retrato from "@/assets/talita-retrato.jpg.asset.json";
import espaco from "@/assets/studio-espaco.jpg.asset.json";
import logo from "@/assets/logo.png.asset.json";
import cilios from "@/assets/cilios.jpg.asset.json";
import sobrancelhas from "@/assets/sobrancelhas.png.asset.json";
import unhas from "@/assets/unhas.jpg.asset.json";
import depilacao from "@/assets/depilacao.jpg.asset.json";
import unhasAzul from "@/assets/unhas-azul.jpeg.asset.json";
import unhasRosa from "@/assets/unhas-rosa.jpeg.asset.json";
import ciliosFio from "@/assets/cilios-fio-a-fio.png.asset.json";
import ciliosVolume from "@/assets/cilios-volumosos.png.asset.json";
import sobrancelhasColagem from "@/assets/sobrancelhas-colagem.png.asset.json";
import sobrancelhasTg from "@/assets/sobrancelhas-cilios-tg.png.asset.json";

export const LOGO = logo.url;

export const ADDRESS = "Rua Morada Nova, 142 - Passaré, Fortaleza - CE";
export const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`;
export const MAPS_EMBED = `https://www.google.com/maps?q=${encodeURIComponent(ADDRESS)}&output=embed`;

// Fotos: preencha `src` com o endereço da imagem quando disponível.
export type Photo = { src?: string; alt: string; label: string };

export const photos = {
  hero: { src: perfil.url, alt: "Talita Garcia no Studio Talita Garcia", label: "Foto da Talita" } as Photo,
  portrait: { src: retrato.url, alt: "Talita Garcia no studio", label: "Retrato da Talita" } as Photo,
  space: { src: espaco.url, alt: "Espaço do Studio Talita Garcia", label: "Foto do espaço do studio" } as Photo,
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
  { id: "cilios", title: "Cílios", term: "cílios", description: "Realce o olhar com delicadeza e naturalidade.", photo: { src: cilios.url, alt: "Extensão de cílios realizada no studio", label: "Foto de cílios" } },
  { id: "sobrancelhas", title: "Sobrancelhas", term: "sobrancelhas", description: "Harmonia e definição para valorizar seu rosto.", photo: { src: sobrancelhas.url, alt: "Design de sobrancelhas realizado no studio", label: "Foto de sobrancelhas" } },
  { id: "unhas", title: "Unhas", term: "unhas", description: "Manicure, unhas em gel e acrílico, com cuidado e acabamento impecável.", photo: { src: unhas.url, alt: "Unhas feitas no studio", label: "Foto de unhas" } },
  { id: "depilacao", title: "Depilação", term: "depilação", description: "Cuidado, conforto e atenção em cada sessão.", photo: { src: depilacao.url, alt: "Sessão de depilação com cera no studio", label: "Foto de depilação" } },
];

// Galeria: adicione fotos reais com sua categoria.
export const gallery: (Photo & { category: Category; tall?: boolean })[] = [
  { src: unhasAzul.url, category: "Unhas", alt: "Unhas azul-turquesa com detalhes brancos e dourados", label: "Unhas", tall: true },
  { src: ciliosFio.url, category: "Cílios", alt: "Extensão de cílios com olhar marcante", label: "Cílios", tall: true },
  { src: sobrancelhasColagem.url, category: "Sobrancelhas", alt: "Colagem de resultados de sobrancelhas e cílios", label: "Sobrancelhas" },
  { src: unhasRosa.url, category: "Unhas", alt: "Unhas rosa natural com brilho delicado", label: "Unhas", tall: true },
  { src: ciliosVolume.url, category: "Cílios", alt: "Resultado de cílios volumosos", label: "Cílios", tall: true },
  { src: sobrancelhasTg.url, category: "Sobrancelhas", alt: "Três resultados de design de sobrancelhas e extensão de cílios", label: "Sobrancelhas", tall: true },
];

// Depoimentos reais autorizados: { text, name, stars? }
export const testimonials: { text: string; name: string; stars?: number }[] = [
  { name: "Suely", text: "Amei o atendimento e o resultado! Tudo feito com muito capricho. ❤️", stars: 5 },
  { name: "Ana", text: "Atendimento maravilhoso, ambiente aconchegante e trabalho impecável! Super recomendo.", stars: 5 },
  { name: "Isabella", text: "Adorei minha experiência! Fiz minhas unhas e ficaram lindas.", stars: 5 },
];
