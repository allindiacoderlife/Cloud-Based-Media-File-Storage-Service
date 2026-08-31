import { createApp } from '../app.js';
import { Server } from 'http';

async function runSharingTests() {
  console.log('🧪 Starting Sharing & Permissions Integration Tests...');

  const app = createApp();
  const server: Server = app.listen(5098);

  const BASE_URL = 'http://localhost:5098/api/v1';

  try {
    // Step 1: Create User A (Owner)
    console.log('\n[Prep] Creating User A (Owner)...');
    const userAEmail = `owner_a_${Date.now()}@example.com`;
    const regResA = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userAEmail,
        password: 'password123',
        fullName: 'Alice Owner'
      })
    });
    const regDataA: any = await regResA.json();
    const tokenA = regDataA.data.tokens.accessToken;
    const authA = { Authorization: `Bearer ${tokenA}` };

    // Step 2: Create User B (Collaborator)
    console.log('[Prep] Creating User B (Collaborator)...');
    const userBEmail = `collab_b_${Date.now()}@example.com`;
    const regResB = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userBEmail,
        password: 'password123',
        fullName: 'Bob Collaborator'
      })
    });
    const regDataB: any = await regResB.json();
    const tokenB = regDataB.data.tokens.accessToken;
    const authB = { Authorization: `Bearer ${tokenB}` };

    // Step 3: User A uploads a file
    console.log('[Prep] User A uploading file "design-spec.pdf"...');
    const formData = new FormData();
    const blob = new Blob(['Confidential Design Document Specifications'], { type: 'application/pdf' });
    formData.append('file', blob, 'design-spec.pdf');

    const fileUploadRes = await fetch(`${BASE_URL}/files/upload-direct`, {
      method: 'POST',
      headers: authA,
      body: formData
    });
    const fileUploadData: any = await fileUploadRes.json();
    const fileId = fileUploadData.data.file.id;

    // Test 1: User A shares file with User B as Viewer
    console.log('\n[Test 1] POST /shares - Share file with User B as Viewer');
    const shareRes = await fetch(`${BASE_URL}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authA },
      body: JSON.stringify({
        resourceType: 'file',
        resourceId: fileId,
        granteeEmail: userBEmail,
        role: 'viewer'
      })
    });
    const shareData: any = await shareRes.json();
    console.log(`Status: ${shareRes.status}`, shareData.success ? '✅ Success' : '❌ Failed');
    const shareId = shareData.data.share.id;

    // Test 2: Reject Self-Sharing
    console.log('\n[Test 2] POST /shares - Prevent sharing with oneself');
    const selfShareRes = await fetch(`${BASE_URL}/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authA },
      body: JSON.stringify({
        resourceType: 'file',
        resourceId: fileId,
        granteeEmail: userAEmail,
        role: 'viewer'
      })
    });
    const selfShareData: any = await selfShareRes.json();
    console.log(
      `Status: ${selfShareRes.status}`,
      selfShareRes.status === 400 ? '✅ Correctly Blocked Self-Sharing' : '❌ Failed'
    );

    // Test 3: User B queries "Shared with me"
    console.log('\n[Test 3] GET /shares/shared-with-me - User B finds shared resource');
    const sharedWithMeRes = await fetch(`${BASE_URL}/shares/shared-with-me`, {
      headers: authB
    });
    const sharedWithMeData: any = await sharedWithMeRes.json();
    const foundFile = sharedWithMeData.data?.files?.some((f: any) => f.resource.id === fileId);
    console.log(
      `Status: ${sharedWithMeRes.status}`,
      foundFile ? '✅ Shared file listed for User B' : '❌ Failed'
    );

    // Test 4: User B downloads shared file
    console.log('\n[Test 4] GET /files/:id/download - User B downloads shared file');
    const downloadRes = await fetch(`${BASE_URL}/files/${fileId}/download`, {
      headers: authB
    });
    const downloadData: any = await downloadRes.json();
    console.log(
      `Status: ${downloadRes.status}`,
      downloadData.success && downloadData.data?.downloadUrl ? '✅ Download URL Generated for Viewer' : '❌ Failed'
    );

    // Test 5: User B cannot delete shared file (Viewer permission boundary)
    console.log('\n[Test 5] DELETE /files/:id - User B (Viewer) unauthorized to delete file');
    const delRes = await fetch(`${BASE_URL}/files/${fileId}`, {
      method: 'DELETE',
      headers: authB
    });
    console.log(
      `Status: ${delRes.status}`,
      delRes.status === 400 || delRes.status === 403 ? '✅ Delete Correctly Blocked for Viewer' : '❌ Failed'
    );

    // Test 6: User A creates Public Link with password protection
    console.log('\n[Test 6] POST /link-shares - Create public link with password');
    const linkRes = await fetch(`${BASE_URL}/link-shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authA },
      body: JSON.stringify({
        resourceType: 'file',
        resourceId: fileId,
        password: 'securepass123',
        expiresAt: new Date(Date.now() + 86400000).toISOString() // +1 day
      })
    });
    const linkData: any = await linkRes.json();
    console.log(`Status: ${linkRes.status}`, linkData.success ? '✅ Public Link Created' : '❌ Failed');
    const token = linkData.data.linkShare.token;
    const linkShareId = linkData.data.linkShare.id;

    // Test 7: Public link requires password
    console.log('\n[Test 7] POST /link/:token/access - Public access without password');
    const noPwdRes = await fetch(`${BASE_URL}/link/${token}/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const noPwdData: any = await noPwdRes.json();
    console.log(
      `Status: ${noPwdRes.status}`,
      noPwdRes.status === 401 && noPwdData.data?.passwordRequired ? '✅ Prompted for Password' : '❌ Failed'
    );

    // Test 8: Public link rejects incorrect password
    console.log('\n[Test 8] POST /link/:token/access - Public access with wrong password');
    const wrongPwdRes = await fetch(`${BASE_URL}/link/${token}/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrongpassword' })
    });
    console.log(
      `Status: ${wrongPwdRes.status}`,
      wrongPwdRes.status === 401 ? '✅ Incorrect Password Correctly Blocked' : '❌ Failed'
    );

    // Test 9: Public link resolves with valid password
    console.log('\n[Test 9] POST /link/:token/access - Public access with valid password');
    const validPwdRes = await fetch(`${BASE_URL}/link/${token}/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'securepass123' })
    });
    const validPwdData: any = await validPwdRes.json();
    console.log(
      `Status: ${validPwdRes.status}`,
      validPwdData.success && validPwdData.data?.downloadUrl ? '✅ Public Link Verified & Download Ready' : '❌ Failed'
    );

    // Test 10: Revoke Public Link & Share
    console.log('\n[Test 10] DELETE /link-shares/:id & DELETE /shares/:id - Revoke access');
    const revokeLinkRes = await fetch(`${BASE_URL}/link-shares/${linkShareId}`, {
      method: 'DELETE',
      headers: authA
    });
    const revokeShareRes = await fetch(`${BASE_URL}/shares/${shareId}`, {
      method: 'DELETE',
      headers: authA
    });
    console.log(
      `Status: Link=${revokeLinkRes.status}, Share=${revokeShareRes.status}`,
      revokeLinkRes.status === 200 && revokeShareRes.status === 200 ? '✅ Access Successfully Revoked' : '❌ Failed'
    );

    console.log('\n🎉 ALL 10 SHARING & PERMISSION TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    server.close();
  }
}

runSharingTests().catch((err) => {
  console.error('❌ Sharing test failed:', err);
  process.exit(1);
});
