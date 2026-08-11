import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { returnsAPI, companiesAPI, drumsAPI, transportAPI, rulesAPI, parseToIsoDate } from '../utils/supabaseApi';
import { parsePriceRaw, getClientPrice } from '../utils/priceHelpers';
import TransportOrderModal from './TransportOrderModal';
import {
  Truck,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  MapPin,
  Calendar,
  Package,
  Layers,
  ArrowUpDown,
  Edit,
  RefreshCw,
  Circle,
  ArrowDown,
  Trash2,
  GitMerge,
  CheckSquare,
  Square
} from 'lucide-react';

const formatPalletName = (size) => {
  if (!size) return 'Paleta';
  const str = String(size).trim();
  if (str.toLowerCase().startsWith('paleta')) {
    return str;
  }
  return `Paleta ${str}`;
};

const MergeRequestsModal = ({
  showMergeModal,
  setShowMergeModal,
  selectedMergeIds,
  setSelectedMergeIds,
  setMergeMode,
  requests,
  handleRefresh,
  returnsAPI
}) => {
  const selectedRequests = requests.filter(r => selectedMergeIds.includes(r.id));

  // Ekstrakcja unikalnych opcji dla poszczególnych pól
  const clientOptions = (() => {
    const map = new Map();
    selectedRequests.forEach(r => {
      const key = `${r.user_nip}_${r.company_name}`;
      if (!map.has(key)) {
        map.set(key, { user_nip: r.user_nip, company_name: r.company_name });
      }
    });
    return Array.from(map.values());
  })();

  const streetOptions = Array.from(new Set(selectedRequests.map(r => r.street).filter(Boolean)));
  const postalOptions = Array.from(new Set(selectedRequests.map(r => r.postal_code).filter(Boolean)));
  const cityOptions = Array.from(new Set(selectedRequests.map(r => r.city).filter(Boolean)));
  const dateOptions = Array.from(new Set(selectedRequests.map(r => parseToIsoDate(r.collection_date)).filter(Boolean)));
  const loadingHoursOptions = (() => {
    const opts = Array.from(new Set(selectedRequests.map(r => r.loading_hours).filter(h => h && h !== 'Brak')));
    return opts.length > 0 ? opts : ['Brak'];
  })();

  const equipmentOptions = (() => {
    const opts = Array.from(new Set(selectedRequests.map(r => r.available_equipment).filter(e => e && e !== 'Brak')));
    return opts.length > 0 ? opts : ['Brak'];
  })();
  const emailOptions = Array.from(new Set(selectedRequests.map(r => r.email).filter(Boolean)));

  const profileOptions = (() => {
    const map = new Map();
    selectedRequests.forEach(r => {
      if (r.profile_name) {
        const key = `${r.profile_name}_${r.profile_email || ''}_${r.profile_phone || ''}`;
        if (!map.has(key)) {
          map.set(key, {
            profile_id: r.profile_id || null,
            profile_name: r.profile_name,
            profile_email: r.profile_email || '',
            profile_phone: r.profile_phone || ''
          });
        }
      }
    });
    return Array.from(map.values());
  })();

  const initialClient = clientOptions[0] || { user_nip: '', company_name: '' };
  const hasApproved = selectedRequests.some(r => r.status === 'Approved');
  const hasInTransit = selectedRequests.some(r => r.status === 'InTransit');
  const hasHighPriority = selectedRequests.some(r => r.priority === 'High');

  const initialStatus = hasInTransit ? 'InTransit' : (hasApproved ? 'Approved' : 'Pending');
  const initialPriority = hasHighPriority ? 'High' : 'Normal';

  const combinedNotes = selectedRequests
    .map(r => `[Zgłoszenie ${returnsAPI.getRequestDisplayId(r, requests)}]: ${r.notes ? r.notes.trim() : 'Brak dodatkowych uwag'}`)
    .join('\n\n') + `\n\n[Połączono ze zgłoszeń: ${selectedRequests.map(r => returnsAPI.getRequestDisplayId(r, requests)).join(', ')}]`;

  const defaultCollectionDate = dateOptions[0] || new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    clientIndex: 0,
    user_nip: '',
    company_name: '',
    street: '',
    postal_code: '',
    city: '',
    collection_date: '',
    loading_hours: '',
    available_equipment: '',
    email: '',
    profileIndex: 0,
    status: 'Pending',
    priority: 'Normal',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (showMergeModal && selectedRequests.length >= 2) {
      const firstReq = selectedRequests[0] || {};
      const initialClient = clientOptions[0] || { 
        user_nip: firstReq.user_nip || '', 
        company_name: firstReq.company_name || '' 
      };
      
      const hasApproved = selectedRequests.some(r => r.status === 'Approved');
      const hasInTransit = selectedRequests.some(r => r.status === 'InTransit');
      const hasHighPriority = selectedRequests.some(r => r.priority === 'High');

      const initialStatus = hasInTransit ? 'InTransit' : (hasApproved ? 'Approved' : 'Pending');
      const initialPriority = hasHighPriority ? 'High' : 'Normal';

      const combinedNotes = selectedRequests
        .map(r => `[Zgłoszenie ${returnsAPI.getRequestDisplayId(r, requests)}]: ${r.notes ? r.notes.trim() : 'Brak dodatkowych uwag'}`)
        .join('\n\n') + `\n\n[Połączono ze zgłoszeń: ${selectedRequests.map(r => returnsAPI.getRequestDisplayId(r, requests)).join(', ')}]`;

      const defaultCollectionDate = dateOptions[0] || parseToIsoDate(firstReq.collection_date) || new Date().toISOString().split('T')[0];

      setFormData({
        clientIndex: 0,
        user_nip: initialClient.user_nip || firstReq.user_nip || '',
        company_name: initialClient.company_name || firstReq.company_name || '',
        street: streetOptions[0] || firstReq.street || '',
        postal_code: postalOptions[0] || firstReq.postal_code || '',
        city: cityOptions[0] || firstReq.city || '',
        collection_date: defaultCollectionDate,
        loading_hours: loadingHoursOptions[0] || firstReq.loading_hours || '',
        available_equipment: equipmentOptions[0] || firstReq.available_equipment || '',
        email: emailOptions[0] || firstReq.email || '',
        profileIndex: 0,
        status: initialStatus,
        priority: initialPriority,
        notes: combinedNotes
      });
    }
  }, [showMergeModal, selectedMergeIds]);

  if (!showMergeModal || selectedMergeIds.length < 2) return null;

  // Scalanie pozycji z wybranym asortymentem przy zachowaniu pierwotnych dat zgłoszenia
  const mergedDrumsAndPallets = (() => {
    const items = [];
    const palletsMap = {};

    selectedRequests.forEach(req => {
      if (Array.isArray(req.selected_drums)) {
        req.selected_drums.forEach(item => {
          const itemReportedAt = (typeof item === 'object' && item !== null && item.reported_at) ? item.reported_at : req.created_at;
          const itemOriginalReqId = (typeof item === 'object' && item !== null && item.original_request_id) ? item.original_request_id : req.id;

          if (typeof item === 'object' && item !== null && item.type === 'pallet') {
            const key = `${item.size || 'EURO'}_${itemReportedAt}`;
            if (palletsMap[key]) {
              palletsMap[key].quantity = (palletsMap[key].quantity || 0) + (item.quantity || 0);
              if (item.transportedQuantity !== undefined) {
                palletsMap[key].transportedQuantity = (palletsMap[key].transportedQuantity || 0) + (item.transportedQuantity || 0);
              }
            } else {
              palletsMap[key] = {
                ...item,
                reported_at: itemReportedAt,
                original_request_id: itemOriginalReqId
              };
            }
          } else if (typeof item === 'object' && item !== null) {
            items.push({
              ...item,
              reported_at: itemReportedAt,
              original_request_id: itemOriginalReqId
            });
          } else {
            items.push({
              cecha: item,
              type: 'drum',
              reported_at: itemReportedAt,
              original_request_id: itemOriginalReqId
            });
          }
        });
      }
    });

    Object.values(palletsMap).forEach(p => items.push(p));
    return items;
  })();

  const totalDrumsCount = mergedDrumsAndPallets.filter(d => typeof d !== 'object' || d.type !== 'pallet').length;
  const totalPalletsCount = mergedDrumsAndPallets
    .filter(d => typeof d === 'object' && d.type === 'pallet')
    .reduce((sum, p) => sum + (p.quantity || 0), 0);

  const handleMergeSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const firstReq = selectedRequests[0] || {};
      const selectedProf = profileOptions[formData.profileIndex] || null;

      const payload = {
        user_nip: formData.user_nip || firstReq.user_nip || '',
        company_name: formData.company_name || firstReq.company_name || '',
        street: formData.street || firstReq.street || '',
        postal_code: formData.postal_code || firstReq.postal_code || '',
        city: formData.city || firstReq.city || '',
        collection_date: parseToIsoDate(formData.collection_date) || parseToIsoDate(firstReq.collection_date) || new Date().toISOString().split('T')[0],
        loading_hours: (formData.loading_hours && formData.loading_hours !== 'Brak') ? formData.loading_hours : (selectedRequests.find(r => r.loading_hours && r.loading_hours !== 'Brak')?.loading_hours || formData.loading_hours || ''),
        available_equipment: (formData.available_equipment && formData.available_equipment !== 'Brak') ? formData.available_equipment : (selectedRequests.find(r => r.available_equipment && r.available_equipment !== 'Brak')?.available_equipment || formData.available_equipment || ''),
        email: formData.email || firstReq.email || '',
        profile_id: selectedProf?.profile_id || firstReq.profile_id || null,
        profile_name: selectedProf?.profile_name || firstReq.profile_name || null,
        profile_email: selectedProf?.profile_email || firstReq.profile_email || null,
        profile_phone: selectedProf?.profile_phone || firstReq.profile_phone || null,
        status: formData.status || 'Pending',
        priority: formData.priority || 'Normal',
        notes: formData.notes,
        selected_drums: mergedDrumsAndPallets
      };

      const newReturn = await returnsAPI.createReturn(payload);
      await returnsAPI.deleteReturn(selectedMergeIds);

      setShowMergeModal(false);
      setSelectedMergeIds([]);
      setMergeMode(false);
      handleRefresh();

      alert(`Pomyślnie połączono wybrane zgłoszenia w nowe zgłoszenie ${returnsAPI.getRequestDisplayId(newReturn, requests)}!`);
    } catch (err) {
      console.error('Błąd podczas łączenia zgłoszeń:', err);
      alert('Wystąpił błąd podczas łączenia zgłoszeń: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={() => setShowMergeModal(false)}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <GitMerge className="w-6 h-6 text-indigo-200" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Łączenie zgłoszeń zwrotu</h2>
                <p className="text-xs text-indigo-200 mt-1 font-medium">
                  Łączysz {selectedRequests.length} wybrane zgłoszenia w jedno skonsolidowane zgłoszenie
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowMergeModal(false)}
              className="p-2 text-indigo-200 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleMergeSubmit} className="p-6 space-y-6">
          <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100">
            <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">Łączone zgłoszenia:</h3>
            <div className="flex flex-wrap gap-2">
              {selectedRequests.map(r => (
                <span key={r.id} className="text-xs font-semibold bg-white text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200 shadow-xs">
                  {returnsAPI.getRequestDisplayId(r, requests)} ({r.company_name})
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-3">1. Wybierz dane Klienta i Dostawy</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Klient / Firma</label>
                <select
                  value={formData.clientIndex || 0}
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    const selectedC = clientOptions[idx];
                    if (selectedC) {
                      setFormData(prev => ({
                        ...prev,
                        clientIndex: idx,
                        user_nip: selectedC.user_nip,
                        company_name: selectedC.company_name
                      }));
                    }
                  }}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-gray-300 bg-white"
                >
                  {clientOptions.map((c, idx) => (
                    <option key={idx} value={idx}>{c.company_name} (NIP: {c.user_nip})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Ulica i numer</label>
                <select
                  value={formData.street}
                  onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-gray-300 bg-white"
                >
                  {streetOptions.map((s, idx) => (
                    <option key={idx} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Kod pocztowy</label>
                <select
                  value={formData.postal_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-gray-300 bg-white"
                >
                  {postalOptions.map((p, idx) => (
                    <option key={idx} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Miasto</label>
                <select
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-gray-300 bg-white"
                >
                  {cityOptions.map((c, idx) => (
                    <option key={idx} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-3">2. Wybierz preferencje Odbioru</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Preferowana data odbioru</label>
                <select
                  value={formData.collection_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, collection_date: e.target.value }))}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-gray-300 bg-white"
                >
                  {dateOptions.map((d, idx) => (
                    <option key={idx} value={d}>{new Date(d).toLocaleDateString('pl-PL')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Godziny załadunku</label>
                <select
                  value={formData.loading_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, loading_hours: e.target.value }))}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-gray-300 bg-white"
                >
                  {loadingHoursOptions.map((h, idx) => (
                    <option key={idx} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Dostępny sprzęt</label>
                <select
                  value={formData.available_equipment}
                  onChange={(e) => setFormData(prev => ({ ...prev, available_equipment: e.target.value }))}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-gray-300 bg-white"
                >
                  {equipmentOptions.map((eq, idx) => (
                    <option key={idx} value={eq}>{eq}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-3">3. Wybierz osobę zgłaszającą i kontakt</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email główny zgłoszenia</label>
                <select
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-gray-300 bg-white"
                >
                  {emailOptions.map((em, idx) => (
                    <option key={idx} value={em}>{em}</option>
                  ))}
                </select>
              </div>

              {profileOptions.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Profil pracownika zgłaszającego</label>
                  <select
                    value={formData.profileIndex}
                    onChange={(e) => setFormData(prev => ({ ...prev, profileIndex: Number(e.target.value) }))}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-gray-300 bg-white"
                  >
                    {profileOptions.map((p, idx) => (
                      <option key={idx} value={idx}>
                        {p.profile_name} {p.profile_email ? `(${p.profile_email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-3">4. Status i Priorytet nowego zgłoszenia</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Status połączonego zgłoszenia</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-gray-300 bg-white"
                >
                  <option value="Pending">Oczekuje (Pending)</option>
                  <option value="Approved">Przekazane do transportu (Approved)</option>
                  <option value="InTransit">W trakcie transportu (InTransit)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Priorytet</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-gray-300 bg-white"
                >
                  <option value="Normal">Normalny</option>
                  <option value="High">Pilne (High)</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Uwagi połączone (możesz edytować)</label>
            <textarea
              rows={4}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full text-xs font-medium p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Zostanie utworzone 1 nowe zgłoszenie z zawartością:</span>
            <div className="flex gap-3">
              <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-md">{totalDrumsCount} bębnów</span>
              <span className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-md">{totalPalletsCount} palet</span>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowMergeModal(false)}
              className="px-5 py-3 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Łączenie...</span>
                </>
              ) : (
                <>
                  <GitMerge className="w-4 h-4" />
                  <span>Utwórz połączone zgłoszenie</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminReturnRequests = ({ user, initialFilter = {} }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlClientNip = searchParams.get('clientNip');

  const userRole = user?.role?.toLowerCase() || '';
  const canChangeStatus = ['admin', 'supervisor', 'magazyn'].includes(userRole);
  const canChangePickupType = ['admin', 'supervisor'].includes(userRole);

  const lastScrollYRef = useRef(0);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('searchTerm') || '');
  const [filterStatus, setFilterStatus] = useState(initialFilter.status || 'all');
  const [filterPriority, setFilterPriority] = useState(initialFilter.priority || 'all');
  const [filterPickupType, setFilterPickupType] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [requestForTransport, setRequestForTransport] = useState(null);
  const [hasOpenedFromUrl, setHasOpenedFromUrl] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [splitSelectedDrums, setSplitSelectedDrums] = useState([]);
  const [supplierRules, setSupplierRules] = useState([]);

  // Stany dla łączenia zgłoszeń
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedMergeIds, setSelectedMergeIds] = useState([]);
  const [showMergeModal, setShowMergeModal] = useState(false);

  const fetchRequests = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const data = await returnsAPI.getReturns(urlClientNip);
      setRequests(data);
    } catch (err) {
      console.error('Błąd pobierania zgłoszeń:', err);
      setError('Nie udało się pobrać zgłoszeń.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [urlClientNip]);

  useEffect(() => {
    fetchRequests(false);
    rulesAPI.getRules().then(setSupplierRules).catch(console.error);
  }, [fetchRequests]);

  const handleRefresh = (isSilent = true) => {
    fetchRequests(isSilent);
  };

  const handleStatusChange = async (requestId, newStatus) => {
    if (!canChangeStatus) {
      alert('Brak uprawnień do zmiany statusu.');
      return;
    }
    try {
      const statusVal = typeof newStatus === 'string' ? newStatus : newStatus.status;
      await returnsAPI.updateReturnStatus(requestId, newStatus);
      
      if (selectedRequest && selectedRequest.id === requestId) {
        setSelectedRequest(prev => prev ? { ...prev, status: statusVal } : null);
      }
      
      handleRefresh();
    } catch (err) {
      console.error('Błąd zmiany statusu:', err);
      alert('Nie udało się zmienić statusu.');
    }
  };

  const handleToggleDrumTransport = async (itemToToggle) => {
    if (!canChangeStatus || !selectedRequest) return;
    const itemLabel = getDrumLabel(itemToToggle);
    const updatedDrums = selectedRequest.selected_drums.map(d => {
      if (getDrumLabel(d) === itemLabel) {
        const isObj = typeof d === 'object' && d !== null;
        const currentTransported = isObj ? d.transported : true;
        const newTransported = currentTransported === false ? true : false;
        return isObj 
          ? { ...d, transported: newTransported } 
          : { cecha: d, type: 'drum', transported: newTransported };
      }
      return d;
    });

    try {
      await returnsAPI.updateReturnStatus(selectedRequest.id, {
        selected_drums: updatedDrums
      });
      setSelectedRequest(prev => prev ? { ...prev, selected_drums: updatedDrums } : null);
      handleRefresh();
    } catch (err) {
      console.error('Błąd zmiany statusu opakowania:', err);
      alert('Nie udało się zmienić statusu opakowania.');
    }
  };

  const handleTransportConfirm = async (transportData) => {
    try {
      const updatedDrums = requestForTransport.selected_drums.map(d => {
        const isPallet = typeof d === 'object' && d.type === 'pallet';
        if (isPallet) {
          const transportedQty = transportData.transportedPallets?.find(p => p.size === d.size)?.quantity;
          const isTransported = d.transported === true || (transportedQty !== undefined && transportedQty > 0);
          return { ...d, transported: isTransported, transportedQuantity: transportedQty !== undefined ? transportedQty : d.transportedQuantity };
        }
        
        const cecha = typeof d === 'object' ? d.cecha || d.kod_bebna : d;
        const wasTransported = typeof d === 'object' && d.transported === true;
        const isTransportedNow = transportData.transportedDrumCechas.includes(cecha);
        const isTransported = wasTransported || isTransportedNow;
        return typeof d === 'object' ? { ...d, transported: isTransported } : { cecha: d, transported: isTransported };
      });
      const transportedCount = transportData.transportedDrumCechas.length;
      const transportedPalletsCount = transportData.transportedPallets?.reduce((sum, p) => sum + (p.quantity || 0), 0) || 0;

      // 1. Wyślij do systemu Transport (tylko dla spedycji)
      if (transportData.transportMethod === 'spedycja') {
        const selectedDrumsDetails = requestForTransport.selected_drums.filter(d => {
            if (typeof d === 'object' && d.type === 'pallet') {
              return transportData.transportedPallets?.some(p => p.size === d.size && p.quantity > 0);
            }
            const cecha = typeof d === 'object' ? d.cecha || d.kod_bebna : d;
            return transportData.transportedDrumCechas.includes(cecha);
        });

        const drumsDescParts = selectedDrumsDetails.map(d => {
            if (typeof d === 'object') {
                if (d.type === 'pallet' || d.isPallet || (!d.cecha && !d.kod_bebna && (d.size || d.name || d.nazwa))) return `${formatPalletName(d.size || d.cecha || d.name || d.nazwa || d.pallet_type)} - ${d.transportedQuantity || d.quantity} szt.`;
                const cecha = d.cecha || d.kod_bebna || '';
                const size = d.rozmiar_bebna || d.nazwa || '';
                const weight = d.waga_bebna || d.WAGA_BEBNA || d.weight || d.waga || '';
                return `${cecha} ${size ? `(${size})` : ''}${weight ? ` - ${weight}kg` : ''}`;
            }
            return d;
        });
        const goodsDesc = drumsDescParts.join(', ');

        const spedycjaPayload = {
          createdBy: user?.name || 'Admin Opakowania',
          createdByEmail: user?.email || 'admin@grupaeltron.pl',
          responsiblePerson: transportData.salespersonName || user?.name || 'Admin Opakowania',
          responsibleEmail: user?.email || 'admin@grupaeltron.pl',
          mpk: transportData.mpk,
          location: 'Odbiory własne',
          producerAddress: {
            city: requestForTransport.city,
            postalCode: requestForTransport.postal_code,
            street: requestForTransport.street
          },
          delivery: transportData.deliveryAddress,
          loadingContact: ((requestForTransport.notes || '').match(/Telefon kontaktowy:\s*([\d\s\+\-]{8,20})/)?.[1]?.trim()) || requestForTransport.profile_phone || 'Brak telefonu',
          unloadingContact: transportData.unloadingContact || '',
          deliveryDate: transportData.transportDate,
          notes: `Zgłoszenie z Opakowań ${returnsAPI.getRequestDisplayId(requestForTransport, requests)}\nGodziny załadunku: ${requestForTransport.loading_hours || 'Brak'}\nSprzęt: ${requestForTransport.available_equipment || 'Brak'}\n${requestForTransport.notes || ''}`,
          clientName: transportData.deliveryName || (typeof transportData.deliveryAddress === 'object' ? transportData.deliveryAddress.name : null) || requestForTransport.company_name,
          sourceClientName: requestForTransport.company_name,
          distanceKm: transportData.distanceKm || 0,
          goodsDescription: {
            description: `Bębny z kablowni (${transportedCount} szt.) i Palety (${transportedPalletsCount} szt.): ${goodsDesc}`,
            weight: transportData.totalWeight
          }
        };

        await transportAPI.createTransportOrder(spedycjaPayload);
      }

      // 2. Zmień status w Opakowaniach na InTransit i ustaw datę
      await returnsAPI.updateReturnStatus(requestForTransport.id, {
        status: 'InTransit',
        transport_date: transportData.transportDate,
        selected_drums: updatedDrums
      });
      
      setShowTransportModal(false);
      setRequestForTransport(null);
      if (showRequestDetails) setShowRequestDetails(false);
      handleRefresh();
      
      if (transportData.transportMethod === 'spedycja') {
        alert('Zlecenie spedycyjne zostało pomyślnie wysłane do systemu Transport!');
      } else {
        alert('Status zgłoszenia został zaktualizowany na Transport własny.');
      }
    } catch (err) {
      console.error('Błąd wysyłania zlecenia:', err);
      alert('Nie udało się wysłać zlecenia: ' + err.message);
    }
  };



  const handleAddCorrectionNumber = async (requestId) => {
    if (!canChangeStatus) {
      alert('Brak uprawnień do zmiany numeru korekty.');
      return;
    }
    const currentReq = requests.find(r => r.id === requestId) || (selectedRequest?.id === requestId ? selectedRequest : null);
    const number = prompt("Podaj numer(y) korekt (oddziel przecinkami):", currentReq?.correction_number || "");
    if (number === null) return;

    try {
      await returnsAPI.updateReturnStatus(requestId, {
        correction_number: number
      });
      if (selectedRequest && selectedRequest.id === requestId) {
        setSelectedRequest(prev => prev ? { ...prev, correction_number: number } : null);
      }
      handleRefresh();
    } catch (err) {
      console.error('Błąd dodawania numeru korekty:', err);
      alert('Nie udało się zapisać numeru korekty.');
    }
  };

  const handleRemoveDrum = async (drumToRemove) => {
    if (!canChangeStatus) return;
    const label = getDrumLabel(drumToRemove);
    const confirmRemove = window.confirm(`Czy na pewno chcesz usunąć bęben ${label} z tego zgłoszenia?\n\nSpowoduje to, że bęben znowu będzie widoczny dla klienta jako dostępny do zwrotu (np. jeśli klient zapomniał go załadować).`);
    if (!confirmRemove) return;

    try {
      const newDrums = selectedRequest.selected_drums.filter(d => getDrumLabel(d) !== label);
      
      if (newDrums.length === 0) {
        const confirmCancel = window.confirm('Zgłoszenie nie ma już żadnych bębnów. Czy chcesz całkowicie odrzucić/anulować to zgłoszenie?');
        if (confirmCancel) {
          await returnsAPI.updateReturnStatus(selectedRequest.id, { status: 'Rejected', selected_drums: [] });
          handleCloseModal();
          handleRefresh();
          return;
        } else {
          return;
        }
      }

      await returnsAPI.updateReturnStatus(selectedRequest.id, { selected_drums: newDrums });
      
      setSelectedRequest(prev => ({
        ...prev,
        selected_drums: newDrums
      }));
      
      handleRefresh();
      alert(`Bęben ${label} został usunięty ze zgłoszenia.`);
    } catch (err) {
      console.error('Błąd usuwania bębna ze zgłoszenia:', err);
      alert('Nie udało się usunąć bębna ze zgłoszenia.');
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleViewRequest = useCallback(async (request) => {
    if (typeof window !== 'undefined') {
      lastScrollYRef.current = window.scrollY || window.pageYOffset || 0;
    }
    setSelectedRequest(request);
    setShowRequestDetails(true);
    setEnriching(true);

    try {
      const cechy = request.selected_drums?.map(d => typeof d === 'object' ? d.cecha : d) || [];
      if (cechy.length > 0) {
        const enrichedDrums = await drumsAPI.getDrumsByCechy(cechy);
        
        // Łączymy dane ze snapshotu z aktualnymi danymi z bazy
        const mergedDrums = request.selected_drums.map(d => {
          const cecha = typeof d === 'object' ? d.cecha : d;
          const liveData = enrichedDrums.find(ld => ld.cecha === cecha);
          return {
            ...d,
            ...(liveData || {}),
            isDamaged: d.isDamaged, // Zachowujemy informację o uszkodzeniu ze zgłoszenia
            description: d.description // Zachowujemy opis ze zgłoszenia
          };
        });

        setSelectedRequest(prev => prev ? { ...prev, selected_drums: mergedDrums } : null);
      }
    } catch (err) {
      console.error('Błąd wzbogacania danych bębnów:', err);
    } finally {
      setEnriching(false);
    }
  }, []);

  useEffect(() => {
    const openModalId = searchParams.get('openModalId');
    if (openModalId && requests.length > 0 && !hasOpenedFromUrl) {
      const requestToOpen = requests.find(r => r.id.toString() === openModalId);
      if (requestToOpen) {
        handleViewRequest(requestToOpen);
        setHasOpenedFromUrl(true);
      }
    }
  }, [requests, searchParams, hasOpenedFromUrl, handleViewRequest]);

  const handleCloseModal = () => {
    const savedY = lastScrollYRef.current;
    setShowRequestDetails(false);
    setSelectedRequest(null);
    setSplitMode(false);
    setSplitSelectedDrums([]);

    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedY, behavior: 'instant' });
      });
    }
  };

  const handleSplitConfirm = async () => {
    if (splitSelectedDrums.length === 0) return;
    if (splitSelectedDrums.length === selectedRequest.selected_drums.length) {
      alert("Nie możesz wydzielić wszystkich bębnów do nowego zgłoszenia.");
      return;
    }

    const confirm = window.confirm(`Czy na pewno chcesz utworzyć nowe zgłoszenie zawierające ${splitSelectedDrums.length} wybranych bębnów? Zostaną one usunięte z obecnego zgłoszenia.`);
    if (!confirm) return;

    try {
      const drumsToMove = selectedRequest.selected_drums.filter(d => splitSelectedDrums.includes(getDrumLabel(d)));
      const drumsToKeep = selectedRequest.selected_drums.filter(d => !splitSelectedDrums.includes(getDrumLabel(d)));

      const enrichedDrumsToMove = drumsToMove.map(d => {
        if (typeof d === 'object' && d !== null) {
          return {
            ...d,
            reported_at: d.reported_at || selectedRequest.created_at,
            original_request_id: d.original_request_id || selectedRequest.id
          };
        }
        return {
          cecha: d,
          type: 'drum',
          reported_at: selectedRequest.created_at,
          original_request_id: selectedRequest.id
        };
      });

      const newReturnData = {
        user_nip: selectedRequest.user_nip || '8852434220',
        company_name: selectedRequest.company_name || 'Mixel firma elektryczna Kowalski Tomasz',
        collection_date: selectedRequest.collection_date || new Date().toISOString().split('T')[0],
        street: selectedRequest.street || 'Topolowa 3',
        postal_code: selectedRequest.postal_code || '37-450',
        city: selectedRequest.city || 'Stalowa Wola',
        email: selectedRequest.email || 'magazyn@mixel.com.pl',
        loading_hours: selectedRequest.loading_hours || '06:00 - 14:00',
        available_equipment: selectedRequest.available_equipment || 'Wózek widłowy.',
        notes: (selectedRequest.notes || '') + '\n\n[Zgłoszenie wydzielone ze zgłoszenia ' + returnsAPI.getRequestDisplayId(selectedRequest, requests) + ']',
        selected_drums: enrichedDrumsToMove,
        created_at: selectedRequest.created_at,
        status: selectedRequest.status || 'Pending',
        priority: selectedRequest.priority || 'Normal',
        profile_id: selectedRequest.profile_id || null,
        profile_name: selectedRequest.profile_name || null,
        profile_email: selectedRequest.profile_email || null,
        profile_phone: selectedRequest.profile_phone || null
      };

      const createdNewReturn = await returnsAPI.createReturn(newReturnData);

      const newDisplayId = returnsAPI.getRequestDisplayId(createdNewReturn, requests);
      const updatedOriginalNotes = (selectedRequest.notes || '') + `\n\n[Wydzielono ${enrichedDrumsToMove.length} bębnów do zgłoszenia ${newDisplayId}]`;

      await returnsAPI.updateReturnStatus(selectedRequest.id, {
        selected_drums: drumsToKeep,
        notes: updatedOriginalNotes
      });

      setSplitMode(false);
      setSplitSelectedDrums([]);
      handleCloseModal();
      handleRefresh();

      alert('Zgłoszenie zostało pomyślnie podzielone!');
    } catch (err) {
      console.error('Błąd przy dzieleniu zgłoszenia:', err);
      alert('Wystąpił błąd podczas dzielenia zgłoszenia.');
    }
  };

  const getStatusBadge = (requestOrStatus) => {
    const status = typeof requestOrStatus === 'object' && requestOrStatus !== null ? requestOrStatus.status : requestOrStatus;
    const reqObj = typeof requestOrStatus === 'object' && requestOrStatus !== null ? requestOrStatus : null;

    const badges = {
      Pending: { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', text: 'Oczekuje na akceptację', label: '🟡 Oczekujące', icon: Clock },
      Approved: { color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200', text: 'Zaakceptowane (Przekazane do transportu)', label: '🔵 Zaakceptowane', icon: Truck },
      InTransit: { color: 'text-indigo-600', bg: 'bg-indigo-600 text-white border-indigo-700', text: 'W trakcie transportu', label: '🟣 W transporcie', icon: Truck },
      Completed: { color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', text: 'Zakończony', label: '🟢 Zakończony', icon: CheckCircle },
      Rejected: { color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200', text: 'Odrzucony', label: '🔴 Odrzucony', icon: XCircle }
    };

    const badge = badges[status] || badges.Pending;
    const Icon = badge.icon;

    if (canChangeStatus && reqObj && reqObj.id) {
      return (
        <div className="relative group z-30" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => { e.stopPropagation(); }}
            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-sm hover:scale-110 active:scale-95 flex items-center justify-center ${
              status === 'InTransit' 
                ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 shadow-indigo-200' 
                : `${badge.bg} ${badge.color} hover:bg-opacity-80`
            }`}
            title={`Status: ${badge.text}\n(Kliknij lub najedź myszką, aby cofnąć/zmienić status)`}
          >
            <Icon className="w-5 h-5" />
          </button>

          {/* Rozwijane menu wyboru/cofnięcia statusu z ikony ciężarówki/statusu */}
          <div className="absolute right-0 top-full mt-1.5 hidden group-hover:block w-56 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 p-2 space-y-1">
            <div className="text-[10px] font-extrabold text-gray-400 px-2.5 py-1 uppercase tracking-wider border-b border-gray-100 mb-1">
              Zmień / Cofnij status:
            </div>
            {[
              { code: 'Pending', label: '🟡 Oczekujące' },
              { code: 'Approved', label: '🔵 Zaakceptowane' },
              { code: 'InTransit', label: '🟣 W transporcie' },
              { code: 'Completed', label: '🟢 Zakończone' },
              { code: 'Rejected', label: '🔴 Odrzucone' }
            ].map(st => (
              <button
                key={st.code}
                onClick={(e) => {
                  e.stopPropagation();
                  if (st.code === status) return;
                  const confirmMsg = `Czy na pewno chcesz zmienić status zgłoszenia na "${st.label}"?`;
                  if (window.confirm(confirmMsg)) {
                    handleStatusChange(reqObj.id, st.code);
                  }
                }}
                className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-between ${
                  status === st.code
                    ? 'bg-blue-50 text-blue-700 font-extrabold'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <span>{st.label}</span>
                {status === st.code && <span className="text-[10px] text-blue-600 font-extrabold">✓</span>}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className={`p-2 rounded-xl border ${badge.bg} ${badge.color}`} title={badge.text}>
        <Icon className="w-5 h-5" />
      </div>
    );
  };

  const handlePriorityChange = async (requestId, newPriority) => {
    if (!canChangeStatus) return;
    try {
      await returnsAPI.updateReturnStatus(requestId, { priority: newPriority });
      handleRefresh();
    } catch (err) {
      console.error('Błąd zmiany priorytetu:', err);
      alert('Nie udało się zmienić priorytetu.');
    }
  };

  const getPriorityBadge = (request) => {
    const badges = {
      High: { color: 'text-red-500', bg: 'bg-red-50', text: 'Priorytet: Wysoki', icon: AlertTriangle },
      Normal: { color: 'text-gray-400', bg: 'bg-gray-50', text: 'Priorytet: Normalny', icon: Circle },
      Low: { color: 'text-blue-400', bg: 'bg-blue-50', text: 'Priorytet: Niski', icon: ArrowDown }
    };

    const priority = request.priority || 'Normal';
    const badge = badges[priority] || badges.Normal;
    const Icon = badge.icon || Circle;

    const handleClick = (e) => {
      e.stopPropagation();
      if (!canChangeStatus) return;
      const nextPriority = priority === 'High' ? 'Normal' : 'High';
      handlePriorityChange(request.id, nextPriority);
    };

    return (
      <div 
        onClick={handleClick}
        className={`p-2 rounded-xl border border-transparent transition-colors ${canChangeStatus ? 'cursor-pointer hover:border-current hover:bg-gray-100' : 'cursor-help'} ${badge.bg} ${badge.color}`} 
        title={canChangeStatus ? `${badge.text} (Kliknij, aby zmienić)` : badge.text}
      >
        <Icon className="w-5 h-5" />
      </div>
    );
  };

  const getStatistics = () => {
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'Pending').length,
      approved: requests.filter(r => r.status === 'Approved').length,
      inTransit: requests.filter(r => r.status === 'InTransit').length,
      completed: requests.filter(r => r.status === 'Completed').length,
      urgent: requests.filter(r => r.priority === 'High' && r.status !== 'Completed').length
    };
  };

  const filteredAndSortedRequests = useMemo(() => {
    return requests
      .filter(req => {
        const displayId = returnsAPI.getRequestDisplayId(req, requests);
        const matchesSearch = 
          req.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          req.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          req.user_nip?.includes(searchTerm) ||
          req.id?.toString().includes(searchTerm) ||
          displayId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          req.request_number?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
        const matchesPriority = filterPriority === 'all' || req.priority === filterPriority;
        const matchesPickupType = filterPickupType === 'all' || 
          (req.pickup_type || 'spedycja').toLowerCase().includes(filterPickupType.toLowerCase()) ||
          returnsAPI.getPickupTypeInfo(req.pickup_type).value === filterPickupType;

        return matchesSearch && matchesStatus && matchesPriority && matchesPickupType;
      })
      .sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        if (sortBy === 'created_at' || sortBy === 'collection_date') {
          valA = new Date(valA || 0).getTime();
          valB = new Date(valB || 0).getTime();
        }

        if (sortOrder === 'asc') return valA > valB ? 1 : -1;
        return valA < valB ? 1 : -1;
      });
  }, [requests, searchTerm, filterStatus, filterPriority, filterPickupType, sortBy, sortOrder]);

  const getDrumLabel = (drum) => {
    if (typeof drum === 'object' && drum !== null) {
      if (drum.type === 'pallet' || drum.isPallet || (!drum.cecha && !drum.kod_bebna && (drum.size || drum.name || drum.nazwa))) return `${formatPalletName(drum.size || drum.cecha || drum.name || drum.nazwa || drum.pallet_type)} (${drum.quantity} szt.)`;
      return drum.cecha || drum.kod_bebna || 'Nieznany';
    }
    return drum;
  };

  const isDrumDamaged = (drum) => {
    return typeof drum === 'object' && drum !== null && drum.isDamaged;
  };

  const toggleSelectMerge = (requestId) => {
    setSelectedMergeIds(prev =>
      prev.includes(requestId)
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const renderRequestCard = (request) => {
    const isSelectedForMerge = selectedMergeIds.includes(request.id);
    const drumsList = Array.isArray(request.selected_drums) ? request.selected_drums.filter(d => typeof d !== 'object' || d.type !== 'pallet') : [];
    const palletsList = Array.isArray(request.selected_drums) ? request.selected_drums.filter(d => typeof d === 'object' && d.type === 'pallet') : [];
    
    const damagedCount = drumsList.filter(d => isDrumDamaged(d)).length;
    const palletsCount = palletsList.reduce((sum, p) => sum + (p.quantity || 0), 0);

    const collectionDate = new Date(request.collection_date);
    const daysUntilCollection = Math.ceil((collectionDate - new Date()) / (1000 * 60 * 60 * 24));

    return (
      <div
        onClick={() => {
          if (mergeMode) {
            toggleSelectMerge(request.id);
          }
        }}
        className={`bg-white rounded-2xl p-6 shadow-sm border transition-all duration-300 relative flex flex-col h-full ${
          mergeMode
            ? (isSelectedForMerge ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500 cursor-pointer shadow-md' : 'border-gray-200 hover:border-indigo-300 cursor-pointer opacity-80')
            : (request.priority === 'High' ? 'border-red-200 bg-red-50/10' : 'border-gray-100')
        }`}
      >
        {mergeMode && (
          <div className="absolute top-4 right-4 z-10">
            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
              isSelectedForMerge ? 'bg-indigo-600 border-indigo-600 text-white shadow' : 'bg-white border-gray-300 text-transparent'
            }`}>
              {isSelectedForMerge && <CheckCircle className="w-4 h-4" />}
            </div>
          </div>
        )}

        {/* Górny pasek: Numer zgłoszenia, Badge metody odbioru, Ikony akcji (Status i Priorytet) */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-mono text-xs sm:text-sm font-extrabold text-gray-900 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg tracking-tight shrink-0 select-all">
              {returnsAPI.getRequestDisplayId(request, requests)}
            </span>
            {(() => {
              const pInfo = returnsAPI.getPickupTypeInfo(request.pickup_type);
              return (
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border shrink-0 ${pInfo.badgeClass}`}>
                  {pInfo.shortLabel}
                </span>
              );
            })()}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {getStatusBadge(request)}
            {getPriorityBadge(request)}
          </div>
        </div>

        {/* Nazwa firmy & Dane identyfikacyjne */}
        <div className="mb-3">
          <h3 className="text-base font-bold text-blue-900 leading-snug break-words" title={request.company_name}>
            {request.company_name}
          </h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 font-medium mt-1">
            <span>NIP: <strong className="text-gray-700 font-semibold">{request.user_nip}</strong></span>
            <span>•</span>
            <span>Zgłoszono: <strong className="text-gray-700 font-semibold">{new Date(request.created_at).toLocaleDateString('pl-PL')}</strong></span>
          </div>
        </div>

        {/* Podsumowanie ilościowe opakowań */}
        <div className="flex items-center gap-2 mb-4 flex-wrap text-xs">
          <span className="bg-blue-50/80 text-blue-800 border border-blue-100 px-2.5 py-1 rounded-md font-semibold">
            📦 Bębny: {drumsList.length} szt.
          </span>
          {palletsCount > 0 && (
            <span className="bg-amber-50/80 text-amber-800 border border-amber-100 px-2.5 py-1 rounded-md font-semibold">
              🪵 Palety: {palletsCount} szt.
            </span>
          )}
          {damagedCount > 0 && (
            <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded-md font-bold">
              ⚠️ Uszkodzone: {damagedCount} szt.
            </span>
          )}
        </div>

        <div className="mb-6">
          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-3">
            <div className="flex items-start justify-between border-b border-gray-100/50 pb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-tight">SUGEROWANY TERMIN ODBIORU</span>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-blue-600 uppercase mb-0.5">Od: {collectionDate.toLocaleDateString('pl-PL')}</div>
                <div className="text-[10px] font-bold text-gray-900 uppercase">Do: {new Date(collectionDate.getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('pl-PL')}</div>
                {daysUntilCollection < 0 && (
                  <div className="text-[9px] text-red-500 font-bold uppercase mt-1">Przeterminowane</div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase">Godziny załadunku</span>
              </div>
              <span className="font-semibold text-gray-700">{request.loading_hours || 'Brak'}</span>
            </div>

            <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100/50">
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-indigo-500" />
                <span className="text-[10px] font-bold text-indigo-400 uppercase">Zaplanowany transport</span>
              </div>
              <span className="font-bold text-indigo-700">
                {request.transport_date ? new Date(request.transport_date).toLocaleDateString('pl-PL') : '---'}
              </span>
            </div>
          </div>
        </div>

        {request.correction_number ? (
          <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="truncate">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Wystawiono korektę</span>
                <span className="text-xs font-medium text-emerald-800 truncate block">{request.correction_number}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Brak korekty</span>
            </div>
          </div>
        )}

        <div className="space-y-3 mb-6 flex-grow">
          <div className="flex items-start space-x-3 text-sm">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <span className="text-gray-600 leading-snug font-medium truncate">{request.street}, {request.postal_code} {request.city}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-auto pt-4 border-t border-gray-100">
          <button
            onClick={(e) => {
              if (mergeMode) {
                e.stopPropagation();
                toggleSelectMerge(request.id);
                return;
              }
              handleViewRequest(request);
            }}
            className="flex-1 bg-gray-100 text-gray-700 py-2.5 px-4 rounded-xl font-bold hover:bg-gray-200 transition-colors text-sm"
          >
            Szczegóły
          </button>

          {request.status === 'Pending' && canChangeStatus && (
            <button
              onClick={(e) => {
                if (mergeMode) {
                  e.stopPropagation();
                  toggleSelectMerge(request.id);
                  return;
                }
                handleStatusChange(request.id, 'Approved');
              }}
              className="flex-1 bg-emerald-600 text-white py-2.5 px-4 rounded-xl font-bold hover:bg-emerald-700 transition-colors text-sm"
            >
              Zatwierdź
            </button>
          )}

          {request.status === 'Approved' && canChangeStatus && (
            <>
              <button
                onClick={(e) => {
                  if (mergeMode) {
                    e.stopPropagation();
                    toggleSelectMerge(request.id);
                    return;
                  }
                  setRequestForTransport(request);
                  setShowTransportModal(true);
                }}
                className="flex-1 bg-indigo-600 text-white py-2.5 px-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors text-sm"
              >
                Transport
              </button>
              <button
                onClick={(e) => {
                  if (mergeMode) {
                    e.stopPropagation();
                    toggleSelectMerge(request.id);
                    return;
                  }
                  handleAddCorrectionNumber(request.id);
                }}
                className={`py-2.5 px-3 rounded-xl font-bold transition-colors text-sm border ${
                  request.correction_number 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' 
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
                title={request.correction_number ? `Korekty: ${request.correction_number}` : 'Dodaj numer korekty'}
              >
                {request.correction_number ? 'Korekta' : '+ Korekta'}
              </button>
            </>
          )}

          {request.status === 'InTransit' && canChangeStatus && (
            <>
              <button
                onClick={(e) => {
                  if (mergeMode) {
                    e.stopPropagation();
                    toggleSelectMerge(request.id);
                    return;
                  }
                  handleStatusChange(request.id, 'Completed');
                }}
                className="flex-1 bg-emerald-600 text-white py-2.5 px-4 rounded-xl font-bold hover:bg-emerald-700 transition-colors text-sm"
              >
                Zakończ
              </button>
              <button
                onClick={(e) => {
                  if (mergeMode) {
                    e.stopPropagation();
                    toggleSelectMerge(request.id);
                    return;
                  }
                  handleAddCorrectionNumber(request.id);
                }}
                className={`py-2.5 px-3 rounded-xl font-bold transition-colors text-sm border ${
                  request.correction_number 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' 
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
                title={request.correction_number ? `Korekty: ${request.correction_number}` : 'Dodaj numer korekty'}
              >
                {request.correction_number ? 'Korekta' : '+ Korekta'}
              </button>
            </>
          )}

          {request.status === 'Completed' && canChangeStatus && (
            <button
              onClick={(e) => {
                if (mergeMode) {
                  e.stopPropagation();
                  toggleSelectMerge(request.id);
                  return;
                }
                handleAddCorrectionNumber(request.id);
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl font-bold transition-colors text-sm border ${
                request.correction_number 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' 
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {request.correction_number ? 'Korekta' : '+ Korekta'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderRequestDetailsModal = () => {
    if (!showRequestDetails || !selectedRequest) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={handleCloseModal}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Zgłoszenie zwrotu {returnsAPI.getRequestDisplayId(selectedRequest, requests)}</h2>
                <div className="flex items-center space-x-3 mt-2">
                  {getStatusBadge(selectedRequest.status)}
                  {getPriorityBadge(selectedRequest)}
                  {canChangePickupType ? (
                    <select
                      value={returnsAPI.getPickupTypeInfo(selectedRequest.pickup_type).value}
                      onChange={async (e) => {
                        const newType = e.target.value;
                        try {
                          await returnsAPI.updateReturnStatus(selectedRequest.id, { pickup_type: newType });
                          setSelectedRequest(prev => ({ ...prev, pickup_type: newType }));
                          setRequests(prev => prev.map(r => r.id === selectedRequest.id ? { ...r, pickup_type: newType } : r));
                        } catch (err) {
                          alert('Błąd zmiany metody odbioru: ' + err.message);
                        }
                      }}
                      className="text-xs font-bold px-2.5 py-1 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="spedycja">Spedycja</option>
                      <option value="magazyn_bialystok">Magazyn Białystok</option>
                      <option value="magazyn_zielonka">Magazyn Zielonka</option>
                    </select>
                  ) : (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${returnsAPI.getPickupTypeInfo(selectedRequest.pickup_type).badgeClass}`}>
                      {returnsAPI.getPickupTypeInfo(selectedRequest.pickup_type).label}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informacje o firmie</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nazwa firmy</label>
                    <p className="text-gray-900">{selectedRequest.company_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">NIP</label>
                    <p className="text-gray-900">{selectedRequest.user_nip}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email kontaktowy</label>
                    <p className="text-gray-900">{selectedRequest.email}</p>
                  </div>
                  {selectedRequest.profile_name && (
                    <div className="pt-2 border-t border-gray-155">
                      <label className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">Osoba zgłaszająca (profil)</label>
                      <p className="text-sm font-extrabold text-slate-800">{selectedRequest.profile_name}</p>
                      {selectedRequest.profile_email && <p className="text-xs text-slate-500 font-medium mt-0.5">{selectedRequest.profile_email}</p>}
                      {selectedRequest.profile_phone && <p className="text-xs text-slate-500 font-semibold mt-0.5">Tel: {selectedRequest.profile_phone}</p>}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Adres odbioru</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Ulica</label>
                    <p className="text-gray-900">{selectedRequest.street}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Kod pocztowy</label>
                      <p className="text-gray-900">{selectedRequest.postal_code}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Miasto</label>
                      <p className="text-gray-900">{selectedRequest.city}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Szczegóły odbioru</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Data odbioru</label>
                    <p className="text-gray-900">{new Date(selectedRequest.collection_date).toLocaleDateString('pl-PL')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Godziny załadunku</label>
                    <p className="text-gray-900">{selectedRequest.loading_hours}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Dostępny sprzęt</label>
                    <p className="text-gray-900">{selectedRequest.available_equipment || 'Brak'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status zgłoszenia</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Aktualny status</label>
                    <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Priorytet</label>
                    <div className="mt-1">{getPriorityBadge(selectedRequest)}</div>
                  </div>
                  {selectedRequest.transport_date && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Data transportu</label>
                      <p className="text-indigo-700 font-semibold">{new Date(selectedRequest.transport_date).toLocaleDateString('pl-PL')}</p>
                    </div>
                  )}
                  {selectedRequest.correction_number && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Numer korekty</label>
                      <div className="flex flex-col space-y-1 mt-1">
                        {selectedRequest.correction_number.split(',').map((num, i) => (
                          <p key={i} className="text-green-700 font-bold">{num.trim()}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500">Data zgłoszenia</label>
                    <p className="text-gray-900">
                      {new Date(selectedRequest.created_at).toLocaleDateString('pl-PL')}
                      <span className="text-gray-500 ml-2">({Math.floor((new Date() - new Date(selectedRequest.created_at)) / (1000 * 60 * 60 * 24))} dni temu)</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Szczegóły asortymentu
                </h3>
                <div className="flex items-center gap-3">
                  {enriching ? (
                    <div className="flex items-center space-x-2 text-xs text-blue-600 font-medium animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Pobieranie aktualnych danych...</span>
                    </div>
                  ) : (
                    <>
                      {canChangeStatus && selectedRequest.selected_drums?.length > 1 && !splitMode && (
                        <button
                          onClick={() => setSplitMode(true)}
                          className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <ArrowUpDown className="w-4 h-4" />
                          Podziel zgłoszenie
                        </button>
                      )}
                      {splitMode && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSplitMode(false);
                              setSplitSelectedDrums([]);
                            }}
                            className="text-sm font-bold text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg bg-gray-100 transition-colors"
                          >
                            Anuluj
                          </button>
                          <button
                            onClick={handleSplitConfirm}
                            disabled={splitSelectedDrums.length === 0 || splitSelectedDrums.length === selectedRequest.selected_drums.length}
                            className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Wydziel ({splitSelectedDrums.length})
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {selectedRequest.selected_drums?.some(d => typeof d === 'object' && d.transported === false) && (
                <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-sm font-medium flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="block font-bold">Zgłoszenie w trakcie realizacji</span>
                    Niektóre z bębnów na tym zgłoszeniu nie zostały odebrane podczas ostatniego transportu. Zgłoszenie pozostaje otwarte. Możesz zlecić kolejny transport dla pozostałych bębnów lub ręcznie zakończyć zgłoszenie.
                  </div>
                </div>
              )}
              
              <div className="mb-4 text-gray-700 font-medium border-b pb-2">
                Wybrane bębny ({Array.isArray(selectedRequest.selected_drums) ? selectedRequest.selected_drums.filter(d => (typeof d !== 'object' || d.type !== 'pallet') && d.transported !== false).length : 0} szt.)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                {Array.isArray(selectedRequest.selected_drums) && selectedRequest.selected_drums.filter(d => typeof d !== 'object' || d.type !== 'pallet').map((drum, idx) => {
                  const label = getDrumLabel(drum);
                  const damaged = isDrumDamaged(drum);
                  const description = damaged ? drum.description : '';
                  
                  // Obliczenia dla bębna zgodne z nowymi wytycznymi systemowymi
                  const issueDate = new Date(drum.data_wydania || selectedRequest.created_at);
                  const returnDeadline = drum.data_zwrotu_do_dostawcy ? new Date(drum.data_zwrotu_do_dostawcy) : null;
                  const nameUpper = (drum.nazwa || '').toUpperCase();
                  
                  // Datą referencyjną zamrażającą dni w posiadaniu jest data zgłoszenia (reported_at pozycji lub created_at zgłoszenia)
                  const itemReportedAt = (typeof drum === 'object' && drum !== null && drum.reported_at) ? drum.reported_at : selectedRequest.created_at;
                  const refDateForPossession = itemReportedAt ? new Date(itemReportedAt) : new Date();
                  
                  const daysInPossession = Math.ceil((refDateForPossession - issueDate) / (1000 * 60 * 60 * 24));
                  
                  // Nowa logika "Nasze":
                  const isOurDrum = 
                    !returnDeadline || 
                    nameUpper.startsWith('BĘBEN ELTRON') || 
                    daysInPossession > 360 ||
                    (returnDeadline && refDateForPossession > returnDeadline);
                  
                  let daysLeftToReturn = 'Brak danych';
                  if (returnDeadline) {
                    daysLeftToReturn = Math.ceil((returnDeadline - refDateForPossession) / (1000 * 60 * 60 * 24));
                  }
                  
                  // --- Nowa logika wyliczeń ---
                  // 1. Zysk klienta (%)
                  let clientReturnPercentage = 100;
                  if (daysInPossession <= 120) clientReturnPercentage = 100;
                  else if (daysInPossession <= 150) clientReturnPercentage = 90;
                  else if (daysInPossession <= 180) clientReturnPercentage = 75;
                  else if (daysInPossession <= 240) clientReturnPercentage = 50;
                  else if (daysInPossession <= 340) clientReturnPercentage = 25;
                  else clientReturnPercentage = 0;

                  // 2. Zwrot do kablowni (%)
                  const supplierName = (drum.kon_dostawca || drum.dostawca || '').toUpperCase();
                  const drumNameUpper = (drum.nazwa || '').toUpperCase();
                  
                  let supplierReturnPercentage = 100;
                  if (returnDeadline && refDateForPossession > returnDeadline) {
                    supplierReturnPercentage = 0;
                  }
                  
                  const matchingRule = supplierRules.find(r => 
                    (supplierName && supplierName.includes(r.supplier_name.toUpperCase())) || 
                    (drumNameUpper && drumNameUpper.includes(r.supplier_name.toUpperCase()))
                  );
                  
                  if (matchingRule) {
                    if (returnDeadline && refDateForPossession > returnDeadline) {
                       const daysOverdue = Math.ceil((refDateForPossession - returnDeadline) / (1000 * 60 * 60 * 24));
                       if (daysOverdue <= matchingRule.max_days_overdue) {
                         supplierReturnPercentage = matchingRule.return_percentage;
                       } else {
                         supplierReturnPercentage = 0;
                       }
                    }
                  }

                  // 3. Wartości finansowe
                  const cenaNetto = parsePriceRaw(drum.cena_netto_bebna || drum.CENA_NETTO_BEBNA || drum.cena_netto);
                  const cenaZMarza = getClientPrice(drum);
                  const wartoscKablownia = cenaNetto * (supplierReturnPercentage / 100);
                  const lostPercentage = 100 - clientReturnPercentage;
                  const spadekWartosci = cenaZMarza * (lostPercentage / 100);

                  const isNotTransported = drum.transported === false;
                  
                  const isSelectedForSplit = splitSelectedDrums.includes(label);

                  return (
                    <div 
                      key={idx} 
                      onClick={() => {
                        if (!splitMode) return;
                        setSplitSelectedDrums(prev => 
                          prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
                        );
                      }}
                      className={`p-5 rounded-xl border flex flex-col relative transition-all duration-200 ${
                        splitMode 
                          ? (isSelectedForSplit ? 'border-indigo-500 bg-indigo-50 cursor-pointer shadow-md' : 'border-gray-200 hover:border-indigo-300 cursor-pointer opacity-60')
                          : (isNotTransported ? 'bg-gray-100 border-gray-300 opacity-60 grayscale hover:grayscale-0' : damaged ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-100')
                      }`}
                    >
                      {splitMode && (
                        <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white ${
                          isSelectedForSplit ? 'border-indigo-500 text-indigo-600' : 'border-gray-300 text-transparent'
                        }`}>
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex flex-col">
                          <span className={`font-bold text-lg ${isNotTransported ? 'text-gray-500 line-through' : damaged ? 'text-red-700' : 'text-blue-700'}`}>
                            {label}
                          </span>
                          {isNotTransported && <span className="text-[10px] font-bold text-red-600 uppercase">Nie zabrano / Odrzucono</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          {damaged && <AlertTriangle className="w-5 h-5 text-red-500" title="Uszkodzony" />}
                          {canChangeStatus && !splitMode && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleDrumTransport(drum);
                                }}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                                  drum.transported === false
                                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                }`}
                                title={drum.transported === false ? "Przywróć status bębna jako odebrany w transporcie" : "Cofnij status bębna (Oznacz jako nieodebrany/pominięty)"}
                              >
                                {drum.transported === false ? 'Przywróć' : 'Cofnij'}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRemoveDrum(drum); }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Usuń ze zgłoszenia (klient będzie mógł go ponownie zgłosić)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-[11px]">
                        <div>
                          <span className="text-gray-400 font-bold uppercase block">Nazwa:</span>
                          <span className="text-gray-700 font-medium">{drum.nazwa || 'Nieznana'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-bold uppercase block">Faktura:</span>
                          <span className="text-gray-700 font-medium">{drum.numer_faktury || 'Brak danych'}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                          <div>
                            <span className="text-gray-400 font-bold uppercase block">Zgłoszono:</span>
                            <span className="text-indigo-700 font-bold">
                              {drum.reported_at ? new Date(drum.reported_at).toLocaleDateString('pl-PL') : (selectedRequest.created_at ? new Date(selectedRequest.created_at).toLocaleDateString('pl-PL') : '-')}
                              {drum.original_request_id && drum.original_request_id !== selectedRequest.id && (
                                <span className="text-[10px] text-gray-500 font-normal block">(źródłowe #{drum.original_request_id})</span>
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 font-bold uppercase block">W posiadaniu:</span>
                            <span className="text-gray-900 font-bold">{daysInPossession} dni</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-400 font-bold uppercase block">Termin Kablownia:</span>
                            <span className="text-gray-900 font-bold">
                              {returnDeadline ? returnDeadline.toLocaleDateString('pl-PL') : 'Brak'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                          <div>
                            <span className="text-gray-400 font-bold uppercase block">Zwrot do Kablowni:</span>
                            <span className={`font-bold ${supplierReturnPercentage === 100 ? 'text-emerald-600' : supplierReturnPercentage > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                              {supplierReturnPercentage}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 font-bold uppercase block">Zwrot Klienta:</span>
                            <span className={`font-bold ${clientReturnPercentage === 100 ? 'text-emerald-600' : clientReturnPercentage > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                              {clientReturnPercentage}%
                            </span>
                          </div>
                        </div>

                        <div className="pt-1 border-t border-gray-100 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-400 font-bold uppercase">Cena (z marżą):</span>
                            <span className="text-gray-700 font-medium">{cenaZMarza.toFixed(2)} PLN</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400 font-bold uppercase">Od Kablowni:</span>
                            <span className="text-emerald-700 font-bold">+{wartoscKablownia.toFixed(2)} PLN</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400 font-bold uppercase">Spadek Wartości (FUS):</span>
                            <span className="text-red-700 font-bold">-{spadekWartosci.toFixed(2)} PLN</span>
                          </div>
                        </div>

                        <div className="pt-1 border-t border-gray-100">
                          <span className="text-gray-400 font-bold uppercase block">Własność:</span>
                          {isOurDrum ? (
                            <span className="text-blue-700 font-bold">NASZ (Własny bęben)</span>
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-amber-700 font-bold uppercase">{drum.kon_dostawca || 'KABLOWNI'}</span>
                              <span className="text-gray-500">Do zwrotu za: <span className={`font-bold ${Number(daysLeftToReturn) < 7 ? 'text-red-600' : 'text-gray-900'}`}>{daysLeftToReturn} dni</span></span>
                            </div>
                          )}
                        </div>
                      </div>

                      {damaged && description && (
                        <div className="mt-3 p-2 bg-white rounded border border-red-100 text-[10px]">
                          <span className="font-bold text-red-600 uppercase block mb-1 text-[9px]">Opis uszkodzeń:</span>
                          <p className="text-gray-700 italic">"{description}"</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {Array.isArray(selectedRequest.selected_drums) && selectedRequest.selected_drums.filter(d => typeof d === 'object' && d.type === 'pallet').length > 0 && (
                <>
                  <div className="mb-4 text-gray-700 font-medium border-b pb-2 mt-4">
                    Wybrane palety
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                    {selectedRequest.selected_drums.filter(d => typeof d === 'object' && d.type === 'pallet').map((pallet, idx) => {
                      const label = getDrumLabel(pallet);
                      const isNotTransported = pallet.transported === false;
                      const isSelectedForSplit = splitSelectedDrums.includes(label);
                      const actualQuantity = pallet.transportedQuantity !== undefined ? pallet.transportedQuantity : pallet.quantity;
                      
                      return (
                        <div 
                          key={`pallet-${idx}`}
                          onClick={() => {
                            if (!splitMode) return;
                            setSplitSelectedDrums(prev => 
                              prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
                            );
                          }}
                          className={`p-5 rounded-xl border flex flex-col relative transition-all duration-200 ${
                            splitMode 
                              ? (isSelectedForSplit ? 'border-indigo-500 bg-indigo-50 cursor-pointer shadow-md' : 'border-gray-200 hover:border-indigo-300 cursor-pointer opacity-60')
                              : (isNotTransported ? 'bg-gray-100 border-gray-300 opacity-60 grayscale hover:grayscale-0' : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-100')
                          }`}
                        >
                          {splitMode && (
                            <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white ${
                              isSelectedForSplit ? 'border-indigo-500 text-indigo-600' : 'border-gray-300 text-transparent'
                            }`}>
                              <CheckCircle className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex flex-col">
                              <span className={`font-bold text-lg ${isNotTransported ? 'text-gray-500 line-through' : 'text-blue-700'}`}>
                                {formatPalletName(pallet.size)}
                              </span>
                              {isNotTransported && <span className="text-[10px] font-bold text-red-600 uppercase">Nie zabrano / Odrzucono</span>}
                            </div>
                            <div className="flex items-center gap-1">
                              {canChangeStatus && !splitMode && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleDrumTransport(pallet);
                                    }}
                                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                                      pallet.transported === false
                                        ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                        : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                    }`}
                                    title={pallet.transported === false ? "Przywróć status palety do transportu" : "Cofnij status palety (Oznacz jako nieodebraną)"}
                                  >
                                    {pallet.transported === false ? 'Przywróć' : 'Cofnij'}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleRemoveDrum(pallet); }}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Usuń ze zgłoszenia"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                              <span className="text-gray-600 font-medium">Ilość zgłoszona:</span>
                              <span className="text-xl font-bold text-blue-700">{pallet.quantity} szt.</span>
                            </div>
                            <div className="text-[11px] text-gray-500 flex justify-between items-center pt-1 border-t border-gray-100">
                              <span>Data zgłoszenia:</span>
                              <span className="font-bold text-indigo-700">
                                {pallet.reported_at ? new Date(pallet.reported_at).toLocaleDateString('pl-PL') : (selectedRequest.created_at ? new Date(selectedRequest.created_at).toLocaleDateString('pl-PL') : '-')}
                                {pallet.original_request_id && pallet.original_request_id !== selectedRequest.id && (
                                  <span className="text-gray-400 font-normal ml-1">(#{pallet.original_request_id})</span>
                                )}
                              </span>
                            </div>
                            {pallet.transportedQuantity !== undefined && (
                              <div className="flex justify-between items-center p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 mt-2">
                                <span className="text-gray-600 font-medium">Faktycznie odebrano:</span>
                                <span className="text-lg font-bold text-indigo-700">{pallet.transportedQuantity} szt.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {selectedRequest.notes && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Uwagi do odbioru</h3>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-700 whitespace-pre-line">{selectedRequest.notes}</p>
                </div>
              </div>
            )}

            {/* HISTORIA ZMIAN STATUSÓW (ARCHIWUM) */}
            {Array.isArray(selectedRequest.status_history) && selectedRequest.status_history.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-extrabold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Historia zmian statusu zgłoszenia
                </h3>
                <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-4 space-y-3">
                  {selectedRequest.status_history.map((hist, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200/60 pb-2.5 last:border-b-0 last:pb-0 text-xs gap-1">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
                        <div>
                          <span className="font-extrabold text-gray-900">{hist.status}</span>
                          {hist.note && <span className="text-gray-600 ml-2 italic">({hist.note})</span>}
                        </div>
                      </div>
                      <div className="text-left sm:text-right text-[11px] text-gray-500 pl-4 sm:pl-0">
                        <span className="font-semibold text-gray-700">{hist.updated_by || 'System'}</span>
                        <span className="ml-2 text-gray-400">
                          {hist.timestamp ? `${new Date(hist.timestamp).toLocaleDateString('pl-PL')} ${new Date(hist.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {canChangeStatus && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-6 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-indigo-600" />
                    Ręczna zmiana / Cofnięcie statusu zgłoszenia (Administrator)
                  </span>
                  <span className="text-xs text-slate-600">
                    Obecny status: <strong className="text-slate-900">{selectedRequest.status}</strong>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { code: 'Pending', label: '🟡 Oczekujące', bg: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100' },
                    { code: 'Approved', label: '🔵 Zaakceptowane (Do transportu)', bg: 'bg-sky-50 text-sky-900 border-sky-300 hover:bg-sky-100' },
                    { code: 'InTransit', label: '🟣 W transporcie', bg: 'bg-indigo-50 text-indigo-900 border-indigo-300 hover:bg-indigo-100' },
                    { code: 'Completed', label: '🟢 Zakończony', bg: 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100' },
                    { code: 'Rejected', label: '🔴 Odrzucony', bg: 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100' }
                  ].map(st => (
                    <button
                      key={st.code}
                      onClick={() => {
                        if (st.code === selectedRequest.status) return;
                        const confirmChange = window.confirm(`Czy na pewno chcesz ręcznie zmienić status zgłoszenia na "${st.label}"?`);
                        if (confirmChange) {
                          handleStatusChange(selectedRequest.id, st.code);
                        }
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                        st.code === selectedRequest.status 
                          ? 'ring-2 ring-blue-600 bg-white text-blue-900 font-extrabold shadow-sm scale-[1.02]' 
                          : st.bg
                      }`}
                    >
                      {st.code === selectedRequest.status ? '✓ ' : ''}{st.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {canChangeStatus && (
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                {selectedRequest.status === 'Pending' && (
                  <>
                    <button
                      onClick={() => {
                        handleStatusChange(selectedRequest.id, 'Approved');
                        handleCloseModal();
                      }}
                      className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span>Zatwierdź zgłoszenie</span>
                    </button>
                    <button
                      onClick={() => {
                        handleStatusChange(selectedRequest.id, 'Rejected');
                        handleCloseModal();
                      }}
                      className="bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      <span>Odrzuć</span>
                    </button>
                  </>
                )}

                {(selectedRequest.status === 'Approved' || (selectedRequest.status === 'InTransit' && selectedRequest.selected_drums?.some(d => typeof d === 'object' && d.transported === false))) && (
                  <button
                    onClick={() => {
                      setRequestForTransport(selectedRequest);
                      setShowTransportModal(true);
                    }}
                    className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Truck className="w-5 h-5" />
                    <span>{selectedRequest.status === 'InTransit' ? 'Zleć kolejny transport' : 'Rozpocznij transport'}</span>
                  </button>
                )}

                {selectedRequest.status === 'InTransit' && (
                  <button
                    onClick={() => {
                      handleStatusChange(selectedRequest.id, 'Completed');
                      handleCloseModal();
                    }}
                    className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Zakończ transport</span>
                  </button>
                )}

                {canChangeStatus && (
                  <button
                    onClick={() => {
                      handleAddCorrectionNumber(selectedRequest.id);
                    }}
                    className="flex-1 bg-indigo-50 text-indigo-700 py-3 px-4 rounded-xl font-bold hover:bg-indigo-100 border border-indigo-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit className="w-5 h-5" />
                    <span>{selectedRequest.correction_number ? 'Edytuj numer korekty' : 'Dodaj numer korekty'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const stats = getStatistics();

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Zgłoszenia zwrotów
                </h1>
                <p className="text-gray-600">Zarządzaj wszystkimi zgłoszeniami zwrotu bębnów</p>
              </div>
            </div>

            <div className="flex space-x-2">
              {canChangeStatus && (
                <button
                  onClick={() => {
                    setMergeMode(!mergeMode);
                    if (mergeMode) setSelectedMergeIds([]);
                  }}
                  className={`px-4 py-2 rounded-xl font-semibold flex items-center space-x-2 transition-all duration-200 shadow-sm ${
                    mergeMode
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 ring-2 ring-indigo-400'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  <GitMerge className="w-4 h-4" />
                  <span>{mergeMode ? 'Anuluj łączenie' : 'Łączenie zgłoszeń'}</span>
                </button>
              )}
              <button
                onClick={() => navigate('/return')}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 flex items-center space-x-2 shadow-sm font-semibold"
              >
                <Truck className="w-4 h-4" />
                <span>Nowe zgłoszenie</span>
              </button>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Odśwież</span>
              </button>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-5 shadow-lg border border-blue-100 mb-6 space-y-4">
            {/* Wiersz 1: Wyszukiwarka + Checkbox Pilne */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
              <div className="relative flex-grow">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Szukaj po nazwie firmy, NIP, mieście lub numerze ZO..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-sm"
                />
              </div>

              <label className="flex items-center space-x-2.5 px-4 py-2.5 bg-red-50/70 hover:bg-red-50 border border-red-200/80 rounded-xl cursor-pointer transition-all shrink-0 select-none">
                <input
                  type="checkbox"
                  checked={filterPriority === 'High'}
                  onChange={(e) => setFilterPriority(e.target.checked ? 'High' : 'all')}
                  className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                  🔥 Tylko pilne
                </span>
              </label>
            </div>

            {/* Wiersz 2: Filtry rozwijane (Status, Metoda odbioru) + Sortowanie */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gray-100">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0 w-16">Status:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-sm font-medium"
                >
                  <option value="all">Wszystkie statusy</option>
                  <option value="Pending">Oczekujące</option>
                  <option value="Approved">Przekazane do transportu</option>
                  <option value="InTransit">W trakcie transportu</option>
                  <option value="Completed">Zakończone</option>
                  <option value="Rejected">Odrzucone</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0 w-16">Odbiór:</span>
                <select
                  value={filterPickupType}
                  onChange={(e) => setFilterPickupType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-sm font-medium"
                >
                  <option value="all">Wszystkie metody odbioru</option>
                  <option value="spedycja">Spedycja</option>
                  <option value="magazyn_bialystok">Magazyn Białystok</option>
                  <option value="magazyn_zielonka">Magazyn Zielonka</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0 w-16">Sortuj:</span>
                <div className="flex space-x-2 flex-grow">
                  <button
                    onClick={() => handleSort('created_at')}
                    className={`flex-1 px-3 py-2 rounded-xl border transition-all duration-200 flex items-center justify-center space-x-1 text-xs font-bold ${
                      sortBy === 'created_at'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'
                    }`}
                  >
                    <span>Data zgł.</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleSort('collection_date')}
                    className={`flex-1 px-3 py-2 rounded-xl border transition-all duration-200 flex items-center justify-center space-x-1 text-xs font-bold ${
                      sortBy === 'collection_date'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'
                    }`}
                  >
                    <span>Termin odbioru</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-blue-50 text-center">
              <div className="text-3xl font-black text-blue-600 mb-1">{stats.total}</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Wszystkie</div>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-amber-50 text-center">
              <div className="text-3xl font-black text-amber-600 mb-1">{stats.pending}</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Oczekujące</div>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-sky-50 text-center">
              <div className="text-3xl font-black text-sky-600 mb-1">{stats.approved}</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Transport</div>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-indigo-50 text-center">
              <div className="text-3xl font-black text-indigo-600 mb-1">{stats.inTransit}</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">W trasie</div>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-emerald-50 text-center">
              <div className="text-3xl font-black text-emerald-600 mb-1">{stats.completed}</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Zakończone</div>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-lg border border-rose-50 text-center">
              <div className="text-3xl font-black text-rose-600 mb-1">{stats.urgent}</div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Pilne</div>
            </div>
          </div>
        </div>

        {filteredAndSortedRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
            {filteredAndSortedRequests.map((request) => (
              <React.Fragment key={request.id}>
                {renderRequestCard(request)}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Truck className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nie znaleziono zgłoszeń</h3>
            <p className="text-gray-600">Spróbuj zmienić kryteria wyszukiwania lub filtry</p>
          </div>
        )}

        {/* Pływający pasek wyboru zgłoszeń w trybie łączenia */}
        {(selectedMergeIds.length > 0 || mergeMode) && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-6 animate-bounce-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">
                {selectedMergeIds.length}
              </div>
              <span className="font-semibold text-sm">
                {selectedMergeIds.length === 1 ? 'Wybrano 1 zgłoszenie' : `Wybrano ${selectedMergeIds.length} zgłoszeń do połączenia`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedMergeIds([]);
                  setMergeMode(false);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              >
                Anuluj
              </button>

              <button
                type="button"
                onClick={() => {
                  if (filteredAndSortedRequests.length === selectedMergeIds.length) {
                    setSelectedMergeIds([]);
                  } else {
                    setSelectedMergeIds(filteredAndSortedRequests.map(r => r.id));
                  }
                }}
                className="px-3 py-2 text-xs font-semibold text-indigo-300 hover:text-indigo-200"
              >
                {filteredAndSortedRequests.length === selectedMergeIds.length ? 'Odznacz wszystkie' : 'Zaznacz widoczne'}
              </button>

              <button
                type="button"
                onClick={() => setShowMergeModal(true)}
                disabled={selectedMergeIds.length < 2}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <GitMerge className="w-4 h-4" />
                <span>Połącz zgłoszenia ({selectedMergeIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {renderRequestDetailsModal()}

        <MergeRequestsModal
          showMergeModal={showMergeModal}
          setShowMergeModal={setShowMergeModal}
          selectedMergeIds={selectedMergeIds}
          setSelectedMergeIds={setSelectedMergeIds}
          setMergeMode={setMergeMode}
          requests={requests}
          handleRefresh={handleRefresh}
          returnsAPI={returnsAPI}
        />

        <TransportOrderModal
          isOpen={showTransportModal}
          onClose={() => {
            setShowTransportModal(false);
            setRequestForTransport(null);
          }}
          onConfirm={handleTransportConfirm}
          request={requestForTransport}
          user={user}
        />
      </div>
    </div>
  );
};

export default AdminReturnRequests;
