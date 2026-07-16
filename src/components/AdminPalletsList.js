import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Package, Search, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { drumsAPI } from '../utils/supabaseApi';

const AdminPalletsList = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const urlClientNip = queryParams.get('clientNip');

  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState(urlClientNip || '');
  const [expandedNip, setExpandedNip] = useState(urlClientNip || null);

  useEffect(() => {
    fetchPallets();
  }, []);

  const fetchPallets = async () => {
    try {
      setLoading(true);
      // Przekazanie null oznacza pobranie wszystkich palet (lub tych do których admin ma dostęp)
      const data = await drumsAPI.getPalletBalances(null);
      setBalances(data || []);
    } catch (err) {
      setError('Nie udało się pobrać sald palet.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBalances = balances.filter(b => 
    b.companyName?.toLowerCase().includes(search.toLowerCase()) || 
    b.nip?.includes(search)
  );

  const toggleExpand = (nip) => {
    if (expandedNip === nip) {
      setExpandedNip(null);
    } else {
      setExpandedNip(nip);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Salda Palet (Klienci)</h2>
              <p className="text-sm text-gray-500">Zestawienie ilości palet dla kontrahentów</p>
            </div>
          </div>

          <div className="flex w-full md:w-auto space-x-3">
            <div className="relative flex-1 md:w-64">
              <input
                type="text"
                placeholder="Szukaj po nazwie lub NIP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBalances.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">Brak danych o paletach</h3>
                <p className="text-gray-500 text-sm">Nie znaleziono żadnych sald spełniających kryteria.</p>
              </div>
            ) : (
              filteredBalances.map((client) => (
                <div key={client.nip} className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:border-blue-300 transition-colors">
                  <div 
                    className="flex flex-wrap items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleExpand(client.nip)}
                  >
                    <div className="flex-1 min-w-[200px]">
                      <h3 className="font-bold text-gray-900 truncate">{client.companyName}</h3>
                      <p className="text-sm text-gray-500">NIP: {client.nip}</p>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Saldo</p>
                        <div className={`text-xl font-black ${client.totalBalance > 0 ? 'text-blue-600' : 'text-gray-900'}`}>
                          {client.totalBalance} <span className="text-sm font-medium opacity-70">szt.</span>
                        </div>
                      </div>
                      
                      <div className="text-gray-400">
                        {expandedNip === client.nip ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                      </div>
                    </div>
                  </div>

                  {expandedNip === client.nip && (
                    <div className="bg-gray-50 border-t border-gray-200 p-4">
                      {client.balancesBySize && Object.keys(client.balancesBySize).length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                            <Package className="w-4 h-4 mr-2" />
                            Podsumowanie według rozmiarów
                          </h4>
                          <div className="flex flex-wrap gap-3">
                            {Object.entries(client.balancesBySize).map(([size, quantity]) => (
                              <div key={size} className="bg-white border border-gray-200 rounded-lg p-3 min-w-[150px] shadow-sm flex flex-col">
                                <span className="text-xs text-gray-500 uppercase font-medium mb-1 truncate" title={size}>{size}</span>
                                <span className={`text-lg font-bold ${quantity > 0 ? 'text-blue-600' : 'text-gray-900'}`}>{quantity} szt.</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Historia dokumentów
                      </h4>
                      {client.history.length === 0 ? (
                        <p className="text-sm text-gray-500">Brak historii dokumentów.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 text-left font-medium text-gray-600">Data</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-600">Dokument</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-600">Nazwa palety</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-600">Rozmiar palety</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-600">Operacja</th>
                                <th className="px-4 py-2 text-right font-medium text-gray-600">Ilość</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                              {client.history.map((h, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 whitespace-nowrap text-gray-600">
                                    {h.date ? new Date(h.date).toLocaleDateString('pl-PL') : '-'}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-800">
                                    {h.document || '-'}
                                  </td>
                                  <td className="px-4 py-2 whitespace-normal text-gray-800 text-sm min-w-[250px]">
                                    {h.name || '-'}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-gray-600 text-sm">
                                    {h.size || '-'}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    {h.isReturn ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        Korekta
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                        Wydanie
                                      </span>
                                    )}
                                  </td>
                                  <td className={`px-4 py-2 whitespace-nowrap text-right font-bold ${h.isReturn ? 'text-green-600' : 'text-blue-600'}`}>
                                    {h.quantity > 0 ? `+${h.quantity}` : h.quantity} szt.
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPalletsList;
