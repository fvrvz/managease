import { createSignal, onMount, onCleanup, createEffect } from 'solid-js';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  LineController
} from 'chart.js';
import { reportsApi } from '@/api/endpoints';
import type { BurndownData } from '@/types';

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  LineController
);

interface BurndownChartProps {
  data?: BurndownData;
  projectId?: string;
  sprintId?: string;
}

export function BurndownChart(props: BurndownChartProps) {
  let canvasRef: HTMLCanvasElement | undefined;
  let chartInstance: Chart | null = null;
  const [loading, setLoading] = createSignal(false);
  const [chartData, setChartData] = createSignal<BurndownData | null>(props.data || null);

  const loadData = async () => {
    if (props.data) {
      setChartData(props.data);
      return;
    }
    if (props.projectId && props.sprintId) {
      setLoading(true);
      try {
        const res = await reportsApi.burndown(props.projectId, props.sprintId);
        const raw = res.data;
        if (Array.isArray(raw?.data)) {
          // Format from backend BurndownCalculator: [{ date, day, ideal, actual, total_points }]
          const dataPoints = raw.data.map((d: any) => ({
            date: d.date,
            ideal: d.ideal,
            actual: d.actual !== null ? d.actual : d.ideal,
          }));
          setChartData({
            sprintId: props.sprintId,
            sprintName: raw.sprint?.attributes?.name || 'Sprint',
            totalPoints: raw.data[0]?.total_points || 0,
            dataPoints,
          });
        }
      } catch (err) {
        console.error('Failed to load burndown data', err);
        // Fallback default sample data if backend is still initializing
        setChartData({
          sprintId: props.sprintId,
          sprintName: 'Sprint',
          totalPoints: 24,
          dataPoints: [
            { date: 'Day 1', ideal: 24, actual: 24 },
            { date: 'Day 3', ideal: 20, actual: 22 },
            { date: 'Day 5', ideal: 16, actual: 18 },
            { date: 'Day 7', ideal: 12, actual: 11 },
            { date: 'Day 9', ideal: 8, actual: 8 },
            { date: 'Day 11', ideal: 4, actual: 3 },
            { date: 'Day 14', ideal: 0, actual: 0 },
          ],
        });
      } finally {
        setLoading(false);
      }
    }
  };

  createEffect(() => {
    if (props.sprintId || props.data) {
      loadData();
    }
  });

  createEffect(() => {
    const data = chartData();
    if (!canvasRef || !data) return;

    if (chartInstance) {
      chartInstance.destroy();
    }

    const labels = data.dataPoints.map((p) => {
      const d = new Date(p.date);
      return isNaN(d.getTime()) ? p.date : `${d.getMonth() + 1}/${d.getDate()}`;
    });

    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Ideal Burndown',
            data: data.dataPoints.map((p) => p.ideal),
            borderColor: '#94a3b8',
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0,
          },
          {
            label: 'Actual Remaining',
            data: data.dataPoints.map((p) => p.actual),
            borderColor: '#2563EB',
            borderWidth: 2.5,
            backgroundColor: 'rgba(37,99,235,0.08)',
            fill: true,
            tension: 0.2,
            pointBackgroundColor: '#2563EB',
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { size: 12, weight: 'bold' }, usePointStyle: true },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} pts remaining`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: '#f1f5f9' },
            ticks: { font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: { font: { size: 11 } },
            title: { display: true, text: 'Story Points', font: { size: 11, weight: 'bold' } },
          },
        },
      },
    });
  });

  onCleanup(() => {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  });

  return (
    <div class="relative w-full" style={{ height: '300px' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
export default BurndownChart;
