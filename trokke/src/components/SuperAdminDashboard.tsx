// src/components/SuperAdminDashboard.tsx
'use client';

import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { type SuperAdminDashboardMetrics } from '@/app/(shell)/admin/dashboard/page';
import { RefreshCw, Briefcase, CheckCircle, Droplet, BeakerIcon, Users, Truck, Wrench, AlertTriangle, Route as RouteIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface DashboardProps {
  initialMetrics: SuperAdminDashboardMetrics;
  onRefresh: () => void;
}

const formatCurrency = (value: number | null | undefined) => `R ${Number(value || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatNumber = (value: number | null | undefined) => Number(value || 0).toLocaleString('en-ZA');

const KpiCard: React.FC<{ title: string; value: string; icon: React.ElementType; }> = ({ title, value, icon: Icon }) => (
  <div className="bg-white p-4 rounded-lg shadow-md flex items-center gap-4">
    <div className="p-3 bg-gray-100 rounded-full">
      <Icon className="h-6 w-6 text-gray-700" />
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const SuperAdminDashboard: React.FC<DashboardProps> = ({ initialMetrics, onRefresh }) => {
  const chartData = {
    labels: initialMetrics.role_breakdown.map(r => r.role),
    datasets: [{
      label: 'Number of Users',
      data: initialMetrics.role_breakdown.map(r => r.count),
      backgroundColor: 'rgba(34, 197, 94, 0.6)', // Green color
      borderColor: 'rgba(22, 163, 74, 1)',
      borderWidth: 1,
    }],
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'User Roles Distribution' },
    },
    scales: {
        y: {
            beginAtZero: true,
            ticks: {
                stepSize: 1
            }
        }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <Button onClick={onRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh Data
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard title="Total Workers" value={formatNumber(initialMetrics.total_workers)} icon={Users} />
        <KpiCard title="Active Trucks" value={`${formatNumber(initialMetrics.active_trucks)} / ${formatNumber(initialMetrics.total_trucks)}`} icon={Truck} />
        <KpiCard title="Total Trips Logged" value={formatNumber(initialMetrics.total_trips)} icon={Briefcase} />
        <KpiCard title="Total KM Traveled" value={`${formatNumber(initialMetrics.total_km_traveled)} km`} icon={RouteIcon} />
        <KpiCard title="Total Checks Done" value={formatNumber(initialMetrics.total_checks)} icon={CheckCircle} />
        <KpiCard title="Total Litres Fueled" value={`${formatNumber(initialMetrics.total_liters_fueled)} L`} icon={Droplet} />
        <KpiCard title="Total Refuels Logged" value={formatNumber(initialMetrics.total_refuels)} icon={BeakerIcon} />
        <KpiCard title="Total Service Cost" value={formatCurrency(initialMetrics.total_service_cost)} icon={Wrench} />
        <KpiCard title="Total Diesel Cost" value={formatCurrency(initialMetrics.total_diesel_cost)} icon={BeakerIcon} />
        <KpiCard title="Total Spillage" value={`${formatNumber(initialMetrics.total_spillage)} L`} icon={AlertTriangle} />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md h-96">
        <h2 className="text-xl font-bold text-gray-800 mb-4">User Roles Distribution</h2>
        <div className="h-full w-full relative">
            <Bar options={chartOptions} data={chartData} />
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
