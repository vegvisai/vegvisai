# Releases of the open index

Signed monthly releases of the VegvisAI index of businesses, mirrored from the platform by the workflow «Index release». Each release is checked against `index/signing-key.json` before it is committed here.

| File | Content |
| --- | --- |
| `businesses/<YYYY-MM>.json` | The release: only businesses that chose the open licence on their own domain, and only what they publish there |
| `businesses/<YYYY-MM>.json.sig` | Ed25519 signature over the exact bytes of the file. Check it with `node tools/bots/verify-release.mjs releases/businesses/<YYYY-MM>.json` |
| `businesses/<YYYY-MM>-r2.json` | A replacement, when a release had to be withdrawn (for example after a deletion request) |

**Licence.** The database is under the [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/), the content of each entry under the [Database Contents License (DbCL) 1.0](https://opendatacommons.org/licenses/dbcl/1-0/). Attribution: «VegvisAI open index». If you publicly use an adapted version of the database, offer the adapted database under the ODbL; products made with the data are not themselves covered by share-alike. The checks use Enhetsregisteret (Brønnøysundregistrene, NLOD 2.0), Companies House (Open Government Licence v3.0) and VIES (European Commission).

**Please follow removals.** Each release lists `removed_since_previous`. We ask you to remove those entries from your copy, and to delete any withdrawn release; the ODbL does not require it, but it respects the businesses' wishes. We cannot recall copies that are already downloaded.

**What the signature says.** That the file is unchanged and comes from VegvisAI, not that every entry is correct. If the key is ever replaced or compromised, the new public key is published here and on the platform with the date and the reason.
