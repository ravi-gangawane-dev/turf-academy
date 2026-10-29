import { createClient } from '@supabase/supabase-js';

/**
 * Test Credentials Verification Script
 * 
 * Verifies that test credentials are properly configured in Supabase
 * and all role-isolation relationships are set up correctly.
 * 
 * Run with: npx ts-node verify-test-credentials.ts
 * Or from package.json: npm run verify:test-credentials
 */

interface VerificationResult {
    section: string;
    passed: boolean;
    message: string;
    details?: string[];
}

const results: VerificationResult[] = [];

async function verify() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ttuigbkaluozglzgepsh.supabase.co';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_rWM0j3-x9zSCcGKeo_ImXw_lxNKPyyR';

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 Verifying Test Credentials Setup...\n');

    // 1. Check all 4 test users exist
    try {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, email, role, full_name')
            .in('email', ['admin@turf.local', 'receptionist@turf.local', 'coach@turf.local', 'parent@turf.local']);

        if (error) throw error;

        const testEmails = new Set(['admin@turf.local', 'receptionist@turf.local', 'coach@turf.local', 'parent@turf.local']);
        const foundEmails = new Set(profiles?.map(p => p.email) ?? []);
        const missing = Array.from(testEmails).filter(e => !foundEmails.has(e));

        results.push({
            section: '✅ Test User Profiles',
            passed: missing.length === 0,
            message: missing.length === 0
                ? `All 4 test users found`
                : `Missing profiles: ${missing.join(', ')}`,
            details: profiles?.map(p => `  • ${p.email} → ${p.role} (${p.full_name})`)
        });
    } catch (err) {
        results.push({
            section: '❌ Test User Profiles',
            passed: false,
            message: `Failed to fetch profiles: ${err instanceof Error ? err.message : String(err)}`
        });
    }

    // 2. Verify role-specific records exist
    try {
        const { data: coaches } = await supabase
            .from('coaches')
            .select('id, profile_id, full_name, status')
            .in('profile_id', [
                (await supabase.from('profiles').select('id').eq('email', 'coach@turf.local')).data?.[0]?.id
            ].filter(Boolean));

        results.push({
            section: '✅ Coach Record',
            passed: (coaches?.length ?? 0) > 0,
            message: (coaches?.length ?? 0) > 0 ? 'Coach record created' : 'No coach record found',
            details: coaches?.map(c => `  • ${c.full_name} (status: ${c.status})`)
        });
    } catch (err) {
        results.push({
            section: '⚠️  Coach Record',
            passed: false,
            message: `Could not verify: ${err instanceof Error ? err.message : String(err)}`
        });
    }

    try {
        const { data: parents } = await supabase
            .from('parents')
            .select('id, profile_id, full_name, status')
            .in('profile_id', [
                (await supabase.from('profiles').select('id').eq('email', 'parent@turf.local')).data?.[0]?.id
            ].filter(Boolean));

        results.push({
            section: '✅ Parent Record',
            passed: (parents?.length ?? 0) > 0,
            message: (parents?.length ?? 0) > 0 ? 'Parent record created' : 'No parent record found',
            details: parents?.map(p => `  • ${p.full_name} (status: ${p.status})`)
        });
    } catch (err) {
        results.push({
            section: '⚠️  Parent Record',
            passed: false,
            message: `Could not verify: ${err instanceof Error ? err.message : String(err)}`
        });
    }

    // 3. Check coach-batch associations
    try {
        const coachProfile = await supabase
            .from('profiles')
            .select('id')
            .eq('email', 'coach@turf.local')
            .single();

        if (coachProfile.data?.id) {
            const { data: coachId } = await supabase
                .from('coaches')
                .select('id')
                .eq('profile_id', coachProfile.data.id)
                .single();

            if (coachId?.id) {
                const { data: batchLinks } = await supabase
                    .from('batch_coaches')
                    .select('id, batch_id, is_primary, batch:batches(id, code, name)')
                    .eq('coach_id', coachId.id);

                results.push({
                    section: '✅ Coach-Batch Links',
                    passed: (batchLinks?.length ?? 0) > 0,
                    message: `Coach assigned to ${batchLinks?.length ?? 0} batch(es)`,
                    details: batchLinks?.map((link: any) => `  • ${link.batch?.name} (${link.batch?.code})`)
                });
            }
        }
    } catch (err) {
        results.push({
            section: '⚠️  Coach-Batch Links',
            passed: false,
            message: `Could not verify: ${err instanceof Error ? err.message : String(err)}`
        });
    }

    // 4. Check parent-student associations
    try {
        const parentProfile = await supabase
            .from('profiles')
            .select('id')
            .eq('email', 'parent@turf.local')
            .single();

        if (parentProfile.data?.id) {
            const { data: parentId } = await supabase
                .from('parents')
                .select('id')
                .eq('profile_id', parentProfile.data.id)
                .single();

            if (parentId?.id) {
                const { data: studentLinks } = await supabase
                    .from('student_parents')
                    .select('id, student_id, is_primary, student:students(id, full_name)')
                    .eq('parent_id', parentId.id);

                results.push({
                    section: '✅ Parent-Student Links',
                    passed: (studentLinks?.length ?? 0) > 0,
                    message: `Parent linked to ${studentLinks?.length ?? 0} student(s)`,
                    details: studentLinks?.map((link: any) => `  • ${link.student?.full_name}`)
                });
            }
        }
    } catch (err) {
        results.push({
            section: '⚠️  Parent-Student Links',
            passed: false,
            message: `Could not verify: ${err instanceof Error ? err.message : String(err)}`
        });
    }

    // Print results
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST CREDENTIALS VERIFICATION REPORT');
    console.log('═══════════════════════════════════════════════════════════\n');

    let passCount = 0;
    for (const result of results) {
        const emoji = result.passed ? '✅' : '❌';
        console.log(`${emoji} ${result.section}`);
        console.log(`   ${result.message}`);
        if (result.details) {
            result.details.forEach(d => console.log(d));
        }
        console.log();
        if (result.passed) passCount++;
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Summary: ${passCount}/${results.length} checks passed`);
    console.log('═══════════════════════════════════════════════════════════\n');

    if (passCount === results.length) {
        console.log('✅ All test credentials are properly configured!');
        console.log('Run tests with: npm run test:e2e:live\n');
        process.exit(0);
    } else {
        console.log('❌ Some checks failed. See setup guide: docs/TEST_CREDENTIALS_SETUP.md\n');
        process.exit(1);
    }
}

verify().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
