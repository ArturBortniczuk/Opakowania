/**
 * Oblicza długość kabla na bębnie z uwzględnieniem warstw.
 * @param {Object} drum - Wymiary bębna
 * @param {number} cableDiameter - Średnica kabla (już przeliczona na odpowiednie jednostki np. cm)
 * @param {number} targetLength - Wymagana długość kabla [m]
 * @returns {Object} - Zawiera maxLength (ile max się zmieści do limitu docelowej długości) oraz layersCount
 */
export const calculateCableOnDrum = (drum, cableDiameter, targetLength) => {
  let layer = 0;
  let totalLength = 0;
  const drumWidth = drum.width;
  const maxLayers = 50; // Zabezpieczenie przed nieskończoną pętlą

  while (totalLength < targetLength && layer < maxLayers) {
    const currentLayerDiameter = drum.inner_diameter + layer * cableDiameter * 2;

    // Zmniejszony margines bezpieczenstwa (5 jednostek od max średnicy, zależy od danych z excela czy to mm czy cm)
    // Zgodnie z pythonowym skryptem:
    if (currentLayerDiameter > drum.outer_diameter - 5) {
      break;
    }

    const layerCircumference = Math.PI * currentLayerDiameter;
    const coilsPerLayer = Math.floor(drumWidth / cableDiameter);

    // długość na warstwie = ilość zwojów * obwód w danej warstwie / 100 (dzielone przez 100 aby zamienić z cm na metry, tak jak w Pythonie)
    const lengthOnLayer = (coilsPerLayer * layerCircumference) / 100;
    
    totalLength += lengthOnLayer;
    layer++;
  }

  return { maxLength: totalLength, layersCount: layer };
};

/**
 * Znajduje wszystkie odpowiednie bębny i sortuje po najniższej wadze całkowitej (kabel + bęben).
 * @param {number} cableDiameter - Średnica kabla (mm przeliczone na cm w komponencie!)
 * @param {number} bendingRadius - Promień gięcia (mm przeliczone na cm w komponencie!)
 * @param {number} targetLength - Długość [m]
 * @param {Array} drumsData - Lista dostępnych wymiarów bębnów
 * @param {number} cableWeightKm - Waga kabla [kg/km]
 * @returns {Array} - Posortowana lista pasujących bębnów z detalami
 */
export const findSuitableDrums = (
  cableDiameter,
  bendingRadius,
  targetLength,
  drumsData,
  cableWeightKm
) => {
  const minInnerDiameter = bendingRadius * 2;
  const suitableDrums = [];

  for (const drum of drumsData) {
    // Sprawdzenie promienia gięcia (czy kabel zmieści się na rdzeniu bębna)
    if (drum.inner_diameter >= minInnerDiameter) {
      const { maxLength, layersCount } = calculateCableOnDrum(drum, cableDiameter, targetLength);

      // Sprawdzenie czy w ogóle zmieści się wymagana długość kabla
      if (maxLength >= targetLength) {
        const cableWeight = (targetLength / 1000) * cableWeightKm;
        const drumWeight = drum.weight || 0;
        const totalWeight = cableWeight + drumWeight;
        
        const utilizationPercent = (targetLength / maxLength) * 100;

        suitableDrums.push({
          drum: drum,
          cableWeight: cableWeight,
          drumWeight: drumWeight,
          totalWeight: totalWeight,
          utilizationPercent: utilizationPercent,
          layersCount: layersCount,
          maxCapacity: maxLength
        });
      }
    }
  }

  // Sortowanie po sumarycznej masie rosnąco
  return suitableDrums.sort((a, b) => a.totalWeight - b.totalWeight);
};
