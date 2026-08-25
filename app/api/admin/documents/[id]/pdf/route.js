import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const rootAdminEmails =
  String(
    process.env.ROOT_ADMIN_EMAIL || ""
  )
    .toLowerCase()
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

function buildAdminClient() {
  if (
    !supabaseUrl ||
    !supabaseServiceRoleKey
  ) {
    throw new Error(
      "Root document administration is not configured."
    );
  }

  return createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

function buildAuthClient() {
  if (
    !supabaseUrl ||
    !supabaseAnonKey
  ) {
    throw new Error(
      "Root authentication is not configured."
    );
  }

  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

function normaliseEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

async function requireRootAdmin(
  request
) {
  const authHeader =
    request.headers.get(
      "authorization"
    );

  const accessToken =
    authHeader?.startsWith(
      "Bearer "
    )
      ? authHeader.slice(7)
      : null;

  if (!accessToken) {
    return {
      authorised: false,
      status: 401,
      error:
        "Root administrator sign-in required.",
    };
  }

  const authClient =
    buildAuthClient();

  const {
    data,
    error,
  } =
    await authClient.auth.getUser(
      accessToken
    );

  const user =
    data?.user || null;

  if (
    error ||
    !user
  ) {
    return {
      authorised: false,
      status: 401,
      error:
        "Root could not verify this account.",
    };
  }

  const email =
    normaliseEmail(
      user.email
    );

  if (
    !rootAdminEmails.includes(
      email
    )
  ) {
    return {
      authorised: false,
      status: 403,
      error:
        "This account cannot generate Root commercial documents.",
    };
  }

  return {
    authorised: true,
    user,
  };
}

function money(
  value,
  currency = "gbp"
) {
  return Number(
    value || 0
  ).toLocaleString(
    "en-GB",
    {
      style: "currency",
      currency:
        String(
          currency || "gbp"
        ).toUpperCase(),
    }
  );
}

function dateText(value) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
}

function safeText(value) {
  return String(
    value ?? "-"
  );
}

async function loadDocument(
  supabase,
  documentId
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "organisation_commercial_documents"
      )
      .select(
        `
          id,
          document_number,
          document_type,
          introducer_id,
          commission_id,
          application_id,
          organisation_id,
          organisation_name,
          recipient_name,
          recipient_email,
          currency,
          amount,
          commission_percent,
          payment_reference,
          document_status,
          generated_at,
          sent_at,
          notes,
          metadata,
          created_at,
          updated_at
        `
      )
      .eq(
        "id",
        documentId
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Root could not find this commercial document."
    );
  }

  return data;
}

async function loadLogoBytes() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.roothealth.app";

  const response =
    await fetch(
      `${baseUrl}/root-logo.png`,
      {
        cache: "force-cache",
      }
    );

  if (!response.ok) {
    throw new Error(
      "Root could not load the Enso artwork."
    );
  }

  return Buffer.from(
    await response.arrayBuffer()
  );
}

function drawLabelValue({
  page,
  font,
  boldFont,
  x,
  y,
  label,
  value,
  valueSize = 11,
}) {
  page.drawText(
    label.toUpperCase(),
    {
      x,
      y,
      size: 8,
      font: boldFont,
      color: rgb(
        0.37,
        0.43,
        0.37
      ),
    }
  );

  page.drawText(
    safeText(value),
    {
      x,
      y: y - 18,
      size:
        valueSize,
      font,
      color: rgb(
        0.10,
        0.15,
        0.11
      ),
    }
  );
}

