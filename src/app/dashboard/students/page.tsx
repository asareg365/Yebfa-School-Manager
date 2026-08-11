"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Search, 
  UserPlus, 
  Trash2, 
  Pencil, 
  Loader2, 
  User, 
  ShieldCheck, 
  IdCard,
  RefreshCw,
  Save,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  HeartHandshake,
  Baby,
  Users,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  KeyRound,
  X,
  LockKeyhole,
  Key,
  Activity,
  MoreVertical,
  ShieldAlert,
  Layers,
  Archive,
  History,
  FileText
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase"
import { collection, addDoc, query, deleteDoc, doc, where, serverTimestamp, updateDoc, writeBatch, setDoc, getDocs } from "firebase/firestore"
import { useState, useMemo, useEffect, useRef, Suspense } from "react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { initializeApp, deleteApp, FirebaseApp } from "firebase/app"
import { getAuth, createUserWithEmailAndPassword, signOut, Auth as FirebaseAuth } from "firebase/auth"
import { firebaseConfig } from "@/firebase/config"
import { 
  normalizeSecurityPhone, 
  generateStudentPin, 
  getInstitutionEmailDomain 
} from "@/lib/identity-service"
import { generateId } from "@/lib/id-generator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import Papa from "papaparse"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError, type SecurityRuleContext } from "@/firebase/errors"

