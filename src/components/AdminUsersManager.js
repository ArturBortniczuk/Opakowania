import React, { useState, useEffect } from 'react';
import { Users, Search, UserPlus, Edit2, Trash2, Shield, Check, X, Building2, User, Phone, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ROLES = [
  { value: 'client', label: 'Klient' },
  { value: 'Specjalista', label: 'Specjalista' },
  { value: 'Wsparcie', label: 'Wsparcie' },
  { value: 'Magazyn', label: 'Magazyn' },
  { value: 'Kierownik', label: 'Kierownik' },
  { value: 'Dyrektor', label: 'Dyrektor' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'admin', label: 'Administrator' }
];

const STATUSES = [
  { value: 'approved', label: 'Zatwierdzony', color: 'text-green-700 bg-green-100' },
  { value: 'pending', label: 'Oczekujący', color: 'text-yellow-700 bg-yellow-100' },
  { value: 'rejected', label: 'Odrzucony', color: 'text-red-700 bg-red-100' }
];

const AdminUsersManager = ({ user: currentUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modal Dodawania
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    email: '', password: '', name: '', role: 'client', nip: '', phone: '', companyName: ''
  });

  // Modal Edycji
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error(err);
      setError('Błąd ładowania użytkowników.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/adminCreateUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(addForm)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert('Użytkownik został pomyślnie utworzony!');
      setShowAddModal(false);
      setAddForm({ email: '', password: '', name: '', role: 'client', nip: '', phone: '', companyName: '' });
      fetchUsers();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editForm.name,
          role: editForm.role,
          status: editForm.status,
          nip: editForm.nip,
          company_name: editForm.companyName,
          phone: editForm.phone
        })
        .eq('id', editForm.id);

      if (error) throw error;
      
      alert('Zapisano zmiany!');
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      alert('Błąd podczas zapisywania zmian: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (userId, userName) => {
    if (userId === currentUser.id) {
      alert('Nie możesz usunąć samego siebie!');
      return;
    }
    
    if (currentUser.role !== 'admin') {
      alert('Tylko Główny Administrator może usuwać konta.');
      return;
    }

    if (window.confirm(`Czy na pewno chcesz TRWALE usunąć konto użytkownika ${userName}? Tej operacji nie można cofnąć!`)) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        const res = await fetch('/api/adminDeleteUser', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ userId })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        alert('Konto usunięte.');
        fetchUsers();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.nip || '').includes(searchTerm);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="w-8 h-8 text-blue-600 mr-3" />
            Zarządzanie Użytkownikami
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Zarządzaj dostępami, rolami i profilami pracowników oraz klientów.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Dodaj użytkownika
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Szukaj po nazwisku, emailu lub NIP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-xl border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">Wszystkie role</option>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Użytkownik</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rola</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firma / NIP</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Akcje</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500"><div className="animate-pulse">Ładowanie użytkowników...</div></td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">Nie znaleziono użytkowników spełniających kryteria.</td></tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleDef = ROLES.find(r => r.value === u.role) || { label: u.role };
                  const statusDef = STATUSES.find(s => s.value === u.status) || STATUSES[1];
                  const isStaff = ['admin', 'supervisor', 'dyrektor', 'kierownik', 'wsparcie', 'magazyn', 'specjalista'].includes(u.role?.toLowerCase());
                  
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white font-bold ${isStaff ? 'bg-blue-600' : 'bg-gray-400'}`}>
                            {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{u.name}</div>
                            <div className="text-sm text-gray-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isStaff ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          {roleDef.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{u.company_name || '-'}</div>
                        <div className="text-sm text-gray-500">{u.nip || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDef.color}`}>
                          {statusDef.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-3">
                          <button
                            onClick={() => {
                              setEditForm({ ...u, companyName: u.company_name || '' });
                              setShowEditModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edytuj"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          {currentUser.role === 'admin' && u.id !== currentUser.id && (
                            <button
                              onClick={() => handleDelete(u.id, u.name)}
                              className="text-red-600 hover:text-red-900"
                              title="Usuń"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dodawania */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900">Dodaj nowego użytkownika</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" required value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} className="w-full rounded-xl border-gray-300 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hasło startowe *</label>
                  <input type="text" required value={addForm.password} onChange={e => setAddForm({...addForm, password: e.target.value})} placeholder="Min. 6 znaków" className="w-full rounded-xl border-gray-300 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Imię i Nazwisko *</label>
                  <input type="text" required value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} className="w-full rounded-xl border-gray-300 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rola *</label>
                  <select value={addForm.role} onChange={e => setAddForm({...addForm, role: e.target.value})} className="w-full rounded-xl border-gray-300 focus:ring-blue-500 focus:border-blue-500">
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input type="text" value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} className="w-full rounded-xl border-gray-300 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                {addForm.role === 'client' && (
                  <>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">NIP Firmy</label>
                      <input type="text" value={addForm.nip} onChange={e => setAddForm({...addForm, nip: e.target.value})} className="w-full rounded-xl border-gray-300 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa Firmy</label>
                      <input type="text" value={addForm.companyName} onChange={e => setAddForm({...addForm, companyName: e.target.value})} className="w-full rounded-xl border-gray-300 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                  </>
                )}
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  Anuluj
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                  {isSubmitting ? 'Tworzenie...' : 'Utwórz konto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edycji */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900">Edycja użytkownika</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="mb-4 bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                Edytujesz: <strong>{editForm.email}</strong>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Imię i Nazwisko</label>
                  <input type="text" required value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full rounded-xl border-gray-300 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rola</label>
                  <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} className="w-full rounded-xl border-gray-300 focus:ring-blue-500 focus:border-blue-500" disabled={editForm.role === 'admin' && currentUser.role !== 'admin'}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="w-full rounded-xl border-gray-300 focus:ring-blue-500 focus:border-blue-500">
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input type="text" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full rounded-xl border-gray-300 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">NIP Firmy</label>
                  <input type="text" value={editForm.nip || ''} onChange={e => setEditForm({...editForm, nip: e.target.value})} className="w-full rounded-xl border-gray-300 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa Firmy</label>
                  <input type="text" value={editForm.companyName || ''} onChange={e => setEditForm({...editForm, companyName: e.target.value})} className="w-full rounded-xl border-gray-300 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                  Anuluj
                </button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                  {isSubmitting ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersManager;
