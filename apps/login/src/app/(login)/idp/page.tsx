import { DynamicTheme } from "@/components/dynamic-theme";
import { SignInWithIdp } from "@/components/sign-in-with-idp";
import { getActiveIdentityProviders, getBrandingSettings } from "@/lib/zitadel";

export default async function Page({
  searchParams,
}: {
  searchParams: Record<string | number | symbol, string | undefined>;
}) {
  const authRequestId = searchParams?.authRequestId;
  const organization = searchParams?.organization;

  const identityProviders = await getActiveIdentityProviders(organization);

  const host = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const branding = await getBrandingSettings(organization);

  return (
    <DynamicTheme branding={branding}>
      <div className="flex flex-col items-center space-y-4">
        <h1>Sign in with SSO</h1>
        <p className="ztdl-p">
          Select one of the following providers to sign in
        </p>

        {identityProviders && (
          <SignInWithIdp
            host={host}
            identityProviders={identityProviders}
            authRequestId={authRequestId}
            organization={organization}
          ></SignInWithIdp>
        )}
      </div>
    </DynamicTheme>
  );
}
