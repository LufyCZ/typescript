import {
  getBrandingSettings,
  getLoginSettings,
  getSession,
  getUserByID,
  listAuthenticationMethodTypes,
  sessionService,
} from "@/lib/zitadel";
import Alert from "@/ui/Alert";
import BackButton from "@/ui/BackButton";
import ChooseSecondFactorToSetup from "@/ui/ChooseSecondFactorToSetup";
import DynamicTheme from "@/ui/DynamicTheme";
import UserAvatar from "@/ui/UserAvatar";
import { getSessionCookieById, loadMostRecentSession } from "@zitadel/next";
import { headers } from "next/headers";

export default async function Page({
  searchParams,
}: {
  searchParams: Record<string | number | symbol, string | undefined>;
}) {
  const host = headers().get("X-Forwarded-Host");
  if (!host) {
    throw new Error("No host header found!");
  }

  const { loginName, checkAfter, authRequestId, organization, sessionId } =
    searchParams;

  const sessionWithData = sessionId
    ? await loadSessionById(host, sessionId, organization)
    : await loadSessionByLoginname(host, loginName, organization);

  async function loadSessionByLoginname(
    host: string,
    loginName?: string,
    organization?: string,
  ) {
    return loadMostRecentSession(sessionService, {
      loginName,
      organization,
    }).then((session) => {
      if (session && session.factors?.user?.id) {
        const userId = session.factors.user.id;
        return listAuthenticationMethodTypes(host, userId).then((methods) => {
          return getUserByID(host, userId).then((user) => {
            const humanUser =
              user.user?.type.case === "human"
                ? user.user?.type.value
                : undefined;

            return {
              factors: session?.factors,
              authMethods: methods.authMethodTypes ?? [],
              phoneVerified: humanUser?.phone?.isVerified ?? false,
              emailVerified: humanUser?.email?.isVerified ?? false,
            };
          });
        });
      }
    });
  }

  async function loadSessionById(
    host: string,
    sessionId: string,
    organization?: string,
  ) {
    const recent = await getSessionCookieById({ sessionId, organization });
    return getSession(host, recent.id, recent.token).then((response) => {
      if (response?.session && response.session.factors?.user?.id) {
        const userId = response.session.factors.user.id;
        return listAuthenticationMethodTypes(host, userId).then((methods) => {
          return getUserByID(host, userId).then((user) => {
            const humanUser =
              user.user?.type.case === "human"
                ? user.user?.type.value
                : undefined;
            return {
              factors: response.session?.factors,
              authMethods: methods.authMethodTypes ?? [],
              phoneVerified: humanUser?.phone?.isVerified ?? false,
              emailVerified: humanUser?.email?.isVerified ?? false,
            };
          });
        });
      }
    });
  }

  const branding = await getBrandingSettings(host, organization);
  const loginSettings = await getLoginSettings(host, organization);

  return (
    <DynamicTheme branding={branding}>
      <div className="flex flex-col items-center space-y-4">
        <h1>Set up 2-Factor</h1>

        <p className="ztdl-p">Choose one of the following second factors.</p>

        {sessionWithData && (
          <UserAvatar
            loginName={loginName ?? sessionWithData.factors?.user?.loginName}
            displayName={sessionWithData.factors?.user?.displayName}
            showDropdown
            searchParams={searchParams}
          ></UserAvatar>
        )}

        {!(loginName || sessionId) && (
          <Alert>Provide your active session as loginName param</Alert>
        )}

        {loginSettings && sessionWithData ? (
          <ChooseSecondFactorToSetup
            loginName={loginName}
            sessionId={sessionId}
            authRequestId={authRequestId}
            organization={organization}
            loginSettings={loginSettings}
            userMethods={sessionWithData.authMethods ?? []}
            phoneVerified={sessionWithData.phoneVerified ?? false}
            emailVerified={sessionWithData.emailVerified ?? false}
            checkAfter={checkAfter === "true"}
          ></ChooseSecondFactorToSetup>
        ) : (
          <Alert>No second factors available to setup.</Alert>
        )}

        <div className="mt-8 flex w-full flex-row items-center">
          <BackButton />
          <span className="flex-grow"></span>
        </div>
      </div>
    </DynamicTheme>
  );
}
