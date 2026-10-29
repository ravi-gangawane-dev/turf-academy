import { expect, test } from '@playwright/test';
import { login } from './helpers';
import { readFile } from 'node:fs/promises';

test('recovery screens fit mobile and explain invalid links and mismatched passwords', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/auth/reset-password?error=access_denied&error_code=otp_expired');
  await expect(page.getByRole('alert')).toContainText('invalid or has expired');
  await page.getByLabel('New password', { exact: true }).fill('NewPass123!');
  await page.getByLabel('Confirm password').fill('Different123!');
  await page.getByRole('button', { name: 'Update password', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Passwords do not match');
  await page.getByRole('link', { name: 'Request a new reset link' }).click();
  await expect(page).toHaveURL(/forgot-password/);
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
  ).toBeLessThanOrEqual(1);
});

test('mobile QR scanner explains denied camera permission and retains manual entry', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: async () => {
        throw new DOMException('Permission denied', 'NotAllowedError');
      },
    });
  });
  await login(page);
  await page.goto('/attendance/qr');
  await page.getByRole('button', { name: 'Start Camera', exact: true }).click();
  await expect(
    page
      .getByText(
        'Camera access was denied or blocked. Allow camera permission in your browser settings or enter the code manually.',
        { exact: true },
      )
      .first(),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start Camera', exact: true })).toBeEnabled();
  await page.getByLabel('Student QR code', { exact: true }).fill('not-an-enrolled-student');
  await page.getByRole('button', { name: 'Identify student', exact: true }).click();
  await expect(
    page.getByText('No active enrolled student matches this QR code.', { exact: true }).first(),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
  ).toBeLessThanOrEqual(1);
});

test('QR scanner explains when no compatible camera is available', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: async () => {
        throw new DOMException('No camera found', 'NotFoundError');
      },
    });
  });
  await login(page);
  await page.goto('/attendance/qr');
  await page.getByRole('button', { name: 'Start Camera', exact: true }).click();
  await expect(
    page
      .getByText(
        'No compatible camera was found. Connect or enable a camera, or enter the code manually.',
        { exact: true },
      )
      .first(),
  ).toBeVisible();
  await expect(page.getByLabel('Student QR code', { exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Start Camera', exact: true })).toBeEnabled();
});

test('camera stream decodes a QR code and identifies the matching student', async ({ page }) => {
  const qr = `data:image/png;base64,${(await readFile('docs/qa-camera-student-qr.png')).toString('base64')}`;
  await page.addInitScript((qr) => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: async (constraints: MediaStreamConstraints) => {
        (window as Window & { __qrCameraFacingMode?: unknown }).__qrCameraFacingMode = (
          constraints.video as MediaTrackConstraints | undefined
        )?.facingMode;
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const context = canvas.getContext('2d')!;
        const image = new Image();
        image.src = qr;
        await image.decode();
        const draw = () => {
          context.fillStyle = 'white';
          context.fillRect(0, 0, 640, 480);
          context.drawImage(image, 230, 150, 180, 180);
        };
        context.fillStyle = 'white';
        context.fillRect(0, 0, 640, 480);
        const stream = canvas.captureStream(10);
        const track = stream.getVideoTracks()[0];
        (window as Window & { __qrCameraTrack?: MediaStreamTrack }).__qrCameraTrack = track;
        const revealQr = setTimeout(() => {
          draw();
          const interval = setInterval(draw, 100);
          track.addEventListener('ended', () => clearInterval(interval), { once: true });
        }, 500);
        track.addEventListener('ended', () => clearTimeout(revealQr), { once: true });
        return stream;
      },
    });
  }, qr);
  await login(page);
  await page.goto('/attendance/qr');
  await page.getByRole('button', { name: 'Start Camera', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __qrCameraFacingMode?: unknown }).__qrCameraFacingMode,
      ),
    )
    .toBe('user');
  await expect(page.getByRole('button', { name: 'Stop Camera', exact: true })).toBeVisible();
  await expect(page.getByText('Identified', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: /QA Camera Test Student/ })).toBeVisible();
  await expect(page.locator('.scan-result').filter({ hasText: 'Identified' })).toContainText(
    'QA-CAMERA-STUDENT',
  );
  await expect(page.getByRole('button', { name: 'Start Camera', exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as Window & { __qrCameraTrack?: MediaStreamTrack }).__qrCameraTrack?.readyState,
    ),
  ).toBe('ended');
});

test('camera stream is released if the scanner page closes during startup', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: async () => {
        (window as Window & { __qrCameraRequested?: boolean }).__qrCameraRequested = true;
        await new Promise((resolve) => setTimeout(resolve, 500));
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const stream = canvas.captureStream(10);
        const track = stream.getVideoTracks()[0];
        (window as Window & { __qrCameraTrack?: MediaStreamTrack }).__qrCameraTrack = track;
        return stream;
      },
    });
  });
  await login(page);
  await page.goto('/attendance/qr');
  await page.getByRole('button', { name: 'Start Camera', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __qrCameraRequested?: boolean }).__qrCameraRequested,
      ),
    )
    .toBe(true);
  await page.getByRole('link', { name: 'Dashboard', exact: true }).first().click();
  await expect(page).toHaveURL(/dashboard/);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __qrCameraTrack?: MediaStreamTrack }).__qrCameraTrack?.readyState,
      ),
    )
    .toBe('ended');
});
