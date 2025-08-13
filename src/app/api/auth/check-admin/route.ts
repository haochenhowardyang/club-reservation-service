import { NextRequest, NextResponse } from "next/server";
import { isUserAdmin } from "@/lib/utils/access";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { authorized: false, message: "Email is required" },
        { status: 400 }
      );
    }

    const isAdmin = await isUserAdmin(email);

    return NextResponse.json({ authorized: isAdmin });
  } catch (error) {
    console.error("Error checking admin access:", error);
    return NextResponse.json(
      { authorized: false, message: "An error occurred" },
      { status: 500 }
    );
  }
}
