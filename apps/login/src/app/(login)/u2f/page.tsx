import { getBrandingSettings, getSession, sessionService } from "@/lib/zitadel";
import Alert from "@/ui/Alert";
import DynamicTheme from "@/ui/DynamicTheme";
import LoginPasskey from "@/ui/LoginPasskey";
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

  const { loginName, authRequestId, sessionId, organization } = searchParams;

  const branding = await getBrandingSettings(host, organization);

  const sessionFactors = sessionId
    ? await loadSessionById(host, sessionId, organization)
    : await loadMostRecentSession(sessionService(host), {
        loginName,
        organization,
      });

  async function loadSessionById(
    host: string,
    sessionId: string,
    organization?: string,
  ) {
    const recent = await getSessionCookieById({ sessionId, organization });
    return getSession(host, recent.id, recent.token).then((response) => {
      if (response?.session) {
        return response.session;
      }
    });
  }

  return (
    <DynamicTheme branding={branding}>
      <div className="flex flex-col items-center space-y-4">
        <h1>Verify 2-Factor</h1>

        {sessionFactors && (
          <UserAvatar
            loginName={loginName ?? sessionFactors.factors?.user?.loginName}
            displayName={sessionFactors.factors?.user?.displayName}
            showDropdown
            searchParams={searchParams}
          ></UserAvatar>
        )}
        <p className="ztdl-p mb-6 block">
          Verify your account with your device.
        </p>

        {!(loginName || sessionId) && (
          <Alert>Provide your active session as loginName param</Alert>
        )}

        {(loginName || sessionId) && (
          <LoginPasskey
            loginName={loginName}
            sessionId={sessionId}
            authRequestId={authRequestId}
            altPassword={false}
            organization={organization}
            login={false} // this sets the userVerificationRequirement to discouraged as its used as second factor
          />
        )}
      </div>
    </DynamicTheme>
  );
}
