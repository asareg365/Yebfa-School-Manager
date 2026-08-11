import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

function normalizePhone(num: string): string {
  if (!num) return "";

  let clean = String(num)
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .replace(/\(/g, "")
    .replace(/\)/g, "");

  if (clean.startsWith("+233")) return "0" + clean.substring(4);
  if (clean.startsWith("233")) return "0" + clean.substring(3);

  return clean;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const studentId = String(body.studentId || "")
      .trim()
      .toUpperCase();

    const phone = normalizePhone(String(body.phone || ""));

    if (!studentId || !phone) {
      return NextResponse.json(
        { error: "Student ID and parent phone are required." },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // 1. Find the student by admission number.
    // This query runs with Firebase Admin SDK, so it does not
    // require the parent to already be authenticated.
    // ------------------------------------------------------------

    const studentSnap = await adminDb
      .collection("students")
      .where("admissionNumber", "==", studentId)
      .limit(1)
      .get();

    if (studentSnap.empty) {
      return NextResponse.json(
        { error: "Invalid Student ID or parent phone." },
        { status: 401 }
      );
    }

    const studentDoc = studentSnap.docs[0];
    const student = studentDoc.data();

    const studentFirestoreId = studentDoc.id;
    const tenantId = student.tenantId || student.institutionId;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Invalid Student ID or parent phone." },
        { status: 401 }
      );
    }

    // ------------------------------------------------------------
    // 2. Find parents linked to this student.
    // ------------------------------------------------------------

    const relationshipSnap = await adminDb
      .collection("student_parents")
      .where("studentId", "==", studentFirestoreId)
      .where("tenantId", "==", tenantId)
      .get();

    if (relationshipSnap.empty) {
      return NextResponse.json(
        { error: "Invalid Student ID or parent phone." },
        { status: 401 }
      );
    }

    // ------------------------------------------------------------
    // 3. Find the linked parent whose registered phone matches.
    // ------------------------------------------------------------

    let matchedParent: FirebaseFirestore.DocumentData | null = null;

    for (const relationshipDoc of relationshipSnap.docs) {
      const relationship = relationshipDoc.data();
      const parentId = relationship.parentId;

      if (!parentId) continue;

      const parentSnap = await adminDb
        .collection("parents")
        .doc(parentId)
        .get();

      if (!parentSnap.exists) continue;

      const parent = parentSnap.data();

      if (!parent) continue;

      const registeredPhone = normalizePhone(parent.phone || "");

      if (
        registeredPhone &&
        registeredPhone === phone
      ) {
        matchedParent = {
          id: parentSnap.id,
          ...parent,
        };
        break;
      }
    }

    if (!matchedParent) {
      return NextResponse.json(
        { error: "Invalid Student ID or parent phone." },
        { status: 401 }
      );
    }

    // ------------------------------------------------------------
    // 4. Make sure the parent has a Firebase Auth UID.
    // ------------------------------------------------------------

    const authUid = matchedParent.authUid;

    if (!authUid) {
      return NextResponse.json(
        {
          error:
            "This parent account has not been activated yet. Please contact the school.",
        },
        { status: 403 }
      );
    }

    // ------------------------------------------------------------
    // 5. Confirm the Firebase Auth account still exists.
    // ------------------------------------------------------------

    try {
      await adminAuth.getUser(authUid);
    } catch {
      return NextResponse.json(
        {
          error:
            "This parent account is not active. Please contact the school.",
        },
        { status: 403 }
      );
    }

    // ------------------------------------------------------------
    // 6. Create a short-lived Firebase custom authentication token.
    // The client will use this token to sign into Firebase.
    // ------------------------------------------------------------

    const customToken = await adminAuth.createCustomToken(authUid, {
      role: "parent",
      tenantId,
      studentId: studentFirestoreId,
    });

    return NextResponse.json({
      token: customToken,
      studentId: studentFirestoreId,
      tenantId,
    });
  } catch (error) {
    console.error("[Parent Login] Server error:", error);

    return NextResponse.json(
      { error: "Unable to process parent login." },
      { status: 500 }
    );
  }
}
