import { SavedTest, StudentRecord, StudentSubmission } from '../types';

export const GOOGLE_APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'uploadImage') {
      var folderName = 'KhmerTestGenerator_Images';
      var folders = DriveApp.getFoldersByName(folderName);
      var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

      var base64 = data.base64.split(',').pop();
      var decoded = Utilities.base64Decode(base64);
      var blob = Utilities.newBlob(decoded, data.mimeType || 'image/jpeg', data.fileName || ('answer_' + Date.now() + '.jpg'));
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      var fileId = file.getId();
      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        fileId: fileId,
        viewUrl: 'https://drive.google.com/file/d/' + fileId + '/view',
        imageUrl: 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1200'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'appendSubmission') {
      var sheet = ss.getSheetByName('ពិន្ទុសិស្ស') || ss.insertSheet('ពិន្ទុសិស្ស');
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['អត្តលេខ', 'ឈ្មោះសិស្ស', 'ថ្នាក់', 'ប្រចាំខែ', 'មុខវិជ្ជា', 'វិញ្ញាសា', 'ពិន្ទុ', 'ចម្លើយត្រូវ', 'សំណួរសរុប', 'រូបភាព Drive', 'កាលបរិច្ឆេទ']);
      }
      var s = data.submission;
      sheet.appendRow([
        s.student_id, s.student_name, s.grade, s.exam_month || '', s.subject,
        s.test_title, s.score, s.correct_count, s.total_questions,
        (data.imageLinks || []).join(' | '), s.submitted_at || new Date().toISOString()
      ]);
      return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'syncAll') {
      // 1. Sync Submissions
      var subSheet = ss.getSheetByName('ពិន្ទុសិស្ស') || ss.insertSheet('ពិន្ទុសិស្ស');
      subSheet.clear();
      subSheet.appendRow(['អត្តលេខ', 'ឈ្មោះសិស្ស', 'ថ្នាក់', 'ប្រចាំខែ', 'មុខវិជ្ជា', 'វិញ្ញាសា', 'ពិន្ទុ', 'ចម្លើយត្រូវ', 'សំណួរសរុប', 'រូបភាព Drive', 'កាលបរិច្ឆេទ']);
      (data.submissions || []).forEach(function(s) {
        var links = [];
        if (s.answers) {
          Object.keys(s.answers).forEach(function(k) {
            if (k.indexOf('__img') !== -1 && typeof s.answers[k] === 'string' && s.answers[k].indexOf('http') === 0) {
              links.push(s.answers[k]);
            }
          });
        }
        subSheet.appendRow([
          s.student_id, s.student_name, s.grade, s.exam_month || '', s.subject,
          s.test_title, s.score, s.correct_count, s.total_questions,
          links.join(' | '), s.submitted_at || ''
        ]);
      });

      // 2. Sync Students
      var stSheet = ss.getSheetByName('បញ្ជីឈ្មោះសិស្ស') || ss.insertSheet('បញ្ជីឈ្មោះសិស្ស');
      stSheet.clear();
      stSheet.appendRow(['អត្តលេខ', 'ឈ្មោះ', 'ភេទ', 'ថ្នាក់', 'សាលា']);
      (data.students || []).forEach(function(st) {
        stSheet.appendRow([st.student_id, st.student_name, st.gender || '', st.grade, st.school_name || '']);
      });

      // 3. Sync Tests
      var tSheet = ss.getSheetByName('ឃ្លាំងវិញ្ញាសា') || ss.insertSheet('ឃ្លាំងវិញ្ញាសា');
      tSheet.clear();
      tSheet.appendRow(['ចំណងជើង', 'ថ្នាក់', 'ប្រចាំខែ', 'មុខវិជ្ជា', 'គ្រូបង្រៀន', 'រយៈពេល(នាទី)', 'ចំនួនសំណួរ', 'បើកប្រឡង']);
      (data.tests || []).forEach(function(t) {
        tSheet.appendRow([t.title, t.grade, t.exam_month || '', t.subject, t.teacher_name || '', t.duration, (t.questions || []).length, t.is_published ? 'បើក' : 'បិទ']);
      });

      return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Unknown action' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

export async function uploadImageToGoogleDrive(
  webhookUrl: string,
  base64DataUrl: string,
  fileName: string
): Promise<{ imageUrl: string; viewUrl: string }> {
  const res = await fetch(webhookUrl.trim(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'uploadImage',
      base64: base64DataUrl,
      mimeType: 'image/jpeg',
      fileName,
    }),
  });
  const json = await res.json();
  if (!json?.ok || !json?.imageUrl) {
    throw new Error(json?.error || 'មិនអាចផ្ទុករូបភាពទៅ Google Drive បានទេ');
  }
  return { imageUrl: json.imageUrl, viewUrl: json.viewUrl || json.imageUrl };
}

export async function appendSubmissionToGoogleSheet(
  webhookUrl: string,
  submission: StudentSubmission,
  imageLinks: string[]
): Promise<void> {
  await fetch(webhookUrl.trim(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'appendSubmission',
      submission,
      imageLinks,
    }),
  });
}

export async function syncAllToGoogleSheet(
  webhookUrl: string,
  payload: {
    submissions: StudentSubmission[];
    students: StudentRecord[];
    tests: SavedTest[];
  }
): Promise<void> {
  const res = await fetch(webhookUrl.trim(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'syncAll',
      ...payload,
    }),
  });
  const json = await res.json();
  if (!json?.ok) {
    throw new Error(json?.error || 'មិនអាចបញ្ជូនទិន្នន័យទៅ Google Sheet បានទេ');
  }
}
