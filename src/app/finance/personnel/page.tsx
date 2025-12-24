'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog'
import { Users, Banknote, Pencil, Trash2, Calculator, Wallet } from 'lucide-react'

// API Functions
async function getEmployees() {
    const res = await fetch('/api/caries?type=EMPLOYEE')
    if (!res.ok) throw new Error('Personeller çekilemedi')
    return res.json()
}

async function getEmployeeTransactions(cariId: number) {
    const res = await fetch(`/api/reports/statement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cariId: cariId.toString(), currencyCode: 'TL' })
    })
    if (!res.ok) throw new Error('İşlemler çekilemedi')
    return res.json()
}

async function deleteTransaction(id: number) {
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Silinemedi')
    return res.json()
}

async function updateTransaction(id: number, data: any) {
    const res = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error('Güncellenemedi')
    return res.json()
}

async function accrueSalaries(month: number, year: number) {
    const res = await fetch('/api/salary/accrue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year })
    })
    if (!res.ok) throw new Error('Maaş tahakkuku yapılamadı')
    return res.json()
}

export default function PersonnelPage() {
    const queryClient = useQueryClient()
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
    const [transactions, setTransactions] = useState<any[]>([])
    const [loadingTx, setLoadingTx] = useState(false)

    // Edit Dialog
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [editingTx, setEditingTx] = useState<any>(null)
    const [editForm, setEditForm] = useState({ amount: '', description: '' })

    // Salary Accrual Dialog
    const [accrualDialogOpen, setAccrualDialogOpen] = useState(false)
    const [accrualMonth, setAccrualMonth] = useState(new Date().getMonth() + 1)
    const [accrualYear, setAccrualYear] = useState(new Date().getFullYear())
    const [accruing, setAccruing] = useState(false)

    const { data: employees, isLoading } = useQuery({
        queryKey: ['employees'],
        queryFn: getEmployees
    })

    // Transaction Delete
    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteTransaction(id),
        onSuccess: () => {
            alert('İşlem silindi')
            if (selectedEmployee) loadTransactions(selectedEmployee.id)
            queryClient.invalidateQueries({ queryKey: ['employees'] })
        },
        onError: (error) => alert('Hata: ' + error.message)
    })

    // Transaction Update
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => updateTransaction(id, data),
        onSuccess: () => {
            setEditDialogOpen(false)
            setEditingTx(null)
            alert('İşlem güncellendi')
            if (selectedEmployee) loadTransactions(selectedEmployee.id)
            queryClient.invalidateQueries({ queryKey: ['employees'] })
        },
        onError: (error) => alert('Hata: ' + error.message)
    })

    const loadTransactions = async (cariId: number) => {
        setLoadingTx(true)
        try {
            const data = await getEmployeeTransactions(cariId)
            setTransactions(data.statement || [])
        } catch {
            setTransactions([])
        } finally {
            setLoadingTx(false)
        }
    }

    const handleEmployeeSelect = (employee: any) => {
        setSelectedEmployee(employee)
        loadTransactions(employee.id)
    }

    const handleDeleteTx = (tx: any) => {
        if (!tx.transactionId) {
            alert('Bu işlem silinemez (kaynak: ' + tx.source + ')')
            return
        }
        if (confirm('Bu işlemi silmek istediğinize emin misiniz?')) {
            deleteMutation.mutate(tx.transactionId)
        }
    }

    const handleEditTx = (tx: any) => {
        if (!tx.transactionId) {
            alert('Bu işlem düzenlenemez (kaynak: ' + tx.source + ')')
            return
        }
        setEditingTx(tx)
        setEditForm({
            amount: tx.debit > 0 ? tx.debit.toString() : tx.credit.toString(),
            description: tx.description || ''
        })
        setEditDialogOpen(true)
    }

    const handleEditSubmit = () => {
        if (!editingTx) return
        updateMutation.mutate({
            id: editingTx.transactionId,
            data: {
                amount: parseFloat(editForm.amount),
                description: editForm.description
            }
        })
    }

    const handleSalaryAccrual = async () => {
        setAccruing(true)
        try {
            const result = await accrueSalaries(accrualMonth, accrualYear)
            alert(result.message)
            setAccrualDialogOpen(false)
            queryClient.invalidateQueries({ queryKey: ['employees'] })
            if (selectedEmployee) loadTransactions(selectedEmployee.id)
        } catch (error: any) {
            alert('Hata: ' + error.message)
        } finally {
            setAccruing(false)
        }
    }

    // Bu ayki avans toplamını hesapla
    const calculateMonthlyAdvances = (txList: any[]) => {
        const now = new Date()
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        return txList
            .filter(tx => new Date(tx.transactionDate) >= firstDay && tx.credit > 0)
            .reduce((sum, tx) => sum + tx.credit, 0)
    }

    if (isLoading) return <div className="p-8">Yükleniyor...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Users className="h-8 w-8" /> Personel Yönetimi
                    </h2>
                    <p className="text-muted-foreground">Maaş takibi, avans ve işlem yönetimi</p>
                </div>
                <Button onClick={() => setAccrualDialogOpen(true)} className="bg-violet-600 hover:bg-violet-700">
                    <Calculator className="mr-2 h-4 w-4" /> Ay Sonu Maaş Tahakkuku
                </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Personel Listesi */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg">Personeller</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                        {employees?.map((emp: any) => (
                            <div
                                key={emp.id}
                                onClick={() => handleEmployeeSelect(emp)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedEmployee?.id === emp.id
                                    ? 'bg-violet-50 border-violet-300'
                                    : 'hover:bg-gray-50'
                                    }`}
                            >
                                <div className="font-medium">{emp.title}</div>
                                <div className="flex justify-between text-sm text-muted-foreground mt-1">
                                    <span className="flex items-center gap-1">
                                        <Banknote className="h-3 w-3" />
                                        Maaş: {emp.salary ? Number(emp.salary).toLocaleString('tr-TR') + ' ₺' : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span className={`font-semibold ${(emp.currentBalance || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        Bakiye: {(emp.currentBalance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                    </span>
                                </div>
                            </div>
                        ))}
                        {!employees?.length && (
                            <p className="text-center text-muted-foreground py-4">Personel bulunamadı</p>
                        )}
                    </CardContent>
                </Card>

                {/* İşlem Geçmişi */}
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">
                                {selectedEmployee ? `${selectedEmployee.title} - İşlem Geçmişi` : 'İşlem Geçmişi'}
                            </CardTitle>
                            {selectedEmployee && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    Bu Ayki Avanslar: <span className="font-semibold text-orange-600">
                                        {calculateMonthlyAdvances(transactions).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                    </span>
                                </p>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {!selectedEmployee ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Wallet className="mx-auto h-12 w-12 opacity-30 mb-3" />
                                Bir personel seçin
                            </div>
                        ) : loadingTx ? (
                            <div className="text-center py-8">Yükleniyor...</div>
                        ) : (
                            <div className="max-h-[400px] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tarih</TableHead>
                                            <TableHead>Açıklama</TableHead>
                                            <TableHead className="text-right text-rose-600">Borç</TableHead>
                                            <TableHead className="text-right text-emerald-600">Alacak</TableHead>
                                            <TableHead className="text-right">Bakiye</TableHead>
                                            <TableHead className="w-20"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.map((tx, i) => (
                                            <TableRow key={i} className="hover:bg-gray-50">
                                                <TableCell className="text-sm">
                                                    {new Date(tx.transactionDate).toLocaleDateString('tr-TR')}
                                                </TableCell>
                                                <TableCell className="text-sm">{tx.description || '-'}</TableCell>
                                                <TableCell className="text-right font-mono text-rose-600">
                                                    {tx.debit > 0 ? tx.debit.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-'}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-emerald-600">
                                                    {tx.credit > 0 ? tx.credit.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-'}
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-bold">
                                                    {tx.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => handleEditTx(tx)}
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-red-600 hover:text-red-700"
                                                            onClick={() => handleDeleteTx(tx)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {transactions.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    İşlem bulunamadı
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Edit Transaction Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>İşlemi Düzenle</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label>Tutar</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={editForm.amount}
                                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Açıklama</Label>
                            <Input
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleEditSubmit} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Salary Accrual Dialog */}
            <Dialog open={accrualDialogOpen} onOpenChange={setAccrualDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ay Sonu Maaş Tahakkuku</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            Seçilen ay için tüm aktif personellere maaş borcu yazılacaktır.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Ay</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={accrualMonth}
                                    onChange={(e) => setAccrualMonth(parseInt(e.target.value))}
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                                        <option key={m} value={m}>
                                            {new Date(2024, m - 1).toLocaleString('tr-TR', { month: 'long' })}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Yıl</Label>
                                <Input
                                    type="number"
                                    value={accrualYear}
                                    onChange={(e) => setAccrualYear(parseInt(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAccrualDialogOpen(false)}>İptal</Button>
                        <Button onClick={handleSalaryAccrual} disabled={accruing} className="bg-violet-600 hover:bg-violet-700">
                            {accruing ? 'İşleniyor...' : 'Tahakkuk Yap'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
