import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  registerBiometricCredential, 
  authenticateWithBiometrics, 
  removeBiometricCredential, 
  isBiometricEnrolledForUser,
  getEnrolledBiometricProfiles
} from '../biometricAuth';

describe('Biometric Authentication Security Lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('Scenario 1: Enroll -> Authenticate -> Remove -> Re-Attempt MUST FAIL', async () => {
    const email = 'student@hteim.edu';
    const userId = 'usr_101';
    const userName = 'Student Alpha';

    // 1. Enroll biometric
    const enrollRes = await registerBiometricCredential(userId, email, userName);
    expect(enrollRes.success).toBe(true);

    // Verify profile enrolled
    expect(isBiometricEnrolledForUser(email)).toBe(true);
    const profiles = getEnrolledBiometricProfiles();
    expect(profiles.length).toBe(1);
    expect(profiles[0].email).toBe(email);

    // 2. Biometric login succeeds
    const authRes = await authenticateWithBiometrics(email);
    expect(authRes.success).toBe(true);
    expect(authRes.profile?.email).toBe(email);

    // 3. Remove biometric credential (unenroll)
    removeBiometricCredential(email);
    expect(isBiometricEnrolledForUser(email)).toBe(false);

    // 4. Attempt biometric login MUST FAIL
    const reAuthRes = await authenticateWithBiometrics(email);
    expect(reAuthRes.success).toBe(false);
    expect(reAuthRes.error).toBeDefined();
  });

  it('Scenario 2: Device A -> Enroll; Device B -> Attempt Biometric Login MUST NOT inherit Device A credentials', async () => {
    const email = 'teacher@hteim.edu';

    // 1. Device A: Enroll biometric
    await registerBiometricCredential('usr_202', email, 'Teacher Beta');
    expect(isBiometricEnrolledForUser(email)).toBe(true);

    // 2. Simulate Device B (fresh device with separate local storage)
    localStorage.clear();

    // 3. Device B attempt biometric login MUST FAIL
    expect(isBiometricEnrolledForUser(email)).toBe(false);
    const deviceBAuth = await authenticateWithBiometrics(email);
    expect(deviceBAuth.success).toBe(false);
    expect(deviceBAuth.error).toContain('No biometric credentials enrolled on this device');
  });

  it('Scenario 3: Device Biometric Changed / WebAuthn Hardware Invalidation MUST FAIL & Require Re-Authentication', async () => {
    const email = 'admin@hteim.edu';

    // 1. Enroll biometric
    await registerBiometricCredential('usr_303', email, 'Admin User');
    expect(isBiometricEnrolledForUser(email)).toBe(true);

    // 2. Mock WebAuthn navigator.credentials.get throwing InvalidStateError (biometric changed on OS level)
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.PublicKeyCredential = class {};
      // @ts-ignore
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = vi.fn().mockResolvedValue(true);

      const mockGet = vi.fn().mockRejectedValue({
        name: 'InvalidStateError',
        message: 'The authenticator credential was modified or revoked on this device.'
      });

      // @ts-ignore
      window.navigator.credentials = {
        get: mockGet,
        create: vi.fn()
      };
    }

    // 3. Authenticate attempt when biometric credential changed MUST FAIL
    const authResult = await authenticateWithBiometrics(email);
    expect(authResult.success).toBe(false);
    expect(authResult.error).toContain('changed or invalidated');
  });
});
