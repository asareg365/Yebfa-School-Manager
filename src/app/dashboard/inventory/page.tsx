
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Package, 
  Plus, 
  Search, 
  Trash2, 
  Pencil, 
  Loader2, 
  Monitor, 
  Printer, 
  Settings,
  ShieldAlert,
  Calendar,
  Box,
  Truck
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection } from "@/firebase"
import { collection, addDoc, query, where, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const CATEGORIES = ["Furniture", "Computers", "Printers", "Projectors", "Sports Equipment", "Science Lab", "Office Supplies"]
const CONDITIONS = ["New", "Good", "Fair", "Poor", "Broken"]

export default function InventoryManagementPage() {
  const db = useFirestore()
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const [itemForm, setItemForm] = useState({
    name: "",
    category: "Furniture",
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: "",
    condition: "New",
    warrantyExpiry: "",
    serialNumber: "",
    assignedTo: "",
    depreciationRate: "10"
  })

  useEffect(() => {
    setInstitutionId(localStorage.getItem('selected_institution_id'))
  }, [])

  const inventoryQuery = useMemo(() => {
    if (!db || !institutionId) return null
    return query(collection(db, "inventory"), where("tenantId", "==", institutionId))
  }, [db, institutionId])

  const { data: items, loading: dataLoading } = useCollection(inventoryQuery)

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !institutionId || loading) return
    setLoading(true)
    
    const data = {
      ...itemForm,
      purchasePrice: parseFloat(itemForm.purchasePrice) || 0,
      depreciationRate: parseFloat(itemForm.depreciationRate) || 0,
      tenantId: institutionId,
      createdAt: serverTimestamp()
    }

    try {
      await addDoc(collection(db, "inventory"), data)
      toast({ title: "Asset Registered", description: `${itemForm.name} added to inventory.` })
      setIsAddOpen(false)
      setItemForm({
        name: "", category: "Furniture", purchaseDate: new Date().toISOString().split('T')[0],
        purchasePrice: "", condition: "New", warrantyExpiry: "", serialNumber: "",
        assignedTo: "", depreciationRate: "10"
      })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Registration Failed", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = items.filter(i => 
    i.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.assignedTo?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalValue = items.reduce((a, c: any) => a + (c.purchasePrice || 0), 0)
  const maintenanceCount = items.filter(i => i.condition === 'Poor' || i.condition === 'Broken').length

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold text-primary">Asset Inventory</h1>
          <p className="text-muted-foreground">Tracking {items.length} institutional assets and equipment.</p>
        </div>
        <Button className="gap-2 bg-primary rounded-xl h-11 shadow-lg" onClick={() => setIsAddOpen(true)}>
          <Plus className="size-4" /> Register New Asset
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
         <Card className="border-none shadow-md">
            <CardHeader className="pb-2"><CardDescription className="text-[10px] font-bold uppercase">Asset Value</CardDescription></CardHeader>
            <CardContent><div className="text-2xl font-bold font-headline text-primary">GH₵ {totalValue.toLocaleString()}</div></CardContent>
         </Card>
         <Card className="border-none shadow-md">
            <CardHeader className="pb-2"><CardDescription className="text-[10px] font-bold uppercase">Maintenance Needed</CardDescription></CardHeader>
            <CardContent><div className="text-2xl font-bold font-headline text-destructive">{maintenanceCount}</div></CardContent>
         </Card>
         <Card className="border-none shadow-md">
            <CardHeader className="pb-2"><CardDescription className="text-[10px] font-bold uppercase">Critical Assets</CardDescription></CardHeader>
            <CardContent><div className="text-2xl font-bold font-headline">{items.filter(i => i.category === 'Science Lab' || i.category === 'Computers').length}</div></CardContent>
         </Card>
      </div>

      <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="bg-white border-b py-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, category or user..." 
              className="pl-10 h-12 bg-slate-50 border-none rounded-xl" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4 font-bold">ASSET / SERIAL</TableHead>
                <TableHead className="py-4 font-bold">CATEGORY</TableHead>
                <TableHead className="py-4 font-bold">CONDITION</TableHead>
                <TableHead className="py-4 font-bold">ASSIGNED TO</TableHead>
                <TableHead className="py-4 font-bold">VALUE</TableHead>
                <TableHead className="text-right py-4 font-bold">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((i: any) => (
                <TableRow key={i.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-primary">{i.name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-mono">{i.serialNumber || "No Serial"}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[9px] uppercase font-bold">{i.category}</Badge></TableCell>
                  <TableCell>
                    <Badge className={`text-[9px] uppercase font-bold ${
                      i.condition === 'New' || i.condition === 'Good' ? 'bg-green-600' : 
                      i.condition === 'Fair' ? 'bg-amber-500' : 'bg-destructive'
                    }`}>
                      {i.condition}
                    </Badge>
                  </TableCell>
                  <TableCell><span className="text-xs font-medium">{i.assignedTo || "Central Stores"}</span></TableCell>
                  <TableCell><span className="text-xs font-bold">GH₵ {i.purchasePrice?.toLocaleString()}</span></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDoc(doc(db!, "inventory", i.id))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredItems.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic">No assets detected in current ledger.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <form onSubmit={handleAddItem}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline font-bold">Register New Asset</DialogTitle>
              <DialogDescription>Add institutional equipment or furniture to the permanent inventory.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Asset Name</Label>
                  <Input required value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select onValueChange={v => setItemForm({...itemForm, category: v})} value={itemForm.category}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select onValueChange={v => setItemForm({...itemForm, condition: v})} value={itemForm.condition}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Serial Number</Label>
                  <Input value={itemForm.serialNumber} onChange={e => setItemForm({...itemForm, serialNumber: e.target.value})} className="h-11 rounded-xl font-mono" placeholder="S/N: XXX-XXX" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Purchase Date</Label>
                  <Input type="date" required value={itemForm.purchaseDate} onChange={e => setItemForm({...itemForm, purchaseDate: e.target.value})} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Purchase Price (GH₵)</Label>
                  <Input type="number" required value={itemForm.purchasePrice} onChange={e => setItemForm({...itemForm, purchasePrice: e.target.value})} className="h-11 rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Warranty Expiry</Label>
                  <Input type="date" value={itemForm.warrantyExpiry} onChange={e => setItemForm({...itemForm, warrantyExpiry: e.target.value})} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Assigned To</Label>
                  <Input value={itemForm.assignedTo} onChange={e => setItemForm({...itemForm, assignedTo: e.target.value})} className="h-11 rounded-xl" placeholder="Staff Name or Dept" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-primary font-bold shadow-lg">
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Box className="mr-2" />} Authorize Registration
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
