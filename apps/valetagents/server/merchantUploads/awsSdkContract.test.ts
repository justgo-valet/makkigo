import { describe, expect, it } from "vitest";

import type { CopyObjectCommandInput, DeleteObjectCommandInput } from "@aws-sdk/client-s3";

describe("AWS SDK conditional object contract", () => {
  it("type-checks both copy preconditions and conditional deletion", () => {
    const copy = {
      Bucket: "bucket",
      Key: "final/key",
      CopySource: "bucket/staging/key",
      CopySourceIfMatch: '"source-etag"',
      IfNoneMatch: "*",
    } satisfies CopyObjectCommandInput;
    const deletion = {
      Bucket: "bucket",
      Key: "final/key",
      IfMatch: '"final-etag"',
    } satisfies DeleteObjectCommandInput;

    expect(copy).toMatchObject({ CopySourceIfMatch: '"source-etag"', IfNoneMatch: "*" });
    expect(deletion.IfMatch).toBe('"final-etag"');
  });
});
