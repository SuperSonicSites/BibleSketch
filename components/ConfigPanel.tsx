
import React from 'react';
import { AgeGroup, ArtStyle } from '../types';
import { Check, Info } from 'lucide-react';

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
    [AgeGroup.ADULT]: [ArtStyle.CLASSIC, ArtStyle.STAINED_GLASS, ArtStyle.ICONOGRAPHY]
  };

  // User-facing descriptions
  const AGE_DESCRIPTIONS = {
    [AgeGroup.TODDLER]: "Big, chunky shapes with ultra-thick lines. Minimal detail. Perfect for crayons and little hands.",
    [AgeGroup.YOUNG_CHILD]: "Classic storybook style. Clear characters with friendly expressions and moderate detail.",
    [AgeGroup.TEEN]: "Dynamic, comic-book style illustration. Action-oriented poses with finer details.",
    [AgeGroup.ADULT]: "Intricate, mathematical patterns and zentangle designs. High complexity for stress relief and focus."
  };

  const STYLE_DESCRIPTIONS = {
    [ArtStyle.SUNDAY_SCHOOL]: "Warm, approachable line art similar to classic children's bible curriculum.",
    [ArtStyle.STAINED_GLASS]: "Bold, geometric segments with heavy outlines, resembling traditional church windows.",
    [ArtStyle.ICONOGRAPHY]: "Solemn and decorative Byzantine style with formal poses and patterned halos.",
    [ArtStyle.COMIC]: "Dynamic action-oriented style with bold lines and dramatic composition.",
    [ArtStyle.CLASSIC]: "Detailed, realistic engraving style with fine cross-hatching."
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
    <div className="w-full max-w-4xl mx-auto space-y-10 mt-12 space-y-4">
      
      {/* Age Slider */}
      <div className="space-y-4">
        <div className="flex justify-between items-end mb-2">
          <label className="text-sm font-bold text-gray-400 tracking-wide uppercase">Complexity Level</label>
          <span className="text-[#7C3AED] font-display font-bold text-lg bg-purple-100 px-3 py-1 rounded-full">
            {age}
          </span>
        </div>
        
        <div className="relative h-12 flex items-center select-none">
          {/* Track Line */}
          <div className="absolute w-full h-2 bg-gray-200 rounded-full"></div>
          {/* Active Track */}
          <div 
            className="absolute h-2 bg-[#7C3AED] rounded-full transition-all duration-300" 
            style={{ width: `${(currentStepIndex / (ageSteps.length - 1)) * 100}%` }}
          ></div>
          
          <input 
            type="range" 
            min="0" 
            max="3" 
            step="1"
            value={currentStepIndex} 
            onChange={handleSliderChange}
            className="absolute w-full h-full opacity-0 cursor-pointer z-20"
          />

          {/* Custom Thumbs/Ticks */}
          <div className="w-full flex justify-between absolute z-10 px-1">
            {ageSteps.map((step, idx) => (
              <div key={step} className="relative flex flex-col items-center group">
                <div className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${
                  idx <= currentStepIndex 
                    ? "bg-[#7C3AED] border-[#7C3AED]" 
                    : "bg-white border-gray-300"
                } ${idx === currentStepIndex ? "scale-125 shadow-md" : ""}`}></div>
                
                <span className={`absolute top-8 text-xs md:text-sm font-medium whitespace-nowrap transition-colors ${
                  idx === currentStepIndex ? "text-gray-800" : "text-gray-400"
                }`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Description Box for Age */}
        <div className="mt-16 bg-purple-50 border border-purple-100 rounded-xl p-4 flex items-start gap-8 animate-in fade-in slide-in-from-top-2 duration-300">
           <Info className="w-5 h-5 text-[#7C3AED] shrink-0 mt-0.5" />
           <p className="text-sm text-gray-600 leading-relaxed">
             {AGE_DESCRIPTIONS[age]}
           </p>
        </div>
      </div>

      {/* Art Style Chips */}
      <div className="space-y-4 mt-8">
        <label className="text-sm font-bold text-gray-400 tracking-wide uppercase">Artistic Style</label>
        <div className="flex flex-wrap gap-3">
          {availableStyles.map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`
                relative px-4 py-2 md:px-6 md:py-3 rounded-full border-2 font-bold text-sm transition-all duration-200
                ${style === s 
                  ? "bg-white border-[#FCD34D] text-gray-900 shadow-sm scale-105" 
                  : "bg-white border-transparent text-gray-400 hover:bg-gray-50 hover:border-gray-200"}
              `}
            >
              {s}
              {style === s && (
                <div className="absolute -top-2 -right-1 bg-[#FCD34D] rounded-full p-0.5">
                  <Check className="w-3 h-3 text-white" strokeWidth={4} />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Description Box for Style */}
        <div className="mt-6 bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <Info className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600 leading-relaxed">
              {STYLE_DESCRIPTIONS[style]}
            </p>
        </div>
      </div>

    </div>
  );
};