import React, { useState, useEffect } from 'react';
import { Package, Calendar, FileText, ChevronDown, ChevronUp, RefreshCcw, ArrowRight } from 'lucide-react';
import { drumsAPI, getCurrentUserFromCache } from '../utils/supabaseApi';
import { useNavigate } from 'react-router-dom';

const PalletsList = () => {
  const [balanceData, setBalanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPallets();
  }, []);

  const fetchPallets = async () => {
    try {
      setLoading(true);
      const currentUser = getCurrentUserFromCache() || JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (!currentUser.nip) {
        throw new Error('Brak NIP klienta');
      }

      const data = await drumsAPI.getPalletBalances(currentUser.nip);
      if (data && data.length > 0) {
        setBalanceData(data[0]);
      } else {
        setBalanceData(null);
      }
    } catch (err) {
      setError('Nie udało się pobrać salda palet.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
              <Package className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Saldo Palet</h2>
              <p className="text-gray-500">{balanceData?.companyName || 'Twoja firma'}</p>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/return')}
            className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            <RefreshCcw className="w-5 h-5" />
            <span>Zgłoś zwrot</span>
            <ArrowRight className="w-4 h-4 ml-1 opacity-70" />
          </button>
        </div>

        <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-8 text-white text-center shadow-xl mb-8 relative overflow-hidden">
          {/* Dekoracyjne elementy tła */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-400/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
          
          <div className="relative z-10">
            <p className="text-blue-100/90 text-lg mb-2 font-medium">Suma wszystkich palet u Ciebie:</p>
            <div className="text-6xl md:text-7xl font-black mb-1 drop-shadow-sm tracking-tight">
              {balanceData?.totalBalance || 0} <span className="text-2xl md:text-3xl font-semibold opacity-75 tracking-normal">szt.</span>
            </div>
            <p className="text-blue-200/80 text-sm mb-8 font-medium">Stan na dzień dzisiejszy</p>
            
            {balanceData?.balancesBySize && Object.keys(balanceData.balancesBySize).length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 border-t border-white/10 pt-8">
                {Object.entries(balanceData.balancesBySize).map(([size, quantity]) => (
                  <div key={size} className="bg-white/10 hover:bg-white/15 rounded-2xl p-5 backdrop-blur-md border border-white/10 text-left flex flex-col justify-between transition-all duration-300">
                    <p className="text-blue-100/90 text-xs uppercase tracking-widest font-bold mb-3 truncate" title={size}>{size}</p>
                    <div className="text-3xl font-bold text-white">{quantity} <span className="text-sm font-medium opacity-80">szt.</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {balanceData && balanceData.history.length > 0 && (
          <div>
            <button 
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-gray-800 font-semibold border border-gray-200"
            >
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-gray-500" />
                <span>Historia dokumentów (wydań i zwrotów)</span>
              </div>
              {isHistoryOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {isHistoryOpen && (
              <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left font-medium text-gray-500 uppercase tracking-wider">Data</th>
                      <th className="px-6 py-4 text-left font-medium text-gray-500 uppercase tracking-wider">Dokument</th>
                      <th className="px-6 py-4 text-left font-medium text-gray-500 uppercase tracking-wider">Nazwa palety</th>
                      <th className="px-6 py-4 text-left font-medium text-gray-500 uppercase tracking-wider">Rozmiar palety</th>
                      <th className="px-6 py-4 text-left font-medium text-gray-500 uppercase tracking-wider">Operacja</th>
                      <th className="px-6 py-4 text-right font-medium text-gray-500 uppercase tracking-wider">Ilość</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {balanceData.history.map((h, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {h.date ? new Date(h.date).toLocaleDateString('pl-PL') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {h.document || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 text-sm truncate max-w-[200px]" title={h.name}>
                          {h.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm truncate max-w-[200px]" title={h.size}>
                          {h.size || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {h.isReturn ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Zwrot / Korekta
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Wydanie
                            </span>
                          )}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-right font-bold ${h.isReturn ? 'text-green-600' : 'text-blue-600'}`}>
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
    </div>
  );
};

export default PalletsList;
