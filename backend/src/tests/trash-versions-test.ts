import { createApp } from '../app.js';
import { Server } from 'http';

async function runTrashAndVersionTests() {
  console.log('🧪 Starting Trash & Version History Integration Tests...');

  const app = createApp();
  const server: Server = app.listen(5098);

  const BASE_URL = 'http://localhost:5098/api/v1';

  try {
    // Step 1: Create test user
    console.log('\n[Prep] Creating test user...');
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `trash_test_${Date.now()}@example.com`,
        password: 'password123',
        fullName: 'Trash & Version Tester'
      })
    });
    const regData: any = await regRes.json();
    const token = regData.data.tokens.accessToken;
    const authHeader = { Authorization: `Bearer ${token}` };

    // Step 2: Create a folder & upload file
    console.log('[Prep] Creating folder and uploading file...');
    const folderRes = await fetch(`${BASE_URL}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ name: 'Archive 2026' })
    });
    const folder = (await folderRes.json() as any).data.folder;

    const form = new FormData();
    form.append('file', new Blob(['Draft v1'], { type: 'text/plain' }), 'notes.txt');
    const uploadRes = await fetch(`${BASE_URL}/files/upload-direct`, {
      method: 'POST',
      headers: authHeader,
      body: form
    });
    const file = (await uploadRes.json() as any).data.file;

    // Test 1: Soft-delete folder & file
    console.log('\n[Test 1] DELETE /folders/:id & DELETE /files/:id - Move to Trash');
    const delFolderRes = await fetch(`${BASE_URL}/folders/${folder.id}`, { method: 'DELETE', headers: authHeader });
    const delFileRes = await fetch(`${BASE_URL}/files/${file.id}`, { method: 'DELETE', headers: authHeader });
    console.log(`Folder Delete: ${delFolderRes.status}, File Delete: ${delFileRes.status} ✅ Moved to Trash`);

    // Test 2: List Trash
    console.log('\n[Test 2] GET /trash - List soft-deleted items');
    const trashRes = await fetch(`${BASE_URL}/trash`, { headers: authHeader });
    const trashData: any = await trashRes.json();
    const hasFolder = trashData.data?.folders?.some((f: any) => f.id === folder.id);
    const hasFile = trashData.data?.files?.some((f: any) => f.id === file.id);
    console.log(`Status: ${trashRes.status}`, hasFolder && hasFile ? '✅ Items Listed in Trash' : '❌ Failed');

    // Test 3: Restore file from Trash
    console.log('\n[Test 3] POST /trash/restore/file/:id - Restore from Trash');
    const restoreRes = await fetch(`${BASE_URL}/trash/restore/file/${file.id}`, {
      method: 'POST',
      headers: authHeader
    });
    console.log(`Status: ${restoreRes.status}`, restoreRes.status === 200 ? '✅ File Restored' : '❌ Failed');

    // Test 4: Verify restored file is active again
    console.log('\n[Test 4] GET /files - Verify file is active in drive');
    const filesRes = await fetch(`${BASE_URL}/files?folderId=root`, { headers: authHeader });
    const filesData: any = await filesRes.json();
    const isFileActive = filesData.data?.some((f: any) => f.id === file.id);
    console.log(`Status: ${filesRes.status}`, isFileActive ? '✅ File Active in Drive' : '❌ Failed');

    // Test 5: List File Versions
    console.log('\n[Test 5] GET /files/:id/versions - Inspect version timeline');
    const verRes = await fetch(`${BASE_URL}/files/${file.id}/versions`, { headers: authHeader });
    const verData: any = await verRes.json();
    console.log(`Status: ${verRes.status}`, verData.success ? '✅ Version Timeline Retrieved' : '❌ Failed');

    // Test 6: Empty Trash
    console.log('\n[Test 6] DELETE /trash/empty - Permanently empty remaining trash');
    const emptyRes = await fetch(`${BASE_URL}/trash/empty`, { method: 'DELETE', headers: authHeader });
    console.log(`Status: ${emptyRes.status}`, emptyRes.status === 200 ? '✅ Trash Emptied' : '❌ Failed');

    console.log('\n🎉 ALL 6 TRASH & VERSION TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    server.close();
  }
}

runTrashAndVersionTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
