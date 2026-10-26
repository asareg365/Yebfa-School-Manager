import { NextResponse, NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("x-payaza-signature") || "";
    const secret = process.env.PAYAZA_WEBHOOK_SECRET;

    if (!secret || !signatureHeader) {
      return NextResponse.json({ error: "Unauthorized: Missing secret or signature" }, { status: 401 });
    }

    // Compute HMAC-SHA512 over exact raw request body (UTF-8) and encode as Base64
    const computedSignature = crypto
      .createHmac("sha512", secret)
      .update(rawBody, "utf8")
      .digest("base64");

    const computedBuffer = Buffer.from(computedSignature);
    const receivedBuffer = Buffer.from(signatureHeader);

    if (computedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(computedBuffer, receivedBuffer)) {
      return NextResponse.json({ error: "Unauthorized: Invalid signature" }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (err) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Extract transaction details according to Payaza webhook payload structure
    const transactionReference = payload.transaction_reference || payload.reference || payload.data?.transaction_reference;
    const paymentStatus = (payload.status || payload.data?.status || "").toLowerCase();
    const amount = payload.amount || payload.data?.amount;
    const currency = payload.currency || payload.data?.currency;
    const institutionId = payload.metadata?.institutionId || payload.data?.metadata?.institutionId || payload.institutionId;

    if (!transactionReference) {
      return NextResponse.json({ error: "Missing transaction reference" }, { status: 400 });
    }

    // Idempotency check: check if this transaction reference was already processed
    const webhookEventRef = adminDb.collection("payaza_webhooks").doc(transactionReference);
    const webhookSnap = await webhookEventRef.get();

    if (webhookSnap.exists && webhookSnap.data()?.processed) {
      return NextResponse.json({ received: true, idempotent: true }, { status: 200 });
    }

    // Validate final payment status (must be success / successful / completed / approved)
    const validStatuses = ["success", "successful", "completed", "approved", "successful_payment"];
    if (!validStatuses.includes(paymentStatus)) {
      await webhookEventRef.set({
        transactionReference,
        status: paymentStatus,
        processed: false,
        receivedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      return NextResponse.json({ received: true, processed: false, reason: "Payment not successful" }, { status: 200 });
    }

    // If institutionId is present, update institution subscription status
    if (institutionId) {
      const institutionRef = adminDb.collection("institutions").doc(institutionId);
      const instSnap = await institutionRef.get();
      if (instSnap.exists) {
        await institutionRef.update({
          subscriptionStatus: "active",
          subscriptionPlan: payload.plan || "Pro",
          lastPaymentReference: transactionReference,
          lastPaymentAmount: amount,
          lastPaymentDate: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
      }
    }

    // Mark webhook event as processed for idempotency
    await webhookEventRef.set({
      transactionReference,
      status: paymentStatus,
      amount,
      currency,
      institutionId,
      processed: true,
      processedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    return NextResponse.json({ received: true, success: true }, { status: 200 });
  } catch (err: any) {
    // Never log secrets or signatures
    console.error("[Payaza Webhook Error]:", err.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
