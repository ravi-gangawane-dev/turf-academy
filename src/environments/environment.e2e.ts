export const environment = {
  production: false,
  useMockApi: true,
  backend: 'mock' as const,
  apiBaseUrl: '/api/v1',
  supabaseUrl: '',
  supabaseAnonKey: '',
  monitoring: { enabled: true, endpoint: 'https://example.com/monitoring', release: '0.1.0' },
  academySupport: {
    phone: '+919876543210',
    displayPhone: '+91 98765 43210',
    email: 'support@turfacademy.in',
    whatsapp: '919876543210',
    hours: 'Mon–Sat, 8:00 AM–7:00 PM',
  },
} as const;
