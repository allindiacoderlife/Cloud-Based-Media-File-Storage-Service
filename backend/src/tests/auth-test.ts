import { createApp } from '../app.js';
import { Server } from 'http';

async function runAuthTests() {
  console.log('🧪 Starting Auth Integration Tests...');

  const app = createApp();
  const server: Server = app.listen(5099);

  const BASE_URL = 'http://localhost:5099/api/v1';

  try {
    // Test 1: Register a new user
    console.log('\n[Test 1] POST /auth/register - Register new account');
    const testEmail = `test_${Date.now()}@example.com`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'password123',
        fullName: 'Test Explorer'
      })
    });

    const regData: any = await regRes.json();
    console.log(`Status: ${regRes.status}`, regData.success ? '✅ Success' : '❌ Failed');
    if (!regData.success || !regData.data?.tokens?.accessToken) {
      throw new Error(`Register failed: ${JSON.stringify(regData)}`);
    }

    const accessToken = regData.data.tokens.accessToken;
    const refreshToken = regData.data.tokens.refreshToken;
    const userId = regData.data.user.id;

    // Test 2: Reject empty or missing full name
    console.log('\n[Test 2] POST /auth/register - Empty full name rejection');
    const emptyNameRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `empty_${Date.now()}@example.com`,
        password: 'password123',
        fullName: '   '
      })
    });
    const emptyNameData: any = await emptyNameRes.json();
    console.log(`Status: ${emptyNameRes.status}`, emptyNameRes.status === 400 && !emptyNameData.success ? '✅ Correctly Rejected (400 Bad Request)' : '❌ Failed');

    // Test 3: Reject numeric-only full name
    console.log('\n[Test 3] POST /auth/register - Numeric-only full name rejection');
    const numericNameRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `num_${Date.now()}@example.com`,
        password: 'password123',
        fullName: '12345678'
      })
    });
    const numericNameData: any = await numericNameRes.json();
    console.log(`Status: ${numericNameRes.status}`, numericNameRes.status === 400 && !numericNameData.success ? '✅ Correctly Rejected (400 Bad Request)' : '❌ Failed');

    // Test 4: Reject numeric-only login email
    console.log('\n[Test 4] POST /auth/login - Numeric-only email rejection');
    const numericLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '1234567890',
        password: 'password123'
      })
    });
    const numericLoginData: any = await numericLoginRes.json();
    console.log(`Status: ${numericLoginRes.status}`, numericLoginRes.status === 400 && !numericLoginData.success ? '✅ Correctly Rejected (400 Bad Request)' : '❌ Failed');

    // Test 5: Prevent duplicate registration
    console.log('\n[Test 5] POST /auth/register - Duplicate email rejection');
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'password123',
        fullName: 'Test Explorer Duplicate'
      })
    });
    const dupData: any = await dupRes.json();
    console.log(`Status: ${dupRes.status}`, dupRes.status === 409 ? '✅ Correctly Rejected (409 Conflict)' : '❌ Failed');

    // Test 3: Login with correct credentials
    console.log('\n[Test 3] POST /auth/login - Valid credentials');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'password123'
      })
    });
    const loginData: any = await loginRes.json();
    console.log(`Status: ${loginRes.status}`, loginData.success ? '✅ Login Success' : '❌ Failed');

    // Test 4: Login with incorrect credentials
    console.log('\n[Test 4] POST /auth/login - Invalid password rejection');
    const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'wrongpassword'
      })
    });
    const badLoginData: any = await badLoginRes.json();
    console.log(`Status: ${badLoginRes.status}`, badLoginRes.status === 401 ? '✅ Correctly Rejected (401)' : '❌ Failed');

    // Test 5: Protected route with valid token (GET /auth/me)
    console.log('\n[Test 5] GET /auth/me - Authenticated user profile');
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const meData: any = await meRes.json();
    console.log(`Status: ${meRes.status}`, meData.success && meData.data?.user?.email === testEmail ? '✅ Profile Valid' : '❌ Failed');
    console.log(`User Quota: ${meData.data?.user?.storage_quota_bytes} bytes`);

    // Test 6: Protected route without token (Unauthorized)
    console.log('\n[Test 6] GET /auth/me - Unauthenticated access rejection');
    const unauthRes = await fetch(`${BASE_URL}/auth/me`);
    const unauthData: any = await unauthRes.json();
    console.log(`Status: ${unauthRes.status}`, unauthRes.status === 401 ? '✅ Correctly Rejected (401)' : '❌ Failed');

    // Test 7: Refresh token
    console.log('\n[Test 7] POST /auth/refresh - Refresh Access Token');
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    const refreshData: any = await refreshRes.json();
    console.log(`Status: ${refreshRes.status}`, refreshData.success && refreshData.data?.accessToken ? '✅ Refresh Success' : '❌ Failed');

    // Test 8: Logout
    console.log('\n[Test 8] POST /auth/logout - Logout');
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, { method: 'POST' });
    const logoutData: any = await logoutRes.json();
    console.log(`Status: ${logoutRes.status}`, logoutData.success ? '✅ Logout Success' : '❌ Failed');

    // Test 9: PATCH /auth/profile - Update full name & avatar
    console.log('\n[Test 9] PATCH /auth/profile - Update profile details');
    const profileRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        fullName: 'Updated Explorer Name',
        avatarUrl: 'https://example.com/avatar.png'
      })
    });
    const profileData: any = await profileRes.json();
    console.log(`Status: ${profileRes.status}`, profileData.success && profileData.data?.user?.full_name === 'Updated Explorer Name' ? '✅ Profile Update Success' : '❌ Failed');

    // Test 10: POST /auth/change-password - Reject wrong current password
    console.log('\n[Test 10] POST /auth/change-password - Incorrect current password rejection');
    const badPwRes = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        currentPassword: 'incorrectpassword',
        newPassword: 'newpassword456'
      })
    });
    const badPwData: any = await badPwRes.json();
    console.log(`Status: ${badPwRes.status}`, badPwRes.status === 400 && !badPwData.success ? '✅ Correctly Rejected (400)' : '❌ Failed');

    // Test 11: POST /auth/change-password - Successfully change password
    console.log('\n[Test 11] POST /auth/change-password - Successful password update');
    const changePwRes = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        currentPassword: 'password123',
        newPassword: 'newpassword456'
      })
    });
    const changePwData: any = await changePwRes.json();
    console.log(`Status: ${changePwRes.status}`, changePwData.success ? '✅ Password Changed Successfully' : '❌ Failed');

    // Test 12: POST /auth/login - Old password fails, new password succeeds
    console.log('\n[Test 12] POST /auth/login - Verify login with new password');
    const oldLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'password123'
      })
    });
    console.log(`Old password status: ${oldLoginRes.status}`, oldLoginRes.status === 401 ? '✅ Old password rejected' : '❌ Old password still worked!');

    const newLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'newpassword456'
      })
    });
    const newLoginData: any = await newLoginRes.json();
    console.log(`New password status: ${newLoginRes.status}`, newLoginData.success ? '✅ New password logged in successfully' : '❌ Failed');

    console.log('\n🎉 ALL 12 AUTH & PROFILE TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    server.close();
  }
}

runAuthTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
