import React, { useId } from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors } from '@/constants/theme';

interface SparklineProps {
  data: number[];
  width: number;
  height: number;
  color?: string;
  showDot?: boolean;
  /** Fill the area under the line with a vertical gradient (Stravaesque look). */
  area?: boolean;
  strokeWidth?: number;
}

export function Sparkline({
  data,
  width,
  height,
  color = Colors.amber,
  showDot = true,
  area = false,
  strokeWidth = 1.5,
}: SparklineProps) {
  const gradId = useId();
  if (!data || data.length < 2) return <View style={{ width, height }} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 4;

  const xy = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + ((max - v) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const points = xy.map(([x, y]) => `${x},${y}`).join(' ');
  const [lastX, lastY] = xy[xy.length - 1];
  const [firstX] = xy[0];

  // Closed path for the area fill: line, down to baseline, back to start.
  const areaPath =
    `M ${xy.map(([x, y]) => `${x},${y}`).join(' L ')}` +
    ` L ${lastX},${height - pad} L ${firstX},${height - pad} Z`;

  return (
    <Svg width={width} height={height}>
      {area && (
        <>
          <Defs>
            <LinearGradient id={`spark-${gradId}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={areaPath} fill={`url(#spark-${gradId})`} stroke="none" />
        </>
      )}
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={area ? 1 : 0.85}
      />
      {showDot && <Circle cx={lastX} cy={lastY} r={3.5} fill={color} />}
    </Svg>
  );
}
