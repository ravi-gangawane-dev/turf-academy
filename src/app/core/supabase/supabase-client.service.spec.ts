import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../config/api.config';
import { SupabaseClientService } from './supabase-client.service';

describe('SupabaseClientService', () => {
  it('fails safely when public project configuration is absent', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: API_CONFIG, useValue: { baseUrl: '/api/v1', useMockApi: true, backend: 'mock', supabaseUrl: '', supabaseAnonKey: '' } }],
    });
    const service = TestBed.inject(SupabaseClientService);
    expect(service.configured).toBe(false);
    expect(() => service.requireClient()).toThrowError(/not configured/i);
  });

  it('constructs a browser client from public configuration', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: API_CONFIG, useValue: { baseUrl: '/api/v1', useMockApi: false, backend: 'supabase', supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'public-test-key' } }],
    });
    const service = TestBed.inject(SupabaseClientService);
    expect(service.configured).toBe(true);
    expect(service.client).toBeTruthy();
  });
});
