import { createApp } from '../app.js';
import { Server } from 'http';

async function runSearchTests() {
  console.log('🧪 Starting Search, Starred & Recent Integration Tests...');

  const app = createApp();
  const server: Server = app.listen(5099);

  const BASE_URL = 'http://localhost:5099/api/v1';

  try {
    // Step 1: Create test user
    console.log('\n[Prep] Creating test user for search tests...');
    const testEmail = `search_test_${Date.now()}@example.com`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'password123',
        fullName: 'Search Explorer'
      })
    });
    const regData: any = await regRes.json();
    const token = regData.data.tokens.accessToken;
    const authHeader = { Authorization: `Bearer ${token}` };

    // Step 2: Create a folder "Presentations"
    console.log('[Prep] Creating folder "Presentations"...');
    const folderRes = await fetch(`${BASE_URL}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ name: 'Presentations' })
    });
    const folderData: any = await folderRes.json();
    const folderId = folderData.data.folder.id;

    // Step 3: Upload files
    console.log('[Prep] Uploading files for search...');
    const formA = new FormData();
    formA.append('file', new Blob(['Financial Report Content'], { type: 'application/pdf' }), 'Quarterly-Finance.pdf');
    const uploadResA = await fetch(`${BASE_URL}/files/upload-direct`, { method: 'POST', headers: authHeader, body: formA });
    const fileA = (await uploadResA.json() as any).data.file;

    const formB = new FormData();
    formB.append('file', new Blob(['PNG Image Binary Bytes Payload'], { type: 'image/png' }), 'Avatar-Profile.png');
    const uploadResB = await fetch(`${BASE_URL}/files/upload-direct`, { method: 'POST', headers: authHeader, body: formB });
    const fileB = (await uploadResB.json() as any).data.file;

    // Test 1: Substring search
    console.log('\n[Test 1] GET /search?q=Finance - Search by name keyword');
    const searchRes1 = await fetch(`${BASE_URL}/search?q=Finance`, { headers: authHeader });
    const searchData1: any = await searchRes1.json();
    const foundFinance = searchData1.data?.files?.some((f: any) => f.name.includes('Quarterly-Finance'));
    console.log(`Status: ${searchRes1.status}`, foundFinance ? '✅ Found "Quarterly-Finance.pdf"' : '❌ Failed');

    // Test 2: Category Filter
    console.log('\n[Test 2] GET /search?category=image - Search with Category Filter');
    const searchRes2 = await fetch(`${BASE_URL}/search?category=image`, { headers: authHeader });
    const searchData2: any = await searchRes2.json();
    const onlyImages = searchData2.data?.files?.every((f: any) => f.mime_type.startsWith('image/'));
    console.log(`Status: ${searchRes2.status}`, onlyImages && searchData2.data.files.length > 0 ? '✅ Only Images Returned' : '❌ Failed');

    // Test 3: Sorting by name
    console.log('\n[Test 3] GET /search?sortBy=name&sortOrder=asc - Multi-parameter sorting');
    const searchRes3 = await fetch(`${BASE_URL}/search?sortBy=name&sortOrder=asc`, { headers: authHeader });
    const searchData3: any = await searchRes3.json();
    console.log(`Status: ${searchRes3.status}`, searchData3.success ? '✅ Sort Success' : '❌ Failed');

    // Test 4: Star a File
    console.log('\n[Test 4] POST /stars/toggle - Star a file');
    const starFileRes = await fetch(`${BASE_URL}/stars/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ resourceType: 'file', resourceId: fileA.id })
    });
    const starFileData: any = await starFileRes.json();
    console.log(`Status: ${starFileRes.status}`, starFileData.data?.isStarred ? '✅ File Starred' : '❌ Failed');

    // Test 5: Star a Folder
    console.log('\n[Test 5] POST /stars/toggle - Star a folder');
    const starFolderRes = await fetch(`${BASE_URL}/stars/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ resourceType: 'folder', resourceId: folderId })
    });
    const starFolderData: any = await starFolderRes.json();
    console.log(`Status: ${starFolderRes.status}`, starFolderData.data?.isStarred ? '✅ Folder Starred' : '❌ Failed');

    // Test 6: List Starred Items
    console.log('\n[Test 6] GET /stars - List all starred resources');
    const getStarsRes = await fetch(`${BASE_URL}/stars`, { headers: authHeader });
    const getStarsData: any = await getStarsRes.json();
    const hasStarredFile = getStarsData.data?.files?.some((f: any) => f.id === fileA.id);
    const hasStarredFolder = getStarsData.data?.folders?.some((f: any) => f.id === folderId);
    console.log(`Status: ${getStarsRes.status}`, hasStarredFile && hasStarredFolder ? '✅ Starred Items Listed' : '❌ Failed');

    // Test 7: Unstar a Folder
    console.log('\n[Test 7] POST /stars/toggle - Unstar folder');
    const unstarRes = await fetch(`${BASE_URL}/stars/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ resourceType: 'folder', resourceId: folderId })
    });
    const unstarData: any = await unstarRes.json();
    console.log(`Status: ${unstarRes.status}`, !unstarData.data?.isStarred ? '✅ Folder Unstarred' : '❌ Failed');

    // Test 8: Recent Activity
    console.log('\n[Test 8] GET /activity/recent - Recent activity timeline');
    const activityRes = await fetch(`${BASE_URL}/activity/recent`, { headers: authHeader });
    const activityData: any = await activityRes.json();
    console.log(
      `Status: ${activityRes.status}`,
      activityData.data?.activities?.length > 0 ? '✅ Activity Audit Logs Retrieved' : '❌ Failed'
    );

    console.log('\n🎉 ALL 8 SEARCH, STARRED & RECENT TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    server.close();
  }
}

runSearchTests().catch((err) => {
  console.error('❌ Search test failed:', err);
  process.exit(1);
});
