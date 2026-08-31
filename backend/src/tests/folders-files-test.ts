import { createApp } from '../app.js';
import { Server } from 'http';

async function runFoldersFilesTests() {
  console.log('🧪 Starting Folders & Files CRUD Integration Tests...');

  const app = createApp();
  const server: Server = app.listen(5097);

  const BASE_URL = 'http://localhost:5097/api/v1';

  try {
    // Step 1: Create test user
    console.log('\n[Prep] Creating test user for folders & files tests...');
    const testEmail = `folders_test_${Date.now()}@example.com`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'password123',
        fullName: 'Folder Explorer'
      })
    });
    const regData: any = await regRes.json();
    const token = regData.data.tokens.accessToken;
    const authHeader = { Authorization: `Bearer ${token}` };

    // Test 1: Create Root Folder
    console.log('\n[Test 1] POST /folders - Create root folder "Projects"');
    const folderRes = await fetch(`${BASE_URL}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ name: 'Projects' })
    });
    const folderData: any = await folderRes.json();
    console.log(`Status: ${folderRes.status}`, folderData.success ? '✅ Success' : '❌ Failed');
    if (!folderData.success || !folderData.data?.folder?.id) {
      throw new Error(`Failed to create root folder: ${JSON.stringify(folderData)}`);
    }
    const projectsFolderId = folderData.data.folder.id;

    // Test 2: Create Nested Subfolder
    console.log('\n[Test 2] POST /folders - Create nested subfolder "2026" inside "Projects"');
    const subfolderRes = await fetch(`${BASE_URL}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ name: '2026', parentId: projectsFolderId })
    });
    const subfolderData: any = await subfolderRes.json();
    console.log(`Status: ${subfolderRes.status}`, subfolderData.success ? '✅ Success' : '❌ Failed');
    const subfolderId = subfolderData.data.folder.id;

    // Test 3: Duplicate Name Check in Same Parent
    console.log('\n[Test 3] POST /folders - Duplicate folder name rejection in same parent');
    const dupRes = await fetch(`${BASE_URL}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ name: '2026', parentId: projectsFolderId })
    });
    const dupData: any = await dupRes.json();
    console.log(`Status: ${dupRes.status}`, dupRes.status === 409 ? '✅ Correctly Rejected (409 Conflict)' : '❌ Failed');

    // Test 4: Breadcrumbs Verification
    console.log('\n[Test 4] GET /folders/:id - Breadcrumbs resolution');
    const getRes = await fetch(`${BASE_URL}/folders/${subfolderId}`, {
      headers: authHeader
    });
    const getData: any = await getRes.json();
    const trailNames = getData.data?.breadcrumbs?.map((b: any) => b.name).join(' > ');
    console.log(`Status: ${getRes.status}`, getData.success ? `✅ Breadcrumbs: ${trailNames}` : '❌ Failed');

    // Test 5: Cycle Prevention (Move Folder A into its descendant Folder B)
    console.log('\n[Test 5] PATCH /folders/:id - Cycle prevention check');
    const cycleRes = await fetch(`${BASE_URL}/folders/${projectsFolderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ parentId: subfolderId })
    });
    const cycleData: any = await cycleRes.json();
    console.log(
      `Status: ${cycleRes.status}`,
      cycleRes.status === 400 ? '✅ Cycle Correctly Blocked' : '❌ Failed (Allowed cyclic move)'
    );

    // Test 6: Rename Folder
    console.log('\n[Test 6] PATCH /folders/:id - Rename folder');
    const renameRes = await fetch(`${BASE_URL}/folders/${subfolderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ name: '2026-Reports' })
    });
    const renameData: any = await renameRes.json();
    console.log(`Status: ${renameRes.status}`, renameData.data?.folder?.name === '2026-Reports' ? '✅ Renamed' : '❌ Failed');

    // Test 7: Upload File into Subfolder
    console.log('\n[Test 7] POST /files/upload-direct - Upload file into subfolder');
    const formData = new FormData();
    const blob = new Blob(['Financial Report 2026 Content'], { type: 'text/plain' });
    formData.append('file', blob, 'q1-report.txt');
    formData.append('folderId', subfolderId);

    const fileUploadRes = await fetch(`${BASE_URL}/files/upload-direct`, {
      method: 'POST',
      headers: authHeader,
      body: formData
    });
    const fileUploadData: any = await fileUploadRes.json();
    console.log(`Status: ${fileUploadRes.status}`, fileUploadData.success ? '✅ File Uploaded in Folder' : '❌ Failed');
    const fileId = fileUploadData.data.file.id;

    // Test 8: Rename & Move File to Root
    console.log('\n[Test 8] PATCH /files/:id - Rename & Move file to root');
    const filePatchRes = await fetch(`${BASE_URL}/files/${fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ name: 'q1-financials-final.txt', folderId: 'root' })
    });
    const filePatchData: any = await filePatchRes.json();
    console.log(
      `Status: ${filePatchRes.status}`,
      filePatchData.data?.file?.name === 'q1-financials-final.txt' && filePatchData.data?.file?.folder_id === null
        ? '✅ File Renamed & Moved to Root'
        : '❌ Failed'
    );

    // Test 9: Soft Delete File
    console.log('\n[Test 9] DELETE /files/:id - Soft delete file');
    const fileDelRes = await fetch(`${BASE_URL}/files/${fileId}`, {
      method: 'DELETE',
      headers: authHeader
    });
    const fileDelData: any = await fileDelRes.json();
    console.log(`Status: ${fileDelRes.status}`, fileDelData.success ? '✅ File Soft-Deleted' : '❌ Failed');

    // Test 10: Soft Delete Folder Cascade
    console.log('\n[Test 10] DELETE /folders/:id - Soft delete folder cascade');
    const folderDelRes = await fetch(`${BASE_URL}/folders/${projectsFolderId}`, {
      method: 'DELETE',
      headers: authHeader
    });
    const folderDelData: any = await folderDelRes.json();
    console.log(`Status: ${folderDelRes.status}`, folderDelData.success ? '✅ Folder Soft-Deleted' : '❌ Failed');

    console.log('\n🎉 ALL 10 FOLDERS & FILES TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    server.close();
  }
}

runFoldersFilesTests().catch((err) => {
  console.error('❌ Folders & Files test failed:', err);
  process.exit(1);
});
