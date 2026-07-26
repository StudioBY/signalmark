import React from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from "recharts";

export default function MetricRadar({ metrics = [] }) {
  const data = metrics.map((m) => ({ label: m.label, score: m.score }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#E8E9EC" />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fill: "#9AA0A6", fontSize: 10, letterSpacing: 0.6 }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar dataKey="score" stroke="#1B2430" strokeWidth={1.2} fill="#1B2430" fillOpacity={0.06} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}