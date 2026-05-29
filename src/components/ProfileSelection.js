import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, LogOut, Settings, Check, X, ShieldAlert } from 'lucide-react';
import { profilesAPI } from '../utils/supabaseApi';

const ProfileSelection = ({ user, onSelectProfile, onLogout }) => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isManageMode, setIsManageMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const data = await profilesAPI.getProfiles(user.nip);
      setProfiles(data);
    } catch (error) {
      console.error('Błąd pobierania profili:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [user.nip]);

  // Generuje inicjały z Imienia i Nazwiska
  const getInitials = (fullName) => {
    if (!fullName) return 'U';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  // Zestaw 6 ekskluzywnych gradientów HSL dla awatarów profilowych
  const gradients = [
    'from-blue-600 to-indigo-700',
    'from-purple-600 to-pink-700',
    'from-emerald-500 to-teal-700',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-red-700',
    'from-violet-600 to-indigo-800'
  ];

  const getProfileGradient = (index) => {
    return gradients[index % gradients.length];
  };

  const handleAddProfile = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!name.trim()) {
      setFormError('Imię i nazwisko jest wymagane');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('Podaj poprawny adres e-mail');
      return;
    }
    if (!phone.trim() || phone.length < 9) {
      setFormError('Podaj poprawny numer telefonu (minimum 9 znaków)');
      return;
    }

    setIsSubmitting(true);
    try {
      const newProfile = await profilesAPI.createProfile({
        company_nip: user.nip,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim()
      });

      setProfiles([...profiles, newProfile]);
      setShowAddModal(false);
      
      // Reset formularza
      setName('');
      setEmail('');
      setPhone('');
    } catch (error) {
      console.error('Błąd podczas dodawania profilu:', error);
      setFormError('Nie udało się utworzyć profilu. Spróbuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProfile = async (id, name, e) => {
    e.stopPropagation(); // Blokuj wybór profilu
    if (window.confirm(`Czy na pewno chcesz usunąć profil pracownika: ${name}?`)) {
      try {
        await profilesAPI.deleteProfile(id);
        setProfiles(profiles.filter(p => p.id !== id));
      } catch (error) {
        console.error('Błąd podczas usuwania profilu:', error);
        alert('Nie udało się usunąć profilu.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 text-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500 font-semibold animate-pulse">Wyszukiwanie profili firmy...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 text-gray-900 px-4 relative overflow-hidden select-none w-full">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-blue-300/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-200/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-5xl z-10 text-center animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tight bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
          Kto korzysta z systemu?
        </h1>
        <p className="text-gray-650 font-medium mb-12 max-w-md mx-auto text-sm md:text-base leading-relaxed">
          Wybierz swój profil pracownika lub stwórz nowy, aby spersonalizować swoje zgłoszenia zwrotów.
        </p>

        {/* Profile Grid */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-10 mb-16">
          {profiles.map((profile, idx) => (
            <div
              key={profile.id}
              onClick={() => !isManageMode && onSelectProfile(profile)}
              className={`group flex flex-col items-center cursor-pointer relative ${isManageMode ? 'cursor-default' : ''}`}
            >
              {/* Profile Card / Avatar */}
              <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-3xl overflow-hidden shadow-xl transition-all duration-300 transform group-hover:scale-105 group-hover:shadow-[0_15px_30px_rgba(37,99,235,0.25)] border border-blue-100 group-hover:border-blue-500 bg-white">
                <div className={`w-full h-full bg-gradient-to-br ${getProfileGradient(idx)} flex items-center justify-center font-black text-3xl md:text-4xl text-white tracking-widest shadow-inner`}>
                  {getInitials(profile.name)}
                </div>

                {/* Overlay in manage mode */}
                {isManageMode && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[1px] transition-all duration-200">
                    <button
                      onClick={(e) => handleDeleteProfile(profile.id, profile.name, e)}
                      className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700 hover:scale-110 transition-all duration-200 shadow-lg border border-red-500"
                      title="Usuń profil"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Profile Name */}
              <span className="mt-4 font-bold text-gray-700 group-hover:text-blue-600 transition-colors duration-200 text-sm md:text-base max-w-[120px] truncate text-center block">
                {profile.name}
              </span>
            </div>
          ))}

          {/* Add Profile Card */}
          <div
            onClick={() => setShowAddModal(true)}
            className="group flex flex-col items-center cursor-pointer"
          >
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-3xl border-2 border-dashed border-gray-300 group-hover:border-blue-500 flex items-center justify-center transition-all duration-300 bg-white/60 group-hover:bg-white transform group-hover:scale-105 shadow-sm group-hover:shadow-md">
              <UserPlus className="w-8 h-8 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" />
            </div>
            <span className="mt-4 font-bold text-gray-400 group-hover:text-blue-500 transition-colors duration-200 text-sm md:text-base">
              Dodaj profil
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => setIsManageMode(!isManageMode)}
            className={`px-8 py-3 rounded-xl font-bold border transition-all duration-200 flex items-center space-x-2 text-sm shadow-sm ${
              isManageMode
                ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                : 'bg-white border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            {isManageMode ? (
              <>
                <Check className="w-4 h-4" />
                <span>Gotowe</span>
              </>
            ) : (
              <>
                <Settings className="w-4 h-4" />
                <span>Zarządzaj profilami</span>
              </>
            )}
          </button>

          <button
            onClick={onLogout}
            className="px-8 py-3 bg-white border border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl font-bold transition-all duration-200 flex items-center space-x-2 text-sm shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Wyloguj firmę</span>
          </button>
        </div>
      </div>

      {/* Exquisite Light Glassmorphic Add Profile Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white/95 border border-blue-100 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => { setShowAddModal(false); setFormError(''); }}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-black tracking-tight mb-1 text-left text-gray-900">Dodaj nowy profil</h2>
            <p className="text-gray-500 text-xs mb-6 text-left leading-relaxed font-semibold">
              Utwórz unikalny profil pracownika, aby móc realizować zwroty bębnów.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-red-600 text-xs font-bold shadow-sm">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddProfile} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-2">Imię i nazwisko</label>
                <input
                  type="text"
                  placeholder="np. Jan Kowalski"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-2">Adres e-mail</label>
                <input
                  type="email"
                  placeholder="np. j.kowalski@firma.pl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-2">Numer telefonu</label>
                <input
                  type="tel"
                  placeholder="np. 500600700"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setFormError(''); }}
                  className="flex-1 py-3 bg-white border border-gray-300 hover:bg-gray-55 rounded-xl text-gray-700 font-bold transition-all duration-200 text-sm shadow-sm"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl text-white font-bold transition-all duration-200 text-sm shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Zapisywanie...' : 'Zapisz profil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSelection;
