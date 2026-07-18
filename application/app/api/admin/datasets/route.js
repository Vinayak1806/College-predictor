import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Admin dataset upload should store the official file, run extraction, validate records, and require approval before publishing."
  });
}

