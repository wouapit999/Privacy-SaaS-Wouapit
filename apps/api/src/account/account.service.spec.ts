import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AccountService } from './account.service';

function make(user: any) {
  const del = jest.fn().mockResolvedValue(user);
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(user), delete: del },
  } as any;
  const identity = {} as any;
  const audit = { record: jest.fn() } as any;
  return { svc: new AccountService(prisma, identity, audit), del, audit };
}

describe('AccountService.deleteAccount', () => {
  it('erases a local account when the password matches', async () => {
    const hash = await argon2.hash('correct-horse');
    const { svc, del, audit } = make({ id: 'u1', email: 'a@b.com', passwordHash: hash });

    await expect(svc.deleteAccount('u1', 'correct-horse')).resolves.toEqual({ deleted: true });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'account.delete' }),
    );
    expect(del).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });

  it('rejects a wrong password', async () => {
    const hash = await argon2.hash('correct-horse');
    const { svc, del } = make({ id: 'u1', email: 'a@b.com', passwordHash: hash });

    await expect(svc.deleteAccount('u1', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(del).not.toHaveBeenCalled();
  });

  it('requires the DELETE confirmation for OAuth-only accounts', async () => {
    const { svc, del } = make({ id: 'u2', email: 'o@b.com', passwordHash: null });

    await expect(svc.deleteAccount('u2')).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.deleteAccount('u2', undefined, 'DELETE')).resolves.toEqual({ deleted: true });
    expect(del).toHaveBeenCalledTimes(1);
  });
});
