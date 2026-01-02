import { CategoryMapping, FilterState, TimeRange } from '@/lib/types/expense';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, X, Search, Filter, AlertCircle } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { getDateRangeFromType } from '@/lib/data-utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useEffect, useMemo } from 'react';

interface FilterBarProps {
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    categories: string[];
    subcategories: string[];
    categoryMapping: CategoryMapping;
}

export function FilterBar({ filters, setFilters, categories, subcategories, categoryMapping }: FilterBarProps) {
    const [fromInput, setFromInput] = useState(filters.dateRange.from ? format(filters.dateRange.from, 'dd/MM/yyyy') : '');
    const [toInput, setToInput] = useState(filters.dateRange.to ? format(filters.dateRange.to, 'dd/MM/yyyy') : '');

    useEffect(() => {
        setFromInput(filters.dateRange.from ? format(filters.dateRange.from, 'dd/MM/yyyy') : '');
        setToInput(filters.dateRange.to ? format(filters.dateRange.to, 'dd/MM/yyyy') : '');
    }, [filters.dateRange]);

    const availableSubcategories = useMemo(() => {
        if (filters.categories.length === 0) return subcategories;

        const subs = new Set<string>();
        filters.categories.forEach(cat => {
            const mapped = categoryMapping[cat] || [];
            mapped.forEach(s => subs.add(s));
        });

        // Intersect with subcategories that actually exist in the data if possible,
        // or just use the mapping. The user said "populate only corresponding subcategories".
        // Let's stick to the mapping but filter by what exists in 'subcategories' (from DB)
        // so we don't show empty subcategories that have no transactions.
        return Array.from(subs).filter(s => subcategories.includes(s)).sort();
    }, [filters.categories, subcategories, categoryMapping]);

    // No longer need selectTarget as we have separate controls

    const handleManualDateChange = (type: 'from' | 'to', value: string) => {
        if (type === 'from') setFromInput(value);
        else setToInput(value);
    };

    const handleCommitDate = (type: 'from' | 'to', value: string) => {
        const formats = ['dd/MM/yyyy', 'dd-MM-yyyy', 'yyyy-MM-dd'];
        let parsedDate: Date | null = null;

        for (const fmt of formats) {
            const d = parse(value, fmt, new Date());
            if (isValid(d)) {
                parsedDate = d;
                break;
            }
        }

        if (parsedDate) {
            setFilters((prev: FilterState) => ({
                ...prev,
                dateRange: {
                    ...prev.dateRange,
                    [type]: parsedDate
                }
            }));
        } else if (value === '') {
            setFilters((prev: FilterState) => ({
                ...prev,
                dateRange: {
                    ...prev.dateRange,
                    [type]: undefined
                }
            }));
        }
    };

    const handleCalendarSelect = (type: 'from' | 'to', date: Date | undefined) => {
        if (!date) return;

        setFilters((prev: FilterState) => ({
            ...prev,
            dateRange: {
                ...prev.dateRange,
                [type]: date
            }
        }));
    };

    const handleMonthChange = (type: 'from' | 'to', month: Date) => {
        // When user changes month/year via dropdown (or arrows), 
        // automatically set the date to the 1st of that month.
        const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
        handleCalendarSelect(type, firstOfMonth);
    };

    const handleTimeRangeChange = (value: string) => {
        const timeRange = value as TimeRange;
        const dateRange = getDateRangeFromType(timeRange);
        setFilters((prev: FilterState) => ({ ...prev, timeRange, dateRange }));
    };

    const handleCategoryToggle = (category: string) => {
        setFilters((prev: FilterState) => {
            const categories = prev.categories.includes(category)
                ? prev.categories.filter((c: string) => c !== category)
                : [...prev.categories, category];
            return { ...prev, categories, subcategories: [] };
        });
    };

    const handleSubcategoryToggle = (subcategory: string) => {
        setFilters((prev: FilterState) => {
            const subcategories = prev.subcategories.includes(subcategory)
                ? prev.subcategories.filter((s: string) => s !== subcategory)
                : [...prev.subcategories, subcategory];
            return { ...prev, subcategories };
        });
    };

    const handleSelectAllCategories = (select: boolean) => {
        setFilters((prev: FilterState) => ({
            ...prev,
            categories: select ? [...categories] : [],
            subcategories: [] // Reset subcategories when categories change significantly
        }));
    };

    const handleSelectAllSubcategories = (select: boolean) => {
        setFilters((prev: FilterState) => ({
            ...prev,
            subcategories: select ? [...availableSubcategories] : []
        }));
    };

    const resetFilters = () => {
        setFilters((prev: FilterState) => ({
            ...prev,
            dateRange: { from: undefined, to: undefined },
            timeRange: 'All Time',
            categories: [],
            subcategories: [],
            searchQuery: '',
        }));
    };

    const activeFilterCount =
        (filters.categories.length > 0 ? 1 : 0) +
        (filters.subcategories.length > 0 ? 1 : 0) +
        (filters.timeRange !== 'All Time' ? 1 : 0);

    return (
        <div className="flex flex-col gap-4 bg-card p-4 rounded-xl border shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search description, category..."
                        className="pl-9 h-10"
                        value={filters.searchQuery}
                        onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
                    />
                </div>

                {/* Time Range */}
                <Select value={filters.timeRange} onValueChange={handleTimeRangeChange}>
                    <SelectTrigger className="w-[160px] h-10">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Time Range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All Time">All Time</SelectItem>
                        <SelectItem value="YTD">YTD</SelectItem>
                        <SelectItem value="Last 30 Days">Last 30 Days</SelectItem>
                        <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                </Select>

                {/* Custom Date Pickers (only if Custom) */}
                {filters.timeRange === 'Custom' && (
                    <div className="flex gap-2">
                        {/* From Picker */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "justify-start text-left font-normal h-10 w-[180px]",
                                        !filters.dateRange.from && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filters.dateRange.from ? format(filters.dateRange.from, "LLL dd, y") : 'From Date'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-4" align="start">
                                <div className="space-y-4">
                                    <div className="grid gap-1.5">
                                        <label className="text-xs font-medium text-muted-foreground">From (DD/MM/YYYY)</label>
                                        <Input
                                            placeholder="DD/MM/YYYY"
                                            value={fromInput}
                                            onChange={(e) => handleManualDateChange('from', e.target.value)}
                                            onBlur={(e) => handleCommitDate('from', e.target.value)}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <Calendar
                                        initialFocus
                                        mode="single"
                                        defaultMonth={filters.dateRange.from || new Date()}
                                        selected={filters.dateRange.from}
                                        onSelect={(date) => handleCalendarSelect('from', date)}
                                        onMonthChange={(month) => handleMonthChange('from', month)}
                                        numberOfMonths={1}
                                        captionLayout="dropdown"
                                        fromYear={2000}
                                        toYear={new Date().getFullYear()}
                                    />
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* To Picker */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "justify-start text-left font-normal h-10 w-[180px]",
                                        !filters.dateRange.to && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filters.dateRange.to ? format(filters.dateRange.to, "LLL dd, y") : 'To Date'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-4" align="start">
                                <div className="space-y-4">
                                    <div className="grid gap-1.5">
                                        <label className="text-xs font-medium text-muted-foreground">To (DD/MM/YYYY)</label>
                                        <Input
                                            placeholder="DD/MM/YYYY"
                                            value={toInput}
                                            onChange={(e) => handleManualDateChange('to', e.target.value)}
                                            onBlur={(e) => handleCommitDate('to', e.target.value)}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <Calendar
                                        initialFocus
                                        mode="single"
                                        defaultMonth={filters.dateRange.to || new Date()}
                                        selected={filters.dateRange.to}
                                        onSelect={(date) => handleCalendarSelect('to', date)}
                                        onMonthChange={(month) => handleMonthChange('to', month)}
                                        numberOfMonths={1}
                                        captionLayout="dropdown"
                                        fromYear={2000}
                                        toYear={new Date().getFullYear()}
                                    />
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                )}

                {/* Categories Popover */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="h-10">
                            Categories
                            {filters.categories.length > 0 && (
                                <Badge variant="secondary" className="ml-2 rounded-sm px-1 font-normal lg:hidden">
                                    {filters.categories.length}
                                </Badge>
                            )}
                            {filters.categories.length > 0 && (
                                <div className="hidden space-x-1 lg:flex ml-2">
                                    <Separator orientation="vertical" className="mx-2 h-4" />
                                    <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                        {filters.categories.length} selected
                                    </Badge>
                                </div>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                        <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium leading-none">Categories</h4>
                                <div className="flex gap-2">
                                    <button
                                        className="text-[10px] uppercase font-bold text-blue-600 hover:text-blue-800 transition-colors"
                                        onClick={() => handleSelectAllCategories(true)}
                                    >
                                        Select All
                                    </button>
                                    <button
                                        className="text-[10px] uppercase font-bold text-slate-500 hover:text-slate-700 transition-colors"
                                        onClick={() => handleSelectAllCategories(false)}
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                {categories.map((cat) => (
                                    <div key={cat} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`cat-${cat}`}
                                            checked={filters.categories.includes(cat)}
                                            onCheckedChange={() => handleCategoryToggle(cat)}
                                        />
                                        <label htmlFor={`cat-${cat}`} className="text-sm font-normal cursor-pointer select-none">
                                            {cat}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Subcategories Popover */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="h-10">
                            Subcategories
                            {filters.subcategories.length > 0 && (
                                <Badge variant="secondary" className="ml-2 rounded-sm px-1 font-normal">
                                    {filters.subcategories.length}
                                </Badge>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                        <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium leading-none">Subcategories</h4>
                                <div className="flex gap-2">
                                    <button
                                        className="text-[10px] uppercase font-bold text-blue-600 hover:text-blue-800 transition-colors"
                                        onClick={() => handleSelectAllSubcategories(true)}
                                    >
                                        Select All
                                    </button>
                                    <button
                                        className="text-[10px] uppercase font-bold text-slate-500 hover:text-slate-700 transition-colors"
                                        onClick={() => handleSelectAllSubcategories(false)}
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                {availableSubcategories.map((sub) => (
                                    <div key={sub} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`sub-${sub}`}
                                            checked={filters.subcategories.includes(sub)}
                                            onCheckedChange={() => handleSubcategoryToggle(sub)}
                                        />
                                        <label htmlFor={`sub-${sub}`} className="text-sm font-normal cursor-pointer select-none">
                                            {sub}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                {activeFilterCount > 0 && (
                    <Button variant="ghost" className="h-10 px-2 lg:px-3 text-red-500 hover:text-red-700" onClick={resetFilters}>
                        Reset
                        <X className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}

function Separator({ orientation, className }: { orientation: string, className?: string }) {
    return <div className={cn("bg-border", orientation === 'vertical' ? 'w-[1px] h-full' : 'h-[1px] w-full', className)} />
}
