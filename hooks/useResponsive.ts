import { useWindowDimensions } from 'react-native';

// Détection desktop (web large écran). On bascule en mise en page « bureau »
// au-delà de 900px : colonnes, contenu plus large, cartes côte à côte.
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 900;
  const isWide = width >= 600;
  return {
    width,
    height,
    isWide,
    isDesktop,
    // Le contenu occupe toute la largeur (les écrans gèrent leurs propres marges).
    contentWidth: width,
  };
}
