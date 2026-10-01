import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  DollarSign, 
  Clock, 
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface FinancialSummaryProps {
  stats: {
    totalBilled: number;
    totalCollected: number;
    totalAdjustments: number;
    totalDiscounts: number;
    totalOutstanding: number;
    collectionRate: number;
  };
}

export const FinancialSummary: React.FC<FinancialSummaryProps> = ({ stats }) => {
  const cards = [
    {
      label: 'Total Revenue Billed',
      value: `$${stats.totalBilled.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      change: '+12.5%',
      trend: 'up'
    },
    {
      label: 'Collections (Net)',
      value: `$${stats.totalCollected.toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      change: stats.collectionRate.toFixed(1) + '%',
      trend: 'up'
    },
    {
      label: 'Outstanding Balance',
      value: `$${stats.totalOutstanding.toLocaleString()}`,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      change: '-5.2%',
      trend: 'down'
    },
    {
      label: 'Financial Aid/Discounts',
      value: `$${stats.totalDiscounts.toLocaleString()}`,
      icon: PieChart,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      change: '+2.4%',
      trend: 'up'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className={`p-2 rounded-lg ${card.bg} ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div className={`flex items-center gap-1 text-xs font-medium ${card.trend === 'up' ? 'text-emerald-600' : 'text-amber-600'}`}>
              {card.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {card.change}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{card.value}</h3>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
