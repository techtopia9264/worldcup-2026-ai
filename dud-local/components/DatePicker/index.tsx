import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../Button/index';
import { Calendar } from '../Calendar/index';
import { Popover, PopoverContent, PopoverTrigger } from '../Popover/index';

interface DatePickerProps {
    date?: Date;
    onChange?: (date: Date | undefined) => void;
    placeholder?: string;
    className?: string;
}

export function DatePicker({ date, onChange, placeholder = '选择日期', className }: DatePickerProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-[240px] justify-start text-left font-normal', !date && 'text-muted-foreground', className)}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP', { locale: zhCN }) : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={onChange} />
            </PopoverContent>
        </Popover>
    );
}
