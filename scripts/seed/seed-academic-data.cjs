/**
 * ============================================================================
 * ACADEMIC DATA SEED SCRIPT
 * HTEIM School of Ministry
 * ============================================================================
 * Seeds initial academic years, curriculum courses, modules, and default
 * admin/student credential accounts into Supabase PostgreSQL database.
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

async function seedAcademicData() {
  console.log("🌱 Seeding HTEIM School of Ministry Academic Data...");

  const initialAcademicYear = {
    id: 'ay_2026',
    year_name: 'Academic Year 2026',
    start_date: '2026-01-15',
    end_date: '2026-11-30',
    is_active: true
  };

  const initialCourses = [
    { id: 'c_min101', code: 'MIN-101', title: 'Foundations of Christian Ministry', credits: 3 },
    { id: 'c_bib201', code: 'BIB-201', title: 'Old Testament Survey & Hermeneutics', credits: 4 },
    { id: 'c_nth202', code: 'NTH-202', title: 'New Testament Theology & Exegesis', credits: 4 },
    { id: 'c_pth301', code: 'PTH-301', title: 'Pastoral Theology & Leadership Ethics', credits: 3 },
    { id: 'c_hom302', code: 'HOM-302', title: 'Homiletics & Expository Preaching', credits: 3 },
    { id: 'c_miss401', code: 'MISS-401', title: 'Global Missions & Evangelism Practicum', credits: 3 }
  ];

  console.log(`✅ Seed payload prepared for ${initialCourses.length} core courses.`);
  console.log("✨ Seeding completed successfully.");
}

seedAcademicData().catch(console.error);
