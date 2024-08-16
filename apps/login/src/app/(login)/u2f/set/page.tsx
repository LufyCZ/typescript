import { getBrandingSettings, sessionService } from "@/lib/zitadel";
import Alert from "@/ui/Alert";
import DynamicTheme from "@/ui/DynamicTheme";
import RegisterU2F from "@/ui/RegisterU2F";
import UserAvatar from "@/ui/UserAvatar";
import { loadMostRecentSession } from "@zitadel/next";
import { headers } from "next/headers";

export default async function Page({
  searchParams,
}: {
  searchParams: Record<string | number | symbol, string | undefined>;
}) {
  const host = headers().get("host");
  if (!host) {
    throw new Error("No host header found!");
  }

  const { loginName, organization, authRequestId } = searchParams;

  const sessionFactors = await loadMostRecentSession(sessionService, {
    loginName,
    organization,
  });

  const title = "Use your passkey to confirm it's really you";
  const description =
    "Your device will ask for your fingerprint, face, or screen lock";

  const branding = await getBrandingSettings(host, organization);

  return (
    <DynamicTheme branding={branding}>
      <div className="flex flex-col items-center space-y-4">
        <h1>{title}</h1>

        {sessionFactors && (
          <UserAvatar
            loginName={loginName ?? sessionFactors.factors?.user?.loginName}
            displayName={sessionFactors.factors?.user?.displayName}
            showDropdown
            searchParams={searchParams}
          ></UserAvatar>
        )}
        <p className="ztdl-p mb-6 block">{description}</p>

        {!sessionFactors && (
          <div className="py-4">
            <Alert>
              Could not get the context of the user. Make sure to enter the
              username first or provide a loginName as searchParam.
            </Alert>
          </div>
        )}

        {sessionFactors?.id && (
          <RegisterU2F
            sessionId={sessionFactors.id}
            organization={organization}
            authRequestId={authRequestId}
          />
        )}
      </div>
    </DynamicTheme>
  );
}
