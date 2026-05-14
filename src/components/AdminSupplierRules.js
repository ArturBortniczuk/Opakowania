// src/components/AdminSupplierRules.js
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Settings, 
  Truck,
  AlertCircle
} from 'lucide-react';
import { rulesAPI, drumsAPI } from '../utils/supabaseApi';

const AdminSupplierRules = () => {
  const [rules, setRules] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newRule, setNewRule] = useState({
    supplier_name: '',
    max_days_overdue: 0,
    return_percentage: 100
  });

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [rulesData, suppliersData] = await Promise.all([
        rulesAPI.getRules(),
        drumsAPI.getUniqueSuppliers()
      ]);
      setRules(rulesData);
      setSuppliers(suppliersData);
      if (suppliersData.length > 0) {
        setNewRule(prev => ({ ...prev, supplier_name: suppliersData[0] }));
      }
    } catch (err) {
      setError('Nie udało się pobrać danych.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRules = async () => {
    try {
      const data = await rulesAPI.getRules();
      setRules(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleAddRule = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (!newRule.supplier_name.trim()) {
        throw new Error('Podaj nazwę dostawcy');
      }
      await rulesAPI.addRule({
        supplier_name: newRule.supplier_name.trim().toUpperCase(),
        max_days_overdue: parseInt(newRule.max_days_overdue, 10),
        return_percentage: parseInt(newRule.return_percentage, 10)
      });
      setNewRule({ supplier_name: suppliers[0] || '', max_days_overdue: 0, return_percentage: 100 });
      fetchRules();
    } catch (err) {
      setError(err.message || 'Błąd przy dodawaniu reguły');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Czy na pewno chcesz usunąć tę regułę?')) {
      try {
        await rulesAPI.deleteRule(id);
        fetchRules();
      } catch (err) {
        setError('Błąd podczas usuwania reguły');
      }
    }
  };

  // Grupowanie reguł po dostawcy
  const groupedRules = rules.reduce((acc, rule) => {
    if (!acc[rule.supplier_name]) acc[rule.supplier_name] = [];
    acc[rule.supplier_name].push(rule);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center space-x-4">
          <div className="bg-purple-100 p-3 rounded-xl">
            <Settings className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Terminy kablowni (Zasady zwrotów)</h2>
            <p className="text-gray-500">Skonfiguruj procentowy zwrot w zależności od opóźnienia</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formularz dodawania */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1 h-fit">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Dodaj nową regułę</h3>
          <form onSubmit={handleAddRule} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dostawca</label>
              <select
                required
                value={newRule.supplier_name}
                onChange={(e) => setNewRule({...newRule, supplier_name: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                {suppliers.length === 0 && <option value="">Brak dostawców w bazie</option>}
                {suppliers.map(sup => (
                  <option key={sup} value={sup}>{sup}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maksymalne opóźnienie (dni)</label>
              <input
                type="number"
                required
                min="0"
                value={newRule.max_days_overdue}
                onChange={(e) => setNewRule({...newRule, max_days_overdue: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="np. 120"
              />
              <p className="text-xs text-gray-500 mt-1">Górny limit opóźnienia (włącznie). Wpisz np. 120 dla przedziału 0-120 dni.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Procent zwrotu (%)</label>
              <input
                type="number"
                required
                min="0"
                max="100"
                value={newRule.return_percentage}
                onChange={(e) => setNewRule({...newRule, return_percentage: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="np. 75"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex justify-center items-center font-medium"
            >
              <Plus className="w-5 h-5 mr-2" />
              Zapisz regułę
            </button>
          </form>
        </div>

        {/* Lista aktualnych reguł */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-lg font-semibold text-gray-900">Istniejące reguły</h3>
            <span className="text-sm text-gray-500 font-medium">
              Widok dla: <span className="text-purple-600 font-bold">{newRule.supplier_name || 'Wybierz dostawcę'}</span>
            </span>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : Object.keys(groupedRules).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Brak zdefiniowanych reguł w systemie. Dodaj pierwszą po lewej stronie.
            </div>
          ) : !newRule.supplier_name ? (
            <div className="text-center py-8 text-gray-500">
              Wybierz dostawcę z listy, aby zobaczyć jego reguły.
            </div>
          ) : !groupedRules[newRule.supplier_name] ? (
            <div className="text-center py-8 text-gray-500">
              Ten dostawca nie ma jeszcze zdefiniowanych reguł. Dodaj je korzystając z formularza obok.
            </div>
          ) : (
            <div className="space-y-6">
              {[[newRule.supplier_name, groupedRules[newRule.supplier_name]]].map(([supplier, supplierRules]) => (
                <div key={supplier} className="border border-purple-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-purple-50 px-4 py-3 border-b border-purple-200 font-bold text-purple-900 uppercase flex items-center">
                    <Truck className="w-5 h-5 mr-2 text-purple-600" />
                    {supplier}
                  </div>
                  <div className="divide-y divide-gray-100">
                    {supplierRules.map((r, index) => (
                      <div key={r.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">
                              Do {r.max_days_overdue} dni opóźnienia
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                              {r.return_percentage}% zwrotu
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            Jeżeli opóźnienie wynosi {index === 0 ? 'od 0 do ' : `od ${supplierRules[index - 1].max_days_overdue + 1} do `} {r.max_days_overdue} dni
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Usuń regułę"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupplierRules;
