import { RSABSSA } from "@cloudflare/blindrsa-ts";
const suite = RSABSSA.SHA384.PSS.Randomized();
const b64 = (b) => Buffer.from(b).toString("base64");
const BASE = "http://localhost:8790";
const post = async (body) => {
  const r = await fetch(`${BASE}/api/issue`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json() };
};
// Fresh ID per run so issuance is not already claimed.
const id = process.argv[2];
const size = Number(process.argv[3] ?? 0); // 0 = all
const t0 = Date.now();
const step1 = await post({ idToken: `dev:${id}` });
const t1 = Date.now();
const teachers = (step1.json.teachers ?? []).slice(0, size || undefined);
const reqs = [];
for (const t of teachers) {
  const pk = await crypto.subtle.importKey("jwk", t.publicKey, { name: "RSA-PSS", hash: "SHA-384" }, true, ["verify"]);
  const prepared = suite.prepare(crypto.getRandomValues(new Uint8Array(32)));
  const { blindedMsg } = await suite.blind(pk, prepared);
  reqs.push({ teacherId: t.id, blinded: b64(blindedMsg) });
}
const t2 = Date.now();
const step2 = await post({ idToken: `dev:${id}`, chunk: 0, blinded: reqs });
const t3 = Date.now();
console.log(`dept=${step1.json.department?.slug} teachers=${teachers.length} step1=${t1-t0}ms clientBlind=${t2-t1}ms sign=${t3-t2}ms status=${step2.status} sigs=${step2.json.signatures?.length ?? 0}`);
