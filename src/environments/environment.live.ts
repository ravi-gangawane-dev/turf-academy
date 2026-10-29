export const environment = {
    production: false,
    useMockApi: false,
    backend: 'supabase' as const,
    apiBaseUrl: '/api/v1',
    // Real Supabase instance for live testing
    supabaseUrl: 'https://ttuigbkaluozglzgepsh.supabase.co',
    supabaseAnonKey: 'sb_publishable_rWM0j3-x9zSCcGKeo_ImXw_lxNKPyyR',
    monitoring: { enabled: true, endpoint: 'https://example.com/monitoring', release: '0.1.0' },
    academySupport: {
        phone: '+919876543210',
        displayPhone: '+91 98765 43210',
        email: 'support@turfacademy.in',
        whatsapp: '919876543210',
        hours: 'Mon–Sat, 8:00 AM–7:00 PM',
    },
} as const;
