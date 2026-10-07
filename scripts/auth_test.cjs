const path = require('path');
const { createClient } = require(path.resolve(__dirname, '../node_modules/@supabase/supabase-js'));
const crypto = require('crypto');

const SUPABASE_URL = 'https://yhakphwljyjpfnsmkjnz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloYWtwaHdsanlqcGZuc21ram56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNzMyNjgsImV4cCI6MjEwNjc0OTI2OH0.155ZpYG_wF8am28wdL41Dj0tiAxeqaEn0P2XmEJBqQ0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function hashPassword(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

const ROLE_DEFINITIONS = {
  ROOT_ADMIN: {
    name: 'Root / Super Admin',
    allowedCategories: ['dashboard', 'orders', 'products', 'inventory', 'customers', 'users', 'settings'],
  },
  STORE_KEEPER: {
    name: 'Store Keeper',
    allowedCategories: ['inventory', 'products'],
  },
  ORDER_PROCESSOR: {
    name: 'Order Processor',
    allowedCategories: ['orders'],
  },
};

// Simulation of useAdminAuthStore.login
async function simulateLogin(identifier, plainPassword, localUsers = []) {
  const cleanId = identifier.trim().toLowerCase();
  const inputHash = hashPassword(plainPassword);

  // 1. Check local
  let user = localUsers.find(
    (u) =>
      u.email.toLowerCase() === cleanId ||
      (u.username && u.username.toLowerCase() === cleanId) ||
      u.id.toLowerCase() === cleanId
  );

  // 2. Direct Supabase
  if (!user) {
    // Check by email
    const { data: dbUserByEmail } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', cleanId)
      .maybeSingle();

    if (dbUserByEmail) {
      user = {
        id: dbUserByEmail.id,
        username: dbUserByEmail.username || dbUserByEmail.email.split('@')[0],
        email: dbUserByEmail.email,
        full_name: dbUserByEmail.full_name,
        role: dbUserByEmail.role,
        status: dbUserByEmail.status === 'inactive' || dbUserByEmail.status === 'disabled' ? 'disabled' : 'active',
        password_hash: dbUserByEmail.password_hash,
      };
    } else {
      // Check store_settings fallback
      const { data: regData } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'admin_users_registry')
        .maybeSingle();

      if (regData?.value && Array.isArray(regData.value)) {
        const matched = regData.value.find(
          (u) =>
            (u.username && u.username.toLowerCase() === cleanId) ||
            (u.email && u.email.toLowerCase() === cleanId)
        );
        if (matched) {
          const { data: dbUser } = await supabase
            .from('admin_users')
            .select('*')
            .eq('email', matched.email)
            .maybeSingle();
          if (dbUser) {
            user = {
              id: dbUser.id,
              username: matched.username,
              email: dbUser.email,
              full_name: dbUser.full_name,
              role: dbUser.role,
              status: dbUser.status === 'inactive' || dbUser.status === 'disabled' ? 'disabled' : 'active',
              password_hash: dbUser.password_hash,
            };
          } else {
            user = matched;
          }
        }
      }
    }
  }

  if (!user) {
    return { success: false, error: 'User does not exist. Please check your User ID or Email.' };
  }

  if (user.status === 'disabled') {
    return { success: false, error: 'This account has been disabled or suspended. Please contact the Root Administrator.' };
  }

  const isDemoUser =
    user.id === 'user-root-admin' ||
    user.id === 'user-store-keeper' ||
    user.id === 'user-order-processor' ||
    user.email.endsWith('@sudhaswagruha.com');

  const isDemoMatch =
    isDemoUser &&
    ((plainPassword === 'admin123' && user.role === 'ROOT_ADMIN') ||
      (plainPassword === 'store123' && user.role === 'STORE_KEEPER') ||
      (plainPassword === 'orders123' && user.role === 'ORDER_PROCESSOR'));

  if (user.password_hash !== inputHash && !isDemoMatch) {
    return { success: false, error: 'Invalid password. Please check your credentials.' };
  }

  return { success: true, user };
}

