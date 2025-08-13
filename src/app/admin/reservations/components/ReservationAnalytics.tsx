"use client";

import { useState, useEffect } from 'react';

export default function ReservationAnalytics() {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(false);

  // Mock data - in a real implementation, this would come from an API
  const mockData = {
    totalReservations: 156,
    confirmedReservations: 142,
    waitlistedReservations: 8,
    cancelledReservations: 6,
    utilizationRate: 78.5,
    popularTimes: [
      { time: '7:00 PM', count: 24 },
      { time: '8:00 PM', count: 32 },
      { time: '9:00 PM', count: 28 },
      { time: '6:00 PM', count: 18 },
      { time: '10:00 PM', count: 15 }
    ],
    typeBreakdown: [
      { type: 'Bar', count: 89, percentage: 57.1 },
      { type: 'Mahjong', count: 42, percentage: 26.9 },
      { type: 'Poker', count: 25, percentage: 16.0 }
    ],
    dailyTrends: [
      { day: 'Mon', reservations: 18 },
      { day: 'Tue', reservations: 22 },
      { day: 'Wed', reservations: 25 },
      { day: 'Thu', reservations: 28 },
      { day: 'Fri', reservations: 35 },
      { day: 'Sat', reservations: 42 },
      { day: 'Sun', reservations: 38 }
    ]
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Reservation Analytics</h2>
        
        {/* Time Range Selector */}
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Reservations</p>
              <p className="text-2xl font-semibold text-gray-900">{mockData.totalReservations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm">✅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Confirmed</p>
              <p className="text-2xl font-semibold text-gray-900">{mockData.confirmedReservations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 text-sm">⏳</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Waitlisted</p>
              <p className="text-2xl font-semibold text-gray-900">{mockData.waitlistedReservations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 text-sm">📈</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Utilization Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{mockData.utilizationRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Popular Times */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Most Popular Times</h3>
          <div className="space-y-3">
            {mockData.popularTimes.map((item, index) => (
              <div key={item.time} className="flex items-center">
                <div className="flex-shrink-0 w-16 text-sm text-gray-600">
                  {item.time}
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(item.count / 35) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex-shrink-0 w-8 text-sm text-gray-900 text-right">
                  {item.count}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reservation Type Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Reservation Types</h3>
          <div className="space-y-4">
            {mockData.typeBreakdown.map((item) => (
              <div key={item.type} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded mr-3 ${
                    item.type === 'Bar' ? 'bg-red-500' :
                    item.type === 'Mahjong' ? 'bg-green-500' : 'bg-blue-500'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-900">{item.type}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{item.count}</span>
                  <span className="text-sm text-gray-500">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Simple pie chart representation */}
          <div className="mt-4 flex rounded-full overflow-hidden h-4">
            <div className="bg-red-500" style={{ width: '57.1%' }}></div>
            <div className="bg-green-500" style={{ width: '26.9%' }}></div>
            <div className="bg-blue-500" style={{ width: '16.0%' }}></div>
          </div>
        </div>
      </div>

      {/* Daily Trends */}
      <div className="bg-white p-6 rounded-lg shadow border mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Reservation Trends</h3>
        <div className="flex items-end space-x-2 h-40">
          {mockData.dailyTrends.map((item) => (
            <div key={item.day} className="flex-1 flex flex-col items-center">
              <div
                className="bg-blue-600 rounded-t w-full"
                style={{ height: `${(item.reservations / 45) * 100}%` }}
              ></div>
              <div className="mt-2 text-xs text-gray-600">{item.day}</div>
              <div className="text-xs text-gray-900 font-medium">{item.reservations}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Peak Hours */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Key Insights</h3>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
              <div>
                <p className="text-sm text-gray-900 font-medium">Peak Hours</p>
                <p className="text-sm text-gray-600">8:00 PM - 9:00 PM sees the highest demand</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
              <div>
                <p className="text-sm text-gray-900 font-medium">Busiest Day</p>
                <p className="text-sm text-gray-600">Saturdays have 42% more reservations than average</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3"></div>
              <div>
                <p className="text-sm text-gray-900 font-medium">Cancellation Rate</p>
                <p className="text-sm text-gray-600">3.8% cancellation rate, below industry average</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">Capacity Optimization</p>
              <p className="text-sm text-blue-700">Consider extending hours on weekends to accommodate demand</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800 font-medium">Marketing Opportunity</p>
              <p className="text-sm text-green-700">Promote off-peak hours (5-7 PM) with special offers</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800 font-medium">Resource Allocation</p>
              <p className="text-sm text-yellow-700">Bar reservations dominate - ensure adequate staffing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> This analytics dashboard shows mock data for demonstration purposes. 
          In a full implementation, this would connect to real reservation data and provide interactive charts, 
          exportable reports, and real-time updates.
        </p>
      </div>
    </div>
  );
}
