import React, { useState } from 'react';
import { ChevronDown, MapPin, Tag, Calendar, X } from 'lucide-react';

const stateOptions = [
  'Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'West Bengal',
];
const cityOptions = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Kolkata',
];
const categoryOptions = [
  'Grocery & Beverages',
  'Home & Kitchen',
  'Health & Beauty',
  'Electronics',
  'Clothing & Apparel',
  'Baby & Kids',
  'Household Essentials',
  'Toys & Games',
  'Sports, Fitness & Outdoors',
  'Automotive & Tools',
  'Pet Supplies',
  'Office & School Supplies',
  'Garden & Outdoor Living',
];
const monthOptions = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const yearMin = 2021, yearMax = 2024;

export type Filters = {
  state: string[];
  city: string[];
  category: string[];
  month: string[];
  yearRange: { min: number; max: number };
};

type Props = {
  filters: Filters;
  onChange: (filters: Filters) => void;
  initialFilters: Filters;
};

const handleMultiSelect = (arr: string[], value: string) =>
  arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];

const AccordionSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="border-b border-white/10">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center py-3 text-white">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold">{title}</span>
        </div>
        <ChevronDown className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="pb-4 space-y-2">{children}</div>}
    </div>
  );
};

const Checkbox: React.FC<{ label: string; checked: boolean; onChange: () => void }> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 text-gray-300 cursor-pointer hover:text-white">
    <input type="checkbox" checked={checked} onChange={onChange} className="form-checkbox h-4 w-4 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500" />
    {label}
  </label>
);

const FilterPill: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="flex items-center gap-1 bg-purple-500/50 text-white px-2 py-1 text-xs rounded-full">
    {label}
    <button onClick={onRemove} className="hover:text-red-400"><X size={12} /></button>
  </span>
);

const SidebarFilters: React.FC<Props> = ({ filters, onChange, initialFilters }) => {
  const activeFiltersCount =
    filters.state.length +
    filters.city.length +
    filters.category.length +
    filters.month.length +
    (filters.yearRange.min > yearMin || filters.yearRange.max < yearMax ? 1 : 0);

  return (
    <aside className="w-72 p-6 bg-gray-900/80 backdrop-blur-md border-r border-blue-800/40 flex-col gap-4 hidden md:flex">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Filters</h2>
        {activeFiltersCount > 0 && (
          <button onClick={() => onChange(initialFilters)} className="text-sm text-purple-400 hover:text-purple-300">Clear All</button>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="text-sm text-gray-400">Active Filters:</div>
        <div className="flex flex-wrap gap-2">
          {filters.state.map(s => <FilterPill key={s} label={s} onRemove={() => onChange({ ...filters, state: handleMultiSelect(filters.state, s) })} />)}
          {filters.city.map(c => <FilterPill key={c} label={c} onRemove={() => onChange({ ...filters, city: handleMultiSelect(filters.city, c) })} />)}
          {filters.category.map(c => <FilterPill key={c} label={c} onRemove={() => onChange({ ...filters, category: handleMultiSelect(filters.category, c) })} />)}
          {filters.month.map(m => <FilterPill key={m} label={m} onRemove={() => onChange({ ...filters, month: handleMultiSelect(filters.month, m) })} />)}
        </div>
      </div>
      
      <AccordionSection title="Location" icon={<MapPin size={18} />}>
        <div className="pl-4 max-h-40 overflow-y-auto">
          <h4 className="font-semibold text-white mb-2">State</h4>
          {stateOptions.map(opt => <Checkbox key={opt} label={opt} checked={filters.state.includes(opt)} onChange={() => onChange({ ...filters, state: handleMultiSelect(filters.state, opt) })} />)}
          <h4 className="font-semibold text-white mt-4 mb-2">City</h4>
          {cityOptions.map(opt => <Checkbox key={opt} label={opt} checked={filters.city.includes(opt)} onChange={() => onChange({ ...filters, city: handleMultiSelect(filters.city, opt) })} />)}
        </div>
      </AccordionSection>

      <AccordionSection title="Product" icon={<Tag size={18} />}>
        <div className="pl-4 max-h-40 overflow-y-auto">
          {categoryOptions.map(opt => <Checkbox key={opt} label={opt} checked={filters.category.includes(opt)} onChange={() => onChange({ ...filters, category: handleMultiSelect(filters.category, opt) })} />)}
        </div>
      </AccordionSection>

      <AccordionSection title="Date" icon={<Calendar size={18} />}>
        <div className="pl-4">
          <h4 className="font-semibold text-white mb-2">Year Range: {filters.yearRange.min} - {filters.yearRange.max}</h4>
          <div className="relative pt-1">
            <input
              type="range"
              min={yearMin}
              max={yearMax}
              value={filters.yearRange.min}
              onChange={e => {
                const min = Number(e.target.value);
                if (min <= filters.yearRange.max) {
                  onChange({ ...filters, yearRange: { ...filters.yearRange, min } });
                }
              }}
              className="absolute w-full h-1 bg-transparent appearance-none pointer-events-none z-10"
            />
            <input
              type="range"
              min={yearMin}
              max={yearMax}
              value={filters.yearRange.max}
              onChange={e => {
                const max = Number(e.target.value);
                if (max >= filters.yearRange.min) {
                  onChange({ ...filters, yearRange: { ...filters.yearRange, max } });
                }
              }}
              className="absolute w-full h-1 bg-transparent appearance-none pointer-events-none z-10"
            />
            <div className="relative h-1 rounded-md bg-gray-700">
              <div className="absolute h-1 rounded-md bg-purple-500" style={{ left: `${((filters.yearRange.min - yearMin) / (yearMax - yearMin)) * 100}%`, right: `${100 - ((filters.yearRange.max - yearMin) / (yearMax - yearMin)) * 100}%` }}></div>
            </div>
          </div>

          <h4 className="font-semibold text-white mt-4 mb-2">Month</h4>
          <div className="grid grid-cols-3 gap-2">
            {monthOptions.map(opt => (
              <button key={opt} onClick={() => onChange({ ...filters, month: handleMultiSelect(filters.month, opt) })} className={`px-2 py-1 text-sm rounded ${filters.month.includes(opt) ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      </AccordionSection>
    </aside>
  );
};

export default SidebarFilters;
