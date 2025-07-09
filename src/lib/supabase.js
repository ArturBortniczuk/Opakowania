// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Helper function for authenticated requests
export const getAuthenticatedSupabase = (accessToken) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  })
}

// Database helper functions
export const supabaseHelpers = {
  // Ustawienie kontekstu użytkownika dla RLS
  async setUserContext(nip) {
    await supabase.rpc('set_config', {
      setting_name: 'app.current_user_nip',
      setting_value: nip,
      is_local: true
    })
  },

  // Formatowanie dat polskich na ISO
  formatPolishDateToISO(polishDate) {
    if (!polishDate || polishDate === ' ') return null
    
    // Obsługa różnych formatów
    if (polishDate.includes(' ')) {
      const [datePart] = polishDate.split(' ')
      const [day, month, year] = datePart.split('/')
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    
    const [day, month, year] = polishDate.split('/')
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  },

  // Obliczanie terminów zwrotu
  calculateReturnDate(issueDate, returnPeriodDays = 85) {
    if (!issueDate) {
      const today = new Date()
      const returnDate = new Date(today)
      returnDate.setDate(returnDate.getDate() + returnPeriodDays)
      return returnDate.toISOString().split('T')[0]
    }

    const issueDateTime = new Date(issueDate)
    const returnDate = new Date(issueDateTime)
    returnDate.setDate(returnDate.getDate() + returnPeriodDays)
    
    return returnDate.toISOString().split('T')[0]
  },

  // Status bębnów
  getDrumStatus(returnDate) {
    const now = new Date()
    const returnDateTime = new Date(returnDate)
    const daysDiff = Math.ceil((returnDateTime - now) / (1000 * 60 * 60 * 24))
    
    if (daysDiff < 0) {
      return {
        status: 'overdue',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-200',
        text: 'Przeterminowany',
        daysDiff: Math.abs(daysDiff)
      }
    } else if (daysDiff <= 7) {
      return {
        status: 'due-soon',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100', 
        borderColor: 'border-yellow-200',
        text: `Za ${daysDiff} dni`,
        daysDiff
      }
    } else {
      return {
        status: 'active',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-200', 
        text: 'Aktywny',
        daysDiff
      }
    }
  }
}