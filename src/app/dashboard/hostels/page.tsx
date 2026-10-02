
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Building2, Plus, Search, Trash2, Pencil, Loader2, UserPlus, LogOut, CheckCircle2, Bed, Users } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, query, where, deleteDoc, doc, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function HostelManagementPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isRoomOpen, setIsRoomOpen] = useState(false)
  const [isCheckInOpen, setIsCheckInOpen] = useState(false)

  const [roomForm, setRoomForm] = useState({ name: "", gender: "Male", capacity: "4" })
  const [checkInForm, setCheckInForm] = useState({ studentId: "", roomId: "", bedNumber: "" })

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const roomsQuery = useMemo(() => institutionId ? query(collection(db!, "hostels"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const studentsQuery = useMemo(() => institutionId ? query(collection(db!, "students"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const logsQuery = useMemo(() => institutionId ? query(collection(db!, "hostel_logs"), where("tenantId", "==", institutionId), where("status", "==", "Active")) : null, [db, institutionId])

  const { data: rooms } = useCollection(roomsQuery)
  const { data: students } = useCollection(studentsQuery)
  const { data: activeLogs } = useCollection(logsQuery)

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    setLoading(true)
    try {
      await addDoc(collection(db, "hostels"), {
        ...roomForm,
        capacity: parseInt(roomForm.capacity),
        occupiedBeds: 0,
        tenantId: institutionId,
        createdAt: serverTimestamp()
      })
      toast({ title: "Room Registered", description: `Room ${roomForm.name} added to hostel.` })
      setIsRoomOpen(false)
      setRoomForm({ name: "", gender: "Male", capacity: "4" })
    } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }) } finally { setLoading(false) }
  }

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    setLoading(true)

    const selectedRoom = rooms.find(r => r.id === checkInForm.roomId)
    const selectedStudent = students.find(s => s.id === checkInForm.studentId)

    try {
      const batch = writeBatch(db)
      const logRef = doc(collection(db, "hostel_logs"))
      
      batch.set(logRef, {
        tenantId: institutionId,
        studentId: checkInForm.studentId,
        studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        roomId: checkInForm.roomId,
        roomName: selectedRoom.name,
        bedNumber: checkInForm.bedNumber,
        checkInDate: new Date().toISOString().split('T')[0],
        status: "Active",
        createdAt: serverTimestamp()
      })

      batch.update(doc(db, "hostels", checkInForm.roomId), {
        occupiedBeds: (selectedRoom.occupiedBeds || 0) + 1
      })

      await batch.commit()
      toast({ title: "Check-In Authorized", description: `${selectedStudent.firstName} assigned to ${selectedRoom.name}.` })
      setIsCheckInOpen(false)
    } catch (e: any) { toast({ variant: "destructive", title: "Check-In Failed" }) } finally { setLoading(false) }
  }

  const handleCheckOut = async (log: any) => {
    if (!db || loading) return
    setLoading(true)
    try {
      const batch = writeBatch(db)
      batch.update(doc(db, "hostel_logs", log.id), { status: "Checked Out", checkOutDate: new Date().toISOString().split('T')[0] })
      const room = rooms.find(r => r.id === log.roomId)
      if (room) {
        batch.update(doc(db, "hostels", log.roomId), { occupiedBeds: Math.max(0, room.occupiedBeds - 1) })
      }
      await batch.commit()
      toast({ title: "Check-Out Complete", description: "Bed has been released." })
    } catch (e: any) { toast({ variant: "destructive", title: "Check-Out Failed" }) } finally { setLoading(false) }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Hostel Registry</h1>
          <p className="text-muted-foreground">Managing residential capacity and student boarding status.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-11 rounded-xl" onClick={() => setIsRoomOpen(true)}><Building2 className="size-4 mr-2" /> Register Room</Button>
          <Button className="bg-primary h-11 rounded-xl shadow-lg gap-2" onClick={() => setIsCheckInOpen(true)}><UserPlus className="size-4" /> Check In Student</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2"><CardDescription className="text-[10px] font-bold uppercase">Total Rooms</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold font-headline">{rooms.length}</div></CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2"><CardDescription className="text-[10px] font-bold uppercase">Total Beds</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold font-headline">{rooms.reduce((a, c: any) => a + c.capacity, 0)}</div></CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2"><CardDescription className="text-[10px] font-bold uppercase">Occupancy</CardDescription></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline text-primary">
              {Math.round((activeLogs.length / (rooms.reduce((a, c: any) => a + c.capacity, 0) || 1)) * 100)}%
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardHeader className="pb-2"><CardDescription className="text-[10px] font-bold uppercase">Active Boarders</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold font-headline text-accent">{activeLogs.length}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-1 border-none shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="border-b bg-white"><CardTitle className="text-lg">Room Inventory</CardTitle></CardHeader>
          <CardContent className="p-0">
             <div className="divide-y max-h-[500px] overflow-y-auto">
               {rooms.map((r: any) => (
                 <div key={r.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                   <div className="flex items-center gap-3">
                     <div className={`size-10 rounded-xl flex items-center justify-center font-bold ${r.gender === 'Male' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                        {r.name.charAt(0)}
                     </div>
                     <div className="flex flex-col">
                       <span className="font-bold text-primary">{r.name}</span>
                       <span className="text-[10px] text-muted-foreground uppercase font-medium">{r.gender} • {r.capacity} Beds</span>
                     </div>
                   </div>
                   <Badge variant="outline" className={`text-[10px] ${r.occupiedBeds >= r.capacity ? 'text-destructive border-destructive/20' : 'text-green-600 border-green-200'}`}>
                     {r.occupiedBeds} / {r.capacity}
                   </Badge>
                 </div>
               ))}
               {rooms.length === 0 && <div className="p-12 text-center text-muted-foreground italic text-sm">No rooms registered.</div>}
             </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-xl rounded-2xl overflow-hidden bg-white">
          <CardHeader className="border-b"><CardTitle className="text-lg">Active Occupancy Log</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="font-bold py-4">STUDENT</TableHead>
                  <TableHead className="font-bold py-4">ROOM / BED</TableHead>
                  <TableHead className="font-bold py-4">JOINED</TableHead>
                  <TableHead className="text-right py-4 font-bold">ACTION</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeLogs.map((log: any) => (
                  <TableRow key={log.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell><span className="font-bold text-primary text-sm">{log.studentName}</span></TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{log.roomName}</span>
                        <span className="text-[10px] text-muted-foreground">Bed: {log.bedNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-xs font-medium">{log.checkInDate}</span></TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 gap-2 h-8 rounded-lg" onClick={() => handleCheckOut(log)}>
                         <LogOut className="size-3" /> Check Out
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {activeLogs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-24 text-muted-foreground italic">No students currently checked in.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isRoomOpen} onOpenChange={setIsRoomOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <form onSubmit={handleAddRoom}>
            <DialogHeader><DialogTitle className="text-2xl font-headline font-bold">Register New Room</DialogTitle></DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="space-y-2"><Label>Room Name / ID</Label><Input required value={roomForm.name} onChange={e => setRoomForm({...roomForm, name: e.target.value})} placeholder="e.g. Block A, Room 12" className="h-12 rounded-xl" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Gender Allocation</Label>
                  <Select value={roomForm.gender} onValueChange={v => setRoomForm({...roomForm, gender: v})}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Male">Male Only</SelectItem><SelectItem value="Female">Female Only</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Total Capacity (Beds)</Label><Input type="number" required value={roomForm.capacity} onChange={e => setRoomForm({...roomForm, capacity: e.target.value})} className="h-12 rounded-xl" /></div>
              </div>
            </div>
            <DialogFooter><Button type="submit" disabled={loading} className="w-full h-12 rounded-xl font-bold bg-primary shadow-lg">{loading ? <Loader2 className="animate-spin" /> : "Authorize Registry"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <form onSubmit={handleCheckIn}>
            <DialogHeader><DialogTitle className="text-2xl font-headline font-bold">Student Check-In</DialogTitle></DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="space-y-2">
                <Label>Select Student</Label>
                <Select required onValueChange={v => setCheckInForm({...checkInForm, studentId: v})}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Search Students" /></SelectTrigger>
                  <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assign Room</Label>
                <Select required onValueChange={v => setCheckInForm({...checkInForm, roomId: v})}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Choose Room" /></SelectTrigger>
                  <SelectContent>{rooms.filter(r => r.occupiedBeds < r.capacity).map(r => <SelectItem key={r.id} value={r.id}>{r.name} ({r.occupiedBeds}/{r.capacity})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Bed / Rack Number</Label><Input required value={checkInForm.bedNumber} onChange={e => setCheckInForm({...checkInForm, bedNumber: e.target.value})} placeholder="e.g. Bed 01-Top" className="h-12 rounded-xl" /></div>
            </div>
            <DialogFooter><Button type="submit" disabled={loading} className="w-full h-12 rounded-xl font-bold bg-primary shadow-lg">Authorize Check-In</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