export async function GET(
  request,
  { params }
) {
  try {
    const admin =
      await requireRootAdmin(
        request
      );

    if (!admin.authorised) {
      return NextResponse.json(
        {
          error:
            admin.error,
        },
        {
          status:
            admin.status,
        }
      );
    }

    const documentId =
      params?.id;

    if (!documentId) {
      return NextResponse.json(
        {
          error:
            "Document ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      buildAdminClient();

    const document =
      await loadDocument(
        supabase,
        documentId
      );

    if (
      document.document_type !==
      "commission_remittance"
    ) {
      return NextResponse.json(
        {
          error:
            "This document type is not yet supported by the Root PDF renderer.",
        },
        {
          status: 409,
        }
      );
    }

    const metadata =
      document.metadata ||
      {};

    const pdf =
      await PDFDocument.create();

    const page =
      pdf.addPage([
        595.28,
        841.89,
      ]);

    const regularFont =
      await pdf.embedFont(
        StandardFonts.Helvetica
      );

    const boldFont =
      await pdf.embedFont(
        StandardFonts.HelveticaBold
      );

    const serifFont =
      await pdf.embedFont(
        StandardFonts.TimesRoman
      );

    const serifBoldFont =
      await pdf.embedFont(
        StandardFonts.TimesRomanBold
      );

    const logoBytes =
      await loadLogoBytes();

    const logo =
      await pdf.embedPng(
        logoBytes
      );

    const pageWidth =
      page.getWidth();

    const darkGreen =
      rgb(
        0.09,
        0.18,
        0.12
      );

    const mutedGreen =
      rgb(
        0.38,
        0.45,
        0.39
      );

    const cream =
      rgb(
        0.97,
        0.95,
        0.91
      );

    const softGreen =
      rgb(
        0.92,
        0.94,
        0.90
      );

    const gold =
      rgb(
        0.72,
        0.53,
        0.28
      );

    /*
     * Background
     */
    page.drawRectangle({
      x: 0,
      y: 0,
      width:
        pageWidth,
      height:
        page.getHeight(),
      color:
        rgb(
          0.985,
          0.978,
          0.955
        ),
    });

    /*
     * Enso
     */
    const logoSize =
      86;

    page.drawImage(
      logo,
      {
        x:
          pageWidth / 2 -
          logoSize / 2,
        y: 706,
        width:
          logoSize,
        height:
          logoSize,
      }
    );

    page.drawText(
      "ROOT HEALTH",
      {
        x:
          pageWidth / 2 -
          42,
        y: 684,
        size: 9,
        font:
          boldFont,
        color:
          mutedGreen,
      }
    );

    page.drawText(
      "Commission Remittance",
      {
        x: 62,
        y: 625,
        size: 30,
        font:
          serifFont,
        color:
          darkGreen,
      }
    );

    page.drawText(
      safeText(
        document.document_number
      ),
      {
        x: 63,
        y: 598,
        size: 10,
        font:
          boldFont,
        color:
          gold,
      }
    );

    page.drawText(
      `Generated ${dateText(
        document.generated_at ||
        document.created_at
      )}`,
      {
        x: 63,
        y: 581,
        size: 9,
        font:
          regularFont,
        color:
          mutedGreen,
      }
    );

    /*
     * Recipient panel
     */
    page.drawRectangle({
      x: 55,
      y: 485,
      width: 485,
      height: 74,
      color:
        softGreen,
      borderColor:
        rgb(
          0.84,
          0.87,
          0.82
        ),
      borderWidth:
        1,
    });

    drawLabelValue({
      page,
      font:
        regularFont,
      boldFont,
      x: 75,
      y: 535,
      label:
        "Introducer",
      value:
        metadata.introducer_name ||
        document.recipient_name,
      valueSize: 13,
    });

    drawLabelValue({
      page,
      font:
        regularFont,
      boldFont,
      x: 320,
      y: 535,
      label:
        "Recipient email",
      value:
        document.recipient_email ||
        metadata.introducer_contact_email,
      valueSize: 10,
    });

    /*
     * Main payment card
     */
    page.drawRectangle({
      x: 55,
      y: 308,
      width: 485,
      height: 150,
      color:
        cream,
      borderColor:
        rgb(
          0.89,
          0.85,
          0.77
        ),
      borderWidth:
        1,
    });

    drawLabelValue({
      page,
      font:
        regularFont,
      boldFont,
      x: 75,
      y: 426,
      label:
        "Introduced organisation",
      value:
        document.organisation_name ||
        "-",
      valueSize: 13,
    });

    drawLabelValue({
      page,
      font:
        regularFont,
      boldFont,
      x: 320,
      y: 426,
      label:
        "Campaign",
      value:
        metadata.referral_campaign_code ||
        "-",
    });

    drawLabelValue({
      page,
      font:
        regularFont,
      boldFont,
      x: 75,
      y: 376,
      label:
        "Qualifying revenue",
      value:
        money(
          metadata.qualifying_amount ||
          metadata.collected_amount,
          document.currency
        ),
      valueSize: 13,
    });

    drawLabelValue({
      page,
      font:
        regularFont,
      boldFont,
      x: 320,
      y: 376,
      label:
        "Commission rate",
      value:
        `${Number(
          document.commission_percent ||
          metadata.commission_percent ||
          0
        ).toLocaleString(
          "en-GB",
          {
            maximumFractionDigits: 2,
          }
        )}%`,
      valueSize: 13,
    });

    /*
     * Amount paid
     */
    page.drawText(
      "COMMISSION PAID",
      {
        x: 75,
        y: 335,
        size: 9,
        font:
          boldFont,
        color:
          mutedGreen,
      }
    );

    page.drawText(
      money(
        document.amount,
        document.currency
      ),
      {
        x: 75,
        y: 311,
        size: 22,
        font:
          serifBoldFont,
        color:
          darkGreen,
      }
    );

    /*
     * Settlement details
     */
    drawLabelValue({
      page,
      font:
        regularFont,
      boldFont,
      x: 63,
      y: 260,
      label:
        "Payment date",
      value:
        dateText(
          metadata.paid_at
        ),
    });

    drawLabelValue({
      page,
      font:
        regularFont,
      boldFont,
      x: 220,
      y: 260,
      label:
        "Payment reference",
      value:
        document.payment_reference ||
        metadata.payout_reference ||
        "-",
    });

    drawLabelValue({
      page,
      font:
        regularFont,
      boldFont,
      x: 390,
      y: 260,
      label:
        "Commission type",
      value:
        metadata.commission_structure ===
        "recurring"
          ? "Recurring"
          : "One-off",
    });

    /*
     * Confirmation
     */
    page.drawText(
      "This remittance confirms settlement of the commission shown above.",
      {
        x: 63,
        y: 192,
        size: 11,
        font:
          regularFont,
        color:
          darkGreen,
      }
    );

    page.drawText(
      "It has been generated from Root's recorded commercial and payment information.",
      {
        x: 63,
        y: 174,
        size: 9,
        font:
          regularFont,
        color:
          mutedGreen,
      }
    );

    /*
     * Footer
     */
    page.drawLine({
      start: {
        x: 63,
        y: 104,
      },
      end: {
        x: 532,
        y: 104,
      },
      thickness:
        0.8,
      color:
        rgb(
          0.84,
          0.84,
          0.80
        ),
    });

    page.drawText(
      "ROOT HEALTH",
      {
        x: 63,
        y: 77,
        size: 8,
        font:
          boldFont,
        color:
          mutedGreen,
      }
    );

    page.drawText(
      safeText(
        document.document_number
      ),
      {
        x: 448,
        y: 77,
        size: 8,
        font:
          boldFont,
        color:
          mutedGreen,
      }
    );

    const pdfBytes =
      await pdf.save();

    const fileName =
      `${document.document_number || "root-remittance"}.pdf`;

    return new NextResponse(
      Buffer.from(
        pdfBytes
      ),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `inline; filename="${fileName}"`,

          "Cache-Control":
            "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "ROOT COMMERCIAL PDF ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Root could not generate this PDF.",
      },
      {
        status: 500,
      }
    );
  }
}