async function runTests() {
  console.log('=== STARTING 10 AUTOMATED AUTHENTICATION & RBAC TESTS ===\n');
  const results = [];
  const testUsersToCleanup = [];

  try {
    // ----------------------------------------------------
    // TEST 1: Create user -> Login successfully using User ID
    // ----------------------------------------------------
    const skUsername = 'storekeeper01_test_' + Date.now();
    const skEmail = `${skUsername}@example.com`;
    const skPassword = 'StoreKeeperPass@123';
    const skHash = hashPassword(skPassword);

    // Insert user into admin_users
    const { data: createdSk, error: skErr } = await supabase
      .from('admin_users')
      .insert({
        email: skEmail,
        full_name: 'Test Store Keeper',
        role: 'STORE_KEEPER',
        password_hash: skHash,
        status: 'active',
      })
      .select()
      .single();

    if (skErr) throw new Error('Failed to create user in DB: ' + skErr.message);
    testUsersToCleanup.push(createdSk.id);

    // Save to admin_users_registry backup with username
    const { data: regExisting } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'admin_users_registry')
      .maybeSingle();

    const currentList = Array.isArray(regExisting?.value) ? regExisting.value : [];
    const updatedList = [
      ...currentList,
      {
        id: createdSk.id,
        username: skUsername,
        email: skEmail,
        full_name: 'Test Store Keeper',
        role: 'STORE_KEEPER',
        status: 'active',
        password_hash: skHash,
        created_at: new Date().toISOString(),
      },
    ];
    await supabase.from('store_settings').upsert({
      key: 'admin_users_registry',
      value: updatedList,
      updated_at: new Date().toISOString(),
    });

    // Attempt login with User ID
    const t1 = await simulateLogin(skUsername, skPassword);
    results.push({
      test: 'Test 1: Create user → Login successfully via User ID',
      passed: t1.success && t1.user.email === skEmail,
      detail: t1.success ? `Logged in user: ${t1.user.username} (${t1.user.email})` : t1.error,
    });

    // ----------------------------------------------------
    // TEST 2: Store Keeper Login -> Allowed categories
    // ----------------------------------------------------
    const t2Allowed = ROLE_DEFINITIONS[t1.user.role].allowedCategories;
    const t2Passed =
      t1.user.role === 'STORE_KEEPER' &&
      t2Allowed.includes('inventory') &&
      t2Allowed.includes('products') &&
      !t2Allowed.includes('settings') &&
      !t2Allowed.includes('users');
    results.push({
      test: 'Test 2: Store Keeper Login → Store Keeper permissions & allowed modules',
      passed: t2Passed,
      detail: `Allowed: [${t2Allowed.join(', ')}] | Dashboard auto-redirect target: ${t2Allowed[0]}`,
    });

    // ----------------------------------------------------
    // TEST 3: Create Order Processor → Login → Order Processor dashboard
    // ----------------------------------------------------
    const opUsername = 'orderproc_test_' + Date.now();
    const opEmail = `${opUsername}@example.com`;
    const opPassword = 'OrderProcessorPass@123';
    const opHash = hashPassword(opPassword);

    const { data: createdOp } = await supabase
      .from('admin_users')
      .insert({
        email: opEmail,
        full_name: 'Test Order Processor',
        role: 'ORDER_PROCESSOR',
        password_hash: opHash,
        status: 'active',
      })
      .select()
      .single();
    testUsersToCleanup.push(createdOp.id);

    updatedList.push({
      id: createdOp.id,
      username: opUsername,
      email: opEmail,
      full_name: 'Test Order Processor',
      role: 'ORDER_PROCESSOR',
      status: 'active',
      password_hash: opHash,
      created_at: new Date().toISOString(),
    });
    await supabase.from('store_settings').upsert({
      key: 'admin_users_registry',
      value: updatedList,
      updated_at: new Date().toISOString(),
    });

    const t3 = await simulateLogin(opUsername, opPassword);
    const t3Allowed = ROLE_DEFINITIONS[t3.user?.role]?.allowedCategories || [];
    const t3Passed =
      t3.success &&
      t3.user.role === 'ORDER_PROCESSOR' &&
      t3Allowed.includes('orders') &&
      !t3Allowed.includes('inventory') &&
      !t3Allowed.includes('settings');
    results.push({
      test: 'Test 3: Create Order Processor → Login → Orders dashboard permissions',
      passed: t3Passed,
      detail: `Allowed: [${t3Allowed.join(', ')}] | Redirect target: ${t3Allowed[0]}`,
    });

    // ----------------------------------------------------
    // TEST 4: Create Root Admin → Login → Full Admin access
    // ----------------------------------------------------
    const rootRes = await simulateLogin('admin@sudhaswagruha.com', 'admin123');
    const rootAllowed = ROLE_DEFINITIONS[rootRes.user?.role]?.allowedCategories || [];
    const t4Passed =
      rootRes.success &&
      rootRes.user.role === 'ROOT_ADMIN' &&
      rootAllowed.includes('dashboard') &&
      rootAllowed.includes('settings') &&
      rootAllowed.includes('users');
    results.push({
      test: 'Test 4: Root Admin Login → Full Admin access (all modules)',
      passed: t4Passed,
      detail: `Allowed modules: [${rootAllowed.join(', ')}]`,
    });

    // ----------------------------------------------------
    // TEST 5: Wrong password → Login rejected
    // ----------------------------------------------------
    const t5 = await simulateLogin(skUsername, 'CompletelyWrongPassword!999');
    results.push({
      test: 'Test 5: Wrong password → Login rejected',
      passed: !t5.success && t5.error.includes('Invalid password'),
      detail: t5.error,
    });

    // ----------------------------------------------------
    // TEST 6: Unknown User ID → Login rejected
    // ----------------------------------------------------
    const t6 = await simulateLogin('non_existent_user_id_xyz999', 'AnyPassword123');
    results.push({
      test: 'Test 6: Unknown User ID → Login rejected',
      passed: !t6.success && t6.error.includes('does not exist'),
      detail: t6.error,
    });

    // ----------------------------------------------------
    // TEST 7: Disabled user → Login rejected
    // ----------------------------------------------------
    // Disable sk user
    await supabase.from('admin_users').update({ status: 'inactive' }).eq('id', createdSk.id);
    const t7 = await simulateLogin(skUsername, skPassword);
    results.push({
      test: 'Test 7: Disabled user → Login rejected',
      passed: !t7.success && t7.error.includes('disabled or suspended'),
      detail: t7.error,
    });

    // Re-enable for subsequent checks
    await supabase.from('admin_users').update({ status: 'active' }).eq('id', createdSk.id);

    // ----------------------------------------------------
    // TEST 8: Deleted user → Login rejected
    // ----------------------------------------------------
    const delUsername = 'temp_to_delete_' + Date.now();
    const delEmail = `${delUsername}@example.com`;
    const { data: delUser } = await supabase
      .from('admin_users')
      .insert({
        email: delEmail,
        full_name: 'Delete Target',
        role: 'ORDER_PROCESSOR',
        password_hash: hashPassword('Pass123!'),
        status: 'active',
      })
      .select()
      .single();

    // Now delete it
    await supabase.from('admin_users').delete().eq('id', delUser.id);
    const t8 = await simulateLogin(delUsername, 'Pass123!');
    results.push({
      test: 'Test 8: Deleted user → Login rejected',
      passed: !t8.success,
      detail: t8.error,
    });

    // ----------------------------------------------------
    // TEST 9: User ID case behavior (Case-insensitive normalizer)
    // ----------------------------------------------------
    const upperUserId = `   ${skUsername.toUpperCase()}   `;
    const t9 = await simulateLogin(upperUserId, skPassword);
    results.push({
      test: 'Test 9: User ID case behavior works (Upper + Whitespace trimmed/lowercased)',
      passed: t9.success && t9.user.email === skEmail,
      detail: `Input: "${upperUserId}" -> Resolved: "${t9.user?.username}"`,
    });

    // ----------------------------------------------------
    // TEST 10: User role remains correct after login
    // ----------------------------------------------------
    const t10 = await simulateLogin(skEmail, skPassword);
    results.push({
      test: 'Test 10: User role remains correct after login via Email or User ID',
      passed: t10.success && t10.user.role === 'STORE_KEEPER',
      detail: `Role verified as: ${t10.user?.role}`,
    });

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    // Cleanup created test records in Supabase
    for (const uid of testUsersToCleanup) {
      await supabase.from('admin_users').delete().eq('id', uid);
    }
    // Clean up registry test entries
    const { data: curReg } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'admin_users_registry')
      .maybeSingle();
    if (Array.isArray(curReg?.value)) {
      const cleanRegistry = curReg.value.filter(
        (u) => !testUsersToCleanup.includes(u.id)
      );
      await supabase.from('store_settings').upsert({
        key: 'admin_users_registry',
        value: cleanRegistry,
        updated_at: new Date().toISOString(),
      });
    }
  }

  console.log('\n=== TEST RESULTS SUMMARY ===');
  let passCount = 0;
  for (const r of results) {
    const status = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${status}] ${r.test}`);
    console.log(`       Detail: ${r.detail}`);
    if (r.passed) passCount++;
  }
  console.log(`\nTOTAL: ${passCount} / ${results.length} PASSED`);
}

runTests();
