// Plik: src/utils/supabaseApi.js
// Opis: Finalna, kompletna i poprawiona wersja logiki API.

import { supabase, supabaseHelpers } from '../lib/supabase';
import bcrypt from 'bcryptjs';

export const authAPI = {
  /**
   * Sprawdza, czy użytkownik (klient lub admin) istnieje i czy ma ustawione hasło.
   */
  async checkUserStatus(nip, loginMode) {
    const table = loginMode === 'admin' ? 'admin_users' : 'users';
    
    const { data, error } = await supabase
      .from(table)
      .select('password_hash, name, nip, role, email, id, username, permissions')
      .eq('nip', nip)
      .maybeSingle();

    if (error) {
      console.error('Check user error:', error);
      throw new Error('Błąd podczas sprawdzania użytkownika.');
    }

    if (!data) {
      return { exists: false, hasPassword: false, userData: null };
    }

    return {
      exists: true,
      hasPassword: !!data.password_hash,
      userData: data,
    };
  },

  /**
   * Loguje użytkownika z istniejącym hasłem.
   */
  async signIn(nip, password, userData, loginMode) {
    if (!password) {
      throw new Error('Hasło jest wymagane.');
    }
    
    const hashToCompare = userData.password_hash;
    if (!hashToCompare) {
        throw new Error('Brak hasha do porównania. Błąd wewnętrzny.');
    }
    
    const isValidPassword = await bcrypt.compare(password, hashToCompare);
    if (!isValidPassword) {
      throw new Error('Nieprawidłowe hasło.');
    }

    const table = loginMode === 'admin' ? 'admin_users' : 'users';
    const updateColumn = loginMode === 'admin' ? 'id' : 'nip';
    const updateValue = loginMode === 'admin' ? userData.id : nip;

    await supabase
      .from(table)
      .update({ last_login: new Date().toISOString() })
      .eq(updateColumn, updateValue);

    return {
      user: {
        id: userData.id,
        nip: userData.nip,
        username: userData.username,
        name: userData.name,
        email: userData.email,
        role: userData.role || 'client',
        permissions: userData.permissions,
        companyName: loginMode === 'client' ? userData.name : 'Grupa Eltron - Administrator',
      },
    };
  },

  /**
   * Ustawia hasło dla nowego użytkownika.
   */
  async setPassword(nip, password, loginMode) {
    if (password.length < 6) {
      throw new Error('Hasło musi mieć co najmniej 6 znaków.');
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    const table = loginMode === 'admin' ? 'admin_users' : 'users';
    
    const updateData = {
      password_hash: passwordHash,
    };
    if (loginMode === 'client') {
      updateData.is_first_login = false;
    }
    
    const { error } = await supabase
      .from(table)
      .update(updateData)
      .eq('nip', nip);

    if (error) {
      console.error('Set password error:', error);
      throw new Error('Nie udało się ustawić hasła.');
    }
    
    const { userData } = await this.checkUserStatus(nip, loginMode);
    return this.signIn(nip, password, userData, loginMode);
  },
};

// Drums API
export const drumsAPI = {
  async getDrums(nip = null) {
    try {
      let query = supabase
        .from('drums')
        .select(`
          *,
          companies!inner (
            name,
            email,
            phone,
            address
          ),
          custom_return_periods (
            return_period_days
          )
        `)

      if (nip) {
        query = query.eq('nip', nip)
      }

      const { data, error } = await query.order('kod_bebna')

      if (error) throw error

      // Wzbogać dane o obliczone pola
      const enrichedDrums = data.map(drum => {
        const returnPeriodDays = drum.custom_return_periods?.[0]?.return_period_days || 85
        const status = supabaseHelpers.getDrumStatus(drum.data_zwrotu_do_dostawcy)
        
        return {
          ...drum,
          // Mapowanie dla kompatybilności z frontendem
          KOD_BEBNA: drum.kod_bebna,
          NAZWA: drum.nazwa,
          CECHA: drum.cecha,
          DATA_ZWROTU_DO_DOSTAWCY: drum.data_zwrotu_do_dostawcy,
          KON_DOSTAWCA: drum.kon_dostawca,
          PELNA_NAZWA_KONTRAHENTA: drum.companies.name,
          NIP: drum.nip,
          TYP_DOK: drum.typ_dok,
          NR_DOKUMENTUPZ: drum.nr_dokumentupz,
          'Data przyjęcia na stan': drum.data_przyjecia_na_stan,
          KONTRAHENT: drum.kontrahent,
          STATUS: drum.status,
          DATA_WYDANIA: drum.data_wydania,
          
          // Obliczone pola
          company: drum.companies.name,
          companyPhone: drum.companies.phone,
          companyEmail: drum.companies.email,
          companyAddress: drum.companies.address,
          returnPeriodDays,
          ...status
        }
      })

      return enrichedDrums

    } catch (error) {
      console.error('Drums API error:', error)
      throw error
    }
  },

  async getDrum(id) {
    try {
      const { data, error } = await supabase
        .from('drums')
        .select(`
          *,
          companies!inner (
            name,
            email,
            phone,
            address
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data

    } catch (error) {
      console.error('Get drum error:', error)
      throw error
    }
  }
}

// Companies API
export const companiesAPI = {
  async getCompanies() {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          custom_return_periods (
            return_period_days
          ),
          drums (count),
          return_requests (count)
        `)
        .order('name')

      if (error) throw error

      const enrichedCompanies = data.map(company => ({
        ...company,
        drumsCount: company.drums?.[0]?.count || 0,
        totalRequests: company.return_requests?.[0]?.count || 0,
        returnPeriodDays: company.custom_return_periods?.[0]?.return_period_days || 85
      }))

      return enrichedCompanies

    } catch (error) {
      console.error('Companies API error:', error)
      throw error
    }
  },

  async getCompany(nip) {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          custom_return_periods (
            return_period_days
          )
        `)
        .eq('nip', nip)
        .single()

      if (error) throw error
      return data

    } catch (error) {
      console.error('Get company error:', error)
      throw error
    }
  },

  async updateCompany(nip, updateData) {
    try {
      const { data, error } = await supabase
        .from('companies')
        .update({
          ...updateData,
          last_activity: new Date().toISOString()
        })
        .eq('nip', nip)
        .select()
        .single()

      if (error) throw error
      return data

    } catch (error) {
      console.error('Update company error:', error)
      throw error
    }
  }
}

// Returns API
export const returnsAPI = {
  async getReturns(nip = null) {
    try {
      let query = supabase
        .from('return_requests')
        .select(`
          *,
          companies!inner (
            name
          )
        `)

      if (nip) {
        query = query.eq('user_nip', nip)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data

    } catch (error) {
      console.error('Returns API error:', error)
      throw error
    }
  },

  async createReturn(returnData) {
    try {
      const { data: drums, error: drumsError } = await supabase
        .from('drums')
        .select('kod_bebna')
        .eq('nip', returnData.user_nip)
        .in('kod_bebna', returnData.selected_drums)

      if (drumsError) throw drumsError

      if (drums.length !== returnData.selected_drums.length) {
        throw new Error('Some selected drums do not belong to your account')
      }

      const { data: overdueDrums } = await supabase
        .from('drums')
        .select('kod_bebna')
        .eq('nip', returnData.user_nip)
        .in('kod_bebna', returnData.selected_drums)
        .lt('data_zwrotu_do_dostawcy', new Date().toISOString())

      const priority = overdueDrums && overdueDrums.length > 0 ? 'High' : 'Normal'

      const { data, error } = await supabase
        .from('return_requests')
        .insert({
          ...returnData,
          priority,
          status: 'Pending'
        })
        .select()
        .single()

      if (error) throw error

      await supabase
        .from('companies')
        .update({ last_activity: new Date().toISOString() })
        .eq('nip', returnData.user_nip)

      return data

    } catch (error) {
      console.error('Create return error:', error)
      throw error
    }
  },

  async updateReturnStatus(id, status) {
    try {
      const { data, error } = await supabase
        .from('return_requests')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data

    } catch (error) {
      console.error('Update return status error:', error)
      throw error
    }
  }
}

// Return Periods API
export const returnPeriodsAPI = {
  async getReturnPeriods() {
    try {
      const { data, error } = await supabase
        .from('custom_return_periods')
        .select(`
          *,
          companies!inner (
            name,
            email,
            phone
          )
        `)
        .order('companies(name)')

      if (error) throw error
      return data

    } catch (error) {
      console.error('Return periods API error:', error)
      throw error
    }
  },

  async getReturnPeriod(nip) {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          name,
          custom_return_periods (
            return_period_days
          )
        `)
        .eq('nip', nip)
        .single()

      if (error) throw error

      return {
        nip,
        returnPeriodDays: data.custom_return_periods?.[0]?.return_period_days || 85,
        companyName: data.name,
        isDefault: !data.custom_return_periods?.[0]?.return_period_days
      }

    } catch (error) {
      console.error('Get return period error:', error)
      throw error
    }
  },

  async updateReturnPeriod(nip, days) {
    try {
      if (days < 1 || days > 365) {
        throw new Error('Return period must be between 1 and 365 days')
      }

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('name')
        .eq('nip', nip)
        .single()

      if (companyError || !company) {
        throw new Error('Company not found')
      }

      if (days === 85) {
        const { error } = await supabase
          .from('custom_return_periods')
          .delete()
          .eq('nip', nip)

        if (error) throw error

        return {
          message: 'Default return period restored (85 days)',
          nip,
          returnPeriodDays: 85,
          isDefault: true
        }

      } else {
        const { data, error } = await supabase
          .from('custom_return_periods')
          .upsert({
            nip,
            return_period_days: days,
            updated_at: new Date().toISOString()
          }, { onConflict: 'nip' })
          .select()
          .single()

        if (error) throw error

        return {
          message: 'Custom return period updated successfully',
          nip,
          returnPeriodDays: days,
          isDefault: false,
          updatedAt: data.updated_at
        }
      }

    } catch (error) {
      console.error('Update return period error:', error)
      throw error
    }
  },

  async deleteReturnPeriod(nip) {
    try {
      const { data, error } = await supabase
        .from('custom_return_periods')
        .delete()
        .eq('nip', nip)
        .select()

      if (error) throw error

      if (data.length === 0) {
        throw new Error('Custom return period not found')
      }

      return {
        message: 'Custom return period removed, default period (85 days) restored',
        nip,
        returnPeriodDays: 85,
        isDefault: true
      }

    } catch (error) {
      console.error('Delete return period error:', error)
      throw error
    }
  }
}

