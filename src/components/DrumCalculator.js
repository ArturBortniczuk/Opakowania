import React, { useState, useEffect, useMemo } from 'react';
import { calculatorAPI } from '../utils/calculatorApi';
import { findSuitableDrums } from '../utils/drumCalculator';
import { 
  Calculator, Search, Info, Package, AlertTriangle, Play, ChevronDown 
} from 'lucide-react';

const DrumCalculator = () => {
  const [cables, setCables] = useState([]);
  const [drums, setDrums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCableName, setSelectedCableName] = useState('');
  const [selectedCrossSection, setSelectedCrossSection] = useState('');
  const [cableLength, setCableLength] = useState('');
  
  const [results, setResults] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedCables = await calculatorAPI.getCables();
        const fetchedDrums = await calculatorAPI.getDrumDimensions();
        
        // Mock data fallback if database is empty initially
        if (fetchedCables.length === 0 || fetchedDrums.length === 0) {
          setError('Baza danych kabli lub bębnów jest pusta. Zaimportuj dane z pliku Excel.');
        } else {
          setCables(fetchedCables);
          setDrums(fetchedDrums);
        }
      } catch (err) {
        setError('Wystąpił błąd podczas pobierania danych: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Wyprowadzenie unikalnych nazw kabli
  const uniqueCableNames = useMemo(() => {
    const names = new Set(cables.map(c => c.name));
    return Array.from(names).sort();
  }, [cables]);

  // Wyprowadzenie przekrojów dla wybranego kabla
  const availableCrossSections = useMemo(() => {
    if (!selectedCableName) return [];
    return cables
      .filter(c => c.name === selectedCableName)
      .map(c => c.cross_section)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [cables, selectedCableName]);

  // Reset przekroju, jeśli zmieniono główny kabel
  useEffect(() => {
    setSelectedCrossSection('');
    setResults(null);
  }, [selectedCableName]);

  const handleCalculate = (e) => {
    e.preventDefault();
    if (!selectedCableName || !selectedCrossSection || !cableLength) {
      alert('Wypełnij wszystkie pola.');
      return;
    }

    const length = parseFloat(cableLength);
    if (isNaN(length) || length <= 0) {
      alert('Długość kabla musi być liczbą większą od zera.');
      return;
    }

    const selectedCable = cables.find(
      c => c.name === selectedCableName && c.cross_section === selectedCrossSection
    );

    if (!selectedCable) {
      alert('Nie znaleziono takiego kabla w bazie.');
      return;
    }

    const parseNumber = (val) => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      return parseFloat(val.toString().replace(',', '.'));
    };

    // Przeliczenia z mm na cm (w zależności od tego jak trzymane są dane w bazie).
    // Załóżmy, że plik python używał dzielenia przez 10 dla mm->cm
    let cableDiameterCm = parseNumber(selectedCable.outer_diameter) / 10;
    let bendingRadiusCm = parseNumber(selectedCable.bending_radius) / 10;
    
    // Logika zaczerpnięta z pythona
    if (length < 400) {
      bendingRadiusCm -= 5;
    }

    const cableWeightKm = parseNumber(selectedCable.weight_kg_km);

    // Bębny też mogą mieć przecinki, więc musimy je przeparsować przed logiką!
    const parsedDrums = drums.map(d => ({
      ...d,
      outer_diameter: parseNumber(d.outer_diameter),
      inner_diameter: parseNumber(d.inner_diameter),
      width: parseNumber(d.width),
      weight: parseNumber(d.weight)
    }));

    const suitableDrums = findSuitableDrums(
      cableDiameterCm, 
      bendingRadiusCm, 
      length, 
      parsedDrums, 
      cableWeightKm
    );

    if (suitableDrums.length === 0) {
      setResults({
        success: false,
        message: 'Nie znaleziono odpowiedniego bębna spełniającego wymagania (np. przekroczono promień gięcia lub brak tak dużych bębnów).'
      });
    } else {
      setResults({
        success: true,
        cable: selectedCable,
        length: length,
        bestDrum: suitableDrums[0],
        allSuitable: suitableDrums
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center space-x-4 mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
          <Calculator className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kalkulator Doboru Bębna</h1>
          <p className="text-gray-500">Oblicz najbardziej optymalny bęben dla danego odcinka kabla</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Formularz Wejściowy */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
              <Package className="w-5 h-5 text-blue-600 mr-2" />
              Parametry Kabla
            </h2>

            <form onSubmit={handleCalculate} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Typ kabla
                </label>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-xl border border-gray-300 py-3 pl-4 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={selectedCableName}
                    onChange={(e) => setSelectedCableName(e.target.value)}
                  >
                    <option value="">Wybierz kabel...</option>
                    {uniqueCableNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ilość i przekrój żył
                </label>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-xl border border-gray-300 py-3 pl-4 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                    value={selectedCrossSection}
                    onChange={(e) => setSelectedCrossSection(e.target.value)}
                    disabled={!selectedCableName}
                  >
                    <option value="">Wybierz przekrój...</option>
                    {availableCrossSections.map((cross) => (
                      <option key={cross} value={cross}>{cross}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Długość kabla (metry)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="w-full rounded-xl border border-gray-300 py-3 px-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="np. 500"
                  value={cableLength}
                  onChange={(e) => setCableLength(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full mt-4 flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Play className="w-4 h-4 mr-2" fill="currentColor" />
                Oblicz bęben
              </button>
            </form>
          </div>
        </div>

        {/* Sekcja Wyników */}
        <div className="lg:col-span-2">
          {!results ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-blue-300" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Gotowy do obliczeń</h3>
              <p className="text-gray-500 max-w-sm">
                Wybierz parametry kabla po lewej stronie i kliknij oblicz, aby znaleźć najbardziej optymalny bęben dla Twojego odcinka.
              </p>
            </div>
          ) : !results.success ? (
            <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-8 h-full">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-bold text-red-700">Brak odpowiedniego bębna</h3>
              </div>
              <p className="text-gray-600">{results.message}</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
              <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-bold text-emerald-800 flex items-center">
                  <CheckIcon className="w-5 h-5 mr-2" />
                  Znaleziono optymalny bęben
                </h3>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Wybrany kabel</span>
                    <span className="block text-lg font-bold text-gray-900">{results.cable.name}</span>
                    <span className="block text-sm text-gray-500 font-medium">{results.cable.cross_section} • {results.length}m</span>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <span className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Polecany Bęben</span>
                    <span className="block text-xl font-black text-blue-700">Bęben {results.bestDrum.drum.outer_diameter}</span>
                    <span className="block text-sm text-blue-600 font-medium">Suma wagi: {results.bestDrum.totalWeight.toFixed(1)} kg</span>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-gray-900 mb-4 border-b pb-2">Szczegóły logistyczne</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <StatBox label="Masa Kabla" value={`${results.bestDrum.cableWeight.toFixed(1)} kg`} />
                  <StatBox label="Masa Bębna" value={`${results.bestDrum.drumWeight.toFixed(1)} kg`} />
                  <StatBox label="Ilość Warstw" value={`${results.bestDrum.layersCount}`} />
                  <StatBox label="Wykorzystanie" value={`${results.bestDrum.utilizationPercent.toFixed(1)}%`} 
                    color={results.bestDrum.utilizationPercent > 85 ? 'text-orange-600' : 'text-emerald-600'} />
                </div>

                <div className="mt-8">
                  <h4 className="text-sm font-bold text-gray-900 mb-4 border-b pb-2 flex items-center">
                    <Info className="w-4 h-4 mr-2 text-gray-400" />
                    Inne pasujące bębny (alternatywy)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left text-gray-500">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                          <th className="px-4 py-3">Typ bębna</th>
                          <th className="px-4 py-3">Pojemność Max</th>
                          <th className="px-4 py-3">Warstwy</th>
                          <th className="px-4 py-3">Wykorzystanie</th>
                          <th className="px-4 py-3 font-bold text-gray-900">Masa Całkowita</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.allSuitable.slice(1, 5).map((option, idx) => (
                          <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">Bęben {option.drum.outer_diameter}</td>
                            <td className="px-4 py-3">{option.maxCapacity.toFixed(0)} m</td>
                            <td className="px-4 py-3">{option.layersCount}</td>
                            <td className="px-4 py-3">{option.utilizationPercent.toFixed(1)}%</td>
                            <td className="px-4 py-3 font-bold">{option.totalWeight.toFixed(1)} kg</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatBox = ({ label, value, color = 'text-gray-900' }) => (
  <div className="flex flex-col">
    <span className="text-xs text-gray-500 font-medium">{label}</span>
    <span className={`text-lg font-bold ${color}`}>{value}</span>
  </div>
);

const CheckIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default DrumCalculator;
