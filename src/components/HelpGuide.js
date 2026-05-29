import React, { useState } from 'react';
import { 
  BookOpen, BarChart3, Package, Truck, FileText, User, HelpCircle, DollarSign, ChevronDown
} from 'lucide-react';

const HelpGuide = () => {
  const [activeSection, setActiveSection] = useState('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const guideSections = [
    {
      id: 'dashboard',
      title: '📊 Panel główny i zasady kaucji',
      icon: BarChart3,
      description: 'Zrozumienie statystyk oraz amortyzacji finansowej kaucji.',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 leading-relaxed font-medium">
            Panel główny to centrum informacyjne Twojego konta. Znajdziesz tu szybkie podsumowanie stanu posiadanych bębnów oraz szacunki finansowe dotyczące kaucji.
          </p>
          
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 p-5 rounded-2xl border border-indigo-100 my-4 animate-fade-in">
            <h4 className="font-bold text-indigo-900 text-sm mb-3 flex items-center">
              <DollarSign className="w-4 h-4 mr-1.5 text-indigo-600" />
              Podsumowanie finansowe kaucji (Zasady Amortyzacji)
            </h4>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed font-medium">
              Kaucja za bębny ulega amortyzacji w zależności od liczby dni, przez które bęben przebywa na Twoim stanie (licząc od daty wydania). Aby otrzymać pełny zwrot kaucji, należy zwrócić bęben przed upływem standardowych 120 dni.
            </p>
            <div className="overflow-x-auto rounded-xl border border-indigo-100 bg-white">
              <table className="min-w-full divide-y divide-indigo-100 text-xs">
                <thead className="bg-indigo-50/65 font-bold text-indigo-900">
                  <tr>
                    <th className="px-4 py-2 text-left">Wiek bębna (dni)</th>
                    <th className="px-4 py-2 text-center">Wartość zwrotu kaucji</th>
                    <th className="px-4 py-2 text-left">Opis statusu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-100 font-medium text-gray-700">
                  <tr className="bg-emerald-50/30">
                    <td className="px-4 py-2 text-emerald-800 font-bold">do 120 dni</td>
                    <td className="px-4 py-2 text-center text-emerald-800 font-bold">100%</td>
                    <td className="px-4 py-2 text-emerald-700">Pełny zwrot kaucji (Bezpieczny termin)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">121 – 150 dni</td>
                    <td className="px-4 py-2 text-center">90%</td>
                    <td className="px-4 py-2 text-gray-600">Amortyzacja 10% wartości kaucji</td>
                  </tr>
                  <tr className="bg-amber-50/20">
                    <td className="px-4 py-2">151 – 180 dni</td>
                    <td className="px-4 py-2 text-center">75%</td>
                    <td className="px-4 py-2 text-gray-600">Amortyzacja 25% wartości kaucji</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">181 – 240 dni</td>
                    <td className="px-4 py-2 text-center">50%</td>
                    <td className="px-4 py-2 text-gray-600">Amortyzacja 50% wartości kaucji</td>
                  </tr>
                  <tr className="bg-red-50/10">
                    <td className="px-4 py-2 text-red-700">241 – 340 dni</td>
                    <td className="px-4 py-2 text-center text-red-700">25%</td>
                    <td className="px-4 py-2 text-red-650">Ostatnia szansa na zwrot części kaucji</td>
                  </tr>
                  <tr className="bg-red-100/25">
                    <td className="px-4 py-2 text-red-800 font-bold">powyżej 340 dni</td>
                    <td className="px-4 py-2 text-center text-red-800 font-bold">0%</td>
                    <td className="px-4 py-2 text-red-700 font-semibold">Zwrot niemożliwy (Brak możliwości zwrotu po tym terminie)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
            <div className="p-4 bg-white rounded-xl border border-gray-200">
              <span className="text-gray-900 font-bold block mb-1">Przegląd Stanu (Statusy)</span>
              <ul className="space-y-1.5 text-gray-600 list-disc pl-4 font-medium">
                <li><strong className="text-emerald-700">Aktywne</strong>: Bębny w bezpiecznym terminie posiadania (powyżej 14 dni do limitu).</li>
                <li><strong className="text-amber-600">Termin do 14 dni</strong>: Bębny, których termin zwrotu minie w ciągu 14 dni (wymagają uwagi).</li>
                <li><strong className="text-red-650">Przeterminowane</strong>: Bębny po terminie 120 dni (podlegające amortyzacji).</li>
                <li><strong className="text-orange-600">Zgłoszone zwroty</strong>: Bębny w procesie odbioru.</li>
              </ul>
            </div>
            
            <div className="p-4 bg-white rounded-xl border border-gray-200 flex flex-col justify-between">
              <div>
                <span className="text-gray-900 font-bold block mb-1">Najbliższe terminy zwrotu</span>
                <p className="text-gray-600 font-medium leading-relaxed">
                  To skrócona lista maksymalnie 6 bębnów, dla których termin zwrotu (np. 120 dni lub inny wyznaczony termin) upływa najwcześniej. Pozwala to na sprawną kontrolę najpilniejszych wydań bezpośrednio po wejściu do systemu.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'drums',
      title: '📦 Stan posiadania bębnów',
      icon: Package,
      description: 'Zarządzanie stanem posiadania i wyszukiwanie bębnów.',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 leading-relaxed font-medium">
            Zakładka <strong className="text-blue-700">„Stan posiadania bębnów”</strong> to kompletna lista bębnów przypisanych do Twojej firmy. Służy do monitorowania ich lokalizacji, faktur, wartości oraz terminów.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-blue-700 font-bold block mb-1.5">Wyszukiwanie i Filtry</span>
              <p className="text-gray-600 font-medium leading-relaxed">
                Możesz błyskawicznie przeszukiwać bębny, wpisując ich numer (cechę), rozmiar, adres dostawy, a także numer faktury zakupowej. Wygodne filtry statusu i sortowania ułatwiają analizę.
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-emerald-700 font-bold block mb-1.5">Szybkie przejście do zgłoszenia zwrotu</span>
              <p className="text-gray-605 font-medium leading-relaxed">
                W prawym górnym rogu ekranu, tuż obok przycisku „Odśwież”, znajduje się główny przycisk <strong className="text-emerald-700">„Zgłoś zwrot”</strong>, który przenosi bezpośrednio do zgłoszenia zwrotu.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'return',
      title: '🚚 Zgłaszanie nowego zwrotu',
      icon: Truck,
      description: 'Przewodnik po 4-krokowym formularzu zgłaszania zwrotu.',
      content: (
        <div className="space-y-4">
          <p className="text-gray-705 leading-relaxed font-medium">
            Zgłaszanie zwrotu odbywa się za pomocą wygodnego formularza podzielonego na 4 intuicyjne etapy:
          </p>

          <div className="space-y-3 pl-2">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
              <div>
                <strong className="text-gray-900 text-sm block">Krok 1: Adres odbioru</strong>
                <p className="text-xs text-gray-600 font-medium mt-0.5">Podaj dokładny adres (Ulica, Kod pocztowy, Miasto), pod który ma przyjechać kierowca po odbiór opakowań.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 border-t border-gray-100 pt-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
              <div>
                <strong className="text-gray-900 text-sm block">Krok 2: Szczegóły transportu</strong>
                <div className="text-xs text-gray-600 font-medium mt-0.5">
                  Określ dogodne warunki odbioru:
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li><strong>Sugerowana data zwrotu</strong>: Zakres dat, w których kierowca może odebrać bębny (prosimy o podanie przedziału co najmniej 14-dniowego, co ułatwi nam zaplanowanie optymalnej trasy).</li>
                    <li><strong>Godziny załadunku</strong> (np. 8:00 - 15:00) oraz <strong>dostępny sprzęt</strong> (np. wózek widłowy, rampa).</li>
                    <li>Telefon kontaktowy (domyślnie pobierany z Twojego aktywnego profilu).</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3 border-t border-gray-100 pt-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</div>
              <div>
                <strong className="text-gray-900 text-sm block">Krok 3: Wybór bębnów i stany uszkodzeń</strong>
                <p className="text-xs text-gray-600 font-medium mt-0.5">
                  Wybierz z listy te bębny, które fizycznie stoją przygotowane do załadunku. 
                  <br />
                  <span className="text-red-600 font-bold block mt-1">⚠️ Uszkodzenia:</span> 
                  Jeśli bęben jest uszkodzony (np. odłamany fragment tarczy, pęknięcie), zaznacz pole wyboru <strong className="text-red-600">„Bęben jest uszkodzony”</strong> i opisz problem. Pozwoli to na odpowiednie przygotowanie transportu.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 border-t border-gray-100 pt-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">4</div>
              <div>
                <strong className="text-gray-900 text-sm block">Krok 4: Potwierdzenie</strong>
                <p className="text-xs text-gray-600 font-medium mt-0.5">Sprawdź podsumowanie wprowadzonych danych, zatwierdź wymagane oświadczenia o opróżnieniu i stanie bębnów, a następnie kliknij <strong className="text-blue-600">„Wyślij zgłoszenie”</strong>.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'my-returns',
      title: '📁 Historia i statusy zgłoszeń',
      icon: FileText,
      description: 'Śledzenie etapów weryfikacji i statusów zgłoszeń zwrotu.',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 leading-relaxed font-medium">
            Każde wysłane zgłoszenie trafia do specjalisty ds. opakowań Grupy Eltron i przechodzi przez kilka kolejnych statusów, które możesz na bieżąco monitorować:
          </p>

          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <div className="flex-1">
                <strong className="text-amber-800 block font-bold">Oczekuje</strong>
                <span className="text-gray-605 font-medium block mt-0.5">Zgłoszenie zostało wysłane i oczekuje na zatwierdzenie przez specjalistę ds. opakowań.</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-sky-50 rounded-xl border border-sky-100 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
              <div className="flex-1">
                <strong className="text-sky-800 block font-bold">Zatwierdzony transport</strong>
                <span className="text-gray-605 font-medium block mt-0.5">Został wyznaczony termin odbioru opakowań oraz przypisany kierowca.</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
              <div className="flex-1">
                <strong className="text-indigo-800 block font-bold">W trakcie transportu</strong>
                <span className="text-gray-605 font-medium block mt-0.5">Kierowca wyruszył w trasę w celu fizycznego załadunku i odbioru bębnów z Twojego placu.</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <div className="flex-1">
                <strong className="text-emerald-800 block font-bold">Zakończony</strong>
                <span className="text-gray-605 font-medium block mt-0.5">Bębny zostały odebrane, zweryfikowano ich stan i wystawiono faktury korygujące za kaucję (zobaczysz wpisany numer korekty).</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'profiles',
      title: '👥 Profile pracowników',
      icon: User,
      description: 'Zarządzanie tożsamościami i autouzupełnianie zgłoszeń.',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 leading-relaxed font-medium">
            Dla ułatwienia pracy w ramach jednej firmy, system oferuje <strong className="text-blue-700">Profile Pracowników</strong>:
          </p>

          <div className="p-4 bg-white rounded-xl border border-gray-200 text-xs font-semibold space-y-3">
            <div>
              <span className="text-blue-850 font-bold block mb-0.5">Personalizacja sesji</span>
              <p className="text-gray-600 font-medium leading-relaxed">
                Logując się NIP-em firmy, system zapyta o wybór osoby korzystającej z systemu. Wybranie Twojego profilu sprawia, że dashboard powita Cię Twoim imieniem i nazwiskiem, a każde wysłane zgłoszenie będzie podpisane Twoimi danymi (co ułatwia weryfikację).
              </p>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <span className="text-blue-850 font-bold block mb-0.5">Dodawanie i Usuwanie profili</span>
              <p className="text-gray-600 font-medium leading-relaxed">
                Możesz łatwo dodać nowy profil pracownika, podając imię, nazwisko, e-mail i telefon. W trybie zarządzania profilami możesz również usunąć profil, który nie jest już potrzebny w firmie.
              </p>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <span className="text-blue-850 font-bold block mb-0.5">Szybkie przełączanie</span>
              <p className="text-gray-600 font-medium leading-relaxed">
                Jeśli chcesz zmienić osobę korzystającą z systemu na tym samym urządzeniu, kliknij przycisk <strong className="text-blue-700">„Zmień profil”</strong> w dolnej części menu bocznego. System płynnie wróci do ekranu wyboru bez konieczności ponownego logowania firmy NIP-em.
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const filteredSections = activeSection === 'all' 
    ? guideSections 
    : guideSections.filter(s => s.id === activeSection);

  const currentSection = activeSection === 'all' 
    ? { title: '📖 Pokaż całą instrukcję', icon: BookOpen }
    : guideSections.find(s => s.id === activeSection);

  const CurrentIcon = currentSection.icon;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      {/* Banner */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent tracking-tight">
              Instrukcja obsługi
            </h1>
            <p className="text-gray-600 font-semibold">Poznaj szczegółowo zasady działania i funkcje systemu zarządzania bębnami</p>
          </div>
        </div>
      </div>

      {/* Modern Custom Dropdown Selector */}
      <div className="relative inline-block text-left mb-8 z-30">
        <div>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="inline-flex justify-between items-center w-80 rounded-2xl border border-blue-100 bg-white/95 backdrop-blur-md px-5 py-3 text-xs font-bold text-gray-700 shadow-md hover:bg-blue-50/50 hover:text-blue-600 transition-all duration-200 focus:outline-none"
            id="menu-button"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shadow-inner">
                <CurrentIcon className="w-4 h-4" />
              </div>
              <span className="truncate">{currentSection.title}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${dropdownOpen ? 'transform rotate-180' : ''}`} />
          </button>
        </div>

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)}></div>
            <div 
              className="origin-top-left absolute left-0 mt-2 w-80 rounded-2xl shadow-xl bg-white border border-blue-50 ring-1 ring-black ring-opacity-5 focus:outline-none z-20 animate-fade-in"
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="menu-button"
              tabIndex="-1"
            >
              <div className="py-2 p-1.5 space-y-1" role="none">
                <button
                  onClick={() => {
                    setActiveSection('all');
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center space-x-2.5 ${
                    activeSection === 'all'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-blue-50/70 hover:text-blue-600'
                  }`}
                  role="menuitem"
                  tabIndex="-1"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>📖 Pokaż całą instrukcję</span>
                </button>
                {guideSections.map(s => {
                  const SecIcon = s.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setActiveSection(s.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center space-x-2.5 ${
                        activeSection === s.id
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-700 hover:bg-blue-50/70 hover:text-blue-600'
                      }`}
                      role="menuitem"
                      tabIndex="-1"
                    >
                      <SecIcon className="w-4 h-4" />
                      <span>{s.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Guide Cards */}
      <div className="space-y-6 relative z-10">
        {filteredSections.map(section => {
          const Icon = section.icon;
          return (
            <div 
              key={section.id} 
              className="bg-white/80 backdrop-blur-lg rounded-2xl border border-blue-100 shadow-md p-6 md:p-8 animate-fade-in hover:shadow-lg transition-shadow duration-300"
            >
              <div className="flex items-center space-x-3 mb-4 pb-4 border-b border-gray-100">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600 shadow-inner">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">{section.title}</h2>
                  <p className="text-xs text-gray-500 font-semibold mt-0.5">{section.description}</p>
                </div>
              </div>
              
              <div className="text-sm text-gray-700 leading-relaxed font-medium">
                {section.content}
              </div>
            </div>
          );
        })}
      </div>

      {/* Help Footer */}
      <div className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        <div>
          <h3 className="text-lg font-bold mb-1 flex items-center">
            <HelpCircle className="w-5 h-5 mr-1.5" />
            Nadal potrzebujesz pomocy?
          </h3>
          <p className="text-blue-100 text-sm font-semibold">Skontaktuj się z naszym specjalistą ds. opakowań.</p>
        </div>
        <div className="p-3 bg-white/10 rounded-2xl border border-white/20 shadow-inner text-xs font-bold leading-relaxed shrink-0">
          <div>Grupa Eltron Specjalista ds. opakowań</div>
          <div className="text-blue-200 mt-1 font-semibold">Telefon: +48 885 851 594</div>
          <div className="text-blue-200 font-semibold">E-mail: opakowania@grupaeltron.pl</div>
        </div>
      </div>
    </div>
  );
};

export default HelpGuide;
