import { IdentityService } from './identity.service';

/**
 * Focused test for OAuth-as-ownership-proof matching. We stub the collaborators
 * so we can exercise verifyViaOAuthMatch without a DB.
 */
function makeService(identity: any, updateSpy = jest.fn()) {
  const prisma = {
    verifiedIdentity: {
      findUnique: jest.fn().mockResolvedValue(identity),
      update: updateSpy.mockResolvedValue({ ...identity, verifiedAt: new Date() }),
    },
  } as any;
  const crypto = {
    // For EMAIL, valueEncrypted is 'enc:<cipher>'; return the claimed address.
    decrypt: jest.fn().mockReturnValue('claim@example.com'),
  } as any;
  const verification = {} as any;
  return { svc: new IdentityService(prisma, crypto, verification), updateSpy };
}

const emailIdentity = {
  id: 'i1',
  userId: 'u1',
  type: 'EMAIL',
  displayValue: 'cl****@example.com',
  valueEncrypted: 'enc:abc',
  verifiedAt: null,
};

describe('IdentityService.verifyViaOAuthMatch', () => {
  it('verifies an EMAIL identity when the provider email matches', async () => {
    const { svc, updateSpy } = makeService(emailIdentity);
    const res = await svc.verifyViaOAuthMatch('u1', 'i1', {
      email: 'Claim@Example.com',
      name: null,
    });
    expect(res).toEqual({ verified: true, reason: 'matched' });
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ method: 'OAUTH' }) }),
    );
  });

  it('does not verify when the provider email differs', async () => {
    const { svc, updateSpy } = makeService(emailIdentity);
    const res = await svc.verifyViaOAuthMatch('u1', 'i1', {
      email: 'someone-else@example.com',
      name: null,
    });
    expect(res.verified).toBe(false);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('rejects proof for identity types these providers cannot attest', async () => {
    const domainIdentity = { ...emailIdentity, type: 'DOMAIN', valueEncrypted: 'example.com' };
    const { svc } = makeService(domainIdentity);
    const res = await svc.verifyViaOAuthMatch('u1', 'i1', { email: 'x@example.com', name: null });
    expect(res.verified).toBe(false);
    expect(res.reason).toMatch(/cannot be proven/);
  });
});
