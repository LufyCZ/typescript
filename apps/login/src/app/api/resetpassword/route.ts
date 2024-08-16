import { listUsers, passwordReset } from "@/lib/zitadel";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (body) {
    const { loginName, organization } = body;
    return listUsers(request.nextUrl.host, loginName, organization).then(
      (users) => {
        if (
          users.details &&
          Number(users.details.totalResult) == 1 &&
          users.result[0].userId
        ) {
          const userId = users.result[0].userId;

          return passwordReset(request.nextUrl.host, userId)
            .then((resp) => {
              return NextResponse.json(resp);
            })
            .catch((error) => {
              return NextResponse.json(error, { status: 500 });
            });
        } else {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 },
          );
        }
      },
    );
  }
}
