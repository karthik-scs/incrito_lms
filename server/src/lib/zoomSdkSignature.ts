import jwt from "jsonwebtoken";

/**
 * Zoom Meeting SDK's web auth signature — a short-lived HS256 JWT signed with the Meeting SDK
 * app's secret (NOT the Server-to-Server OAuth client secret; Zoom treats these as separate app
 * types). `mn` is the numeric meeting number, `role` is 1 for host, 0 for attendee.
 */
export function generateMeetingSdkSignature(sdkKey: string, sdkSecret: string, meetingNumber: string, role: 0 | 1) {
  const iat = Math.round(Date.now() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;
  return jwt.sign({ sdkKey, mn: meetingNumber, role, iat, exp, tokenExp: exp }, sdkSecret, {
    algorithm: "HS256",
    header: { alg: "HS256", typ: "JWT" },
  });
}
