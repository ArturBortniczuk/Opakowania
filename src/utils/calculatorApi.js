import { supabase } from '../lib/supabase';

export const calculatorAPI = {
  /**
   * Pobiera wszystkie kable z katalogu.
   */
  async getCables() {
    try {
      const { data, error } = await supabase
        .from('cables_catalog')
        .select('*')
        .order('name', { ascending: true });
        
      if (error) throw error;
      return data || [];
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
