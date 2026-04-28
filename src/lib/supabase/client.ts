import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  return createBrowserClient(
    'https://iejtgefkoiyrnyeedigr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllanRnZWZrb2l5cm55ZWVkaWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTI5ODAsImV4cCI6MjA5MTIyODk4MH0.2iTCPctmy0J1jxcVTovX5PSJy-yDJtKGqfBge_hTIJA'
  )
}
