import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertSubmissionObjectPath,
  createSubmissionStorageService,
} from '../server/services/submission-storage-service.js';

const VALID_PATH = 'portfolio-submissions/student-1/submission-1/resume.pdf';

function createFakeClient({
  bucket = { id: 'portfolio-submissions', public: false },
  bucketError = null,
  uploadError = null,
  downloadData = new Blob([Buffer.from('%PDF-test')], { type: 'application/pdf' }),
  downloadError = null,
  removeError = null,
} = {}) {
  const calls = [];
  return {
    calls,
    storage: {
      async getBucket(bucketName) {
        calls.push(['getBucket', bucketName]);
        return { data: bucket, error: bucketError };
      },
      from(bucketName) {
        assert.equal(bucketName, 'portfolio-submissions');
        return {
          async upload(path, buffer, options) {
            calls.push(['upload', path, buffer.length, options]);
            return { data: uploadError ? null : { path }, error: uploadError };
          },
          async download(path) {
            calls.push(['download', path]);
            return { data: downloadError ? null : downloadData, error: downloadError };
          },
          async remove(paths) {
            calls.push(['remove', paths]);
            return { data: removeError ? null : paths, error: removeError };
          },
        };
      },
    },
  };
}

function createConfiguredService(fakeClient) {
  return createSubmissionStorageService({
    env: {
      SUPABASE_STORAGE_URL: 'https://project.supabase.co',
      SUPABASE_STORAGE_SECRET_KEY: 'sb_secret_test',
      SUPABASE_STORAGE_BUCKET: 'portfolio-submissions',
    },
    createClientImpl(url, secretKey, options) {
      assert.equal(url, 'https://project.supabase.co');
      assert.equal(secretKey, 'sb_secret_test');
      assert.equal(options.auth.persistSession, false);
      return fakeClient;
    },
  });
}

test('submission storage requires server-only Supabase configuration', async () => {
  const service = createSubmissionStorageService({ env: {} });
  assert.equal(service.configReady, false);
  assert.deepEqual(await service.getReadiness(), {
    ready: false,
    status: 'admin_not_configured',
  });
});

test('submission storage accepts only a private existing bucket', async () => {
  const privateService = createConfiguredService(createFakeClient());
  assert.deepEqual(await privateService.getReadiness({ force: true }), {
    ready: true,
    status: 'ready',
  });

  const publicService = createConfiguredService(createFakeClient({
    bucket: { id: 'portfolio-submissions', public: true },
  }));
  assert.deepEqual(await publicService.getReadiness({ force: true }), {
    ready: false,
    status: 'bucket_public',
  });

  const missingService = createConfiguredService(createFakeClient({
    bucket: null,
    bucketError: { statusCode: 404, message: 'Bucket not found' },
  }));
  assert.deepEqual(await missingService.getReadiness({ force: true }), {
    ready: false,
    status: 'bucket_missing',
  });
});

test('submission storage uploads validated PDFs without upsert', async () => {
  const fakeClient = createFakeClient();
  const service = createConfiguredService(fakeClient);
  const buffer = Buffer.from('%PDF-test');

  assert.deepEqual(await service.uploadPdf({
    path: VALID_PATH,
    buffer,
    metadata: { userId: 'student-1' },
  }), { path: VALID_PATH });

  const uploadCall = fakeClient.calls.find(([name]) => name === 'upload');
  assert.deepEqual(uploadCall.slice(0, 3), ['upload', VALID_PATH, buffer.length]);
  assert.equal(uploadCall[3].contentType, 'application/pdf');
  assert.equal(uploadCall[3].upsert, false);

  await assert.rejects(
    service.uploadPdf({ path: VALID_PATH, buffer: Buffer.from('not a pdf') }),
    (error) => error.statusCode === 400 && error.code === 'invalid_file_type',
  );
});

test('submission storage downloads through the server and removes rollback files', async () => {
  const fakeClient = createFakeClient();
  const service = createConfiguredService(fakeClient);
  const file = await service.downloadPdf({ path: VALID_PATH });
  const chunks = [];
  for await (const chunk of file.stream) chunks.push(chunk);

  assert.equal(Buffer.concat(chunks).toString(), '%PDF-test');
  assert.equal(file.contentType, 'application/pdf');
  assert.equal(file.contentLength, 9);
  assert.deepEqual(await service.deleteFiles([VALID_PATH, VALID_PATH]), [VALID_PATH]);
});

test('submission storage rejects paths outside the fixed user submission layout', () => {
  assert.equal(assertSubmissionObjectPath(VALID_PATH), VALID_PATH);
  for (const path of [
    '../secret.pdf',
    'portfolio-submissions/student-1/submission-1/notes.txt',
    'portfolio-submissions/student-1/submission-1/portfolio-6.pdf',
  ]) {
    assert.throws(
      () => assertSubmissionObjectPath(path),
      (error) => error.statusCode === 400 && error.code === 'invalid_storage_path',
    );
  }
});
