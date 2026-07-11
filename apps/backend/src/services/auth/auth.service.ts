import { Injectable, Logger } from '@nestjs/common';
import { Provider, User } from '@prisma/client';
import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { LoginUserDto } from '@gitroom/nestjs-libraries/dtos/auth/login.user.dto';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { AuthService as AuthChecker } from '@gitroom/helpers/auth/auth.service';
import { AuthProviderManager } from '@gitroom/backend/services/auth/providers/providers.manager';
import dayjs from 'dayjs';
import { NotificationService } from '@gitroom/nestjs-libraries/database/prisma/notifications/notification.service';
import { ForgotReturnPasswordDto } from '@gitroom/nestjs-libraries/dtos/auth/forgot-return.password.dto';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';
import { NewsletterService } from '@gitroom/nestjs-libraries/newsletter/newsletter.service';
import { normalizeEmail } from '@gitroom/helpers/utils/email.normalize';
import disposableDomains from 'disposable-email-domains';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import {
  authEmails,
  EmailLang,
} from '@gitroom/backend/services/auth/auth.emails';
import {
  isPwnedPassword,
  PWNED_PASSWORD_MESSAGE,
} from '@gitroom/backend/services/auth/pwned.passwords';
import { randomBytes } from 'crypto';

// Per-account login lockout (brute-force defense, independent of IP throttling).
const MAX_LOGIN_FAILURES = 10;
const LOGIN_LOCKOUT_WINDOW_SECONDS = 15 * 60;

@Injectable()
export class AuthService {
  constructor(
    private _userService: UsersService,
    private _organizationService: OrganizationService,
    private _notificationService: NotificationService,
    private _emailService: EmailService,
    private _providerManager: AuthProviderManager
  ) {}
  async canRegister(provider: string) {
    if (
      process.env.DISABLE_REGISTRATION !== 'true' ||
      provider === Provider.GENERIC
    ) {
      return true;
    }

    return (await this._organizationService.getCount()) === 0;
  }

  async routeAuth(
    provider: Provider,
    body: CreateOrgUserDto | LoginUserDto,
    ip: string,
    userAgent: string,
    addToOrg?: boolean | { orgId: string; role: 'USER' | 'ADMIN'; id: string },
    lang: EmailLang = 'en'
  ) {
    if (provider === Provider.LOCAL) {
      if (body instanceof CreateOrgUserDto) {
        body.email = body.email.toLowerCase();

        const domain = body.email.split('@')[1];
        if (domain && disposableDomains.includes(domain)) {
          throw new Error('Temporary email addresses are not allowed');
        }

        const normalized = normalizeEmail(body.email);
        const existingNormalized = await this._userService.getUserByNormalizedEmail(normalized);
        if (existingNormalized) {
          throw new Error('Email already exists');
        }

        if (body.password && (await isPwnedPassword(body.password))) {
          throw new Error(PWNED_PASSWORD_MESSAGE);
        }
      }
      const user = await this._userService.getUserByEmail(body.email);
      if (body instanceof CreateOrgUserDto) {
        if (user) {
          throw new Error('Email already exists');
        }

        if (!(await this.canRegister(provider))) {
          throw new Error('Registration is disabled');
        }

        const create = await this._organizationService.createOrgAndUser(
          body,
          ip,
          userAgent
        );

        const addedOrg =
          addToOrg && typeof addToOrg !== 'boolean'
            ? await this._organizationService.addUserToOrg(
                create.users[0].user.id,
                addToOrg.id,
                addToOrg.orgId,
                addToOrg.role
              )
            : false;

        const obj = { addedOrg, jwt: await this.jwt(create.users[0].user) };
        const activation = authEmails.activation[lang];
        await this._emailService.sendEmail(
          body.email,
          activation.subject,
          activation.html(
            `${process.env.FRONTEND_URL}/auth/activate/${obj.jwt}`
          ),
          'top'
        );
        return obj;
      }

      const failuresKey = `login_failures:${body.email.toLowerCase()}`;
      const failures = Number((await ioRedis.get(failuresKey)) || 0);
      if (failures >= MAX_LOGIN_FAILURES) {
        throw new Error(
          'Too many failed login attempts. Please try again in a few minutes.'
        );
      }

      if (!user || !AuthChecker.comparePassword(body.password, user.password)) {
        const total = await ioRedis.incr(failuresKey);
        if (total === 1) {
          await ioRedis.expire(failuresKey, LOGIN_LOCKOUT_WINDOW_SECONDS);
        }
        throw new Error('Invalid user name or password');
      }

      if (!user.activated) {
        throw new Error('User is not activated');
      }

      await ioRedis.del(failuresKey);
      return { addedOrg: false, jwt: await this.jwt(user) };
    }

    const user = await this.loginOrRegisterProvider(
      provider,
      body as CreateOrgUserDto,
      ip,
      userAgent
    );

    const addedOrg =
      addToOrg && typeof addToOrg !== 'boolean'
        ? await this._organizationService.addUserToOrg(
            user.id,
            addToOrg.id,
            addToOrg.orgId,
            addToOrg.role
          )
        : false;
    return { addedOrg, jwt: await this.jwt(user) };
  }

  public getOrgFromCookie(cookie?: string) {
    if (!cookie) {
      return false;
    }

    try {
      const getOrg: any = AuthChecker.verifyJWT(cookie);
      if (dayjs(getOrg.timeLimit).isBefore(dayjs())) {
        return false;
      }

      return getOrg as {
        email: string;
        role: 'USER' | 'ADMIN';
        orgId: string;
        id: string;
      };
    } catch (err) {
      return false;
    }
  }

