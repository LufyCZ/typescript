"use server";

import {
  getLoginSettings,
  getSession,
  getUserByID,
  listAuthenticationMethodTypes,
  resendEmailCode,
  resendInviteCode,
  verifyEmail,
  verifyInviteCode,
  sendEmailCode as zitadelSendEmailCode,
} from "@/lib/zitadel";
import { create } from "@zitadel/client";
import { Session } from "@zitadel/proto/zitadel/session/v2/session_pb";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { User } from "@zitadel/proto/zitadel/user/v2/user_pb";
import { headers } from "next/headers";
import { getNextUrl } from "../client";
import { getSessionCookieByLoginName } from "../cookies";
import { checkMFAFactors } from "../verify-helper";
import { createSessionAndUpdateCookie } from "./cookie";

type VerifyUserByEmailCommand = {
  userId: string;
  loginName?: string; // to determine already existing session
  organization?: string;
  code: string;
  isInvite: boolean;
  requestId?: string;
};

export async function sendVerification(command: VerifyUserByEmailCommand) {
  const verifyResponse = command.isInvite
    ? await verifyInviteCode(command.userId, command.code).catch(() => {
        return { error: "Could not verify invite" };
      })
    : await verifyEmail(command.userId, command.code).catch(() => {
        return { error: "Could not verify email" };
      });

  if ("error" in verifyResponse) {
    return verifyResponse;
  }

  if (!verifyResponse) {
    return { error: "Could not verify" };
  }

  let session: Session | undefined;
  let user: User | undefined;

  if ("loginName" in command) {
    const sessionCookie = await getSessionCookieByLoginName({
      loginName: command.loginName,
      organization: command.organization,
    }).catch((error) => {
      console.warn("Ignored error:", error);
    });

    if (!sessionCookie) {
      return { error: "Could not load session cookie" };
    }

    session = await getSession({
      sessionId: sessionCookie.id,
      sessionToken: sessionCookie.token,
    }).then((response) => {
      if (response?.session) {
        return response.session;
      }
    });

    if (!session?.factors?.user?.id) {
      return { error: "Could not create session for user" };
    }

    const userResponse = await getUserByID(session?.factors?.user?.id);

    if (!userResponse?.user) {
      return { error: "Could not load user" };
    }

    user = userResponse.user;
  } else {
    const userResponse = await getUserByID(command.userId);

    if (!userResponse || !userResponse.user) {
      return { error: "Could not load user" };
    }

    user = userResponse.user;

    const checks = create(ChecksSchema, {
      user: {
        search: {
          case: "loginName",
          value: userResponse.user.preferredLoginName,
        },
      },
    });

    session = await createSessionAndUpdateCookie(
      checks,
      undefined,
      command.requestId,
    );
  }

  if (!session?.factors?.user?.id) {
    return { error: "Could not create session for user" };
  }

  if (!session?.factors?.user?.id) {
    return { error: "Could not create session for user" };
  }

  if (!user) {
    return { error: "Could not load user" };
  }

  const loginSettings = await getLoginSettings(user.details?.resourceOwner);

  const authMethodResponse = await listAuthenticationMethodTypes(user.userId);

  if (!authMethodResponse || !authMethodResponse.authMethodTypes) {
    return { error: "Could not load possible authenticators" };
  }

  // if no authmethods are found on the user, redirect to set one up
  if (
    authMethodResponse &&
    authMethodResponse.authMethodTypes &&
    authMethodResponse.authMethodTypes.length == 0
  ) {
    const params = new URLSearchParams({
      sessionId: session.id,
    });

    if (session.factors?.user?.loginName) {
      params.set("loginName", session.factors?.user?.loginName);
    }
    return { redirect: `/authenticator/set?${params}` };
  }

  // redirect to mfa factor if user has one, or redirect to set one up
  const mfaFactorCheck = checkMFAFactors(
    session,
    loginSettings,
    authMethodResponse.authMethodTypes,
    command.organization,
    command.requestId,
  );

  if (mfaFactorCheck?.redirect) {
    return mfaFactorCheck;
  }

  // login user if no additional steps are required
  if (command.requestId && session.id) {
    const nextUrl = await getNextUrl(
      {
        sessionId: session.id,
        requestId: command.requestId,
        organization:
          command.organization ?? session.factors?.user?.organizationId,
      },
      loginSettings?.defaultRedirectUri,
    );

    return { redirect: nextUrl };
  }

  const url = await getNextUrl(
    {
      loginName: session.factors.user.loginName,
      organization: session.factors?.user?.organizationId,
    },
    loginSettings?.defaultRedirectUri,
  );

  return { redirect: url };
}

