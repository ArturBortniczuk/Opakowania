import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { geocodeAddress } from '../utils/geocoding';

const GeocodeMigration = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ total: 0, current: 0, success: 0, failed: 0 });
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => setLogs(prev => [msg, ...prev].slice(0, 50));

  const runMigration = async () => {
    setIsProcessing(true);
    setLogs([]);
    setProgress({ total: 0, current: 0, success: 0, failed: 0 });

    try {
      // 1. Pobierz adresy bębnów bez współrzędnych (tylko te z wypełnionym adresem)
      const { data: drums, error } = await supabase
        .from('drums')
        .select('id, adres_dostawy')
        .is('latitude', null)
        .not('adres_dostawy', 'is', null)
        .neq('adres_dostawy', '');

      if (error) throw error;

      if (!drums || drums.length === 0) {
        addLog('Wszystkie bębny z adresem mają już uzupełnione współrzędne!');
        setIsProcessing(false);
        return;
      }

      // 2. Grupujemy bębny po adresie, żeby nie odpytywać Google API wielokrotnie dla tego samego adresu
      const drumsByAddress = {};
      drums.forEach(drum => {
        const addr = drum.adres_dostawy.trim();
        if (addr) {
          if (!drumsByAddress[addr]) {
            drumsByAddress[addr] = [];
          }
          drumsByAddress[addr].push(drum.id);
        }
      });

      const uniqueAddresses = Object.keys(drumsByAddress);
      
      setProgress(prev => ({ ...prev, total: uniqueAddresses.length }));
      addLog(`Znaleziono ${drums.length} bębnów pod ${uniqueAddresses.length} unikalnymi adresami do geokodowania...`);

      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < uniqueAddresses.length; i++) {
        const address = uniqueAddresses[i];
        const drumIds = drumsByAddress[address];
        
        setProgress(prev => ({ ...prev, current: i + 1 }));
        addLog(`Geokodowanie: ${address} (${drumIds.length} bębnów)...`);
        
        const coords = await geocodeAddress(address);

        if (coords && !coords.error) {
          // Zaktualizuj wszystkie bębny pod tym adresem
          // Aktualizujemy partiami jeśli bębnów jest dużo (Supabase in() limit)
          const chunkSize = 200;
          for (let j = 0; j < drumIds.length; j += chunkSize) {
            const chunkIds = drumIds.slice(j, j + chunkSize);
            const { error: updateError } = await supabase
              .from('drums')
              .update({ latitude: coords.lat, longitude: coords.lng })
              .in('id', chunkIds);

            if (updateError) {
              addLog(`Błąd zapisu dla adres: ${address}: ${updateError.message}`);
              failedCount++;
            } else {
              if (j === 0) successCount++;
            }
          }
          if(drumIds.length > 0) {
              addLog(`Sukces: zaktualizowano ${drumIds.length} bębnów dla adresu ${address}`);
          }
        } else {
          addLog(`Błąd dla: ${address} | Powód: ${coords?.status} - ${coords?.error}`);
          failedCount++;
        }

        // Czekaj 200ms między zapytaniami do Google API
        await new Promise(resolve => setTimeout(resolve, 200));
        setProgress(prev => ({ ...prev, success: successCount, failed: failedCount }));
      }

      addLog('Migracja bębnów zakończona!');

    } catch (error) {
      console.error('Błąd podczas migracji:', error);
      addLog(`BŁĄD KRYTYCZNY: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Narzędzie Administratora: Uzupełnianie Współrzędnych Bębnów</h3>
      <p className="text-gray-600 mb-4 text-sm">
        To narzędzie skanuje bazę bębnów, grupuje je po adresie dostawy (`adres_dostawy`) i używa Google Maps API do przypisania szerokości i długości geograficznej 
        dla adresów, które ich nie posiadają.
      </p>
      
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={runMigration}
          disabled={isProcessing}
          className={`px-4 py-2 rounded-lg text-white font-medium ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isProcessing ? 'Przetwarzanie...' : 'Uruchom Geokodowanie Bębnów'}
        </button>
        
        {progress.total > 0 && (
          <div className="text-sm font-medium text-gray-700">
            Postęp adresów: {progress.current} / {progress.total} (Sukces: <span className="text-green-600">{progress.success}</span>, Błędy: <span className="text-red-600">{progress.failed}</span>)
          </div>
        )}
      </div>

      <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs text-green-400">
        {logs.length === 0 ? (
          <span className="text-gray-500">Czekam na uruchomienie...</span>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="mb-1 border-b border-gray-800 pb-1">{log}</div>
          ))
        )}
      </div>
    </div>
  );
};

export default GeocodeMigration;
