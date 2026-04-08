import { useState } from "react";

const mesesCortos = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function calcYAxisIntervals(maxValue) {
  if (maxValue <= 0) return [0, 1, 2, 3, 4];
  const numberOfLines = 5;
  const roughInterval = maxValue / (numberOfLines - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));
  const fraction = roughInterval / magnitude;
  let niceInterval;
  if (fraction < 1.5) niceInterval = magnitude;
  else if (fraction < 3) niceInterval = magnitude * 2;
  else if (fraction < 7) niceInterval = magnitude * 5;
  else niceInterval = magnitude * 10;
  let niceMax = niceInterval * (numberOfLines - 1);
  if (maxValue > niceMax) niceMax += niceInterval;
  return Array.from({ length: numberOfLines }, (_, i) =>
    (niceMax / (numberOfLines - 1)) * i
  );
}

function formatYLabel(value) {
  const v = Math.round(value);
  if (v >= 1000000) return `${Math.round(v / 1000000)}M`;
  if (v >= 1000) return `${Math.round(v / 1000)}k`;
  return `${v}`;
}

export default function BarChart({ data, labels }) {
  const [tooltip, setTooltip] = useState(null);
  const max = Math.max(...data, 1);
  const intervals = calcYAxisIntervals(max);
  const chartHeight = 200;

  const xlabels = labels && labels.length === data.length ? labels : mesesCortos;

  return (
    <div className="bc-wrapper">
      <div className="bc-yaxis">
        {[...intervals].reverse().map((val, i) => (
          <div key={i} className="bc-ylabel">{formatYLabel(val)}</div>
        ))}
      </div>
      <div className="bc-area">
        {intervals.map((_, i) => (
          <div key={i} className="bc-gridline" style={{
            bottom: `${(i / (intervals.length - 1)) * 100}%`
          }} />
        ))}
        <div className="bc-bars">
          {data.map((val, i) => {
            const height = intervals[intervals.length - 1] > 0
              ? Math.round((val / intervals[intervals.length - 1]) * chartHeight)
              : 0;
            return (
              <div key={i} className="bc-col">
                <div className="bc-bar-wrap">
                  {tooltip === i && (
                    <div className="bc-tooltip">
                      $ {Math.round(val).toLocaleString("es-CO")}
                    </div>
                  )}
                  <div
                    className={`bc-bar ${tooltip === i ? "hovered" : ""}`}
                    style={{ height: Math.max(height, val > 0 ? 4 : 0) }}
                    onMouseEnter={() => setTooltip(i)}
                    onMouseLeave={() => setTooltip(null)}
                  />
                </div>
                <span className="bc-xlabel">{xlabels[i]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}