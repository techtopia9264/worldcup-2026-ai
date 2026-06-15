import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../Button/index';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../Command/index';
import { Popover, PopoverContent, PopoverTrigger } from '../Popover/index';

export interface ComboboxOption {
    value: string;
    label: string;
}

export interface ComboboxProps {
    options: ComboboxOption[];
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    emptyText?: string;
    className?: string;
}

export function Combobox({ options = [], value, onChange, placeholder = '请选择...', emptyText = '无匹配结果', className }: ComboboxProps) {
    const [open, setOpen] = React.useState(false);

    const selectedLabel = options.find((o) => o.value === value)?.label;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className={cn('w-[200px] justify-between', className)}>
                    {selectedLabel ?? placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder={placeholder} />
                    <CommandList>
                        <CommandEmpty>{emptyText}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={(currentValue: string) => {
                                        onChange?.(currentValue === value ? '' : currentValue);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn('mr-2 h-4 w-4', value === option.value ? 'opacity-100' : 'opacity-0')} />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
