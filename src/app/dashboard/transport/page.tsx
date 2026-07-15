
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bus, Plus, Search, Trash2, Pencil, Loader2, MapPin, Navigation, User, ShieldCheck, Map, Truck } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, query, where, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function TransportHubPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isVehicleOpen, setIsVehicleOpen] = useState(false)
  const [isRouteOpen, setIsRouteOpen] = useState(false)

  const [vehicleForm, setVehicleForm] = useState({ plateNumber: "", model: "", capacity: "30", driverName: "" })
  const [routeForm, setRouteForm] = useState({ name: "", vehicleId: "", monthlyFee: "150" })

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const vehiclesQuery = useMemo(() => institutionId ? query(collection(db!, "vehicles"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const routesQuery = useMemo(() => institutionId ? query(collection(db!, "routes"), where("tenantId", "==", institutionId)) : null, [db, institutionId])
  const staffQuery = useMemo(() => institutionId ? query(collection(db!, "staff"), where("tenantId", "==", institutionId)) : null, [db, institutionId])

  const { data: vehicles } = useCollection(vehiclesQuery)
  const { data: routes } = useCollection(routesQuery)
  const { data: staff } = useCollection(staffQuery)

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    setLoading(true)
    try {
      await addDoc(collection(db, "vehicles"), {
        ...vehicleForm,
        capacity: parseInt(vehicleForm.capacity),
        status: "Available",
        tenantId: institutionId,
        createdAt: serverTimestamp()
      })
      toast({ title: "Vehicle Registered", description: "Fleet updated successfully." })
      setIsVehicleOpen(false)
      setVehicleForm({ plateNumber: "", model: "", capacity: "30", driverName: "" })
    } catch (e: any) { toast({ variant: "destructive", title: "Error" }) } finally { setLoading(false) }
  }

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    setLoading(true)
    try {
      await addDoc(collection(db, "routes"), {
        ...routeForm,
        monthlyFee: parseFloat(routeForm.monthlyFee),
        tenantId: institutionId,
        createdAt: serverTimestamp()
      })
      toast({ title: "Route Established", description: "New pickup path active." })
      setIsRouteOpen(false)
      setRouteForm({ name: "", vehicleId: "", monthlyFee: "150" })
    } catch (e: any) { toast({ variant: "destructive", title: "Error" }) } finally { setLoading(false) }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary tracking-tight">Institutional Transport</h1>
          <p className="text-muted-foreground">Managing fleet logistics and student commute routes.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-11 rounded-xl" onClick={() => setIsVehicleOpen(true)}><Truck className="size-4 mr-2" /> Add Vehicle</Button>
          <Button className="bg-primary h-11 rounded-xl shadow-lg gap-2" onClick={() => setIsRouteOpen(true)}><Map className="size-4" /> Create Route</Button>
        </div>
      </div>

      <Tabs defaultValue="fleet" className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="fleet" className="rounded-lg gap-2"><Bus className="size-4" /> Fleet Management</TabsTrigger>
          <TabsTrigger value="routes" className="rounded-lg gap-2"><Navigation className="size-4" /> Route Registry</TabsTrigger>
        </TabsList>

        <TabsContent value="fleet" className="space-y-6">
           <div className="grid gap-6 md:grid-cols-4">
              {vehicles.map((v: any) => (
                <Card key={v.id} className="border-none shadow-md hover:shadow-lg transition-shadow bg-white rounded-2xl overflow-hidden">
                  <div className="h-2 bg-primary" />
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <Badge className="bg-primary/10 text-primary border-none text-[10px] font-bold uppercase">{v.plateNumber}</Badge>
                      <Badge variant="outline" className="text-[9px] uppercase">{v.status}</Badge>
                    </div>
                    <CardTitle className="text-lg mt-3">{v.model}</CardTitle>
                    <CardDescription className="text-xs flex items-center gap-1"><User className="size-3" /> Driver: {v.driverName}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase">
                      <span>Capacity</span>
                      <span className="text-primary">{v.capacity} Seats</span>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50 border-t flex justify-between p-3">
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase">Log Service</Button>
                    <Button variant="ghost" size="sm" className="h-8 text-destructive"><Trash2 className="size-3.5" /></Button>
                  </CardFooter>
                </Card>
              ))}
              {vehicles.length === 0 && <div className="col-span-4 p-24 text-center text-muted-foreground opacity-30 italic">No vehicles registered in fleet.</div>}
           </div>
        </TabsContent>

        <TabsContent value="routes" className="space-y-6">
          <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-white">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-bold py-4">ROUTE NAME</TableHead>
                    <TableHead className="font-bold py-4">ASSIGNED VEHICLE</TableHead>
                    <TableHead className="font-bold py-4">MONTHLY FEE</TableHead>
                    <TableHead className="text-right py-4 font-bold">ACTION</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map((r: any) => (
                    <TableRow key={r.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell><div className="flex items-center gap-3"><MapPin className="size-4 text-primary" /><span className="font-bold text-primary">{r.name}</span></div></TableCell>
                      <TableCell><span className="text-sm font-medium text-slate-600">{vehicles.find(v => v.id === r.vehicleId)?.plateNumber || "Unassigned"}</span></TableCell>
                      <TableCell><span className="text-sm font-bold">GH₵ {r.monthlyFee?.toLocaleString()}</span></TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="size-3.5" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {routes.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic">No transport routes established.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isVehicleOpen} onOpenChange={setIsVehicleOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <form onSubmit={handleAddVehicle}>
            <DialogHeader><DialogTitle>Register Fleet Vehicle</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label>Plate Number</Label><Input required value={vehicleForm.plateNumber} onChange={e => setVehicleForm({...vehicleForm, plateNumber: e.target.value})} placeholder="e.g. AS-1234-26" /></div>
              <div className="space-y-2"><Label>Vehicle Model</Label><Input required value={vehicleForm.model} onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})} placeholder="e.g. Toyota Coaster" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Passenger Capacity</Label><Input type="number" required value={vehicleForm.capacity} onChange={e => setVehicleForm({...vehicleForm, capacity: e.target.value})} /></div>
                <div className="space-y-2"><Label>Primary Driver</Label><Input value={vehicleForm.driverName} onChange={e => setVehicleForm({...vehicleForm, driverName: e.target.value})} /></div>
              </div>
            </div>
            <DialogFooter><Button type="submit" disabled={loading} className="w-full h-11">Authorize Registration</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isRouteOpen} onOpenChange={setIsRouteOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <form onSubmit={handleAddRoute}>
            <DialogHeader><DialogTitle>Establish New Route</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label>Route Name</Label><Input required value={routeForm.name} onChange={e => setRouteForm({...routeForm, name: e.target.value})} placeholder="e.g. Goaso Central - Hub" /></div>
              <div className="space-y-2"><Label>Assign Fleet Vehicle</Label>
                <Select onValueChange={v => setRouteForm({...routeForm, vehicleId: v})}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Choose Vehicle" /></SelectTrigger>
                  <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plateNumber} ({v.model})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Monthly Transport Fee (GH₵)</Label><Input type="number" required value={routeForm.monthlyFee} onChange={e => setRouteForm({...routeForm, monthlyFee: e.target.value})} /></div>
            </div>
            <DialogFooter><Button type="submit" disabled={loading} className="w-full h-11">Establish Path</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
