import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const SUPER_ADMIN_EMAILS = [
  "asareg365@gmail.com",
  "info@yebfaconsult.org",
  "frankyeb@gmail.com"
];

function resolveSystemRole(designation?: string): string {
  const d = (designation || "").toLowerCase().trim();
  if (d === "head teacher" || d === "administrator" || d === "principal") return "administrator";
  if (d === "accountant") return "accountant";
  if (d === "librarian") return "librarian";
  return "teacher";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken, roleHint, identifier } = body;

    let verifiedUid = body.uid;
    let verifiedEmail = (body.email || "").toLowerCase().trim();

    // Verify Firebase Auth ID token if supplied
    if (idToken) {
      try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        verifiedUid = decoded.uid;
        if (decoded.email) {
          verifiedEmail = decoded.email.toLowerCase().trim();
        }
      } catch (err: any) {
        console.warn("[Auth Bootstrap] Token verification warning:", err.message);
        // Fall back to uid if already provided
      }
    }

    if (!verifiedUid) {
      return NextResponse.json({ error: "Missing authenticated UID." }, { status: 400 });
    }

    const userDocRef = adminDb.collection("users").doc(verifiedUid);
    const existingSnap = await userDocRef.get();

    if (existingSnap.exists) {
      return NextResponse.json({ user: existingSnap.data() });
    }

    // 1. Check Super Admin list
    if (verifiedEmail && SUPER_ADMIN_EMAILS.includes(verifiedEmail)) {
      const superAdminData = {
        uid: verifiedUid,
        name: "Super Administrator",
        email: verifiedEmail,
        role: "super_admin",
        status: "active",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };
      await userDocRef.set(superAdminData, { merge: true });
      return NextResponse.json({ user: superAdminData });
    }

    // 2. Check if user is a School Owner
    if (verifiedEmail) {
      const instSnap = await adminDb
        .collection("institutions")
        .where("ownerEmail", "==", verifiedEmail)
        .limit(1)
        .get();

      if (!instSnap.empty) {
        const instDoc = instSnap.docs[0];
        const instData = instDoc.data();
        const ownerData = {
          uid: verifiedUid,
          name: instData.ownerName || "School Owner",
          email: verifiedEmail,
          role: "school_owner",
          tenantId: instDoc.id,
          institutionId: instDoc.id,
          institutionName: instData.name || "Academic Hub",
          schoolCode: instData.schoolCode || "",
          status: "active",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        };
        await userDocRef.set(ownerData, { merge: true });
        return NextResponse.json({ user: ownerData });
      }
    }

    // 3. Check Staff Registry
    let staffDoc = null;

    // Search by authUid
    const staffByAuth = await adminDb
      .collection("staff")
      .where("authUid", "==", verifiedUid)
      .limit(1)
      .get();

    if (!staffByAuth.empty) {
      staffDoc = staffByAuth.docs[0];
    } else if (identifier) {
      const normId = identifier.trim().toUpperCase();
      const staffById = await adminDb
        .collection("staff")
        .where("staffNumber", "==", normId)
        .limit(1)
        .get();

      if (!staffById.empty) {
        staffDoc = staffById.docs[0];
      }
    }

    if (!staffDoc && verifiedEmail) {
      const staffByEmail = await adminDb
        .collection("staff")
        .where("email", "==", verifiedEmail)
        .limit(1)
        .get();

      if (!staffByEmail.empty) {
        staffDoc = staffByEmail.docs[0];
      } else {
        const staffByAuthEmail = await adminDb
          .collection("staff")
          .where("authEmail", "==", verifiedEmail)
          .limit(1)
          .get();
        if (!staffByAuthEmail.empty) {
          staffDoc = staffByAuthEmail.docs[0];
        }
      }
    }

    if (staffDoc) {
      const staffData = staffDoc.data();
      const tenantId = staffData.tenantId || staffData.institutionId;

      let instName = "Academic Hub";
      let schoolCode = "";
      if (tenantId) {
        const instSnap = await adminDb.collection("institutions").doc(tenantId).get();
        if (instSnap.exists) {
          instName = instSnap.data()?.name || instName;
          schoolCode = instSnap.data()?.schoolCode || schoolCode;
        }
      }

      // Link staff record to this auth UID
      if (!staffData.authUid || staffData.authUid !== verifiedUid) {
        await staffDoc.ref.update({
          authUid: verifiedUid,
          updatedAt: FieldValue.serverTimestamp()
        });
      }

      const role = resolveSystemRole(staffData.designation);
      const staffUserData = {
        uid: verifiedUid,
        name: `${staffData.firstName || ""} ${staffData.lastName || ""}`.trim() || "Staff Member",
        email: verifiedEmail || staffData.email || "",
        authEmail: staffData.authEmail || verifiedEmail || "",
        role,
        staffId: staffDoc.id,
        tenantId,
        institutionId: tenantId,
        institutionName: instName,
        schoolCode,
        status: "active",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      await userDocRef.set(staffUserData, { merge: true });
      return NextResponse.json({ user: staffUserData });
    }

    // 4. Check Students Registry
    let studentDoc = null;

    const studentByAuth = await adminDb
      .collection("students")
      .where("authUid", "==", verifiedUid)
      .limit(1)
      .get();

    if (!studentByAuth.empty) {
      studentDoc = studentByAuth.docs[0];
    } else if (identifier) {
      const normId = identifier.trim().toUpperCase();
      const studentById = await adminDb
        .collection("students")
        .where("admissionNumber", "==", normId)
        .limit(1)
        .get();

      if (!studentById.empty) {
        studentDoc = studentById.docs[0];
      }
    }

    if (!studentDoc && verifiedEmail) {
      const studentByAuthEmail = await adminDb
        .collection("students")
        .where("authEmail", "==", verifiedEmail)
        .limit(1)
        .get();

      if (!studentByAuthEmail.empty) {
        studentDoc = studentByAuthEmail.docs[0];
      }
    }

    if (studentDoc) {
      const studentData = studentDoc.data();
      const tenantId = studentData.tenantId || studentData.institutionId;

      let instName = "Academic Hub";
      let schoolCode = "";
      if (tenantId) {
        const instSnap = await adminDb.collection("institutions").doc(tenantId).get();
        if (instSnap.exists) {
          instName = instSnap.data()?.name || instName;
          schoolCode = instSnap.data()?.schoolCode || schoolCode;
        }
      }

      if (!studentData.authUid || studentData.authUid !== verifiedUid) {
        await studentDoc.ref.update({
          authUid: verifiedUid,
          updatedAt: FieldValue.serverTimestamp()
        });
      }

      const studentUserData = {
        uid: verifiedUid,
        name: `${studentData.firstName || ""} ${studentData.lastName || ""}`.trim() || "Student",
        email: verifiedEmail || studentData.email || "",
        authEmail: studentData.authEmail || verifiedEmail || "",
        role: "student",
        studentId: studentDoc.id,
        tenantId,
        institutionId: tenantId,
        institutionName: instName,
        schoolCode,
        status: "active",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      await userDocRef.set(studentUserData, { merge: true });
      return NextResponse.json({ user: studentUserData });
    }

    // 5. Check Parents Registry
    let parentDoc = null;

    const parentByAuth = await adminDb
      .collection("parents")
      .where("authUid", "==", verifiedUid)
      .limit(1)
      .get();

    if (!parentByAuth.empty) {
      parentDoc = parentByAuth.docs[0];
    }

    if (parentDoc) {
      const parentData = parentDoc.data();
      const tenantId = parentData.tenantId || parentData.institutionId;

      let instName = "Academic Hub";
      if (tenantId) {
        const instSnap = await adminDb.collection("institutions").doc(tenantId).get();
        if (instSnap.exists) {
          instName = instSnap.data()?.name || instName;
        }
      }

      const parentUserData = {
        uid: verifiedUid,
        name: `${parentData.firstName || ""} ${parentData.lastName || ""}`.trim() || "Parent",
        email: verifiedEmail || parentData.email || "",
        role: "parent",
        parentId: parentDoc.id,
        tenantId,
        institutionId: tenantId,
        institutionName: instName,
        status: "active",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      await userDocRef.set(parentUserData, { merge: true });
      return NextResponse.json({ user: parentUserData });
    }

    // If still no matching registry record
    return NextResponse.json(
      { error: "No matching registry document found for this account." },
      { status: 404 }
    );
  } catch (error: any) {
    console.error("[Auth Bootstrap Error]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to bootstrap identity." },
      { status: 500 }
    );
  }
}
