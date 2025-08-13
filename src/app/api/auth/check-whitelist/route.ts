import { NextRequest, NextResponse } from "next/server";
import { isUserWhitelisted } from "@/lib/utils/access";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { authorized: false, message: "Email is required" },
        { status: 400 }
      );
    }

    const isWhitelisted = await isUserWhitelisted(email);

    return NextResponse.json({ authorized: isWhitelisted });
  } catch (error) {
    console.error("Error checking whitelist access:", error);
    return NextResponse.json(
      { authorized: false, message: "An error occurred" },
      { status: 500 }
    );
  }
}
