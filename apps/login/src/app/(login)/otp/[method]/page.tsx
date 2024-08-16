import { getBrandingSettings, sessionService } from "@/lib/zitadel";
import Alert from "@/ui/Alert";
import DynamicTheme from "@/ui/DynamicTheme";
import LoginOTP from "@/ui/LoginOTP";
import UserAvatar from "@/ui/UserAvatar";
import { loadMostRecentSession } from "@zitadel/next";
import { headers } from "next/headers";

export default async function Page({
  searchParams,
  params,
}: {
  searchParams: Record<string | number | symbol, string | undefined>;
  params: Record<string | number | symbol, string | undefined>;
}) {
  const host = headers().get("X-Forwarded-Host");
  if (!host) {
    throw new Error("No host header found!");
  }

  const { loginName, authRequestId, sessionId, organization, code, submit } =
    searchParams;

  const { method } = params;

  const session = await loadMostRecentSession(sessionService, {
    loginName,
    organization,
  });

  const branding = await getBrandingSettings(host, organization);

  return (
    <DynamicTheme branding={branding}>
      <div className="flex flex-col items-center space-y-4">
        <h1>Verify 2-Factor</h1>
        {method === "time-based" && (
          <p className="ztdl-p">Enter the code from your authenticator app.</p>
        )}
        {method === "sms" && (
          <p className="ztdl-p">Enter the code you got on your phone.</p>
        )}
        {method === "email" && (
          <p className="ztdl-p">Enter the code you got via your email.</p>
        )}

        {!session && (
          <div className="py-4">
            <Alert>
              Could not get the context of the user. Make sure to enter the
              username first or provide a loginName as searchParam.
            </Alert>
          </div>
        )}

        {session && (
          <UserAvatar
            loginName={loginName ?? session.factors?.user?.loginName}
            displayName={session.factors?.user?.displayName}
            showDropdown
            searchParams={searchParams}
          ></UserAvatar>
        )}

        {method && (
          <LoginOTP
            loginName={loginName}
            sessionId={sessionId}
            authRequestId={authRequestId}
            organization={organization}
            method={method}
          ></LoginOTP>
        )}
      </div>
    </DynamicTheme>
  );
}
