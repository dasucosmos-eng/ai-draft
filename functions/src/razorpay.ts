// @ts-nocheck
// razorpay.ts — Firebase Cloud Function
// Creates Razorpay orders and verifies payment signatures
// Uses Razorpay Test/Live keys from environment secrets

import { https } from "firebase-functions/v2";
import { restrictedCors } from "./cors";
import { aiFunctionSecrets } from "./secrets";

const corsHandler = restrictedCors;

/**
 * POST /api/razorpay-create-order
 * Body: { amount: number, planId: string, billingCycle: 'monthly' | 'yearly' }
 * Returns: { orderId, amount, currency, key }
 */
export const apiRazorpayCreateOrder = https.onRequest(
  {
    timeoutSeconds: 30,
    region: "us-central1",
    secrets: [...aiFunctionSecrets, "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
  },
  async (req, res) => {
    return corsHandler(req, res, async () => {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      try {
        const { amount, planId, billingCycle } = req.body;

        if (!amount || amount <= 0) {
          res.status(400).json({ error: "Valid amount is required" });
          return;
        }

        // Razorpay amount is in paise (smallest currency unit)
        const amountInPaise = Math.round(amount * 100);

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
          console.error("[razorpay] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET");
          res.status(500).json({ error: "Payment gateway not configured" });
          return;
        }

        // Create Razorpay order via API
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

        const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: "INR",
            receipt: `rcpt_${planId}_${billingCycle}_${Date.now()}`,
            notes: {
              planId,
              billingCycle,
              source: "ai-draft",
            },
          }),
        });

        if (!orderResponse.ok) {
          const errorText = await orderResponse.text();
          console.error("[razorpay] Order creation failed:", errorText);
          res.status(500).json({ error: "Failed to create payment order" });
          return;
        }

        const order = await orderResponse.json();

        res.json({
          success: true,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          key: keyId,
        });
      } catch (error) {
        console.error("[razorpay] Error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to create payment order",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }
);

/**
 * POST /api/razorpay-verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, billingCycle }
 * Returns: { success: true, planId }
 */
export const apiRazorpayVerify = https.onRequest(
  {
    timeoutSeconds: 30,
    region: "us-central1",
    secrets: [...aiFunctionSecrets, "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
  },
  async (req, res) => {
    return corsHandler(req, res, async () => {
      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      try {
        const {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          planId,
          billingCycle,
          userId,
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
          res.status(400).json({ error: "Missing payment verification parameters" });
          return;
        }

        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keySecret) {
          res.status(500).json({ error: "Payment gateway not configured" });
          return;
        }

        // Verify signature using HMAC-SHA256
        const crypto = require("crypto");
        const expectedSignature = crypto
          .createHmac("sha256", keySecret)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest("hex");

        if (expectedSignature !== razorpay_signature) {
          console.error("[razorpay] Signature verification failed");
          res.status(400).json({ error: "Payment verification failed", success: false });
          return;
        }

        // Verify payment with Razorpay API
        const keyId = process.env.RAZORPAY_KEY_ID;
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

        const paymentResponse = await fetch(
          `https://api.razorpay.com/v1/payments/${razorpay_payment_id}`,
          {
            headers: {
              Authorization: `Basic ${auth}`,
            },
          }
        );

        const payment = await paymentResponse.json();

        if (payment.status !== "captured" && payment.status !== "authorized") {
          console.error(`[razorpay] Payment not captured. Status: ${payment.status}`);
          res.status(400).json({ error: "Payment not completed", success: false });
          return;
        }

        console.log(
          `[razorpay] Payment verified: ${razorpay_payment_id}, plan: ${planId}, amount: ${payment.amount}`
        );

        // TODO: Store subscription in Firestore if userId is provided
        // For now, return success with plan details so client can update local state

        res.json({
          success: true,
          planId,
          billingCycle,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          amount: payment.amount,
          currency: payment.currency,
        });
      } catch (error) {
        console.error("[razorpay] Verification error:", error);
        res.status(500).json({
          success: false,
          error: "Payment verification failed",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }
);
