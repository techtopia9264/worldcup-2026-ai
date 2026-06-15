import { DayPicker } from 'react-day-picker';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { buttonVariants } from '../Button/index';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn('p-3', className)}
            classNames={{
                months: 'flex flex-col sm:flex-row gap-4',
                month: 'flex flex-col gap-4',
                month_caption: 'flex justify-center pt-1 relative items-center',
                caption_label: 'text-sm font-medium',
                nav: 'flex items-center gap-1',
                button_previous: cn(buttonVariants({ variant: 'outline' }), 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1'),
                button_next: cn(buttonVariants({ variant: 'outline' }), 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1'),
                weekdays: 'flex',
                weekday: 'text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]',
                week: 'flex w-full mt-2',
                day: cn(buttonVariants({ variant: 'ghost' }), 'h-8 w-8 p-0 font-normal aria-selected:opacity-100'),
                day_button: cn('h-8 w-8 p-0 font-normal'),
                selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
                today: 'bg-accent text-accent-foreground',
                outside: 'text-muted-foreground opacity-50',
                disabled: 'text-muted-foreground opacity-50',
                range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
                hidden: 'invisible',
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation }) => {
                    const Icon = orientation === 'left' ? ChevronLeft : ChevronRight;
                    return <Icon className="h-4 w-4" />;
                },
            }}
            {...props}
        />
    );
}

Calendar.displayName = 'Calendar';

export { Calendar };
