import { supabase } from '../lib/supabase';

export const calculatorAPI = {
  /**
   * Pobiera wszystkie kable z katalogu (ze stronicowaniem obchodzącym domyślny limit 1000 wierszy w Supabase)
   * oraz deduplikuje wpisy preferując najnowsze dane.
   */
  async getCables() {
    try {
      const allCables = [];
      let page = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from('cables_catalog')
          .select('*')
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allCables.push(...data);
        if (data.length < pageSize) break;
        page++;
      }

      // Deduplikacja wg unikalnej pary (nazwa + przekrój), zachowując najnowszy rekord
      const uniqueMap = new Map();
      for (const cable of allCables) {
        const key = `${(cable.name || '').trim()}___${(cable.cross_section || '').trim()}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, cable);
        }
      }

      return Array.from(uniqueMap.values());
    } catch (error) {
      console.error('Błąd pobierania kabli z katalogu:', error);
      throw error;
    }
  },

  /**
   * Pobiera wymiary wszystkich dostępnych bębnów.
   */
  async getDrumDimensions() {
    try {
      const { data, error } = await supabase
        .from('drum_dimensions')
        .select('*')
        .order('outer_diameter', { ascending: true });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Błąd pobierania wymiarów bębnów:', error);
      throw error;
    }
  }
};
