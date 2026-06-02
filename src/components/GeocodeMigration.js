import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { geocodeAddress } from '../utils/geocoding';

const GeocodeMigration = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ total: 0, current: 0, success: 0, failed: 0, skipped: 0 });
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => setLogs(prev => [msg, ...prev].slice(0, 100));

  const runMigration = async () => {
    setIsProcessing(true);
    setLogs([]);
    setProgress({ total: 0, current: 0, success: 0, failed: 0, skipped: 0 });

    try {
      // 1. Pobierz wszystkie unikalne adresy z bębnów
      addLog('Skanowanie adresów z tabeli bębnów...');
      
      // Optymalizacja: pobieramy tylko bębny bez współrzędnych,
      // ale dla pewności możemy też opierać się o słownik.
      const { data: drums, error } = await supabase
        .from('drums')
        .select('adres_dostawy')
        .not('adres_dostawy', 'is', null)
        .neq('adres_dostawy', '');

      if (error) throw error;

      if (!drums || drums.length === 0) {
        addLog('Brak bębnów z adresem w bazie.');
        setIsProcessing(false);
        return;
      }

      // 2. Unikalne adresy
      const uniqueAddresses = [...new Set(drums.map(d => d.adres_dostawy.trim()))].filter(a => a);
      addLog(`Znaleziono ${uniqueAddresses.length} unikalnych adresów w systemie.`);

      // 3. Pobierz istniejący Cache
      const { data: cacheData, error: cacheError } = await supabase
        .from('address_coordinates_cache')
        .select('address, is_not_found');

      if (cacheError && cacheError.code !== '42P01') throw cacheError; // 42P01 to brak tabeli
      
      const cacheSet = new Set((cacheData || []).map(c => c.address));
      const notFoundSet = new Set((cacheData || []).filter(c => c.is_not_found).map(c => c.address));

      // 4. Wyznacz adresy, których nie ma w Cache
      const addressesToGeocode = uniqueAddresses.filter(addr => !cacheSet.has(addr));
      
      setProgress(prev => ({ ...prev, total: addressesToGeocode.length }));

      if (addressesToGeocode.length === 0) {
        addLog('Wszystkie adresy są już zgeokodowane lub zapisane w pamięci podręcznej jako nieznane.');
        setIsProcessing(false);
        return;
      }

      addLog(`Rozpoczynam geokodowanie ${addressesToGeocode.length} NOWYCH adresów...`);

      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < addressesToGeocode.length; i++) {
        const address = addressesToGeocode[i];
        setProgress(prev => ({ ...prev, current: i + 1 }));
        
        const coords = await geocodeAddress(address);

        if (coords && !coords.error) {
          // Zapis do Cache
          const { error: insertError } = await supabase
            .from('address_coordinates_cache')
            .insert([{
              address: address,
              latitude: coords.lat,
              longitude: coords.lng,
              is_manual: false,
              is_not_found: false
            }]);

          if (insertError) {
            addLog(`Błąd zapisu do cache dla: ${address}: ${insertError.message}`);
            failedCount++;
          } else {
            addLog(`Sukces: [Google API] ${address} -> ${coords.lat}, ${coords.lng}`);
            successCount++;
            
            // Opcjonalnie: możemy wywołać bezpośredni update na tabeli drums, 
            // ale Trigger zrobi to automatycznie przy następnym syncu, 
            // a my możemy to zrobić teraz, by od razu widzieć na mapie
            await supabase.from('drums').update({ latitude: coords.lat, longitude: coords.lng }).eq('adres_dostawy', address);
          }
        } else {
          addLog(`Nie znaleziono (Google API): ${address} | Powód: ${coords?.status} - ${coords?.error}`);
          failedCount++;

          // Zapisz do cache jako is_not_found, żeby jutro znowu nie odpytywać Google'a
          await supabase.from('address_coordinates_cache').insert([{
            address: address,
            is_not_found: true
          }]).catch(() => {}); // Ignoruj błędy
        }

        // Czekaj 250ms między zapytaniami do Google API (zgodnie z limitem 50 zapytań / sek, jesteśmy bardzo bezpieczni)
        await new Promise(resolve => setTimeout(resolve, 250));
        setProgress(prev => ({ ...prev, success: successCount, failed: failedCount }));
      }

      addLog('Geokodowanie nowych adresów zakończone!');

    } catch (error) {
      console.error('Błąd podczas migracji:', error);
      addLog(`BŁĄD KRYTYCZNY: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Narzędzie Administratora: Inteligentne Geokodowanie (Cache)</h3>
      <p className="text-gray-600 mb-4 text-sm">
        To narzędzie skanuje bazę, wyszukuje <strong>zupełnie nowe adresy</strong> i odpytuje Google Maps API.
        Wyniki zapisywane są do trwałego "słownika", dzięki czemu codzienna aktualizacja systemu ERP nie zużywa limitów API.
      </p>
      
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={runMigration}
          disabled={isProcessing}
          className={`px-4 py-2 rounded-lg text-white font-medium shadow-sm transition-all ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'}`}
        >
          {isProcessing ? 'Przetwarzanie zapytań...' : 'Geokoduj Nowe Adresy'}
        </button>
        
        {progress.total > 0 && (
          <div className="text-sm font-medium text-gray-700">
            Postęp adresów: {progress.current} / {progress.total} (Sukces: <span className="text-green-600">{progress.success}</span>, Nieznane: <span className="text-red-600">{progress.failed}</span>)
          </div>
        )}
      </div>

      <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs text-green-400">
        {logs.length === 0 ? (
          <span className="text-gray-500">Czekam na uruchomienie...</span>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className={`mb-1 border-b border-gray-800 pb-1 ${log.includes('Nie znaleziono') || log.includes('Błąd') ? 'text-red-400' : ''}`}>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GeocodeMigration;
