
import React from 'react';
import { AgeGroup, ArtStyle } from '../types';
import { Check } from 'lucide-react';

interface ConfigPanelProps {
  age: AgeGroup;
  setAge: (a: AgeGroup) => void;
  style: ArtStyle;
  setStyle: (s: ArtStyle) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ age, setAge, style, setStyle }) => {
  
  // Helper for slider steps
  const ageSteps = [AgeGroup.TODDLER, AgeGroup.YOUNG_CHILD, AgeGroup.TEEN, AgeGroup.ADULT];
  const currentStepIndex = ageSteps.indexOf(age);

  // Define available styles per age group
  const VALID_STYLES: Record<AgeGroup, ArtStyle[]> = {
    [AgeGroup.TODDLER]: [ArtStyle.SUNDAY_SCHOOL],
    [AgeGroup.YOUNG_CHILD]: [ArtStyle.SUNDAY_SCHOOL, ArtStyle.COMIC, ArtStyle.STAINED_GLASS, ArtStyle.ICONOGRAPHY],
    [AgeGroup.TEEN]: [ArtStyle.CLASSIC, ArtStyle.STAINED_GLASS, ArtStyle.ICONOGRAPHY, ArtStyle.COMIC],
    [AgeGroup.ADULT]: [ArtStyle.CLASSIC, ArtStyle.STAINED_GLASS, ArtStyle.ICONOGRAPHY, ArtStyle.DOODLE]
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAge = ageSteps[parseInt(e.target.value)];
    setAge(newAge);

    const validStylesForNewAge = VALID_STYLES[newAge];
    
    // If currently selected style is not valid for the new age group, 
    // automatically switch to the first valid style (default).
    if (!validStylesForNewAge.includes(style)) {
      setStyle(validStylesForNewAge[0]);
    }
  };

  // Filter available styles based on age group
  const availableStyles = VALID_STYLES[age] || [];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 md:space-y-10 mt-6 md:mt-12">
      
      {/* Age Slider */}
      <div className="space-y-2 md:space-y-4 pb-6 md:pb-8">
        <div className="flex justify-between items-end mb-1 md:mb-2">
          <label className="text-xs md:text-sm font-bold text-gray-600 tracking-wide uppercase">Complexity Level</label>
          <span className="text-[#7C3AED] font-display font-bold text-sm md:text-lg bg-purple-100 px-2 md:px-3 py-0.5 md:py-1 rounded-full">
            {age}
          </span>
        </div>
        
        <div className="relative h-10 md:h-12 flex items-center select-none">
          {/* Track Line */}
          <div className="absolute w-full h-1.5 md:h-2 bg-gray-200 rounded-full"></div>
          {/* Active Track */}
          <div 
            className="absolute h-1.5 md:h-2 bg-[#7C3AED] rounded-full transition-all duration-300" 
            style={{ width: `${(currentStepIndex / (ageSteps.length - 1)) * 100}%` }}
          ></div>
          
          <input 
            type="range" 
            min="0" 
            max="3" 
            step="1"
            value={currentStepIndex} 
            onChange={handleSliderChange}
            aria-label="Complexity Level"
            aria-valuetext={ageSteps[currentStepIndex]}
            className="absolute w-full h-full opacity-0 cursor-pointer z-20"
          />

          {/* Custom Thumbs/Ticks */}
          <div className="w-full flex justify-between absolute z-10 px-0.5 md:px-1">
            {ageSteps.map((step, idx) => (
              <div key={step} className="relative flex flex-col items-center group">
                <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 transition-all duration-200 ${
                  idx <= currentStepIndex 
                    ? "bg-[#7C3AED] border-[#7C3AED]" 
                    : "bg-white border-gray-300"
                } ${idx === currentStepIndex ? "scale-125 shadow-md" : ""}`}></div>
                
                <span className={`absolute top-6 md:top-8 text-[10px] md:text-sm font-medium whitespace-nowrap transition-colors ${
                  idx === currentStepIndex ? "text-gray-800" : "text-gray-600"
                }`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Art Style Chips */}
      <div className="space-y-2 md:space-y-4 mt-4 md:mt-8">
        <label className="text-xs md:text-sm font-bold text-gray-600 tracking-wide uppercase">Artistic Style</label>
        <div className="grid grid-cols-2 gap-1.5 md:flex md:flex-wrap md:gap-3">
          {availableStyles.map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`
                relative px-2 py-2 md:px-4 md:py-2 rounded-full border-2 font-bold text-xs md:text-sm transition-all duration-200 text-center
                ${style === s 
                  ? "bg-[#7C3AED] border-[#7C3AED] text-white shadow-sm scale-105" 
                  : "bg-white border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-200"}
              `}
            >
              {s}
              {style === s && (
                <div className="absolute -top-1.5 md:-top-2 -right-0.5 md:-right-1 bg-[#FCD34D] rounded-full p-0.5">
                  <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" strokeWidth={4} />
                </div>
              )}
            </button>
          ))}
        </div>

      </div>

    </div>
  );
};