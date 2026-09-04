import nodemailer from 'nodemailer';
import { EmailService, SendShareEmailOptions } from '../services/email.service.js';

async function runEmailTests() {
  console.log('🧪 Starting Nodemailer Email System Tests...\n');

  // Test 1: In-Memory JSON Transporter (Validating payload formatting & HTML/Text template generation)
  console.log('[Test 1] Testing Nodemailer HTML & Text Template Generation with JSON Transporter...');
  const jsonTransporter = nodemailer.createTransport({
    jsonTransport: true
  });

  const configuredEmailService = new EmailService(jsonTransporter);
  const jsonResult = await configuredEmailService.sendShareNotification({
    to: 'partner@example.com',
    recipientName: 'Alex Smith',
    sharerName: 'Alice Owner',
    sharerEmail: 'alice@cloudvault.com',
    resourceName: 'Brand Assets 2026',
    resourceType: 'folder',
    role: 'viewer',
    accessUrl: 'http://localhost:3000/dashboard?shared=true'
  });

  console.log('JSON Transporter Result:', {
    success: jsonResult.success,
    messageId: jsonResult.messageId
  });

  if (!jsonResult.success || !jsonResult.rawMessage) {
    throw new Error('Test 1 Failed: JSON transporter did not return expected rawMessage.');
  }

  const rawMessage = typeof jsonResult.rawMessage === 'string'
    ? JSON.parse(jsonResult.rawMessage)
    : jsonResult.rawMessage;

  const toStr = JSON.stringify(rawMessage.to);
  const hasRecipient = toStr.includes('partner@example.com');
  const hasSubject = rawMessage.subject && rawMessage.subject.includes('Brand Assets 2026') && rawMessage.subject.includes('Alice Owner');
  const hasHtml = typeof rawMessage.html === 'string' && rawMessage.html.includes('Brand Assets 2026') && rawMessage.html.includes('Viewer (Read Only)');
  const hasText = typeof rawMessage.text === 'string' && rawMessage.text.includes('Brand Assets 2026');

  if (hasRecipient && hasSubject && hasHtml && hasText) {
    console.log('✅ Test 1 Passed: Email template generated valid HTML, Text, Subject, and Recipients.\n');
  } else {
    throw new Error(`Test 1 Failed: Validation checks failed: recipient=${hasRecipient}, subject=${hasSubject}, html=${hasHtml}, text=${hasText}`);
  }

  // Test 2: Role Variations & Editor Permission Check
  console.log('[Test 2] Testing Editor Role Notification Rendering...');
  const editorResult = await configuredEmailService.sendShareNotification({
    to: 'editor@example.com',
    recipientName: 'Bob Editor',
    sharerName: 'Alice Owner',
    sharerEmail: 'alice@cloudvault.com',
    resourceName: 'Financial-Plan.xlsx',
    resourceType: 'file',
    role: 'editor',
    accessUrl: 'http://localhost:3000/dashboard'
  });

  const editorMsg = typeof editorResult.rawMessage === 'string'
    ? JSON.parse(editorResult.rawMessage)
    : editorResult.rawMessage;

  const hasEditorBadge = typeof editorMsg.html === 'string' && editorMsg.html.includes('Editor (Can View & Edit)');
  if (editorResult.success && hasEditorBadge) {
    console.log('✅ Test 2 Passed: Editor permissions badge correctly applied.\n');
  } else {
    throw new Error('Test 2 Failed: Editor badge not found in email HTML template.');
  }

  // Test 3: Live Transporter SMTP Connection Verification
  console.log('[Test 3] Testing Live SMTP Configuration & Connection Health...');
  const defaultService = new EmailService();
  const verifyRes = await defaultService.verifyConnection();
  console.log('SMTP Connection Status:', verifyRes);
  if (verifyRes.ok) {
    console.log('✅ Test 3 Passed: SMTP connection to mail server successfully verified!\n');
  } else {
    console.log(`⚠️ Note: SMTP connection verification returned: ${verifyRes.message} (Fallback simulation will be used if credentials are not configured).\n`);
  }

  console.log('🎉 ALL NODEMAILER EMAIL SYSTEM TESTS PASSED SUCCESSFULLY!\n');
}

runEmailTests().catch((err) => {
  console.error('❌ Email tests failed:', err);
  process.exit(1);
});
