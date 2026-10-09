import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getInstitutionEmailDomain, generateStudentPin, normalizeSecurityPhone } from "@/lib/identity-service";

async function generateServerId(type: 'students' | 'parents', shortCode: string, entityCode: string): Promise<string> {
  const cleanShortCode = (shortCode || 'SCH').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cleanEntityCode = entityCode.trim().toUpperCase();
  const counterId = `${cleanShortCode}_${type}`;
  const counterRef = adminDb.collection('counters').doc(counterId);

  return await adminDb.runTransaction(async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    let nextNumber = 1;

    if (counterSnap.exists) {
      const data = counterSnap.data();
      if (typeof data?.nextNumber === 'number' && Number.isFinite(data.nextNumber) && data.nextNumber > 0) {
        nextNumber = data.nextNumber;
      }
    }

    transaction.set(counterRef, {
      nextNumber: nextNumber + 1,
      shortCode: cleanShortCode,
      entityType: type,
      entityCode: cleanEntityCode,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    const sequence = String(nextNumber).padStart(6, '0');
    return `${cleanShortCode}-${cleanEntityCode}-${sequence}`;
  });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const token = authHeader.substring(7).trim();
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (tokenErr) {
      return NextResponse.json({ error: "Invalid or expired authentication token." }, { status: 401 });
    }

    const callerUid = decodedToken.uid;
    const userSnap = await adminDb.collection("users").doc(callerUid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "Caller profile not found." }, { status: 403 });
    }

    const callerProfile = userSnap.data();
    const callerRole = callerProfile?.role;

    if (callerRole !== "school_owner" && callerRole !== "administrator" && callerRole !== "super_admin") {
      return NextResponse.json({ error: "Insufficient permissions for bulk intake operations." }, { status: 403 });
    }

    const body = await req.json();
    const { type, records, activeInstitutionId } = body;

    if (!type || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "Valid intake type and non-empty records array are required." }, { status: 400 });
    }

    let tenantId: string = "";

    if (callerRole === "super_admin") {
      if (!activeInstitutionId) {
        return NextResponse.json({ error: "Super Admin must supply activeInstitutionId." }, { status: 400 });
      }
      const instCheck = await adminDb.collection("institutions").doc(activeInstitutionId).get();
      if (!instCheck.exists) {
        return NextResponse.json({ error: "Selected institution does not exist." }, { status: 400 });
      }
      tenantId = activeInstitutionId;
    } else {
      tenantId = callerProfile?.tenantId || callerProfile?.institutionId;
      if (!tenantId) {
        return NextResponse.json({ error: "Institutional context not found on user profile." }, { status: 400 });
      }
    }

    const instSnap = await adminDb.collection("institutions").doc(tenantId).get();
    if (!instSnap.exists) {
      return NextResponse.json({ error: "Institution record not found." }, { status: 404 });
    }

    const institution = { id: instSnap.id, ...instSnap.data() } as any;
    const domain = getInstitutionEmailDomain(institution);
    const schoolCode = institution.schoolCode || "SCH";

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    if (type === "students") {
      const BATCH_SIZE = 100; // 100 students = 200 writes max per batch
      let currentBatch = adminDb.batch();
      let pendingOpsCount = 0;

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const getValue = (...keys: string[]) => {
          for (const k of keys) {
            const v = row[k];
            if (v !== undefined && v !== null) {
              const cleaned = String(v).trim();
              if (cleaned) return cleaned;
            }
          }
          return "";
        };

        let first = getValue("firstname", "first", "givenname", "studentfirstname", "studentfirst", "forename");
        let last = getValue("lastname", "last", "surname", "familyname", "studentlastname", "studentlast");

        if (!first || !last) {
          const fullName = getValue("name", "fullname", "studentname", "studentfullname", "student");
          if (fullName) {
            const parts = fullName.trim().split(/\s+/).filter(Boolean);
            if (parts.length >= 2) {
              first = parts[0];
              last = parts.slice(1).join(" ");
            }
          }
        }

        if (!first || !last) {
          skippedCount++;
          continue;
        }

        const gender = getValue("gender") || "Male";
        const gradeLevel = getValue("grade", "class", "gradelevel", "classlevel") || "Unassigned";
        const dateOfBirth = getValue("dob", "dateofbirth", "birthdate");

        try {
          const admissionNumber = await generateServerId("students", schoolCode, "ST");
          const pin = generateStudentPin();
          const authEmail = `${admissionNumber.trim()}@${domain}`.toLowerCase();

          let authUid: string;
          try {
            const existingAuth = await adminAuth.getUserByEmail(authEmail);
            authUid = existingAuth.uid;
          } catch (e) {
            const createdAuth = await adminAuth.createUser({
              email: authEmail,
              password: pin,
              displayName: `${first} ${last}`
            });
            authUid = createdAuth.uid;
          }

          const studentRef = adminDb.collection("students").doc();
          const studentId = studentRef.id;

          currentBatch.set(studentRef, {
            id: studentId,
            admissionNumber,
            studentPin: pin,
            email: authEmail,
            authEmail,
            authUid,
            firstName: first,
            lastName: last,
            gender,
            gradeLevel,
            dateOfBirth,
            status: "active",
            tenantId,
            institutionId: tenantId,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          });

          const userRef = adminDb.collection("users").doc(authUid);
          currentBatch.set(userRef, {
            uid: authUid,
            name: `${first} ${last}`,
            email: authEmail,
            authEmail,
            role: "student",
            studentId,
            tenantId,
            institutionId: tenantId,
            status: "active",
            createdAt: FieldValue.serverTimestamp()
          }, { merge: true });

          pendingOpsCount += 2;
          successCount++;

          if (pendingOpsCount >= BATCH_SIZE * 2) {
            await currentBatch.commit();
            currentBatch = adminDb.batch();
            pendingOpsCount = 0;
          }
        } catch (rowErr: any) {
          failCount++;
          errors.push({ row: i + 1, reason: rowErr?.message || "Student provisioning failed." });
        }
      }

      if (pendingOpsCount > 0) {
        await currentBatch.commit();
      }
    } else if (type === "parents") {
      const BATCH_SIZE = 100;
      let currentBatch = adminDb.batch();
      let pendingOpsCount = 0;

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const getValue = (...keys: string[]) => {
          for (const k of keys) {
            const v = row[k];
            if (v !== undefined && v !== null) {
              const cleaned = String(v).trim();
              if (cleaned) return cleaned;
            }
          }
          return "";
        };

        const first = getValue("firstname", "first", "givenname", "guardianfirstname");
        const last = getValue("lastname", "last", "surname", "familyname", "guardianlastname");
        const phone = getValue("phone", "phonenumber", "contact", "mobile");
        const email = getValue("email", "emailaddress");

        if (!first || !last || !phone) {
          skippedCount++;
          continue;
        }

        try {
          const parentNumber = await generateServerId("parents", schoolCode, "PR");
          let cleanPass = normalizeSecurityPhone(phone);
          if (cleanPass.length < 6) cleanPass = cleanPass.padEnd(6, '0');

          const authEmail = `${parentNumber.trim()}@${domain}`.toLowerCase();
          const contactEmail = email.toLowerCase() || authEmail;

          let authUid: string;
          try {
            const existingAuth = await adminAuth.getUserByEmail(authEmail);
            authUid = existingAuth.uid;
          } catch (e) {
            const createdAuth = await adminAuth.createUser({
              email: authEmail,
              password: cleanPass,
              displayName: `${first} ${last}`
            });
            authUid = createdAuth.uid;
          }

          const parentRef = adminDb.collection("parents").doc();
          const parentId = parentRef.id;

          currentBatch.set(parentRef, {
            id: parentId,
            parentNumber,
            firstName: first,
            lastName: last,
            phone: normalizeSecurityPhone(phone),
            email: contactEmail,
            authEmail,
            authUid,
            occupation: getValue("occupation", "job", "profession"),
            address: getValue("address", "residence", "residentialaddress"),
            status: "Active",
            tenantId,
            institutionId: tenantId,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          });

          const userRef = adminDb.collection("users").doc(authUid);
          currentBatch.set(userRef, {
            uid: authUid,
            name: `${first} ${last}`,
            email: contactEmail,
            authEmail,
            role: "parent",
            tenantId,
            institutionId: tenantId,
            status: "active",
            createdAt: FieldValue.serverTimestamp()
          }, { merge: true });

          pendingOpsCount += 2;
          successCount++;

          if (pendingOpsCount >= BATCH_SIZE * 2) {
            await currentBatch.commit();
            currentBatch = adminDb.batch();
            pendingOpsCount = 0;
          }
        } catch (rowErr: any) {
          failCount++;
          errors.push({ row: i + 1, reason: rowErr?.message || "Guardian provisioning failed." });
        }
      }

      if (pendingOpsCount > 0) {
        await currentBatch.commit();
      }
    } else {
      return NextResponse.json({ error: "Unsupported intake type." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      total: records.length,
      successCount,
      failCount,
      skippedCount,
      errors
    });
  } catch (err: any) {
    console.error("[Bulk Intake API Error]:", err);
    return NextResponse.json({ error: err?.message || "Internal server error during bulk intake." }, { status: 500 });
  }
}
