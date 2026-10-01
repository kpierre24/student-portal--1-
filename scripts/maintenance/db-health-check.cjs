/**
 * ============================================================================
 * DATABASE & STORAGE MAINTENANCE HEALTH CHECK
 * HTEIM School of Ministry
 * ============================================================================
 * Reusable maintenance script to verify Supabase database connectivity,
 * validate table schemas, and test storage bucket access.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runHealthCheck() {
  console.log("🔍 Running HTEIM Portal Database & Storage Health Check...\n");

  // 1. Verify app_states table access
  try {
    const { data, error } = await supabase.from('app_states').select('id, updated_at').limit(1);
    if (error) {
      console.warn("⚠️ app_states table warning:", error.message);
    } else {
      console.log("✅ app_states table accessible. Record count query succeeded.");
    }
  } catch (err) {
    console.error("❌ Failed to query app_states table:", err);
  }

  // 2. Verify Storage Buckets
  const buckets = ['library', 'assignments', 'classroom_media'];
  for (const bucket of buckets) {
    try {
      const { data, error } = await supabase.storage.from(bucket).list('', { limit: 1 });
      if (error) {
        console.warn(`⚠️ Storage bucket '${bucket}' access warning:`, error.message);
      } else {
        console.log(`✅ Storage bucket '${bucket}' verified.`);
      }
    } catch (err) {
      console.error(`❌ Failed to access storage bucket '${bucket}':`, err);
    }
  }

  console.log("\n✨ Health check process finished.");
}

runHealthCheck().catch(console.error);
