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
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-slate-400 font-medium animate-pulse">Wyszukiwanie profili firmy...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white px-4 relative overflow-hidden select-none">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-900/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-5xl z-10 text-center animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tight">Kto korzysta z systemu?</h1>
        <p className="text-slate-400 font-medium mb-12 max-w-md mx-auto text-sm md:text-base">
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
              <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 transform group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(37,99,235,0.4)] border border-slate-800 group-hover:border-blue-500">
                <div className={`w-full h-full bg-gradient-to-br ${getProfileGradient(idx)} flex items-center justify-center font-black text-3xl md:text-4xl text-white tracking-widest`}>
                  {getInitials(profile.name)}
                </div>

                {/* Overlay in manage mode */}
                {isManageMode && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px] transition-all duration-200">
                    <button
                      onClick={(e) => handleDeleteProfile(profile.id, profile.name, e)}
                      className="p-3 bg-red-600/90 text-white rounded-full hover:bg-red-700 hover:scale-110 transition-all duration-200 shadow-lg"
                      title="Usuń profil"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Profile Name */}
              <span className="mt-4 font-semibold text-slate-300 group-hover:text-white transition-colors duration-200 text-sm md:text-base max-w-[120px] truncate text-center block">
                {profile.name}
              </span>
            </div>
          ))}

          {/* Add Profile Card */}
          <div
            onClick={() => setShowAddModal(true)}
            className="group flex flex-col items-center cursor-pointer"
          >
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl border-2 border-dashed border-slate-700 group-hover:border-slate-400 flex items-center justify-center transition-all duration-300 bg-slate-900/40 group-hover:bg-slate-900/80 transform group-hover:scale-105">
              <UserPlus className="w-8 h-8 text-slate-500 group-hover:text-slate-300 transition-colors duration-200" />
            </div>
            <span className="mt-4 font-bold text-slate-500 group-hover:text-slate-300 transition-colors duration-200 text-sm md:text-base">
              Dodaj profil
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => setIsManageMode(!isManageMode)}
            className={`px-8 py-3 rounded-xl font-bold border transition-all duration-200 flex items-center space-x-2 text-sm shadow-md ${
              isManageMode
                ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                : 'bg-transparent border-slate-700 text-slate-400 hover:text-white hover:border-slate-400'
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
            className="px-8 py-3 bg-transparent border border-red-950/40 text-red-500/80 hover:text-red-400 hover:bg-red-950/20 rounded-xl font-bold transition-all duration-200 flex items-center space-x-2 text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Wyloguj firmę</span>
          </button>
        </div>
      </div>

      {/* Exquisite Glassmorphic Add Profile Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => { setShowAddModal(false); setFormError(''); }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-black tracking-tight mb-2 text-left">Dodaj nowy profil</h2>
            <p className="text-slate-400 text-xs mb-6 text-left leading-relaxed">
              Utwórz unikalny profil pracownika, aby móc realizować zwroty bębnów.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-900/50 rounded-xl flex items-center space-x-2 text-red-400 text-xs font-semibold">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddProfile} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Imię i nazwisko</label>
                <input
                  type="text"
                  placeholder="np. Jan Kowalski"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all duration-200 text-white placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Adres e-mail</label>
                <input
                  type="email"
                  placeholder="np. j.kowalski@firma.pl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all duration-200 text-white placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Numer telefonu</label>
                <input
                  type="tel"
                  placeholder="np. 500600700"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all duration-200 text-white placeholder-slate-600"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setFormError(''); }}
                  className="flex-1 py-3 bg-slate-950 border border-slate-850 hover:bg-slate-900 rounded-xl text-slate-300 font-bold transition-all duration-200 text-sm"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl text-white font-bold transition-all duration-200 text-sm shadow-lg disabled:opacity-50"
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
