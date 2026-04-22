import { NextRequest } from "next/server";
import { ok, withErrorHandling } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";
import { portfolioImportService } from "@/server/services/portfolio-import.service";

export const runtime = "nodejs";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new ValidationError("Expected a multipart/form-data field named 'file'.");
  }

  const result = await portfolioImportService.importImage(file);

  return ok(result);
});