function StudentsRegistryContent() {
  const db = useFirestore()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [isEnrollOpen, setIsEnrollOpen] = useState(false)
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const bulkFileRef = useRef<HTMLInputElement>(null)
  
  const [activeStep, setActiveStep] = useState("identity")
  const steps = ["identity", "academic", "guardian", "finalize"]

  const userProfileRef = useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile, loading: profileLoading } = useDoc(userProfileRef)

  const institutionId = useMemo(() => {
    if (profileLoading || !profile) return null;
    if (profile.role === 'super_admin') {
      return typeof window !== 'undefined' ? localStorage.getItem('selected_institution_id') : null;
    }
    return profile.tenantId || null;
  }, [profile, profileLoading]);

  const instRef = useMemo(() => institutionId ? doc(db, "institutions", institutionId) : null, [db, institutionId])
  const { data: institution } = useDoc(instRef)

  const initialForm = {
    firstName: "",
    lastName: "",
    gender: "Male",
    dateOfBirth: "",
    admissionNumber: "PENDING",
    studentPin: "",
    gradeLevel: "",
    status: "active",
    house: "",
    photoUrl: "",
    admissionId: "",
    address: {
      digitalAddress: "",
      town: "",
      district: "",
      region: "",
      country: "Ghana"
    }
  }

  const [studentForm, setStudentForm] = useState(initialForm)
  
  const [isNewParent, setIsNewParent] = useState(false)
  const [linkedParentId, setLinkedParentId] = useState("")
  const [relationshipData, setRelationshipData] = useState({
    relationship: "Mother",
    primaryContact: true,
    emergencyContact: true,
    pickupAuthorized: true
  })

  const [newParentForm, setNewParentForm] = useState({
    parentNumber: "PENDING",
    firstName: "",
    lastName: "",
    gender: "Female",
    phone: "",
    email: "",
    occupation: "",
    status: "Active"
  })

  useEffect(() => {
    const enrollTrigger = searchParams.get('enroll')
    if (enrollTrigger === 'true') {
      const pendingData = localStorage.getItem('pending_admission_data')
      if (pendingData) {
        const app = JSON.parse(pendingData)
        setStudentForm(prev => ({
          ...prev,
          firstName: app.firstName || "",
          lastName: app.lastName || "",
          gender: app.gender || "Male",
          dateOfBirth: app.dateOfBirth || "",
          gradeLevel: app.gradeLevel || "",
          admissionId: app.id || ""
        }))
        setIsEnrollOpen(true)
        localStorage.removeItem('pending_admission_data')
      }
    }
  }, [searchParams])

  const studentsQuery = useMemo(() => {
    if (!db || !institutionId) return null;
    return query(
      collection(db, "students"), 
      where("tenantId", "==", institutionId),
      where("status", "==", "active")
    );
  }, [db, institutionId]);

  const parentsQuery = useMemo(() => institutionId ? query(collection(db, "parents"), where("tenantId", "==", institutionId)) : null, [db, institutionId]);
  const classesQuery = useMemo(() => institutionId ? query(collection(db, "classes"), where("tenantId", "==", institutionId)) : null, [db, institutionId]);
  const relsQuery = useMemo(() => institutionId ? query(collection(db, "student_parents"), where("tenantId", "==", institutionId)) : null, [db, institutionId]);

  const { data: rawStudents = [], loading: studentsLoading } = useCollection(studentsQuery)
  const { data: parents = [] } = useCollection(parentsQuery)
  const { data: registeredClasses = [] } = useCollection(classesQuery)
  const { data: allRels = [] } = useCollection(relsQuery)

  const studentsList = useMemo(() => {
    return rawStudents.filter(s => 
      `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admissionNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a: any, b: any) => (a.admissionNumber || "").localeCompare(b.admissionNumber || ""));
  }, [rawStudents, searchQuery]);

  const groupedStudents = useMemo(() => {
    const groups: Record<string, any[]> = {}
    studentsList.forEach(s => {
      const grade = s.gradeLevel || "Unassigned"
      if (!groups[grade]) groups[grade] = []
      groups[grade].push(s)
    })
    return groups
  }, [studentsList])

  const validateStep = (step: string) => {
    if (step === "identity") {
      if (!studentForm.firstName || !studentForm.lastName || !studentForm.dateOfBirth || !studentForm.gender) {
        toast({ variant: "destructive", title: "Missing Information", description: "First name, last name, date of birth, and gender are required." });
        return false;
      }
    }
    if (step === "academic") {
      if (!studentForm.gradeLevel) {
        toast({ variant: "destructive", title: "Class Required", description: "Please assign a grade level to the student." });
        return false;
      }
    }
    if (step === "guardian") {
      if (isNewParent && !editingStudent) {
        if (!newParentForm.firstName || !newParentForm.lastName || !newParentForm.phone) {
          toast({ variant: "destructive", title: "Guardian Details Required", description: "First name, last name, and phone number are mandatory for new guardians." });
          return false;
        }
      }
    }
    return true;
  }

  const navigateStep = (direction: 'next' | 'back') => {
    const currentIndex = steps.indexOf(activeStep)
    if (direction === 'next' && currentIndex < steps.length - 1) {
      if (validateStep(activeStep)) {
        setActiveStep(steps[currentIndex + 1])
      }
    } else if (direction === 'back' && currentIndex > 0) {
      setActiveStep(steps[currentIndex - 1])
    }
  }

  const createStudentAccount = async (
    data: any, 
    provisionAuth: FirebaseAuth, 
    batch: any,
    inst: any
  ) => {
    if (!inst) throw new Error("Institutional context is missing during provisioning.");
    
    const finalAdmissionNumber = await generateId('students', inst.schoolCode, 'ST');
    const finalPin = generateStudentPin(); 
    const domain = getInstitutionEmailDomain(inst);

    const studentEmail =
      `${finalAdmissionNumber.trim()}@${domain}`;

    console.log("[Provisioning] Student credentials:", {
      school: inst.name,
      schoolCode: inst.schoolCode,
      admissionNumber: finalAdmissionNumber,
      email: studentEmail
    });
    
    let authUser;
    let authUid = null;
    try {
      const credential = await createUserWithEmailAndPassword(provisionAuth, studentEmail, finalPin);
      authUser = credential.user;
      authUid = authUser.uid;
    } catch (authErr: any) {
      console.log("Student Auth Error");
      console.log(authErr.code);
      console.log(authErr.message);
      throw authErr;
    }

    const studentRef = doc(collection(db, "students"));
    const studentId = studentRef.id;

    batch.set(studentRef, {
      ...data,
      id: studentId,
      admissionNumber: finalAdmissionNumber,
      studentPin: finalPin,
      authUid,
      tenantId: inst.id,
      institutionId: inst.id,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const userUid = authUid || studentId;
    batch.set(doc(db, "users", userUid), {
      uid: userUid,
      name: `${data.firstName} ${data.lastName}`,
      email: studentEmail,
      role: "student",
      studentId: studentId,
      tenantId: inst.id,
      institutionId: inst.id,
      status: "active",
      createdAt: serverTimestamp()
    }, { merge: true });

    if (authUser) await signOut(provisionAuth);
    
    return { studentId, admissionNumber: finalAdmissionNumber, pin: finalPin, authUid };
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || !institution || loading) return
    if (!validateStep(activeStep)) return

    setLoading(true)
    const provisionAppName = `enroll-provision-${Date.now()}`;
    const provisionApp = initializeApp(firebaseConfig, provisionAppName);
    const provisionAuth = getAuth(provisionApp);
    
    try {
      const batch = writeBatch(db)
      let finalParentId = linkedParentId
      let studentId = editingStudent?.id
      
      if (!editingStudent) {
        const { studentId: newId } = await createStudentAccount(studentForm, provisionAuth, batch, institution);
        studentId = newId;

        if (isNewParent) {
          const finalParentNumber = await generateId('parents', institution.schoolCode, 'PR');
          let cleanPass = normalizeSecurityPhone(newParentForm.phone);
          if (cleanPass.length < 6) cleanPass = cleanPass.padEnd(6, '0');
          
          const domain = getInstitutionEmailDomain(institution);
          const parentEmail = (newParentForm.email || `${finalParentNumber.trim()}@${domain}`).toLowerCase();
          
          let parentAuthUser;
          let parentAuthUid = null;
          try {
            const credential = await createUserWithEmailAndPassword(provisionAuth, parentEmail, cleanPass);
            parentAuthUser = credential.user;
            parentAuthUid = parentAuthUser.uid;
          } catch (authErr: any) {
            console.log("Parent Auth Error");
            console.log(authErr.code);
            console.log(authErr.message);
            throw authErr;
          }

          const parentRef = doc(collection(db, "parents"))
          finalParentId = parentRef.id
          batch.set(parentRef, {
            ...newParentForm,
            parentNumber: finalParentNumber,
            phone: normalizeSecurityPhone(newParentForm.phone),
            email: parentEmail,
            id: finalParentId,
            authUid: parentAuthUid,
            tenantId: institutionId,
            institutionId: institutionId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })

          const pUid = parentAuthUid || finalParentId;
          batch.set(doc(db, "users", pUid), {
            uid: pUid,
            name: `${newParentForm.firstName} ${newParentForm.lastName}`,
            email: parentEmail,
            role: "parent",
            tenantId: institutionId,
            institutionId: institutionId,
            status: "active",
            createdAt: serverTimestamp()
          }, { merge: true })

          if (parentAuthUser) await signOut(provisionAuth);
        }
      } else {
        const studentRef = doc(db, "students", editingStudent.id)
        const { id, createdAt, ...sanitizedData } = studentForm as any;
        batch.update(studentRef, { ...sanitizedData, updatedAt: serverTimestamp() });
      }

      if (finalParentId && studentId) {
        const relId = `${studentId}_${finalParentId}`
        batch.set(doc(db, "student_parents", relId), {
          ...relationshipData,
          studentId,
          parentId: finalParentId,
          tenantId: institutionId,
          institutionId,
          updatedAt: serverTimestamp()
        }, { merge: true })
      }

      await batch.commit()
      toast({ title: editingStudent ? "Registry Synchronized" : "Enrollment Successful" })
      setIsEnrollOpen(false); setEditingStudent(null); setStudentForm(initialForm); setActiveStep("identity")
    } catch (error: any) {
      toast({ variant: "destructive", title: "Enrollment Failed", description: error.message });
    } finally { 
      setLoading(false);
      try { await deleteApp(provisionApp); } catch (e) {}
    }
  }

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
  
    if (!file || !institutionId || !institution) {
      return;
    }
  
    setBulkLoading(true);
  
    let provisionApp: FirebaseApp | null = null;
  
    try {
      const provisionAppName = `bulk-provision-${Date.now()}`;
  
      provisionApp = initializeApp(firebaseConfig, provisionAppName);
      const provisionAuth = getAuth(provisionApp);
  
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
      
        transformHeader: (header) => {
          return header
            .replace(/^\uFEFF/, "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
        },
        
          complete: async (results) => {
          try {
            const rawRows = results.data as any[];
  
            console.log(
              `[Bulk Intake] CSV parsed successfully. Rows detected: ${rawRows.length}`
            );
  
            if (!rawRows.length) {
              toast({
                variant: "destructive",
                title: "Empty CSV",
                description: "No student records were found in the uploaded file."
              });
              return;
            }
  
            console.log(
              "[Bulk Intake] First normalized row:",
              rawRows[0]
            );
  
            let successCount = 0;
            let failCount = 0;
            let skippedCount = 0;
  
            for (let index = 0; index < rawRows.length; index++) {
              const row = rawRows[index];
  
              // ---------------------------------------------------------
              // Resolve student name from multiple possible CSV formats
              // ---------------------------------------------------------

              const getValue = (...keys: string[]) => {
                for (const key of keys) {
                  const value = row[key];

                  if (value !== undefined && value !== null) {
                    const cleaned = String(value).trim();

                    if (cleaned) {
                      return cleaned;
                    }
                  }
                }

                return "";
              };

              let first = getValue(
                "firstname",
                "first",
                "givenname",
                "studentfirstname",
                "studentfirst",
                "forename"
              );

              let last = getValue(
                "lastname",
                "last",
                "surname",
                "familyname",
                "studentlastname",
                "studentlast"
              );

              // Support combined name fields.
              if (!first || !last) {
                const fullName = getValue(
                  "name",
                  "fullname",
                  "studentname",
                  "studentfullname",
                  "student"
                );

                if (fullName) {
                  const nameParts = fullName
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean);

                  if (nameParts.length >= 2) {
                    first = nameParts[0];
                    last = nameParts.slice(1).join(" ");
                  }
                }
              }

              // Final validation.
              if (!first || !last) {
                console.warn(
                  `[Bulk Intake] Row ${index + 2} skipped: Missing name.`,
                  {
                    availableColumns: Object.keys(row),
                    row
                  }
                );

                skippedCount++;
                continue;
              }

              console.log(
                `[Bulk Intake] Resolved student: ${first} ${last}`
              );
  
              const gender =
                String(row.gender || "Male").trim() || "Male";
  
              const gradeLevel =
                String(
                  row.grade ||
                  row.class ||
                  row.gradelevel ||
                  row.classlevel ||
                  "Unassigned"
                ).trim() || "Unassigned";
  
              const dateOfBirth =
                String(
                  row.dob ||
                  row.dateofbirth ||
                  row.birthdate ||
                  ""
                ).trim();
  
              console.log(
                `[Bulk Intake] Processing ${index + 1}/${rawRows.length}: ${first} ${last}`
              );
  
              try {
                const batch = writeBatch(db);
  
                const result = await createStudentAccount(
                  {
                    firstName: first,
                    lastName: last,
                    gender,
                    gradeLevel,
                    dateOfBirth,
                    status: "active"
                  },
                  provisionAuth,
                  batch,
                  institution
                );
  
                await batch.commit();
  
                successCount++;
  
                console.log(
                  `[Bulk Intake] SUCCESS: ${first} ${last} → ${result.admissionNumber}`
                );
  
              } catch (rowError: any) {
                failCount++;
  
                console.error(
                  `[Bulk Intake] Row ${index + 2} failed for ${first} ${last}:`,
                  rowError?.code || "",
                  rowError?.message || rowError
                );
              }
            }
  
            console.log("[Bulk Intake] Final results:", {
              total: rawRows.length,
              successful: successCount,
              failed: failCount,
              skipped: skippedCount
            });
  
            toast({
              title: "Registry Sync Complete",
              description:
                `${successCount} students enrolled. ` +
                `${failCount} failed. ` +
                `${skippedCount} skipped.`
            });
  
            setIsBulkOpen(false);
  
          } catch (error: any) {
            console.error("[Bulk Intake] Fatal Failure:", error);
  
            toast({
              variant: "destructive",
              title: "Intake Halted",
              description:
                error?.message || "The bulk enrollment process failed."
            });
  
          } finally {
            setBulkLoading(false);
  
            if (bulkFileRef.current) {
              bulkFileRef.current.value = "";
            }
  
            // Cleanup is handled here exactly once.
            if (provisionApp) {
              try {
                await deleteApp(provisionApp);
                console.log("[Bulk Intake] Temporary Firebase app cleaned up.");
              } catch (cleanupError: any) {
                // Ignore Firebase's "already deleted" error.
                if (cleanupError?.code !== "app/app-deleted") {
                  console.warn(
                    "[Bulk Intake] Firebase app cleanup warning:",
                    cleanupError
                  );
                }
              } finally {
                provisionApp = null;
              }
            }
          }
        },
  
        error: (parseError) => {
          console.error("[Bulk Intake] CSV Parse Error:", parseError);
  
          setBulkLoading(false);
  
          if (bulkFileRef.current) {
            bulkFileRef.current.value = "";
          }
  
          toast({
            variant: "destructive",
            title: "CSV Import Failed",
            description:
              parseError?.message ||
              "The uploaded CSV file could not be read."
          });
  
          if (provisionApp) {
            deleteApp(provisionApp)
              .catch((cleanupError: any) => {
                if (cleanupError?.code !== "app/app-deleted") {
                  console.warn(
                    "[Bulk Intake] Cleanup warning:",
                    cleanupError
                  );
                }
              });
  
            provisionApp = null;
          }
        }
      });
  
    } catch (error: any) {
      console.error("[Bulk Intake] Initialization Error:", error);
  
      setBulkLoading(false);
  
      if (bulkFileRef.current) {
        bulkFileRef.current.value = "";
      }
  
      if (provisionApp) {
        try {
          await deleteApp(provisionApp);
        } catch (cleanupError: any) {
          if (cleanupError?.code !== "app/app-deleted") {
            console.warn(
              "[Bulk Intake] Cleanup warning:",
              cleanupError
            );
          }
        }
  
        provisionApp = null;
      }
  
      toast({
        variant: "destructive",
        title: "Bulk Intake Failed",
        description:
          error?.message ||
          "Unable to initialize the student provisioning service."
      });
    }
  };
  const handleDeactivateStudent = async (id: string) => {
    if (!confirm("Are you sure?")) return
    setLoading(true);
    const docRef = doc(db, "students", id);
    updateDoc(docRef, { status: "inactive", updatedAt: serverTimestamp() })
      .then(() => toast({ title: "Enrollment deactivated." }))
      .catch(async (err: any) => {
        const pError = new FirestorePermissionError({ path: docRef.path, operation: 'update' });
        errorEmitter.emit('permission-error', pError);
      })
      .finally(() => setLoading(false));
  }

  const handleResetPin = async (stu: any) => {
    if (!institutionId || !institution || loading) return;
    setLoading(true);
    const provisionAppName = `reset-pin-${Date.now()}`;
    const provisionApp = initializeApp(firebaseConfig, provisionAppName);
    const provisionAuth = getAuth(provisionApp);

    try {
      const newPin = generateStudentPin();
      const domain = getInstitutionEmailDomain(institution);
      const studentEmail = `${stu.admissionNumber.trim()}@${domain}`;
      const uid = stu.authUid || stu.id;
      
      try {
        await createUserWithEmailAndPassword(provisionAuth, studentEmail, newPin);
      } catch (authErr: any) {
        console.log("PIN Reset Auth context caught.");
      }

      await setDoc(doc(db, "users", uid), {
        uid: uid,
        name: `${stu.firstName} ${stu.lastName}`,
        email: studentEmail,
        role: "student",
        studentId: stu.id,
        tenantId: institutionId,
        institutionId: institutionId,
        status: "active",
        createdAt: serverTimestamp()
      }, { merge: true });

      await updateDoc(doc(db, "students", stu.id), {
        studentPin: newPin,
        updatedAt: serverTimestamp()
      });

      toast({ title: "PIN Synchronized", description: `New PIN: ${newPin}` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: e.message });
    } finally {
      setLoading(false);
      try { await deleteApp(provisionApp); } catch (e) {}
    }
  }

  const openEdit = (stu: any) => {
    setEditingStudent(stu)
    setStudentForm({ ...initialForm, ...stu })
    const rel = allRels.find(r => r.studentId === stu.id)
    if (rel) {
      setLinkedParentId(rel.parentId)
      setRelationshipData({ ...relationshipData, relationship: rel.relationship, primaryContact: rel.primaryContact })
    }
    setIsEnrollOpen(true)
    setActiveStep("identity")
  }

  if (profileLoading || studentsLoading) return (
    <div className="p-24 text-center">
      <Loader2 className="size-10 animate-spin mx-auto text-primary" />
      <p className="mt-4 font-bold text-muted-foreground animate-pulse uppercase tracking-widest text-xs">Synchronizing Student Registry...</p>
    </div>
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Active Enrollments</h1>
          <p className="text-muted-foreground font-medium">Strategic institutional enrollment and lifecycle management.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="h-11 rounded-xl" onClick={() => setIsBulkOpen(true)}>
            <FileSpreadsheet className="size-4 mr-2" /> Bulk Intake
          </Button>
          <Button variant="outline" className="h-11 rounded-xl" asChild><Link href="/dashboard/students/id-cards"><IdCard className="size-4 mr-2" /> ID Cards</Link></Button>
          <Button className="bg-primary rounded-xl h-11 shadow-lg gap-2" onClick={() => { setEditingStudent(null); setStudentForm(initialForm); setIsEnrollOpen(true); setActiveStep("identity"); }}>
            <UserPlus className="size-4" /> Enroll Student
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
        <CardHeader className="border-b py-6 p-4 md:p-6 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-sm w-full sm:max-w-sm">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input placeholder="Search active records..." className="pl-10 h-12 bg-white border-none rounded-xl shadow-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/5 text-primary border-none text-[10px] font-bold uppercase tracking-widest px-4 h-10 flex items-center">
                {rawStudents.length} Active Students
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Accordion type="multiple" className="w-full space-y-4" defaultValue={[...Object.keys(groupedStudents)]}>
            {Object.entries(groupedStudents)
              .sort(([gradeA], [gradeB]) => gradeA.localeCompare(gradeB))
              .map(([grade, students]) => (
                <AccordionItem 
                  key={grade} 
                  value={grade} 
                  className="border border-slate-100 bg-slate-50/30 rounded-2xl overflow-hidden"
                >
                  <AccordionTrigger className="hover:no-underline px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-primary/5 flex items-center justify-center">
                        <Layers className="size-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-lg font-headline font-bold text-primary">{grade}</h2>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                          {students.length} Registered Students
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-0">
                    <div className="overflow-x-auto bg-white border-t">
                      <Table>
                        <TableHeader className="bg-muted/10">
                          <TableRow>
                            <TableHead className="py-4 font-bold px-6">STUDENT / REGISTRY ID</TableHead>
                            <TableHead className="py-4 font-bold">PORTAL PIN</TableHead>
                            <TableHead className="py-4 font-bold">GUARDIAN LINK</TableHead>
                            <TableHead className="py-4 font-bold">STATUS</TableHead>
                            <TableHead className="text-right py-4 font-bold px-6">ACTIONS</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {students.map((stu: any) => {
                            const mainRel = allRels.find(r => r.studentId === stu.id && r.primaryContact);
                            const parent = parents.find(p => p.id === mainRel?.parentId);
                            return (
                              <TableRow key={stu.id} className="hover:bg-slate-50 transition-colors group">
                                <TableCell className="px-6">
                                  <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-primary/5 flex items-center justify-center overflow-hidden border">
                                      {stu.photoUrl ? <img src={stu.photoUrl} className="w-full h-full object-cover" /> : <User className="size-5 text-primary/20" />}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-bold text-primary">{stu.firstName} {stu.lastName}</span>
                                      <span className="text-[10px] font-mono font-bold text-accent">{stu.admissionNumber}</span>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {stu.studentPin ? (
                                      <Badge className="h-7 px-3 text-xs font-mono bg-primary text-white border-none shadow-sm gap-2 font-bold">
                                        <Key className="size-3 text-accent" />
                                        {stu.studentPin}
                                      </Badge>
                                    ) : (
                                      <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase text-accent hover:text-accent hover:bg-accent/5 gap-2" onClick={() => handleResetPin(stu)} disabled={loading}>
                                        <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} /> Generate PIN
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col text-xs">
                                    <span className="font-bold">{parent ? `${parent.firstName} ${parent.lastName}` : "No Primary"}</span>
                                    <span className="text-muted-foreground text-[10px] uppercase font-bold">{mainRel?.relationship || "Unlinked"}</span>
                                  </div>
                                </TableCell>
                                <TableCell><Badge variant="outline" className={`text-[9px] uppercase font-bold ${stu.status === 'active' ? 'text-green-600 bg-green-50' : 'text-slate-500 bg-slate-50'}`}>
                                  {stu.status}
                                </Badge></TableCell>
                                <TableCell className="text-right px-6">
                                   <div className="flex items-center justify-end gap-1">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreVertical className="size-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-xl border-none shadow-xl w-48">
                                          <DropdownMenuItem className="gap-2 text-xs font-bold" onSelect={() => openEdit(stu)}>
                                            <Pencil className="size-4" /> Edit Profile
                                          </DropdownMenuItem>
                                          <DropdownMenuItem className="gap-2 text-xs font-bold text-accent" onSelect={() => handleResetPin(stu)}>
                                            <ShieldAlert className="size-4" /> Reset Portal PIN
                                          </DropdownMenuItem>
                                          <DropdownMenuItem className="gap-2 text-xs font-bold text-destructive" onSelect={(e) => { e.preventDefault(); handleDeactivateStudent(stu.id); }}>
                                            <Trash2 className="size-4" /> Deactivate Enrollment
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                   </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
          </Accordion>
        </CardContent>
      </Card>

      <Dialog open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl md:rounded-3xl max-h-[90vh] flex flex-col">
          <form onSubmit={handleEnroll} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="bg-primary text-primary-foreground p-8 shrink-0">
              <Badge className="bg-white/10 text-white border-none text-[10px] font-bold uppercase tracking-widest mb-2 w-fit">Wizard Step {steps.indexOf(activeStep) + 1}</Badge>
              <DialogTitle className="text-2xl font-headline font-bold">{editingStudent ? "Update Registry" : "New Enrollment Wizard"}</DialogTitle>
            </DialogHeader>

            <Tabs value={activeStep} className="flex-1 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 p-8">
                <TabsContent value="identity" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admission Number</Label>
                       <div className="h-11 px-4 rounded-xl bg-slate-50 flex items-center border border-dashed border-slate-200">
                          <Badge variant="secondary" className="font-mono text-xs font-bold uppercase bg-slate-200 text-slate-600 border-none">
                             {studentForm.admissionNumber}
                          </Badge>
                       </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">First Name</Label>
                      <Input required value={studentForm.firstName} onChange={e => setStudentForm({...studentForm, firstName: e.target.value})} className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Last Name</Label>
                      <Input required value={studentForm.lastName} onChange={e => setStudentForm({...studentForm, lastName: e.target.value})} className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Gender</Label>
                      <Select required value={studentForm.gender} onValueChange={v => setStudentForm({...studentForm, gender: v})}>
                        <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Date of Birth</Label>
                      <Input required type="date" value={studentForm.dateOfBirth} onChange={e => setStudentForm({...studentForm, dateOfBirth: e.target.value})} className="h-11 rounded-xl" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="academic" className="space-y-6 mt-0">
                  <div className="space-y-2">
                    <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Assign Grade Level</Label>
                    <Select required value={studentForm.gradeLevel} onValueChange={v => setStudentForm({...studentForm, gradeLevel: v})}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select Class" /></SelectTrigger>
                      <SelectContent>{registeredClasses.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="guardian" className="space-y-8 mt-0">
                   <div className="flex items-center justify-between border-b pb-4">
                      <h3 className="font-bold flex items-center gap-2 text-primary"><HeartHandshake className="size-4" /> Guardian Link</h3>
                      <Button type="button" variant="outline" size="sm" className="h-9 rounded-lg gap-2" onClick={() => setIsNewParent(!isNewParent)}>
                        {isNewParent ? <Search className="size-3.5" /> : <UserPlus className="size-3.5" />}
                        {isNewParent ? "Registry Search" : "Register New Profile"}
                      </Button>
                   </div>
                   
                   {isNewParent ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-slate-50 rounded-2xl border-2 border-dashed animate-in fade-in zoom-in-95 duration-200">
                        <div className="space-y-2">
                          <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">First Name</Label>
                          <Input value={newParentForm.firstName} onChange={e => setNewParentForm({...newParentForm, firstName: e.target.value})} className="h-11 bg-white" />
                        </div>
                        <div className="space-y-2">
                          <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Last Name</Label>
                          <Input value={newParentForm.lastName} onChange={e => setNewParentForm({...newParentForm, lastName: e.target.value})} className="h-11 bg-white" />
                        </div>
                        <div className="space-y-2">
                          <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">Contact Phone (Portal Password)</Label>
                          <Input value={newParentForm.phone} onChange={e => setNewParentForm({...newParentForm, phone: e.target.value})} className="h-11 bg-white" />
                        </div>
                        <div className="space-y-2 md:col-span-2"><Label>Guardian Email (Portal ID)</Label><Input type="email" value={newParentForm.email} onChange={e => setNewParentForm({...newParentForm, email: e.target.value})} className="h-11 bg-white" /></div>
                     </div>
                   ) : (
                     <div className="space-y-4 animate-in fade-in duration-200">
                        <Label>Search Existing Parents</Label>
                        <Select value={linkedParentId} onValueChange={setLinkedParentId}>
                           <SelectTrigger className="h-14 rounded-xl text-primary font-medium">
                              <SelectValue placeholder="🔍 Search registry..." />
                           </SelectTrigger>
                           <SelectContent>
                              {parents.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName} • {p.parentNumber}</SelectItem>)}
                           </SelectContent>
                        </Select>
                     </div>
                   )}

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t">
                      <div className="space-y-2"><Label>Relationship</Label>
                         <Select value={relationshipData.relationship} onValueChange={v => setRelationshipData({...relationshipData, relationship: v})}>
                            <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="Mother">Mother</SelectItem><SelectItem value="Father">Father</SelectItem><SelectItem value="Guardian">Guardian</SelectItem></SelectContent>
                         </Select>
                      </div>
                      <div className="flex items-center gap-2 pt-8">
                        <Checkbox id="primary" checked={relationshipData.primaryContact} onCheckedChange={v => setRelationshipData({...relationshipData, primaryContact: !!v})} />
                        <Label htmlFor="primary" className="cursor-pointer">Primary Contact</Label>
                      </div>
                   </div>
                </TabsContent>

                <TabsContent value="finalize" className="space-y-8 mt-0 text-center py-10">
                   <div className="size-20 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600 mb-4"><CheckCircle2 className="size-12" /></div>
                   <h3 className="text-xl font-bold font-headline">Authorization Required</h3>
                   <p className="text-sm text-muted-foreground">Confirm to authorize unique ID generation and portal access.</p>
                   <div className="p-4 bg-slate-50 rounded-2xl border flex items-center justify-center gap-3">
                      <KeyRound className="size-5 text-primary" />
                      <span className="text-xs font-bold text-primary uppercase">Direct Portal Access Active</span>
                   </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <DialogFooter className="bg-slate-50 p-8 border-t shrink-0 flex items-center justify-between">
              <Button type="button" variant="ghost" className="h-12 px-6 rounded-xl" onClick={() => navigateStep('back')} disabled={activeStep === 'identity'}>
                <ChevronLeft className="size-4 mr-2" /> Back
              </Button>
              <div className="flex gap-3">
                 {activeStep === "finalize" ? (
                   <Button type="submit" disabled={loading} className="h-12 px-8 rounded-xl bg-primary font-bold shadow-xl">
                      {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                      Finalize Enrollment
                   </Button>
                 ) : (
                   <Button type="button" className="h-12 px-8 rounded-xl bg-primary font-bold gap-2" onClick={() => navigateStep('next')}>
                     Next <ChevronRight className="size-4" />
                   </Button>
                 )}
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
           <DialogHeader className="p-8 bg-primary text-primary-foreground">
              <div className="flex items-center gap-3 mb-2">
                 <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center"><FileSpreadsheet className="size-6 text-accent" /></div>
                 <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Bulk Data Intake</span>
              </div>
              <DialogTitle className="text-2xl font-headline font-bold">CSV Enrollment Wizard</DialogTitle>
              <DialogDescription className="text-primary-foreground/70">Provision multiple student accounts simultaneously with verified registry mapping.</DialogDescription>
           </DialogHeader>

           <div className="p-8 space-y-8">
              <div className="p-6 rounded-2xl border-2 border-dashed bg-slate-50 space-y-4">
                 <h4 className="text-sm font-bold flex items-center gap-2 text-primary"><FileText className="size-4" /> Expected CSV Structure</h4>
                 <p className="text-xs text-muted-foreground leading-relaxed">
                   Upload a UTF-8 encoded CSV file with the following headers (order does not matter):
                 </p>
                 <div className="flex flex-wrap gap-2">
                    {['FirstName', 'LastName', 'Gender', 'Grade', 'DOB'].map(h => (
                      <Badge key={h} variant="secondary" className="font-mono text-[10px] bg-white border">{h}</Badge>
                    ))}
                 </div>
                 <p className="text-[10px] text-muted-foreground italic font-medium">Note: Portal Access IDs and PINs will be generated automatically for every row.</p>
              </div>

              <div className="space-y-4">
                 <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Authorize Registry File</Label>
                 <Input 
                   type="file" 
                   ref={bulkFileRef} 
                   accept=".csv" 
                   onChange={handleBulkUpload} 
                   disabled={bulkLoading}
                   className="h-14 rounded-2xl bg-white border-2 border-slate-100 flex items-center p-4 cursor-pointer file:bg-primary file:text-white file:rounded-lg file:border-none file:text-[10px] file:uppercase file:font-bold file:px-4 file:h-full file:mr-4 hover:border-primary/20 transition-all"
                 />
              </div>
           </div>

           <DialogFooter className="p-8 bg-slate-50 border-t flex justify-between items-center">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground">
                 <ShieldCheck className="size-4 text-green-600" /> Multi-Tenant Sync Active
              </div>
              <Button variant="ghost" onClick={() => setIsBulkOpen(false)} className="rounded-xl font-bold uppercase text-xs">Close Wizard</Button>
           </DialogFooter>

           {bulkLoading && (
             <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[60] flex flex-col items-center justify-center gap-4">
                <Loader2 className="size-12 animate-spin text-primary" />
                <div className="text-center">
                   <p className="font-headline font-bold text-lg text-primary animate-pulse">Provisioning Registry...</p>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Generating unique IDs and Portal Credentials</p>
                </div>
             </div>
           )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function StudentsPage() {
  return (
    <Suspense fallback={
      <div className="p-24 text-center">
        <Loader2 className="size-10 animate-spin mx-auto text-primary opacity-20" />
        <p className="mt-4 font-bold text-muted-foreground animate-pulse uppercase tracking-widest text-xs">Hydrating Student Registry...</p>
      </div>
    }>
      <StudentsRegistryContent />
    </Suspense>
  )
}
