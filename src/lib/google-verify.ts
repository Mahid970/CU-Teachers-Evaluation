import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { STUDENT_EMAIL_RE } from "./student-id";

/**
 * Verifies a Google ID token and returns nothing but the student ID.
 *
 * The email never leaves this function: callers get the 8 digits they need to
 * work out a department, and nothing that identifies a person is written down.
 */

const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const HOSTED_DOMAIN = "std.cu.ac.bd";

export class VerificationError extends Error {}

export async function studentIdFromIdToken(
  idToken: string,
  clientId: string,
): Promise<string> {
  let payload;
  try {
    ({ payload } = await jwtVerify(idToken, JWKS, {
      issuer: ISSUERS,
      audience: clientId,
      maxTokenAge: "10 minutes",
    }));
  } catch {
    throw new VerificationError("That sign-in could not be verified. Please try again.");
  }

  // hd proves the account belongs to the university's Google Workspace, so a
  // personal Gmail account with a lookalike address cannot pass.
  if (payload.hd !== HOSTED_DOMAIN) {
    throw new VerificationError(
      `Use your University of Chittagong student account (@${HOSTED_DOMAIN}).`,
    );
  }
  if (payload.email_verified !== true || typeof payload.email !== "string") {
    throw new VerificationError("That Google account has no verified email address.");
  }

  const match = STUDENT_EMAIL_RE.exec(payload.email);
  if (!match) {
    throw new VerificationError(
      "Only student addresses of the form 24304043@std.cu.ac.bd can rate teachers.",
    );
  }

  return match[1];
}