type resendVerifyEmailCommand = {
  userId: string;
  isInvite: boolean;
  requestId?: string;
};

export async function resendVerification(command: resendVerifyEmailCommand) {
  const host = (await headers()).get("host");

  return command.isInvite
    ? resendInviteCode(command.userId)
    : resendEmailCode(command.userId, host, command.requestId);
}

type sendEmailCommand = {
  userId: string;
  requestId?: string;
};

export async function sendEmailCode(command: sendEmailCommand) {
  const host = (await headers()).get("host");
  return zitadelSendEmailCode(command.userId, host, command.requestId);
}

export type SendVerificationRedirectWithoutCheckCommand = {
  organization?: string;
  requestId?: string;
} & (
  | { userId: string; loginName?: never }
  | { userId?: never; loginName: string }
);

export async function sendVerificationRedirectWithoutCheck(
  command: SendVerificationRedirectWithoutCheckCommand,
) {
  if (!("loginName" in command || "userId" in command)) {
    return { error: "No userId, nor loginname provided" };
  }

  let session: Session | undefined;
  let user: User | undefined;

  if ("loginName" in command) {
    const sessionCookie = await getSessionCookieByLoginName({
      loginName: command.loginName,
      organization: command.organization,
    }).catch((error) => {
      console.warn("Ignored error:", error);
    });

    if (!sessionCookie) {
      return { error: "Could not load session cookie" };
    }

    session = await getSession({
      sessionId: sessionCookie.id,
      sessionToken: sessionCookie.token,
    }).then((response) => {
      if (response?.session) {
        return response.session;
      }
    });

    if (!session?.factors?.user?.id) {
      return { error: "Could not create session for user" };
    }

    const userResponse = await getUserByID(session?.factors?.user?.id);

    if (!userResponse?.user) {
      return { error: "Could not load user" };
    }

    user = userResponse.user;
  } else if ("userId" in command) {
    const userResponse = await getUserByID(command.userId);

    if (!userResponse?.user) {
      return { error: "Could not load user" };
    }

    user = userResponse.user;

    const checks = create(ChecksSchema, {
      user: {
        search: {
          case: "loginName",
          value: userResponse.user.preferredLoginName,
        },
      },
    });

    session = await createSessionAndUpdateCookie(
      checks,
      undefined,
      command.requestId,
    );
  }

  if (!session?.factors?.user?.id) {
    return { error: "Could not create session for user" };
  }

  if (!session?.factors?.user?.id) {
    return { error: "Could not create session for user" };
  }

  if (!user) {
    return { error: "Could not load user" };
  }

  const authMethodResponse = await listAuthenticationMethodTypes(user.userId);

  if (!authMethodResponse || !authMethodResponse.authMethodTypes) {
    return { error: "Could not load possible authenticators" };
  }

  // if no authmethods are found on the user, redirect to set one up
  if (
    authMethodResponse &&
    authMethodResponse.authMethodTypes &&
    authMethodResponse.authMethodTypes.length == 0
  ) {
    const params = new URLSearchParams({
      sessionId: session.id,
    });

    if (session.factors?.user?.loginName) {
      params.set("loginName", session.factors?.user?.loginName);
    }
    return { redirect: `/authenticator/set?${params}` };
  }

  const loginSettings = await getLoginSettings(user.details?.resourceOwner);

  // redirect to mfa factor if user has one, or redirect to set one up
  const mfaFactorCheck = checkMFAFactors(
    session,
    loginSettings,
    authMethodResponse.authMethodTypes,
    command.organization,
    command.requestId,
  );

  if (mfaFactorCheck?.redirect) {
    return mfaFactorCheck;
  }

  // login user if no additional steps are required
  if (command.requestId && session.id) {
    const nextUrl = await getNextUrl(
      {
        sessionId: session.id,
        requestId: command.requestId,
        organization:
          command.organization ?? session.factors?.user?.organizationId,
      },
      loginSettings?.defaultRedirectUri,
    );

    return { redirect: nextUrl };
  }

  const url = await getNextUrl(
    {
      loginName: session.factors.user.loginName,
      organization: session.factors?.user?.organizationId,
    },
    loginSettings?.defaultRedirectUri,
  );

  return { redirect: url };
}
