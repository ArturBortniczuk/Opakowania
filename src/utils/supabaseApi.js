// src/utils/supabaseApi.js
import { supabase, supabaseHelpers } from '../lib/supabase'
import bcrypt from 'bcryptjs'

// Authentication API
export const authAPI = {
  async login(nip, password, loginMode = 'client') {
    try {
      if (loginMode === 'admin') {
        // Logowanie administratora
        const { data: admin, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('nip', nip)
          .eq('is_active', true)
          .single()

        if (error || !admin) {
          throw new Error('Invalid admin credentials')
        }

        if (!admin.password_hash) {
          return { firstLogin: true, admin }
        }

        const isValidPassword = await bcrypt.compare(password, admin.password_hash)
        if (!isValidPassword) {
          throw new Error('Invalid password')
        }

        // Aktualizuj ostatnie logowanie
        await supabase
          .from('admin_users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', admin.id)

        return {
          user: {
            id: admin.id,
            nip: admin.nip,
            username: admin.username,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            permissions: admin.permissions,
            companyName: 'Grupa Eltron - Administrator'
          }
        }

      } else {
        // Logowanie klienta
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('nip', nip)
          .single()

        if (companyError || !company) {
          throw new Error('Company not found')
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('nip', nip)
          .single()

        if (userError || !user) {
          return { firstLogin: true, company }
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash)
        if (!isValidPassword) {
          throw new Error('Invalid password')
        }

        // Aktualizuj ostatnie logowanie
        await supabase
          .from('users')
          .update({ 
            last_login: new Date().toISOString(),
            is_first_login: false 
          })
          .eq('nip', nip)

        await supabase
          .from('companies')
          .update({ last_activity: new Date().toISOString() })
          .eq('nip', nip)

        return {
          user: {
            nip: company.nip,
            companyName: company.name,
            role: 'client'
          }
        }
      }

    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  },

  async register(nip, password, confirmPassword, loginMode = 'client') {
    try {
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match')
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      const saltRounds = 12
      const passwordHash = await bcrypt.hash(password, saltRounds)

      if (loginMode === 'admin') {
        // Rejestracja administratora
        const { data: admin, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('nip', nip)
          .single()

        if (error || !admin) {
          throw new Error('Admin account not found')
        }

        if (admin.password_hash) {
          throw new Error('Password already set')
        }

        await supabase
          .from('admin_users')
          .update({ password_hash: passwordHash })
          .eq('nip', nip)

        return {
          user: {
            id: admin.id,
            nip: admin.nip,
            username: admin.username,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            permissions: admin.permissions,
            companyName: 'Grupa Eltron - Administrator'
          }
        }

      } else {
        // Rejestracja klienta
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('nip', nip)
          .single()

        if (companyError || !company) {
          throw new Error('Company not found')
        }

        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('nip', nip)
          .single()

        if (existingUser) {
          throw new Error('Password already set')
        }

        await supabase
          .from('users')
          .insert({
            nip,
            password_hash: passwordHash,
            is_first_login: false
          })

        await supabase
          .from('companies')
          .update({ last_activity: new Date().toISOString() })
          .eq('nip', nip)

        return {
          user: {
            nip: company.nip,
            companyName: company.name,
            role: 'client'
          }
        }
      }

    } catch (error) {
      console.error('Register error:', error)
      throw error
    }
  }
}

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

      // Wzbogać o obliczone statystyki
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
      // Sprawdź czy bębny należą do użytkownika
      const { data: drums, error: drumsError } = await supabase
        .from('drums')
        .select('kod_bebna')
        .eq('nip', returnData.user_nip)
        .in('kod_bebna', returnData.selected_drums)

      if (drumsError) throw drumsError

      if (drums.length !== returnData.selected_drums.length) {
        throw new Error('Some selected drums do not belong to your account')
      }

      // Określ priorytet na podstawie terminów
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

      // Aktualizuj aktywność firmy
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

      // Sprawdź czy firma istnieje
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('name')
        .eq('nip', nip)
        .single()

      if (companyError || !company) {
        throw new Error('Company not found')
      }

      if (days === 85) {
        // Usuń niestandardowy termin (przywróć domyślny)
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
        // Ustaw niestandardowy termin
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

      // Stats dla konkretnego klienta
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

      // Stats dla administratora (wszystkie dane)
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

// Error handler helper
export const handleAPIError = (error, setError = null) => {
  console.error('Supabase API Error:', error)
  
  const errorMessage = error.message || 'Wystąpił błąd podczas połączenia z bazą danych'
  
  if (setError) {
    setError(errorMessage)
  }
  
  return errorMessage
}

// Funkcje pomocnicze do migracji z mock data
export const migrationHelpers = {
  // Mapowanie starych nazw pól na nowe
  mapLegacyDrumData(legacyDrum) {
    return {
      kod_bebna: legacyDrum.KOD_BEBNA,
      nazwa: legacyDrum.NAZWA,
      cecha: legacyDrum.CECHA,
      data_zwrotu_do_dostawcy: legacyDrum.DATA_ZWROTU_DO_DOSTAWCY,
      kon_dostawca: legacyDrum.KON_DOSTAWCA,
      nip: legacyDrum.NIP,
      typ_dok: legacyDrum.TYP_DOK,
      nr_dokumentupz: legacyDrum.NR_DOKUMENTUPZ,
      data_przyjecia_na_stan: legacyDrum['Data przyjęcia na stan'],
      kontrahent: legacyDrum.KONTRAHENT,
      status: legacyDrum.STATUS || 'Aktywny',
      data_wydania: legacyDrum.DATA_WYDANIA
    }
  },

  // Kompatybilność z starym API
  mapToLegacyFormat(supabaseDrum) {
    return {
      KOD_BEBNA: supabaseDrum.kod_bebna,
      NAZWA: supabaseDrum.nazwa,
      CECHA: supabaseDrum.cecha,
      DATA_ZWROTU_DO_DOSTAWCY: supabaseDrum.data_zwrotu_do_dostawcy,
      KON_DOSTAWCA: supabaseDrum.kon_dostawca,
      PELNA_NAZWA_KONTRAHENTA: supabaseDrum.companies?.name || supabaseDrum.company,
      NIP: supabaseDrum.nip,
      TYP_DOK: supabaseDrum.typ_dok,
      NR_DOKUMENTUPZ: supabaseDrum.nr_dokumentupz,
      'Data przyjęcia na stan': supabaseDrum.data_przyjecia_na_stan,
      KONTRAHENT: supabaseDrum.kontrahent,
      STATUS: supabaseDrum.status,
      DATA_WYDANIA: supabaseDrum.data_wydania
    }
  }
}