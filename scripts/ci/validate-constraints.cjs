const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Needs to be a service role or a user with write access to do dummy inserts
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function validateConstraints() {
  console.log("🔍 Validating Database Constraints...\n");
  let passed = true;

  // 1. Check unique constraint: invoices.invoice_number
  console.log("Testing constraint: invoices.invoice_number (UNIQUE)");
  
  // Need a real student ID to pass FK
  const { data: students } = await supabase.from('students').select('id').limit(1);
  if (!students || students.length === 0) {
      console.log("  ⚠️ Skipping unique constraint test (no students found).");
  } else {
    const studentId = students[0].id;
    const dummyInvoiceId1 = '00000000-0000-0000-0000-000000000001';
    const dummyInvoiceId2 = '00000000-0000-0000-0000-000000000002';
    const dummyInvoiceNum = 'TEST-INV-UNIQUE-CONSTRAINT';
    
    // Cleanup any left-overs
    await supabase.from('invoices').delete().in('id', [dummyInvoiceId1, dummyInvoiceId2]);

    // Insert first
    const { error: err1 } = await supabase.from('invoices').insert({
      id: dummyInvoiceId1,
      invoice_number: dummyInvoiceNum,
      student_id: studentId,
      student_name: 'Test Student',
      amount_due: 0,
      due_date: '2026-10-10'
    });

    if (err1) {
      console.error("  ❌ Failed to insert first invoice for uniqueness test", err1);
      passed = false;
    } else {
      // Attempt duplicate
      const { error: err2 } = await supabase.from('invoices').insert({
        id: dummyInvoiceId2,
        invoice_number: dummyInvoiceNum,
        student_id: studentId,
        student_name: 'Test Student',
        amount_due: 0,
        due_date: '2026-10-10'
      });

      if (!err2) {
        console.error("  ❌ Unique constraint failed: Allowed duplicate invoice_number");
        passed = false;
      } else if (err2.code === '23505' || err2.message.includes('unique constraint')) {
        console.log("  ✅ Passed: Prevented duplicate invoice_number");
      } else {
        console.error("  ⚠️ Unexpected error during unique constraint test:", err2);
        passed = false;
      }
    }

    // Cleanup
    await supabase.from('invoices').delete().in('id', [dummyInvoiceId1, dummyInvoiceId2]);
  }


  // 2. Check foreign key: payment_allocations.payment_id and invoice_id
  console.log("\nTesting constraint: payment_allocations.payment_id (FOREIGN KEY)");
  const dummyAllocId1 = '00000000-0000-0000-0000-000000000003';
  const dummyAllocId2 = '00000000-0000-0000-0000-000000000004';
  const fakePaymentId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  
  // Need a real invoice to test just payment_id FK
  const { data: invoices } = await supabase.from('invoices').select('id').limit(1);
  const validInvoiceId = invoices && invoices.length > 0 ? invoices[0].id : null;

  if (validInvoiceId) {
    const { error: err3 } = await supabase.from('payment_allocations').insert({
      id: dummyAllocId1,
      payment_id: fakePaymentId,
      invoice_id: validInvoiceId,
      allocated_amount: 100
    });

    if (!err3) {
      console.error("  ❌ Foreign key constraint failed: Allowed insertion with invalid payment_id");
      passed = false;
      await supabase.from('payment_allocations').delete().eq('id', dummyAllocId1);
    } else if (err3.code === '23503' || err3.message.includes('foreign key constraint')) {
      console.log("  ✅ Passed: Prevented invalid payment_id in payment_allocations");
    } else {
      console.error("  ⚠️ Unexpected error during FK payment_id test:", err3);
      passed = false;
    }
  } else {
    console.log("  ⚠️ Skipping FK payment_id test (no valid invoice available).");
  }

  console.log("\nTesting constraint: payment_allocations.invoice_id (FOREIGN KEY)");
  // Need a real payment to test just invoice_id FK
  const { data: payments } = await supabase.from('payments').select('id').limit(1);
  const validPaymentId = payments && payments.length > 0 ? payments[0].id : null;

  if (validPaymentId) {
    const { error: err4 } = await supabase.from('payment_allocations').insert({
      id: dummyAllocId2,
      payment_id: validPaymentId,
      invoice_id: fakePaymentId, // Invalid invoice
      allocated_amount: 100
    });

    if (!err4) {
      console.error("  ❌ Foreign key constraint failed: Allowed insertion with invalid invoice_id");
      passed = false;
      await supabase.from('payment_allocations').delete().eq('id', dummyAllocId2);
    } else if (err4.code === '23503' || err4.message.includes('foreign key constraint')) {
      console.log("  ✅ Passed: Prevented invalid invoice_id in payment_allocations");
    } else {
      console.error("  ⚠️ Unexpected error during FK invoice_id test:", err4);
      passed = false;
    }
  } else {
    console.log("  ⚠️ Skipping FK invoice_id test (no valid payment available).");
  }

  if (!passed) {
    console.error("\n❌ Constraint validation failed.");
    process.exit(1);
  } else {
    console.log("\n✨ All constraints validated successfully.");
  }
}

validateConstraints().catch(err => {
  console.error("Script error:", err);
  process.exit(1);
});
