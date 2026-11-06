import React, { useId } from 'react';
import type { ApparatusType } from '../types/pilates';

interface MovementArtProps {
  apparatus: ApparatusType;
  variant?: number;
  className?: string;
}

/** Original apparatus schematics for browsing. These do not depict exercise technique. */
export const MovementArt: React.FC<MovementArtProps> = ({
  apparatus,
  variant = 0,
  className = '',
}) => {
  const patternId = useId().replace(/:/g, '');
  return (
    <svg
      className={`movement-art ${className}`}
      viewBox="0 0 320 190"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id={patternId} width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.8" fill="currentColor" opacity=".12" />
        </pattern>
      </defs>
      <rect width="320" height="190" fill={`url(#${patternId})`} />
      <circle cx={238 + (variant % 3) * 8} cy="59" r="35" className="art-orbit" />
      <path d="M39 150H283" stroke="currentColor" strokeWidth="1" opacity=".18" />
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {apparatus === 'reformer' && (
          <>
            <path d="M54 120L101 82H261L213 120H54Z" strokeWidth="2.4" />
            <path d="M54 120V136M213 120V136M261 82V101M65 111H221M92 89H248" strokeWidth="2" />
            <path d="M115 103L136 86H199L178 103H115Z" className="art-upholstery" strokeWidth="2" />
            <path
              d="M74 111V78L94 67L96 87M232 89L236 52L248 46M221 95L225 58L236 52"
              strokeWidth="2.4"
            />
            <path d="M179 103L222 77M189 103L232 77" strokeWidth="1.2" opacity=".55" />
            <path d="M98 110L105 107L107 112L114 108L117 112L124 108" strokeWidth="1.5" />
            <path d="M119 98H171" strokeWidth="1" opacity=".45" />
          </>
        )}
        {apparatus === 'cadillac' && (
          <>
            <path d="M80 126L119 98H249L210 126H80Z" className="art-upholstery" strokeWidth="2.3" />
            <path
              d="M80 141V49L119 25H249V111M210 141V49H80M210 49L249 25M119 25V98"
              strokeWidth="2.4"
            />
            <path
              d="M80 126H210M151 25V60M138 62H173M103 72L113 77L103 82L113 87M224 38L230 43L224 48L230 53L224 58M230 58V85"
              strokeWidth="1.7"
            />
            <path d="M210 126V141M249 111V124" strokeWidth="2.3" />
          </>
        )}
        {apparatus === 'chair' && (
          <>
            <path d="M113 82L143 62H207L177 82H113Z" className="art-upholstery" strokeWidth="2.4" />
            <path
              d="M113 82V135H177V82M177 135L207 113V62M113 125H176M133 99L142 103L133 107L142 111L133 115M155 99L164 103L155 107L164 111L155 115"
              strokeWidth="2.3"
            />
            <path d="M106 136L124 119H164L146 136H106Z" className="art-wood" strokeWidth="2.3" />
            <path d="M119 81V43Q119 32 130 32H143M200 65V27Q200 17 210 17H220" strokeWidth="2.5" />
          </>
        )}
        {apparatus === 'barrel' && (
          <>
            <path
              d="M90 129V97C90 48 169 48 169 97V129H90Z"
              className="art-upholstery"
              strokeWidth="2.4"
            />
            <path
              d="M90 129L117 144H193L169 129M169 97L193 111V144M90 97L117 111"
              strokeWidth="2.4"
            />
            <path
              d="M193 144L236 119V42L209 57V134M210 72L236 57M210 88L236 73M210 104L236 89M210 120L236 105M117 144H193"
              strokeWidth="2.4"
            />
            <path d="M104 79C120 63 146 64 156 81" strokeWidth="1.1" opacity=".4" />
          </>
        )}
        {apparatus === 'mat' && (
          <>
            <path d="M63 132L114 88H247L195 132H63Z" className="art-upholstery" strokeWidth="2.2" />
            <path d="M63 132V138H195L247 94V88M195 132V138" strokeWidth="2" />
            <path d="M82 128L124 94M89 128L131 94M96 128L138 94" strokeWidth=".8" opacity=".25" />
            <circle cx="221" cy="64" r="21" className="art-wood" strokeWidth="2" />
            <path
              d="M207 49C227 47 240 66 230 82M201 69C219 78 233 73 238 61"
              strokeWidth="1.1"
              opacity=".45"
            />
            <path
              d="M108 64C93 57 81 61 80 74C80 88 99 92 108 81C116 71 111 60 101 61"
              strokeWidth="2"
            />
            <path d="M127 111H175" strokeWidth="1.3" opacity=".45" />
          </>
        )}
      </g>
    </svg>
  );
};