  private async loginOrRegisterProvider(
    provider: Provider,
    body: CreateOrgUserDto,
    ip: string,
    userAgent: string
  ) {
    const providerInstance = this._providerManager.getProvider(provider);
    const providerUser = await providerInstance.getUser(body.providerToken);

    if (!providerUser) {
      throw new Error('Invalid provider token');
    }

    const user = await this._userService.getUserByProvider(
      providerUser.id,
      provider
    );
    if (user) {
      return user;
    }

    if (!(await this.canRegister(provider))) {
      throw new Error('Registration is disabled');
    }

    const create = await this._organizationService.createOrgAndUser(
      {
        company: body.company,
        email: providerUser.email,
        password: '',
        provider,
        providerId: providerUser.id,
        datafast_visitor_id: body.datafast_visitor_id,
        region: body.region,
      },
      ip,
      userAgent
    );

    this._track('register', providerUser.email, body.datafast_visitor_id).catch(
      (err) => {}
    );

    await NewsletterService.register(providerUser.email);

    try {
      if (providerInstance?.postRegistration) {
        await providerInstance.postRegistration(body.providerToken, create.id);
      }
    } catch (err) {
      // Don't fail registration if postRegistration fails
    }

    return create.users[0].user;
  }

  private async _track(
    name: string,
    email: string,
    datafast_visitor_id: string
  ) {
    if (email && datafast_visitor_id && process.env.DATAFAST_API_KEY) {
      try {
        await fetch('https://datafa.st/api/v1/goals', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.DATAFAST_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            datafast_visitor_id: datafast_visitor_id,
            name: name,
            metadata: {
              email,
            },
          }),
        });
      } catch (err) {}
    }
  }

  async forgot(email: string, lang: EmailLang = 'en') {
    const user = await this._userService.getUserByEmail(email);
    if (!user || user.providerName !== Provider.LOCAL) {
      return false;
    }

    const resetValues = AuthChecker.signJWT({
      id: user.id,
      expires: dayjs().add(20, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
    });

    const reset = authEmails.resetPassword[lang];
    await this._notificationService.sendEmail(
      user.email,
      reset.subject,
      reset.html(`${process.env.FRONTEND_URL}/auth/forgot/${resetValues}`)
    );
  }

  async forgotReturn(body: ForgotReturnPasswordDto) {
    const user = AuthChecker.verifyJWT(body.token) as {
      id: string;
      expires: string;
    };
    if (dayjs(user.expires).isBefore(dayjs())) {
      return false;
    }

    if (await isPwnedPassword(body.password)) {
      throw new Error(PWNED_PASSWORD_MESSAGE);
    }

    return this._userService.updatePassword(user.id, body.password);
  }

  async activate(code: string, tracking: string) {
    const user = AuthChecker.verifyJWT(code) as {
      id: string;
      activated: boolean;
      email: string;
    };
    if (user.id && !user.activated) {
      const getUserAgain = await this._userService.getUserByEmail(user.email);
      if (getUserAgain.activated) {
        return false;
      }
      await this._userService.activateUser(user.id);
      this._track('register', user.email, tracking).catch((err) => {});
      await NewsletterService.register(user.email);
      // Sign the DB user, not the decoded activation token — the decoded
      // payload carries exp/iat and jsonwebtoken refuses to re-sign it
      // with expiresIn (every activation 500ed since signJWT got a TTL).
      return this.jwt({ ...getUserAgain, activated: true });
    }

    return false;
  }

  async resendActivationEmail(email: string, lang: EmailLang = 'en') {
    const user = await this._userService.getUserByEmail(email);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.activated) {
      throw new Error('Account is already activated');
    }

    const jwt = await this.jwt(user);

    const activation = authEmails.activation[lang];
    await this._emailService.sendEmail(
      user.email,
      activation.subject,
      activation.html(`${process.env.FRONTEND_URL}/auth/activate/${jwt}`),
      'top'
    );

    return true;
  }

  // CSRF state: random value stored in Redis at link time, consumed exactly
  // once in checkExists. The `auth-` prefix is what the frontend social
  // callback page uses to tell a login redirect from a channel-connect one.
  async oauthLink(provider: string, query?: any) {
    const state = `auth-${randomBytes(16).toString('hex')}`;
    await ioRedis.set(`auth-state:${state}`, '1', 'EX', 600);
    const providerInstance = this._providerManager.getProvider(provider);
    return providerInstance.generateLink(query, state);
  }

  async checkExists(
    provider: string,
    code: string,
    redirectUri?: string,
    state?: string
  ) {
    const stateKey = state ? `auth-state:${state}` : '';
    if (!stateKey || !(await ioRedis.get(stateKey))) {
      throw new Error('Invalid or expired state');
    }
    await ioRedis.del(stateKey);

    const providerInstance = this._providerManager.getProvider(provider);
    const token = await providerInstance.getToken(code, redirectUri);
    const user = await providerInstance.getUser(token);
    if (!user) {
      throw new Error('Invalid user');
    }
    const checkExists = await this._userService.getUserByProvider(
      user.id,
      provider as Provider
    );
    if (checkExists) {
      return { jwt: await this.jwt(checkExists) };
    }

    return { token };
  }

  private async jwt(user: User) {
    if (user.password) {
      delete user.password;
    }
    return AuthChecker.signJWT(user);
  }
}
