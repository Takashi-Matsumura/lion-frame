import { apiHandler } from "@/lib/api/api-handler";
import { PdfTemplateService } from "@/lib/addon-modules/pdf/pdf-template-service";

export const GET = apiHandler(async () => {
  const template = await PdfTemplateService.getDefaultTemplate();
  return { template };
}, {});
