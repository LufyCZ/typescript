import { Session } from "@zitadel/proto/zitadel/session/v2/session_pb";
import { LoginSettings } from "@zitadel/proto/zitadel/settings/v2/login_settings_pb";
import { HumanUser } from "@zitadel/proto/zitadel/user/v2/user_pb";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

export function checkPasswordChangeRequired(
  session: Session,
  humanUser: HumanUser | undefined,
  organization?: string,
  requestId?: string,
) {
  if (humanUser?.passwordChangeRequired) {
    const params = new URLSearchParams({
      loginName: session.factors?.user?.loginName as string,
    });

    if (organization || session.factors?.user?.organizationId) {
      params.append(
        "organization",
        session.factors?.user?.organizationId as string,
      );
    }

    if (requestId) {
      params.append("requestId", requestId);
    }

    return { redirect: "/password/change?" + params };
  }
}

export function checkInvite(
  session: Session,
  humanUser?: HumanUser,
  organization?: string,
  requestId?: string,
) {
  if (!humanUser?.email?.isVerified) {
    const paramsVerify = new URLSearchParams({
      loginName: session.factors?.user?.loginName as string,
      userId: session.factors?.user?.id as string, // verify needs user id
      invite: "true", // TODO: check - set this to true as we dont expect old email verification method here
    });

    if (organization || session.factors?.user?.organizationId) {
      paramsVerify.append(
        "organization",
        organization ?? (session.factors?.user?.organizationId as string),
      );
    }

    if (requestId) {
      paramsVerify.append("requestId", requestId);
    }

    return { redirect: "/verify?" + paramsVerify };
  }
}

export function checkEmailVerification(
  session: Session,
  humanUser?: HumanUser,
  organization?: string,
  requestId?: string,
) {
  if (
    !humanUser?.email?.isVerified &&
    process.env.EMAIL_VERIFICATION === "true"
  ) {
    const params = new URLSearchParams({
      loginName: session.factors?.user?.loginName as string,
    });

    if (requestId) {
      params.append("requestId", requestId);
    }

    if (organization || session.factors?.user?.organizationId) {
      params.append(
        "organization",
        organization ?? (session.factors?.user?.organizationId as string),
      );
    }

    return { redirect: `/verify?` + params };
  }
}

export function checkMFAFactors(
  session: Session,
  loginSettings: LoginSettings | undefined,
  authMethods: AuthenticationMethodType[],
  organization?: string,
  requestId?: string,
) {
  const availableMultiFactors = authMethods?.filter(
    (m: AuthenticationMethodType) =>
      m !== AuthenticationMethodType.PASSWORD &&
      m !== AuthenticationMethodType.PASSKEY,
  );

  const hasAuthenticatedWithPasskey =
    session.factors?.webAuthN?.verifiedAt &&
    session.factors?.webAuthN?.userVerified;

  // escape further checks if user has authenticated with passkey
  if (hasAuthenticatedWithPasskey) {
    return;
  }

  // if user has not authenticated with passkey and has only one additional mfa factor, redirect to that
  if (availableMultiFactors?.length == 1) {
    const params = new URLSearchParams({
      loginName: session.factors?.user?.loginName as string,
    });

    if (requestId) {
      params.append("requestId", requestId);
    }

    if (organization || session.factors?.user?.organizationId) {
      params.append(
        "organization",
        organization ?? (session.factors?.user?.organizationId as string),
      );
    }

    const factor = availableMultiFactors[0];
    // if passwordless is other method, but user selected password as alternative, perform a login
    if (factor === AuthenticationMethodType.TOTP) {
      return { redirect: `/otp/time-based?` + params };
    } else if (factor === AuthenticationMethodType.OTP_SMS) {
      return { redirect: `/otp/sms?` + params };
    } else if (factor === AuthenticationMethodType.OTP_EMAIL) {
      return { redirect: `/otp/email?` + params };
    } else if (factor === AuthenticationMethodType.U2F) {
      return { redirect: `/u2f?` + params };
    }
  } else if (availableMultiFactors?.length > 1) {
    const params = new URLSearchParams({
      loginName: session.factors?.user?.loginName as string,
    });

    if (requestId) {
      params.append("requestId", requestId);
    }

    if (organization || session.factors?.user?.organizationId) {
      params.append(
        "organization",
        organization ?? (session.factors?.user?.organizationId as string),
      );
    }

    return { redirect: `/mfa?` + params };
  } else if (
    (loginSettings?.forceMfa || loginSettings?.forceMfaLocalOnly) &&
    !availableMultiFactors.length
  ) {
    const params = new URLSearchParams({
      loginName: session.factors?.user?.loginName as string,
      force: "true", // this defines if the mfa is forced in the settings
      checkAfter: "true", // this defines if the check is directly made after the setup
    });

    if (requestId) {
      params.append("requestId", requestId);
    }

    if (organization || session.factors?.user?.organizationId) {
      params.append(
        "organization",
        organization ?? (session.factors?.user?.organizationId as string),
      );
    }

    // TODO: provide a way to setup passkeys on mfa page?
    return { redirect: `/mfa/set?` + params };
  }

  // TODO: implement passkey setup

  //  else if (
  //   submitted.factors &&
  //   !submitted.factors.webAuthN && // if session was not verified with a passkey
  //   promptPasswordless && // if explicitly prompted due policy
  //   !isAlternative // escaped if password was used as an alternative method
  // ) {
  //   const params = new URLSearchParams({
  //     loginName: submitted.factors.user.loginName,
  //     prompt: "true",
  //   });

  //   if (requestId) {
  //     params.append("requestId", requestId);
  //   }

  //   if (organization) {
  //     params.append("organization", organization);
  //   }

  //   return router.push(`/passkey/set?` + params);
  // }
}
