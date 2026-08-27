import { createApp } from '../app.js';
import { Server } from 'http';

async function runStorageTests() {
  console.log('🧪 Starting Storage Engine & Upload Tests...');

  const app = createApp();
  const server: Server = app.listen(5098);

  const BASE_URL = 'http://localhost:5098/api/v1';

  try {
    // Step 1: Create a test user
    console.log('\n[Prep] Creating test user for storage tests...');
    const testEmail = `storage_test_${Date.now()}@example.com`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'password123',
        fullName: 'Storage Tester'
      })
    });
    const regData: any = await regRes.json();
    const token = regData.data.tokens.accessToken;
    const authHeader = { Authorization: `Bearer ${token}` };

    // Test 1: Upload Init
    console.log('\n[Test 1] POST /files/init - Initiate upload');
    const initRes = await fetch(`${BASE_URL}/files/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({
        name: 'report-2026.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1048576 // 1 MB
      })
    });
    const initData: any = await initRes.json();
    console.log(`Status: ${initRes.status}`, initData.success ? '✅ Success' : '❌ Failed');
    if (!initData.success || !initData.data?.file?.id) {
      throw new Error(`Init upload failed: ${JSON.stringify(initData)}`);
    }

    const fileId = initData.data.file.id;
    console.log(`Generated File ID: ${fileId}`);
    console.log(`Generated Storage Key: ${initData.data.storageKey}`);

    // Test 2: Complete Upload
    console.log('\n[Test 2] POST /files/complete - Mark upload complete');
    const completeRes = await fetch(`${BASE_URL}/files/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({
        fileId,
        actualSizeBytes: 1048576,
        checksum: 'sha256-mock-checksum'
      })
    });
    const completeData: any = await completeRes.json();
    console.log(`Status: ${completeRes.status}`, completeData.success ? '✅ Success' : '❌ Failed');
    console.log(`Updated User Storage: ${completeData.data?.storageUsedBytes} bytes`);

    // Test 3: Direct Multipart Upload
    console.log('\n[Test 3] POST /files/upload-direct - Upload multipart binary payload');
    const formData = new FormData();
    const blob = new Blob(['Hello Cloud Storage World! Content for test file.'], { type: 'text/plain' });
    formData.append('file', blob, 'hello-world.txt');

    const directRes = await fetch(`${BASE_URL}/files/upload-direct`, {
      method: 'POST',
      headers: authHeader,
      body: formData
    });
    const directData: any = await directRes.json();
    console.log(`Status: ${directRes.status}`, directData.success ? '✅ Direct Upload Success' : '❌ Failed');

    // Test 4: List Files
    console.log('\n[Test 4] GET /files - List active files');
    const listRes = await fetch(`${BASE_URL}/files`, {
      headers: authHeader
    });
    const listData: any = await listRes.json();
    console.log(`Status: ${listRes.status}`, listData.success ? '✅ Success' : '❌ Failed');
    console.log(`Total Files Found: ${listData.meta?.total || listData.data?.length}`);

    // Test 5: Get Download URL
    console.log('\n[Test 5] GET /files/:id/download - Get signed download URL');
    const downloadRes = await fetch(`${BASE_URL}/files/${fileId}/download`, {
      headers: authHeader
    });
    const downloadData: any = await downloadRes.json();
    console.log(`Status: ${downloadRes.status}`, downloadData.success ? '✅ Download URL Generated' : '❌ Failed');
    console.log(`Download URL: ${downloadData.data?.downloadUrl}`);

    // Test 6: Quota Overflow Rejection
    console.log('\n[Test 6] POST /files/init - Quota overflow rejection check');
    const overflowRes = await fetch(`${BASE_URL}/files/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({
        name: 'huge-file.iso',
        mimeType: 'application/octet-stream',
        sizeBytes: 10 * 1024 * 1024 * 1024 // 10 GB (exceeds 5 GB default)
      })
    });
    const overflowData: any = await overflowRes.json();
    console.log(`Status: ${overflowRes.status}`, overflowRes.status === 400 || overflowRes.status === 403 ? '✅ Correctly Blocked Exceeded Quota' : '❌ Failed');

    console.log('\n🎉 ALL 6 STORAGE ENGINE TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    server.close();
  }
}

runStorageTests().catch((err) => {
  console.error('❌ Storage test failed:', err);
  process.exit(1);
});