// Stats API (dla dashboardu)
export const statsAPI = {
  async getDashboardStats(nip = null) {
    try {
      const now = new Date().toISOString()

      if (nip) {
        const [
          { count: totalDrums },
          { count: overdueDrums },
          { count: dueSoonDrums },
          { count: totalRequests },
          { count: pendingRequests }
        ] = await Promise.all([
          supabase.from('drums').select('*', { count: 'exact', head: true }).eq('nip', nip),
          supabase.from('drums').select('*', { count: 'exact', head: true }).eq('nip', nip).lt('data_zwrotu_do_dostawcy', now),
          supabase.from('drums').select('*', { count: 'exact', head: true }).eq('nip', nip).gte('data_zwrotu_do_dostawcy', now).lte('data_zwrotu_do_dostawcy', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
          supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('user_nip', nip),
          supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('user_nip', nip).eq('status', 'Pending')
        ])

        return {
          totalDrums: totalDrums || 0,
          activeDrums: (totalDrums || 0) - (overdueDrums || 0) - (dueSoonDrums || 0),
          pendingReturns: overdueDrums || 0,
          recentReturns: dueSoonDrums || 0,
          totalRequests: totalRequests || 0,
          pendingRequests: pendingRequests || 0
        }
      }

      const [
        { count: totalClients },
        { count: totalDrums },
        { count: overdueDrums },
        { count: dueSoonDrums },
        { count: totalRequests },
        { count: pendingRequests },
        { count: approvedRequests },
        { count: completedRequests }
      ] = await Promise.all([
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('drums').select('*', { count: 'exact', head: true }),
        supabase.from('drums').select('*', { count: 'exact', head: true }).lt('data_zwrotu_do_dostawcy', now),
        supabase.from('drums').select('*', { count: 'exact', head: true }).gte('data_zwrotu_do_dostawcy', now).lte('data_zwrotu_do_dostawcy', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('return_requests').select('*', { count: 'exact', head: true }),
        supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
        supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('status', 'Approved'),
        supabase.from('return_requests').select('*', { count: 'exact', head: true }).eq('status', 'Completed')
      ])

      return {
        totalClients: totalClients || 0,
        totalDrums: totalDrums || 0,
        activeDrums: (totalDrums || 0) - (overdueDrums || 0) - (dueSoonDrums || 0),
        pendingReturns: pendingRequests || 0,
        overdueReturns: overdueDrums || 0,
        activeRequests: (pendingRequests || 0) + (approvedRequests || 0),
        completedRequests: completedRequests || 0,
        totalRequests: totalRequests || 0
      }

    } catch (error) {
      console.error('Stats API error:', error)
      throw error
    }
  }
}

export const handleAPIError = (error, setError = null) => {
  console.error('Supabase API Error:', error);
  const errorMessage = error.message || 'Wystąpił błąd podczas połączenia z bazą danych';
  if (setError) {
    setError(errorMessage);
  }
  return errorMessage;
};
