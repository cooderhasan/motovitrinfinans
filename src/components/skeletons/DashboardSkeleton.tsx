import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function DashboardSkeleton() {
    return (
        <div className="space-y-8 p-2">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-slate-200 animate-pulse" />
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
                        <div className="h-4 w-32 bg-slate-200 rounded-lg animate-pulse" />
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200">
                    <div className="w-2 h-2 rounded-full bg-slate-300 animate-pulse" />
                    <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
                </div>
            </div>

            {/* Summary Cards Skeleton */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-2xl bg-white p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                            <div className="h-9 w-9 bg-slate-100 rounded-xl animate-pulse" />
                        </div>
                        <div className="h-8 w-32 bg-slate-200 rounded-lg mb-2 animate-pulse" />
                        <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
                    </div>
                ))}
            </div>

            {/* Charts Section Skeleton */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                {/* Borçlu Müşteriler Chart Skeleton */}
                <Card className="col-span-4 border-0 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 bg-slate-200 rounded-xl animate-pulse" />
                            <div className="space-y-2">
                                <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
                                <div className="h-3 w-32 bg-slate-200 rounded animate-pulse" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[300px] w-full bg-slate-50/50 rounded-xl animate-pulse flex items-center justify-center">
                            <div className="h-8 w-8 bg-slate-200 rounded-full animate-pulse" />
                        </div>
                    </CardContent>
                </Card>

                {/* Alacaklı Tedarikçiler Skeleton */}
                <Card className="col-span-3 border-0 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 bg-slate-200 rounded-xl animate-pulse" />
                            <div className="space-y-2">
                                <div className="h-6 w-40 bg-slate-200 rounded animate-pulse" />
                                <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="space-y-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center p-3 rounded-xl bg-slate-50">
                                    <div className="w-10 h-10 rounded-xl bg-slate-200 animate-pulse" />
                                    <div className="ml-3 flex-1 space-y-2">
                                        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                                        <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
                                    </div>
                                    <div className="h-5 w-24 bg-slate-200 rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
